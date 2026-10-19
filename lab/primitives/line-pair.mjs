// SPDX-License-Identifier: MIT
/**
 * Primitive · line-pair — two straight lines, drawn together.
 *
 * Baits `boundary-ignored`: two lines meet at one point, which is true until
 * the slopes match, and then it is wrong in two different ways. spec/04 says
 * the structural tags are the ones expected to persist when a learner changes
 * subject, and this is the first chance to see whether that holds — the same
 * tag, in maths, for the same shape of mistake.
 *
 * Nothing is integrated here. The lines are known from the start; what the
 * animation does is draw them, and the answer comes from the closed form.
 */
import { intersect } from "../components/algebra.mjs";

const SPAN = 10;                 // the view runs -10..10 in both directions
const DRAW_SECONDS = 1.1;        // long enough to watch them arrive

export const id = "line-pair";
// Ours, not the model's. A generated scenario names a subject too, and the
// two can disagree — which is worth reporting rather than trusting (P-102).
export const subject = "maths";
export const outcomes = ["one-point", "parallel", "same-line"];
export const outcomeText = {
  "one-point": "They crossed once, at a single point.",
  parallel: "They never met — same steepness, different heights.",
  "same-line": "They were the same line all along, one drawn over the other.",
};
export const controls = [
  // Halves and whole numbers, so equality of slopes is exact in binary. A
  // tolerance here would call a near-miss a match, and the picture would
  // disagree with the verdict.
  { key: "m1", label: "first slope",     min: -3, max: 3, step: 0.5, default: 1,  unit: "" },
  { key: "c1", label: "first height",    min: -5, max: 5, step: 0.5, default: 0,  unit: "" },
  { key: "m2", label: "second slope",    min: -3, max: 3, step: 0.5, default: -1, unit: "" },
  { key: "c2", label: "second height",   min: -5, max: 5, step: 0.5, default: 4,  unit: "" },
];

export function setup(p) {
  return { t: 0, grown: 0, done: false };
}

export function step(s, dt, p) {
  if (s.done) return;
  s.t += dt;
  s.grown = Math.min(1, s.t / DRAW_SECONDS);
  if (s.t >= DRAW_SECONDS + 0.4) s.done = true;     // a beat to look at it
}

export function classify(s, p) {
  if (!s.done) return null;
  return intersect(p.m1, p.c1, p.m2, p.c2).kind;
}

export function draw(ctx, s, p, view, ui) {
  const pad = 26;
  const w = view.w, h = view.h;
  const sx = (x) => pad + ((x + SPAN) / (2 * SPAN)) * (w - 2 * pad);
  const sy = (y) => h - pad - ((y + SPAN) / (2 * SPAN)) * (h - 2 * pad);

  ctx.fillStyle = "#1B1815";
  ctx.fillRect(0, 0, w, h);

  ctx.strokeStyle = "#2A251F"; ctx.lineWidth = 1;
  for (let g = -SPAN; g <= SPAN; g += 2) {
    seg(ctx, sx(g), sy(-SPAN), sx(g), sy(SPAN));
    seg(ctx, sx(-SPAN), sy(g), sx(SPAN), sy(g));
  }
  ctx.strokeStyle = "#3C352D"; ctx.lineWidth = 1.5;
  seg(ctx, sx(-SPAN), sy(0), sx(SPAN), sy(0));
  seg(ctx, sx(0), sy(-SPAN), sx(0), sy(SPAN));

  // The second line is drawn slightly thinner, so a line lying exactly on top
  // of another is still visible as two rather than looking like one.
  const lines = [
    { m: p.m1, c: p.c1, tint: "#E8703A", width: 3.4 },
    { m: p.m2, c: p.c2, tint: "#4FB286", width: 1.8 },
  ];
  const reach = -SPAN + s.grown * 2 * SPAN;
  for (const L of lines) {
    ctx.strokeStyle = L.tint; ctx.lineWidth = L.width;
    seg(ctx, sx(-SPAN), sy(L.m * -SPAN + L.c), sx(reach), sy(L.m * reach + L.c));
    label(ctx, `y = ${fmt(L.m)}x ${L.c < 0 ? "−" : "+"} ${fmt(Math.abs(L.c))}`,
          pad, L === lines[0] ? pad + 2 : pad + 18, L.tint);
  }

  if (ui?.revealed) {
    const r = intersect(p.m1, p.c1, p.m2, p.c2);
    if (r.at && Math.abs(r.at.x) <= SPAN && Math.abs(r.at.y) <= SPAN) {
      ctx.fillStyle = "#F2EEE8";
      ctx.beginPath(); ctx.arc(sx(r.at.x), sy(r.at.y), 5, 0, Math.PI * 2); ctx.fill();
      label(ctx, `(${fmt(r.at.x)}, ${fmt(r.at.y)})`, sx(r.at.x) + 9, sy(r.at.y) - 8, "#F2EEE8");
    } else if (r.kind === "one-point") {
      label(ctx, "they meet, but off the edge of this view", pad, h - 10, "#A79E92");
    }
  }
}

const fmt = (n) => (Number.isInteger(n) ? String(n) : n.toFixed(1));
function seg(ctx, x1, y1, x2, y2) {
  ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
}
function label(ctx, text, x, y, colour) {
  ctx.fillStyle = colour;
  ctx.font = '12px "Spline Sans Mono", ui-monospace, monospace';
  ctx.fillText(text, x, y);
}
