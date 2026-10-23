import { ScannerClient, imageDataFromFile } from "./client.js";
import { patternFromBytes, UNSET } from "./pipeline/pattern.js";
import { COLS, ROWS, SHADE_NAMES } from "./pipeline/config.js";
import { drawPattern, cellFromEvent } from "./draw.js";

const DETECT_INTERVAL = 300;
const DETECT_LONG_SIDE = 480;
const STABLE_TIME = 1000;
const BURST_FRAMES = 3;
const BURST_GAP = 70;

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function element(tag, className, text) {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (text !== undefined) el.innerText = text;
  return el;
}

function actionButton(icon, label) {
  const button = element("button", "scanner-action");
  button.append(new Icon(icon, ""), element("span", "", label));
  return button;
}

class ScannerToolbar extends HTMLElement {
  constructor(title, onClose) {
    super();
    const close = new Icon("assets/close.svg", "close icon");
    close.onClick(onClose);
    this.append(element("span", "", title), close);
  }
}

class ScannerCamera extends HTMLElement {
  constructor(client, onCapture, onUpload) {
    super();
    this.client = client;
    this.onCapture = onCapture;

    this.stage = element("div", "scanner-stage");
    this.video = element("video");
    this.video.muted = true;
    this.video.playsInline = true;
    this.video.setAttribute("playsinline", "");
    this.frame = element("div", "scanner-frame");
    this.stage.append(this.video, this.frame);

    this.status = element("div", "scanner-status", "Starting camera…");
    this.hint = element(
      "p",
      "scanner-hint",
      "Fit the drawing inside the frame. Hold the phone straight above the screen. Avoid reflections.",
    );

    this.shutter = element("button", "scanner-shutter");
    this.shutter.title = "Capture";
    this.shutter.disabled = true;
    this.shutter.addEventListener("click", () => this.capture());

    this.file = element("input");
    this.file.type = "file";
    this.file.accept = "image/*";
    this.file.hidden = true;
    this.file.addEventListener("change", () => {
      const file = this.file.files[0];
      this.file.value = "";
      if (file) onUpload(file);
    });
    const upload = actionButton("assets/upload.svg", "Upload a photo instead");
    upload.addEventListener("click", () => this.file.click());

    const controls = element("div", "scanner-controls");
    controls.append(this.shutter, upload, this.file);

    this.append(this.stage, this.status, this.hint, controls);
  }

  async start() {
    if (!navigator.mediaDevices?.getUserMedia) {
      this.unavailable("This browser can't use the camera.");
      return;
    }
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
      });
    } catch (error) {
      const messages = {
        NotAllowedError: "Camera access was denied.",
        NotFoundError: "No camera found.",
        NotReadableError: "The camera is in use by another app.",
      };
      this.unavailable(messages[error.name] || "Couldn't start the camera.");
      return;
    }
    this.video.srcObject = this.stream;
    await this.video.play();
    this.layout();
    this.shutter.disabled = false;
    this.setStatus("Fit the drawing inside the frame");
    this.timer = setInterval(() => this.detect(), DETECT_INTERVAL);
  }

  unavailable(message) {
    this.stage.hidden = true;
    this.hint.hidden = true;
    this.shutter.hidden = true;
    this.setStatus(`${message} You can upload a photo instead.`);
  }

  stop() {
    clearInterval(this.timer);
    this.timer = null;
    this.stream?.getTracks().forEach((track) => track.stop());
    this.stream = null;
  }

  layout() {
    const vw = this.video.videoWidth;
    const vh = this.video.videoHeight;
    this.stage.style.setProperty("--aspect", vw / vh);
    let fw = 0.84;
    let fh = (fw * vw) / ((COLS / ROWS) * vh);
    if (fh > 0.84) {
      fh = 0.84;
      fw = ((COLS / ROWS) * fh * vh) / vw;
    }
    this.frameFractions = { x: (1 - fw) / 2, y: (1 - fh) / 2, w: fw, h: fh };
    Object.assign(this.frame.style, {
      left: `${this.frameFractions.x * 100}%`,
      top: `${this.frameFractions.y * 100}%`,
      width: `${fw * 100}%`,
      height: `${fh * 100}%`,
    });
  }

  roi(width, height) {
    const f = this.frameFractions;
    return {
      x: f.x * width,
      y: f.y * height,
      width: f.w * width,
      height: f.h * height,
    };
  }

  grab(longSide = Infinity) {
    const vw = this.video.videoWidth;
    const vh = this.video.videoHeight;
    const scale = Math.min(1, longSide / Math.max(vw, vh));
    const width = Math.round(vw * scale);
    const height = Math.round(vh * scale);
    this.canvas ??= element("canvas");
    this.canvas.width = width;
    this.canvas.height = height;
    const ctx = this.canvas.getContext("2d", { willReadFrequently: true });
    ctx.drawImage(this.video, 0, 0, width, height);
    return ctx.getImageData(0, 0, width, height);
  }

  setStatus(text, good = false) {
    this.status.innerText = text;
    this.frame.classList.toggle("detected", good);
  }

  async detect() {
    if (this.detecting || !this.timer) return;
    this.detecting = true;
    try {
      const frame = this.grab(DETECT_LONG_SIDE);
      const roi = this.roi(frame.width, frame.height);
      const result = await this.client.detect(frame, roi);
      if (this.timer) this.feedback(result, roi);
    } catch {
      this.stableSince = null;
    } finally {
      this.detecting = false;
    }
  }

  feedback(result, roi) {
    const now = performance.now();
    const previous = this.previousQuad;
    this.previousQuad = result.found ? result.quad : null;
    if (!result.found) {
      this.stableSince = null;
      this.setStatus("Fit the drawing inside the frame");
      return;
    }
    const q = result.quad;
    const width =
      (Math.hypot(q[1][0] - q[0][0], q[1][1] - q[0][1]) +
        Math.hypot(q[2][0] - q[3][0], q[2][1] - q[3][1])) /
      2;
    let message = null;
    if (!result.inFrame) message = "Move back a little";
    else if (width < 0.5 * roi.width) message = "Move closer";
    else if (
      !previous ||
      Math.max(
        ...q.map((p, i) =>
          Math.hypot(p[0] - previous[i][0], p[1] - previous[i][1]),
        ),
      ) >
        0.04 * roi.width
    ) {
      message = "Hold steady";
    }
    if (message) {
      this.stableSince = message === "Hold steady" ? now : null;
      this.setStatus(message);
      return;
    }
    this.stableSince ??= now;
    this.setStatus(
      result.glare > 0.02 && result.glare < 0.4
        ? "Screen detected, but there's a reflection. Tilt slightly if you can."
        : "Screen detected ✓",
      true,
    );
    if (now - this.stableSince >= STABLE_TIME) this.capture();
  }

  async capture() {
    if (!this.timer) return;
    clearInterval(this.timer);
    this.timer = null;
    this.shutter.disabled = true;
    this.setStatus("Hold still…", true);
    const frames = [];
    for (let i = 0; i < BURST_FRAMES; i++) {
      if (i) await wait(BURST_GAP);
      frames.push(this.grab());
    }
    this.stop();
    this.onCapture(frames, this.roi(frames[0].width, frames[0].height));
  }
}

const FIXED_REASONS = new Set(["glare", "frames-disagree"]);
const DEFAULT_THRESHOLD = 53;

const confidenceAt = (position) => 1 - 0.5 * 10 ** (-position / 40);
const percent = (value) => `${(value * 100).toFixed(value >= 0.995 ? 2 : 1)}%`;

function judge(v, warnBelow, wrongFrom) {
  if (v.state === "ignored") return "ignored";
  if (FIXED_REASONS.has(v.reason)) return "uncertain";
  const matches = v.found === v.expected;
  const threshold = matches ? warnBelow : wrongFrom;
  const judged = matches ? "correct" : "wrong";
  if (v.state !== "uncertain") {
    return v.confidence >= threshold ? judged : "uncertain";
  }
  const loosened = threshold < confidenceAt(DEFAULT_THRESHOLD);
  return loosened && v.confidence >= threshold ? judged : "uncertain";
}

class ScannerResults extends HTMLElement {
  constructor(onRetry) {
    super();
    this.summary = element("div", "scanner-summary");
    this.pair = element("div", "scanner-pair");
    this.expected = element("canvas");
    this.found = element("canvas");
    this.views = element("div", "scanner-views");
    this.viewButtons = ["Detected", "Photo"].map((label) => {
      const button = element("button", "", label);
      button.addEventListener("click", () => {
        this.view = label;
        this.render();
      });
      this.views.append(button);
      return button;
    });
    const expectedFigure = element("figure");
    expectedFigure.append(element("figcaption", "", "Expected"), this.expected);
    const foundFigure = element("figure");
    const foundCaption = element("figcaption");
    foundCaption.append(element("span", "", "Your drawing"), this.views);
    foundFigure.append(foundCaption, this.found);
    this.pair.append(expectedFigure, foundFigure);

    this.settings = element("div", "scanner-settings");
    this.warnSlider = this.slider("Unsure below");
    this.wrongSlider = this.slider("Wrong from");

    this.info = element("div", "scanner-info");
    const retry = actionButton("assets/photo_camera.svg", "Scan again");
    retry.addEventListener("click", onRetry);
    this.append(this.summary, this.pair, this.settings, this.info, retry);

    const select = (event) => {
      const i = cellFromEvent(event.currentTarget, event);
      if (i >= 0 && this.verdicts) this.select(i);
    };
    this.expected.addEventListener("click", select);
    this.found.addEventListener("click", select);
  }

  slider(label) {
    const row = element("label", "scanner-slider");
    const input = element("input");
    input.type = "range";
    input.min = 0;
    input.max = 100;
    input.step = 1;
    input.value = DEFAULT_THRESHOLD;
    const value = element("span", "scanner-slider-value");
    input.addEventListener("input", () => this.render());
    row.append(element("span", "", label), input, value);
    this.settings.append(row);
    return { input, value };
  }

  showMessage(text, kind) {
    this.summary.className = `scanner-summary ${kind}`;
    this.summary.innerText = text;
    this.pair.hidden = true;
    this.settings.hidden = true;
    this.info.hidden = true;
  }

  show(result, target) {
    if (!result.ok) {
      this.showMessage(result.failure.message, "rejected");
      return;
    }
    this.target = target;
    this.verdicts = result.verdicts;
    this.warnings = result.warnings || [];
    this.photo = result.photo || null;
    this.view = "Detected";
    this.checked = new Set();
    this.selected = -1;
    this.pair.hidden = false;
    this.settings.hidden = false;
    this.info.hidden = false;
    this.views.hidden = !this.photo;
    this.info.innerText = "Tap a cell for details.";
    this.render();
  }

  render() {
    const warnBelow = confidenceAt(Number(this.warnSlider.input.value));
    const wrongFrom = confidenceAt(Number(this.wrongSlider.input.value));
    this.warnSlider.value.innerText = percent(warnBelow);
    this.wrongSlider.value.innerText = percent(wrongFrom);
    this.states = this.verdicts.map((v) => judge(v, warnBelow, wrongFrom));
    for (const i of this.checked) {
      if (this.states[i] !== "wrong" && this.states[i] !== "uncertain") {
        this.checked.delete(i);
      }
    }

    const count = (state) => this.states.filter((s) => s === state).length;
    const total = this.states.length - count("ignored");
    const correct = count("correct");
    const wrong = count("wrong");
    const uncertain = count("uncertain");
    const open = wrong + uncertain - this.checked.size;
    this.summary.className = `scanner-summary ${open ? "issues" : "success"}`;
    const parts = [`${correct} / ${total} correct`];
    if (wrong) parts.push(`${wrong} wrong`);
    if (uncertain) parts.push(`${uncertain} uncertain`);
    if (this.checked.size) parts.push(`${this.checked.size} checked`);
    this.summary.innerText =
      wrong || uncertain
        ? parts.join(", ")
        : `Everything matches! All ${total} cells are correct.`;
    if (this.warnings.length) {
      this.summary.innerText += `\n${this.warnings.join("\n")}`;
    }

    this.viewButtons.forEach((button) =>
      button.classList.toggle("active", button.innerText === this.view),
    );
    const marks = this.verdicts.map((v, i) => ({
      ...v,
      state: this.states[i],
    }));
    drawPattern(this.expected, this.target, null, this.selected);
    drawPattern(
      this.found,
      this.verdicts.map((v, i) => (this.target[i] === UNSET ? UNSET : v.found)),
      marks,
      this.selected,
      {
        photo: this.view === "Photo" ? this.photo : null,
        checked: this.checked,
      },
    );
  }

  why(i, v) {
    const row = Math.floor(i / COLS);
    const col = i % COLS;
    const edge = row === 0 || col === 0 || row === ROWS - 1 || col === COLS - 1;
    const reasons = {
      glare: "A reflection may be covering it.",
      noisy: "The colour isn't even across the cell.",
      lighting: "The lighting changes too much around it.",
      "frames-disagree": "The photos in the burst didn't agree.",
    };
    const cause =
      reasons[v.reason] ||
      (edge
        ? "Cells at the edge of the screen need extra certainty."
        : "It's between two shades.");
    if (FIXED_REASONS.has(v.reason)) {
      return `${cause} The sliders don't change this.`;
    }
    if (v.confidence < confidenceAt(0)) {
      return `${cause} It's too unclear to call either way.`;
    }
    const limit = percent(
      Math.min(v.confidence, confidenceAt(DEFAULT_THRESHOLD)),
    );
    return v.found === v.expected
      ? `${cause} Set "Unsure below" under ${limit} to count it as correct.`
      : `${cause} Set "Wrong from" under ${limit} to mark it wrong.`;
  }

  select(i) {
    const v = this.verdicts[i];
    const state = this.states[i];
    if (state === "wrong" || state === "uncertain") {
      if (this.checked.has(i)) this.checked.delete(i);
      else this.checked.add(i);
    }
    const where = `Row ${Math.floor(i / COLS) + 1}, column ${(i % COLS) + 1}`;
    const confidence = `${Math.round(v.confidence * 100)}%`;
    if (state === "ignored") {
      this.info.innerText = `${where}: not part of this script.`;
    } else if (state === "uncertain") {
      this.info.innerText = `${where}: expected ${SHADE_NAMES[v.expected]}, looks like ${SHADE_NAMES[v.found]} (confidence ${confidence}). ${this.why(i, v)}`;
    } else {
      this.info.innerText = `${where}: expected ${SHADE_NAMES[v.expected]}, found ${SHADE_NAMES[v.found]} (confidence ${confidence}).`;
    }
    this.selected = i;
    this.render();
  }
}

class DotArtistScanner extends HTMLElement {
  constructor(bytes) {
    super();
    this.target = patternFromBytes(bytes);
    this.client = new ScannerClient();
    this.toolbar = new ScannerToolbar("Check my drawing", () => this.close());
    this.results = new ScannerResults(() => this.scan());
    this.append(this.toolbar, this.results);

    if (!bytes.length) {
      this.results.showMessage("Select a script to check first.", "rejected");
      this.results.querySelector(".scanner-action").hidden = true;
      return;
    }
    this.scan();
  }

  scan() {
    this.camera?.stop();
    this.camera?.remove();
    this.results.hidden = true;
    this.camera = new ScannerCamera(
      this.client,
      (frames, roi) => this.analyze(frames, { roi }),
      (file) => this.analyzeFile(file),
    );
    this.append(this.camera);
    this.camera.start();
  }

  async analyzeFile(file) {
    this.camera.stop();
    this.camera.setStatus("Checking…");
    try {
      await this.analyze([await imageDataFromFile(file)], {});
    } catch {
      this.showResult({
        ok: false,
        failure: { message: "Couldn't read that photo. Try another one." },
      });
    }
  }

  async analyze(frames, options) {
    this.camera.setStatus("Checking…", true);
    try {
      this.showResult(await this.client.analyze(frames, this.target, options));
    } catch (error) {
      if (!this.isConnected) return;
      this.showResult({
        ok: false,
        failure: { message: "Something went wrong. Please try again." },
      });
    }
  }

  showResult(result) {
    this.camera?.stop();
    this.camera?.remove();
    this.camera = null;
    this.results.hidden = false;
    this.results.show(result, this.target);
  }

  close() {
    this.camera?.stop();
    this.client.terminate();
    document.body.classList.remove("scanner-open");
    this.remove();
  }
}

customElements.define("scanner-toolbar", ScannerToolbar);
customElements.define("scanner-camera", ScannerCamera);
customElements.define("scanner-results", ScannerResults);
customElements.define("dot-artist-scanner", DotArtistScanner);

export function openScanner(bytes) {
  if (!document.querySelector('link[href="css/scanner.css"]')) {
    const link = element("link");
    link.rel = "stylesheet";
    link.href = "css/scanner.css";
    document.head.append(link);
  }
  document.querySelector("dot-artist-scanner")?.close();
  document.body.classList.add("scanner-open");
  document.body.append(new DotArtistScanner(bytes));
}
