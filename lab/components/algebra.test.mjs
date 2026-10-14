// SPDX-License-Identifier: MIT
import { test } from "node:test";
import assert from "node:assert/strict";
import { intersect, realRoots } from "./algebra.mjs";

test("two lines of different slope meet exactly once, at the right place", () => {
  const r = intersect(1, 0, -1, 4);          // y = x and y = -x + 4 meet at (2, 2)
  assert.equal(r.kind, "one-point");
  assert.deepEqual(r.at, { x: 2, y: 2 });
});

test("equal slopes never meet, unless they are the same line", () => {
  assert.equal(intersect(2, 1, 2, 3).kind, "parallel");
  assert.equal(intersect(2, 1, 2, 1).kind, "same-line");
  assert.equal(intersect(0, -3, 0, -3).kind, "same-line");   // two flat lines, together
});

test("the discriminant decides how many roots there are", () => {
  assert.equal(realRoots(1, 5, 1).kind, "two");     // 25 - 4 > 0
  assert.equal(realRoots(1, 2, 1).kind, "one");     // 4 - 4 = 0
  assert.equal(realRoots(1, 1, 3).kind, "none");    // 1 - 12 < 0
});

test("the roots it reports are roots", () => {
  for (const [a, b, c] of [[1, 5, 1], [2, -4, -6], [1, 2, 1], [3, 6, 3]]) {
    const { values } = realRoots(a, b, c);
    for (const x of values)
      assert.ok(Math.abs(a * x * x + b * x + c) < 1e-9,
        `${a}x² + ${b}x + ${c} is ${a * x * x + b * x + c} at x=${x}, not 0`);
  }
});

test("a repeated root is reported once, not twice", () => {
  const r = realRoots(1, 2, 1);
  assert.equal(r.values.length, 1, "x² + 2x + 1 has one root, at -1");
  assert.equal(r.values[0], -1);
});

test("a straight line is not a quadratic, and says so", () => {
  assert.throws(() => realRoots(0, 2, 1), /not a quadratic/);
});
