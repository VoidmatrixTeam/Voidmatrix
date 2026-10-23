import { COLS, ROWS, DEFAULT_CONFIG } from "./config.js";
import {
  downscaleRGBA,
  estimateTint,
  tintStrength,
  blurRGB,
  percentile,
  luma,
  bilinear,
  median,
  tukeyWeight,
} from "./image.js";

export function searchRegion(frame, roi, margin) {
  if (!roi) return { x: 0, y: 0, width: frame.width, height: frame.height };
  const mx = roi.width * margin;
  const my = roi.height * margin;
  const x = Math.max(0, roi.x - mx);
  const y = Math.max(0, roi.y - my);
  return {
    x,
    y,
    width: Math.min(frame.width, roi.x + roi.width + mx) - x,
    height: Math.min(frame.height, roi.y + roi.height + my) - y,
  };
}

function downscaleChannel(channel, factor) {
  if (factor <= 1) return channel;
  const w = Math.floor(channel.width / factor);
  const h = Math.floor(channel.height / factor);
  const out = new Float32Array(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let acc = 0;
      for (let dy = 0; dy < factor; dy++) {
        const row = (y * factor + dy) * channel.width + x * factor;
        for (let dx = 0; dx < factor; dx++) acc += channel.data[row + dx];
      }
      out[y * w + x] = acc / (factor * factor);
    }
  }
  return { width: w, height: h, data: out };
}

function filledComponents(mask, w, h) {
  const n = w * h;
  const outside = new Uint8Array(n);
  const stack = new Int32Array(n);
  let top = 0;
  const seed = (i) => {
    if (!mask[i] && !outside[i]) {
      outside[i] = 1;
      stack[top++] = i;
    }
  };
  for (let x = 0; x < w; x++) {
    seed(x);
    seed((h - 1) * w + x);
  }
  for (let y = 0; y < h; y++) {
    seed(y * w);
    seed(y * w + w - 1);
  }
  while (top > 0) {
    const i = stack[--top];
    const x = i % w;
    if (x > 0 && !mask[i - 1] && !outside[i - 1]) {
      outside[i - 1] = 1;
      stack[top++] = i - 1;
    }
    if (x < w - 1 && !mask[i + 1] && !outside[i + 1]) {
      outside[i + 1] = 1;
      stack[top++] = i + 1;
    }
    if (i >= w && !mask[i - w] && !outside[i - w]) {
      outside[i - w] = 1;
      stack[top++] = i - w;
    }
    if (i < n - w && !mask[i + w] && !outside[i + w]) {
      outside[i + w] = 1;
      stack[top++] = i + w;
    }
  }

  const labels = new Int32Array(n).fill(-1);
  const components = [];
  for (let start = 0; start < n; start++) {
    if (outside[start] || labels[start] !== -1) continue;
    const id = components.length;
    let area = 0;
    let minX = w;
    let maxX = 0;
    let minY = h;
    let maxY = 0;
    labels[start] = id;
    stack[top++] = start;
    while (top > 0) {
      const i = stack[--top];
      const x = i % w;
      const y = (i - x) / w;
      area++;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
      if (x > 0 && !outside[i - 1] && labels[i - 1] === -1) {
        labels[i - 1] = id;
        stack[top++] = i - 1;
      }
      if (x < w - 1 && !outside[i + 1] && labels[i + 1] === -1) {
        labels[i + 1] = id;
        stack[top++] = i + 1;
      }
      if (y > 0 && !outside[i - w] && labels[i - w] === -1) {
        labels[i - w] = id;
        stack[top++] = i - w;
      }
      if (y < h - 1 && !outside[i + w] && labels[i + w] === -1) {
        labels[i + w] = id;
        stack[top++] = i + w;
      }
    }
    components.push({ id, area, minX, maxX, minY, maxY });
  }
  return { labels, components };
}

export function fitLine(points, weights, iterations = 8, minScale = 0.5) {
  let w = weights ? weights.slice() : points.map(() => 1);
  let line = null;
  for (let it = 0; it < iterations; it++) {
    let sw = 0;
    let mx = 0;
    let my = 0;
    for (let i = 0; i < points.length; i++) {
      sw += w[i];
      mx += w[i] * points[i][0];
      my += w[i] * points[i][1];
    }
    if (sw <= 0) return null;
    mx /= sw;
    my /= sw;
    let sxx = 0;
    let sxy = 0;
    let syy = 0;
    for (let i = 0; i < points.length; i++) {
      const dx = points[i][0] - mx;
      const dy = points[i][1] - my;
      sxx += w[i] * dx * dx;
      sxy += w[i] * dx * dy;
      syy += w[i] * dy * dy;
    }
    const angle = 0.5 * Math.atan2(2 * sxy, sxx - syy);
    const dir = [Math.cos(angle), Math.sin(angle)];
    const residuals = points.map(
      (p) => (p[0] - mx) * -dir[1] + (p[1] - my) * dir[0],
    );
    const sigma = Math.max(minScale, 1.4826 * median(residuals.map(Math.abs)));
    line = { point: [mx, my], dir, sigma, residuals };
    w = residuals.map(
      (r, i) => (weights ? weights[i] : 1) * tukeyWeight(r, sigma),
    );
  }
  line.inliers = w.filter((v) => v > 0).length;
  line.weights = w;
  return line;
}

export function intersectLines(a, b) {
  const [x1, y1] = a.point;
  const [dx1, dy1] = a.dir;
  const [x2, y2] = b.point;
  const [dx2, dy2] = b.dir;
  const den = dx1 * dy2 - dy1 * dx2;
  if (Math.abs(den) < 1e-9) return null;
  const t = ((x2 - x1) * dy2 - (y2 - y1) * dx2) / den;
  return [x1 + t * dx1, y1 + t * dy1];
}

function polygonArea(q) {
  let a = 0;
  for (let i = 0; i < q.length; i++) {
    const [x1, y1] = q[i];
    const [x2, y2] = q[(i + 1) % q.length];
    a += x1 * y2 - x2 * y1;
  }
  return Math.abs(a) / 2;
}

const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);

export function quadAspect(q) {
  return (
    (dist(q[0], q[1]) + dist(q[3], q[2])) /
    (dist(q[0], q[3]) + dist(q[1], q[2]))
  );
}

function convexHull(points) {
  const pts = points.slice().sort((p, q) => p[0] - q[0] || p[1] - q[1]);
  const cross = (o, p, q) =>
    (p[0] - o[0]) * (q[1] - o[1]) - (p[1] - o[1]) * (q[0] - o[0]);
  const lower = [];
  for (const p of pts) {
    while (
      lower.length >= 2 &&
      cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0
    )
      lower.pop();
    lower.push(p);
  }
  const upper = [];
  for (let i = pts.length - 1; i >= 0; i--) {
    const p = pts[i];
    while (
      upper.length >= 2 &&
      cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0
    )
      upper.pop();
    upper.push(p);
  }
  return lower.slice(0, -1).concat(upper.slice(0, -1));
}

function maxAreaQuad(hull) {
  const n = hull.length;
  if (n < 4) return null;
  const area = (a, b, c) =>
    Math.abs((b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0])) / 2;
  let best = null;
  let bestArea = -1;
  for (let i = 0; i < n; i++) {
    for (let k = i + 2; k < n; k++) {
      let left = 0;
      let leftIndex = -1;
      for (let j = i + 1; j < k; j++) {
        const a = area(hull[i], hull[j], hull[k]);
        if (a > left) {
          left = a;
          leftIndex = j;
        }
      }
      let right = 0;
      let rightIndex = -1;
      for (let j = k + 1; j < n + i; j++) {
        const a = area(hull[i], hull[j % n], hull[k]);
        if (a > right) {
          right = a;
          rightIndex = j % n;
        }
      }
      if (leftIndex < 0 || rightIndex < 0) continue;
      if (left + right > bestArea) {
        bestArea = left + right;
        best = [hull[i], hull[leftIndex], hull[k], hull[rightIndex]];
      }
    }
  }
  return best;
}

function orderCorners(quad) {
  const cx = quad.reduce((s, p) => s + p[0], 0) / 4;
  const cy = quad.reduce((s, p) => s + p[1], 0) / 4;
  const sorted = quad
    .slice()
    .sort(
      (p, q) =>
        Math.atan2(p[1] - cy, p[0] - cx) - Math.atan2(q[1] - cy, q[0] - cx),
    );
  let first = 0;
  for (let i = 1; i < 4; i++) {
    if (sorted[i][0] + sorted[i][1] < sorted[first][0] + sorted[first][1]) {
      first = i;
    }
  }
  return [0, 1, 2, 3].map((k) => sorted[(first + k) % 4]);
}

function quadFromComponent(labels, w, comp) {
  const points = [];
  for (let y = comp.minY; y <= comp.maxY; y++) {
    let lo = -1;
    let hi = -1;
    for (let x = comp.minX; x <= comp.maxX; x++) {
      if (labels[y * w + x] === comp.id) {
        if (lo < 0) lo = x;
        hi = x;
      }
    }
    if (lo >= 0) points.push([lo, y + 0.5], [hi + 1, y + 0.5]);
  }
  for (let x = comp.minX; x <= comp.maxX; x++) {
    let lo = -1;
    let hi = -1;
    for (let y = comp.minY; y <= comp.maxY; y++) {
      if (labels[y * w + x] === comp.id) {
        if (lo < 0) lo = y;
        hi = y;
      }
    }
    if (lo >= 0) points.push([x + 0.5, lo], [x + 0.5, hi + 1]);
  }
  let hull = convexHull(points);
  if (hull.length > 60) {
    const step = hull.length / 60;
    hull = Array.from({ length: 60 }, (_, i) => hull[Math.floor(i * step)]);
  }
  const quad = maxAreaQuad(hull);
  return quad ? orderCorners(quad) : null;
}

function rectOverlap(quad, rect) {
  const xs = quad.map((p) => p[0]);
  const ys = quad.map((p) => p[1]);
  const ix = Math.max(
    0,
    Math.min(Math.max(...xs), rect.x + rect.width) -
      Math.max(Math.min(...xs), rect.x),
  );
  const iy = Math.max(
    0,
    Math.min(Math.max(...ys), rect.y + rect.height) -
      Math.max(Math.min(...ys), rect.y),
  );
  const inter = ix * iy;
  const union = polygonArea(quad) + rect.width * rect.height - inter;
  return union > 0 ? inter / union : 0;
}

export function coarseCandidates(feature, roiWork, thresholds, config) {
  const { width: w, height: h, data } = feature;
  const candidates = [];
  for (const threshold of thresholds) {
    if (candidates.some((c) => c.fill > 0.85 && c.aspectError < 0.1)) break;
    const mask = new Uint8Array(w * h);
    for (let i = 0; i < data.length; i++) mask[i] = data[i] > threshold ? 1 : 0;
    const { labels, components } = filledComponents(mask, w, h);
    for (const comp of components) {
      if (comp.area < config.minComponentFraction * w * h) continue;
      const quad = quadFromComponent(labels, w, comp);
      if (!quad) continue;
      const area = polygonArea(quad);
      const fill = Math.min(comp.area / area, area / comp.area);
      const aspectError = Math.abs(
        Math.log(quadAspect(quad) / config.expectedAspect),
      );
      if (fill < 0.6 || aspectError > 0.35) continue;
      let score = fill * Math.exp(-aspectError / 0.1);
      score *= roiWork
        ? 0.25 + rectOverlap(quad, roiWork)
        : Math.pow(area / (w * h), 0.25);
      candidates.push({ quad, score, threshold, fill, aspectError });
    }
  }
  return candidates.sort((a, b) => b.score - a.score);
}

function edgePoints(channel, p0, p1, inward, range, samples, outermost) {
  const points = [];
  const weights = [];
  const step = 0.5;
  const n = Math.ceil(range / step);
  for (let s = 0; s < samples; s++) {
    const t = 0.06 + (0.88 * (s + 0.5)) / samples;
    const bx = p0[0] + (p1[0] - p0[0]) * t;
    const by = p0[1] + (p1[1] - p0[1]) * t;
    const profile = [];
    for (let k = -n - 2; k <= n + 2; k++) {
      profile.push(
        bilinear(channel, bx + inward[0] * k * step, by + inward[1] * k * step),
      );
    }
    const deriv = [];
    for (let k = 2; k < profile.length - 2; k++) {
      deriv.push(
        (profile[k + 1] + profile[k + 2] - profile[k - 1] - profile[k - 2]) /
          (6 * step),
      );
    }
    const max = Math.max(...deriv);
    if (!(max > 1)) continue;
    let best = -1;
    for (let k = 1; k < deriv.length - 1; k++) {
      const peak =
        deriv[k] >= 0.4 * max &&
        deriv[k] >= deriv[k - 1] &&
        deriv[k] >= deriv[k + 1];
      if (outermost ? peak : deriv[k] === max) {
        best = k;
        break;
      }
    }
    if (best < 0) continue;
    const a = deriv[best - 1];
    const b = deriv[best];
    const c = deriv[best + 1];
    const den = a - 2 * b + c;
    const offset =
      den !== 0 ? Math.max(-0.5, Math.min(0.5, (0.5 * (a - c)) / den)) : 0;
    const d = (best + offset - n) * step;
    points.push([bx + inward[0] * d, by + inward[1] * d]);
    weights.push(b);
  }
  return { points, weights };
}

export function refineQuad(
  channel,
  quad,
  config,
  searchCells,
  fallback = null,
) {
  const centre = [
    quad.reduce((s, p) => s + p[0], 0) / 4,
    quad.reduce((s, p) => s + p[1], 0) / 4,
  ];
  const cellW = (dist(quad[0], quad[1]) + dist(quad[3], quad[2])) / (2 * COLS);
  const cellH = (dist(quad[0], quad[3]) + dist(quad[1], quad[2])) / (2 * ROWS);
  const sides = [
    [quad[0], quad[1], cellH],
    [quad[1], quad[2], cellW],
    [quad[2], quad[3], cellH],
    [quad[3], quad[0], cellW],
  ];
  const lines = [];
  const debugSides = [];
  for (const [p0, p1, cell] of sides) {
    const len = dist(p0, p1);
    let inward = [-(p1[1] - p0[1]) / len, (p1[0] - p0[0]) / len];
    const mid = [(p0[0] + p1[0]) / 2, (p0[1] + p1[1]) / 2];
    if (
      (centre[0] - mid[0]) * inward[0] + (centre[1] - mid[1]) * inward[1] <
      0
    ) {
      inward = [-inward[0], -inward[1]];
    }
    const fit = (source, outermost) => {
      const { points, weights } = edgePoints(
        source,
        p0,
        p1,
        inward,
        Math.max(2, searchCells * cell),
        config.edgeScanlines,
        outermost,
      );
      const line = points.length >= 6 ? fitLine(points, weights) : null;
      const inlierRatio = line ? line.inliers / config.edgeScanlines : 0;
      return { points, line, inlierRatio };
    };
    let best = fit(channel, false);
    if (fallback) {
      const brightness = fit(fallback, false);
      if (brightness.inlierRatio > best.inlierRatio) best = brightness;
    }
    if (best.inlierRatio < 0.7) {
      const outermost = fit(channel, true);
      if (outermost.inlierRatio > best.inlierRatio + 0.1) best = outermost;
    }
    const { points, line, inlierRatio } = best;
    debugSides.push({ points, line, inlierRatio });
    lines.push(line);
  }
  if (lines.some((l) => !l)) return { ok: false, sides: debugSides };
  const refined = [
    intersectLines(lines[3], lines[0]),
    intersectLines(lines[0], lines[1]),
    intersectLines(lines[1], lines[2]),
    intersectLines(lines[2], lines[3]),
  ];
  if (refined.some((p) => !p)) return { ok: false, sides: debugSides };
  return {
    ok: true,
    quad: refined,
    sides: debugSides,
    minInlierRatio: Math.min(...debugSides.map((s) => s.inlierRatio)),
  };
}

const rectQuad = (r) => [
  [r.x, r.y],
  [r.x + r.width, r.y],
  [r.x + r.width, r.y + r.height],
  [r.x, r.y + r.height],
];

export function localizeScreen(frame, options = {}) {
  const config = { ...DEFAULT_CONFIG, ...options.config };
  const roi = options.roi || null;
  const region = searchRegion(frame, roi, config.roiMargin);
  const midScale = Math.min(
    1,
    config.midLongSide / Math.max(region.width, region.height),
  );
  const mid = downscaleRGBA(frame, region, midScale);
  const gains = [1, 1, 1];
  const blurred = blurRGB(mid, 1);
  const { width: mw, height: mh } = mid.r;
  const box = {
    x0: Math.round(mw * 0.3),
    x1: Math.round(mw * 0.7),
    y0: Math.round(mh * 0.3),
    y1: Math.round(mh * 0.7),
  };
  const tint = estimateTint(blurred, gains, box);
  const brightness = [];
  for (let y = box.y0; y < box.y1; y++) {
    for (let x = box.x0; x < box.x1; x++) {
      const i = y * mw + x;
      brightness.push(
        Math.max(blurred.r.data[i], blurred.g.data[i], blurred.b.data[i]),
      );
    }
  }
  const darkLevel = config.darkFraction * percentile(brightness, 0.9);
  const lumaMid = luma(blurred);
  const tintMid = tintStrength(
    blurred,
    gains,
    tint,
    config.tintOffset,
    darkLevel,
  );
  const boxValues = [];
  for (let y = box.y0; y < box.y1; y++) {
    for (let x = box.x0; x < box.x1; x++)
      boxValues.push(tintMid.data[y * mw + x]);
  }
  const level = percentile(boxValues, 0.75);
  const thresholds = config.tintThresholds.map((f) => f * level);
  const factor = Math.max(
    1,
    Math.round(Math.max(mid.r.width, mid.r.height) / config.workLongSide),
  );
  const tintWork = downscaleChannel(tintMid, factor);
  const lumaWork = downscaleChannel(lumaMid, factor);
  const lumaBox = [];
  for (let y = box.y0; y < box.y1; y++) {
    for (let x = box.x0; x < box.x1; x++)
      lumaBox.push(lumaMid.data[y * mw + x]);
  }
  const lumaLevel = percentile(lumaBox, 0.75);

  const workToMidIndex = (p) => [p[0] * factor - 0.5, p[1] * factor - 0.5];
  const toFrame = (p) => [
    region.x + (p[0] + 0.5) / mid.scale,
    region.y + (p[1] + 0.5) / mid.scale,
  ];
  const roiWork = roi
    ? {
        x: ((roi.x - region.x) * mid.scale) / factor,
        y: ((roi.y - region.y) * mid.scale) / factor,
        width: (roi.width * mid.scale) / factor,
        height: (roi.height * mid.scale) / factor,
      }
    : null;

  const debug = {
    region,
    gains,
    tint,
    level,
    midScale: mid.scale,
    factor,
    candidates: [],
  };
  if (options.debug) {
    debug.tintMid = tintMid;
    debug.lumaMid = lumaMid;
  }

  const fromFrame = (p) => [
    (p[0] - region.x) * mid.scale - 0.5,
    (p[1] - region.y) * mid.scale - 0.5,
  ];

  function* seeds() {
    if (options.initialQuad) yield options.initialQuad.map(fromFrame);
    const candidates = [
      ...coarseCandidates(tintWork, roiWork, thresholds, config),
      ...coarseCandidates(
        lumaWork,
        roiWork,
        config.tintThresholds.map((f) => f * lumaLevel),
        config,
      ),
      ...coarseCandidates(
        {
          width: tintWork.width,
          height: tintWork.height,
          data: tintWork.data.map((v, i) =>
            Math.max(v / (level || 1), lumaWork.data[i] / (lumaLevel || 1)),
          ),
        },
        roiWork,
        config.tintThresholds,
        config,
      ),
    ].sort((a, b) => b.score - a.score);
    debug.candidates = candidates
      .slice(0, 5)
      .map((c) => ({ ...c, quad: c.quad.map(workToMidIndex).map(toFrame) }));
    for (const candidate of candidates.slice(0, 4))
      yield candidate.quad.map(workToMidIndex);
  }

  let best = null;
  for (const seed of seeds()) {
    let quad = seed;
    let refined = null;
    for (const searchCells of config.edgeSearchCells) {
      const r = refineQuad(tintMid, quad, config, searchCells, lumaMid);
      if (!r.ok) break;
      refined = r;
      quad = r.quad;
    }
    if (!refined || refined.minInlierRatio < config.minEdgeInlierRatio)
      continue;
    if (!best || refined.minInlierRatio > best.minInlierRatio) best = refined;
    if (best.minInlierRatio >= config.goodEdgeInlierRatio) break;
  }

  if (best) {
    debug.sides = best.sides.map((s) => ({
      inlierRatio: s.inlierRatio,
      points: s.points.map(toFrame),
      inlierMask: s.line ? s.line.weights.map((v) => v > 0) : [],
    }));
    const frameQuad = best.quad.map(toFrame);
    return {
      ok: true,
      method: "detected",
      quad: frameQuad,
      aspectError: Math.abs(quadAspect(best.quad) / config.expectedAspect - 1),
      inFrame: frameQuad.every(
        ([x, y]) =>
          x >= -0.01 * frame.width &&
          y >= -0.01 * frame.height &&
          x <= 1.01 * frame.width &&
          y <= 1.01 * frame.height,
      ),
      confidence: Math.min(1, best.minInlierRatio),
      debug,
    };
  }

  if (roi) {
    return {
      ok: true,
      method: "overlay-fallback",
      quad: rectQuad(roi),
      inFrame: true,
      aspectError: Math.abs(roi.width / roi.height / config.expectedAspect - 1),
      confidence: 0.3,
      debug,
    };
  }
  return { ok: false, method: "none", debug };
}
