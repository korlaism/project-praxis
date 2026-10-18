// SPDX-License-Identifier: MIT
/**
 * Primitive · sealed-jar — a fizzing reaction on a balance, lid on or off.
 *
 * Baits `mass-is-lost`: the belief that fizzing, burning or dissolving
 * destroys matter, because the number on the balance goes down. It is the
 * single most documented misconception in school chemistry and it is almost
 * reasonable — the number really does go down. What the learner has to
 * separate is *the gas leaving the jar* from *the mass ceasing to exist*.
 *
 * So the drawing has one job above all others: when the gas leaves, it must
 * be SEEN leaving. A balance reading that falls with nothing visibly going
 * anywhere teaches the misconception instead of baiting it.
 *
 * Deliberately not "does mass disappear": a learner can get the right answer
 * to that from a slogan. The question is what this jar weighs, and the lid is
 * a control they can move.
 */
import { massAfter } from "../components/reactions.mjs";

const RELEASE = 0.16;             // seconds between bubbles
const RISE = 70;                  // pixels per second
const SETTLE = 0.7;

export const id = "sealed-jar";
export const outcomes = ["same", "lighter"];
export const outcomeText = {
  same: "The balance read exactly the same at the end as at the start.",
  lighter: "The balance ended lower — the jar lost the gas that escaped it.",
};
export const controls = [
  { key: "start",  label: "mass at the start", min: 30, max: 80, step: 5, default: 50, unit: " g" },
  { key: "gas",    label: "gas the reaction makes", min: 0, max: 12, step: 1, default: 6, unit: " g" },
  // A two-position control, because the lid is a two-position thing. Everything
  // else here is continuous and this is not, and pretending otherwise would be
  // a slider that means nothing in between.
  { key: "sealed", label: "lid on (1) or off (0)", min: 0, max: 1, step: 1, default: 0, unit: "" },
];

const isSealed = (p) => p.sealed >= 0.5;

export function setup(p) {
  return { t: 0, released: 0, escaped: 0, held: 0, bubbles: [], done: false };
}

export function step(s, dt, p) {
  if (s.done) return;
  s.t += dt;

  // One bubble per gram of gas, released in turn.
  const shouldHave = Math.min(p.gas, Math.floor(s.t / RELEASE));
  while (s.released < shouldHave) { s.bubbles.push({ y: 0 }); s.released++; }

  const ceiling = 120;            // how far a bubble rises before the lid line
  for (const bubble of s.bubbles) {
    if (bubble.gone || bubble.stuck) continue;
    bubble.y += RISE * dt;
    if (bubble.y < ceiling) continue;
    if (isSealed(p)) { bubble.stuck = true; bubble.y = ceiling; s.held++; }
    else { bubble.gone = true; s.escaped++; }
  }

  const settled = s.released >= p.gas && s.bubbles.every((x) => x.gone || x.stuck);
  if (settled && s.t >= p.gas * RELEASE + ceiling / RISE + SETTLE) s.done = true;
}

export function classify(s, p) {
  if (!s.done) return null;
  return massAfter({ start: p.start, gas: p.gas, sealed: isSealed(p) }) === p.start ? "same" : "lighter";
}

export function draw(ctx, s, p, view, ui) {
  const w = view.w, h = view.h;
  ctx.fillStyle = "#1B1815";
  ctx.fillRect(0, 0, w, h);

  const jarW = 150, jarH = 170;
  const jarX = Math.round(w / 2 - jarW / 2);
  // Centred on the stage, allowing for the balance and its two labels below
  // the jar. Anchoring to the bottom left most of the canvas empty.
  const jarBottom = Math.round(h / 2 + jarH / 2 - 34);
  const jarTop = jarBottom - jarH;
  const ceilingY = jarBottom - 120;

  // The jar. The lid is drawn solid when it is on and as a gap when it is off,
  // because that difference is the entire question.
  ctx.strokeStyle = "#6E665C"; ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(jarX, jarTop); ctx.lineTo(jarX, jarBottom);
  ctx.lineTo(jarX + jarW, jarBottom); ctx.lineTo(jarX + jarW, jarTop);
  ctx.stroke();
  if (isSealed(p)) {
    ctx.strokeStyle = "#A79E92"; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(jarX - 8, jarTop); ctx.lineTo(jarX + jarW + 8, jarTop); ctx.stroke();
  }

  // The liquid, and the tablet fizzing in it.
  ctx.fillStyle = "#2A2420";
  ctx.fillRect(jarX + 2, jarBottom - 40, jarW - 4, 38);
  ctx.fillStyle = "#E8703A";
  ctx.beginPath(); ctx.arc(jarX + jarW / 2, jarBottom - 14, 8, 0, Math.PI * 2); ctx.fill();

  // Bubbles. One that escaped is drawn ABOVE the jar on its way out and only
  // then forgotten, so the gas is visibly going somewhere.
  for (const [i, bubble] of s.bubbles.entries()) {
    // One that has gone is drawn above the jar, below, and nowhere else. Left
    // in here it was ALSO drawn frozen at the ceiling, so six grams of gas
    // appeared as twelve bubbles — in the one primitive whose entire subject
    // is that matter is neither created nor destroyed.
    if (bubble.gone) continue;
    const x = jarX + 28 + ((i * 37) % (jarW - 56));
    const y = jarBottom - 20 - bubble.y;
    ctx.beginPath();
    ctx.arc(x, y, 5, 0, Math.PI * 2);
    ctx.fillStyle = bubble.stuck ? "#4FB286" : "#8FD6B4";
    ctx.fill();
  }
  if (!isSealed(p) && s.escaped) {
    ctx.fillStyle = "#8FD6B4";
    for (let i = 0; i < Math.min(s.escaped, 6); i++) {
      ctx.beginPath();
      ctx.arc(jarX + jarW / 2 + (i - 2.5) * 16, jarTop - 18 - i * 4, 4, 0, Math.PI * 2);
      ctx.fill();
    }
    label(ctx, `${s.escaped} g of gas left the jar`, jarX + jarW + 16, jarTop + 6, "#8FD6B4");
  }
  if (isSealed(p) && s.held)
    label(ctx, `${s.held} g of gas, still in the jar`, jarX + jarW + 16, jarTop + 6, "#4FB286");

  // The balance. Its reading is the thing being asked about, so it is read
  // from the same arithmetic the answer check uses, never from a separate sum.
  const now = massAfter({ start: p.start, gas: s.escaped, sealed: false });
  ctx.strokeStyle = "#6E665C"; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(jarX - 30, jarBottom + 8); ctx.lineTo(jarX + jarW + 30, jarBottom + 8); ctx.stroke();
  ctx.font = '22px "Spline Sans Mono", ui-monospace, monospace';
  ctx.fillStyle = now === p.start ? "#F2EEE8" : "#E8703A";
  ctx.fillText(`${now.toFixed(0)} g`, jarX + jarW / 2 - 24, jarBottom + 44);
  label(ctx, `started at ${p.start} g`, jarX + jarW / 2 - 44, jarBottom + 64, "#6E665C");

  if (ui?.revealed)
    label(ctx, isSealed(p)
      ? "Nothing could leave, so nothing did."
      : `${s.escaped} g of gas is somewhere else now — it did not stop existing.`,
      24, 22, "#A79E92");
}

function label(ctx, text, x, y, colour) {
  ctx.fillStyle = colour;
  ctx.font = '12px "Spline Sans Mono", ui-monospace, monospace';
  ctx.fillText(text, x, y);
}
