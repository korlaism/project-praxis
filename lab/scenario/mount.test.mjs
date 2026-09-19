/**
 * End to end: a real scenario, mounted, played, and written to the notebook.
 * The harness and the store are each tested alone; this proves they meet.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { installDom } from "../harness/dom-stub.mjs";
import { openNotebook, memoryBackend } from "../notebook/store.mjs";
import truckFly from "../scenarios/truck-and-fly.mjs";

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
