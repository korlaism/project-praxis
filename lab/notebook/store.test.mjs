/**
 * Notebook v0 — predictions that survive the tab closing.
 *
 * Browser-local by design (ADR 0006): nothing leaves the device, which keeps
 * the consent question small (P-44) and defers accounts entirely.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { openNotebook, memoryBackend, STORAGE_KEY } from "./store.mjs";

let clock = 1_700_000_000_000;
const now = () => (clock += 1000);
let n = 0;
const newId = () => `card-${++n}`;

const card = (over = {}) => ({
  subject: "physics", scenario: "truck-and-fly", choice: "truck",
  confidence: "certain", observed: "equal", correct: false, unlisted: false,
  params: { mt: 2, mf: 200, u: 20 }, committedAt: 1, revealedAt: 2, ...over,
});

test("a prediction is recorded and read back", () => {
  const nb = openNotebook({ backend: memoryBackend(), now, newId });
  const r = nb.record(card());
  assert.equal(r.ok, true);
  const [c] = nb.cards("physics");
  assert.equal(c.scenario, "truck-and-fly");
  assert.equal(c.choice, "truck");
  assert.ok(c.id, "every card gets an id");
});

test("it survives the tab closing — a fresh notebook on the same storage sees it", () => {
  const backend = memoryBackend();
  openNotebook({ backend, now, newId }).record(card());
  const reopened = openNotebook({ backend, now, newId });
  assert.equal(reopened.cards("physics").length, 1);
});

test("one notebook per subject", () => {
  const nb = openNotebook({ backend: memoryBackend(), now, newId });
  nb.record(card({ subject: "physics" }));
  nb.record(card({ subject: "chemistry", scenario: "salt-in-water" }));
  assert.equal(nb.cards("physics").length, 1);
  assert.equal(nb.cards("chemistry").length, 1);
  assert.deepEqual(nb.subjects().sort(), ["chemistry", "physics"]);
});

test("it stores what was committed, not just right or wrong", () => {
  // Confidence and the observed outcome are what calibration (P-41) and error
  // signatures (P-42) are made from. A bare correct/incorrect is useless to both.
  const nb = openNotebook({ backend: memoryBackend(), now, newId });
  nb.record(card());
  const [c] = nb.cards("physics");
  assert.equal(c.confidence, "certain");
  assert.equal(c.observed, "equal");
  assert.equal(c.correct, false);
  assert.deepEqual(c.params, { mt: 2, mf: 200, u: 20 });
});

test("cards come back oldest first", () => {
  const nb = openNotebook({ backend: memoryBackend(), now, newId });
  nb.record(card({ choice: "truck" }));
  nb.record(card({ choice: "equal" }));
  assert.deepEqual(nb.cards("physics").map((c) => c.choice), ["truck", "equal"]);
});

test("a card without subject, scenario or choice is refused, not half-stored", () => {
  const nb = openNotebook({ backend: memoryBackend(), now, newId });
  for (const missing of ["subject", "scenario", "choice"]) {
    const r = nb.record(card({ [missing]: undefined }));
    assert.equal(r.ok, false, `accepted a card with no ${missing}`);
    assert.ok(r.errors.some((e) => e.includes(missing)));
  }
  assert.deepEqual(nb.subjects(), []);
});

test("corrupt storage is set aside, never destroyed", () => {
  // A learner's record is theirs. If it cannot be read, keep the bytes where
  // they can be recovered rather than overwriting them with an empty notebook.
  const backend = memoryBackend();
  backend.setItem(STORAGE_KEY, "{ this is not json");
  const nb = openNotebook({ backend, now, newId });
  assert.deepEqual(nb.subjects(), []);
  nb.record(card());
  const kept = backend.keys().filter((k) => k.startsWith(STORAGE_KEY + ".unreadable."));
  assert.equal(kept.length, 1, "the unreadable original must be kept somewhere");
  assert.equal(backend.getItem(kept[0]), "{ this is not json");
});

test("a notebook from a future version is set aside, not misread", () => {
  const backend = memoryBackend();
  backend.setItem(STORAGE_KEY, JSON.stringify({ version: 99, subjects: {} }));
  const nb = openNotebook({ backend, now, newId });
  assert.deepEqual(nb.subjects(), []);
  assert.ok(backend.keys().some((k) => k.startsWith(STORAGE_KEY + ".unreadable.")));
});

test("with no storage at all it still works for the session, and says so", () => {
  // Private windows and sandboxed frames throw on localStorage. The page must
  // keep working; it just cannot promise the record will outlive the tab.
  const broken = { getItem() { throw new Error("denied"); }, setItem() { throw new Error("denied"); },
                   removeItem() { throw new Error("denied"); }, keys: () => [] };
  const nb = openNotebook({ backend: broken, now, newId });
  assert.equal(nb.persistent, false);
  const r = nb.record(card());
  assert.equal(r.ok, true);
  assert.equal(r.persisted, false);
  assert.equal(nb.cards("physics").length, 1);
});

test("with no backend supplied and no localStorage, it falls back rather than crashing", () => {
  const nb = openNotebook({ now, newId });
  assert.equal(nb.persistent, false);
  assert.equal(nb.record(card()).ok, true);
});

test("running out of space is reported, and the card is kept for the session", () => {
  const full = memoryBackend();
  const realSet = full.setItem;
  let allow = true;
  full.setItem = (k, v) => { if (!allow) { const e = new Error("full"); e.name = "QuotaExceededError"; throw e; } realSet(k, v); };
  const nb = openNotebook({ backend: full, now, newId });
  allow = false;
  const r = nb.record(card());
  assert.equal(r.ok, true);
  assert.equal(r.persisted, false);
  assert.match(r.warning, /space/i);
  assert.equal(nb.cards("physics").length, 1);
});

test("the learner can take everything with them", () => {
  const nb = openNotebook({ backend: memoryBackend(), now, newId });
  nb.record(card());
  nb.record(card({ subject: "chemistry", scenario: "x" }));
  const out = JSON.parse(JSON.stringify(nb.export()));
  assert.equal(out.version, 1);
  assert.equal(out.subjects.physics.length, 1);
  assert.equal(out.subjects.chemistry.length, 1);
});

test("forgetting a subject removes that subject and nothing else", () => {
  const backend = memoryBackend();
  const nb = openNotebook({ backend, now, newId });
  nb.record(card());
  nb.record(card({ subject: "chemistry", scenario: "x" }));
  nb.forget("physics");
  assert.deepEqual(nb.subjects(), ["chemistry"]);
  assert.deepEqual(openNotebook({ backend, now, newId }).subjects(), ["chemistry"]);
});

test("it touches its own key and nothing else in storage", () => {
  const backend = memoryBackend();
  backend.setItem("someone-elses-key", "leave me alone");
  openNotebook({ backend, now, newId }).record(card());
  assert.equal(backend.getItem("someone-elses-key"), "leave me alone");
  assert.deepEqual(backend.keys().sort(), [STORAGE_KEY, "someone-elses-key"].sort());
});
