// SPDX-License-Identifier: MIT
/**
 * What the chemistry primitives actually draw.
 *
 * P-97. The sealed jar's whole job is to separate "the gas left" from "the
 * mass stopped existing". A balance reading that falls while nothing is seen
 * going anywhere teaches the misconception it was built to bait, and no
 * amount of correct classify() would save it.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import * as jar from "./sealed-jar.mjs";
import * as reagent from "./limiting-reagent.mjs";
import { runHeadless } from "../scenario/run.mjs";

/** A canvas that writes down what it was told to do. */
function recorder() {
  const calls = [];
  const text = [];
  const ctx = new Proxy({}, {
    get(_t, name) {
      if (name === "fillText") return (s, x, y) => { text.push(String(s)); calls.push(["fillText", x, y]); };
      if (["fillStyle", "strokeStyle", "lineWidth", "font"].includes(name)) return undefined;
      return (...args) => calls.push([String(name), ...args]);
    },
    set() { return true; },
  });
  return { ctx, calls, text, arcs: () => calls.filter((c) => c[0] === "arc") };
}

const view = { w: 640, h: 420 };

test("gas that leaves an open jar is drawn leaving it", () => {
  const p = { start: 50, gas: 6, sealed: 0 };
  const r = runHeadless(jar, p);
  const rec = recorder();
  jar.draw(rec.ctx, r.state, p, view, { revealed: true });
  assert.equal(r.state.escaped, 6, "the run did not actually release the gas");
  assert.ok(rec.text.some((t) => /left the jar/.test(t)),
    `nothing on screen says the gas left: ${JSON.stringify(rec.text)}`);
});

test("the balance reading on screen is the one the answer check uses", () => {
  // Two sums for one number is how a picture starts disagreeing with its own
  // verdict. The drawing reads from reactions.mjs, like classify() does.
  for (const p of [{ start: 50, gas: 6, sealed: 0 }, { start: 50, gas: 6, sealed: 1 }]) {
    const r = runHeadless(jar, p);
    const rec = recorder();
    jar.draw(rec.ctx, r.state, p, view, { revealed: true });
    const expected = p.sealed ? 50 : 44;
    assert.ok(rec.text.includes(`${expected} g`),
      `lid ${p.sealed}: the balance should read ${expected} g, screen says ${JSON.stringify(rec.text)}`);
  }
});

test("a sealed jar still shows the gas, because the reaction still happened", () => {
  // The commonest wrong fix for this item is a sealed jar where nothing
  // visibly occurs, which quietly teaches that sealing stops the reaction.
  const p = { start: 50, gas: 6, sealed: 1 };
  const r = runHeadless(jar, p);
  assert.equal(r.state.held, 6, "the gas was never made");
  const rec = recorder();
  jar.draw(rec.ctx, r.state, p, view, { revealed: false });
  assert.ok(rec.arcs().length >= 6, "the bubbles are not on screen");
});

test("the jar never shows more gas than the reaction made", () => {
  // Conservation, in the drawing as well as the arithmetic. An escaped bubble
  // was being drawn frozen at the ceiling AND again above the jar, so six
  // grams appeared as twelve — in the primitive whose subject is that matter
  // is neither created nor destroyed.
  for (const sealed of [0, 1]) {
    const p = { start: 50, gas: 6, sealed };
    const r = runHeadless(jar, p);
    const rec = recorder();
    jar.draw(rec.ctx, r.state, p, view, { revealed: true });
    // Every arc on screen: bubbles, the tablet, and nothing else.
    const bubbles = rec.arcs().length - 1;
    assert.ok(bubbles <= p.gas,
      `lid ${sealed}: ${bubbles} bubbles drawn for ${p.gas} g of gas`);
  }
});

test("a used-up atom is dimmed, not removed", () => {
  // Removing them leaves a learner unable to see that there WERE four, which
  // is the whole count the question turns on.
  const p = { a: 4, b: 10, needA: 1, needB: 2 };
  const r = runHeadless(reagent, p);
  const rec = recorder();
  reagent.draw(rec.ctx, r.state, p, view, { revealed: true });
  // Counting arcs is not enough: skipping the stroke leaves the arc call in
  // place and draws nothing at all. What proves it is on screen is the paint.
  const strokes = rec.calls.filter((c) => c[0] === "stroke").length;
  const used = r.state.paired * (p.needA + p.needB);
  assert.equal(strokes, used, `${used} atoms were used up but ${strokes} are drawn as used`);
  assert.ok(rec.arcs().length >= p.a + p.b, "some particles are not drawn at all");
});

test("the shelves say how many are left, and the sum is right", () => {
  const p = { a: 4, b: 10, needA: 1, needB: 2 };
  const r = runHeadless(reagent, p);
  const rec = recorder();
  reagent.draw(rec.ctx, r.state, p, view, { revealed: true });
  const said = rec.text.join(" | ");
  assert.match(said, /A\s+0 left of 4/, said);
  assert.match(said, /B\s+2 left of 10/, said);
});
