import { solveLinear } from "./image.js";

export function solveHomography(src, dst) {
  const A = [];
  const b = [];
  for (let i = 0; i < 4; i++) {
    const [x, y] = src[i];
    const [u, v] = dst[i];
    A.push(x, y, 1, 0, 0, 0, -u * x, -u * y);
    b.push(u);
    A.push(0, 0, 0, x, y, 1, -v * x, -v * y);
    b.push(v);
  }
  const h = solveLinear(A, b, 8);
  return h ? [...h, 1] : null;
}

export function applyHomography(H, x, y) {
  const w = H[6] * x + H[7] * y + H[8];
  return [(H[0] * x + H[1] * y + H[2]) / w, (H[3] * x + H[4] * y + H[5]) / w];
}

export function invertHomography(H) {
  const [a, b, c, d, e, f, g, h, i] = H;
  const A = e * i - f * h;
  const B = -(d * i - f * g);
  const C = d * h - e * g;
  const det = a * A + b * B + c * C;
  if (Math.abs(det) < 1e-12) return null;
  const inv = [
    A,
    -(b * i - c * h),
    b * f - c * e,
    B,
    a * i - c * g,
    -(a * f - c * d),
    C,
    -(a * h - b * g),
    a * e - b * d,
  ];
  return inv.map((v) => v / inv[8]);
}

export function multiplyHomography(A, B) {
  const out = new Array(9).fill(0);
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      for (let k = 0; k < 3; k++) out[r * 3 + c] += A[r * 3 + k] * B[k * 3 + c];
    }
  }
  return out.map((v) => v / out[8]);
}

export function warpRGBA(frame, H, outW, outH, supersample = 2) {
  const r = new Float32Array(outW * outH);
  const g = new Float32Array(outW * outH);
  const b = new Float32Array(outW * outH);
  const { width: w, height: h, data } = frame;
  const n = supersample;
  const inv = 1 / (n * n);

  for (let y = 0; y < outH; y++) {
    for (let x = 0; x < outW; x++) {
      let ar = 0;
      let ag = 0;
      let ab = 0;
      for (let sy = 0; sy < n; sy++) {
        for (let sx = 0; sx < n; sx++) {
          const px = x + (sx + 0.5) / n;
          const py = y + (sy + 0.5) / n;
          const den = H[6] * px + H[7] * py + H[8];
          const u = Math.min(
            w - 1.001,
            Math.max(0, (H[0] * px + H[1] * py + H[2]) / den - 0.5),
          );
          const v = Math.min(
            h - 1.001,
            Math.max(0, (H[3] * px + H[4] * py + H[5]) / den - 0.5),
          );
          const x0 = Math.floor(u);
          const y0 = Math.floor(v);
          const fx = u - x0;
          const fy = v - y0;
          const i00 = (y0 * w + x0) * 4;
          const i01 = i00 + 4;
          const i10 = i00 + w * 4;
          const i11 = i10 + 4;
          const w00 = (1 - fx) * (1 - fy);
          const w01 = fx * (1 - fy);
          const w10 = (1 - fx) * fy;
          const w11 = fx * fy;
          ar +=
            data[i00] * w00 +
            data[i01] * w01 +
            data[i10] * w10 +
            data[i11] * w11;
          ag +=
            data[i00 + 1] * w00 +
            data[i01 + 1] * w01 +
            data[i10 + 1] * w10 +
            data[i11 + 1] * w11;
          ab +=
            data[i00 + 2] * w00 +
            data[i01 + 2] * w01 +
            data[i10 + 2] * w10 +
            data[i11 + 2] * w11;
        }
      }
      const o = y * outW + x;
      r[o] = ar * inv;
      g[o] = ag * inv;
      b[o] = ab * inv;
    }
  }
  const make = (d) => ({ width: outW, height: outH, data: d });
  return { r: make(r), g: make(g), b: make(b) };
}
