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
