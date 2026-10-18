// SPDX-License-Identifier: MIT
/**
 * Primitive · search-race — a simple search against a clever one, counting.
 *
 * Baits `better-big-o-always-wins`: that the asymptotically better algorithm
 * is faster on every input. It is not, and the counterexample is not exotic —
 * it is the first element of any array, where a linear scan stops at one
 * comparison and a binary search is still halving.
 *
 * Counts comparisons, never time. A primitive that timed anything would
 * answer differently on a different machine, and a scenario whose correct
 * option depends on the machine is not a scenario.
 */
import { linearCost, binaryCost } from "../components/algorithms.mjs";

const STEP_SECONDS = 0.22;
const SETTLE = 0.6;

export const id = "search-race";
export const outcomes = ["linear", "binary", "tie"];
export const outcomeText = {
  linear: "The simple scan got there in fewer comparisons.",
  binary: "The halving search got there in fewer comparisons.",
  tie: "Both took exactly the same number of comparisons.",
};
export const controls = [
  // The range starts at two on purpose. With two items and the first one
  // wanted, both searches take exactly one comparison — a tie, and a tie that
  // a learner can actually dial rather than one the primitive can produce but
  // nobody can reach. That is the P-79 defect, and it was present here until
  // the sweep in reachableOutcomes() found only two of the three outcomes.
  { key: "n",      label: "how many items", min: 2, max: 62, step: 4, default: 30, unit: "" },
  { key: "target", label: "position of the one wanted", min: 1, max: 62, step: 1, default: 1, unit: "" },
];

/** The target can be dialled past the end of a shortened array; clamp it. */
const where = (p) => Math.min(Math.max(1, Math.round(p.target)), Math.round(p.n));

export function setup(p) {
  return { t: 0, shown: 0, done: false };
}

export function step(s, dt, p) {
  if (s.done) return;
  s.t += dt;
  const steps = Math.max(linearCost(Math.round(p.n), where(p)), binaryCost(Math.round(p.n), where(p)));
  s.shown = Math.min(steps, Math.floor(s.t / STEP_SECONDS));
  if (s.shown >= steps && s.t >= steps * STEP_SECONDS + SETTLE) s.done = true;
}

export function classify(s, p) {
  if (!s.done) return null;
  const n = Math.round(p.n), t = where(p);
  const a = linearCost(n, t), b = binaryCost(n, t);
  return a === b ? "tie" : a < b ? "linear" : "binary";
}

export function draw(ctx, s, p, view, ui) {
  const w = view.w, h = view.h, pad = 26;
  ctx.fillStyle = "#1B1815";
  ctx.fillRect(0, 0, w, h);

  const n = Math.round(p.n), target = where(p);
  const cells = Math.min(n, Math.floor((w - 2 * pad) / 14));
  const size = Math.max(6, Math.floor((w - 2 * pad) / cells) - 4);
  const top = Math.max(pad + 20, Math.round(h / 2 - 90));

  // Which cells each search has looked at by now, replayed from the oracle so
  // the picture and the verdict cannot disagree.
  const linearSeen = Math.min(s.shown, linearCost(n, target));
  const binarySeen = binaryProbes(n, target).slice(0, s.shown);

  const row = (label_, y, seen, colour) => {
    label(ctx, label_, pad, y - 10, colour);
    for (let i = 0; i < cells; i++) {
      const x = pad + i * (size + 4);
      const at = Math.round((i / Math.max(1, cells - 1)) * (n - 1)) + 1;
      ctx.fillStyle = seen(at) ? colour : "#2A2420";
      ctx.fillRect(x, y, size, size);
      if (at === target) {
        ctx.strokeStyle = "#F2EEE8"; ctx.lineWidth = 2;
        ctx.strokeRect(x - 1, y - 1, size + 2, size + 2);
      }
    }
  };
  row(`scan one by one — ${linearSeen} comparison${linearSeen === 1 ? "" : "s"}`,
      top, (at) => at <= linearSeen, "#E8703A");
  row(`halve each time — ${binarySeen.length} comparison${binarySeen.length === 1 ? "" : "s"}`,
      top + 70, (at) => binarySeen.includes(at), "#4FB286");

  label(ctx, `${n} items, sorted. Looking for the one at position ${target}.`,
        pad, top + 70 + size + 24, "#A79E92");

  if (ui?.revealed) {
    const a = linearCost(n, target), b = binaryCost(n, target);
    label(ctx, `scan ${a}   ·   halve ${b}`, pad, top + 70 + size + 44, "#F2EEE8");
  }
}

/** The positions a binary search actually probes, in order. */
function binaryProbes(n, target) {
  const probes = [];
  let lo = 1, hi = n;
  while (lo <= hi) {
    const mid = Math.floor((lo + hi) / 2);
    probes.push(mid);
    if (mid === target) break;
    if (target < mid) hi = mid - 1; else lo = mid + 1;
  }
  return probes;
}

function label(ctx, text, x, y, colour) {
  ctx.fillStyle = colour;
  ctx.font = '12px "Spline Sans Mono", ui-monospace, monospace';
  ctx.fillText(text, x, y);
}
