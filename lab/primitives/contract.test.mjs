// SPDX-License-Identifier: MIT
/**
 * The primitive contract, swept across every control range.
 *
 * The rule this enforces came out of the P-45 spike: **done means
 * classifiable**. A primitive that stops its run before the outcome is
 * determinate produces a scenario nothing can check, which is worse than a
 * wrong one — it is a silent gap in the verification the whole architecture
 * rests on.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { PRIMITIVES, resolveParams } from "./index.mjs";
import { runHeadless } from "../scenario/run.mjs";

/** low, middle and high for each control — the corners are where it breaks */
function sweep(primitive) {
  let combos = [{}];
  for (const c of primitive.controls) {
    const mid = Math.round(((c.min + c.max) / 2) / c.step) * c.step;
    const values = [...new Set([c.min, mid, c.max])];
    combos = combos.flatMap((base) => values.map((v) => ({ ...base, [c.key]: v })));
  }
  return combos;
}

for (const [id, primitive] of Object.entries(PRIMITIVES)) {
  test(`${id}: every finished run is classifiable`, () => {
    const unclassified = [];
    const unfinished = [];
    for (const params of sweep(primitive)) {
      const p = resolveParams(primitive, params);
      const run = runHeadless(primitive, p);
      if (!run.finished) { unfinished.push(params); continue; }
      const outcome = primitive.classify(run.state, p);
      if (outcome === null) unclassified.push(params);
      else assert.ok(primitive.outcomes.includes(outcome),
        `${id} produced "${outcome}", which is not in its outcomes list`);
    }
    assert.deepEqual(unfinished, [], `${id}: runs that never settled`);
    assert.deepEqual(unclassified, [], `${id}: finished runs that could not be classified`);
  });

  test(`${id}: an unfinished run classifies as null rather than guessing`, () => {
    const p = resolveParams(primitive, {});
    const run = runHeadless(primitive, p, { maxSeconds: 0.05 });
    if (!run.finished) assert.equal(primitive.classify(run.state, p), null);
  });
}

for (const [id, primitive] of Object.entries(PRIMITIVES)) {
  test(`${id}: can describe every outcome it can produce`, () => {
    // The authored explanation is written for the scenario's own setup. When a
    // learner changes the setup and something else happens, the primitive has
    // to be able to say what did — or the verdict explains the wrong event.
    for (const o of primitive.outcomes) {
      const text = primitive.outcomeText?.[o];
      assert.ok(typeof text === "string" && text.trim().length > 10,
        `${id}: no outcomeText for "${o}"`);
    }
  });
}
