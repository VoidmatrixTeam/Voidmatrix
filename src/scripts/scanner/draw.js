import { COLS, ROWS, DEFAULT_PALETTE } from "./pipeline/config.js";
import { UNSET } from "./pipeline/pattern.js";

const STATE_COLORS = {
  wrong: "255, 60, 60",
  uncertain: "255, 220, 80",
};

const rgb = (c) => `rgb(${c[0]}, ${c[1]}, ${c[2]})`;

function drawCheck(ctx, x, y, cell) {
  ctx.beginPath();
  ctx.moveTo(x + cell * 0.25, y + cell * 0.52);
  ctx.lineTo(x + cell * 0.43, y + cell * 0.7);
  ctx.lineTo(x + cell * 0.76, y + cell * 0.32);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.strokeStyle = "rgba(0, 0, 0, 0.6)";
  ctx.lineWidth = 4;
  ctx.stroke();
  ctx.strokeStyle = "white";
  ctx.lineWidth = 2;
  ctx.stroke();
}

export function drawPattern(
  canvas,
  shades,
  verdicts = null,
  selected = -1,
  { photo = null, checked = null } = {},
) {
  const cell = 16;
  canvas.width = COLS * cell;
  canvas.height = ROWS * cell;
  const ctx = canvas.getContext("2d");
  if (photo) {
    ctx.putImageData(
      new ImageData(new Uint8ClampedArray(photo.data), photo.width),
      0,
      0,
    );
  } else {
    for (let i = 0; i < COLS * ROWS; i++) {
      const x = (i % COLS) * cell;
      const y = Math.floor(i / COLS) * cell;
      ctx.fillStyle =
        shades[i] === UNSET
          ? "rgb(52, 52, 52)"
          : rgb(DEFAULT_PALETTE[shades[i]]);
      ctx.fillRect(x, y, cell, cell);
    }
  }
  ctx.strokeStyle = "rgba(0, 0, 0, 0.2)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let k = 1; k < COLS; k++) {
    ctx.moveTo(k * cell + 0.5, 0);
    ctx.lineTo(k * cell + 0.5, ROWS * cell);
  }
  for (let k = 1; k < ROWS; k++) {
    ctx.moveTo(0, k * cell + 0.5);
    ctx.lineTo(COLS * cell, k * cell + 0.5);
  }
  ctx.stroke();
  if (verdicts) {
    verdicts.forEach((v, i) => {
      const color = STATE_COLORS[v.state];
      if (!color) return;
      const x = (i % COLS) * cell;
      const y = Math.floor(i / COLS) * cell;
      const done = checked?.has(i);
      ctx.strokeStyle = `rgba(${color}, ${done ? 0.35 : 1})`;
      ctx.lineWidth = 3;
      ctx.strokeRect(x + 1.5, y + 1.5, cell - 3, cell - 3);
      if (done) drawCheck(ctx, x, y, cell);
    });
  }
  if (selected >= 0) {
    ctx.strokeStyle = "white";
    ctx.lineWidth = 2;
    ctx.strokeRect(
      (selected % COLS) * cell + 1,
      Math.floor(selected / COLS) * cell + 1,
      cell - 2,
      cell - 2,
    );
  }
}

export function cellFromEvent(canvas, event) {
  const rect = canvas.getBoundingClientRect();
  const col = Math.floor(((event.clientX - rect.left) / rect.width) * COLS);
  const row = Math.floor(((event.clientY - rect.top) / rect.height) * ROWS);
  if (col < 0 || row < 0 || col >= COLS || row >= ROWS) return -1;
  return row * COLS + col;
}
