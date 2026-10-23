import { COLS, ROWS, DEFAULT_CONFIG } from "./config.js";
import { luma, blurRGB, bilinear } from "./image.js";
import { solveHomography, warpRGBA } from "./homography.js";
import { localizeScreen } from "./localize.js";
import { fitGrid, boundary } from "./grid.js";
import { sampleCells } from "./sample.js";
import { classifyBins } from "./bins.js";
import { removeBands } from "./band.js";
import { evaluateGates, firstFailure, hasGlare, MESSAGES } from "./gates.js";
import { voteFrames } from "./vote.js";

export { patternFromBytes, patternFromHex, UNSET } from "./pattern.js";

const now = () =>
  typeof performance !== "undefined" ? performance.now() : Date.now();

export function canonicalGeometry(config) {
  const { cellPx, marginPx } = config;
  return {
    cellPx,
    marginPx,
    width: COLS * cellPx + 2 * marginPx,
    height: ROWS * cellPx + 2 * marginPx,
  };
}

export function canonicalToFrame(quad, geometry) {
  const { cellPx: c, marginPx: m } = geometry;
  const canon = [
    [m, m],
    [m + COLS * c, m],
    [m + COLS * c, m + ROWS * c],
    [m, m + ROWS * c],
  ];
  return solveHomography(canon, quad);
}

export function summarize(verdicts) {
  const count = (s) => verdicts.filter((v) => v.state === s).length;
  const correct = count("correct");
  const wrong = count("wrong");
  const uncertain = count("uncertain");
  return {
    total: correct + wrong + uncertain,
    correct,
    wrong,
    uncertain,
    ignored: count("ignored"),
  };
}

export function planarToRGBA(planar) {
  const { width, height } = planar.r;
  const out = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < width * height; i++) {
    out[i * 4] = planar.r.data[i];
    out[i * 4 + 1] = planar.g.data[i];
    out[i * 4 + 2] = planar.b.data[i];
    out[i * 4 + 3] = 255;
  }
  return { width, height, data: out };
}

export function croppedPhoto(planar, grid, geometry) {
  const { cellPx } = geometry;
  const width = COLS * cellPx;
  const height = ROWS * cellPx;
  const data = new Uint8ClampedArray(width * height * 4);
  for (let oy = 0; oy < height; oy++) {
    const y = boundary(grid.y, (oy + 0.5) / cellPx, ROWS, geometry) - 0.5;
    for (let ox = 0; ox < width; ox++) {
      const x = boundary(grid.x, (ox + 0.5) / cellPx, COLS, geometry) - 0.5;
      const o = (oy * width + ox) * 4;
      data[o] = bilinear(planar.r, x, y);
      data[o + 1] = bilinear(planar.g, x, y);
      data[o + 2] = bilinear(planar.b, x, y);
      data[o + 3] = 255;
    }
  }
  return { width, height, data };
}

export function analyzeFrame(frame, target, options = {}) {
  const config = { ...DEFAULT_CONFIG, ...options.config };
  const timings = {};
  let t = now();
  const lap = (name) => {
    const n = now();
    timings[name] = n - t;
    t = n;
  };

  const localization = localizeScreen(frame, {
    roi: options.roi,
    initialQuad: options.initialQuad,
    debug: options.debug,
    config,
  });
  lap("localize");
  if (!localization.ok) {
    const gates = evaluateGates({ localization }, { config });
    return {
      ok: false,
      failure: firstFailure(gates),
      gates,
      localization,
      timings,
    };
  }

  const geometry = canonicalGeometry(config);
  const H = canonicalToFrame(localization.quad, geometry);
  const quadWidth = Math.hypot(
    localization.quad[1][0] - localization.quad[0][0],
    localization.quad[1][1] - localization.quad[0][1],
  );
  const density = quadWidth / (COLS * geometry.cellPx);
  const supersample = Math.max(1, Math.min(3, Math.ceil(density)));
  const raw = warpRGBA(frame, H, geometry.width, geometry.height, supersample);
  lap("rectify");

  const blurred = blurRGB(raw, config.moireSigma);
  lap("demoire");

  const grid = fitGrid(luma(blurred), geometry, {
    debug: options.debug,
    config,
  });
  lap("grid");

  const samples = sampleCells(blurred, raw, grid, geometry, { config });
  lap("sample");

  let classification = classifyBins(samples, target, { config });
  if (config.bandCorrection) {
    const corrected = classifyBins(
      removeBands(blurred, samples, classification, H, frame, quadWidth / COLS),
      target,
      { config },
    );
    const unclear = (c) =>
      c.verdicts.filter((v) => v.state === "uncertain").length;
    if (unclear(corrected) < unclear(classification)) {
      const judged = (v) => v.state === "correct" || v.state === "wrong";
      const original = classification.verdicts;
      classification = {
        ...corrected,
        verdicts: corrected.verdicts.map((v, i) => {
          if (["glare", "noisy"].includes(original[i].reason)) {
            return original[i];
          }
          return judged(v) && v.found !== original[i].found
            ? { ...v, state: "uncertain", reason: "lighting" }
            : v;
        }),
      };
    }
  }
  const { verdicts, bins, separations, values } = classification;
  const cells = samples.map((s, i) => ({
    ...s,
    glare: classification.anomalies[i] === "glare",
  }));
  const calibration = {
    centers: bins.map((b) => b.center),
    sigmas: bins.map((b) => b.sigma),
    shades: classification.shades,
    separations,
    plausibleSpacing: classification.plausibleSpacing,
    edgeScale: classification.edgeScale,
  };
  lap("classify");

  const gates = evaluateGates(
    { localization, calibration, cells, verdicts },
    { config },
  );
  const failure = firstFailure(gates);
  const warnings = [];
  if (localization.method === "overlay-fallback") {
    warnings.push(MESSAGES.fallback);
  }
  if (hasGlare(cells, verdicts)) warnings.push(MESSAGES.someGlare);

  const result = {
    ok: !failure,
    failure,
    gates,
    warnings,
    verdicts,
    summary: summarize(verdicts),
    quad: localization.quad,
    localizationMethod: localization.method,
    calibration,
    photo: croppedPhoto(raw, grid, geometry),
    timings,
  };
  if (options.debug) {
    result.debug = {
      localization: localization.debug,
      geometry,
      homography: H,
      rectified: planarToRGBA(raw),
      grid,
      cells,
      values,
      axis: classification.axis,
      gains: classification.gains,
    };
  }
  return result;
}

export function analyzeBurst(frames, target, options = {}) {
  const config = { ...DEFAULT_CONFIG, ...options.config };
  const results = [];
  let previousQuad = null;
  for (const frame of frames) {
    const result = analyzeFrame(frame, target, {
      ...options,
      initialQuad: previousQuad,
    });
    if (result.localizationMethod === "detected") previousQuad = result.quad;
    results.push(result);
  }
  const valid = results.filter((r) => r.ok);
  const needed = Math.ceil(frames.length / 2);
  if (valid.length < needed) {
    const failures = results.filter((r) => r.failure).map((r) => r.failure);
    const byId = {};
    for (const f of failures) byId[f.id] = (byId[f.id] || 0) + 1;
    const commonest = Object.keys(byId).sort((a, b) => byId[b] - byId[a])[0];
    return {
      ok: false,
      failure: failures.find((f) => f.id === commonest),
      frames: results,
    };
  }
  const verdicts = voteFrames(
    valid.map((r) => r.verdicts),
    { config },
  );
  const n = verdicts.filter((v) => v.state !== "ignored").length || 1;
  const uncertain = verdicts.filter((v) => v.state === "uncertain").length / n;
  const failure =
    uncertain > config.maxUncertainFraction
      ? {
          id: "uncertain",
          ok: false,
          value: uncertain,
          limit: config.maxUncertainFraction,
          message: MESSAGES.uncertain,
        }
      : null;
  return {
    ok: !failure,
    failure,
    verdicts,
    summary: summarize(verdicts),
    warnings: [...new Set(valid.flatMap((r) => r.warnings))],
    photo: valid[0].photo,
    frames: results.map(({ photo, ...rest }) => rest),
  };
}
