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

/* ── R-012: the gap lands on the card it belongs to (P-92) ──────────────── */

test("a note written after the reveal lands on that reveal's card", async () => {
  const dom = installDom();
  const { mountScenario } = await import("./mount.js?" + Math.random());
  const notebook = openNotebook({ backend: memoryBackend() });

  mountScenario(truckFly, { notebook });
  dom.body.find((n) => n.id === "opt-truck").onclick();
  dom.tick(2000);
  // Wrong answer, so a cue stands between the outcome and the box (ADR 0014).
  dom.body.find((n) => n.tagName === "BUTTON" && n.textContent === "Show why").onclick();
  dom.body.find((n) => n.tagName === "TEXTAREA").value =
    "I thought the big one must push harder because of the damage.";
  dom.body.find((n) => n.tagName === "BUTTON" && n.textContent === "Save").onclick();

  const cards = notebook.cards("physics");
  assert.equal(cards.length, 1, "a note is not a second card");
  assert.match(cards[0].reconciliation, /because of the damage/);
  assert.equal(cards[0].choice, "truck", "and it is attached to what they actually said");
  dom.restore();
});

test("a retry's note goes on the retry, not on the first attempt", async () => {
  const dom = installDom();
  const { mountScenario } = await import("./mount.js?" + Math.random());
  const notebook = openNotebook({ backend: memoryBackend() });

  mountScenario(truckFly, { notebook });
  dom.body.find((n) => n.id === "opt-truck").onclick();
  dom.tick(2000);
  dom.body.find((n) => n.tagName === "BUTTON" && n.textContent === "Predict again").onclick();
  dom.body.find((n) => n.id === "opt-equal").onclick();
  dom.tick(2000);
  dom.body.find((n) => n.tagName === "TEXTAREA").value = "The damage is not the same as the push.";
  dom.body.find((n) => n.tagName === "BUTTON" && n.textContent === "Save").onclick();

  const cards = notebook.cards("physics");
  assert.equal(cards.length, 2);
  assert.equal(cards[0].reconciliation, undefined, "the first attempt was never written up");
  assert.match(cards[1].reconciliation, /not the same as the push/);
  assert.equal(cards[1].retryOf, 0, "and the second card still points at the first");
  dom.restore();
});

/* ── R-013: one tap, at any point, into the same notebook (P-93) ────────── */

test("getting stuck before committing logs the item, and reveals nothing", async () => {
  const dom = installDom();
  const { mountScenario } = await import("./mount.js?" + Math.random());
  const notebook = openNotebook({ backend: memoryBackend() });

  const lab = mountScenario(truckFly, { notebook });
  dom.body.find((n) => n.tagName === "BUTTON" && n.textContent === "I'm stuck").onclick();

  const [e] = notebook.confusions();
  assert.equal(e.scenario, "truck-and-fly");
  assert.equal(e.subject, "physics");
  assert.equal(e.card, undefined, "nothing has been revealed, so there is no card to point at");
  assert.equal(e.resolvedAt, null);
  assert.equal(lab.record.observed, null, "asking for help must never disclose the outcome");
  dom.restore();
});

test("getting stuck after a reveal points at the card that was in view", async () => {
  const dom = installDom();
  const { mountScenario } = await import("./mount.js?" + Math.random());
  const notebook = openNotebook({ backend: memoryBackend() });

  mountScenario(truckFly, { notebook });
  dom.body.find((n) => n.id === "opt-truck").onclick();
  dom.tick(2000);
  dom.body.find((n) => n.tagName === "BUTTON" && n.textContent === "I'm stuck").onclick();
  dom.body.find((n) => n.id === "lab-confusion-words").value = "why are they equal?";
  dom.body.find((n) => n.tagName === "BUTTON" && n.textContent === "Add").onclick();

  const [e] = notebook.confusions();
  assert.equal(e.card, notebook.cards("physics")[0].id, "the entry does not know what was on screen");
  assert.equal(e.text, "why are they equal?");
  dom.restore();
});

test("a confusion left open is waiting when the learner comes back", async () => {
  const dom = installDom();
  const { mountScenario } = await import("./mount.js?" + Math.random());
  const backend = memoryBackend();

  const first = mountScenario(truckFly, { notebook: openNotebook({ backend }) });
  dom.body.find((n) => n.tagName === "BUTTON" && n.textContent === "I'm stuck").onclick();
  first.destroy();

  mountScenario(truckFly, { notebook: openNotebook({ backend }) });
  const stuck = dom.body.find((n) => n.tagName === "BUTTON" && n.textContent === "I'm stuck");
  const sorted = dom.body.find((n) => n.tagName === "BUTTON" && n.textContent === "Sorted it");
  assert.equal(stuck.hidden, true, "it would log a second entry for the same open confusion");
  assert.equal(sorted.hidden, false, "no way to close the one already there");

  sorted.onclick();
  const entries = openNotebook({ backend }).confusions();
  assert.equal(entries.length, 1, "coming back must not duplicate the entry");
  assert.ok(entries[0].resolvedAt, "and settling it must stick");
  dom.restore();
});

/* ── P-95: a prediction knows which session it was made in ──────────────── */

test("a scenario opened inside a session files its card against that session", async () => {
  const dom = installDom();
  const { mountScenario } = await import("./mount.js?" + Math.random());
  const notebook = openNotebook({ backend: memoryBackend() });

  mountScenario(truckFly, { notebook, session: "sess-7" });
  dom.body.find((n) => n.id === "opt-truck").onclick();
  dom.tick(2000);
  assert.equal(notebook.cards("physics")[0].session, "sess-7");
  dom.restore();
});

test("a scenario opened outside a session carries no session at all", async () => {
  // Not an empty string, not null — absent. The field means "made in a
  // session", and a card that was not has nothing to say about it.
  const dom = installDom();
  const { mountScenario } = await import("./mount.js?" + Math.random());
  const notebook = openNotebook({ backend: memoryBackend() });

  mountScenario(truckFly, { notebook });
  dom.body.find((n) => n.id === "opt-truck").onclick();
  dom.tick(2000);
  assert.equal("session" in notebook.cards("physics")[0], false);
  dom.restore();
});

/* ── P-63: a wrapped scenario, and what it cannot check ──────────────────
 *
 * ADR 0009 added a second scenario kind whose stage is someone else's
 * simulation. Its premise turned out to be false — ADR 0012 supersedes it and
 * no PhET simulation ships — so nothing in the bank is wrapped, and the whole
 * path went a month of heavy refactoring without a test that mounts one.
 *
 * It is the one kind of scenario the answer check cannot touch. If it is kept
 * at all, the properties that make it honest have to be asserted, not assumed.
 */

const WRAPPED = {
  schema: 1, id: "wrapped-probe", subject: "physics", concept: "falling", difficulty: "easy",
  embed: { src: "embeds/example/index.html", title: "An example",
           attribution: { work: "Example", author: "Someone", licence: "CC BY 4.0" } },
  question: "Which lands first?",
  options: [{ id: "together", label: "Together" }, { id: "heavier", label: "The heavy one" }],
  correct: "together",
  errorTags: { heavier: "heavier-falls-faster" },
  cues: { "heavier-falls-faster": "Watch both of them all the way down, not just the finish." },
  explain: "They land together.",
};

async function wrapped(opts = {}) {
  const dom = installDom();
  const { mountScenario } = await import("./mount.js?" + Math.random());
  const notebook = openNotebook({ backend: memoryBackend() });
  const lab = mountScenario(WRAPPED, { notebook, ...opts });
  return { dom, lab, notebook,
           frame: () => dom.body.find((n) => n.tagName === "IFRAME"),
           button: (t) => dom.body.find((n) => n.tagName === "BUTTON" && n.textContent === t) };
}

test("a wrapped scenario does not load the simulation until something is committed", async () => {
  // R-010 at its strictest, and the reason it is not merely hidden: before a
  // commit the other simulation does not exist on the page at all.
  const w = await wrapped();
  assert.equal(w.frame(), null, "someone else's simulation loaded before the learner committed");
  w.dom.body.find((n) => n.id === "opt-heavier").onclick();
  assert.ok(w.frame(), "it never loaded after the commit either");
  w.dom.restore();
});

test("asking again does not leave two simulations on the page", async () => {
  // The embed is removed on reset and recreated on the next commit. If the
  // removal stopped happening, a learner would end up watching two copies.
  const w = await wrapped();
  const frames = () => w.dom.body.findAll((n) => n.tagName === "IFRAME");
  w.dom.body.find((n) => n.id === "opt-heavier").onclick();
  assert.equal(frames().length, 1);
  w.button("Ask again").onclick();
  assert.equal(frames().length, 0, "the simulation outlived the question it answered");
  w.dom.body.find((n) => n.id === "opt-together").onclick();
  assert.equal(frames().length, 1, "a second copy was left behind");
  w.dom.restore();
});

test("a wrapped card says its answer was asserted, not observed", async () => {
  // The distinction R-002 analysis needs: nothing watched this one, so the
  // answer is the author's word. A card that claimed otherwise would put
  // unverifiable evidence in the same column as verified evidence.
  const w = await wrapped({ session: "s1" });
  w.dom.body.find((n) => n.id === "opt-heavier").onclick();
  w.button("Show the answer").onclick();
  const [card] = w.notebook.cards("physics");
  assert.equal(card.outcomeSource, "asserted");
  assert.equal(card.observed, "together", "it falls back to the authored answer");
  assert.equal(card.session, "s1");
  w.dom.restore();
});

test("a wrapped scenario credits whose work it is", async () => {
  // ADR 0009's compensating rule, and the licence's requirement. The answer
  // check cannot run here, so attribution is the only thing holding it honest.
  const w = await wrapped();
  const text = [];
  (function walk(n) { if (n.textContent) text.push(n.textContent); n.children?.forEach(walk); })(w.dom.body);
  const said = text.join(" ");
  assert.match(said, /Example/);
  assert.match(said, /Someone/);
  assert.match(said, /CC BY 4\.0/);
  w.dom.restore();
});

test("a wrapped scenario still cues a wrong answer", async () => {
  // ADR 0014 does not depend on owning the simulation.
  const w = await wrapped();
  w.dom.body.find((n) => n.id === "opt-heavier").onclick();
  w.button("Show the answer").onclick();
  const text = [];
  (function walk(n) { if (n.textContent) text.push(n.textContent); n.children?.forEach(walk); })(w.dom.body);
  assert.match(text.join(" "), /all the way down/);
  w.dom.restore();
});

test("a wrapped scenario can be kept, like any other", async () => {
  // It has no parameters, so the snapshot is the question itself — which is
  // still a thing a learner may want to come back to.
  const { openSnapshots } = await import("../notebook/snapshots.mjs");
  const snapshots = openSnapshots({ backend: memoryBackend() });
  const w = await wrapped({ snapshots, session: "s1" });
  assert.ok(w.button("Keep this"), "a wrapped scenario cannot be kept");
  w.button("Keep this").onclick();
  const [kept] = snapshots.list();
  assert.equal(kept.spec.id, "wrapped-probe");
  assert.ok(kept.spec.embed, "the snapshot forgot it was a wrapped scenario");
  w.dom.restore();
});
