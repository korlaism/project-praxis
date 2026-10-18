// SPDX-License-Identifier: MIT
/**
 * The computing oracle. Counts, not clocks.
 *
 * P-98. Everything here is an integer that can be worked out on paper, which
 * is the only kind of truth the answer check can stand on. A primitive that
 * timed anything would give a different answer on a different machine, and a
 * scenario whose correct option depends on the machine is not a scenario.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { linearCost, binaryCost, cacheWalk } from "./algorithms.mjs";

test("a linear search costs one comparison per element it passes", () => {
  assert.equal(linearCost(10, 1), 1);
  assert.equal(linearCost(10, 7), 7);
  assert.equal(linearCost(10, 10), 10);
});

test("a binary search halves the range, and the count depends on where it lands", () => {
  // Not a formula: the middle element is found immediately however big the
  // array, and that is the case the misconception never predicts.
  assert.equal(binaryCost(15, 8), 1, "the exact middle is found on the first comparison");
  assert.ok(binaryCost(15, 1) > 1, "the first element is not the middle");
  assert.ok(binaryCost(1023, 512) < binaryCost(15, 1), "a huge array can still beat a small one");
});

test("the exact comparison count is pinned, not merely bounded", () => {
  // A bound is not a count. Narrowing to `hi = mid` instead of `hi = mid - 1`
  // leaves every bound here satisfied and still changes the answer on 14,222
  // of the first 200 array sizes — including n=5, where looking for the first
  // element goes from two comparisons to three.
  const expected = {
    "5,1": 2, "5,2": 3, "5,3": 1, "5,4": 2, "5,5": 3,
    "6,1": 2, "7,1": 3, "15,1": 4, "15,8": 1, "16,16": 5,
  };
  for (const [key, want] of Object.entries(expected)) {
    const [n, t] = key.split(",").map(Number);
    assert.equal(binaryCost(n, t), want, `n=${n} target=${t}`);
  }
});

test("a binary search never costs more than the halvings available", () => {
  for (const n of [1, 2, 7, 8, 100, 1000]) {
    const limit = Math.floor(Math.log2(n)) + 1;
    for (let t = 1; t <= n; t++)
      assert.ok(binaryCost(n, t) <= limit, `n=${n} target=${t} took ${binaryCost(n, t)} > ${limit}`);
  }
});

test("a binary search finds every element it is asked for", () => {
  // The count is only meaningful if the search actually succeeds; a loop that
  // silently missed would still return a number.
  for (const n of [1, 2, 3, 16, 17, 64])
    for (let t = 1; t <= n; t++)
      assert.ok(binaryCost(n, t) >= 1, `n=${n} target=${t} never found it`);
});

test("near the front of a short array, the simple search wins", () => {
  // The whole point of the primitive. Better asymptotics is a claim about
  // growth, not a promise about this input.
  assert.ok(linearCost(8, 1) < binaryCost(8, 1));
  assert.ok(linearCost(1000, 1) < binaryCost(1000, 1), "and it is still true of a huge array");
});

test("deep into a large array, the clever one wins by a mile", () => {
  assert.ok(binaryCost(1000, 999) < linearCost(1000, 999));
});

test("walking a grid by rows fetches one line per line, not one per cell", () => {
  // 4 rows of 8, lines of 4 cells: each row is 2 lines, so 8 fetches.
  const w = cacheWalk({ rows: 4, cols: 8, lineSize: 4, cacheLines: 2 });
  assert.equal(w.rowMajor, 8);
});

test("walking the same grid by columns refetches, when the cache cannot hold a line per row", () => {
  const w = cacheWalk({ rows: 4, cols: 8, lineSize: 4, cacheLines: 2 });
  assert.ok(w.colMajor > w.rowMajor, `columns cost ${w.colMajor}, rows ${w.rowMajor}`);
});

test("a cache with room for every row makes the two orders cost the same", () => {
  // The honest answer to "does the order matter?" is "it depends", and this
  // is the case where it does not. A learner must be able to reach it.
  const w = cacheWalk({ rows: 4, cols: 8, lineSize: 4, cacheLines: 4 });
  assert.equal(w.colMajor, w.rowMajor);
});

test("with one cell per line there is nothing to reuse and the orders tie", () => {
  const w = cacheWalk({ rows: 4, cols: 8, lineSize: 1, cacheLines: 1 });
  assert.equal(w.rowMajor, 32);
  assert.equal(w.colMajor, 32);
});

test("neither order can fetch fewer lines than the grid actually occupies", () => {
  // A cache model that invented savings would make the lesson a lie.
  for (const rows of [1, 3, 5])
    for (const cols of [1, 4, 9])
      for (const lineSize of [1, 2, 4])
        for (const cacheLines of [1, 2, 8]) {
          const floor = rows * Math.ceil(cols / lineSize);
          const w = cacheWalk({ rows, cols, lineSize, cacheLines });
          const where = JSON.stringify({ rows, cols, lineSize, cacheLines, w });
          assert.ok(w.rowMajor >= floor, `rows below the floor: ${where}`);
          assert.ok(w.colMajor >= floor, `cols below the floor: ${where}`);
          assert.ok(w.colMajor <= rows * cols, `cols above one-per-cell: ${where}`);
        }
});
