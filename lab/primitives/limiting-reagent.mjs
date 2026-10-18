// SPDX-License-Identifier: MIT
/**
 * Primitive · limiting-reagent — two reactants, and which one runs out first.
 *
 * The first primitive in this repository that is not a thing moving or a line
 * on a grid. ADR 0007 warned that mechanics is the cheap part and chemistry
 * is not; what makes this one tractable is that the underlying truth is
 * integer arithmetic, so the answer check has something exact to check.
 *
 * Baits `more-means-more-product`: that whichever reactant you have most of
 * decides how much you get. It does not. The recipe decides, and the one that
 * runs out first stops everything, however much of the other is left sitting
 * in the flask.
 *
 * Whole particles on purpose. "Exactly enough of both" is then a case a
 * learner can dial rather than a limit they approach — the P-79 defect, which
 * the maths primitives were built to avoid and which would be worse here,
 * because that exact case IS the chemistry.
 */
import { react } from "../components/reactions.mjs";

const PAIR_SECONDS = 0.14;        // how long one pairing takes on screen
const SETTLE = 0.5;

export const id = "limiting-reagent";
export const outcomes = ["a", "b", "neither"];
export const outcomeText = {
  a: "The first reactant ran out first — some of the second was left over.",
  b: "The second reactant ran out first — some of the first was left over.",
  // True of both kinds of tie: the exact case where nothing is left, and the
  // case where both piles are short of one more reaction.
  neither: "Neither ran out before the other — they limited it equally.",
};
export const controls = [
  { key: "a",     label: "atoms of A",   min: 0, max: 12, step: 1, default: 4,  unit: "" },
  { key: "b",     label: "atoms of B",   min: 0, max: 24, step: 1, default: 10, unit: "" },
  // The recipe. A learner can change it, which is the point: the same two
  // piles give a different answer under a different recipe.
  { key: "needA", label: "recipe: A per reaction", min: 1, max: 3, step: 1, default: 1, unit: "" },
  { key: "needB", label: "recipe: B per reaction", min: 1, max: 3, step: 1, default: 2, unit: "" },
];

export function setup(p) {
  return { t: 0, paired: 0, done: false };
}

export function step(s, dt, p) {
  if (s.done) return;
  s.t += dt;
  const total = react(p).reactions;
  s.paired = Math.min(total, Math.floor(s.t / PAIR_SECONDS));
  if (s.paired >= total && s.t >= total * PAIR_SECONDS + SETTLE) s.done = true;
}

export function classify(s, p) {
  if (!s.done) return null;
  return react(p).limiting;
}

export function draw(ctx, s, p, view, ui) {
  const w = view.w, h = view.h, pad = 26;
  ctx.fillStyle = "#1B1815";
  ctx.fillRect(0, 0, w, h);

  const r = react(p);
  const used = { a: s.paired * p.needA, b: s.paired * p.needB };

  // The whole block is about 200px tall. Centred, rather than pinned to the
  // top of a stage that is mostly empty underneath it.
  const top = Math.max(pad, Math.round(h / 2 - 100));

  label(ctx, `recipe: ${p.needA} A + ${p.needB} B → 1 product`, pad, top - 6, "#A79E92");

  // Two shelves of particles. A particle that has reacted is drawn hollow and
  // dim rather than removed: the learner has to be able to see that it was
  // used up, not wonder whether it was ever there.
  const rowY = [top + 34, top + 86];
  const shelf = (label_, n, usedN, colour, y) => {
    label(ctx, `${label_}  ${n - usedN} left of ${n}`, pad, y - 10, colour);
    const size = 11, gap = 6;
    for (let i = 0; i < n; i++) {
      const x = pad + i * (size + gap) + size / 2;
      ctx.beginPath();
      ctx.arc(x, y + size / 2, size / 2, 0, Math.PI * 2);
      if (i < usedN) { ctx.strokeStyle = "#4A443C"; ctx.lineWidth = 1.5; ctx.stroke(); }
      else { ctx.fillStyle = colour; ctx.fill(); }
    }
  };
  shelf("A", p.a, used.a, "#E8703A", rowY[0]);
  shelf("B", p.b, used.b, "#4FB286", rowY[1]);

  // The products, built one at a time as the reaction runs.
  const py = top + 142;
  label(ctx, `product  ${s.paired}`, pad, py - 10, "#F2EEE8");
  for (let i = 0; i < s.paired; i++) {
    const x = pad + i * 20 + 7;
    ctx.fillStyle = "#F2EEE8";
    ctx.beginPath(); ctx.arc(x, py + 7, 7, 0, Math.PI * 2); ctx.fill();
  }

  if (ui?.revealed) {
    const said = r.limiting === "neither"
      ? "both ran out together"
      : `${r.limiting.toUpperCase()} ran out first`;
    label(ctx, `${s.paired} reactions — ${said}`, pad, h - 12, "#F2EEE8");
    if (r.leftA || r.leftB)
      label(ctx, `left over: ${r.leftA} A, ${r.leftB} B`, pad, h - 28, "#A79E92");
  }
}

function label(ctx, text, x, y, colour) {
  ctx.fillStyle = colour;
  ctx.font = '12px "Spline Sans Mono", ui-monospace, monospace';
  ctx.fillText(text, x, y);
}
