// SPDX-License-Identifier: AGPL-3.0-or-later
/**
 * The spike tool's two jobs that can be tested without a model: what it sends,
 * and what it accepts back. P-50.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { buildPrompt, extractScenarios } from "./generate-spike.mjs";

test("the prompt carries the contract and not the answers", () => {
  const p = buildPrompt();
  // What a generator legitimately needs.
  for (const primitive of ["circular-release", "contact-collision", "two-pucks", "free-fall"])
    assert.match(p, new RegExp(primitive), `${primitive} is missing from the prompt`);
  assert.match(p, /"key": "friction"/, "the controls are missing");
  assert.match(p, /tangent/, "the declared outcomes are missing");

  // What it must NOT carry: which outcomes are actually reachable. For the two
  // parameter-independent primitives that is the answer key, and it would
  // inflate the number this spike exists to measure.
  assert.doesNotMatch(p, /reachable/i, "the prompt leaks which outcomes can occur");
  // And no source: the model composes against the contract, not our physics.
  assert.doesNotMatch(p, /stepWithFriction|Math\.sqrt|export function/,
    "the prompt leaks implementation");
});

test("a reply is accepted however it is wrapped, and never repaired", () => {
  // A realistic item, because the extractor now recognises scenarios by shape:
  // the thin {"id":"a"} these used to pass is indistinguishable from an option.
  const one = '[{"id":"a","primitive":"two-pucks","question":"q","correct":"same"}]';
  assert.equal(extractScenarios(one).length, 1);
  assert.equal(extractScenarios("```json\n" + one + "\n```").length, 1);
  assert.equal(extractScenarios('{"scenarios":' + one + "}").length, 1);
  assert.equal(extractScenarios("Here you go:\n" + one).length, 1);
  // Shape only. The content is untouched, so the checks see what the model said.
  const wrong = '[{"id":"a","primitive":"two-pucks","question":"q","correct":"nonsense"}]';
  assert.equal(extractScenarios(wrong)[0].correct, "nonsense");
});

test("an unusable reply fails loudly rather than yielding nothing", () => {
  assert.throws(() => extractScenarios("I cannot help with that."));
});

test("the scenario array is found, not merely the first array in the reply", () => {
  // The first real reply wrapped one scenario in an object, and "first array
  // found" returned its `options` — four option objects that looked like four
  // successful scenarios. json_object mode forces an object, so this is the
  // normal shape rather than an edge case.
  const reply = JSON.stringify({
    scenarios: [
      { id: "a", primitive: "two-pucks", question: "q", correct: "same",
        options: [{ id: "same", label: "x" }, { id: "both", label: "y" }] },
      { id: "b", primitive: "free-fall", question: "q", correct: "together",
        options: [{ id: "together", label: "x" }] },
    ],
  });
  const out = extractScenarios(reply);
  assert.equal(out.length, 2, "picked a nested options array instead of the scenarios");
  assert.equal(out[0].primitive, "two-pucks");
});

test("a single unwrapped scenario still counts as one", () => {
  const one = JSON.stringify({ id: "a", primitive: "two-pucks", question: "q", correct: "same" });
  assert.equal(extractScenarios(one).length, 1);
});

test("an options array alone is not mistaken for scenarios", () => {
  assert.throws(() => extractScenarios(JSON.stringify({ options: [{ id: "a", label: "x" }] })));
});

test("scenarios numbered as object keys are found", () => {
  // What qwen2.5 actually returned: json_object mode cannot produce a bare
  // array, so twenty scenarios came back keyed "0".."19" with no array in the
  // reply at all.
  const reply = JSON.stringify(Object.fromEntries(
    [0, 1, 2].map((i) => [String(i), { id: `s${i}`, primitive: "two-pucks", question: "q", correct: "same" }]),
  ));
  assert.equal(extractScenarios(reply).length, 3);
});
