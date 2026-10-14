// SPDX-License-Identifier: MIT
/**
 * Exact answers for the maths primitives.
 *
 * Physics needs an integrator and then a closed-form oracle to check it
 * against. Maths does not: the answer *is* the closed form, computed once.
 * That makes the answer check cheaper and exact here, which is the main reason
 * maths is a better second subject than chemistry (see spec/08).
 *
 * Everything below compares exactly rather than within a tolerance, and the
 * controls are stepped in halves and whole numbers so that equality is
 * reliable in binary. `two-pucks` taught this lesson the hard way: a tolerance
 * wide enough to catch a near-miss will call a near-miss a tie, and then the
 * verdict says something the screen contradicts.
 */

/** Where two lines y = m·x + c meet, if they do. */
export function intersect(m1, c1, m2, c2) {
  if (m1 !== m2) {
    const x = (c2 - c1) / (m1 - m2);
    return { kind: "one-point", at: { x, y: m1 * x + c1 } };
  }
  return c1 === c2 ? { kind: "same-line", at: null } : { kind: "parallel", at: null };
}

/** Real roots of a·x² + b·x + c, by the discriminant. */
export function realRoots(a, b, c) {
  if (a === 0) throw new Error("a = 0 is not a quadratic");
  const d = b * b - 4 * a * c;
  if (d < 0) return { kind: "none", values: [] };
  if (d === 0) return { kind: "one", values: [-b / (2 * a)] };
  const r = Math.sqrt(d);
  return { kind: "two", values: [(-b - r) / (2 * a), (-b + r) / (2 * a)].sort((x, y) => x - y) };
}
