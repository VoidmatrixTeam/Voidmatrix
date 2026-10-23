import { COLS, ROWS, DEFAULT_CONFIG } from "./config.js";
import { boundary } from "./grid.js";
import { median } from "./image.js";

export function sampleCells(blurred, raw, grid, geometry, options = {}) {
  const config = { ...DEFAULT_CONFIG, ...options.config };
  const inset = (1 - config.sampleFraction) / 2;
  const { width: w } = blurred.r;
  const cells = [];
  for (let row = 0; row < ROWS; row++) {
    const top = boundary(grid.y, row, ROWS, geometry);
    const bottom = boundary(grid.y, row + 1, ROWS, geometry);
    const y0 = Math.round(top + (bottom - top) * inset);
    const y1 = Math.round(bottom - (bottom - top) * inset);
    for (let col = 0; col < COLS; col++) {
      const left = boundary(grid.x, col, COLS, geometry);
      const right = boundary(grid.x, col + 1, COLS, geometry);
      const x0 = Math.round(left + (right - left) * inset);
      const x1 = Math.round(right - (right - left) * inset);
      const channels = [[], [], []];
      const sum = [0, 0, 0];
      const products = [0, 0, 0, 0, 0, 0];
      let saturated = 0;
      for (let y = y0; y < y1; y++) {
        for (let x = x0; x < x1; x++) {
          const i = y * w + x;
          const v = [blurred.r.data[i], blurred.g.data[i], blurred.b.data[i]];
          for (let c = 0; c < 3; c++) {
            channels[c].push(v[c]);
            sum[c] += v[c];
          }
          products[0] += v[0] * v[0];
          products[1] += v[1] * v[1];
          products[2] += v[2] * v[2];
          products[3] += v[0] * v[1];
          products[4] += v[0] * v[2];
          products[5] += v[1] * v[2];
          const r = raw.r.data[i];
          const g = raw.g.data[i];
          const b = raw.b.data[i];
          if (Math.min(r, g, b) >= config.saturationLevel) saturated++;
        }
      }
      const n = channels[0].length || 1;
      const mean = sum.map((s) => s / n);
      const pairs = [
        [0, 0],
        [1, 1],
        [2, 2],
        [0, 1],
        [0, 2],
        [1, 2],
      ];
      cells.push({
        row,
        col,
        medians: channels.map((c) => median(c)),
        covariance: pairs.map(([a, b], k) =>
          Math.max(0, products[k] / n - mean[a] * mean[b]),
        ),
        saturated: saturated / n,
        window: [x0, y0, x1, y1],
      });
    }
  }
  return cells;
}
