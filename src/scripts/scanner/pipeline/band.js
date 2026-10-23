import { applyHomography } from "./homography.js";
import { gaussianBlur, median } from "./image.js";

function smooth1d(values, sigma) {
  return gaussianBlur({ width: values.length, height: 1, data: values }, sigma)
    .data;
}

function projectPixels(rgb, axis) {
  const { width, height } = rgb.r;
  const data = new Float32Array(width * height);
  for (let i = 0; i < data.length; i++) {
    data[i] =
      axis[0] * rgb.r.data[i] +
      axis[1] * rgb.g.data[i] +
      axis[2] * rgb.b.data[i];
  }
  return { width, height, data };
}

function bandProfile(channel, cells, expected, H, axis, size, cellSize) {
  const binSize = 2;
  const bins = Math.ceil(size / binSize);
  const samples = Array.from({ length: bins }, () => []);
  const { width: w, data } = channel;
  cells.forEach((cell, i) => {
    if (!(expected[i] > 0)) return;
    const [x0, y0, x1, y1] = cell.window;
    for (let y = y0; y < y1; y += 2) {
      for (let x = x0; x < x1; x += 2) {
        const p = applyHomography(H, x + 0.5, y + 0.5)[axis];
        const bin = Math.floor(p / binSize);
        if (bin >= 0 && bin < bins) {
          samples[bin].push(data[y * w + x] / expected[i]);
        }
      }
    }
  });
  const raw = new Float32Array(bins).fill(NaN);
  samples.forEach((s, b) => {
    if (s.length >= 8) raw[b] = median(s);
  });
  const filled = Float32Array.from(raw);
  let last = -1;
  for (let b = 0; b <= bins; b++) {
    if (b < bins && Number.isNaN(raw[b])) continue;
    for (let k = last + 1; k < b; k++) {
      const left = last >= 0 ? raw[last] : b < bins ? raw[b] : 1;
      const right = b < bins ? raw[b] : left;
      const t = last >= 0 && b < bins ? (k - last) / (b - last) : 0;
      filled[k] = left + (right - left) * t;
    }
    last = b;
  }
  const fine = smooth1d(filled, 1);
  const trend = smooth1d(filled, (2 * cellSize) / binSize);
  return {
    binSize,
    profile: Float32Array.from(fine, (v, b) => v / (trend[b] || 1)),
  };
}

export function removeBands(
  blurred,
  cells,
  classification,
  H,
  frame,
  cellSize,
) {
  const channel = projectPixels(blurred, classification.axis.axis);
  const expected = cells.map((_, i) => {
    if (classification.anomalies[i]) return NaN;
    const v = classification.verdicts[i];
    const bin = classification.bins[classification.shades.indexOf(v.found)];
    return bin ? (classification.raw[i] * bin.center) / v.value : NaN;
  });
  const profiles = [0, 1].map((axis) =>
    bandProfile(
      channel,
      cells,
      expected,
      H,
      axis,
      axis ? frame.height : frame.width,
      cellSize,
    ),
  );
  const { width: w } = channel;
  return cells.map((cell) => {
    const [x0, y0, x1, y1] = cell.window;
    const original = [];
    const corrected = [];
    for (let y = y0; y < y1; y++) {
      for (let x = x0; x < x1; x++) {
        const p = applyHomography(H, x + 0.5, y + 0.5);
        let f = 1;
        profiles.forEach(({ profile, binSize }, axis) => {
          const b = Math.min(
            profile.length - 1,
            Math.max(0, Math.floor(p[axis] / binSize)),
          );
          f *= profile[b] || 1;
        });
        original.push(channel.data[y * w + x]);
        corrected.push(channel.data[y * w + x] / f);
      }
    }
    const factor = median(corrected) / (median(original) || 1);
    return { ...cell, medians: cell.medians.map((m) => m * factor) };
  });
}
