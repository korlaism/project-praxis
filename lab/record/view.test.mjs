// SPDX-License-Identifier: AGPL-3.0-or-later
import { test } from "node:test";
import assert from "node:assert/strict";
import { installDom } from "../harness/dom-stub.mjs";
import { openNotebook, memoryBackend } from "../notebook/store.mjs";
import { SCENARIOS } from "../scenarios/index.mjs";

let t = 0;
const card = (over) => ({ subject: "physics", scenario: "truck-and-fly", choice: "truck",
  confidence: "certain", observed: "equal", correct: false, unlisted: false, ...over });

async function setup(cards = []) {
  const dom = installDom();
  const { renderRecord } = await import("./view.js");
  const notebook = openNotebook({ backend: memoryBackend(), now: () => ++t });
  for (const c of cards) notebook.record(c);
  const view = renderRecord(dom.body, { notebook, scenarios: SCENARIOS });
  const find = (cls) => dom.body.findAll((n) => n.className?.split?.(" ").includes(cls));
  const text = () => {
    const out = [];
    const walk = (n) => { if (n.textContent) out.push(n.textContent); n.children?.forEach(walk); };
    walk(dom.body); return out.join(" | ");
  };
  return { dom, notebook, view, find, text };
}

test("an empty notebook invites a first prediction instead of showing an empty chart", async () => {
  const { dom, find, text } = await setup();
  assert.equal(find("rec-row").length, 0);
  assert.match(text(), /no predictions yet/i);
  dom.restore();
});

test("every card becomes a row", async () => {
  const { dom, find } = await setup([card(), card({ choice: "equal", correct: true })]);
  assert.equal(find("rec-row").length, 2);
  dom.restore();
});

test("it says 'not this time', never 'wrong' — this is a record, not a report card", async () => {
  const { dom, text } = await setup([card()]);
  assert.match(text(), /not this time/i);
  assert.doesNotMatch(text(), /\bwrong\b/i);
  dom.restore();
});

test("too few at a level is said plainly, not charted as a conclusion", async () => {
  const { dom, text } = await setup([card()]);
  assert.match(text(), /too few/i);
  dom.restore();
});

test("forgetting a subject takes two deliberate clicks", async () => {
  // A learner's record is theirs to delete — but not by one stray tap.
  const { dom, notebook, find } = await setup([card()]);
  const forget = () => find("rec-forget")[0];
  forget().onclick();
  assert.equal(notebook.cards("physics").length, 1, "one click must not delete");
  const confirm = find("rec-forget-yes")[0];
  assert.ok(confirm, "a confirmation must appear");
  confirm.onclick();
  assert.equal(notebook.cards("physics").length, 0);
  dom.restore();
});

test("export shows the whole notebook as text to copy, since pages cannot start downloads", async () => {
  const { dom, find } = await setup([card()]);
  find("rec-export")[0].onclick();
  const box = find("rec-export-text")[0];
  assert.ok(box, "an export box must appear");
  const parsed = JSON.parse(box.value);
  assert.equal(parsed.subjects.physics.length, 1);
  dom.restore();
});

test("when the browser will not keep the notebook, the page says so", async () => {
  const dom = installDom();
  const { renderRecord } = await import("./view.js");
  const notebook = openNotebook({ backend: { getItem() { throw 1; }, setItem() { throw 1; },
    removeItem() { throw 1; }, keys: () => [] } });
  renderRecord(dom.body, { notebook, scenarios: SCENARIOS });
  const all = dom.body.findAll((n) => /won.t be kept|gone when/i.test(n.textContent ?? ""));
  assert.ok(all.length > 0, "must warn that the record will not outlive the tab");
  dom.restore();
});

test("destroy removes the page cleanly", async () => {
  const { dom, view } = await setup([card()]);
  view.destroy();
  assert.equal(dom.body.children.length, 0);
  dom.restore();
});

// ---- P-55: an open record notices predictions made in another tab ----

test("a prediction made in another tab appears in an open record", async () => {
  const dom = installDom();
  const { renderRecord } = await import("./view.js");
  const listeners = new Set();
  const events = { addEventListener: (_t, f) => listeners.add(f), removeEventListener: (_t, f) => listeners.delete(f) };
  const shared = memoryBackend();
  const here = openNotebook({ backend: shared, events });
  const otherTab = openNotebook({ backend: shared });
  const view = renderRecord(dom.body, { notebook: here, scenarios: SCENARIOS });
  const rows = () => dom.body.findAll((n) => n.className?.split?.(" ").includes("rec-row")).length;
  assert.equal(rows(), 0);

  otherTab.record(card());
  for (const f of listeners) f({ key: "praxis.notebook.v1" });   // the browser's storage event
  assert.equal(rows(), 1, "the open record must show the other tab's prediction");

  view.destroy();
  assert.equal(listeners.size, 0, "a closed record must stop listening");
  dom.restore();
});

// ---- P-42 × ADR 0003: recorded, never shown ----

test("the record never names a learner's misconception back to them", async () => {
  // ADR 0003 defers naming the signature back to the learner until R-002 holds.
  // The tag is kept for analysis; it must not appear on the page.
  const { dom, text } = await setup([card({ errorTag: "bigger-pushes-harder" })]);
  assert.doesNotMatch(text(), /bigger-pushes-harder/);
  assert.doesNotMatch(text(), /misconception/i);
  dom.restore();
});
