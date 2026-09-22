// SPDX-License-Identifier: AGPL-3.0-or-later
/**
 * The hub, driven the way a learner drives it — by clicking.
 *
 * Every test goes through a button's onclick, never through location.hash, so
 * routing is proved to work without depending on hash or history events.
 *
 * Note on verifying the published page: automated mouse clicks from the
 * browser extension did not reach inside the published page's cross-origin
 * frame, while keyboard input did. That briefly looked like the page ignoring
 * clicks; it was the test tool. Drive a published page with Tab and Enter.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { SCENARIOS } from "../scenarios/index.mjs";
import { installDom } from "../harness/dom-stub.mjs";
import { openNotebook, memoryBackend } from "../notebook/store.mjs";

async function start({ search = "" } = {}) {
  const dom = installDom();
  if (search) location.search = search;      // set before the hub reads it
  const { startHub } = await import("./app.js?" + Math.random());
  startHub({ store: openNotebook({ backend: memoryBackend() }) });
  const one = (cls) => dom.body.find((n) => n.className?.split?.(" ").includes(cls));
  const all = (cls) => dom.body.findAll((n) => n.className?.split?.(" ").includes(cls));
  return { dom, one, all };
}

test("the front page lists every scenario as a button, not a link", async () => {
  const { dom, all } = await start();
  const cards = all("hub-card");
  // Derived from the registry, not written down: a literal here meant the
  // front page silently stopped listing new scenarios as the bank grew (P-80).
  assert.equal(cards.length, Object.keys(SCENARIOS).length);
  for (const c of cards) assert.equal(c.tagName, "BUTTON", "links do not navigate inside a published page");
  dom.restore();
});

test("clicking a scenario opens it, and clicking back returns without leaving it running", async () => {
  const { dom, one, all } = await start();
  all("hub-card")[1].onclick();
  assert.ok(one("lab"), "the scenario should be on the page");
  assert.ok(one("hub-back"), "there must be a way back");
  one("hub-back").onclick();
  assert.equal(one("lab"), null, "the scenario must be gone");
  assert.equal(all("hub-card").length, Object.keys(SCENARIOS).length, "the front page must be back");
  dom.restore();
});

test("opening scenarios one after another never stacks them", async () => {
  const { dom, one, all } = await start();
  for (let i = 0; i < 3; i++) {
    all("hub-card")[i].onclick();
    assert.equal(all("lab").length, 1);
    one("hub-back").onclick();
  }
  dom.restore();
});

test("the record opens from the front page and comes back", async () => {
  const { dom, one } = await start();
  one("hub-record").onclick();
  assert.ok(one("rec"), "the record should be on the page");
  one("hub-back").onclick();
  assert.equal(one("rec"), null);
  dom.restore();
});

/** The front-page card for a scenario, found by its question rather than its place. */
function cardFor(all, id) {
  const question = SCENARIOS[id].question;
  const card = all("hub-card").find((c) => {
    let text = "";
    (function walk(n) { if (n.textContent) text += n.textContent; n.children?.forEach(walk); })(c);
    return text.includes(question);
  });
  assert.ok(card, `no front-page card for "${id}"`);
  return card;
}

test("a prediction made in a scenario shows up in the record", async () => {
  const { dom, one, all } = await start();
  // By identity, not by position: concept grouping reordered the list and an
  // index silently opened a different scenario (P-80).
  cardFor(all, "truck-and-fly").onclick();
  dom.body.find((n) => n.id === "opt-truck").onclick();
  dom.tick(2000);
  one("hub-back").onclick();
  one("hub-record").onclick();
  assert.equal(all("rec-row").length, 1, "one prediction, one row — through the shared notebook");
  dom.restore();
});

/* ── The verification hook (P-69) ─────────────────────────────────────────
 *
 * A throttled tab advances the simulation at about a two-hundredth of real
 * time, so reaching a reveal in a browser took roughly fifteen minutes. Four
 * tickets in a row fell back to the DOM stub and said so. This is the hook
 * that lets the real page be driven instead — off unless asked for.
 */

test("no hook exists unless it is asked for", async () => {
  const { dom, all } = await start();
  cardFor(all, "truck-and-fly").onclick();
  assert.equal(globalThis.praxisVerify, undefined,
    "a page nobody asked to instrument must expose nothing");
  dom.restore();
});

test("with ?verify=1 the current scenario can be driven to its reveal", async () => {
  const { dom, all } = await start({ search: "?verify=1" });
  cardFor(all, "truck-and-fly").onclick();
  dom.body.find((n) => n.id === "opt-truck").onclick();

  assert.ok(globalThis.praxisVerify, "the hook is missing");
  // contact-collision runs slowed about 500x so the contact is watchable, so
  // its reveal is tens of SIMULATED seconds in. Under a throttled browser that
  // is the fifteen minutes of real time this hook exists to avoid.
  globalThis.praxisVerify.advance(40);

  const rec = globalThis.praxisVerify.record();
  assert.equal(rec.observed, "equal", "driven to the real outcome, not a stubbed one");
  assert.equal(rec.choice, "truck");
  assert.equal(rec.correct, false);
  dom.restore();
});

test("the hook goes away when the scenario does", async () => {
  const { dom, all, one } = await start({ search: "?verify=1" });
  cardFor(all, "truck-and-fly").onclick();
  assert.ok(globalThis.praxisVerify);
  one("hub-back").onclick();
  assert.equal(globalThis.praxisVerify, undefined, "it must not outlive the lab it drives");
  dom.restore();
});
