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

  // Grouped since P-100: an unlinked session is a group of one, so the page
  // is one shape whether or not anything has been linked.
  const rows = homeSessions(s, notebook).flatMap((g) => g.sessions);
  assert.deepEqual(rows.map((r) => r.topic), ["quadratics", "falling"], "most recent first");
  const falling = rows.find((r) => r.id === a.id);
  assert.equal(falling.notes, 1);
  assert.equal(falling.predictions, 1);
  assert.equal(falling.path, `/session/${a.id}`);
  const quadratics = rows.find((r) => r.id === b.id);
  assert.equal(quadratics.notes, 0);
  assert.equal(quadratics.predictions, 0);
});

/* ── P-100: linked topics on the page ───────────────────────────────────── */

test("a session page shows what it is linked to, and what it could be linked to", () => {
  const s = sessions();
  const a = s.start("straight lines").session;
  const b = s.start("quadratics").session;
  const c = s.start("friction").session;
  s.link(a.id, b.id);
  const m = sessionModel(s.get(a.id), { scenarios: SCENARIOS, notebook: openNotebook({ backend: memoryBackend() }), sessions: s });

  assert.deepEqual(m.linked.map((x) => x.topic), ["quadratics"]);
  assert.equal(m.linked[0].path, `/session/${b.id}`);
  assert.deepEqual(m.linkable.map((x) => x.topic), ["friction"],
    "already linked, and itself, are not offered again");
  assert.ok(!m.linkable.some((x) => x.id === a.id), "a topic cannot be offered itself");
});

test("a session with no links says nothing is linked rather than showing an empty list", () => {
  const s = sessions();
  const a = s.start("alone").session;
  const m = sessionModel(s.get(a.id), { scenarios: SCENARIOS, notebook: openNotebook({ backend: memoryBackend() }), sessions: s });
  assert.deepEqual(m.linked, []);
  assert.deepEqual(m.linkable, [], "there is nothing else to link to yet");
});

test("the home list groups linked topics together and leaves the rest alone", () => {
  const s = sessions();
  const a = s.start("straight lines").session;
  const b = s.start("quadratics").session;
  const c = s.start("friction").session;
  s.link(a.id, b.id);
  const rows = homeSessions(s, openNotebook({ backend: memoryBackend() }));

  assert.equal(rows.length, 2, "a group of two and a session on its own");
  const group = rows.find((r) => r.sessions.length > 1);
  assert.deepEqual(group.sessions.map((x) => x.topic).sort(), ["quadratics", "straight lines"]);
  assert.equal(group.linked, true);
  const solo = rows.find((r) => r.sessions.length === 1);
  assert.equal(solo.sessions[0].topic, "friction");
  assert.equal(solo.linked, false);
});

test("groups are ordered by whichever of their topics was touched last", () => {
  const s = sessions();
  const a = s.start("old one").session;
  const b = s.start("also old").session;
  s.link(a.id, b.id);
  const c = s.start("newest").session;
  assert.equal(homeSessions(s, openNotebook({ backend: memoryBackend() }))[0].sessions[0].topic, "newest");

  s.note(a.id, "back to this");
  const rows = homeSessions(s, openNotebook({ backend: memoryBackend() }));
  assert.equal(rows[0].sessions[0].topic, "old one", "the group rises when any of it is worked in");
});
