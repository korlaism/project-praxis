// SPDX-License-Identifier: AGPL-3.0-or-later
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

// ---- P-55: two notebooks on one storage must not overwrite each other ----
// Two tabs of the lab open at once are two instances on one origin's storage.

test("two instances on one storage both keep their cards — the P-55 data loss", () => {
  const shared = memoryBackend();
  const tabA = openNotebook({ backend: shared, now, newId });
  const tabB = openNotebook({ backend: shared, now, newId });
  tabA.record(card({ scenario: "a" }));
  tabB.record(card({ scenario: "b" }));
  const survive = openNotebook({ backend: shared, now, newId }).cards("physics").map((c) => c.scenario);
  assert.deepEqual(survive.sort(), ["a", "b"], "a card written by one tab was destroyed by the other");
});

test("interleaved writes from two tabs all survive", () => {
  const shared = memoryBackend();
  const a = openNotebook({ backend: shared, now, newId });
  const b = openNotebook({ backend: shared, now, newId });
  a.record(card({ scenario: "1" }));
  b.record(card({ scenario: "2" }));
  a.record(card({ scenario: "3" }));
  b.record(card({ scenario: "4" }));
  assert.equal(openNotebook({ backend: shared, now, newId }).cards("physics").length, 4);
});

test("one tab sees what another tab wrote, without reopening", () => {
  const shared = memoryBackend();
  const a = openNotebook({ backend: shared, now, newId });
  const b = openNotebook({ backend: shared, now, newId });
  a.record(card({ scenario: "from-a" }));
  assert.deepEqual(b.cards("physics").map((c) => c.scenario), ["from-a"]);
});

test("forgetting in one tab is not undone by a later write in another", () => {
  // The mirror of the loss: a stale copy must not resurrect what was deleted.
  const shared = memoryBackend();
  const a = openNotebook({ backend: shared, now, newId });
  const b = openNotebook({ backend: shared, now, newId });
  b.record(card({ scenario: "old" }));
  a.forget("physics");
  b.record(card({ scenario: "new" }));
  assert.deepEqual(openNotebook({ backend: shared, now, newId }).cards("physics").map((c) => c.scenario), ["new"]);
});

test("an unreadable record is set aside exactly once, however often it is read", () => {
  const backend = memoryBackend();
  backend.setItem(STORAGE_KEY, "{ not json");
  const nb = openNotebook({ backend, now, newId });
  for (let i = 0; i < 5; i++) { nb.cards("physics"); nb.subjects(); }
  nb.record(card());
  nb.record(card());
  const kept = backend.keys().filter((k) => k.startsWith(STORAGE_KEY + ".unreadable."));
  assert.equal(kept.length, 1, `set aside ${kept.length} times`);
});

test("a card that could not be saved stays visible for the session, and is saved once there is room", () => {
  const backend = memoryBackend();
  const realSet = backend.setItem;
  let full = false;
  backend.setItem = (k, v) => { if (full && k === STORAGE_KEY) { const e = new Error("full"); e.name = "QuotaExceededError"; throw e; } realSet(k, v); };
  const nb = openNotebook({ backend, now, newId });
  full = true;
  assert.equal(nb.record(card({ scenario: "stuck" })).persisted, false);
  assert.deepEqual(nb.cards("physics").map((c) => c.scenario), ["stuck"], "must still be visible");
  full = false;
  nb.record(card({ scenario: "next" }));
  const stored = openNotebook({ backend, now, newId }).cards("physics").map((c) => c.scenario);
  assert.deepEqual(stored, ["stuck", "next"], "the stuck card should be written with the next save");
});

test("subscribers hear when another tab changes the notebook, and only then", () => {
  const listeners = new Set();
  const events = { addEventListener: (_t, f) => listeners.add(f), removeEventListener: (_t, f) => listeners.delete(f) };
  const nb = openNotebook({ backend: memoryBackend(), now, newId, events });
  let heard = 0;
  const off = nb.subscribe(() => heard++);
  for (const f of listeners) f({ key: "someone-elses-key" });
  assert.equal(heard, 0, "other keys are none of our business");
  for (const f of listeners) f({ key: STORAGE_KEY });
  assert.equal(heard, 1);
  off();
  for (const f of listeners) f({ key: STORAGE_KEY });
  assert.equal(heard, 1, "unsubscribed means unsubscribed");
  assert.equal(listeners.size, 0, "no listener left behind");
});

// ---- P-42: the misconception behind a wrong answer is kept with the card ----

test("a card keeps the error class behind a wrong answer", () => {
  const nb = openNotebook({ backend: memoryBackend(), now, newId });
  nb.record(card({ errorTag: "bigger-pushes-harder" }));
  assert.equal(nb.cards("physics")[0].errorTag, "bigger-pushes-harder");
  assert.equal(nb.export().subjects.physics[0].errorTag, "bigger-pushes-harder",
    "the export is how this reaches R-002 analysis — it must carry the tag");
});

test("a card says whether its outcome was observed or merely asserted", () => {
  // ADR 0009: a wrapped simulation cannot be watched, so its answer is
  // asserted by an author. R-002 analysis must be able to tell them apart.
  const nb = openNotebook({ backend: memoryBackend(), now, newId });
  nb.record(card({ outcomeSource: "asserted" }));
  assert.equal(nb.cards("physics")[0].outcomeSource, "asserted");
});

/* ── P-89: what the learner did with the cue ────────────────────────────────
 *
 * ADR 0018 defers the expertise-reversal question to a later phase and says
 * what Phase 1 owes it: the datum. The card is written the moment the outcome
 * is revealed, which is BEFORE the learner has had any chance to act on the
 * cue, so this one field is resolved afterwards. Everything else about a card
 * stays append-only — a prediction that could be edited after the fact is the
 * failure R-010 exists to prevent.
 */

test("a card says a cue was shown, and later what was done with it", () => {
  const nb = openNotebook({ backend: memoryBackend(), now, newId });
  const { card: filed } = nb.record(card({ cue: "shown" }));
  assert.equal(nb.cards("physics")[0].cue, "shown");

  const r = nb.amendCue(filed.id, "retried");
  assert.equal(r.ok, true, r.errors?.join(", "));
  assert.equal(nb.cards("physics")[0].cue, "retried");
  assert.equal(nb.export().subjects.physics[0].cue, "retried",
    "the export is how this reaches the ADR 0018 question — it must carry the response");
});

test("a cue response outlives the tab", () => {
  const backend = memoryBackend();
  const { card: filed } = openNotebook({ backend, now, newId }).record(card({ cue: "shown" }));
  openNotebook({ backend, now, newId }).amendCue(filed.id, "explained");
  assert.equal(openNotebook({ backend, now, newId }).cards("physics")[0].cue, "explained");
});

test("every cue response the surfaces can report is accepted", () => {
  // retried — predicted again (the lab). watched — replayed it without a new
  // prediction (the landing, which offers no retry). explained — reached past
  // the cue for the answer. left — did neither and moved on.
  for (const response of ["retried", "watched", "explained", "left"]) {
    const nb = openNotebook({ backend: memoryBackend(), now, newId });
    const { card: filed } = nb.record(card({ cue: "shown" }));
    assert.equal(nb.amendCue(filed.id, response).ok, true, `${response} was refused`);
    assert.equal(nb.cards("physics")[0].cue, response);
  }
});

test("a cue response that is not one of those is refused", () => {
  const nb = openNotebook({ backend: memoryBackend(), now, newId });
  const { card: filed } = nb.record(card({ cue: "shown" }));
  for (const bad of ["shown", "skipped", "", null, "RETRIED"]) {
    const r = nb.amendCue(filed.id, bad);
    assert.equal(r.ok, false, `"${bad}" should not be a cue response`);
  }
  assert.equal(nb.cards("physics")[0].cue, "shown", "a refused response must change nothing");
});

test("a response cannot be recorded against a card that was never cued", () => {
  const nb = openNotebook({ backend: memoryBackend(), now, newId });
  const { card: filed } = nb.record(card());          // right first time: no cue
  assert.equal(nb.amendCue(filed.id, "retried").ok, false);
  assert.equal(nb.cards("physics")[0].cue, undefined);
});

test("a cue response cannot be overwritten once it is given", () => {
  // The learner acts once. A second report is a bug in the surface, and the
  // honest thing is to keep the first answer rather than the loudest.
  const nb = openNotebook({ backend: memoryBackend(), now, newId });
  const { card: filed } = nb.record(card({ cue: "shown" }));
  assert.equal(nb.amendCue(filed.id, "retried").ok, true);
  assert.equal(nb.amendCue(filed.id, "explained").ok, false);
  assert.equal(nb.cards("physics")[0].cue, "retried");
});

test("amending a cue cannot touch the prediction", () => {
  const nb = openNotebook({ backend: memoryBackend(), now, newId });
  const { card: filed } = nb.record(card({ cue: "shown" }));
  const before = { ...nb.cards("physics")[0] };
  nb.amendCue(filed.id, "explained");
  const after = nb.cards("physics")[0];
  for (const k of Object.keys(before)) {
    if (k === "cue") continue;
    assert.deepEqual(after[k], before[k], `amendCue changed ${k}`);
  }
});

test("a response against an unknown card is refused, not invented", () => {
  const nb = openNotebook({ backend: memoryBackend(), now, newId });
  nb.record(card({ cue: "shown" }));
  assert.equal(nb.amendCue("no-such-card", "retried").ok, false);
  assert.equal(nb.cards("physics").length, 1, "nothing may be created by amending");
});

test("a cue response finds its card whichever subject it is in", () => {
  const nb = openNotebook({ backend: memoryBackend(), now, newId });
  nb.record(card({ subject: "physics" }));
  const { card: filed } = nb.record(card({ subject: "maths", scenario: "two-lines", cue: "shown" }));
  assert.equal(nb.amendCue(filed.id, "watched").ok, true);
  assert.equal(nb.cards("maths")[0].cue, "watched");
});

test("a cue response that cannot be written says so rather than claiming success", () => {
  const backend = memoryBackend();
  const nb = openNotebook({ backend, now, newId });
  const { card: filed } = nb.record(card({ cue: "shown" }));
  backend.setItem = () => { const e = new Error("full"); e.name = "QuotaExceededError"; throw e; };
  const r = nb.amendCue(filed.id, "retried");
  assert.equal(r.persisted, false);
  assert.ok(r.warning, "a response the device would not keep must be reported");
});

/* ── R-012: the learner writes the gap in their own words ───────────────────
 *
 * The second mechanic after the gate, and the part of the design closest to
 * the scaffolded correction the evidence supports (Chi et al. 1989; ADR 0013).
 * It is also the first card field that holds a child's own prose, so what can
 * be done to it afterwards matters as much as what it holds.
 */

test("a reconciliation is written to the card and read back", () => {
  const nb = openNotebook({ backend: memoryBackend(), now, newId });
  const { card: filed } = nb.record(card());
  const r = nb.writeReconciliation(filed.id, "I thought the heavy one would land first.");
  assert.equal(r.ok, true, r.errors?.join(", "));
  assert.equal(nb.cards("physics")[0].reconciliation, "I thought the heavy one would land first.");
});

test("a reconciliation carries its own timestamp", () => {
  // R-014: every prediction, reveal, reconciliation and confusion entry is
  // stored with a timestamp. The reveal's timestamp is not this one — the gap
  // is written afterwards, and how long afterwards is part of the dataset.
  const nb = openNotebook({ backend: memoryBackend(), now, newId });
  const { card: filed } = nb.record(card({ revealedAt: 2 }));
  nb.writeReconciliation(filed.id, "Friction was the bit I forgot.");
  const c = nb.cards("physics")[0];
  assert.equal(typeof c.reconciledAt, "number");
  assert.ok(c.reconciledAt > c.recordedAt, "written after the card was filed");
});

test("a reconciliation outlives the tab", () => {
  const backend = memoryBackend();
  const { card: filed } = openNotebook({ backend, now, newId }).record(card());
  openNotebook({ backend, now, newId }).writeReconciliation(filed.id, "I ignored the air entirely.");
  assert.equal(openNotebook({ backend, now, newId }).cards("physics")[0].reconciliation,
    "I ignored the air entirely.");
});

test("an honest short answer is long enough", () => {
  // The floor is against a stray keypress, not against brevity. A learner who
  // names the thing in three words has done what R-012 asks.
  const nb = openNotebook({ backend: memoryBackend(), now, newId });
  const { card: filed } = nb.record(card());
  assert.equal(nb.writeReconciliation(filed.id, "Air resistance.").ok, true);
});

test("a note too short to be an answer is refused, and changes nothing", () => {
  const nb = openNotebook({ backend: memoryBackend(), now, newId });
  const { card: filed } = nb.record(card());
  for (const bad of ["", "   ", "ok", "idk", "\n\t ", "x".repeat(11)]) {
    const r = nb.writeReconciliation(filed.id, bad);
    assert.equal(r.ok, false, `"${bad}" should not be fileable`);
    assert.ok(r.errors?.length, "a refusal must say why — the learner sees this");
  }
  assert.equal(nb.cards("physics")[0].reconciliation, undefined);
});

test("whitespace around an answer does not count towards its length", () => {
  const nb = openNotebook({ backend: memoryBackend(), now, newId });
  const { card: filed } = nb.record(card());
  assert.equal(nb.writeReconciliation(filed.id, "   ok    \n\n   ").ok, false,
    "padding is not an answer");
});

test("a reconciliation is stored as written, not reformatted", () => {
  // The learner's own words. Trimming the ends is not editing; anything more is.
  const nb = openNotebook({ backend: memoryBackend(), now, newId });
  const { card: filed } = nb.record(card());
  nb.writeReconciliation(filed.id, "  i thought  heavier == faster.\nIt doesn't.  ");
  assert.equal(nb.cards("physics")[0].reconciliation, "i thought  heavier == faster.\nIt doesn't.");
});

test("a reconciliation cannot be rewritten once it is given", () => {
  // A second thought is a new attempt, which is a new card — never an edit of
  // the first. Rewriting the gap after reading the explanation is exactly the
  // post-hoc account R-010 exists to keep out of the record.
  const nb = openNotebook({ backend: memoryBackend(), now, newId });
  const { card: filed } = nb.record(card());
  assert.equal(nb.writeReconciliation(filed.id, "I forgot about friction.").ok, true);
  const second = nb.writeReconciliation(filed.id, "Actually I knew that all along.");
  assert.equal(second.ok, false);
  assert.equal(nb.cards("physics")[0].reconciliation, "I forgot about friction.");
});

test("writing a reconciliation cannot touch the prediction", () => {
  const nb = openNotebook({ backend: memoryBackend(), now, newId });
  const { card: filed } = nb.record(card({ cue: "shown" }));
  const before = { ...nb.cards("physics")[0] };
  nb.writeReconciliation(filed.id, "The push was smaller than friction.");
  const after = nb.cards("physics")[0];
  for (const k of Object.keys(before)) {
    if (k === "reconciliation" || k === "reconciledAt") continue;
    assert.deepEqual(after[k], before[k], `writeReconciliation changed ${k}`);
  }
});

test("a reconciliation against an unknown card is refused, not invented", () => {
  const nb = openNotebook({ backend: memoryBackend(), now, newId });
  nb.record(card());
  assert.equal(nb.writeReconciliation("no-such-card", "I forgot about friction.").ok, false);
  assert.equal(nb.cards("physics").length, 1);
});

test("the learner's own words leave with the rest of the notebook", () => {
  // Both halves of P-44: the dataset is the deliverable (R-014), so the export
  // must carry the prose — and the learner can destroy it, so forget() must
  // take it with the card rather than leaving it somewhere else.
  const nb = openNotebook({ backend: memoryBackend(), now, newId });
  const { card: filed } = nb.record(card());
  nb.writeReconciliation(filed.id, "I was sure the heavier one wins.");
  assert.equal(nb.export().subjects.physics[0].reconciliation, "I was sure the heavier one wins.");
  nb.forget("physics");
  assert.equal(JSON.stringify(nb.export()).includes("heavier one wins"), false,
    "forgetting a subject must take the learner's words with it");
});

test("a reconciliation that cannot be written says so rather than claiming success", () => {
  const backend = memoryBackend();
  const nb = openNotebook({ backend, now, newId });
  const { card: filed } = nb.record(card());
  backend.setItem = () => { const e = new Error("full"); e.name = "QuotaExceededError"; throw e; };
  const r = nb.writeReconciliation(filed.id, "I forgot about friction.");
  assert.equal(r.persisted, false);
  assert.ok(r.warning);
});

/* ── R-013: one-tap confusion logging ───────────────────────────────────────
 *
 * The opposite rule to R-012's floor, and deliberately so. spec/04 calls the
 * log "deliberately almost empty" and says a tap with no words is still the
 * signal. A field that costs more than two seconds will not be filled.
 */

test("a tap with no words is a complete entry", () => {
  const nb = openNotebook({ backend: memoryBackend(), now, newId });
  const r = nb.logConfusion({ subject: "physics", scenario: "truck-and-fly" });
  assert.equal(r.ok, true, r.errors?.join(", "));
  const [e] = nb.confusions();
  assert.equal(e.scenario, "truck-and-fly");
  assert.equal(e.text, undefined, "words are optional — their absence is not a failure");
  assert.equal(typeof e.loggedAt, "number", "R-014: timestamped");
  assert.equal(e.resolvedAt, null, "a new confusion is open");
});

test("a confusion can carry words if the learner has any", () => {
  const nb = openNotebook({ backend: memoryBackend(), now, newId });
  nb.logConfusion({ subject: "physics", scenario: "truck-and-fly", text: "why are they equal?" });
  assert.equal(nb.confusions()[0].text, "why are they equal?");
});

test("words can be added after the tap, which is the point of the tap", () => {
  // One tap, then the learner decides whether to say more. Requiring the words
  // first is what makes a log cost more than two seconds.
  const nb = openNotebook({ backend: memoryBackend(), now, newId });
  const { entry } = nb.logConfusion({ subject: "physics", scenario: "truck-and-fly" });
  assert.equal(nb.addConfusionWords(entry.id, "  the fly bit  ").ok, true);
  assert.equal(nb.confusions()[0].text, "the fly bit");
});

test("empty words are not an entry's words", () => {
  const nb = openNotebook({ backend: memoryBackend(), now, newId });
  const { entry } = nb.logConfusion({ subject: "physics", scenario: "truck-and-fly" });
  assert.equal(nb.addConfusionWords(entry.id, "   ").ok, false);
  assert.equal(nb.confusions()[0].text, undefined);
});

test("words are written once, like every other thing the learner writes", () => {
  const nb = openNotebook({ backend: memoryBackend(), now, newId });
  const { entry } = nb.logConfusion({ subject: "physics", scenario: "truck-and-fly" });
  nb.addConfusionWords(entry.id, "the fly bit");
  assert.equal(nb.addConfusionWords(entry.id, "actually nothing").ok, false);
  assert.equal(nb.confusions()[0].text, "the fly bit");
});

test("a confusion is resolved when the learner says so", () => {
  // R-004, and spec/04 is explicit: set when the learner says so, not when a
  // teacher decides. Nothing else in the codebase may set it.
  const nb = openNotebook({ backend: memoryBackend(), now, newId });
  const { entry } = nb.logConfusion({ subject: "physics", scenario: "truck-and-fly" });
  assert.equal(nb.resolveConfusion(entry.id).ok, true);
  const [e] = nb.confusions();
  assert.equal(typeof e.resolvedAt, "number");
  assert.ok(e.resolvedAt > e.loggedAt);
});

test("a confusion cannot be resolved twice, or resolved from nowhere", () => {
  const nb = openNotebook({ backend: memoryBackend(), now, newId });
  const { entry } = nb.logConfusion({ subject: "physics", scenario: "truck-and-fly" });
  nb.resolveConfusion(entry.id);
  assert.equal(nb.resolveConfusion(entry.id).ok, false);
  assert.equal(nb.resolveConfusion("no-such-entry").ok, false);
});

test("open confusions can be found for the item in view", () => {
  // What the lab needs on mount: is this learner already stuck on this one?
  const nb = openNotebook({ backend: memoryBackend(), now, newId });
  const a = nb.logConfusion({ subject: "physics", scenario: "truck-and-fly" }).entry;
  nb.logConfusion({ subject: "physics", scenario: "what-keeps-it-moving" });
  assert.equal(nb.openConfusion("truck-and-fly")?.id, a.id);
  nb.resolveConfusion(a.id);
  assert.equal(nb.openConfusion("truck-and-fly"), null, "a resolved one is not open");
});

test("a confusion logged with nothing in view is still a confusion", () => {
  // spec/04: context is "Card or item in view when logged, IF ANY".
  const nb = openNotebook({ backend: memoryBackend(), now, newId });
  assert.equal(nb.logConfusion().ok, true);
  assert.equal(nb.confusions().length, 1);
});

test("confusion entries outlive the tab", () => {
  const backend = memoryBackend();
  openNotebook({ backend, now, newId }).logConfusion({ subject: "physics", scenario: "s" });
  assert.equal(openNotebook({ backend, now, newId }).confusions().length, 1);
});

test("a notebook written before the log existed still opens", () => {
  // Older notebooks have no confusions key. Treating that as unreadable would
  // set a learner's whole record aside and start them fresh.
  const backend = memoryBackend();
  const nb = openNotebook({ backend, now, newId });
  nb.record(card());
  const raw = JSON.parse(backend.getItem(STORAGE_KEY));
  delete raw.confusions;
  backend.setItem(STORAGE_KEY, JSON.stringify(raw));
  const reopened = openNotebook({ backend, now, newId });
  assert.equal(reopened.cards("physics").length, 1, "the cards must survive");
  assert.deepEqual(reopened.confusions(), []);
  assert.equal(reopened.logConfusion({ subject: "physics", scenario: "s" }).ok, true);
});

test("confusions can be read for one subject at a time", () => {
  const nb = openNotebook({ backend: memoryBackend(), now, newId });
  nb.logConfusion({ subject: "physics", scenario: "a" });
  nb.logConfusion({ subject: "maths", scenario: "b" });
  assert.deepEqual(nb.confusions("maths").map((e) => e.scenario), ["b"]);
});

test("forgetting a subject forgets what confused them in it", () => {
  const nb = openNotebook({ backend: memoryBackend(), now, newId });
  nb.logConfusion({ subject: "physics", scenario: "a", text: "the whole thing" });
  nb.logConfusion({ subject: "maths", scenario: "b" });
  nb.forget("physics");
  assert.equal(JSON.stringify(nb.export()).includes("the whole thing"), false,
    "forget left the learner's words behind in the confusion log");
  assert.deepEqual(nb.confusions().map((e) => e.subject), ["maths"]);
});

test("the export carries the confusion log", () => {
  const nb = openNotebook({ backend: memoryBackend(), now, newId });
  nb.logConfusion({ subject: "physics", scenario: "a" });
  assert.equal(nb.export().confusions.length, 1, "R-014: the dataset is the deliverable");
});

test("a confusion that cannot be written says so rather than claiming success", () => {
  const backend = memoryBackend();
  const nb = openNotebook({ backend, now, newId });
  backend.setItem = () => { const e = new Error("full"); e.name = "QuotaExceededError"; throw e; };
  const r = nb.logConfusion({ subject: "physics", scenario: "a" });
  assert.equal(r.persisted, false);
  assert.ok(r.warning);
  assert.equal(nb.confusions().length, 1, "and it stays visible until the tab closes");
});
