// SPDX-License-Identifier: MIT
/**
 * End to end: a real scenario, mounted, played, and written to the notebook.
 * The harness and the store are each tested alone; this proves they meet.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { installDom } from "../harness/dom-stub.mjs";
import { openNotebook, memoryBackend } from "../notebook/store.mjs";
import truckFly from "../scenarios/truck-and-fly.mjs";
import pucks from "../scenarios/what-keeps-it-moving.mjs";

test("playing a scenario to its reveal writes one card to the right notebook", async () => {
  const dom = installDom();
  const { mountScenario } = await import("./mount.js");
  const notebook = openNotebook({ backend: memoryBackend() });

  mountScenario(truckFly, { notebook });
  dom.body.find((n) => n.id === "opt-truck").onclick();
  dom.tick(2000);                                    // enough frames to reach the reveal

  const cards = notebook.cards("physics");
  assert.equal(cards.length, 1, "exactly one card per reveal");
  const [c] = cards;
  assert.equal(c.scenario, "truck-and-fly");
  assert.equal(c.subject, "physics");
  assert.equal(c.choice, "truck");
  assert.equal(c.observed, "equal", "the card records what actually happened");
  assert.equal(c.correct, false);
  assert.deepEqual(Object.keys(c.params).sort(), ["mf", "mt", "u"]);
  dom.restore();
});

// ---- P-42: which wrong belief, not just wrong ----

async function play(spec, optionId, { params } = {}) {
  const dom = installDom();
  const { mountScenario } = await import("./mount.js?" + Math.random());
  const notebook = openNotebook({ backend: memoryBackend() });
  mountScenario(params ? { ...spec, params: { ...spec.params, ...params } } : spec, { notebook });
  dom.body.find((n) => n.id === `opt-${optionId}`).onclick();
  dom.tick(3000);
  const [c] = notebook.cards(spec.subject);
  dom.restore();
  return c;
}

test("a wrong answer is filed under the misconception that answer comes from", async () => {
  const c = await play(truckFly, "truck");
  assert.equal(c.correct, false);
  assert.equal(c.errorTag, "bigger-pushes-harder");
});

test("a right answer carries no error class", async () => {
  const c = await play(truckFly, "equal");
  assert.equal(c.correct, true);
  assert.equal(c.errorTag ?? null, null);
});

test("when nobody could have been right, no misconception is blamed", async () => {
  // Friction up and a strong push: the outcome is `outruns`, which is none of
  // the options. Filing that under a misconception would pollute R-002.
  const c = await play(pucks, "needs", { params: { push: 2, friction: 0.05 } });
  assert.equal(c.unlisted, true);
  assert.equal(c.errorTag ?? null, null);
});

test("a wrong answer that is the scenario's own 'correct' option is left untagged", async () => {
  // With friction on, "runaway" (the default setup's answer) is wrong — but
  // there is no documented misconception behind choosing it, so none is claimed.
  const c = await play(pucks, "runaway", { params: { push: 0.2, friction: 0.25 } });
  assert.equal(c.correct, false);
  assert.equal(c.errorTag ?? null, null);
});
