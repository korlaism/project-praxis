// SPDX-License-Identifier: MIT
/**
 * The computing oracle — counts, not clocks.
 *
 * P-98. What `algebra.mjs` is to maths and `reactions.mjs` is to chemistry.
 * Everything here is an integer a learner could work out on paper, which is
 * the only kind of truth the answer check can stand on: a primitive that
 * timed anything would answer differently on a different machine, and a
 * scenario whose correct option depends on the machine is not a scenario.
 */

/** Comparisons a linear scan makes to reach the element at 1-based `target`. */
export function linearCost(n, target) {
  if (!(n >= 1) || target < 1 || target > n) throw new Error("target must be inside the array");
  return target;
}

/**
 * Comparisons a textbook binary search makes to find `target` in 1..n sorted.
 *
 * Simulated rather than calculated. The count is not ⌈log₂ n⌉ for every
 * element — the middle one is found on the first comparison however big the
 * array is, and that case is the one the misconception never predicts.
 */
export function binaryCost(n, target) {
  if (!(n >= 1) || target < 1 || target > n) throw new Error("target must be inside the array");
  let lo = 1, hi = n, comparisons = 0;
  while (lo <= hi) {
    const mid = Math.floor((lo + hi) / 2);
    comparisons++;
    if (mid === target) return comparisons;
    if (target < mid) hi = mid - 1;
    else lo = mid + 1;
  }
  throw new Error("binary search failed to find an element that is there");
}

/**
 * Memory lines fetched walking a grid by rows and by columns.
 *
 * A deliberately small model: cells are stored row by row, a line holds
 * `lineSize` neighbouring cells of one row, and the cache holds `cacheLines`
 * of them with least-recently-used eviction. That is what every textbook
 * draws and it is NOT a real processor — no prefetching, no associativity, no
 * write buffers. The screen says so, because a primitive implying it measures
 * real hardware would be exactly the lie research/04 commits us against.
 *
 * LRU rather than FIFO is a modelling choice and not a load-bearing one: for
 * these two walks specifically the policies agree on every grid up to 8×12
 * with every line and cache size up to 4 and 8. Checked rather than assumed,
 * and written down here because no test can distinguish them — a reader who
 * changes it should know that the suite will not notice.
 */
export function cacheWalk({ rows, cols, lineSize, cacheLines }) {
  if (!(rows >= 1 && cols >= 1 && lineSize >= 1 && cacheLines >= 1))
    throw new Error("a grid and a cache both need at least one of everything");

  const lineOf = (r, c) => `${r}:${Math.floor(c / lineSize)}`;

  const walk = (order) => {
    const held = [];                      // most recently used last
    let fetched = 0;
    for (const [r, c] of order) {
      const line = lineOf(r, c);
      const at = held.indexOf(line);
      if (at >= 0) { held.splice(at, 1); held.push(line); continue; }
      fetched++;
      held.push(line);
      if (held.length > cacheLines) held.shift();
    }
    return fetched;
  };

  const byRow = [], byCol = [];
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) byRow.push([r, c]);
  for (let c = 0; c < cols; c++) for (let r = 0; r < rows; r++) byCol.push([r, c]);

  return { rowMajor: walk(byRow), colMajor: walk(byCol) };
}
