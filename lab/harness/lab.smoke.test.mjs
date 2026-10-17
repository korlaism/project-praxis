// SPDX-License-Identifier: MIT
/**
 * Harness smoke tests.
 *
 * The gate tests passed while the harness was completely dead — a black canvas
 * and a page that never sized its own drawing surface. The bug was in mount
 * ORDERING, not in gate logic, so nothing covered it. These do.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { installDom } from "./dom-stub.mjs";

/** Mount the harness against the stub and hand back everything a test needs. */
async function mount(overrides = {}) {
  const dom = installDom();
  const { mountLab } = await import("./lab.js");

  const seen = { setup: 0, draws: [], steps: 0 };
  const lab = mountLab({
    question: "Does it?",
    options: [{ id: "yes", label: "Yes" }, { id: "no", label: "No" }],
    correct: "yes",
    explain: "Because.",
    params: [{ key: "k", label: "k", min: 0, max: 10, step: 1, value: 3 }],
    setup() { seen.setup++; return { moved: 0 }; },
    step(s, dt) { seen.steps++; s.moved += dt; },
    draw(ctx, s, p, view) { seen.draws.push({ state: s, view, params: p }); },
    ...overrides,
  });

  const el = (cls) => dom.body.find((n) => n.className?.split(" ").includes(cls));
  const text = () => {
    const out = [];
    const walk = (n) => { if (n.textContent) out.push(n.textContent); n.children?.forEach(walk); };
    walk(dom.body);
    return out.join(" | ");
  };
  return { dom, lab, seen, el, text,
           button: (label) => dom.body.find((n) => n.tagName === "BUTTON" && n.textContent === label),
           clock: () => el("lab-clock")?.textContent };
}

test("mounting does not throw, and draws with state already defined", async () => {
  // The exact shape of the black-canvas bug: render ran before setup assigned
  // state, draw got undefined, and the throw escaped mountLab entirely.
  const { seen, dom } = await mount();
  assert.equal(seen.setup, 1);
  assert.ok(seen.draws.length > 0, "it must have drawn at least once on mount");
  for (const d of seen.draws) assert.ok(d.state !== undefined, "draw saw undefined state");
  dom.restore();
});

test("the canvas is given a real size on mount", async () => {
  // If mountLab throws, resize() never runs and the canvas stays 0x0 forever.
  const { dom } = await mount();
  const canvas = dom.body.find((n) => n.tagName === "CANVAS");
  assert.ok(canvas.width > 0 && canvas.height > 0, `canvas is ${canvas.width}x${canvas.height}`);
  dom.restore();
});

test("the view handed to draw matches the canvas, not zero", async () => {
  const { seen, dom } = await mount();
  const last = seen.draws.at(-1);
  assert.ok(last.view.w > 0 && last.view.h > 0, `view is ${last.view.w}x${last.view.h}`);
  dom.restore();
});

test("nothing steps before a commit, however many frames pass", async () => {
  const { seen, dom } = await mount();
  dom.tick(30);
  assert.equal(seen.steps, 0, "the simulation must stay locked until committed");
  dom.restore();
});

test("committing unlocks stepping and advances the clock", async () => {
  const { seen, dom, el, clock } = await mount();
  assert.equal(el("lab-gate").hidden, false);
  dom.body.find((n) => n.id === "opt-yes").onclick();
  assert.equal(el("lab-gate").hidden, true, "the gate panel hides once committed");

  dom.tick(10);
  assert.ok(seen.steps > 0, "stepping must start after a commit");
  assert.ok(seen.draws.at(-1).state.moved > 0, "state must actually be advancing");
  assert.notEqual(clock(), "t = 0.00s");
  dom.restore();
});

test("reveal shows the verdict and scores the commit", async () => {
  const { dom, lab, el } = await mount();
  dom.body.find((n) => n.id === "opt-no").onclick();
  dom.tick(2);
  assert.equal(el("lab-verdict").hidden, true, "no verdict before reveal");

  lab.reveal();
  assert.equal(el("lab-verdict").hidden, false);
  assert.equal(lab.record.correct, false);
  assert.equal(lab.record.choice, "no");
  dom.restore();
});

test("a topic whose draw throws does not take the harness down", async () => {
  // Before this was contained, one bad draw killed the transport, the gate
  // and every future resize along with it.
  let calls = 0;
  const { dom, seen } = await mount({
    draw() { calls++; throw new Error("topic is broken"); },
  });
  const before = calls;
  assert.ok(before > 0, "it still attempted to draw");

  dom.body.find((n) => n.id === "opt-yes").onclick();
  dom.tick(5);
  assert.ok(calls > before, "rendering must continue after a draw failure");
  assert.ok(seen.steps > 0, "stepping must continue after a draw failure");
  dom.restore();
});

test("topic actions are wired, and gated on the commit", async () => {
  let fired = 0;
  const { dom, button } = await mount({
    actions: [{ label: "Do it", onClick: () => fired++ }],
  });
  const b = button("Do it");
  assert.ok(b, "the action button should exist");
  assert.equal(b.disabled, true, "actions stay locked until committed");

  dom.body.find((n) => n.id === "opt-yes").onclick();
  assert.equal(button("Do it").disabled, false);
  button("Do it").onclick();
  assert.equal(fired, 1);
  dom.restore();
});

test("a param slider re-runs setup rather than corrupting live state", async () => {
  const { dom, seen } = await mount();
  dom.body.find((n) => n.id === "opt-yes").onclick();
  dom.tick(10);
  const before = seen.setup;
  const input = dom.body.find((n) => n.id === "param-k");
  input.value = "7";
  input.oninput();
  assert.equal(seen.setup, before + 1, "changing a parameter restarts the simulation");
  assert.equal(seen.draws.at(-1).params.k, 7);
  dom.restore();
});

// ---- P-52: the verdict follows the simulation, and a changed setup is a new question ----

test("moving a slider after committing puts the question back", async () => {
  // A prediction is a claim about a specific setup. Change the setup and it is
  // a different question, so the old commitment cannot carry over.
  const { dom, el } = await mount();
  dom.body.find((n) => n.id === "opt-yes").onclick();
  assert.equal(el("lab-gate").hidden, true);

  const input = dom.body.find((n) => n.id === "param-k");
  input.value = "8"; input.oninput();
  assert.equal(el("lab-gate").hidden, false, "the gate must reopen for the new setup");
  dom.restore();
});

test("moving a slider BEFORE committing leaves the question open", async () => {
  const { dom, el } = await mount();
  const input = dom.body.find((n) => n.id === "param-k");
  input.value = "8"; input.oninput();
  assert.equal(el("lab-gate").hidden, false);
  dom.restore();
});

test("the record carries the parameters the prediction was made for", async () => {
  const { dom, lab } = await mount();
  const input = dom.body.find((n) => n.id === "param-k");
  input.value = "6"; input.oninput();
  dom.body.find((n) => n.id === "opt-yes").onclick();
  lab.reveal("yes");
  assert.equal(lab.record.params.k, 6, "the notebook needs to know which setup was answered");
  dom.restore();
});

test("the verdict follows what was observed", async () => {
  const { dom, lab, el } = await mount();                 // configured correct: "yes"
  dom.body.find((n) => n.id === "opt-no").onclick();
  lab.reveal("no");                                       // but the run produced "no"
  assert.equal(lab.record.correct, true);
  assert.match(el("lab-verdict").className, /is-right/);
  dom.restore();
});

test("the verdict says so when what happened was none of the choices", async () => {
  const { dom, lab, el } = await mount();
  dom.body.find((n) => n.id === "opt-yes").onclick();
  lab.reveal("neither");
  assert.equal(lab.record.unlisted, true);
  const text = el("lab-verdict").children.map((c) => c.textContent).join(" ");
  assert.match(text, /none of the choices/i);
  dom.restore();
});

test("the explanation can depend on what actually happened", async () => {
  const { dom, lab, el } = await mount({
    explain: (record) => `it was ${record.observed}`,
  });
  dom.body.find((n) => n.id === "opt-yes").onclick();
  lab.reveal("no");
  const text = el("lab-verdict").children.map((c) => c.textContent).join(" ");
  assert.match(text, /it was no/);
  dom.restore();
});

// ---- P-40: the notebook hears about every reveal, exactly once ----

test("onReveal hears about the reveal once, with the full record", async () => {
  const seen = [];
  const { dom, lab } = await mount({ onReveal: (rec) => seen.push(rec) });
  dom.body.find((n) => n.id === "opt-no").onclick();
  lab.reveal("no");
  lab.reveal("no");                                  // a second reveal must not double-record
  assert.equal(seen.length, 1);
  assert.equal(seen[0].choice, "no");
  assert.equal(seen[0].observed, "no");
  assert.ok(seen[0].params, "the card needs the setup it was answered for");
  dom.restore();
});

test("a failing onReveal does not break the verdict", async () => {
  const { dom, lab, el } = await mount({ onReveal: () => { throw new Error("storage exploded"); } });
  dom.body.find((n) => n.id === "opt-yes").onclick();
  lab.reveal("yes");
  assert.equal(el("lab-verdict").hidden, false, "the learner must still see the verdict");
  dom.restore();
});

// ---- P-54: one page, many scenarios — so a scenario must leave cleanly ----

test("destroy removes the lab from the page", async () => {
  const { dom, lab } = await mount();
  assert.ok(dom.body.find((n) => n.className === "lab"));
  lab.destroy();
  assert.equal(dom.body.find((n) => n.className === "lab"), null);
  dom.restore();
});

test("after destroy, nothing keeps stepping in the background", async () => {
  const { dom, lab, seen } = await mount();
  dom.body.find((n) => n.id === "opt-yes").onclick();
  dom.tick(3);
  const before = seen.steps;
  lab.destroy();
  dom.tick(30);
  assert.equal(seen.steps, before, "a destroyed scenario must not keep simulating");
  dom.restore();
});

test("after destroy, it leaves no listeners behind", async () => {
  // Every scenario the hub opens adds resize and keydown listeners. Without
  // teardown they pile up, and the old scenarios keep reacting to keys.
  const { dom, lab } = await mount();
  assert.ok(dom.listenerCount("keydown") > 0);
  lab.destroy();
  assert.equal(dom.listenerCount("keydown"), 0);
  assert.equal(dom.listenerCount("resize"), 0);
  dom.restore();
});

test("destroy is safe to call twice, and a late reveal after it is ignored", async () => {
  const seen = [];
  const { dom, lab } = await mount({ onReveal: (r) => seen.push(r) });
  dom.body.find((n) => n.id === "opt-yes").onclick();
  lab.destroy();
  lab.destroy();
  lab.reveal("yes");
  assert.equal(seen.length, 0, "a scenario that has left must not write to the notebook");
  dom.restore();
});

// ---- P-63 / ADR 0009: wrapping someone else's simulation ----

const EMBED = {
  src: "embeds/example/index.html",
  title: "Example simulation",
  attribution: { work: "Example Sim", author: "PhET Interactive Simulations",
                 licence: "CC BY 4.0", url: "https://phet.colorado.edu/" },
};
const mountEmbed = (over = {}) => mount({ embed: EMBED, setup: undefined, step: undefined, draw: undefined, ...over });

test("a wrapped simulation does not exist until a commit does", async () => {
  // R-010 in its strictest form: not hidden, not disabled — not loaded.
  const { dom } = await mountEmbed();
  assert.equal(dom.body.find((n) => n.tagName === "IFRAME"), null);
  dom.body.find((n) => n.id === "opt-yes").onclick();
  const frame = dom.body.find((n) => n.tagName === "IFRAME");
  assert.ok(frame, "the simulation should appear once committed");
  assert.equal(frame.attrs.src, EMBED.src);
  dom.restore();
});

test("a wrapped scenario has no canvas and no transport to run", async () => {
  const { dom, el } = await mountEmbed();
  assert.equal(dom.body.find((n) => n.tagName === "CANVAS"), null);
  const labels = dom.body.findAll((n) => n.tagName === "BUTTON").map((b) => b.textContent);
  for (const gone of ["Play", "Step", "Reset"]) assert.ok(!labels.includes(gone), `${gone} should not be offered`);
  assert.ok(el("lab-embed"), "the stage should hold the embed");
  dom.restore();
});

test("the learner reveals it themselves, since nothing can watch it for them", async () => {
  const { dom, el, button } = await mountEmbed();
  assert.equal(button("Show the answer").disabled, true, "locked until committed");
  dom.body.find((n) => n.id === "opt-no").onclick();
  assert.equal(button("Show the answer").disabled, false);
  button("Show the answer").onclick();
  assert.equal(el("lab-verdict").hidden, false);
  dom.restore();
});

test("credit is shown, because the licence obliges it", async () => {
  const { dom, text } = await mountEmbed();
  const t = text();
  assert.match(t, /PhET Interactive Simulations/);
  assert.match(t, /CC BY 4\.0/);
  dom.restore();
});

/* ── Cue, then an optional retry (ADR 0014) ───────────────────────────────
 *
 * The order is outcome, cue, optional retry, explanation. The explanation is
 * WITHHELD on a first wrong attempt that has a cue: handing it over
 * immediately is the losing arm of the study this came from. A learner who
 * wants it anyway can ask, and nobody is ever forced to try again.
 */

/** Everything the verdict panel is currently saying. */
function verdictText(el) {
  const out = [];
  const walk = (n) => { if (n.textContent) out.push(n.textContent); n.children?.forEach(walk); };
  walk(el("lab-verdict"));
  return out.join(" ");
}

const CUE = "Watch what happens the instant it starts.";
const withCue = (over = {}) => ({
  cue: (rec) => (rec.choice === "no" ? CUE : null),
  ...over,
});

test("a wrong first answer with a cue shows the cue and withholds the explanation", async () => {
  const { lab, dom, el } = await mount(withCue());
  dom.body.find((n) => n.id === "opt-no").onclick();
  lab.reveal("yes");

  const shown = verdictText(el);
  assert.match(shown, /Watch what happens/);
  assert.ok(!shown.includes("Because."), "the explanation is the losing arm — it waits");
  dom.restore();
});

test("the learner can ask for the explanation without trying again", async () => {
  const { lab, dom, el, button } = await mount(withCue());
  dom.body.find((n) => n.id === "opt-no").onclick();
  lab.reveal("yes");
  button("Show why").onclick();
  assert.match(verdictText(el), /Because\./);
  dom.restore();
});

test("a right answer is never cued", async () => {
  const { lab, dom, el } = await mount(withCue());
  dom.body.find((n) => n.id === "opt-yes").onclick();
  lab.reveal("yes");
  const shown = verdictText(el);
  assert.match(shown, /Because\./);
  assert.ok(!shown.includes(CUE));
  dom.restore();
});

test("a wrong answer with no cue for it explains immediately", async () => {
  const { lab, dom, el } = await mount(withCue({ cue: () => null }));
  dom.body.find((n) => n.id === "opt-no").onclick();
  lab.reveal("yes");
  assert.match(verdictText(el), /Because\./);
  dom.restore();
});

test("predicting again locks the simulation and keeps the first attempt", async () => {
  const { lab, dom, button } = await mount(withCue());
  // Confidence is what a Brier score is made of — the attempt is worth keeping
  // only if this survives the retry too.
  button("certain").onclick();
  dom.body.find((n) => n.id === "opt-no").onclick();
  lab.reveal("yes");
  button("Predict again").onclick();

  assert.equal(lab.record.choice, null, "a fresh attempt, not an editable old one");
  assert.equal(lab.record.retryOf, 0);
  assert.equal(lab.attempts[0].choice, "no");
  assert.equal(lab.attempts[0].confidence, "certain");
  dom.restore();
});

test("the second attempt explains rather than cueing again", async () => {
  const { lab, dom, el, button } = await mount(withCue());
  dom.body.find((n) => n.id === "opt-no").onclick();
  lab.reveal("yes");
  button("Predict again").onclick();
  dom.body.find((n) => n.id === "opt-no").onclick();
  lab.reveal("yes");
  assert.match(verdictText(el), /Because\./, "cueing twice is nagging, not scaffolding");
  dom.restore();
});

/* ── The learner writes the gap in their own words (R-012, P-92) ─────────
 *
 * ADR 0014 fixes where it goes: after the cue and the retry, with the
 * explanation — never in place of them, and never before them. ADR 0002 and
 * R-015 fix what may be in it when the learner arrives: nothing.
 */

/** Mount with a note box and collect everything filed through it. */
async function withNote(over = {}) {
  const filed = [];
  const m = await mount(withCue({
    onNote: (text) => {
      if (text.trim().length < 12) return { ok: false, errors: ["say a little more"] };
      filed.push(text);
      return { ok: true };
    },
    ...over,
  }));
  return { ...m, filed, box: () => m.dom.body.find((n) => n.tagName === "TEXTAREA"),
           note: () => m.el("lab-note") };
}

test("there is nowhere to write before anything has been revealed", async () => {
  const { dom, note } = await withNote();
  assert.ok(note()?.hidden !== false, "the gap cannot be written before there is one");
  dom.restore();
});

test("the box waits for the cue and the retry, and arrives with the explanation", async () => {
  // The order is the decision ADR 0014 took. A writing box on screen beside an
  // unanswered cue is a third thing competing with the two that matter.
  const { lab, dom, button, note } = await withNote();
  dom.body.find((n) => n.id === "opt-no").onclick();
  lab.reveal("yes");
  assert.equal(note().hidden, true, "a cue is standing — the box must not be up yet");
  button("Show why").onclick();
  assert.equal(note().hidden, false, "the explanation is up; so is the box");
  dom.restore();
});

test("a right answer gets the box straight away", async () => {
  const { lab, dom, note } = await withNote();
  dom.body.find((n) => n.id === "opt-yes").onclick();
  lab.reveal("yes");
  assert.equal(note().hidden, false, "being right is still worth explaining to yourself");
  dom.restore();
});

test("the box is empty when the learner reaches it, and stays that way", async () => {
  // R-015 and ADR 0002: no AI-generated text is ever written into a learner's
  // own notebook fields. Nothing pre-fills it, and no later render does either.
  const { lab, dom, box, el } = await withNote();
  dom.body.find((n) => n.id === "opt-yes").onclick();
  lab.reveal("yes");
  assert.equal(box().value, "");
  dom.tick(5);
  assert.equal(box().value, "", "a render cycle filled the learner's box");
  assert.equal(box().textContent, "", "nor may it arrive as content");
  dom.restore();
});

test("the prompt never hands over the answer it is asking about", async () => {
  const { lab, dom, note } = await withNote();
  dom.body.find((n) => n.id === "opt-no").onclick();
  lab.reveal("yes");
  const texts = [];
  (function walk(n) { if (n.textContent) texts.push(n.textContent); n.children?.forEach(walk); })(note());
  const prompt = texts.join(" ").toLowerCase();
  assert.ok(!prompt.includes("yes"), `the prompt quotes the answer: ${prompt}`);
  dom.restore();
});

test("what the learner types survives the simulation carrying on", async () => {
  // The verdict panel is rebuilt on every frame. A box rebuilt with it loses
  // whatever was half-written, which is the one bug that would make this
  // feature worse than not having it.
  const { lab, dom, box } = await withNote();
  dom.body.find((n) => n.id === "opt-yes").onclick();
  lab.reveal("yes");
  const typed = box();
  typed.value = "I was thinking about the mass, n";
  dom.tick(10);
  assert.equal(box().value, "I was thinking about the mass, n", "a frame ate the learner's words");
  assert.equal(box(), typed, "the box was replaced mid-sentence");
  dom.restore();
});

test("a written gap is filed", async () => {
  const { lab, dom, box, button, filed } = await withNote();
  dom.body.find((n) => n.id === "opt-yes").onclick();
  lab.reveal("yes");
  box().value = "I forgot that both of them are falling.";
  button("Save").onclick();
  assert.deepEqual(filed, ["I forgot that both of them are falling."]);
  dom.restore();
});

test("a refused note says so and files nothing", async () => {
  const { lab, dom, box, button, filed, note } = await withNote();
  dom.body.find((n) => n.id === "opt-yes").onclick();
  lab.reveal("yes");
  box().value = "idk";
  button("Save").onclick();
  assert.deepEqual(filed, []);
  const texts = [];
  (function walk(n) { if (n.textContent) texts.push(n.textContent); n.children?.forEach(walk); })(note());
  assert.match(texts.join(" "), /say a little more/);
  assert.equal(box().value, "idk", "a refusal must not throw the words away");
  dom.restore();
});

test("the box closes once the gap is written, and cannot be filed twice", async () => {
  const { lab, dom, box, button, filed } = await withNote();
  dom.body.find((n) => n.id === "opt-yes").onclick();
  lab.reveal("yes");
  box().value = "I forgot that both of them are falling.";
  button("Save").onclick();
  button("Save")?.onclick?.();
  assert.equal(filed.length, 1, "one card, one reconciliation");
  dom.restore();
});

test("what was written is shown back, not swallowed", async () => {
  // It is their notebook. A box that empties itself on save looks exactly
  // like a box that lost what you wrote.
  const { lab, dom, box, button, note } = await withNote();
  dom.body.find((n) => n.id === "opt-yes").onclick();
  lab.reveal("yes");
  box().value = "I forgot that both of them are falling.";
  button("Save").onclick();
  const texts = [];
  (function walk(n) { if (n.textContent) texts.push(n.textContent); n.children?.forEach(walk); })(note());
  assert.match(texts.join(" "), /both of them are falling/, "the learner's words vanished on save");
  dom.restore();
});

test("a fresh question starts with an empty box, not the last one's words", async () => {
  // Every attempt is its own card and its own gap. Carrying the text over
  // invites re-filing a sentence written about a question already answered —
  // and it would be the learner's own words in the wrong place, which is a
  // quieter version of the thing ADR 0002 forbids.
  const { lab, dom, box, button } = await withNote();
  dom.body.find((n) => n.id === "opt-no").onclick();
  lab.reveal("yes");
  button("Show why").onclick();
  box().value = "I thought it would stop straight away.";
  button("Ask again").onclick();
  dom.body.find((n) => n.id === "opt-yes").onclick();
  lab.reveal("yes");
  assert.equal(box().value, "", "the new attempt inherited the old attempt's words");
  dom.restore();
});

test("nothing blocks the learner who writes nothing", async () => {
  // R-012 says "before moving on". Nothing is withheld after the reveal, so a
  // block here has no power except over someone who stayed — and K-06 is live.
  // The record says whether it was written; it is not a toll gate.
  const { lab, dom, button, filed } = await withNote();
  dom.body.find((n) => n.id === "opt-yes").onclick();
  lab.reveal("yes");
  assert.equal(button("Ask again").disabled, false, "the next question is not held hostage");
  button("Ask again").onclick();
  assert.equal(filed.length, 0);
  assert.equal(lab.record.choice, null, "and it really did move on");
  dom.restore();
});

test("a scenario with nowhere to file a note does not offer one", async () => {
  const { lab, dom, el } = await mount(withCue());        // no onNote
  dom.body.find((n) => n.id === "opt-yes").onclick();
  lab.reveal("yes");
  assert.ok(!el("lab-note"), "a draft scenario has no notebook behind the box");
  dom.restore();
});

test("a notebook that throws on the note does not take the page down", async () => {
  const { lab, dom, box, button } = await withNote({
    onNote: () => { throw new Error("storage is on fire"); },
  });
  dom.body.find((n) => n.id === "opt-yes").onclick();
  lab.reveal("yes");
  box().value = "I forgot that both of them are falling.";
  assert.doesNotThrow(() => button("Save").onclick());
  dom.restore();
});

/* ── What the learner did with the cue (P-89, ADR 0018) ──────────────────
 *
 * Expertise reversal predicts a learner who already holds the schema gains
 * nothing from a cue and pays to reconcile it. The only way that ever becomes
 * visible in our own numbers is to know who took the cue and who reached past
 * it. The lab reports it; the notebook keeps it.
 */

/** Mount with a cue and collect every cue response the lab reports. */
async function withCueResponses(over = {}) {
  const said = [];
  const m = await mount(withCue({ onCueResponse: (r) => said.push(r), ...over }));
  return { ...m, said };
}

test("the card filed at the reveal says a cue was shown", async () => {
  const filed = [];
  const { lab, dom } = await mount(withCue({ onReveal: (rec) => filed.push(rec) }));
  dom.body.find((n) => n.id === "opt-no").onclick();
  lab.reveal("yes");
  assert.equal(filed[0].cue, "shown",
    "the card is written before the learner can act — it must at least say the cue was offered");
  dom.restore();
});

test("a card from an uncued reveal says no cue, not an empty one", async () => {
  const filed = [];
  const { lab, dom } = await mount(withCue({ onReveal: (rec) => filed.push(rec) }));
  dom.body.find((n) => n.id === "opt-yes").onclick();
  lab.reveal("yes");
  assert.equal(filed[0].cue, null, "right first time — there was nothing to take or skip");
  dom.restore();
});

test("predicting again after a cue is reported as taking it", async () => {
  const { lab, dom, button, said } = await withCueResponses();
  dom.body.find((n) => n.id === "opt-no").onclick();
  lab.reveal("yes");
  button("Predict again").onclick();
  assert.deepEqual(said, ["retried"]);
  dom.restore();
});

test("asking for the explanation instead is reported as reaching past the cue", async () => {
  const { lab, dom, button, said } = await withCueResponses();
  dom.body.find((n) => n.id === "opt-no").onclick();
  lab.reveal("yes");
  button("Show why").onclick();
  assert.deepEqual(said, ["explained"]);
  dom.restore();
});

test("moving on without taking either path is reported as leaving", async () => {
  const { lab, dom, button, said } = await withCueResponses();
  dom.body.find((n) => n.id === "opt-no").onclick();
  lab.reveal("yes");
  button("Ask again").onclick();
  assert.deepEqual(said, ["left"]);
  dom.restore();
});

test("leaving the scenario entirely with the cue unanswered is reported as leaving", async () => {
  // The hub destroys one scenario to mount the next. Without this the most
  // common response of all — walking away from the hint — would read as a
  // closed tab, and ADR 0018's question would be answered from the minority
  // who pressed something.
  const { lab, dom, said } = await withCueResponses();
  dom.body.find((n) => n.id === "opt-no").onclick();
  lab.reveal("yes");
  lab.destroy();
  assert.deepEqual(said, ["left"]);
  dom.restore();
});

test("changing the setup while a cue stands counts as leaving it", async () => {
  const { lab, dom, said } = await withCueResponses();
  dom.body.find((n) => n.id === "opt-no").onclick();
  lab.reveal("yes");
  const slider = dom.body.find((n) => n.id === "param-k");
  slider.value = "7";
  slider.oninput();
  assert.deepEqual(said, ["left"], "a changed setup is a different question — the cue went unused");
  dom.restore();
});

test("a cue response is reported once, whatever the learner presses afterwards", async () => {
  const { lab, dom, button, said } = await withCueResponses();
  dom.body.find((n) => n.id === "opt-no").onclick();
  lab.reveal("yes");
  button("Show why").onclick();
  button("Ask again").onclick();
  lab.destroy();
  assert.deepEqual(said, ["explained"], "the learner acted once; the record says so once");
  dom.restore();
});

test("nothing is reported when no cue was ever shown", async () => {
  const { lab, dom, button, said } = await withCueResponses();
  dom.body.find((n) => n.id === "opt-yes").onclick();
  lab.reveal("yes");
  button("Ask again").onclick();
  lab.destroy();
  assert.deepEqual(said, [], "a learner who was right has no cue to leave");
  dom.restore();
});

test("a notebook that throws on the cue response does not take the page down", async () => {
  const { lab, dom, button } = await mount(withCue({
    onCueResponse: () => { throw new Error("storage is on fire"); },
  }));
  dom.body.find((n) => n.id === "opt-no").onclick();
  lab.reveal("yes");
  assert.doesNotThrow(() => button("Predict again").onclick());
  assert.equal(lab.record.choice, null, "the retry still happened");
  dom.restore();
});

/* ── A hidden tab, and a way to drive the run without waiting (P-69) ──────
 *
 * dt is clamped to 1/30s per frame, so a tab throttled to ~0.5fps advances the
 * simulation about 200 times slower than real time rather than jumping. That
 * is the right choice for the integrator and the wrong experience: switch
 * tabs, come back, and the run is behind where you left it.
 *
 * It also made the lab unverifiable in a browser — reaching a reveal took
 * around fifteen minutes — so four separate tickets fell back to these stubs
 * instead of looking at the real page. advance() is the way out of both.
 */

test("switching away from the tab pauses, rather than drifting behind", async () => {
  const { lab, dom, seen } = await mount();
  dom.body.find((n) => n.id === "opt-yes").onclick();   // committing starts it
  dom.tick(3);
  const stepsWhenVisible = seen.steps;
  assert.ok(stepsWhenVisible > 0, "it must be running before hiding proves anything");

  dom.hide();
  assert.equal(dom.pendingFrames(), 0, "a hidden tab must not leave a frame queued");
  dom.tick(10);
  assert.equal(seen.steps, stepsWhenVisible, "nothing may advance while the tab is hidden");
  dom.restore();
});

test("coming back does not silently resume — the learner restarts it", async () => {
  const { lab, dom, button } = await mount();
  dom.body.find((n) => n.id === "opt-yes").onclick();
  dom.tick(2);
  dom.hide();
  dom.show();
  assert.ok(button("Play"), "the transport offers Play, so the state is obvious");
  dom.restore();
});

test("the visibility listener is removed on destroy", async () => {
  const { lab, dom } = await mount();
  assert.equal(dom.docListenerCount("visibilitychange"), 1);
  lab.destroy();
  assert.equal(dom.docListenerCount("visibilitychange"), 0, "a destroyed lab must not keep listening");
  dom.restore();
});

test("advance() drives the run deterministically, with no animation frames", async () => {
  const { lab, dom, seen } = await mount();
  dom.body.find((n) => n.id === "opt-yes").onclick();
  const before = dom.pendingFrames();

  lab.advance(1);
  assert.equal(seen.steps, 60, "one second is sixty fixed steps, every time");
  assert.equal(dom.pendingFrames(), before, "advance must not queue frames");

  lab.advance(1);
  assert.equal(seen.steps, 120, "and it accumulates");
  dom.restore();
});

test("advance() respects the gate — it is a clock, not a bypass", async () => {
  const { lab, dom, seen } = await mount();
  lab.advance(5);
  assert.equal(seen.steps, 0, "nothing may advance before a commitment exists");
  dom.restore();
});

test("advance() works in a hidden tab, which is the point of it", async () => {
  const { lab, dom, seen } = await mount();
  dom.body.find((n) => n.id === "opt-yes").onclick();
  dom.hide();
  lab.advance(0.5);
  assert.equal(seen.steps, 30);
  dom.restore();
});
