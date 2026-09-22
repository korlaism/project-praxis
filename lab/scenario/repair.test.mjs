// SPDX-License-Identifier: MIT
/**
 * The generate-validate-repair loop. P-51.
 *
 * The spike's practical finding was that one mechanical pass took 65% to 95%,
 * because a validation error usually names its own fix. The danger is equally
 * clear: a repair that makes a wrong item look right is worse than a rejected
 * one, because nothing downstream will ever question it again.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { autoRepair, repairLoop } from "./repair.mjs";

const base = () => ({
  schema: 1,
  id: "candidate",
  concept: "motion-without-force",
  difficulty: "medium",
  subject: "physics",
  primitive: "two-pucks",
  params: { push: 0, friction: 0, u: 5 },
  question: "Two pucks, nothing pushing either. What happens?",
  explain: "Nothing changes, because nothing is acting on them.",
  options: [
    { id: "same",    label: "Both keep their speed" },
    { id: "both",    label: "Both slow down" },
    { id: "runaway", label: "One speeds up" },
  ],
  correct: "same",
  errorTags: { both: "things-naturally-stop", runaway: "sign-or-direction" },
});

test("a tag on the correct answer is dropped, because it means nothing there", () => {
  const spec = { ...base(), errorTags: { same: "motion-implies-force", both: "things-naturally-stop" } };
  const out = repairLoop(spec);
  assert.equal(out.ok, true);
  assert.equal(out.spec.errorTags.same, undefined);
  assert.equal(out.spec.errorTags.both, "things-naturally-stop", "the other tags survive");
  assert.match(out.changes.join(" "), /errorTags/);
});

test("a wrong answer is corrected to what the simulation did", () => {
  // The simulation is the oracle. A claim that disagrees with it is the claim
  // that is wrong, not the run.
  const spec = { ...base(), correct: "both" };
  const out = repairLoop(spec);
  assert.equal(out.ok, true);
  assert.equal(out.spec.correct, "same");
  assert.match(out.changes.join(" "), /correct/);
});

test("correcting the answer also clears the tag that lands on it", () => {
  // Two repairs, and the second only becomes visible after the first: this is
  // why it is a loop and not a pass.
  const spec = {
    ...base(),
    correct: "both",
    errorTags: { same: "motion-implies-force", runaway: "sign-or-direction" },
  };
  const out = repairLoop(spec);
  assert.equal(out.ok, true);
  assert.equal(out.spec.correct, "same");
  assert.equal(out.spec.errorTags.same, undefined);
  assert.ok(out.attempts >= 2, `expected more than one attempt, took ${out.attempts}`);
});

test("an outcome nobody offered is refused, not invented", () => {
  // Adding the missing option would be writing content, and a distractor
  // written by a repair pass is one nobody chose the wording of.
  const spec = { ...base(), options: base().options.filter((o) => o.id !== "same"), correct: "both" };
  const out = repairLoop(spec);
  assert.equal(out.ok, false);
  assert.match(JSON.stringify(out.fail), /unlisted|answer/);
});

test("missing prose is refused — a repair never writes for the author", () => {
  for (const missing of ["question", "explain"]) {
    const spec = { ...base() };
    delete spec[missing];
    const out = repairLoop(spec);
    assert.equal(out.ok, false, `${missing} was somehow repaired`);
  }
});

test("a cue for a tag no option carries is dropped", () => {
  const spec = { ...base(), cues: { "things-naturally-stop": "Watch the gaps.", "force-is-stored": "Orphan." } };
  const out = repairLoop(spec);
  assert.equal(out.ok, true);
  assert.equal(out.spec.cues["force-is-stored"], undefined);
  assert.equal(out.spec.cues["things-naturally-stop"], "Watch the gaps.");
});

test("an unknown primitive is refused — there is nothing to repair towards", () => {
  const out = repairLoop({ ...base(), primitive: "teleportation" });
  assert.equal(out.ok, false);
});

test("the loop stops, and says how many attempts it took", () => {
  const clean = repairLoop(base());
  assert.equal(clean.ok, true);
  assert.equal(clean.attempts, 1, "a valid candidate costs one pass and no repairs");
  assert.deepEqual(clean.changes, []);
});

test("it never loops forever on something it cannot fix", () => {
  const out = repairLoop({ ...base(), primitive: "teleportation" }, { maxAttempts: 5 });
  assert.ok(out.attempts <= 5, `ran ${out.attempts} attempts`);
  assert.equal(out.ok, false);
});

test("the original is never mutated", () => {
  const spec = { ...base(), correct: "both" };
  const snapshot = JSON.stringify(spec);
  repairLoop(spec);
  assert.equal(JSON.stringify(spec), snapshot, "a repair must hand back a new spec");
});

test("autoRepair returns null when it has nothing honest to offer", () => {
  const spec = { ...base(), primitive: "teleportation" };
  assert.equal(autoRepair(spec, { fail: { primitive: "unknown" } }), null);
});
