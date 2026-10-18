// SPDX-License-Identifier: AGPL-3.0-or-later
/** What a session page shows, as plain data. P-95. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { openNotebook, memoryBackend } from "../notebook/store.mjs";
import { openSessions } from "./store.mjs";
import { sessionModel, homeSessions } from "./view.mjs";
import { SCENARIOS } from "../scenarios/index.mjs";

let clock = 1_700_000_000_000;
const now = () => (clock += 60_000);
let n = 0;
const newId = () => `x-${++n}`;
const sessions = () => openSessions({ backend: memoryBackend(), now, newId });

test("a session page shows the topic, the notes newest first, and the simulations for it", () => {
  const s = sessions();
  const { session } = s.start("quadratics");
  s.note(session.id, "first");
  s.note(session.id, "second");
  const m = sessionModel(s.get(session.id), { scenarios: SCENARIOS, notebook: openNotebook({ backend: memoryBackend() }) });

  assert.equal(m.topic, "quadratics");
  assert.deepEqual(m.notes.map((x) => x.text), ["second", "first"], "the latest thought goes on top");
  assert.deepEqual(m.concepts.map((c) => c.concept), ["quadratics"]);
  assert.equal(m.hasSimulations, true);
});

test("a topic with nothing behind it says so, and says what there is", () => {
  // The empty state is the product's actual roadmap. It must not be hidden.
  const s = sessions();
  const { session } = s.start("photosynthesis");
  const m = sessionModel(s.get(session.id), { scenarios: SCENARIOS, notebook: openNotebook({ backend: memoryBackend() }) });

  assert.equal(m.hasSimulations, false);
  assert.deepEqual(m.concepts, []);
  assert.ok(m.available.length > 0, "a learner told 'nothing here' deserves to be told what IS here");
  assert.ok(m.available.every((c) => c.title && c.subject));
});

test("the page counts the predictions made inside this session, not every prediction", () => {
  const s = sessions();
  const a = s.start("falling").session;
  const b = s.start("friction").session;
  const notebook = openNotebook({ backend: memoryBackend() });
  const card = (over) => ({ subject: "physics", scenario: "two-balls-no-air", choice: "heavier", ...over });
  notebook.record(card({ session: a.id }));
  notebook.record(card({ session: a.id }));
  notebook.record(card({ session: b.id }));
  notebook.record(card({}));                      // made outside any session

  const m = sessionModel(s.get(a.id), { scenarios: SCENARIOS, notebook });
  assert.equal(m.predictions, 2);
});

test("a scenario in a session keeps the session in its link", () => {
  // So that going back from a simulation returns to the session it was opened
  // from, and the card filed there knows where it was made.
  const s = sessions();
  const { session } = s.start("quadratics");
  const m = sessionModel(s.get(session.id), { scenarios: SCENARIOS, notebook: openNotebook({ backend: memoryBackend() }) });
  const [first] = m.concepts[0].scenarios;
  assert.equal(first.path, `/session/${session.id}/s/${encodeURIComponent(first.id)}`);
});

test("the home list says enough to choose between sessions", () => {
  const s = sessions();
  const a = s.start("falling").session;
  s.note(a.id, "a thought");
  const b = s.start("quadratics").session;
  const notebook = openNotebook({ backend: memoryBackend() });
  notebook.record({ subject: "physics", scenario: "two-balls-no-air", choice: "heavier", session: a.id });

  const rows = homeSessions(s, notebook);
  assert.deepEqual(rows.map((r) => r.topic), ["quadratics", "falling"], "most recent first");
  const falling = rows.find((r) => r.id === a.id);
  assert.equal(falling.notes, 1);
  assert.equal(falling.predictions, 1);
  assert.equal(falling.path, `/session/${a.id}`);
  const quadratics = rows.find((r) => r.id === b.id);
  assert.equal(quadratics.notes, 0);
  assert.equal(quadratics.predictions, 0);
});
