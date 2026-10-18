// SPDX-License-Identifier: MIT
/**
 * The chemistry oracle — whole particles, exact arithmetic, no tolerance.
 *
 * P-97. What `algebra.mjs` is to the maths primitives: the thing the answer
 * check compares against, kept small enough to be obviously right.
 *
 * Counts are integers on purpose. A recipe that needs 1 of A to 2 of B has a
 * case where both run out together, and it has to be a case a learner can
 * actually dial rather than a limit they can only approach — which is the
 * defect P-79 found in a float-stepped control and the reason the maths
 * primitives use whole-number coefficients.
 */

/**
 * React a of one thing with b of another, needing needA : needB each time.
 *
 * @returns {{reactions:number, limiting:"a"|"b"|"neither", leftA:number, leftB:number}}
 */
export function react({ a, b, needA, needB }) {
  if (!(needA > 0) || !(needB > 0))
    throw new Error("a recipe must need at least one of each reactant");

  const possibleFromA = Math.floor(a / needA);
  const possibleFromB = Math.floor(b / needB);
  const reactions = Math.min(possibleFromA, possibleFromB);
  const leftA = a - reactions * needA;
  const leftB = b - reactions * needB;

  // The limiting reactant is the one that permits FEWER reactions — which is
  // not the same as the one with less left over, and the difference is not
  // academic. 3 A and 5 B at 1:2 leaves one of each, and reading the
  // leftovers would call that a tie when B plainly ran the reaction out.
  const limiting = possibleFromA < possibleFromB ? "a"
    : possibleFromB < possibleFromA ? "b"
    : "neither";
  return { reactions, limiting, leftA, leftB };
}

/**
 * What the jar weighs afterwards.
 *
 * Nothing is destroyed here and nothing is created: the only way the number
 * moves is gas physically leaving an open jar. That is the whole content of
 * the misconception this is built to bait.
 */
export function massAfter({ start, gas, sealed }) {
  if (sealed) return start;
  return Math.max(0, start - gas);
}
