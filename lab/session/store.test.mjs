// SPDX-License-Identifier: AGPL-3.0-or-later
/**
 * Sessions — a topic, the notes written in it, and somewhere to come back to.
 *
 * ADR 0022, P-95. The first piece of the product shell. Kept in its own store
 * rather than inside the notebook: a session is a container for what the
 * learner did, and the notebook is what they did.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { memoryBackend } from "../notebook/store.mjs";
import { openSessions, SESSIONS_KEY } from "./store.mjs";

let clock = 1_700_000_000_000;
const now = () => (clock += 1000);
let n = 0;
const newId = () => `s-${++n}`;
const open = (backend = memoryBackend()) => openSessions({ backend, now, newId });

test("a session is started from what the learner typed", () => {
  const s = open();
  const r = s.start("falling objects");
  assert.equal(r.ok, true, r.errors?.join(", "));
  assert.equal(r.session.topic, "falling objects");
  assert.equal(typeof r.session.startedAt, "number");
  assert.deepEqual(s.list().map((x) => x.topic), ["falling objects"]);
});

test("a topic of nothing is not a session", () => {
  const s = open();
  for (const bad of ["", "   ", null, undefined, 7]) assert.equal(s.start(bad).ok, false);
  assert.deepEqual(s.list(), []);
});

test("the topic is kept as typed, trimmed at the ends", () => {
  const s = open();
  assert.equal(s.start("  Why do things Fall?  ").session.topic, "Why do things Fall?");
});

test("sessions come back most recently touched first", () => {
  // The list is for resuming. What you were last doing goes at the top.
  const s = open();
  const a = s.start("friction").session;
  const b = s.start("quadratics").session;
  assert.deepEqual(s.list().map((x) => x.id), [b.id, a.id]);
  s.touch(a.id);
  assert.deepEqual(s.list().map((x) => x.id), [a.id, b.id]);
});

test("a session is found by id, and an unknown one is not invented", () => {
  const s = open();
  const { session } = s.start("friction");
  assert.equal(s.get(session.id).topic, "friction");
  assert.equal(s.get("no-such-session"), null);
});

test("notes are the learner's, unlimited, and kept in the order written", () => {
  const s = open();
  const { session } = s.start("falling");
  assert.equal(s.note(session.id, "I think heavier falls faster").ok, true);
  assert.equal(s.note(session.id, "no — air is the thing").ok, true);
  assert.deepEqual(s.get(session.id).notes.map((x) => x.text),
    ["I think heavier falls faster", "no — air is the thing"]);
});

test("every note carries when it was written", () => {
  // R-014's rule, and the reason notes are a list rather than one blob: what
  // someone thought on Tuesday is not what they think now.
  const s = open();
  const { session } = s.start("falling");
  s.note(session.id, "first thought");
  const [note] = s.get(session.id).notes;
  assert.equal(typeof note.writtenAt, "number");
  assert.ok(note.id);
});

test("an empty note is not a note", () => {
  const s = open();
  const { session } = s.start("falling");
  for (const bad of ["", "   ", "\n\t", null]) assert.equal(s.note(session.id, bad).ok, false);
  assert.deepEqual(s.get(session.id).notes, []);
});

test("a note is stored as written, not reformatted", () => {
  const s = open();
  const { session } = s.start("falling");
  s.note(session.id, "  heavier  ==  faster?\nno.  ");
  assert.equal(s.get(session.id).notes[0].text, "heavier  ==  faster?\nno.");
});

test("writing a note is touching the session", () => {
  const s = open();
  const a = s.start("friction").session;
  s.start("quadratics");
  s.note(a.id, "the pushed one runs away");
  assert.equal(s.list()[0].id, a.id, "the session you just wrote in is the one you are in");
});

test("a note against a session that does not exist is refused", () => {
  const s = open();
  assert.equal(s.note("no-such-session", "hello").ok, false);
});

test("a session can be renamed, because a topic is a first guess", () => {
  const s = open();
  const { session } = s.start("math stuff");
  assert.equal(s.rename(session.id, "quadratics").ok, true);
  assert.equal(s.get(session.id).topic, "quadratics");
  assert.equal(s.rename(session.id, "   ").ok, false, "renaming to nothing is not renaming");
});

test("sessions outlive the tab", () => {
  const backend = memoryBackend();
  const { session } = open(backend).start("falling");
  open(backend).note(session.id, "kept");
  assert.equal(open(backend).get(session.id).notes[0].text, "kept");
});

test("a session the learner drops takes its notes with it", () => {
  const s = open();
  const { session } = s.start("falling");
  s.note(session.id, "something private");
  s.drop(session.id);
  assert.deepEqual(s.list(), []);
  assert.equal(JSON.stringify(s.export()).includes("something private"), false);
});

test("the export carries sessions whole", () => {
  const s = open();
  const { session } = s.start("falling");
  s.note(session.id, "mine");
  const out = s.export();
  assert.equal(out.sessions.length, 1);
  assert.equal(out.sessions[0].notes[0].text, "mine");
});

test("unreadable bytes are set aside rather than destroyed", () => {
  // The same promise the notebook makes. A learner's sessions are not worth
  // less than their cards.
  const backend = memoryBackend();
  backend.setItem(SESSIONS_KEY, "{ this is not json");
  const s = openSessions({ backend, now, newId });
  assert.deepEqual(s.list(), []);
  assert.ok(backend.keys().some((k) => k.startsWith(`${SESSIONS_KEY}.unreadable.`)),
    "the bytes we could not read must still be somewhere");
});

test("a session says it could not be saved rather than claiming it was", () => {
  const backend = memoryBackend();
  const s = openSessions({ backend, now, newId });
  backend.setItem = () => { const e = new Error("full"); e.name = "QuotaExceededError"; throw e; };
  const r = s.start("falling");
  assert.equal(r.persisted, false);
  assert.ok(r.warning);
  assert.equal(s.list().length, 1, "and it stays usable until the tab closes");
});

/* ── P-96: scenarios composed for this session ──────────────────────────── */

test("a verified scenario can be kept in the session it was composed for", () => {
  const s = open();
  const { session } = s.start("friction");
  const spec = { schema: 1, id: "gen-a", primitive: "two-pucks", subject: "physics", generated: true };
  assert.equal(s.keep(session.id, spec).ok, true);
  assert.deepEqual(s.get(session.id).scenarios.map((x) => x.id), ["gen-a"]);
});

test("keeping the same scenario twice does not list it twice", () => {
  const s = open();
  const { session } = s.start("friction");
  const spec = { schema: 1, id: "gen-a", primitive: "two-pucks", subject: "physics", generated: true };
  s.keep(session.id, spec);
  s.keep(session.id, spec);
  assert.equal(s.get(session.id).scenarios.length, 1);
});

test("a session without generated scenarios has an empty list, not a missing one", () => {
  // Older sessions predate this. They must not read as broken.
  const s = open();
  const { session } = s.start("friction");
  assert.deepEqual(s.get(session.id).scenarios, []);
});

test("a scenario kept in a session goes when the session goes", () => {
  const s = open();
  const { session } = s.start("friction");
  s.keep(session.id, { schema: 1, id: "gen-a", primitive: "two-pucks", subject: "physics" });
  s.drop(session.id);
  assert.equal(JSON.stringify(s.export()).includes("gen-a"), false);
});
