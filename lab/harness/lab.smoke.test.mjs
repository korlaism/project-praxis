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
