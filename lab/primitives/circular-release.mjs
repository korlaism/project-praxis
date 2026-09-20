// SPDX-License-Identifier: MIT
/**
 * Primitive · circular-release — a body whirled on a string, then let go.
 * Baits `outward-in-circles`.
 */
import { positionOnCircle, tangentVelocity, radialDirection, advance, speed }
  from "../components/circular.mjs";

const CENTRE = { cx: 0, cy: 0 };
const REVEAL_AFTER = 1.6;

export const id = "circular-release";
export const outcomes = ["outward", "tangent", "curve", "spiral"];
/** What each outcome looks like, said plainly — for when the setup was changed. */
export const outcomeText = {
  outward: "It flew straight out along the line of the string.",
  tangent: "It flew off in a straight line along the tangent — the way it was already going.",
  curve:   "It kept following the circle, as if the string were still there.",
  spiral:  "It spiralled outward, partly along the string and partly across it.",
};
export const controls = [
  { key: "r",     label: "string length", min: 0.5, max: 2.0, step: 0.05, default: 1.2, unit: " m" },
  { key: "omega", label: "spin",          min: 1.0, max: 4.0, step: 0.1,  default: 2.4, unit: " rad/s" },
];

export const actions = [{
  id: "cut", label: "Cut the string", primary: true, autoAt: 0.7,
  enabled: (s) => !s.cut,
  onClick(s, p, api) {
    s.cut = true;
    s.cutTheta = s.theta;
    s.cutAt = positionOnCircle(CENTRE, p.r, s.theta);
    s.vel = tangentVelocity(p.r, p.omega, s.theta);
    s.pos = s.cutAt;
    s.trail = [s.cutAt];
    api?.play?.();
  },
}];

export function setup(p) {
  return { theta: -Math.PI / 2, cut: false, cutTheta: null, cutAt: null,
           pos: positionOnCircle(CENTRE, p.r, -Math.PI / 2), vel: null,
           trail: [], flown: 0, done: false };
}

export function step(s, dt, p) {
  if (s.done) return;
  if (!s.cut) {
    s.theta += p.omega * dt;
    s.pos = positionOnCircle(CENTRE, p.r, s.theta);
    return;
  }
  s.pos = advance(s.pos, s.vel, dt);
  s.trail.push(s.pos);
  s.flown = Math.hypot(s.pos.x - s.cutAt.x, s.pos.y - s.cutAt.y) / p.r;
  if (s.flown > REVEAL_AFTER) s.done = true;
}

/**
 * What actually happened — measured from the run, never assumed.
 * This is what lets a generated scenario's stated answer be checked by machine.
 */
export function classify(s, p) {
  if (!s.cut || !s.cutAt) return null;
  const rFinal = Math.hypot(s.pos.x, s.pos.y);
  if (Math.abs(rFinal - p.r) < 0.05 * p.r) return "curve";      // never left the circle

  const dx = s.pos.x - s.cutAt.x, dy = s.pos.y - s.cutAt.y;
  const len = Math.hypot(dx, dy) || 1;
  const rad = radialDirection(s.cutTheta);
  const along = (dx / len) * rad.x + (dy / len) * rad.y;        // 1 = straight out, 0 = tangent

  if (Math.abs(along) < 0.35) return "tangent";
  if (along > 0.9) return "outward";
  return "spiral";
}

export function draw(ctx, s, p, view, ui = {}) {
  const cx = view.w / 2, cy = view.h / 2;
  const scale = (Math.min(view.w, view.h) / 2) / (p.r * (1 + REVEAL_AFTER) * 1.15);
  const X = (x) => cx + x * scale, Y = (y) => cy - y * scale;

  ctx.fillStyle = "#1B1815"; ctx.fillRect(0, 0, view.w, view.h);
  ctx.strokeStyle = "#4A4239"; ctx.lineWidth = 1.5; ctx.setLineDash([4, 6]);
  ctx.beginPath(); ctx.arc(cx, cy, p.r * scale, 0, Math.PI * 2); ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = "#5C5248";
  ctx.beginPath(); ctx.arc(cx, cy, 5, 0, Math.PI * 2); ctx.fill();

  if (!s.cut) {
    ctx.strokeStyle = "#A79E92"; ctx.lineWidth = 1.5;
    seg(ctx, cx, cy, X(s.pos.x), Y(s.pos.y));
    const rd = radialDirection(s.theta);
    arrow(ctx, X(s.pos.x), Y(s.pos.y), X(s.pos.x - rd.x * 0.42), Y(s.pos.y - rd.y * 0.42), "#E8703A");
    label(ctx, "the string pulls INWARD", 14, 26, "#E8703A");
  } else {
    ctx.strokeStyle = "#F2EEE8"; ctx.lineWidth = 2.5;
    ctx.beginPath();
    s.trail.forEach((q, i) => (i ? ctx.lineTo(X(q.x), Y(q.y)) : ctx.moveTo(X(q.x), Y(q.y))));
    ctx.stroke();
    if (ui.revealed) {
      const rd = radialDirection(s.cutTheta);
      ctx.strokeStyle = "#D65442"; ctx.lineWidth = 1.5; ctx.setLineDash([6, 6]);
      seg(ctx, X(s.cutAt.x), Y(s.cutAt.y),
               X(s.cutAt.x + rd.x * p.r * 2.4), Y(s.cutAt.y + rd.y * p.r * 2.4));
      ctx.setLineDash([]);
      label(ctx, "straight outward — what most people expect",
            X(s.cutAt.x) + 14, Y(s.cutAt.y) - 14, "#D65442");
    }
    ctx.fillStyle = "#6E665C";
    ctx.beginPath(); ctx.arc(X(s.cutAt.x), Y(s.cutAt.y), 4, 0, Math.PI * 2); ctx.fill();
    label(ctx, "cut here", X(s.cutAt.x) + 8, Y(s.cutAt.y) + 18, "#6E665C");
  }
  ctx.fillStyle = "#F2EEE8";
  ctx.beginPath(); ctx.arc(X(s.pos.x), Y(s.pos.y), 10, 0, Math.PI * 2); ctx.fill();
  label(ctx, `speed  ${(s.cut ? speed(s.vel) : p.omega * p.r).toFixed(2)} m/s`, 14, view.h - 16, "#A79E92");
}

function seg(ctx, x1, y1, x2, y2) { ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); }
function arrow(ctx, x1, y1, x2, y2, c) {
  ctx.strokeStyle = c; ctx.fillStyle = c; ctx.lineWidth = 2;
  seg(ctx, x1, y1, x2, y2);
  const a = Math.atan2(y2 - y1, x2 - x1);
  ctx.beginPath(); ctx.moveTo(x2, y2);
  ctx.lineTo(x2 - 8 * Math.cos(a - 0.4), y2 - 8 * Math.sin(a - 0.4));
  ctx.lineTo(x2 - 8 * Math.cos(a + 0.4), y2 - 8 * Math.sin(a + 0.4));
  ctx.fill();
}
function label(ctx, text, x, y, c) {
  ctx.fillStyle = c; ctx.font = '12px "Spline Sans Mono", ui-monospace, monospace';
  ctx.fillText(text, x, y);
}
