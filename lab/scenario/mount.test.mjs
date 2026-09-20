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
import { errorTagFor } from "./mount.js";

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

// ---- P-63: what the card says about how the answer was established ----

test("our own scenarios record that the outcome was observed", async () => {
  const c = await play(truckFly, "truck");
  assert.equal(c.outcomeSource, "observed");
});

test("a wrapped scenario records that its answer was only asserted", async () => {
  const dom = installDom();
  const { mountScenario } = await import("./mount.js?" + Math.random());
  const notebook = openNotebook({ backend: memoryBackend() });
  const spec = {
    schema: 1, id: "wrapped-example", subject: "physics",
    embed: { src: "embeds/example/index.html", title: "Example simulation",
             attribution: { work: "Example Sim", author: "PhET Interactive Simulations",
                            licence: "CC BY 4.0", url: "https://phet.colorado.edu/" } },
    question: "What happens?", options: [{ id: "a", label: "A" }, { id: "b", label: "B" }],
    correct: "b", errorTags: { a: "outward-in-circles" }, explain: "Because.",
  };
  mountScenario(spec, { notebook });
  dom.body.find((n) => n.id === "opt-a").onclick();
  dom.body.find((n) => n.tagName === "BUTTON" && n.textContent === "Show the answer").onclick();

  const [c] = notebook.cards("physics");
  assert.equal(c.outcomeSource, "asserted", "nothing watched this happen");
  assert.equal(c.observed, "b", "falls back to the authored answer");
  assert.equal(c.correct, false);
  assert.equal(c.errorTag, "outward-in-circles", "a wrong answer still names its misconception");
  dom.restore();
});

/* ── Cues reach the harness keyed by misconception, not by option (ADR 0014) ── */

test("the cue for a wrong choice is the one its misconception carries", () => {
  const spec = {
    schema: 1, primitive: "circular-release",
    params: { radius: 1.2, omega: 2.4 },
    question: "Which way?", explain: "Straight.",
    options: [
      { id: "out", label: "Outward" },
      { id: "tan", label: "Tangent" },
      { id: "curve", label: "Keeps curving" },
    ],
    correct: "tan",
    errorTags: { out: "outward-in-circles", curve: "force-is-stored" },
    cues: {
      "outward-in-circles": "Watch the string at the moment it is cut.",
      "force-is-stored": "What is touching the ball after the cut?",
    },
  };
  const cue = (record) => spec.cues?.[errorTagFor(spec, record)] ?? null;

  const wrong = (choice) => ({ choice, observed: "tan", correct: false, unlisted: false });

  assert.equal(cue(wrong("out")), "Watch the string at the moment it is cut.");
  assert.equal(cue(wrong("curve")), "What is touching the ball after the cut?");
  assert.equal(cue({ choice: "tan", observed: "tan", correct: true, unlisted: false }), null,
    "a right answer is never cued");
  assert.equal(cue({ choice: "out", observed: "nowhere", correct: false, unlisted: true }), null,
    "an outcome nobody predicted means nobody held a misconception about it");
});

/* ── The authored cue reaches the panel, and a retry files its own card ──── */

test("a real scenario shows its authored cue instead of the explanation", async () => {
  const dom = installDom();
  const { mountScenario } = await import("./mount.js?" + Math.random());
  const notebook = openNotebook({ backend: memoryBackend() });

  mountScenario(truckFly, { notebook });
  dom.body.find((n) => n.id === "opt-truck").onclick();   // bigger-pushes-harder
  dom.tick(2000);

  const verdict = dom.body.find((n) => n.className?.split(" ").includes("lab-verdict"));
  const said = [];
  (function walk(n) { if (n.textContent) said.push(n.textContent); n.children?.forEach(walk); })(verdict);
  const shown = said.join(" ");

  assert.match(shown, /Watch the two contact arrows/, "the authored cue must reach the panel");
  assert.ok(!shown.includes(truckFly.explain.slice(0, 40)),
    "the explanation waits until it is asked for");
  dom.restore();
});

test("a retry files a second card that points at the first", async () => {
  const dom = installDom();
  const { mountScenario } = await import("./mount.js?" + Math.random());
  const notebook = openNotebook({ backend: memoryBackend() });

  mountScenario(truckFly, { notebook });
  dom.body.find((n) => n.id === "opt-truck").onclick();
  dom.tick(2000);
  dom.body.find((n) => n.tagName === "BUTTON" && n.textContent === "Predict again").onclick();
  dom.body.find((n) => n.id === "opt-equal").onclick();
  dom.tick(2000);

  const cards = notebook.cards("physics");
  assert.equal(cards.length, 2, "a retry is a second card, never an edit of the first");
  const [first, second] = cards.sort((a, b) => a.attempt - b.attempt);
  assert.equal(first.attempt, 0);
  assert.equal(first.retryOf, null);
  assert.equal(first.choice, "truck");
  assert.equal(first.correct, false);
  assert.equal(second.attempt, 1);
  assert.equal(second.retryOf, 0, "the link back is what makes the pair readable");
  assert.equal(second.choice, "equal");
  assert.equal(second.correct, true);
  dom.restore();
});
