// SPDX-License-Identifier: MIT
/**
 * Primitive · free-fall — two bodies of the same size, different mass,
 * released together. Baits `heavier-falls-faster`.
 *
 * Week 2 of the pilot design, which calls this the heaviest single
 * misconception. It is also the one where the everyday evidence genuinely
 * supports the wrong belief: things really do fall at different rates, all
 * the time. So the air is a control, not a footnote — turn it up and the
 * learner's own experience comes back, with a reason attached.
 */
import { stepFall, terminalSpeed, freeFallTime, G } from "../components/falling.mjs";

/**
 * Below this, no one watching could tell the two apart, so calling a winner
 * would be asserting something the learner cannot check by watching (R-021).
 * A real tie — no air, or equal masses — is exact, so nothing depends on the
 * slack being generous.
 */
const TIE = 0.01;

export const id = "free-fall";
export const outcomes = ["together", "heavier"];
export const outcomeText = {
  together: "They hit the ground at the same moment, however different their masses.",
  heavier:  "The heavier one reached the ground first — the air held the lighter one back.",
};
export const controls = [
  { key: "heavy",  label: "heavy ball", min: 0.5, max: 20,  step: 0.5,  default: 5,  unit: " kg" },
  { key: "light",  label: "light ball", min: 0.1, max: 5,   step: 0.1,  default: 0.5, unit: " kg" },
  { key: "height", label: "drop from",  min: 5,   max: 45,  step: 1,    default: 20, unit: " m" },
  { key: "air",    label: "air",        min: 0,   max: 0.1, step: 0.005, default: 0, unit: "" },
];

export function setup(p) {
  const body = () => ({ y: 0, v: 0, t: 0, landed: false });
  return { heavy: body(), light: body(), t: 0, done: false };
}

export function step(s, dt, p) {
  if (s.done) return;
  // Same shape, so the SAME drag coefficient for both. The only difference
  // between these two bodies is mass, which is the entire point.
  stepFall(s.heavy, { mass: p.heavy, k: p.air, height: p.height }, dt);
  stepFall(s.light, { mass: p.light, k: p.air, height: p.height }, dt);
  s.t += dt;
  if (s.heavy.landed && s.light.landed) s.done = true;
}

export function classify(s, p) {
  if (!s.done) return null;                      // an unfinished run decides nothing

  // Decide by the masses, never by which control is called "heavy". Nothing
  // stops a learner dragging the light ball above the heavy one, and an
  // outcome that depended on the label would then be reported backwards.
  const heavier = p.heavy >= p.light ? s.heavy : s.light;
  const lighter = p.heavy >= p.light ? s.light : s.heavy;

  const gap = lighter.t - heavier.t;             // positive means the heavier one won
  if (Math.abs(gap) <= TIE) return "together";
  // With one shape and one air, the heavier body always has the higher
  // terminal speed, so it cannot lose. If it ever does, the model is wrong
  // and we would rather see null than a confident answer.
  return gap > 0 ? "heavier" : null;
}

export function draw(ctx, s, p, view) {
  const pad = 30;
  // Two rows live under the floor: each ball's landing time, then the air and
  // terminal readouts. Reserving the band keeps them apart at any canvas size
  // (P-88) — they used to be four pixels apart, which only showed when the
  // canvas got narrow enough for them to meet horizontally, as it does on the
  // phone landing where the height is capped at 420.
  const FOOT_Y = view.h - 10;            // the readouts
  const TIME_Y = FOOT_Y - 22;            // the landing times, clear above them
  const floorY = TIME_Y - 16;
  const topY = pad + 14;
  const Y = (y) => topY + (y / p.height) * (floorY - topY);

  ctx.fillStyle = "#1B1815";
  ctx.fillRect(0, 0, view.w, view.h);

  // the floor, and the line they were released from
  ctx.strokeStyle = "#332E28"; ctx.lineWidth = 1;
  line(ctx, pad, floorY, view.w - pad, floorY);
  ctx.setLineDash([3, 5]);
  line(ctx, pad, topY, view.w - pad, topY);
  ctx.setLineDash([]);

  const lanes = [
    { b: s.heavy, x: view.w * 0.36, tint: "#E8703A", name: `${p.heavy.toFixed(1)} kg` },
    { b: s.light, x: view.w * 0.64, tint: "#4FB286", name: `${p.light.toFixed(1)} kg` },
  ];
  // IDENTICAL on screen, because they are identical in the model. The first
  // draft drew the heavy ball larger, which is a picture arguing for the
  // misconception the item exists to test — the mass is in the label, where a
  // learner has to read it rather than infer it from size.
  const R = 11;
  let massRight = 0;                     // where the rightmost mass label ends
  for (const L of lanes) {
    ctx.fillStyle = L.tint;
    ctx.beginPath(); ctx.arc(L.x, Y(L.b.y), R, 0, Math.PI * 2); ctx.fill();
    label(ctx, L.name, L.x - 18, topY - 8, L.tint);
    massRight = Math.max(massRight, L.x - 18 + width(ctx, L.name));
    if (L.b.landed) label(ctx, `${L.b.t.toFixed(2)} s`, L.x - 18, TIME_Y, L.tint);
  }

  const airText = p.air === 0 ? "air: none — a vacuum" : `air: ${p.air.toFixed(3)}`;
  label(ctx, airText, pad, FOOT_Y, p.air === 0 ? "#6E665C" : "#D65442");

  // Right-aligned off the measured width rather than a guessed offset, and
  // dropped entirely when it would run into the air readout beside it. A
  // number nobody can read is worse than a number nobody sees.
  if (p.air > 0) {
    const th = terminalSpeed(p.heavy, p.air), tl = terminalSpeed(p.light, p.air);
    const text = `terminal ${th.toFixed(1)} / ${tl.toFixed(1)} m/s`;
    const x = view.w - pad - width(ctx, text);
    if (x > pad + width(ctx, airText) + 12) label(ctx, text, x, FOOT_Y, "#6E665C");
  }

  // The clock shares the top row with the mass labels, and the masses win: on
  // a narrow canvas they were running into each other (P-88). It is also the
  // most expendable readout here — once the balls land, their times are on
  // screen anyway.
  const clock = `t = ${s.t.toFixed(2)} s`;
  const clockX = view.w - pad - width(ctx, clock);
  if (clockX > massRight + 10) label(ctx, clock, clockX, topY - 8, "#6E665C");
  if (p.air === 0) label(ctx, `both: ${freeFallTime(p.height).toFixed(2)} s`, pad, topY - 8, "#6E665C");
}

function line(ctx, x1, y1, x2, y2) {
  ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
}
/** Measured in the same font the labels use, so alignment is not a guess. */
function width(ctx, text) {
  ctx.font = '12px "Spline Sans Mono", ui-monospace, monospace';
  return ctx.measureText(text).width;
}
function label(ctx, text, x, y, colour) {
  ctx.fillStyle = colour;
  ctx.font = '12px "Spline Sans Mono", ui-monospace, monospace';
  ctx.fillText(text, x, y);
}
