// SPDX-License-Identifier: MIT
/**
 * Primitive · cache-walk — the same cells, visited in two orders.
 *
 * Baits `same-work-same-cost`: that doing the same number of operations costs
 * the same however they are ordered. Every cell is read exactly once in both
 * walks. The counts that differ are the MEMORY LINES fetched, and whether
 * they differ at all depends on the cache — which is the honest answer and
 * the reason this is worth watching rather than being told.
 *
 * The model is small and says so on screen: cells stored row by row, a line
 * holding `line` neighbouring cells of one row, a cache of `held` lines with
 * least-recently-used eviction. That is the textbook picture and it is NOT a
 * processor — no prefetching, no associativity, no write buffers. Implying
 * otherwise would be the kind of lie research/04 commits us against.
 */
import { cacheWalk } from "../components/algorithms.mjs";

const CELL_SECONDS = 0.035;
const SETTLE = 0.6;

export const id = "cache-walk";
export const outcomes = ["rows", "same"];
export const outcomeText = {
  rows: "Going along the rows fetched fewer lines from memory.",
  same: "Both orders fetched exactly the same number of lines.",
};
export const controls = [
  { key: "rows", label: "rows",            min: 2, max: 8, step: 2, default: 4, unit: "" },
  { key: "cols", label: "columns",         min: 2, max: 8, step: 2, default: 8, unit: "" },
  { key: "line", label: "cells per line",  min: 1, max: 4, step: 1, default: 4, unit: "" },
  { key: "held", label: "lines the cache holds", min: 1, max: 8, step: 1, default: 2, unit: "" },
];

const shape = (p) => ({
  rows: Math.round(p.rows), cols: Math.round(p.cols),
  lineSize: Math.round(p.line), cacheLines: Math.round(p.held),
});

export function setup(p) {
  return { t: 0, visited: 0, done: false };
}

export function step(s, dt, p) {
  if (s.done) return;
  s.t += dt;
  const { rows, cols } = shape(p);
  s.visited = Math.min(rows * cols, Math.floor(s.t / CELL_SECONDS));
  if (s.visited >= rows * cols && s.t >= rows * cols * CELL_SECONDS + SETTLE) s.done = true;
}

export function classify(s, p) {
  if (!s.done) return null;
  const w = cacheWalk(shape(p));
  return w.rowMajor === w.colMajor ? "same" : "rows";
}

export function draw(ctx, s, p, view, ui) {
  const w = view.w, h = view.h, pad = 26;
  ctx.fillStyle = "#1B1815";
  ctx.fillRect(0, 0, w, h);

  const { rows, cols, lineSize } = shape(p);
  const cell = Math.min(26, Math.floor((w / 2 - pad * 2) / cols), Math.floor((h - 200) / rows));
  const gridW = cols * cell, gridH = rows * cell;
  const top = Math.max(pad + 34, Math.round(h / 2 - gridH / 2 - 20));
  const lefts = [Math.round(w / 2 - gridW - 30), Math.round(w / 2 + 30)];

  const grid = (x0, title, colour, order) => {
    label(ctx, title, x0, top - 12, colour);
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = x0 + c * cell, y = top + r * cell;
        ctx.fillStyle = order(r, c) < s.visited ? colour : "#2A2420";
        ctx.fillRect(x + 1, y + 1, cell - 2, cell - 2);
      }
    }
    // The line boundaries, drawn on the grid, because the whole lesson is
    // that a line is a run of neighbours WITHIN a row. Deliberately heavier
    // and brighter than the cell edges: at the same weight they read as one
    // uniform grid, and a learner cannot see the thing being counted.
    ctx.strokeStyle = "#F2EEE8"; ctx.lineWidth = 2.5;
    for (let r = 0; r < rows; r++)
      for (let c = 0; c < cols; c += lineSize)
        ctx.strokeRect(x0 + c * cell, top + r * cell,
                       Math.min(lineSize, cols - c) * cell, cell);
  };
  grid(lefts[0], "along the rows", "#E8703A", (r, c) => r * cols + c);
  grid(lefts[1], "down the columns", "#4FB286", (r, c) => c * rows + r);

  label(ctx, `a line holds ${lineSize} neighbouring cell${lineSize === 1 ? "" : "s"} of one row; ` +
             `the cache holds ${shape(p).cacheLines}`, pad, top + gridH + 26, "#A79E92");
  // Said every time, not only at the reveal: a learner should never be left
  // thinking this is a measurement of their own machine.
  label(ctx, "a teaching model of a cache — not a real processor", pad, h - 14, "#6E665C");

  if (ui?.revealed) {
    const { rowMajor, colMajor } = cacheWalk(shape(p));
    label(ctx, `${rows * cols} cells read either way — ` +
               `${rowMajor} line fetches along the rows, ${colMajor} down the columns`,
          pad, top + gridH + 46, "#F2EEE8");
  }
}

function label(ctx, text, x, y, colour) {
  ctx.fillStyle = colour;
  ctx.font = '12px "Spline Sans Mono", ui-monospace, monospace';
  ctx.fillText(text, x, y);
}
