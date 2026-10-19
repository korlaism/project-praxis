// SPDX-License-Identifier: AGPL-3.0-or-later
/**
 * Snapshots — a scenario, exactly as the learner had it, kept. P-43.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { memoryBackend } from "./store.mjs";
import { openSnapshots, SNAPSHOTS_KEY } from "./snapshots.mjs";

let clock = 1_700_000_000_000;
const now = () => (clock += 1000);
let n = 0;
const newId = () => `snap-${++n}`;
const open = (backend = memoryBackend()) => openSnapshots({ backend, now, newId });

const SPEC = {
  schema: 1, id: "what-keeps-it-moving", subject: "physics", primitive: "two-pucks",
  params: { push: 0.2, friction: 0.05, u: 3 },
  question: "What happens to the pushed puck?",
  options: [{ id: "both", label: "Both stop" }, { id: "outruns", label: "One runs away" }],
  correct: "outruns",
};

test("a snapshot keeps the scenario and the setup the learner actually had", () => {
  // The params on the spec are the author's. The ones the learner dialled are
  // the question they actually answered, and they are what must come back.
  const s = open();
  const r = s.take({ spec: SPEC, params: { push: 0.9, friction: 0.01, u: 3 } });
  assert.equal(r.ok, true, r.errors?.join(", "));
  const [kept] = s.list();
  assert.equal(kept.spec.id, "what-keeps-it-moving");
  assert.deepEqual(kept.params, { push: 0.9, friction: 0.01, u: 3 });
  assert.notDeepEqual(kept.params, SPEC.params, "it kept the author's setup, not the learner's");
});

test("a snapshot is stamped with when it was taken", () => {
  const s = open();
  s.take({ spec: SPEC, params: SPEC.params });
  assert.equal(typeof s.list()[0].takenAt, "number");
});

test("a snapshot carries the whole spec, so it survives its scenario", () => {
  // The point of storing specs rather than code (ADR 0007). A generated
  // scenario lives in a session; drop the session and a card pointing at it
  // has nothing to re-open. A snapshot does not depend on anything else.
  const s = open();
  const generated = { ...SPEC, id: "gen-made-up", generated: true };
  s.take({ spec: generated, params: generated.params });
  const [kept] = s.list();
  assert.equal(kept.spec.question, generated.question);
  assert.deepEqual(kept.spec.options, generated.options);
  assert.equal(kept.spec.correct, generated.correct);
});

test("a snapshot needs a scenario to be a snapshot of", () => {
  const s = open();
  for (const bad of [undefined, null, {}, { spec: null }, { spec: { question: "no id" } },
                     { spec: { id: "neither-kind" } }])
    assert.equal(s.take(bad ?? {}).ok, false, JSON.stringify(bad));
  assert.deepEqual(s.list(), []);
});

test("a wrapped scenario can be kept, even though it has no primitive", () => {
  // ADR 0009's kind has an embed instead of a primitive and is still a
  // scenario. Requiring a primitive refused it silently, which on the page
  // looked like a button that did nothing.
  const s = open();
  const embedded = { schema: 1, id: "someone-elses", subject: "physics",
                     embed: { src: "embeds/example/index.html", title: "An example" } };
  assert.equal(s.take({ spec: embedded, params: {} }).ok, true);
  assert.equal(s.get(s.list()[0].id).spec.embed.src, "embeds/example/index.html");
});

test("snapshots come back newest first", () => {
  const s = open();
  s.take({ spec: SPEC, params: { ...SPEC.params, u: 1 } });
  s.take({ spec: SPEC, params: { ...SPEC.params, u: 9 } });
  assert.deepEqual(s.list().map((x) => x.params.u), [9, 1]);
});

test("the learner can write about a snapshot, in their own words", () => {
  // ADR 0002 and R-015: these are the learner's words and nothing else
  // writes them. Same rule as every other field they own.
  const s = open();
  const { snapshot } = s.take({ spec: SPEC, params: SPEC.params });
  assert.equal(s.note(snapshot.id, "  I set the push past friction on purpose  ").ok, true);
  assert.equal(s.get(snapshot.id).note, "I set the push past friction on purpose");
});

test("an empty note is not a note, and does not overwrite one", () => {
  const s = open();
  const { snapshot } = s.take({ spec: SPEC, params: SPEC.params });
  s.note(snapshot.id, "the real one");
  for (const bad of ["", "   ", null]) assert.equal(s.note(snapshot.id, bad).ok, false);
  assert.equal(s.get(snapshot.id).note, "the real one");
});

test("a note is written once, like every other thing the learner writes", () => {
  const s = open();
  const { snapshot } = s.take({ spec: SPEC, params: SPEC.params });
  s.note(snapshot.id, "first thought");
  assert.equal(s.note(snapshot.id, "second thought").ok, false);
  assert.equal(s.get(snapshot.id).note, "first thought");
});

test("a snapshot the learner drops takes its words with it", () => {
  const s = open();
  const { snapshot } = s.take({ spec: SPEC, params: SPEC.params });
  s.note(snapshot.id, "something private");
  s.forget(snapshot.id);
  assert.deepEqual(s.list(), []);
  assert.equal(JSON.stringify(s.export()).includes("something private"), false);
});

test("snapshots outlive the tab, and come back replayable", () => {
  const backend = memoryBackend();
  const taken = open(backend).take({ spec: SPEC, params: { push: 0.9, friction: 0.01, u: 3 } }).snapshot;
  const reopened = open(backend).get(taken.id);
  assert.equal(reopened.spec.primitive, "two-pucks");
  assert.deepEqual(reopened.params, { push: 0.9, friction: 0.01, u: 3 });
});

test("unreadable bytes are set aside rather than destroyed", () => {
  const backend = memoryBackend();
  backend.setItem(SNAPSHOTS_KEY, "{ not json");
  const s = openSnapshots({ backend, now, newId });
  assert.deepEqual(s.list(), []);
  assert.ok(backend.keys().some((k) => k.startsWith(`${SNAPSHOTS_KEY}.unreadable.`)));
});

test("a snapshot that cannot be written says so rather than claiming it was", () => {
  const backend = memoryBackend();
  const s = openSnapshots({ backend, now, newId });
  backend.setItem = () => { const e = new Error("full"); e.name = "QuotaExceededError"; throw e; };
  const r = s.take({ spec: SPEC, params: SPEC.params });
  assert.equal(r.persisted, false);
  assert.ok(r.warning);
  assert.equal(s.list().length, 1, "and it stays usable until the tab closes");
});
