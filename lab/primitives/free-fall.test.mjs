// SPDX-License-Identifier: MIT
/**
 * free-fall's labels, on a canvas that is not the lab's. P-88.
 *
 * The landing (ADR 0017) caps the canvas at 420px tall, where the lab gives it
 * most of the window. The landing times sat four pixels above the footer
 * readouts, which is invisible while the canvas is wide enough to keep them
 * apart horizontally and a collision the moment it is not.
 *
 * Caught by looking at a screenshot. This is the test that would have caught
 * it instead.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import * as freeFall from "./free-fall.mjs";
import { resolveParams } from "./index.mjs";
import { runHeadless } from "../scenario/run.mjs";

/** A context that records where text was drawn, and nothing else. */
function recordingCtx() {
  const texts = [];
  const noop = () => {};
  const ctx = new Proxy({ texts }, {
    get: (t, k) =>
      k === "texts" ? texts
      : k === "fillText" ? (text, x, y) => texts.push({ text, x, y })
      : k === "measureText" ? (s) => ({ width: s.length * CHAR })
      : k === "canvas" ? { width: 800, height: 600 }
      : typeof k === "string" ? noop : undefined,
    set: () => true,
  });
  return ctx;
}

/**
 * 12px Spline Sans Mono is about 7.2px per character. The first version of
 * this test guessed 6.2 and passed while "0.5 kg" and "t = 3.10 s" were
 * visibly touching on the phone — an estimate that flatters the code is worse
 * than no estimate. Rounded up, so the test is the pessimistic one.
 */
const CHAR = 7.4;
const box = (t) => ({ ...t, x0: t.x, x1: t.x + t.text.length * CHAR });
const overlaps = (a, b) =>
  Math.abs(a.y - b.y) < 12 && box(a).x0 < box(b).x1 && box(b).x0 < box(a).x1;

function drawAt(view, params) {
  const p = resolveParams(freeFall, params);
  const run = runHeadless(freeFall, p);
  const ctx = recordingCtx();
  freeFall.draw(ctx, run.state, p, view, { revealed: true });
  return ctx.texts;
}

const LANDING = /^\d+\.\d{2} s$/;
const FOOTER = /^(air:|terminal )/;

test("no two labels overlap, on a canvas as short and narrow as the landing's", () => {
  // The landing caps the canvas at min(width * 0.95, 420).
  for (const view of [{ w: 358, h: 340 }, { w: 320, h: 304 }, { w: 390, h: 370 }]) {
    const texts = drawAt(view, { heavy: 5, light: 0.5, height: 20, air: 0.08 });
    for (let i = 0; i < texts.length; i++)
      for (let j = i + 1; j < texts.length; j++)
        assert.ok(!overlaps(texts[i], texts[j]),
          `${view.w}x${view.h}: "${texts[i].text}" and "${texts[j].text}" overlap`);
  }
});

test("the landing times sit clear of the footer readouts", () => {
  const texts = drawAt({ w: 358, h: 340 }, { heavy: 5, light: 0.5, height: 20, air: 0.08 });
  const landings = texts.filter((t) => LANDING.test(t.text));
  const footer = texts.filter((t) => FOOTER.test(t.text));
  assert.ok(landings.length === 2, `expected two landing times, got ${landings.length}`);
  assert.ok(footer.length >= 1, "no footer readout drawn");
  for (const l of landings)
    for (const f of footer)
      assert.ok(f.y - l.y >= 14,
        `"${l.text}" is only ${(f.y - l.y).toFixed(0)}px above "${f.text}"`);
});

test("everything stays inside the canvas", () => {
  for (const view of [{ w: 320, h: 304 }, { w: 1400, h: 700 }]) {
    for (const t of drawAt(view, { heavy: 5, light: 0.5, height: 20, air: 0.08 })) {
      assert.ok(t.x >= 0, `${view.w}: "${t.text}" starts off the left edge at ${t.x}`);
      assert.ok(box(t).x1 <= view.w, `${view.w}: "${t.text}" runs past the right edge`);
      assert.ok(t.y > 0 && t.y <= view.h, `${view.w}: "${t.text}" is outside vertically`);
    }
  }
});

test("the wide canvas is unaffected", () => {
  const texts = drawAt({ w: 1400, h: 700 }, { heavy: 5, light: 0.5, height: 20, air: 0.08 });
  for (let i = 0; i < texts.length; i++)
    for (let j = i + 1; j < texts.length; j++)
      assert.ok(!overlaps(texts[i], texts[j]),
        `"${texts[i].text}" and "${texts[j].text}" overlap at 1400x700`);
});
