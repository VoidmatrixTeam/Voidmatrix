import { COLS, ROWS, DEFAULT_CONFIG } from "./config.js";

export function gradientProfiles(channel, geometry) {
  const { width: w, height: h, data } = channel;
  const px = new Float32Array(w);
  const py = new Float32Array(h);
  const { marginPx: m, cellPx } = geometry;
  const x0 = m;
  const x1 = Math.min(w - 1, m + COLS * cellPx);
  const y0 = m;
  const y1 = Math.min(h - 1, m + ROWS * cellPx);
  for (let y = y0; y < y1; y++) {
    for (let x = 1; x < w - 1; x++) {
      px[x] += Math.abs(data[y * w + x + 1] - data[y * w + x - 1]);
    }
  }
  for (let x = x0; x < x1; x++) {
    for (let y = 1; y < h - 1; y++) {
      py[y] += Math.abs(data[(y + 1) * w + x] - data[(y - 1) * w + x]);
    }
  }
  return { px, py };
}

function sampleProfile(profile, pos) {
  const p = Math.min(profile.length - 1.001, Math.max(0, pos));
  const i = Math.floor(p);
  return profile[i] + (profile[i + 1] - profile[i]) * (p - i);
}

export function fitAxis(profile, count, geometry, config) {
  const { marginPx: m, cellPx } = geometry;
  const centre = m + (count * cellPx) / 2;
  const maxOffset = config.gridMaxOffsetCells * cellPx;
  const offsetStep = config.gridOffsetStepCells * cellPx;
  let best = { offset: 0, scale: 1, score: -Infinity };
  const scores = [];
  for (
    let s = -config.gridMaxScale;
    s <= config.gridMaxScale + 1e-9;
    s += config.gridScaleStep
  ) {
    const scale = 1 + s;
    for (let d = -maxOffset; d <= maxOffset + 1e-9; d += offsetStep) {
      let score = 0;
      for (let k = 1; k < count; k++) {
        score += sampleProfile(
          profile,
          centre + (k - count / 2) * cellPx * scale + d - 0.5,
        );
      }
      scores.push(score);
      if (score > best.score) best = { offset: d, scale, score };
    }
  }
  const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
  best.contrast = mean > 0 ? best.score / mean : 0;
  if (best.contrast < config.gridMinContrast) {
    return {
      offset: 0,
      scale: 1,
      score: best.score,
      contrast: best.contrast,
      fallback: true,
    };
  }
  return best;
}

export function fitGrid(channel, geometry, options = {}) {
  const config = { ...DEFAULT_CONFIG, ...options.config };
  const { px, py } = gradientProfiles(channel, geometry);
  const x = fitAxis(px, COLS, geometry, config);
  const y = fitAxis(py, ROWS, geometry, config);
  return { x, y, profiles: options.debug ? { px, py } : undefined };
}

export function boundary(axisFit, k, count, geometry) {
  const { marginPx: m, cellPx } = geometry;
  const centre = m + (count * cellPx) / 2;
  return centre + (k - count / 2) * cellPx * axisFit.scale + axisFit.offset;
}
