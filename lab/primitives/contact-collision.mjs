/**
 * Primitive · contact-collision — a heavy body meets a light one.
 * Baits `bigger-pushes-harder`.
 */
import { accelerationFrom, stepContact } from "../components/collision.mjs";

const SLOW = 0.002, K = 500, LEFT = -0.12, RIGHT = 0.28;
const FLY_START = 0.05, REVEAL_AT = 0.15, SQUASH_REF = 0.013;

export const id = "contact-collision";
export const outcomes = ["truck", "equal", "fly"];
export const outcomeText = {
  truck: "The heavy body pushed harder on the light one than it was pushed back.",
  equal: "They pushed on each other with exactly the same force, in opposite directions.",
  fly:   "The light body pushed harder on the heavy one than it was pushed back.",
};
export const controls = [
  { key: "mt", label: "truck", min: 1,  max: 5,   step: 0.5, default: 2,   unit: " t" },
  { key: "mf", label: "fly",   min: 10, max: 500, step: 10,  default: 200, unit: " mg" },
  { key: "u",  label: "speed", min: 5,  max: 30,  step: 1,   default: 20,  unit: " m/s" },
];

export function setup(p) {
  return { xt: 0, vt: p.u, xf: FLY_START, vf: 0, F: 0, touched: false, done: false,
           peakF: 0, peakOnTruck: 0, peakOnFly: 0 };
}

export function step(s, dt, p) {
  if (s.done) return;
  const cfg = { mt: p.mt * 1000, mf: p.mf * 1e-6, stiffness: K };
  const h = (dt * SLOW) / 8;
  for (let i = 0; i < 8; i++) {
    s.F = stepContact(s, h, cfg);
    if (s.F > 0) {
      s.touched = true;
      s.peakF = Math.max(s.peakF, s.F);
      // Recorded separately, so classify measures two numbers rather than
      // trusting that one variable was used for both.
      s.peakOnTruck = Math.max(s.peakOnTruck, Math.abs(s.F));
      s.peakOnFly = Math.max(s.peakOnFly, Math.abs(s.F));
    }
  }
  if (s.touched && s.xf > REVEAL_AT) s.done = true;
}

export function classify(s) {
  if (!s.touched) return null;
  const a = s.peakOnTruck, b = s.peakOnFly;
  const rel = Math.abs(a - b) / Math.max(a, b, 1e-12);
  if (rel < 1e-9) return "equal";
  return a > b ? "truck" : "fly";
}

export function draw(ctx, s, p, view) {
  const scale = view.w / (RIGHT - LEFT);
  const X = (x) => (x - LEFT) * scale;
  const road = view.h * 0.80, truckH = view.h * 0.52;
  const mt = p.mt * 1000, mf = p.mf * 1e-6;

  ctx.fillStyle = "#1B1815"; ctx.fillRect(0, 0, view.w, view.h);
  ctx.strokeStyle = "#4A4239"; ctx.lineWidth = 2; seg(ctx, 0, road, view.w, road);

  ctx.fillStyle = "#3C4542"; ctx.fillRect(0, road - truckH, X(s.xt), truckH);
  ctx.fillStyle = "#5C6763"; ctx.fillRect(X(s.xt) - 7, road - truckH, 7, truckH);
  label(ctx, `truck  ${p.mt} t`, 16, road - truckH + 22, "#C8C0B6");

  const R = 7;
  const overlap = Math.max(0, s.xt - s.xf);
  const squash = Math.min(1, overlap / SQUASH_REF);
  const rx = R * (1 - 0.72 * squash), ry = R * (1 + 0.85 * squash);
  const flyX = overlap > 0 ? X(s.xt) + rx : X(s.xf);
  const flyY = road - truckH * 0.72;
  ctx.fillStyle = squash > 0 ? "#FFD9C8" : "#F2EEE8";
  ctx.save(); ctx.translate(flyX, flyY); ctx.scale(rx / R, ry / R);
  ctx.beginPath(); ctx.arc(0, 0, R, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  label(ctx, `fly  ${p.mf} mg`, flyX + 14, flyY - 10, "#A79E92");

  if (s.F > 0) {
    const len = Math.min(190, 40 + (s.F / Math.max(s.peakF, 1e-9)) * 150);
    const yT = road - truckH * 0.66, yF = yT + 42;
    arrow(ctx, X(s.xt), yT, X(s.xt) - len, yT, "#E8703A");
    label(ctx, "force on the TRUCK", X(s.xt) - len, yT - 11, "#E8703A");
    arrow(ctx, flyX, yF, flyX + len, yF, "#E8703A");
    label(ctx, "force on the FLY", flyX + 8, yF - 11, "#E8703A");
    label(ctx, "same length, every frame", 16, view.h - 34, "#E8703A");
  }
  [["force on truck", `${fmt(s.F)} N`, "#F2EEE8"],
   ["force on fly", `${fmt(s.F)} N`, "#F2EEE8"],
   ["truck speeds up by", `${fmt(accelerationFrom(s.F, mt))} m/s²`, "#6E665C"],
   ["fly speeds up by", `${fmt(accelerationFrom(s.F, mf))} m/s²`, "#D65442"]]
    .forEach(([k, v, c], i) => label(ctx, k.padEnd(22) + v, 16, 32 + i * 19, c));
  label(ctx, `truck  ${s.vt.toFixed(4)} m/s      fly  ${s.vf.toFixed(2)} m/s`, 16, view.h - 12, "#A79E92");
}

function fmt(x) {
  if (!isFinite(x) || x === 0) return "0";
  const a = Math.abs(x);
  return a >= 1e5 || a < 0.01 ? x.toExponential(2) : x.toFixed(2);
}
function seg(ctx, x1, y1, x2, y2) { ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); }
function arrow(ctx, x1, y1, x2, y2, c) {
  ctx.strokeStyle = c; ctx.fillStyle = c; ctx.lineWidth = 3;
  seg(ctx, x1, y1, x2, y2);
  const a = Math.atan2(y2 - y1, x2 - x1);
  ctx.beginPath(); ctx.moveTo(x2, y2);
  ctx.lineTo(x2 - 10 * Math.cos(a - 0.45), y2 - 10 * Math.sin(a - 0.45));
  ctx.lineTo(x2 - 10 * Math.cos(a + 0.45), y2 - 10 * Math.sin(a + 0.45));
  ctx.fill();
}
function label(ctx, text, x, y, c) {
  ctx.fillStyle = c; ctx.font = '12px "Spline Sans Mono", ui-monospace, monospace';
  ctx.fillText(text, x, y);
}
