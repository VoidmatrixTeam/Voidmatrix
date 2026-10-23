import { analyzeFrame, analyzeBurst } from "./pipeline/index.js";
import { localizeScreen } from "./pipeline/localize.js";

const toFrame = ({ width, height, buffer }) => ({
  width,
  height,
  data: new Uint8ClampedArray(buffer),
});

function insideQuad(quad, x, y) {
  let sign = 0;
  for (let i = 0; i < 4; i++) {
    const [x0, y0] = quad[i];
    const [x1, y1] = quad[(i + 1) % 4];
    const cross = (x1 - x0) * (y - y0) - (y1 - y0) * (x - x0);
    if (cross !== 0) {
      if (sign && Math.sign(cross) !== sign) return false;
      sign = Math.sign(cross);
    }
  }
  return true;
}

function glareFraction(frame, quad) {
  const cx = quad.reduce((s, p) => s + p[0], 0) / 4;
  const cy = quad.reduce((s, p) => s + p[1], 0) / 4;
  const inner = quad.map(([x, y]) => [
    cx + (x - cx) * 0.95,
    cy + (y - cy) * 0.95,
  ]);
  const xs = inner.map((p) => p[0]);
  const ys = inner.map((p) => p[1]);
  const x0 = Math.max(0, Math.floor(Math.min(...xs)));
  const x1 = Math.min(frame.width, Math.ceil(Math.max(...xs)));
  const y0 = Math.max(0, Math.floor(Math.min(...ys)));
  const y1 = Math.min(frame.height, Math.ceil(Math.max(...ys)));
  const d = frame.data;
  let saturated = 0;
  let total = 0;
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      if (!insideQuad(inner, x + 0.5, y + 0.5)) continue;
      const i = (y * frame.width + x) * 4;
      if (Math.min(d[i], d[i + 1], d[i + 2]) >= 245) saturated++;
      total++;
    }
  }
  return total ? saturated / total : 0;
}

function detect(frame, roi) {
  const loc = localizeScreen(frame, { roi });
  if (!loc.ok || loc.method !== "detected") return { found: false };
  return {
    found: true,
    quad: loc.quad,
    inFrame: loc.inFrame,
    aspectError: loc.aspectError,
    glare: glareFraction(frame, loc.quad),
  };
}

self.onmessage = ({ data: message }) => {
  const { id, type, frames, target, roi, config } = message;
  try {
    let result;
    if (type === "detect") {
      result = detect(toFrame(frames[0]), roi);
    } else if (frames.length === 1) {
      result = analyzeFrame(toFrame(frames[0]), target, { roi, config });
    } else {
      result = analyzeBurst(frames.map(toFrame), target, { roi, config });
    }
    self.postMessage({ id, result });
  } catch (error) {
    self.postMessage({ id, error: error.message || String(error) });
  }
};
