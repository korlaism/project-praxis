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

/* ── P-100: linking topics, and groups as connected components ──────────── */

test("a link is visible from both ends", () => {
  const s = open();
  const a = s.start("straight lines").session;
  const b = s.start("quadratics").session;
  assert.equal(s.link(a.id, b.id).ok, true);
  assert.deepEqual(s.linksOf(a.id), [b.id]);
  assert.deepEqual(s.linksOf(b.id), [a.id], "a link only one side can see is not a link");
});

test("a link is stored once, not twice", () => {
  // Two lists that must agree are two lists that can disagree. One normalised
  // edge cannot, which is why the sessions themselves hold nothing.
  const s = open();
  const a = s.start("straight lines").session;
  const b = s.start("quadratics").session;
  s.link(a.id, b.id);
  const raw = JSON.stringify(s.export());
  assert.equal(raw.split(`"${a.id}"`).length - 1, 2,
    "the id appears more than twice — once as a session, once in the edge");
});

test("linking the same pair twice changes nothing", () => {
  const s = open();
  const a = s.start("a").session, b = s.start("b").session;
  s.link(a.id, b.id);
  s.link(b.id, a.id);
  assert.deepEqual(s.linksOf(a.id), [b.id]);
});

test("a session cannot be linked to itself", () => {
  const s = open();
  const a = s.start("a").session;
  assert.equal(s.link(a.id, a.id).ok, false);
  assert.deepEqual(s.linksOf(a.id), []);
});

test("a link to something that does not exist is refused", () => {
  const s = open();
  const a = s.start("a").session;
  assert.equal(s.link(a.id, "no-such-session").ok, false);
  assert.equal(s.link("no-such-session", a.id).ok, false);
});

test("a link can be taken back", () => {
  const s = open();
  const a = s.start("a").session, b = s.start("b").session;
  s.link(a.id, b.id);
  assert.equal(s.unlink(b.id, a.id).ok, true, "either end can undo it");
  assert.deepEqual(s.linksOf(a.id), []);
});

test("dropping a session takes its links with it", () => {
  // A link to something that no longer exists is a dead row in the store and
  // a button on the page that goes nowhere.
  const s = open();
  const a = s.start("a").session, b = s.start("b").session;
  s.link(a.id, b.id);
  s.drop(b.id);
  assert.deepEqual(s.linksOf(a.id), []);
  assert.equal(JSON.stringify(s.export()).includes(b.id), false);
});

test("linked sessions come back as one group", () => {
  // A group is not a second thing to keep in sync — it is what the links
  // already say. Three sessions, two links, one group.
  const s = open();
  const a = s.start("straight lines").session;
  const b = s.start("quadratics").session;
  const c = s.start("friction").session;
  s.link(a.id, b.id);
  const groups = s.groups().map((g) => g.slice().sort());
  assert.equal(groups.length, 2);
  assert.ok(groups.some((g) => g.length === 2 && g.includes(a.id) && g.includes(b.id)));
  assert.ok(groups.some((g) => g.length === 1 && g[0] === c.id));
});

test("a chain of links is one group, not two", () => {
  // The reason components rather than pairs: a links b, b links c, and all
  // three belong together even though a and c were never linked directly.
  const s = open();
  const a = s.start("a").session, b = s.start("b").session, c = s.start("c").session;
  s.link(a.id, b.id);
  s.link(b.id, c.id);
  const groups = s.groups();
  assert.equal(groups.length, 1);
  assert.equal(groups[0].length, 3);
});

test("a group forms whichever way round the ids happen to sort", () => {
  // Edges are stored sorted, and the tests above hand out ids in creation
  // order, so the sorted edge always pointed from the older session to the
  // newer one — which hid a graph built in only one direction. Real ids are
  // UUIDs and sort arbitrarily, so this one hands them out backwards.
  const backwards = ["m-b", "m-a"];
  let n = 0;
  const s = openSessions({ backend: memoryBackend(), now, newId: () => backwards[n++] ?? `m-${n}` });
  const first = s.start("older, sorts later").session;
  const second = s.start("newer, sorts earlier").session;
  assert.ok(second.id < first.id, "this test is pointless unless the ids sort backwards");

  s.link(first.id, second.id);
  assert.deepEqual(s.linksOf(first.id), [second.id]);
  assert.deepEqual(s.linksOf(second.id), [first.id]);
  assert.equal(s.groups().length, 1, "the two are linked but came back as separate groups");
});

test("every session belongs to exactly one group", () => {
  const s = open();
  const ids = ["a", "b", "c", "d"].map((t) => s.start(t).session.id);
  s.link(ids[0], ids[1]);
  s.link(ids[2], ids[3]);
  const seen = s.groups().flat();
  assert.equal(seen.length, ids.length);
  assert.deepEqual(seen.slice().sort(), ids.slice().sort());
});

test("links outlive the tab", () => {
  const backend = memoryBackend();
  const first = open(backend);
  const a = first.start("a").session, b = first.start("b").session;
  first.link(a.id, b.id);
  assert.deepEqual(open(backend).linksOf(a.id), [b.id]);
});

test("a notebook written before links existed still opens", () => {
  const backend = memoryBackend();
  const s = open(backend);
  const a = s.start("a").session;
  const raw = JSON.parse(backend.getItem(SESSIONS_KEY));
  delete raw.links;
  backend.setItem(SESSIONS_KEY, JSON.stringify(raw));
  const reopened = open(backend);
  assert.deepEqual(reopened.linksOf(a.id), []);
  assert.equal(reopened.list().length, 1, "the sessions must survive");
  const b = reopened.start("b").session;
  assert.equal(reopened.link(a.id, b.id).ok, true);
});
