// SPDX-License-Identifier: MIT
import { test } from "node:test";
import assert from "node:assert/strict";
import { runHeadless as run79 } from "../scenario/run.mjs";
import * as pucks79 from "./two-pucks.mjs";
import { resolveParams as resolve79 } from "./index.mjs";

/* ── The balanced case (P-79) ─────────────────────────────────────────────
 *
 * `needs` — the pushed puck holding its speed while the other slows — is the
 * one setting where "a force keeps it moving" is visibly TRUE, which is
 * exactly why the misconception is so convincing.
 *
 * P-79 recorded it as an outcome no setting could produce. That was wrong, and
 * wrong in a way worth keeping: the search behind it covered the slider GRID
 * (push in steps of 0.1, friction in steps of 0.01), where no pair satisfies
 * push = mu·m·g — and then generalised from the grid to the primitive. A
 * scenario's params are not restricted to the slider steps, so an authored
 * item can sit exactly on the balance.
 *
 * These tests hold both halves: it is reachable exactly, and a hair off it is
 * not. The second matters more. Widening the tolerance so near-balance counts
 * as balance would have the verdict say the speed held while the readout on
 * screen shows it changing, which is what R-021 forbids.
 */

const G79 = 9.81, MASS79 = 0.5;
const outcomeOf = (params) => {
  const p = resolve79(pucks79, params);
  const r = run79(pucks79, p);
  return r.finished ? pucks79.classify(r.state, p) : "unfinished";
};

test("an exactly balanced push holds the pushed puck's speed", () => {
  for (const mu of [0.05, 0.1, 0.2, 0.3]) {
    const balancing = mu * MASS79 * G79;
    assert.equal(outcomeOf({ push: balancing, friction: mu, u: 4 }), "needs",
      `friction ${mu} with a push of ${balancing.toFixed(4)} N`);
  }
});

test("a hair off the balance is not the balance", () => {
  const mu = 0.1, balancing = mu * MASS79 * G79;
  assert.equal(outcomeOf({ push: balancing + 0.001, friction: mu, u: 4 }), "outruns");
  assert.equal(outcomeOf({ push: balancing - 0.001, friction: mu, u: 4 }), "both");
});

test("no slider setting reaches the balance, which is the part that was true", () => {
  // Push moves in 0.1, friction in 0.01. Anything a learner can dial is a
  // near-miss, and a near-miss must not be reported as a tie.
  for (let k = 1; k <= 20; k++) {
    for (let j = 1; j <= 30; j++) {
      const push = Math.round(k * 0.1 * 1e6) / 1e6;
      const mu = Math.round(j * 0.01 * 1e6) / 1e6;
      if (Math.abs(push - mu * MASS79 * G79) < 1e-9)
        assert.fail(`the grid does reach balance at push ${push}, friction ${mu} — update P-79's note`);
    }
  }
});
