// SPDX-License-Identifier: MIT
/**
 * What the computing primitives draw.
 *
 * P-98. Neither of these has a picture of its own the way a falling ball
 * does, so the drawing is doing more work here than anywhere else: it is the
 * only reason a learner can check the claim rather than take it.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import * as race from "./search-race.mjs";
import * as cache from "./cache-walk.mjs";
import { runHeadless } from "../scenario/run.mjs";
import { linearCost, binaryCost, cacheWalk } from "../components/algorithms.mjs";

function recorder() {
  const calls = [], text = [];
  const ctx = new Proxy({}, {
    get(_t, name) {
      if (name === "fillText") return (s, x, y) => { text.push(String(s)); calls.push(["fillText", x, y]); };
      if (["fillStyle", "strokeStyle", "lineWidth", "font"].includes(name)) return undefined;
      return (...args) => calls.push([String(name), ...args]);
    },
    set() { return true; },
  });
  return { ctx, calls, text };
}
const view = { w: 760, h: 460 };

const drawn = (primitive, p, ui = { revealed: true }) => {
  const r = runHeadless(primitive, p);
  const rec = recorder();
  primitive.draw(rec.ctx, r.state, p, view, ui);
  return { rec, state: r.state };
};

test("the comparison counts on screen are the ones the answer check uses", () => {
  // Two sums for one number is how a picture starts disagreeing with its own
  // verdict, and here the number IS the lesson.
  for (const p of [{ n: 62, target: 1 }, { n: 62, target: 62 }, { n: 2, target: 1 }]) {
    const { rec } = drawn(race, p);
    const said = rec.text.join(" | ");
    assert.ok(said.includes(`scan ${linearCost(p.n, p.target)}`), `${JSON.stringify(p)}: ${said}`);
    assert.ok(said.includes(`halve ${binaryCost(p.n, p.target)}`), `${JSON.stringify(p)}: ${said}`);
  }
});

test("the search says it is counting comparisons, not seconds", () => {
  // The whole claim is about counts. A learner who reads it as a stopwatch
  // has been taught something false about what makes an algorithm better.
  const { rec } = drawn(race, { n: 62, target: 1 });
  assert.match(rec.text.join(" "), /comparison/);
});

test("the cache model says it is a model", () => {
  // It is a teaching picture, not a processor. Said on every frame rather
  // than only at the reveal, because the wrong belief forms while watching.
  const { rec } = drawn(cache, { rows: 4, cols: 8, line: 4, held: 2 }, { revealed: false });
  assert.match(rec.text.join(" "), /not a real processor/);
});

test("the fetch counts on screen are the ones the answer check uses", () => {
  for (const p of [{ rows: 4, cols: 8, line: 4, held: 2 }, { rows: 4, cols: 8, line: 4, held: 4 }]) {
    const w = cacheWalk({ rows: p.rows, cols: p.cols, lineSize: p.line, cacheLines: p.held });
    const { rec } = drawn(cache, p);
    const said = rec.text.join(" | ");
    assert.ok(said.includes(`${w.rowMajor} line fetches`), `${JSON.stringify(p)}: ${said}`);
    assert.ok(said.includes(`${w.colMajor} down the columns`), `${JSON.stringify(p)}: ${said}`);
  }
});

test("both grids are drawn whole, so the same cells are visibly the same cells", () => {
  const p = { rows: 4, cols: 8, line: 4, held: 2 };
  const { rec } = drawn(cache, p, { revealed: false });
  const cells = rec.calls.filter((c) => c[0] === "fillRect").length;
  // One background, then every cell of both grids.
  assert.ok(cells >= 1 + 2 * p.rows * p.cols, `only ${cells} fills — a grid is incomplete`);
});

test("the line boundaries are drawn, because a line is the whole point", () => {
  const p = { rows: 4, cols: 8, line: 4, held: 2 };
  const { rec } = drawn(cache, p, { revealed: false });
  const boxes = rec.calls.filter((c) => c[0] === "strokeRect").length;
  // Two grids, each row divided into cols/line boxes.
  assert.equal(boxes, 2 * p.rows * Math.ceil(p.cols / p.line));
});
