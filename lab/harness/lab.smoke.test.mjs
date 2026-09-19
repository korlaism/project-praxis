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
  return { dom, lab, seen, el,
           button: (label) => dom.body.find((n) => n.tagName === "BUTTON" && n.textContent === label),
           clock: () => el("lab-clock").textContent };
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
