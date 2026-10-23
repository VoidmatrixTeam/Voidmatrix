import { DEFAULT_CONFIG } from "./config.js";

export const MESSAGES = {
  noScreen:
    "Couldn't find the drawing. Fit the whole drawing inside the frame and try again.",
  inFrame:
    "Part of the drawing is outside the photo. Move the phone back a little so the whole drawing fits.",
  aspect:
    "The screen looks distorted. Hold the phone straight above the console.",
  separation:
    "The image is too dark or blurry to tell the shades apart. Add some light, hold steady and try again.",
  glare: "Tilt the console slightly to remove the reflection.",
  someGlare:
    "A reflection hid some cells (yellow). Tilt the console slightly and scan again to check them.",
  uncertain:
    "Too many cells are unclear. Hold the phone straight above the screen and steady, then try again.",
  mismatch:
    "This doesn't look like the selected pattern. Check you picked the right script, or align the frame more carefully.",
  fallback:
    "Couldn't detect the screen edges precisely. Align the drawing with the frame more carefully.",
};

export function hasGlare(cells, verdicts) {
  return cells.some((c, i) => c.glare && verdicts[i].state !== "ignored");
}

export function evaluateGates(
  { localization, calibration, cells, verdicts },
  options = {},
) {
  const config = { ...DEFAULT_CONFIG, ...options.config };
  const gates = [];
  const add = (id, ok, value, limit) =>
    gates.push({ id, ok, value, limit, message: MESSAGES[id] });

  add(
    "noScreen",
    Boolean(localization && localization.ok),
    localization?.method,
    "detected",
  );
  if (!localization || !localization.ok) return gates;
  add("inFrame", localization.inFrame, localization.inFrame, true);
  if (!localization.inFrame) return gates;
  add(
    "aspect",
    localization.aspectError <= config.maxAspectError,
    localization.aspectError,
    config.maxAspectError,
  );

  if (cells) {
    const active = cells.filter(
      (_, i) => !verdicts || verdicts[i].state !== "ignored",
    );
    const glare = active.filter((c) => c.glare).length / (active.length || 1);
    add(
      "glare",
      glare <= config.maxGlareFraction,
      glare,
      config.maxGlareFraction,
    );
  }

  if (calibration) {
    add(
      "separation",
      calibration.plausibleSpacing,
      calibration.separations,
      config.minSeparation,
    );
  }

  if (cells && verdicts) {
    const active = verdicts.filter((v) => v.state !== "ignored");
    const n = active.length || 1;
    const uncertain = active.filter((v) => v.state === "uncertain").length / n;
    const judged = active.filter(
      (v) => v.state === "correct" || v.state === "wrong",
    );
    const mismatch =
      judged.filter((v) => v.state === "wrong").length / (judged.length || 1);
    add(
      "mismatch",
      mismatch <= config.maxMismatchFraction,
      mismatch,
      config.maxMismatchFraction,
    );
    add(
      "uncertain",
      uncertain <= config.maxUncertainFraction,
      uncertain,
      config.maxUncertainFraction,
    );
  }
  return gates;
}

export function firstFailure(gates) {
  return gates.find((g) => !g.ok) || null;
}
