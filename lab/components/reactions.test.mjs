// SPDX-License-Identifier: MIT
/**
 * The chemistry oracle. Whole particles, exact arithmetic, no tolerance.
 *
 * P-97. The same discipline algebra.mjs holds for maths: the answer check is
 * only worth something if the thing it checks against cannot itself be
 * slightly wrong.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { react, massAfter } from "./reactions.mjs";

test("the reactant that runs out first is the one that limits the reaction", () => {
  // 4 of A and 10 of B, and the recipe needs 1 A to 2 B: A runs out after 4
  // reactions having used 8 B, leaving 2 B behind.
  const r = react({ a: 4, b: 10, needA: 1, needB: 2 });
  assert.equal(r.limiting, "a");
  assert.equal(r.reactions, 4);
  assert.deepEqual([r.leftA, r.leftB], [0, 2]);
});

test("either reactant can be the limiting one", () => {
  assert.equal(react({ a: 10, b: 4, needA: 1, needB: 2 }).limiting, "b");
  assert.equal(react({ a: 2, b: 20, needA: 1, needB: 2 }).limiting, "a");
});

test("exactly enough of both is reachable, and is its own answer", () => {
  // The P-79 defect in another costume: a balanced case that can only be
  // approached is a case no learner ever meets. Whole particles make it real.
  const r = react({ a: 5, b: 10, needA: 1, needB: 2 });
  assert.equal(r.limiting, "neither");
  assert.deepEqual([r.leftA, r.leftB], [0, 0]);
});

test("the limiting one is the one that permits fewer reactions, not the one with less left", () => {
  // 3 A and 5 B at 1 A to 2 B: A is worth 3 reactions, B only 2. B limits,
  // and one of EACH is left over — so reading the leftovers would call this a
  // tie. It is not one, and that is the whole definition.
  const r = react({ a: 3, b: 5, needA: 1, needB: 2 });
  assert.equal(r.limiting, "b");
  assert.equal(r.reactions, 2);
  assert.deepEqual([r.leftA, r.leftB], [1, 1]);
});

test("a tie where both are short is neither, and says so honestly", () => {
  // 3 and 3 at 2 : 2 — one reaction, one of each left, and neither ran out
  // before the other. "Neither" does not have to mean "nothing left over".
  const r = react({ a: 3, b: 3, needA: 2, needB: 2 });
  assert.equal(r.limiting, "neither");
  assert.deepEqual([r.leftA, r.leftB], [1, 1]);
});

test("nothing reacts when one of them is absent", () => {
  const r = react({ a: 0, b: 10, needA: 1, needB: 2 });
  assert.equal(r.reactions, 0);
  assert.equal(r.limiting, "a");
  assert.equal(r.leftB, 10);
});

test("particles are conserved: what went in comes out, as product or leftover", () => {
  // The invariant the whole subject rests on. If this can fail, the primitive
  // teaching conservation of mass is itself not conserving anything.
  for (const a of [0, 1, 3, 7, 12])
    for (const b of [0, 2, 5, 11, 20])
      for (const [needA, needB] of [[1, 1], [1, 2], [2, 3], [3, 1]]) {
        const r = react({ a, b, needA, needB });
        assert.equal(r.leftA + r.reactions * needA, a, `A lost: ${JSON.stringify({ a, b, needA, needB, r })}`);
        assert.equal(r.leftB + r.reactions * needB, b, `B lost: ${JSON.stringify({ a, b, needA, needB, r })}`);
      }
});

test("a recipe that needs none of something is refused rather than dividing by zero", () => {
  assert.throws(() => react({ a: 1, b: 1, needA: 0, needB: 1 }));
});

test("a sealed jar keeps every gram, however much gas is made", () => {
  assert.equal(massAfter({ start: 40, gas: 7, sealed: true }), 40);
  assert.equal(massAfter({ start: 40, gas: 0, sealed: true }), 40);
});

test("an open jar loses exactly the gas that left, and nothing else", () => {
  assert.equal(massAfter({ start: 40, gas: 7, sealed: false }), 33);
});

test("a reaction that makes no gas weighs the same open or shut", () => {
  // The case that makes the question worth asking: it is the GAS leaving that
  // moves the needle, not the reacting.
  assert.equal(massAfter({ start: 40, gas: 0, sealed: false }), 40);
});

test("mass never goes negative, whatever the numbers say", () => {
  assert.equal(massAfter({ start: 3, gas: 10, sealed: false }), 0);
});
