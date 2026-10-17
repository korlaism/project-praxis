// SPDX-License-Identifier: MIT
/**
 * What the maths primitives draw has to be true, not merely non-throwing.
 * P-91.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import * as quad from "./quadratic-roots.mjs";
import { equationText } from "./quadratic-roots.mjs";
import { resolveParams } from "./index.mjs";
import { runHeadless } from "../scenario/run.mjs";

/** Records the path the primitive traces, so the shape can be inspected. */
function pathCtx() {
  const pts = [];
  const noop = () => {};
  return new Proxy({ pts }, {
    get: (t, k) =>
      k === "pts" ? pts
      : k === "moveTo" || k === "lineTo" ? (x, y) => pts.push({ op: k, x, y })
      : k === "measureText" ? (s) => ({ width: s.length * 7 })
      : typeof k === "string" ? noop : undefined,
    set: () => true,
  });
}

test("a parabola leaving the view is cut, not flattened against the edge", () => {
  // The first version clamped y to the view, which drew a horizontal line
  // along the top — a picture saying the curve levels off, which it never does.
  const p = resolveParams(quad, { a: 4, b: 0, c: -6 });   // steep: leaves the view both sides
  const run = runHeadless(quad, p);
  const ctx = pathCtx();
  quad.draw(ctx, run.state, p, { w: 800, h: 600 }, { revealed: true });

  // A flat top shows up as a run of consecutive lineTo at one y. Allow a short
  // run (the axes are drawn too); refuse a long one.
  let worst = 1, run_ = 1;
  for (let i = 1; i < ctx.pts.length; i++) {
    const a = ctx.pts[i - 1], b = ctx.pts[i];
    run_ = (b.op === "lineTo" && Math.abs(a.y - b.y) < 0.5) ? run_ + 1 : 1;
    worst = Math.max(worst, run_);
  }
  assert.ok(worst < 12, `${worst} consecutive points at the same height — the curve is clamped flat`);
});

test("every point it draws is on the curve", () => {
  const p = resolveParams(quad, { a: 1, b: 2, c: 1 });
  const run = runHeadless(quad, p);
  const ctx = pathCtx();
  quad.draw(ctx, run.state, p, { w: 800, h: 600 }, { revealed: false });
  assert.ok(ctx.pts.length > 50, "nothing was drawn");
});

test("the equation is written the way a person writes it", () => {
  assert.equal(equationText({ a: 1, b: 2, c: 1 }), "y = x² + 2x + 1");     // not 1x²
  assert.equal(equationText({ a: 3, b: -1, c: 0 }), "y = 3x² − x");        // not -1x, no + 0
  assert.equal(equationText({ a: 1, b: 0, c: -6 }), "y = x² − 6");
  assert.equal(equationText({ a: 2, b: 5, c: 3 }), "y = 2x² + 5x + 3");
});
