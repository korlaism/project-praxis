// SPDX-License-Identifier: MIT
/**
 * Every item in the bank, held to the same bar as a shipped scenario. P-09.
 *
 * The bank is the thing that will grow fastest and get the least attention per
 * item, so the checks run over all of it rather than over a sample.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { validateScenario } from "./schema.mjs";
import { checkAnswer } from "./run.mjs";
import { getPrimitive, resolveParams } from "../primitives/index.mjs";
import BANK, { BY_WEEK } from "../scenarios/bank/index.mjs";

test("every item validates against the schema", () => {
  for (const spec of BANK) {
    const v = validateScenario(spec);
    assert.deepEqual(v.errors, [], `${spec.id}: ${v.errors.join("; ")}`);
  }
});

test("every item's answer is what the simulation actually does", () => {
  // The one guarantee a borrowed instrument cannot give us (ADR 0011).
  for (const spec of BANK) {
    const p = getPrimitive(spec.primitive);
    const r = checkAnswer(spec, p, resolveParams(p, spec.params));
    assert.equal(r.ok, true,
      `${spec.id}: claims "${spec.correct}", simulation produced "${r.observed}"`);
  }
});

test("every item is tagged with concept and difficulty", () => {
  // R-023. Without these the clustering R-002 is tested on cannot be done.
  for (const spec of BANK) {
    assert.ok(spec.concept, `${spec.id} has no concept tag`);
    assert.ok(spec.difficulty, `${spec.id} has no difficulty tag`);
  }
});

test("every wrong option is tagged, and every tag is cued", () => {
  for (const spec of BANK) {
    const wrong = spec.options.map((o) => o.id).filter((id) => id !== spec.correct);
    for (const id of wrong)
      assert.ok(spec.errorTags?.[id], `${spec.id}: option "${id}" is wrong but names no misconception`);
    for (const tag of new Set(Object.values(spec.errorTags)))
      assert.ok(spec.cues?.[tag], `${spec.id}: tags "${tag}" but offers no cue for it`);
  }
});

test("item ids are unique across the whole bank", () => {
  const ids = BANK.map((s) => s.id);
  assert.equal(new Set(ids).size, ids.length, "duplicate item id");
});

test("no item claims to cover week 2", () => {
  // Falling has no primitive yet (P-77). An item claiming that concept would
  // be one nobody can run, which is worse than an acknowledged gap.
  assert.equal(BY_WEEK[2], undefined, "week 2 has a primitive now — delete this test");
  for (const spec of BANK)
    assert.notEqual(spec.concept, "falling", `${spec.id} claims falling, which cannot be simulated yet`);
});
