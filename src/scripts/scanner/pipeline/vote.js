import { DEFAULT_CONFIG } from "./config.js";

export function voteFrames(frameVerdicts, options = {}) {
  const config = { ...DEFAULT_CONFIG, ...options.config };
  const n = frameVerdicts.length;
  const cellCount = frameVerdicts[0].length;
  const out = [];
  for (let i = 0; i < cellCount; i++) {
    const votes = [0, 0, 0, 0];
    let anyGlare = false;
    for (const verdicts of frameVerdicts) {
      const v = verdicts[i];
      votes[v.found] += Math.max(0.05, v.confidence);
      if (v.reason === "glare") anyGlare = true;
    }
    const total = votes.reduce((a, b) => a + b, 0);
    const found = votes.indexOf(Math.max(...votes));
    const agreeing = frameVerdicts
      .map((f) => f[i])
      .filter((v) => v.found === found);
    const agreement = agreeing.length / n;
    const confidence =
      (votes[found] / total) *
      (agreeing.reduce((a, v) => a + v.confidence, 0) / agreeing.length);
    const expected = frameVerdicts[0][i].expected;

    const states = agreeing.map((v) => v.state);
    const majority = (s) => states.filter((x) => x === s).length > n / 2;
    let state;
    let reason = null;
    if (expected === -1) {
      state = "ignored";
    } else if (agreement < config.minFrameAgreement) {
      state = "uncertain";
      reason = anyGlare ? "glare" : "frames-disagree";
    } else if (found === expected && majority("correct")) {
      state = "correct";
    } else if (found !== expected && majority("wrong")) {
      state = "wrong";
    } else {
      state = "uncertain";
      reason = agreeing.find((v) => v.reason)?.reason || "low-margin";
    }
    out.push({ expected, found, confidence, agreement, state, reason, votes });
  }
  return out;
}
