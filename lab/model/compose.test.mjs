// SPDX-License-Identifier: AGPL-3.0-or-later
/**
 * Generation at runtime, with the answer check in front of it. ADR 0023.
 *
 * The model proposes; the simulation decides. Nothing that fails the check is
 * ever handed back, which is the only reason putting this in front of a
 * learner is defensible — research/05 measured a small model at 0 of 7 on the
 * half of the corpus where the answer has to be derived.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { composeFor } from "./compose.mjs";

const SETTINGS = { url: "https://api.example.com/v1/chat/completions", key: "sk-test", model: "m" };

/** A scenario that is true of two-pucks: a big push on a slippery floor runs away. */
const truthful = (id = "gen-1") => ({
  // schema: 1 is in the prompt and the 7B model complied with it. A missing
  // one is the model's failure, not ours to repair — P-50's measurement is
  // worth nothing if the product quietly fixes what the spike counts as wrong.
  schema: 1,
  id, primitive: "two-pucks", concept: "friction-and-inertia", difficulty: "easy",
  subject: "physics", params: { push: 0.9, friction: 0.02, u: 2 },
  question: "One puck is pushed hard on near-frictionless ice. What happens?",
  options: [{ id: "outruns", label: "It runs away from the other" }, { id: "both", label: "Both stop" }],
  correct: "outruns", errorTags: { both: "things-naturally-stop" },
  explain: "With almost no friction the push keeps winning.",
});

/** The same setup, claiming the opposite. Only running it reveals the lie. */
const lying = (id = "gen-2") => ({ ...truthful(id), correct: "both",
  errorTags: { outruns: "things-naturally-stop" } });

const replying = (payload) => async () => JSON.stringify(payload);

test("a scenario that survives the simulation is handed back", async () => {
  const r = await composeFor("friction", { settings: SETTINGS, ask: replying({ scenarios: [truthful()] }) });
  assert.equal(r.ok, true, r.error);
  // Namespaced exactly once, however the model labelled it: a generated id
  // must never be mistakable for a shipped one.
  assert.deepEqual(r.scenarios.map((s) => s.id), ["gen-1"]);
  assert.deepEqual(r.rejected, []);
});

test("a scenario that claims the wrong answer never reaches the learner", async () => {
  // The whole point. The model wrote something plausible and wrong, and only
  // running the simulation could tell.
  const r = await composeFor("friction", { settings: SETTINGS, ask: replying({ scenarios: [lying()] }) });
  assert.deepEqual(r.scenarios, []);
  assert.equal(r.rejected.length, 1);
  assert.ok(r.rejected[0].fail.answer, `expected the answer check to be the refusal: ${JSON.stringify(r.rejected[0].fail)}`);
});

test("the survivors come back and the failures are counted, not hidden", async () => {
  const r = await composeFor("friction", {
    settings: SETTINGS, ask: replying({ scenarios: [truthful("a"), lying("b"), truthful("c")] }),
  });
  assert.deepEqual(r.scenarios.map((s) => s.id), ["gen-a", "gen-c"]);
  assert.equal(r.rejected.length, 1);
  assert.equal(r.asked, 3, "a learner is entitled to know how many it took");
});

test("a scenario naming a primitive we do not have is refused", async () => {
  const bad = { ...truthful(), primitive: "photosynthesis-engine" };
  const r = await composeFor("plants", { settings: SETTINGS, ask: replying({ scenarios: [bad] }) });
  assert.deepEqual(r.scenarios, []);
  assert.ok(r.rejected[0].fail.primitive);
});

test("a model that honestly says it cannot serve the topic is not an error", async () => {
  // The prompt tells it to return nothing rather than stretch a primitive.
  // Doing so is the right answer, and must not read as a failure.
  const r = await composeFor("photosynthesis", { settings: SETTINGS, ask: replying({ scenarios: [] }) });
  assert.equal(r.ok, true);
  assert.deepEqual(r.scenarios, []);
  assert.deepEqual(r.rejected, []);
  assert.equal(r.asked, 0);
});

test("a reply that is not scenarios at all is reported, not thrown", async () => {
  const r = await composeFor("friction", { settings: SETTINGS, ask: async () => "I'd be happy to help!" });
  assert.equal(r.ok, false);
  assert.match(r.error, /could not be read|no scenarios/i);
  assert.deepEqual(r.scenarios, []);
});

test("an endpoint that refuses is reported in words a learner can act on", async () => {
  const r = await composeFor("friction", {
    settings: SETTINGS,
    ask: async () => { const e = new Error("401 Unauthorized from https://api.example.com"); e.status = 401; throw e; },
  });
  assert.equal(r.ok, false);
  assert.match(r.error, /401/);
});

test("generated scenarios are marked as generated, and never collide with shipped ids", async () => {
  const clash = { ...truthful(), id: "truck-and-fly" };
  const r = await composeFor("friction", { settings: SETTINGS, ask: replying({ scenarios: [clash] }) });
  assert.equal(r.scenarios.length, 1);
  assert.notEqual(r.scenarios[0].id, "truck-and-fly", "a generated id must not shadow a shipped scenario");
  assert.equal(r.scenarios[0].generated, true);
});

test("what leaves the device is the topic and the contract, and nothing else", async () => {
  // ADR 0023 §4, asserted against the bytes rather than promised in a comment.
  let sent = null;
  await composeFor("why do things fall", {
    settings: SETTINGS,
    ask: async (prompt) => { sent = prompt; return JSON.stringify({ scenarios: [] }); },
  });
  assert.match(sent, /why do things fall/, "the topic must reach the model or nothing is personalised");
  assert.match(sent, /two-pucks/, "the primitive contract must be there or it cannot compose");
  for (const secret of ["praxis.notebook", "reconciliation", "confusion", "errorTag\":", "localStorage"])
    assert.ok(!sent.includes(secret), `the prompt carries "${secret}", which never leaves the device`);
});
