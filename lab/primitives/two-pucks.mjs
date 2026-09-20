// SPDX-License-Identifier: MIT
/**
 * Primitive · two-pucks — one with a steady push, one with nothing.
 * Baits `motion-implies-force`.
 */
import { stepWithFriction } from "../components/motion.mjs";

const G = 9.81, SPAN = 26, TICK = 0.25, MASS = 0.5;

export const id = "two-pucks";
export const outcomes = ["needs", "runaway", "same", "both", "outruns"];
export const outcomeText = {
  needs:   "The pushed puck held its speed while the other slowed — here the push exactly balanced friction.",
  runaway: "The pushed puck kept gaining speed while the other held its speed, with nothing pushing it.",
  same:    "Neither puck changed speed — nothing was acting on either of them.",
  both:    "Both pucks lost speed — friction beat whatever push there was.",
  outruns: "The pushed puck gained speed while friction slowed the other — the push was stronger than friction.",
};
export const controls = [
  { key: "push",     label: "push on B", min: 0, max: 2,   step: 0.1,  default: 0.6, unit: " N" },
  { key: "friction", label: "friction",  min: 0, max: 0.3, step: 0.01, default: 0,   unit: "" },
  { key: "u",        label: "start",     min: 2, max: 8,   step: 0.5,  default: 4,   unit: " m/s" },
];

export function setup(p) {
  const lane = () => ({ x: 1, v: p.u, tape: [1], settled: false });
  return { a: lane(), b: lane(), t: 0, nextTick: TICK, u0: p.u, done: false };
}

export function step(s, dt, p) {
  if (s.done) return;
  // Each lane settles on its own terms — stopped, or off the end of the track.
  // Stopping the whole run when the FIRST one settles was the P-48 defect: the
  // other puck was still mid-decay, so its fate, and the outcome, were undecided.
  for (const [lane, appliedForce] of [[s.a, 0], [s.b, p.push]]) {
    if (lane.settled) continue;
    stepWithFriction(lane, { appliedForce, mass: MASS, mu: p.friction, g: G }, dt);
    if (lane.v === 0 || lane.x > SPAN - 1.5) lane.settled = true;
  }
  s.t += dt;
  if (s.t >= s.nextTick) { s.nextTick += TICK; s.a.tape.push(s.a.x); s.b.tape.push(s.b.x); }
  if (s.a.settled && s.b.settled) s.done = true;
}

/**
 * Measured from the settled state, so the parameters and the stated answer
 * must agree. Total over every reachable pair of fates — an outcome the
 * mapping cannot name is a gap in the primitive, not an unanswerable scenario.
 *
 * The unpushed puck can only hold, slow or stop; nothing ever speeds it up.
 */
function fate(lane, u0) {
  const eps = 1e-6;
  if (lane.v === 0) return "stopped";
  if (lane.v > u0 + eps) return "gained";
  if (lane.v < u0 - eps) return "slowed";
  return "held";
}

export function classify(s, p) {
  if (!s.done) return null;                       // an unfinished run decides nothing
  const a = fate(s.a, s.u0), b = fate(s.b, s.u0);
  if (b === "gained") return a === "held" ? "runaway" : "outruns";
  if (b === "held")   return a === "held" ? "same" : "needs";
  return "both";                                  // b slowed or stopped, so friction is on
}

export function draw(ctx, s, p, view) {
  const scale = view.w / SPAN, X = (x) => x * scale;
  ctx.fillStyle = "#1B1815"; ctx.fillRect(0, 0, view.w, view.h);
  const lanes = [
    { st: s.a, y: view.h * 0.36, name: "A · nothing pushing it", tint: "#4FB286" },
    { st: s.b, y: view.h * 0.70, name: `B · steady ${p.push.toFixed(1)} N push`, tint: "#E8703A" },
  ];
  for (const L of lanes) {
    ctx.strokeStyle = "#332E28"; ctx.lineWidth = 1; seg(ctx, 0, L.y + 22, view.w, L.y + 22);
    ctx.globalAlpha = 0.55;
    for (const x of L.st.tape) {
      ctx.fillStyle = L.tint;
      ctx.beginPath(); ctx.arc(X(x), L.y + 22, 3, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.fillStyle = L.tint; roundRect(ctx, X(L.st.x) - 13, L.y - 9, 26, 26, 5);
    label(ctx, L.name, 14, L.y - 22, L.tint);
    label(ctx, `${L.st.v.toFixed(2)} m/s`, view.w - 96, L.y - 22, "#A79E92");
    if (L.st === s.b && p.push > 0)
      arrow(ctx, X(L.st.x) - 52, L.y + 4, X(L.st.x) - 18, L.y + 4, "#E8703A");
  }
  label(ctx, p.friction === 0 ? "friction: none — a perfectly slippery floor"
                              : `friction: ${p.friction.toFixed(2)}`,
        14, view.h - 14, p.friction === 0 ? "#6E665C" : "#D65442");
  label(ctx, `t = ${s.t.toFixed(2)} s`, view.w - 96, view.h - 14, "#6E665C");
}

function seg(ctx, x1, y1, x2, y2) { ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); }
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath(); ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y); ctx.arc(x + w - r, y + r, r, -Math.PI / 2, 0);
  ctx.lineTo(x + w, y + h - r); ctx.arc(x + w - r, y + h - r, r, 0, Math.PI / 2);
  ctx.lineTo(x + r, y + h); ctx.arc(x + r, y + h - r, r, Math.PI / 2, Math.PI);
  ctx.lineTo(x, y + r); ctx.arc(x + r, y + r, r, Math.PI, -Math.PI / 2);
  ctx.fill();
}
function arrow(ctx, x1, y1, x2, y2, c) {
  ctx.strokeStyle = c; ctx.fillStyle = c; ctx.lineWidth = 3;
  seg(ctx, x1, y1, x2, y2);
  const a = Math.atan2(y2 - y1, x2 - x1);
  ctx.beginPath(); ctx.moveTo(x2, y2);
  ctx.lineTo(x2 - 9 * Math.cos(a - 0.45), y2 - 9 * Math.sin(a - 0.45));
  ctx.lineTo(x2 - 9 * Math.cos(a + 0.45), y2 - 9 * Math.sin(a + 0.45));
  ctx.fill();
}
function label(ctx, text, x, y, c) {
  ctx.fillStyle = c; ctx.font = '12px "Spline Sans Mono", ui-monospace, monospace';
  ctx.fillText(text, x, y);
}
