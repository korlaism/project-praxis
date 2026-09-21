// SPDX-License-Identifier: MIT
/**
 * Every item in the bank, held to the same bar as a shipped scenario. P-09.
 *
 * The bank is the thing that will grow fastest and get the least attention per
 * item, so the checks run over all of it rather than over a sample.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
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

test("every misconception tag is one the taxonomy already names", () => {
  // spec/04 says the tags are drawn from the published catalogues and are not
  // our invention. P-77 nearly added "bigger-falls-faster" beside the existing
  // "heavier-falls-faster" — two tags for one belief, which would quietly
  // split the per-learner distributions R-002 is tested on.
  const doc = readFileSync(new URL("../../spec/04-data-model.md", import.meta.url), "utf8");
  const known = new Set([...doc.matchAll(/^\|\s*`([a-z-]+)`\s*\|/gm)].map((m) => m[1]));
  assert.ok(known.size >= 9, "the taxonomy table did not parse");
  for (const spec of BANK)
    for (const tag of new Set(Object.values(spec.errorTags ?? {})))
      assert.ok(known.has(tag), `${spec.id} uses "${tag}", which spec/04-data-model.md does not name`);
});

test("week 2 is covered, now that falling can be simulated", () => {
  assert.ok(BY_WEEK[2]?.length > 0, "week 2 has items");
  for (const spec of BY_WEEK[2]) assert.equal(spec.primitive, "free-fall");
});
