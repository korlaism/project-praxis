// SPDX-License-Identifier: MIT
/**
 * Primitive · quadratic-roots — a parabola, and where it crosses the axis.
 *
 * Baits `boundary-ignored`: a quadratic has two solutions, which holds until
 * the discriminant reaches zero and then goes wrong twice over. The same
 * structural mistake as `line-pair`, in a different costume, which is the
 * point of having both.
 *
 * Whole-number controls on purpose: b² − 4ac is then exact, and "exactly one
 * root" is a case a learner can actually reach rather than a limit they can
 * only approach. `two-pucks` has an outcome nobody can dial (P-79); this one
 * does not, and that was a design constraint rather than luck.
 */
import { realRoots } from "../components/algebra.mjs";

const SPAN_X = 6, SPAN_Y = 14;
const DRAW_SECONDS = 1.1;

export const id = "quadratic-roots";
export const outcomes = ["two", "one", "none"];
export const outcomeText = {
  two: "It crossed the axis twice — two solutions.",
  one: "It touched the axis once and turned back — one solution.",
  none: "It never reached the axis — no real solutions at all.",
};
export const controls = [
  // a never reaches 0: that would be a straight line, and this primitive would
  // be describing something it is not.
  { key: "a", label: "a (x² term)", min: 1,  max: 4, step: 1, default: 1, unit: "" },
  { key: "b", label: "b (x term)",  min: -6, max: 6, step: 1, default: 2, unit: "" },
  { key: "c", label: "c (constant)", min: -6, max: 6, step: 1, default: 1, unit: "" },
];

export function setup(p) {
  return { t: 0, grown: 0, done: false };
}

export function step(s, dt, p) {
  if (s.done) return;
  s.t += dt;
  s.grown = Math.min(1, s.t / DRAW_SECONDS);
  if (s.t >= DRAW_SECONDS + 0.4) s.done = true;
}

export function classify(s, p) {
  if (!s.done) return null;
  return realRoots(p.a, p.b, p.c).kind;
}

export function draw(ctx, s, p, view, ui) {
  const pad = 26;
  const w = view.w, h = view.h;
  const sx = (x) => pad + ((x + SPAN_X) / (2 * SPAN_X)) * (w - 2 * pad);
  const sy = (y) => h - pad - ((y + SPAN_Y) / (2 * SPAN_Y)) * (h - 2 * pad);

  ctx.fillStyle = "#1B1815";
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = "#3C352D"; ctx.lineWidth = 1.5;
  seg(ctx, sx(-SPAN_X), sy(0), sx(SPAN_X), sy(0));
  seg(ctx, sx(0), sy(-SPAN_Y), sx(0), sy(SPAN_Y));

  // Where the curve leaves the view, STOP drawing it — do not clamp. Clamping
  // drew a flat line along the top edge, which tells a learner the parabola
  // levels off. It does not, and a maths item that lies about its own curve is
  // worse than no picture.
  ctx.strokeStyle = "#E8703A"; ctx.lineWidth = 3;
  ctx.beginPath();
  const from = -SPAN_X, to = from + s.grown * 2 * SPAN_X;
  let drawing = false;
  for (let x = from; x <= to; x += 0.05) {
    const y = p.a * x * x + p.b * x + p.c;
    if (Math.abs(y) > SPAN_Y) { drawing = false; continue; }
    const px = sx(x), py = sy(y);
    if (drawing) ctx.lineTo(px, py); else { ctx.moveTo(px, py); drawing = true; }
  }
  ctx.stroke();

  const d = p.b * p.b - 4 * p.a * p.c;
  // Written the way it would be written: no "1x²", no "+ 0x", a real minus sign.
  label(ctx, equationText(p), pad, pad + 2, "#E8703A");

  if (ui?.revealed) {
    for (const x of realRoots(p.a, p.b, p.c).values) {
      if (Math.abs(x) > SPAN_X) continue;
      ctx.fillStyle = "#F2EEE8";
      ctx.beginPath(); ctx.arc(sx(x), sy(0), 5, 0, Math.PI * 2); ctx.fill();
      label(ctx, `x = ${Number.isInteger(x) ? x : x.toFixed(2)}`, sx(x) + 9, sy(0) - 10, "#F2EEE8");
    }
    label(ctx, `b² − 4ac = ${d}`, pad, h - 10, d < 0 ? "#D65442" : "#A79E92");
  }
}

/** The equation as a person writes it, not as a template concatenates it. */
export function equationText(p) {
  const coef = (n) => (Math.abs(n) === 1 ? "" : String(Math.abs(n)));
  let out = `y = ${p.a === 1 ? "" : p.a === -1 ? "−" : p.a}x²`;
  if (p.b !== 0) out += ` ${p.b < 0 ? "−" : "+"} ${coef(p.b)}x`;
  if (p.c !== 0) out += ` ${p.c < 0 ? "−" : "+"} ${Math.abs(p.c)}`;
  return out;
}

function seg(ctx, x1, y1, x2, y2) {
  ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
}
function label(ctx, text, x, y, colour) {
  ctx.fillStyle = colour;
  ctx.font = '12px "Spline Sans Mono", ui-monospace, monospace';
  ctx.fillText(text, x, y);
}
