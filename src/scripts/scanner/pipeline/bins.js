import { COLS, ROWS, DEFAULT_CONFIG, SHADE_PRIOR_RATIOS } from "./config.js";
import {
  median,
  robustSigma,
  normalCdf,
  weightedLeastSquares,
  tukeyWeight,
} from "./image.js";
import { fitIllumination, correctCells } from "./illumination.js";
import { UNSET } from "./pattern.js";

function weightedMedian(pairs) {
  pairs.sort((a, b) => a[0] - b[0]);
  const total = pairs.reduce((s, p) => s + p[1], 0);
  let acc = 0;
  for (const [value, weight] of pairs) {
    acc += weight;
    if (acc >= total / 2) return value;
  }
  return pairs.length ? pairs[pairs.length - 1][0] : 1;
}

export function localGains(values, target, centers, options = {}) {
  const config = { ...DEFAULT_CONFIG, ...options.config };
  const radius = config.localRadius;
  const sigma = config.localSigma;
  const reach = Math.ceil(radius);
  const gains = new Float32Array(values.length).fill(1);
  for (let i = 0; i < values.length; i++) {
    const col = i % COLS;
    const row = Math.floor(i / COLS);
    const pairs = [];
    for (let dr = -reach; dr <= reach; dr++) {
      for (let dc = -reach; dc <= reach; dc++) {
        if (!dr && !dc) continue;
        const r = row + dr;
        const c = col + dc;
        if (r < 0 || c < 0 || r >= ROWS || c >= COLS) continue;
        if (dr * dr + dc * dc > radius * radius) continue;
        const j = r * COLS + c;
        const t = target[j];
        if (t === UNSET || !(centers[t] > 0)) continue;
        const weight =
          Math.exp(-(dr * dr + dc * dc) / (2 * sigma * sigma)) *
          (centers[t] / centers[0]);
        pairs.push([values[j] / centers[t], weight]);
      }
    }
    if (pairs.length >= config.localMinNeighbours) {
      gains[i] = weightedMedian(pairs);
    }
  }
  return gains;
}

export function localBins(values, labels, bins, usable, options = {}) {
  const scales = options.scales;
  const config = { ...DEFAULT_CONFIG, ...options.config };
  const radius = config.localRadius;
  const sigma = config.localSigma;
  const reach = Math.ceil(radius);
  const floor = Math.min(...bins.map((bin) => bin.sigma));
  return values.map((_, i) => {
    const fallback = scales
      ? bins.map((bin) => ({
          ...bin,
          center: bin.center * scales[i],
          sigma: bin.sigma * scales[i],
        }))
      : bins;
    const col = i % COLS;
    const row = Math.floor(i / COLS);
    const points = [];
    for (let dr = -reach; dr <= reach; dr++) {
      for (let dc = -reach; dc <= reach; dc++) {
        if (!dr && !dc) continue;
        if (dr * dr + dc * dc > radius * radius) continue;
        const r = row + dr;
        const c = col + dc;
        if (r < 0 || c < 0 || r >= ROWS || c >= COLS) continue;
        const j = r * COLS + c;
        if (!usable[j] || !bins[labels[j]]) continue;
        const weight = Math.exp(-(dr * dr + dc * dc) / (2 * sigma * sigma));
        points.push([bins[labels[j]].center, values[j], weight]);
      }
    }
    if (points.length < config.localMinNeighbours) return fallback;
    const levels = new Set(points.map((p) => p[0]));
    let weights = points.map((p) => p[2]);
    let offset = 0;
    let gain = 1;
    let spread = 0;
    const minSpread = floor * (scales?.[i] ?? 1);
    for (let pass = 0; pass < 3; pass++) {
      const fit =
        levels.size >= 2
          ? weightedLeastSquares(
              points.map((p) => [1, p[0]]),
              points.map((p) => p[1]),
              weights,
            )
          : null;
      if (fit) {
        [offset, gain] = fit;
      } else {
        offset = 0;
        gain = weightedMedian(points.map((p, k) => [p[1] / p[0], weights[k]]));
      }
      const residuals = points.map((p) => p[1] - (offset + gain * p[0]));
      spread = Math.max(minSpread, robustSigma(residuals));
      weights = points.map((p, k) => p[2] * tukeyWeight(residuals[k], spread));
    }
    if (!(gain > 0.3 * (scales?.[i] ?? 1) && gain < 3 * (scales?.[i] ?? 1))) {
      return fallback;
    }
    return bins.map((bin) => ({
      ...bin,
      center: offset + gain * bin.center,
      sigma: bin.sigma * gain,
    }));
  });
}

export function shadeAxis(colors) {
  const n = colors.length;
  const mean = [0, 1, 2].map((c) => colors.reduce((s, m) => s + m[c], 0) / n);
  const cov = [0, 0, 0, 0, 0, 0, 0, 0, 0];
  for (const m of colors) {
    const d = [m[0] - mean[0], m[1] - mean[1], m[2] - mean[2]];
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) cov[r * 3 + c] += d[r] * d[c];
    }
  }
  let axis = [0.58, 0.58, 0.58];
  for (let it = 0; it < 50; it++) {
    const next = [0, 1, 2].map(
      (r) =>
        cov[r * 3] * axis[0] +
        cov[r * 3 + 1] * axis[1] +
        cov[r * 3 + 2] * axis[2],
    );
    const length = Math.hypot(...next) || 1;
    axis = next.map((v) => v / length);
  }
  if (axis[0] + axis[1] + axis[2] < 0) axis = axis.map((v) => -v);
  return { mean, axis };
}

function axisScore(colors, target, axis) {
  const byShade = [[], [], [], []];
  colors.forEach((m, i) => {
    if (target[i] === UNSET) return;
    const v = m[0] * axis[0] + m[1] * axis[1] + m[2] * axis[2];
    byShade[target[i]].push(Math.log(Math.max(1, v)));
  });
  const stats = byShade
    .filter((l) => l.length >= 4)
    .map((l) => ({ center: median(l), sigma: robustSigma(l) }))
    .sort((a, b) => b.center - a.center);
  if (stats.length < 2) return -Infinity;
  let score = Infinity;
  for (let k = 1; k < stats.length; k++) {
    const gap = stats[k - 1].center - stats[k].center;
    const spread = stats[k - 1].sigma + stats[k].sigma + 1e-3;
    score = Math.min(score, gap / spread);
  }
  return score;
}

export function separatingAxis(colors, target, steps = 16) {
  const pca = shadeAxis(colors);
  let best = { ...pca, score: axisScore(colors, target, pca.axis) };
  for (let a = 0; a <= steps; a++) {
    const theta = (a / steps) * (Math.PI / 2);
    for (let b = 0; b <= steps; b++) {
      const phi = (b / steps) * (Math.PI / 2);
      const axis = [
        Math.sin(theta) * Math.cos(phi),
        Math.sin(theta) * Math.sin(phi),
        Math.cos(theta),
      ];
      const score = axisScore(colors, target, axis);
      if (score > best.score) best = { mean: pca.mean, axis, score };
    }
  }
  return best;
}

export function kmeans1dOptimal(values, k) {
  const order = values.map((v, i) => [v, i]).sort((a, b) => a[0] - b[0]);
  const x = order.map((p) => p[0]);
  const n = x.length;
  k = Math.min(k, n);
  const prefix = [0];
  const prefixSq = [0];
  for (const v of x) {
    prefix.push(prefix[prefix.length - 1] + v);
    prefixSq.push(prefixSq[prefixSq.length - 1] + v * v);
  }
  const cost = (i, j) => {
    const s = prefix[j + 1] - prefix[i];
    return prefixSq[j + 1] - prefixSq[i] - (s * s) / (j - i + 1);
  };
  const D = Array.from({ length: k }, () => new Float64Array(n).fill(Infinity));
  const B = Array.from({ length: k }, () => new Int32Array(n));
  for (let j = 0; j < n; j++) D[0][j] = cost(0, j);
  for (let c = 1; c < k; c++) {
    for (let j = c; j < n; j++) {
      for (let i = c; i <= j; i++) {
        const d = D[c - 1][i - 1] + cost(i, j);
        if (d < D[c][j]) {
          D[c][j] = d;
          B[c][j] = i;
        }
      }
    }
  }
  const labels = new Int32Array(n);
  let end = n - 1;
  for (let c = k - 1; c >= 0; c--) {
    const start = c ? B[c][end] : 0;
    for (let j = start; j <= end; j++) labels[order[j][1]] = k - 1 - c;
    end = start - 1;
  }
  return labels;
}

function binStats(values, labels, count, floor) {
  return Array.from({ length: count }, (_, b) => {
    const members = values.filter((_, i) => labels[i] === b);
    const sigma = members.length >= 5 ? robustSigma(members) : NaN;
    return {
      center: members.length ? median(members) : NaN,
      sigma: Number.isFinite(sigma) ? Math.max(floor, sigma) : NaN,
      count: members.length,
    };
  });
}

function valleyDepth(values, upper, lower) {
  const gap = upper.center - lower.center;
  const reach = gap / 8;
  const density = (x) => values.filter((v) => Math.abs(v - x) < reach).length;
  const steps = 16;
  const peakOf = (bin) => {
    let peak = 0;
    for (let t = -steps / 2; t <= steps / 2; t++) {
      peak = Math.max(peak, density(bin.center + (t / steps) * 4 * bin.sigma));
    }
    return peak;
  };
  const peak = Math.min(peakOf(upper), peakOf(lower));
  if (peak === 0) return 0;
  let valley = Infinity;
  for (let t = 1; t < steps; t++) {
    valley = Math.min(valley, density(lower.center + (t / steps) * gap));
  }
  return valley / peak;
}

export function clusterBins(values, mask, options = {}) {
  const config = { ...DEFAULT_CONFIG, ...options.config };
  let used = values.filter((_, i) => mask[i]);
  if (used.length < config.maxBins) used = values.slice();
  const range = Math.max(...used) - Math.min(...used) || 1;
  const floor = config.minSigmaFraction * range;
  const positive = 0.02 * Math.max(...used);
  let labels = Array.from(
    kmeans1dOptimal(
      used.map((v) => Math.log(Math.max(v, positive))),
      config.maxBins,
    ),
  );
  let count = Math.max(...labels) + 1;
  for (;;) {
    const stats = binStats(used, labels, count, floor);
    const pooled =
      median(stats.filter((s) => s.sigma).map((s) => s.sigma)) || floor;
    stats.forEach((s) => (s.sigma ||= pooled));
    if (!options.merge || count === 1) {
      return { bins: stats, separations: separationsOf(stats) };
    }
    const separations = separationsOf(stats);
    const overlap = separations.map((sep, b) =>
      Math.max(
        config.mergeSeparation / sep,
        valleyDepth(used, stats[b], stats[b + 1]) / config.mergeValley,
      ),
    );
    const worstOverlap = Math.max(...overlap);
    if (worstOverlap <= 1) return { bins: stats, separations };
    const worst = overlap.indexOf(worstOverlap);
    labels = labels.map((l) => (l > worst ? l - 1 : l));
    count--;
  }
}

function separationsOf(bins) {
  const out = [];
  for (let b = 0; b < bins.length - 1; b++) {
    out.push(
      (bins[b].center - bins[b + 1].center) /
        ((bins[b].sigma + bins[b + 1].sigma) / 2),
    );
  }
  return out;
}

function boundariesOf(bins) {
  const out = [];
  for (let b = 0; b < bins.length - 1; b++) {
    const [p, q] = [bins[b], bins[b + 1]];
    out.push((p.center * q.sigma + q.center * p.sigma) / (p.sigma + q.sigma));
  }
  return out;
}

export function assignBin(value, bins) {
  const bounds = boundariesOf(bins);
  let bin = bins.length - 1;
  for (let b = 0; b < bounds.length; b++) {
    if (value >= bounds[b]) {
      bin = b;
      break;
    }
  }
  const above = bin > 0 ? bounds[bin - 1] - value : Infinity;
  const below = bin < bins.length - 1 ? value - bounds[bin] : Infinity;
  const margin = Math.min(above, below);
  const z = Number.isFinite(margin)
    ? margin / bins[bin].sigma
    : 4 - Math.abs(value - bins[bin].center) / bins[bin].sigma;
  return { bin, z, confidence: normalCdf(z) };
}

function combinations(m) {
  const out = [];
  const pick = (start, chosen) => {
    if (chosen.length === m) return out.push(chosen);
    for (let s = start; s < 4; s++) pick(s + 1, [...chosen, s]);
  };
  pick(0, []);
  return out;
}

function plausibleSpacing(bins, shades, config) {
  if (bins.length < 2) return true;
  const xs = shades.map((s) => Math.log(SHADE_PRIOR_RATIOS[s]));
  const ys = bins.map((b) => Math.log(Math.max(1e-6, b.center)));
  const mx = xs.reduce((a, b) => a + b, 0) / xs.length;
  const my = ys.reduce((a, b) => a + b, 0) / ys.length;
  let sxy = 0;
  let sxx = 0;
  for (let i = 0; i < xs.length; i++) {
    sxy += (xs[i] - mx) * (ys[i] - my);
    sxx += (xs[i] - mx) * (xs[i] - mx);
  }
  const gamma = sxy / sxx;
  if (gamma < config.minGamma || gamma > config.maxGamma) return false;
  if (bins.length === 2) return true;
  const rms = Math.sqrt(
    xs.reduce((a, x, i) => a + (my + gamma * (x - mx) - ys[i]) ** 2, 0) /
      xs.length,
  );
  return rms <= config.maxSpacingError;
}

export function mapBins(bins, binOf, target, options = {}) {
  const config = { ...DEFAULT_CONFIG, ...options.config };
  const defined = [...target.keys()].filter((i) => target[i] !== UNSET);
  let best = null;
  for (const shades of combinations(bins.length)) {
    const agree = defined.filter((i) => shades[binOf[i]] === target[i]).length;
    const plausible = plausibleSpacing(bins, shades, config);
    const score = agree / (defined.length || 1) + (plausible ? 1 : 0);
    if (!best || score > best.score) best = { shades, score, plausible };
  }
  return best;
}

function chromaOf(color) {
  const mean = (color[0] + color[1] + color[2]) / 3;
  return [color[0] - mean, color[1] - mean, color[2] - mean];
}

export function washedOutRegions(flat, target, levels, config, skip) {
  const reach = config.contrastRadius;
  return flat.map((_, i) => {
    const col = i % COLS;
    const row = Math.floor(i / COLS);
    const byShade = [[], [], [], []];
    for (let dr = -reach; dr <= reach; dr++) {
      for (let dc = -reach; dc <= reach; dc++) {
        const r = row + dr;
        const c = col + dc;
        if (r < 0 || c < 0 || r >= ROWS || c >= COLS) continue;
        const j = r * COLS + c;
        const s = target[j];
        if (s === UNSET || !(levels[s] > 0) || skip?.[j]) continue;
        byShade[s].push(flat[j] / levels[s]);
      }
    }
    const present = [0, 1, 2, 3].filter((s) => byShade[s].length >= 3);
    if (present.length < 2) return false;
    const bright = median(byShade[present[0]]);
    const dark = median(byShade[present[present.length - 1]]);
    return dark / bright > config.maxContrastLoss;
  });
}

function whitenessOf(color, base) {
  const baseChroma = chromaOf(base);
  const chroma = chromaOf(color);
  const chromaSq = baseChroma.reduce((sum, v) => sum + v * v, 0);
  const mean = (base[0] + base[1] + base[2]) / 3;
  if (chromaSq < (0.08 * mean) ** 2) return NaN;
  const scale =
    chroma.reduce((sum, v, k) => sum + v * baseChroma[k], 0) / chromaSq;
  if (!(scale > 0)) return NaN;
  return (color[0] + color[1] + color[2]) / 3 - scale * mean;
}

function markAnomalies(samples, values, binOf, bins, config, extra) {
  const { washed, active, lighting } = extra;
  const member = binOf.map((b, i) => (active[i] ? b : -1));
  const colors = samples.map((s, i) =>
    s.medians.map((v) => v / (lighting[i] || 1)),
  );
  const binColor = bins.map((_, b) =>
    [0, 1, 2].map((c) =>
      median(colors.filter((_, i) => member[i] === b).map((m) => m[c])),
    ),
  );
  const outlier = colors.map((m, i) =>
    Math.hypot(...m.map((v, c) => v - binColor[binOf[i]][c])),
  );
  const peak = Math.max(...binColor.map((c) => Math.max(...c)));
  const floor = config.colorOutlierFloor * peak;
  const typicalOutlier = bins.map((_, b) =>
    Math.max(floor, median(outlier.filter((_, i) => member[i] === b))),
  );
  const chroma = colors.map(chromaOf);
  const binHue = bins.map((_, b) => {
    const sum = [0, 0, 0];
    chroma.forEach((c, i) => {
      if (member[i] !== b) return;
      const length = Math.hypot(...c) || 1;
      for (let k = 0; k < 3; k++) sum[k] += c[k] / length;
    });
    const length = Math.hypot(...sum) || 1;
    return sum.map((v) => v / length);
  });
  const hueOffset = chroma.map((c, i) => {
    const hue = binHue[binOf[i]];
    const along = c[0] * hue[0] + c[1] * hue[1] + c[2] * hue[2];
    return Math.hypot(...c.map((v, k) => v - along * hue[k]));
  });
  const typicalHueOffset = bins.map((_, b) =>
    Math.max(
      config.minHueChroma / 2,
      median(hueOffset.filter((_, i) => member[i] === b)),
    ),
  );
  const whiteness = samples.map((s, i) =>
    whitenessOf(colors[i], binColor[binOf[i]]),
  );
  const whiteLimit = bins.map((_, b) => {
    const own = whiteness.filter(
      (w, i) => member[i] === b && Number.isFinite(w),
    );
    if (own.length < 5) return Infinity;
    return (
      median(own) +
      Math.max(config.minWhiteness * peak, config.certainZ * robustSigma(own))
    );
  });
  const clipped = samples.map((s) => s.saturated > config.maxSaturatedFraction);
  const brightest = samples.filter((_, i) => member[i] === 0);
  const exposureClipping =
    brightest.filter((s) => s.saturated > config.maxSaturatedFraction).length >
    config.clippedBinFraction * brightest.length;
  const seed = samples.map((s, i) => {
    if (!active[i]) return null;
    const overexposed =
      binOf[i] === 0 &&
      (exposureClipping ||
        values[i] <= bins[0].center + config.certainZ * bins[0].sigma);
    if (clipped[i] && !overexposed) return "clipped";
    if (washed && washed[i]) return "washed";
    const length = Math.hypot(...chroma[i]);
    if (length >= config.minHueChroma) {
      const hue = binHue[binOf[i]];
      const cos =
        (chroma[i][0] * hue[0] +
          chroma[i][1] * hue[1] +
          chroma[i][2] * hue[2]) /
        length;
      if (
        cos < Math.cos((config.maxHueShift * Math.PI) / 180) &&
        hueOffset[i] > config.maxOffAxis * typicalHueOffset[binOf[i]]
      )
        return "hue";
    }
    if (outlier[i] > config.maxOffAxis * typicalOutlier[binOf[i]]) {
      return "noisy";
    }
    return null;
  });
  const spread = seed.map(
    (type) => type === "clipped" || type === "hue" || type === "washed",
  );
  const queue = [...spread.keys()].filter((i) => spread[i]);
  while (queue.length) {
    const i = queue.pop();
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        const r = samples[i].row + dr;
        const c = samples[i].col + dc;
        if (r < 0 || c < 0 || r >= ROWS || c >= COLS) continue;
        const j = r * COLS + c;
        if (spread[j] || !(whiteness[j] > whiteLimit[binOf[j]])) continue;
        spread[j] = true;
        queue.push(j);
      }
    }
  }
  return samples.map((s, i) => {
    if (seed[i] === "noisy") return "noisy";
    if (seed[i] || spread[i]) return "glare";
    const reach = config.glareMargin;
    for (let dr = -reach; dr <= reach; dr++) {
      for (let dc = -reach; dc <= reach; dc++) {
        const r = s.row + dr;
        const c = s.col + dc;
        if (r < 0 || c < 0 || r >= ROWS || c >= COLS) continue;
        if (spread[r * COLS + c]) return "glare";
      }
    }
    return null;
  });
}

export function classifyBins(samples, target, options = {}) {
  const config = { ...DEFAULT_CONFIG, ...options.config };
  const pca = shadeAxis(samples.map((s) => s.medians));
  const pcaCells = samples.map((s) => ({
    ...s,
    value:
      s.medians[0] * pca.axis[0] +
      s.medians[1] * pca.axis[1] +
      s.medians[2] * pca.axis[2],
  }));
  const pcaFlat = correctCells(pcaCells, fitIllumination(pcaCells, target));
  const axis = separatingAxis(
    samples.map((s, i) => {
      const gain = pcaCells[i].value / (pcaFlat[i] || 1);
      return s.medians.map((v) => v / (gain || 1));
    }),
    target,
  );
  const raw = samples.map(
    (s) =>
      s.medians[0] * axis.axis[0] +
      s.medians[1] * axis.axis[1] +
      s.medians[2] * axis.axis[2],
  );
  const lighting = fitIllumination(
    samples.map((s, i) => ({ ...s, value: raw[i] })),
    target,
  );
  let values = correctCells(
    samples.map((s, i) => ({ ...s, value: raw[i] })),
    lighting,
  );
  const flat = values;
  const active = Array.from(target, (shade) => shade !== UNSET);
  const scale = raw.map((v, i) => v / (flat[i] || 1));
  const typicalScale = median(scale.filter((_, i) => active[i])) || 1;
  const shading = scale.map((v) => v / typicalScale);
  let mask = active.slice();
  let result = null;
  let gains = new Float32Array(samples.length).fill(1);
  for (let pass = 0; pass <= config.binPasses; pass++) {
    const { bins, separations } = clusterBins(values, mask, {
      config,
      merge: pass === config.binPasses,
    });
    const binOf = values.map((v) => assignBin(v, bins).bin);
    const mapping = mapBins(bins, binOf, target, { config });
    const anomalies = markAnomalies(samples, values, binOf, bins, config, {
      washed: null,
      active,
      lighting: shading,
    });
    result = { bins, separations, binOf, mapping, anomalies };
    if (pass === config.binPasses) break;

    const labels = Int8Array.from(binOf, (b, i) =>
      anomalies[i] ? UNSET : mapping.shades[b],
    );
    const cells = samples.map((s, i) => ({ ...s, value: raw[i] }));
    const smooth = correctCells(cells, fitIllumination(cells, labels));
    const centers = [NaN, NaN, NaN, NaN];
    mapping.shades.forEach((shade, b) => {
      const own = smooth.filter((_, i) => labels[i] === shade);
      if (own.length) centers[shade] = median(own);
    });
    gains = localGains(smooth, labels, centers, { config });
    values = smooth.map((v, i) => v / gains[i]);
    mask = anomalies.map((a, i) => active[i] && !a);
  }

  const levels = [NaN, NaN, NaN, NaN];
  result.mapping.shades.forEach((shade, b) => {
    const own = flat.filter((_, i) => target[i] === shade);
    levels[shade] = own.length >= 3 ? median(own) : NaN;
  });
  const washed = washedOutRegions(
    flat,
    target,
    levels,
    config,
    samples.map((s) => s.saturated > config.maxSaturatedFraction),
  );
  result.anomalies = markAnomalies(
    samples,
    values,
    result.binOf,
    result.bins,
    config,
    { washed, active, lighting: shading },
  );

  const { bins, binOf, mapping, anomalies } = result;
  const gapAround = (near, b) =>
    Math.min(
      b > 0 ? near[b - 1].center - near[b].center : Infinity,
      b < near.length - 1 ? near[b].center - near[b + 1].center : Infinity,
    );
  const spread = samples.map((s) => {
    const [rr, gg, bb, rg, rb, gb] = s.covariance;
    const [a, b, c] = axis.axis;
    return Math.sqrt(
      Math.max(
        0,
        a * a * rr +
          b * b * gg +
          c * c * bb +
          2 * (a * b * rg + a * c * rb + b * c * gb),
      ),
    );
  });
  const usable = anomalies.map((a, i) => active[i] && !a);
  const labels = Int8Array.from(target, (shade) =>
    shade === UNSET ? -1 : mapping.shades.indexOf(shade),
  );
  const local = localBins(raw, labels, bins, usable, {
    config,
    scales: raw.map((v, i) => v / (flat[i] || 1)),
  });
  const outer = (i) => {
    const row = Math.floor(i / COLS);
    const col = i % COLS;
    return row === 0 || col === 0 || row === ROWS - 1 || col === COLS - 1;
  };
  const levelDeviation = (i) => {
    const { bin } = assignBin(raw[i], local[i]);
    return (raw[i] - local[i][bin].center) / local[i][bin].sigma;
  };
  const deviationSpread = (pick) =>
    robustSigma(
      [...raw.keys()].filter((i) => usable[i] && pick(i)).map(levelDeviation),
    );
  const edgeScale = Math.min(
    config.maxEdgeScale,
    Math.max(
      1,
      deviationSpread(outer) / deviationSpread((i) => !outer(i)) || 1,
    ),
  );
  const verdicts = raw.map((v, i) => {
    const fit = assignBin(v, local[i]);
    const bin = fit.bin;
    const z = outer(i) ? fit.z / edgeScale : fit.z;
    const confidence = normalCdf(z);
    const global = assignBin(values[i], bins);
    const near = local[i];
    const deviation = v - near[bin].center;
    const toward =
      deviation > 0
        ? bin > 0
          ? near[bin - 1].center - near[bin].center
          : Infinity
        : bin < near.length - 1
          ? near[bin].center - near[bin + 1].center
          : Infinity;
    const offLevel = Math.abs(deviation) > config.maxOffLevel * toward;
    const noisy = spread[i] > config.maxStdToGap * gapAround(local[i], bin);
    const found = mapping.shades[bin];
    const expected = target[i];
    let state;
    let reason = null;
    if (expected === UNSET) {
      state = "ignored";
    } else if (anomalies[i]) {
      state = "uncertain";
      reason = anomalies[i];
    } else if (noisy) {
      state = "uncertain";
      reason = "noisy";
    } else if (z < config.certainZ || offLevel) {
      state = "uncertain";
      reason = "low-margin";
    } else if (global.bin !== bin && global.z >= config.certainZ) {
      state = "uncertain";
      reason = "lighting";
    } else {
      state = found === expected ? "correct" : "wrong";
    }
    return { expected, found, z, confidence, state, reason, value: values[i] };
  });
  return {
    axis,
    raw,
    gains,
    values,
    bins,
    separations: result.separations,
    shades: mapping.shades,
    edgeScale,
    plausibleSpacing: mapping.plausible,
    verdicts,
    anomalies,
  };
}
