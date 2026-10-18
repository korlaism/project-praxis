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
import { openSessions } from "../session/store.mjs";

async function start({ search = "", hash = "", scenarios, store, sessionStore,
                      modelSettings, composeWith } = {}) {
  const dom = installDom();
  if (search) location.search = search;      // set before the hub reads it
  if (hash) location.hash = hash;            // the learner arriving on a saved address
  const { startHub } = await import("./app.js?" + Math.random());
  const notebook = store ?? openNotebook({ backend: memoryBackend() });
  // A stepping clock, because two sessions started in the same millisecond
  // tie on touchedAt and the resume order becomes arbitrary.
  let clock = 1_700_000_000_000;
  const sessions = sessionStore ?? openSessions({ backend: memoryBackend(), now: () => (clock += 1000) });
  startHub({ store: notebook, sessionStore: sessions, scenarios, modelSettings, composeWith });
  const one = (cls) => dom.body.find((n) => n.className?.split?.(" ").includes(cls));
  const all = (cls) => dom.body.findAll((n) => n.className?.split?.(" ").includes(cls));
  const text = () => {
    const out = [];
    (function walk(n) { if (n.textContent) out.push(n.textContent); n.children?.forEach(walk); })(dom.body);
    return out.join(" ");
  };
  return { dom, one, all, text, notebook, sessions,
           byId: (id) => dom.body.find((n) => n.id === id),
           button: (label) => dom.body.find((n) => n.tagName === "BUTTON" && n.textContent === label) };
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

/* ── The scenario source is a seam, not an assumption (P-59) ──────────────
 *
 * "Everything customisable" was recorded as direction in P-59, and the
 * notebook backend and the mount already honoured it. The scenario list did
 * not: it was a static import, so a school or a hosted tenant could not supply
 * its own items without editing the source.
 */

test("the hub lists whatever scenarios it is given", async () => {
  const mine = {
    "only-one": {
      schema: 1, id: "only-one", concept: "falling", difficulty: "easy",
      subject: "physics", primitive: "free-fall",
      params: { heavy: 5, light: 0.5, height: 20, air: 0 },
      question: "A scenario from somewhere else entirely",
      options: [{ id: "together", label: "Together" }, { id: "heavier", label: "The heavy one" }],
      correct: "together", errorTags: { heavier: "heavier-falls-faster" },
      explain: "Because.",
    },
  };
  const { dom, all, text } = await start({ scenarios: mine });
  assert.equal(all("hub-card").length, 1, "the hub used its own list instead of the one given");
  assert.match(text(), /A scenario from somewhere else entirely/);
  dom.restore();
});

test("given none, it says so rather than throwing", async () => {
  const { dom, all } = await start({ scenarios: {} });
  assert.equal(all("hub-card").length, 0);
  dom.restore();
});

/* ── P-95: the session shell ─────────────────────────────────────────────
 *
 * ADR 0022. You open the lab, you say what you want to work on, and what you
 * were doing last time is waiting underneath. Nothing here calls a model.
 */

test("the front page opens with a prompt box, and it proposes nothing", async () => {
  const { dom, byId } = await start();
  const box = byId("hub-topic");
  assert.ok(box, "there is no prompt box");
  assert.equal(box.value ?? "", "", "the box must be empty — nobody has typed yet");
  assert.match(box.getAttribute("placeholder"), /\?$/, "the box asks; it does not suggest");
  dom.restore();
});

test("typing a topic starts a session and goes into it", async () => {
  const { dom, byId, button, text, sessions } = await start();
  byId("hub-topic").value = "quadratics";
  button("Start").onclick();
  assert.equal(sessions.list().length, 1);
  assert.equal(sessions.list()[0].topic, "quadratics");
  assert.match(text(), /Your notes/, "we are not on the session page");
  dom.restore();
});

test("an empty prompt starts nothing", async () => {
  const { dom, byId, button, sessions } = await start();
  byId("hub-topic").value = "   ";
  button("Start").onclick();
  assert.deepEqual(sessions.list(), []);
  dom.restore();
});

test("sessions are waiting underneath the box when you come back", async () => {
  const backend = memoryBackend();
  const before = openSessions({ backend });
  before.start("falling objects");
  const { dom, all, text } = await start({ sessionStore: openSessions({ backend }) });
  assert.equal(all("hub-session").length, 1);
  assert.match(text(), /Pick up where you left off/);
  assert.match(text(), /falling objects/);
  dom.restore();
});

test("a note written in a session is there when you come back to it", async () => {
  const { dom, byId, button, text, sessions } = await start();
  byId("hub-topic").value = "falling";
  button("Start").onclick();
  byId("session-note").value = "I think the heavy one wins";
  button("Save note").onclick();
  assert.match(text(), /I think the heavy one wins/);
  assert.equal(byId("session-note").value, "", "the box clears once the note is kept");

  const id = sessions.list()[0].id;
  assert.equal(sessions.get(id).notes[0].text, "I think the heavy one wins");
  dom.restore();
});

test("a topic we can simulate offers its simulations inside the session", async () => {
  const { dom, byId, button, all, text } = await start();
  byId("hub-topic").value = "quadratics";
  button("Start").onclick();
  assert.ok(all("hub-card").length > 0, "no simulations offered for a topic we have");
  assert.ok(!text().includes("No simulations for this topic yet"));
  dom.restore();
});

test("a topic we cannot simulate says so, and says what there is", async () => {
  // The empty state is the honest state of the product. It must not be hidden
  // behind an unrelated list of everything we happen to have.
  const { dom, byId, button, all, text } = await start();
  byId("hub-topic").value = "photosynthesis";
  button("Start").onclick();
  assert.match(text(), /No simulations for this topic yet/);
  assert.equal(all("hub-card").length, 0, "an unrelated list here would be a lie");
  assert.ok(all("hub-empty-c").length > 0, "told 'nothing here', a learner deserves to see what IS here");
  assert.match(text(), /Your notes/, "and the notes still work");
  dom.restore();
});

test("a prediction made inside a session is filed against it", async () => {
  const { dom, byId, button, all, notebook, sessions } = await start();
  byId("hub-topic").value = "quadratics";
  button("Start").onclick();
  all("hub-card")[0].onclick();
  dom.body.find((n) => n.id?.startsWith("opt-")).onclick();
  dom.tick(2000);
  const [card] = notebook.cards("maths");
  assert.equal(card.session, sessions.list()[0].id, "the card does not know where it was made");
  dom.restore();
});

test("leaving a simulation opened in a session returns to that session", async () => {
  const { dom, byId, button, all, text } = await start();
  byId("hub-topic").value = "quadratics";
  button("Start").onclick();
  all("hub-card")[0].onclick();
  const back = dom.body.find((n) => n.className === "hub-back");
  assert.equal(back.textContent, "← Session", "it would drop the learner back at the front page");
  back.onclick();
  assert.match(text(), /Your notes/);
  dom.restore();
});

test("opening a simulation from a session brings that session back to the top", async () => {
  // The resume list is for resuming. Working inside a session is working.
  const { dom, byId, button, all, sessions } = await start();
  byId("hub-topic").value = "quadratics";
  button("Start").onclick();
  const quadratics = sessions.list()[0].id;
  dom.body.find((n) => n.className === "hub-back").onclick();
  byId("hub-topic").value = "friction";
  button("Start").onclick();
  assert.notEqual(sessions.list()[0].id, quadratics, "the newer session is on top, as it should be");

  // Back to the older one, and straight into a simulation without touching
  // its notes — opening the session page alone would not prove anything.
  dom.body.find((n) => n.className === "hub-back").onclick();
  // The topic lives in a span inside the button, so the button's own
  // textContent is empty — search its subtree, as a learner's eye does.
  all("hub-session").find((b) => b.find((n) => n.textContent === "quadratics")).onclick();
  all("hub-card")[0].onclick();
  assert.equal(sessions.list()[0].id, quadratics, "the session being worked in is not at the top");
  dom.restore();
});

test("reopening a saved address inside a session brings that session back", async () => {
  // Not every arrival goes through the session page. A reload while inside a
  // simulation, or a bookmark, lands straight on this address — and that is
  // still working in the session.
  const backend = memoryBackend();
  let clock = 1_700_000_000_000;
  const before = openSessions({ backend, now: () => (clock += 1000) });
  const older = before.start("quadratics").session.id;
  before.start("friction");
  assert.notEqual(before.list()[0].id, older, "the newer session starts on top");

  const { dom, sessions } = await start({
    sessionStore: openSessions({ backend, now: () => (clock += 1000) }),
    hash: `#/session/${older}/s/how-many-solutions`,
  });
  assert.equal(sessions.list()[0].id, older, "arriving straight inside a session did not resurface it");
  dom.restore();
});

test("a session can be renamed in place, because a topic is a first guess", async () => {
  const { dom, byId, button, sessions } = await start();
  byId("hub-topic").value = "math stuff";
  button("Start").onclick();
  const topic = byId("session-topic");
  topic.value = "quadratics";
  topic.onchange();
  assert.equal(sessions.list()[0].topic, "quadratics");
  dom.restore();
});

test("the front page still lists everything, under the sessions", async () => {
  // The browse list is how anything gets found until a model can compose.
  const { dom, all, text } = await start();
  assert.equal(all("hub-card").length, Object.keys(SCENARIOS).length);
  assert.match(text(), /Or browse everything/);
  dom.restore();
});

/* ── P-96: the model seam, and the answer check in front of it ──────────── */

import { openModelSettings } from "../model/settings.mjs";
import { composeFor } from "../model/compose.mjs";

/** A model that replies with whatever specs the test names. */
function modelReplying(scenarios) {
  const sent = [];
  return { sent, ask: async (prompt) => { sent.push(prompt); return JSON.stringify({ scenarios }); } };
}

const TRUTHFUL = {
  schema: 1, id: "ice", primitive: "two-pucks", concept: "friction-and-inertia", difficulty: "easy",
  subject: "physics", params: { push: 0.9, friction: 0.02, u: 2 },
  question: "A hard shove on near-frictionless ice. What happens?",
  options: [{ id: "outruns", label: "It runs away" }, { id: "both", label: "Both stop" }],
  correct: "outruns", errorTags: { both: "things-naturally-stop" }, explain: "The push keeps winning.",
};
const LYING = { ...TRUTHFUL, id: "ice-2", correct: "both", errorTags: { outruns: "things-naturally-stop" } };

/** A settings store with an endpoint already in it. */
function configured() {
  const m = openModelSettings({ backend: memoryBackend() });
  m.save({ url: "https://api.example.com/v1/chat/completions", key: "sk-test", model: "a-model" });
  return m;
}

test("with no model configured, nothing offers to compose and nothing can transmit", async () => {
  const { dom, byId, button, text } = await start();
  byId("hub-topic").value = "photosynthesis";
  button("Start").onclick();
  assert.ok(!button("Compose with your AI"), "a learner with no key is offered no model");
  assert.match(text(), /not set up/);
  dom.restore();
});

test("the settings page keeps an endpoint and says what leaves the device", async () => {
  const { dom, byId, button, text, one } = await start();
  // The label lives in spans inside the button, so find it by its class.
  one("hub-settings").onclick();
  assert.ok(byId("model-url"), "no endpoint field");
  byId("model-url").value = "https://api.example.com/v1/chat/completions";
  byId("model-key").value = "sk-test";
  byId("model-name").value = "a-model";
  button("Save").onclick();
  assert.match(text(), /Saved/);
  // The promise the ADR makes, made in front of the learner before they type.
  assert.match(text(), /never sent/);
  assert.match(text(), /thrown away and you never see it/);
  dom.restore();
});

test("a composed scenario that survives the simulation is offered in the session", async () => {
  const { dom, byId, button, text, sessions } = await start({
    modelSettings: configured(),
    composeWith: async () => ({ ok: true, scenarios: [TRUTHFUL], rejected: [], asked: 1 }),
  });
  byId("hub-topic").value = "friction on ice";
  button("Start").onclick();
  await button("Compose with your AI").onclick();
  assert.match(text(), /Composed by your AI/);
  assert.match(text(), /near-frictionless ice/);
  assert.equal(sessions.list()[0].scenarios.length, 1, "it must survive a reload too");
  dom.restore();
});

test("a composed scenario the simulation contradicts never reaches the page", async () => {
  // The whole safety argument of ADR 0023, end to end: the real compose runs
  // the answer check, so a plausible-and-wrong scenario is gone before the
  // page ever hears about it.
  const { dom, byId, button, text, sessions } = await start({
    modelSettings: configured(),
    composeWith: (topic, opts) => composeFor(topic, { ...opts, ask: async () => JSON.stringify({ scenarios: [LYING] }) }),
  });
  byId("hub-topic").value = "friction on ice";
  button("Start").onclick();
  await button("Compose with your AI").onclick();
  assert.ok(!text().includes("Composed by your AI"), "a scenario the simulation contradicts was offered");
  assert.deepEqual(sessions.list()[0].scenarios, []);
  dom.restore();
});

test("what the model got wrong is said out loud, and survives the redraw", async () => {
  // ADR 0023 §6. The first version of this wiped the report off the screen
  // the instant it had something to report.
  const { dom, byId, button, text } = await start({
    modelSettings: configured(),
    composeWith: (topic, opts) =>
      composeFor(topic, { ...opts, ask: async () => JSON.stringify({ scenarios: [TRUTHFUL, LYING] }) }),
  });
  byId("hub-topic").value = "friction on ice";
  button("Start").onclick();
  await button("Compose with your AI").onclick();
  assert.match(text(), /1 of 2 survived/);
  assert.match(text(), /thrown away/);
  dom.restore();
});

test("a model that honestly declines the topic is reported as a fair answer", async () => {
  const { dom, byId, button, text } = await start({
    modelSettings: configured(),
    composeWith: (topic, opts) => composeFor(topic, { ...opts, ask: async () => JSON.stringify({ scenarios: [] }) }),
  });
  byId("hub-topic").value = "photosynthesis";
  button("Start").onclick();
  await button("Compose with your AI").onclick();
  assert.match(text(), /fair answer/);
  dom.restore();
});

test("an endpoint that fails is reported, and breaks nothing", async () => {
  const { dom, byId, button, text } = await start({
    modelSettings: configured(),
    composeWith: async () => ({ ok: false, error: "401 Unauthorized", scenarios: [], rejected: [], asked: 0 }),
  });
  byId("hub-topic").value = "friction on ice";
  button("Start").onclick();
  await button("Compose with your AI").onclick();
  assert.match(text(), /401 Unauthorized/);
  assert.match(text(), /Your notes/, "the session is still usable");
  dom.restore();
});

test("a composed scenario can be opened and predicted on, like any other", async () => {
  const { dom, byId, button, all, notebook } = await start({
    modelSettings: configured(),
    composeWith: async () => ({ ok: true, scenarios: [TRUTHFUL], rejected: [], asked: 1 }),
  });
  byId("hub-topic").value = "friction on ice";
  button("Start").onclick();
  await button("Compose with your AI").onclick();
  const card = all("hub-card").find((b) => b.find((n) => n.textContent?.includes("near-frictionless")));
  assert.ok(card, "the composed scenario is listed but cannot be opened");
  card.onclick();
  dom.body.find((n) => n.id?.startsWith("opt-")).onclick();
  dom.tick(3000);
  const [filed] = notebook.cards("physics");
  assert.equal(filed.scenario, "ice", "a prediction on a composed scenario is recorded like any other");
  dom.restore();
});
