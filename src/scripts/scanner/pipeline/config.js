export const COLS = 24;
export const ROWS = 20;
export const CELL_COUNT = COLS * ROWS;

export const DS_PX_PER_CELL = 8;

export const SHADE_NAMES = ["lightest", "light gray", "dark gray", "darkest"];

export const DEFAULT_PALETTE = [
  [113, 178, 113],
  [81, 130, 81],
  [56, 81, 48],
  [16, 40, 24],
];

export const SHADE_PRIOR_RATIOS = [1, 0.734, 0.459, 0.198];

export const DEFAULT_CONFIG = {
  cellPx: 16,
  marginPx: 8,

  workLongSide: 512,
  midLongSide: 768,
  roiMargin: 0.3,
  minComponentFraction: 0.01,
  tintThresholds: [0.5, 0.4, 0.6, 0.3, 0.7],
  tintOffset: 20,
  darkFraction: 0.12,
  edgeScanlines: 48,
  edgeSearchCells: [0.75, 0.25],
  expectedAspect: COLS / ROWS,
  maxAspectError: 0.3,
  minEdgeInlierRatio: 0.5,
  goodEdgeInlierRatio: 0.9,

  gridMaxOffsetCells: 0.3,
  gridOffsetStepCells: 0.02,
  gridMaxScale: 0.02,
  gridScaleStep: 0.002,
  gridMinContrast: 1.3,

  moireSigma: 1.25,

  sampleFraction: 0.5,
  saturationLevel: 245,

  localRadius: 3,
  localSigma: 1.5,
  localMinNeighbours: 6,

  minSigmaFraction: 0.01,
  bandCorrection: true,
  maxBins: 4,
  mergeSeparation: 3,
  mergeValley: 0.5,
  binPasses: 2,
  minGamma: 0.4,
  maxGamma: 2.5,
  maxSpacingError: 0.35,
  maxOffAxis: 4,
  colorOutlierFloor: 0.03,
  certainZ: 2,
  maxEdgeScale: 4,
  maxOffLevel: 0.3,
  maxStdToGap: 0.3,
  maxSaturatedFraction: 0.02,
  clippedBinFraction: 0.3,
  maxHueShift: 25,
  contrastRadius: 2,
  maxContrastLoss: 1.5,
  glareMargin: 1,
  minHueChroma: 6,
  minWhiteness: 0.05,

  minSeparation: 5,
  maxUncertainFraction: 0.4,
  maxGlareFraction: 0.2,
  maxMismatchFraction: 0.25,

  minFrameAgreement: 0.6,
};
