// SPDX-License-Identifier: AGPL-3.0-or-later
/**
 * The landing keeps the gate, or it is not this product. P-85, ADR 0017.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { installDom } from "../harness/dom-stub.mjs";
import { openNotebook, memoryBackend } from "../notebook/store.mjs";
import { SCENARIOS } from "../scenarios/index.mjs";
import BANK from "../scenarios/bank/index.mjs";

async function land(id, over = {}) {
  const dom = installDom();
  const { mountLanding } = await import("./app.js?" + Math.random());
  const notebook = openNotebook({ backend: memoryBackend() });
  const view = mountLanding(SCENARIOS[id], { notebook, ...over });
  const one = (cls) => dom.body.find((n) => n.className?.split?.(" ").includes(cls));
  const text = (n) => {
    const out = [];
    (function walk(x) { if (x.textContent) out.push(x.textContent); x.children?.forEach(walk); })(n);
    return out.join(" ");
  };
  return { dom, view, notebook, one, text,
           opt: (o) => dom.body.find((n) => n.id === `pl-opt-${o}`),
           button: (label) => dom.body.find((n) => n.tagName === "BUTTON" && n.textContent === label) };
}

test("nothing is revealed before a commitment", async () => {
  const { dom, view, one } = await land("which-way-does-it-fly");
  assert.equal(view.record.observed, null, "an outcome before a prediction is the whole failure");
  assert.equal(one("pl-verdict").hidden, true);
  dom.restore();
});

test("the question and the options are on the page from the start", async () => {
  const { dom, text, one, opt } = await land("truck-and-fly");
  assert.match(text(one("pl-ask")), /What do you think happens\?/);
  for (const o of SCENARIOS["truck-and-fly"].options) assert.ok(opt(o.id), `no option ${o.id}`);
  dom.restore();
});

test("committing hides the question and plays the recording to its outcome", async () => {
  const { dom, view, opt, one, text } = await land("two-balls-no-air");
  opt("heavier").onclick();
  assert.equal(one("pl-ask").hidden, true, "the question stays up");
  view.advance();
  assert.equal(view.record.observed, "together");
  assert.equal(view.record.correct, false);
  assert.match(text(one("pl-verdict")), /You said/);
  dom.restore();
});

test("a wrong answer is cued, and the explanation waits", async () => {
  // ADR 0014 holds on this surface too, or the phone is a different product.
  const { dom, view, opt, one, text, button } = await land("same-balls-with-air");
  opt("together").onclick();                       // the boundary-ignored bait
  view.advance();
  const shown = text(one("pl-verdict"));
  assert.match(shown, /The air pushes back on both balls/, "the cue is missing");
  assert.ok(!shown.includes("Now the heavy one wins"), "the explanation must wait");
  assert.ok(button("Show why"), "no way to ask for the explanation");
  button("Show why").onclick();
  assert.match(text(one("pl-verdict")), /Now the heavy one wins/);
  dom.restore();
});

test("the explanation offers the lab, which is where the apparatus lives", async () => {
  const { dom, view, opt, one, text } = await land("two-balls-no-air");
  opt("together").onclick();
  view.advance();
  const link = dom.body.find((n) => n.className?.split?.(" ").includes("pl-open"));
  assert.ok(link, "no link to the lab");
  assert.match(link.href, /#\/s\/two-balls-no-air$/);
  assert.match(text(one("pl-verdict")), /bigger screen/);
  dom.restore();
});

test("a prediction made on the phone is filed in the same notebook", async () => {
  const { dom, view, opt, notebook } = await land("truck-and-fly");
  opt("truck").onclick();
  view.advance();
  const cards = notebook.cards("physics");
  assert.equal(cards.length, 1);
  assert.equal(cards[0].scenario, "truck-and-fly");
  assert.equal(cards[0].observed, "equal");
  assert.equal(cards[0].errorTag, "bigger-pushes-harder");
  dom.restore();
});

test("every scenario mounts and records — the second surface cannot rot quietly", async () => {
  for (const spec of BANK) {
    const dom = installDom();
    const { mountLanding } = await import("./app.js?" + Math.random());
    const notebook = openNotebook({ backend: memoryBackend() });
    let view;
    assert.doesNotThrow(() => { view = mountLanding(spec, { notebook }); }, `${spec.id} threw on mount`);
    assert.ok(view.frames > 1, `${spec.id} recorded nothing`);
    view.destroy();
    dom.restore();
  }
});

test("a hidden tab stops the recording instead of crawling", async () => {
  const { dom, view, opt } = await land("truck-and-fly");
  opt("truck").onclick();
  dom.hide();
  const at = view.record;
  dom.tick(20);
  assert.equal(view.record.observed, at.observed, "nothing may advance while hidden");
  dom.show();
  view.destroy();
  assert.equal(dom.docListenerCount("visibilitychange"), 0, "destroy must stop listening");
  dom.restore();
});
