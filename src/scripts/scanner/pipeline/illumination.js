import { COLS, ROWS } from "./config.js";
import {
  weightedLeastSquares,
  tukeyWeight,
  median,
  percentile,
} from "./image.js";
import { UNSET } from "./pattern.js";

function basis(col, row, degree) {
  const x = (col + 0.5) / COLS - 0.5;
  const y = (row + 0.5) / ROWS - 0.5;
  if (degree === 0) return [1];
  if (degree === 1) return [1, x, y];
  return [1, x, y, x * x, x * y, y * y];
}

export function evaluateSurface(model, col, row) {
  const b = basis(col, row, model.degree);
  let acc = 0;
  for (let i = 0; i < b.length; i++) acc += b[i] * model.coeffs[i];
  return Math.exp(acc);
}

function fitLogModel(cells, labels, degree, iterations = 8) {
  const used = [];
  for (let i = 0; i < cells.length; i++) {
    if (labels[i] !== UNSET && cells[i].value > 1) used.push(i);
  }
  const shades = [...new Set(used.map((i) => labels[i]))].sort();
  const reference = shades[0];
  const extra = shades.filter((s) => s !== reference);
  const nPoly = basis(0, 0, degree).length;
  const X = used.map((i) => {
    const row = basis(cells[i].col, cells[i].row, degree);
    for (const s of extra) row.push(labels[i] === s ? 1 : 0);
    return row;
  });
  const y = used.map((i) => Math.log(cells[i].value));
  let w = used.map(() => 1);
  let coeffs = null;
  let residuals = [];
  for (let it = 0; it < iterations; it++) {
    coeffs = weightedLeastSquares(X, y, w);
    if (!coeffs) return null;
    residuals = X.map(
      (row, k) => y[k] - row.reduce((a, v, j) => a + v * coeffs[j], 0),
    );
    const scale = Math.max(0.01, 1.4826 * median(residuals.map(Math.abs)));
    w = residuals.map((r) => tukeyWeight(r, scale));
  }
  return {
    degree,
    coeffs: coeffs.slice(0, nPoly),
    referenceShade: reference,
    inliers: w.filter((v) => v > 0).length,
    used: used.length,
  };
}

function pickDegree(n) {
  if (n >= 24) return 2;
  if (n >= 8) return 1;
  return 0;
}

export function fitIllumination(cells, target) {
  const defined = cells.filter((_, i) => target[i] !== UNSET).length;
  if (defined >= 24) {
    const model = fitLogModel(cells, target, pickDegree(defined));
    if (model) return { ...model, method: "target" };
  }
  return fitBrightest(cells);
}

export function fitBrightest(cells) {
  const threshold = percentile(
    cells.map((c) => c.value),
    0.7,
  );
  const labels = cells.map((c) => (c.value >= threshold ? 0 : UNSET));
  const n = labels.filter((l) => l === 0).length;
  const model = fitLogModel(cells, labels, pickDegree(n));
  return model
    ? { ...model, method: "brightest" }
    : { degree: 0, coeffs: [0], referenceShade: 0, method: "none" };
}

export function correctCells(cells, model) {
  return cells.map((c) => c.value / evaluateSurface(model, c.col, c.row));
}
