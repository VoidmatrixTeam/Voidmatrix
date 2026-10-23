import { CELL_COUNT } from "./config.js";

export const UNSET = -1;

export function patternFromBytes(bytes) {
  const target = new Int8Array(CELL_COUNT).fill(UNSET);
  for (let i = 0; i < bytes.length && i * 4 < CELL_COUNT; i++) {
    for (let k = 0; k < 4; k++) {
      const cell = i * 4 + k;
      if (cell < CELL_COUNT) target[cell] = (bytes[i] >> (2 * k)) & 3;
    }
  }
  return target;
}

export function patternFromHex(hex) {
  const bytes = (hex.match(/[0-9a-fA-F]{2}/g) || []).map((b) =>
    parseInt(b, 16),
  );
  return patternFromBytes(bytes);
}

export function bytesFromPattern(target) {
  const bytes = [];
  for (let cell = 0; cell < CELL_COUNT; cell += 4) {
    if (target[cell] === UNSET) break;
    let byte = 0;
    for (let k = 0; k < 4; k++)
      byte |= (Math.max(0, target[cell + k]) & 3) << (2 * k);
    bytes.push(byte);
  }
  return bytes;
}
