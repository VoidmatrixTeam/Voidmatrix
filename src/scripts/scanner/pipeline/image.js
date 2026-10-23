export function createChannel(width, height) {
  return { width, height, data: new Float32Array(width * height) };
}

export function downscaleRGBA(frame, rect, scale) {
  const outW = Math.max(1, Math.round(rect.width * scale));
  const outH = Math.max(1, Math.round(rect.height * scale));
  const r = new Float32Array(outW * outH);
  const g = new Float32Array(outW * outH);
  const b = new Float32Array(outW * outH);
  const count = new Float32Array(outW * outH);
  const x0 = Math.max(0, Math.floor(rect.x));
  const y0 = Math.max(0, Math.floor(rect.y));
  const x1 = Math.min(frame.width, Math.ceil(rect.x + rect.width));
  const y1 = Math.min(frame.height, Math.ceil(rect.y + rect.height));
  const sx = outW / rect.width;
  const sy = outH / rect.height;
  const src = frame.data;

  for (let y = y0; y < y1; y++) {
    const oy = Math.min(outH - 1, Math.floor((y - rect.y) * sy));
    for (let x = x0; x < x1; x++) {
      const ox = Math.min(outW - 1, Math.floor((x - rect.x) * sx));
      const o = oy * outW + ox;
      const i = (y * frame.width + x) * 4;
      r[o] += src[i];
      g[o] += src[i + 1];
      b[o] += src[i + 2];
      count[o]++;
    }
  }
  for (let i = 0; i < r.length; i++) {
    const c = count[i] || 1;
    r[i] /= c;
    g[i] /= c;
    b[i] /= c;
  }
  const make = (data) => ({ width: outW, height: outH, data });
  return { r: make(r), g: make(g), b: make(b), scale: sx, rect };
}

export function luma(rgb) {
  const out = createChannel(rgb.r.width, rgb.r.height);
  for (let i = 0; i < out.data.length; i++) {
    out.data[i] =
      0.299 * rgb.r.data[i] + 0.587 * rgb.g.data[i] + 0.114 * rgb.b.data[i];
  }
  return out;
}

export function estimateTint(rgb, gains, box) {
  const { width: w } = rgb.r;
  const samples = [];
  for (let y = box.y0; y < box.y1; y++) {
    for (let x = box.x0; x < box.x1; x++) {
      const i = y * w + x;
      const r = rgb.r.data[i] * gains[0];
      const g = rgb.g.data[i] * gains[1];
      const b = rgb.b.data[i] * gains[2];
      const m = (r + g + b) / 3;
      const d = [r - m, g - m, b - m];
      const len = Math.hypot(d[0], d[1], d[2]);
      const max = Math.max(r, g, b);
      samples.push({ d, len, sat: len / (max + 20) });
    }
  }
  const cut = percentile(
    samples.map((s) => s.sat),
    0.5,
  );
  const sum = [0, 0, 0];
  for (const s of samples) {
    if (s.sat < cut || s.len === 0) continue;
    for (let c = 0; c < 3; c++) sum[c] += s.d[c] / s.len;
  }
  const len = Math.hypot(sum[0], sum[1], sum[2]);
  return len > 0 ? sum.map((v) => v / len) : [0, 1, 0];
}

export function tintStrength(rgb, gains, tint, offset = 20, darkLevel = 0) {
  const out = createChannel(rgb.r.width, rgb.r.height);
  for (let i = 0; i < out.data.length; i++) {
    const r = rgb.r.data[i] * gains[0];
    const g = rgb.g.data[i] * gains[1];
    const b = rgb.b.data[i] * gains[2];
    const m = (r + g + b) / 3;
    const max = Math.max(r, g, b);
    const proj = (r - m) * tint[0] + (g - m) * tint[1] + (b - m) * tint[2];
    const fade = darkLevel > 0 ? Math.min(1, max / darkLevel) : 1;
    out.data[i] = (100 * Math.max(0, proj) * fade) / (max + offset);
  }
  return out;
}

export function blurRGB(rgb, sigma) {
  return {
    ...rgb,
    r: gaussianBlur(rgb.r, sigma),
    g: gaussianBlur(rgb.g, sigma),
    b: gaussianBlur(rgb.b, sigma),
  };
}

function gaussianKernel(sigma) {
  const radius = Math.max(1, Math.ceil(sigma * 3));
  const kernel = new Float32Array(radius * 2 + 1);
  let sum = 0;
  for (let i = -radius; i <= radius; i++) {
    const v = Math.exp(-(i * i) / (2 * sigma * sigma));
    kernel[i + radius] = v;
    sum += v;
  }
  for (let i = 0; i < kernel.length; i++) kernel[i] /= sum;
  return { kernel, radius };
}

export function gaussianBlur(channel, sigma) {
  if (sigma <= 0) return channel;
  const { width: w, height: h } = channel;
  const { kernel, radius } = gaussianKernel(sigma);
  const tmp = new Float32Array(w * h);
  const out = new Float32Array(w * h);
  const src = channel.data;

  for (let y = 0; y < h; y++) {
    const row = y * w;
    for (let x = 0; x < w; x++) {
      let acc = 0;
      for (let k = -radius; k <= radius; k++) {
        const xx = Math.min(w - 1, Math.max(0, x + k));
        acc += src[row + xx] * kernel[k + radius];
      }
      tmp[row + x] = acc;
    }
  }
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let acc = 0;
      for (let k = -radius; k <= radius; k++) {
        const yy = Math.min(h - 1, Math.max(0, y + k));
        acc += tmp[yy * w + x] * kernel[k + radius];
      }
      out[y * w + x] = acc;
    }
  }
  return { width: w, height: h, data: out };
}

export function bilinear(channel, x, y) {
  const { width: w, height: h, data } = channel;
  const cx = Math.min(w - 1.001, Math.max(0, x));
  const cy = Math.min(h - 1.001, Math.max(0, y));
  const x0 = Math.floor(cx);
  const y0 = Math.floor(cy);
  const fx = cx - x0;
  const fy = cy - y0;
  const i = y0 * w + x0;
  const top = data[i] + (data[i + 1] - data[i]) * fx;
  const bottom = data[i + w] + (data[i + w + 1] - data[i + w]) * fx;
  return top + (bottom - top) * fy;
}

export function percentile(values, p) {
  if (values.length === 0) return NaN;
  if (values.length > 4096) return histogramPercentile(values, p);
  const sorted = Float32Array.from(values).sort();
  const idx = Math.min(sorted.length - 1, Math.max(0, p * (sorted.length - 1)));
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
}

function histogramPercentile(values, p) {
  let min = Infinity;
  let max = -Infinity;
  for (let i = 0; i < values.length; i++) {
    const v = values[i];
    if (v < min) min = v;
    if (v > max) max = v;
  }
  if (max === min) return min;
  const bins = 1024;
  const hist = new Uint32Array(bins);
  const scale = (bins - 1) / (max - min);
  for (let i = 0; i < values.length; i++)
    hist[Math.round((values[i] - min) * scale)]++;
  const target = p * (values.length - 1);
  let acc = 0;
  for (let b = 0; b < bins; b++) {
    acc += hist[b];
    if (acc > target) return min + b / scale;
  }
  return max;
}

export function median(values) {
  return percentile(values, 0.5);
}

export function robustSigma(values) {
  if (values.length < 2) return NaN;
  const m = median(values);
  return 1.4826 * median(values.map((v) => Math.abs(v - m)));
}

export function normalCdf(z) {
  const t = 1 / (1 + 0.3275911 * Math.abs(z / Math.SQRT2));
  const poly =
    t *
    (0.254829592 +
      t *
        (-0.284496736 +
          t * (1.421413741 + t * (-1.453152027 + t * 1.061405429))));
  const erf = 1 - poly * Math.exp(-(z * z) / 2);
  return z >= 0 ? 0.5 * (1 + erf) : 0.5 * (1 - erf);
}

export function solveLinear(A, b, n) {
  const m = A.slice();
  const v = b.slice();
  for (let col = 0; col < n; col++) {
    let pivot = col;
    for (let row = col + 1; row < n; row++) {
      if (Math.abs(m[row * n + col]) > Math.abs(m[pivot * n + col]))
        pivot = row;
    }
    if (Math.abs(m[pivot * n + col]) < 1e-12) return null;
    if (pivot !== col) {
      for (let k = 0; k < n; k++) {
        const t = m[col * n + k];
        m[col * n + k] = m[pivot * n + k];
        m[pivot * n + k] = t;
      }
      const t = v[col];
      v[col] = v[pivot];
      v[pivot] = t;
    }
    for (let row = col + 1; row < n; row++) {
      const f = m[row * n + col] / m[col * n + col];
      if (f === 0) continue;
      for (let k = col; k < n; k++) m[row * n + k] -= f * m[col * n + k];
      v[row] -= f * v[col];
    }
  }
  const x = new Array(n).fill(0);
  for (let row = n - 1; row >= 0; row--) {
    let acc = v[row];
    for (let k = row + 1; k < n; k++) acc -= m[row * n + k] * x[k];
    x[row] = acc / m[row * n + row];
  }
  return x;
}

export function weightedLeastSquares(X, y, w) {
  const p = X[0].length;
  const A = new Array(p * p).fill(0);
  const b = new Array(p).fill(0);
  for (let i = 0; i < X.length; i++) {
    const xi = X[i];
    const wi = w ? w[i] : 1;
    if (wi === 0) continue;
    for (let r = 0; r < p; r++) {
      b[r] += wi * xi[r] * y[i];
      for (let c = 0; c < p; c++) A[r * p + c] += wi * xi[r] * xi[c];
    }
  }
  for (let r = 0; r < p; r++) A[r * p + r] += 1e-9;
  return solveLinear(A, b, p);
}

export function tukeyWeight(residual, scale) {
  const u = residual / (4.685 * scale);
  if (Math.abs(u) >= 1) return 0;
  const t = 1 - u * u;
  return t * t;
}
