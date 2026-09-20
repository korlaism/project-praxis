// SPDX-License-Identifier: MIT
import { test } from "node:test";
import assert from "node:assert/strict";
import { createGate, CONFIDENCE } from "./gate.mjs";

const opts = () => ({
  options: [
    { id: "out", label: "Straight outward" },
    { id: "tan", label: "Along the tangent" },
    { id: "curve", label: "It keeps curving" },
  ],
  correct: "tan",
});

test("starts awaiting, and the simulation cannot run", () => {
  const g = createGate(opts());
  assert.equal(g.state, "awaiting");
  assert.equal(g.canRun, false);
  assert.equal(g.choice, null);
});

test("the answer is not readable before a reveal", () => {
  const g = createGate(opts());
  assert.equal(g.isCorrect, null);
  g.commit("out");
  assert.equal(g.isCorrect, null, "committing must not disclose the verdict");
});

test("committing unlocks the simulation", () => {
  const g = createGate(opts());
  g.commit("out");
  assert.equal(g.state, "committed");
  assert.equal(g.canRun, true);
  assert.equal(g.choice, "out");
});

test("an unknown option is refused", () => {
  const g = createGate(opts());
  assert.throws(() => g.commit("nonsense"), /unknown option/i);
  assert.equal(g.state, "awaiting");
});

test("a commit is final until reset", () => {
  const g = createGate(opts());
  g.commit("out");
  assert.throws(() => g.commit("tan"), /already committed/i);
  assert.equal(g.choice, "out", "the first answer is the one that counts");
});

test("revealing before committing is refused", () => {
  const g = createGate(opts());
  assert.throws(() => g.reveal(), /not committed/i);
});

test("revealing scores the commit", () => {
  const g = createGate(opts());
  g.commit("tan");
  g.reveal();
  assert.equal(g.state, "revealed");
  assert.equal(g.isCorrect, true);

  const h = createGate(opts());
  h.commit("out");
  h.reveal();
  assert.equal(h.isCorrect, false);
});

test("confidence is optional, and validated when given", () => {
  const g = createGate(opts());
  g.commit("out", "fairly-sure");
  assert.equal(g.confidence, "fairly-sure");
  assert.ok(CONFIDENCE.includes("guessing"));

  const h = createGate(opts());
  assert.throws(() => h.commit("out", "quite-sure-ish"), /confidence/i);
});

test("the record carries what was believed and when", () => {
  const g = createGate(opts());
  g.commit("out", "certain");
  g.reveal();
  const r = g.record;
  assert.equal(r.choice, "out");
  assert.equal(r.confidence, "certain");
  assert.equal(r.correct, false);
  assert.ok(r.committedAt <= r.revealedAt);
});

test("reset returns it to awaiting and relocks the simulation", () => {
  const g = createGate(opts());
  g.commit("out");
  g.reveal();
  g.reset();
  assert.equal(g.state, "awaiting");
  assert.equal(g.canRun, false);
  assert.equal(g.choice, null);
  assert.equal(g.isCorrect, null);
});

test("a gate whose correct answer is not an option is a broken gate", () => {
  assert.throws(
    () => createGate({
      options: [{ id: "a", label: "A" }, { id: "b", label: "B" }],
      correct: "c",
    }),
    /correct/i,
  );
});

test("a gate needs at least two options", () => {
  assert.throws(
    () => createGate({ options: [{ id: "a", label: "A" }], correct: "a" }),
    /two/i,
  );
});

// ---- P-52: score against what happened, not against a stored answer ----

test("reveal scores against the observed outcome, not the configured answer", () => {
  // The configured answer describes the default setup. If the learner changed
  // the setup, what happened may differ — and the verdict must follow reality.
  const g = createGate(opts());           // configured correct: "tan"
  g.commit("out");
  g.reveal("out");                        // the simulation actually produced "out"
  assert.equal(g.isCorrect, true);
  assert.equal(g.record.observed, "out");
});

test("reveal with no observation falls back to the configured answer", () => {
  const g = createGate(opts());
  g.commit("tan");
  g.reveal();
  assert.equal(g.isCorrect, true);
  assert.equal(g.record.observed, "tan");
});

test("an outcome that is none of the options is flagged, and nobody was right", () => {
  const g = createGate(opts());
  g.commit("tan");
  g.reveal("somewhere-else");
  assert.equal(g.isCorrect, false);
  assert.equal(g.record.unlisted, true);
});

test("a listed outcome is not flagged as unlisted", () => {
  const g = createGate(opts());
  g.commit("tan");
  g.reveal("curve");
  assert.equal(g.record.unlisted, false);
  assert.equal(g.isCorrect, false);
});

/* ── Retries never overwrite the original commitment ──────────────────────
 *
 * P-72, written before the feature exists. ADR 0014 lets a learner predict
 * again after a cue. The only way that does real damage is if the second
 * prediction can replace the first: R-010 would then be measuring post-hoc
 * confidence, every Brier score in the dataset would be flattering and wrong,
 * and K-03 would have fired without anyone noticing.
 *
 * So the gate is append-only. Attempts accumulate; nothing is ever edited.
 */

test("a retry leaves the original commitment exactly as it was", () => {
  const gate = createGate({ ...opts(), correct: "tan" });
  gate.commit("out", "certain").reveal("tan");
  const before = { ...gate.record };

  gate.retry();
  gate.commit("tan", "guessing").reveal("tan");

  const original = gate.attempts[0];
  assert.equal(original.choice, "out");
  assert.equal(original.confidence, "certain");
  assert.equal(original.committedAt, before.committedAt);
  assert.equal(original.revealedAt, before.revealedAt);
  assert.equal(original.correct, false);
});

test("an archived attempt cannot be mutated, not merely should not be", () => {
  const gate = createGate({ ...opts(), correct: "tan" });
  gate.commit("out", "certain").reveal("tan");
  gate.retry();

  const original = gate.attempts[0];
  assert.throws(() => { "use strict"; original.choice = "tan"; }, TypeError);
  assert.equal(gate.attempts[0].choice, "out");
});

test("the retry is a separate record that links back to the original", () => {
  const gate = createGate({ ...opts(), correct: "tan" });
  gate.commit("out", "certain").reveal("tan");
  gate.retry();
  gate.commit("tan", "leaning").reveal("tan");

  assert.equal(gate.attempts[0].attempt, 0);
  assert.equal(gate.attempts[0].retryOf, null);
  assert.equal(gate.record.attempt, 1);
  assert.equal(gate.record.retryOf, 0);
  assert.equal(gate.record.choice, "tan");
  assert.equal(gate.record.correct, true);
});

test("committing again without retrying is still refused", () => {
  const gate = createGate({ ...opts(), correct: "tan" });
  gate.commit("out", "certain").reveal("tan");
  assert.throws(() => gate.commit("tan", "certain"), /already committed/);
});

test("a retry is only possible once something has been revealed", () => {
  const gate = createGate({ ...opts(), correct: "tan" });
  assert.throws(() => gate.retry(), /nothing to retry/);
  gate.commit("out", "certain");
  assert.throws(() => gate.retry(), /nothing to retry/);
});

test("the simulation locks again until the retry is committed", () => {
  const gate = createGate({ ...opts(), correct: "tan" });
  gate.commit("out", "certain").reveal("tan");
  assert.equal(gate.canRun, true);
  gate.retry();
  assert.equal(gate.canRun, false, "a retry that can be watched before it is committed is not a gate");
  assert.equal(gate.isCorrect, null, "the verdict must not survive into the next attempt");
});

test("reset after a retry does not resurrect the first attempt as editable", () => {
  const gate = createGate({ ...opts(), correct: "tan" });
  gate.commit("out", "certain").reveal("tan");
  gate.retry();
  gate.commit("tan", "leaning").reveal("tan");
  gate.reset();

  assert.equal(gate.attempts.length, 2, "reset must archive, not discard");
  assert.equal(gate.attempts[0].choice, "out");
  assert.equal(gate.attempts[1].choice, "tan");
  assert.equal(gate.record.choice, null, "a fresh attempt, not an editable old one");
  assert.equal(gate.record.attempt, 2);
  assert.equal(gate.record.retryOf, null, "reset starts a new line, it is not a retry");
});

test("reset on an untouched gate archives nothing", () => {
  const gate = createGate({ ...opts(), correct: "tan" });
  gate.reset().reset();
  assert.deepEqual(gate.attempts, [], "param changes call reset constantly — they must not fill the record with blanks");
});
