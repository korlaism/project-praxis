// SPDX-License-Identifier: AGPL-3.0-or-later
/**
 * Notebook v0 — a learner's predictions, kept on their own device.
 *
 * One notebook per subject (ADR 0006). Browser-local by design: nothing leaves
 * the device, which keeps the consent question small (P-44) and defers the
 * account question entirely. The card shape follows spec/04-data-model.md,
 * which was written for a spreadsheet and turns out to be the same object.
 *
 * Two things it will not do, whatever else goes wrong:
 *   - destroy a record it cannot read. It sets the bytes aside and starts fresh.
 *   - take the page down. No storage, a full disk, a sandboxed frame — the
 *     learner can still play; the notebook just says it cannot keep the card.
 */

export const STORAGE_KEY = "praxis.notebook.v1";
const VERSION = 1;
const REQUIRED = ["subject", "scenario", "choice"];
// attempt/retryOf carry ADR 0014's retries: a second try is its own card that
// points at the first, never an edit of it (R-014). Without them a retry would
// file as an indistinguishable second card and the link would be lost.
// session (P-95) says which session the prediction was made inside, so the
// record can be read a topic at a time. An id of a container, not of a person.
// cue carries ADR 0018's deferred question (P-89): null when none was shown,
// "shown" until the learner acts, then what they did. It is the only field a
// card can gain after filing, because the card is written at the reveal and
// the learner has not acted yet.
const KEPT = ["subject", "scenario", "choice", "confidence", "observed", "correct",
              "unlisted", "errorTag", "outcomeSource", "params", "committedAt", "revealedAt",
              "attempt", "retryOf", "cue", "reconciliation", "reconciledAt", "session"];

/**
 * What a learner can do with a cue, in the two surfaces that show one.
 *
 *   retried    predicted again — the lab
 *   watched    ran it again without a new prediction — the landing, which has
 *              no retry to offer, so this is what taking the cue looks like there
 *   explained  reached past the cue and asked for the answer
 *   left       did neither and moved on
 *
 * A card still reading "shown" is one where we never found out — the tab
 * closed on the verdict. That is not the same as "left" and is not recorded
 * as it.
 */
export const CUE_RESPONSES = ["retried", "watched", "explained", "left"];

/**
 * The shortest thing that can be filed as a reconciliation (R-012).
 *
 * A floor against a stray keypress, not a quality bar. "Air resistance." is a
 * complete answer and clears it; "idk" does not. The number is arbitrary and
 * says so — spec/03 puts commit degeneracy (K-03) in the hands of a human
 * auditor and explicitly does not infer it, so nothing here may try to judge
 * whether an answer is any good.
 */
export const MIN_RECONCILIATION = 12;

/**
 * What a confusion entry is allowed to be about (R-013).
 *
 * Kept separate from KEPT, and checked separately in privacy.test.mjs: a
 * second record type that reused the card's whitelist would be a second shape
 * nobody had looked at. spec/04 calls this log "deliberately almost empty".
 *
 * The opposite rule to a reconciliation applies to `text` — it is optional on
 * purpose, because a tap with no words is still the signal, and a field that
 * costs more than two seconds will not be filled at all.
 */
const CONFUSION_KEPT = ["subject", "scenario", "card", "text"];

/** An in-memory stand-in for localStorage, for tests and as a last resort. */
export function memoryBackend() {
  const m = new Map();
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => void m.set(k, String(v)),
    removeItem: (k) => void m.delete(k),
    keys: () => [...m.keys()],
  };
}

/** localStorage if it exists and actually works, otherwise null. */
function browserBackend() {
  try {
    if (typeof localStorage === "undefined") return null;
    const probe = STORAGE_KEY + ".probe";
    localStorage.setItem(probe, "1");
    localStorage.removeItem(probe);
    return {
      getItem: (k) => localStorage.getItem(k),
      setItem: (k, v) => localStorage.setItem(k, v),
      removeItem: (k) => localStorage.removeItem(k),
      keys: () => Array.from({ length: localStorage.length }, (_, i) => localStorage.key(i)),
    };
  } catch {
    return null;
  }
}

function defaultId() {
  return globalThis.crypto?.randomUUID?.() ??
    `c-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

const isNotebook = (d) => d && d.version === VERSION && d.subjects && typeof d.subjects === "object";
// A notebook written before the confusion log existed has no `confusions`
// key. That is a notebook we understand, not a corrupt one — treating it as
// unreadable would set a learner's whole record aside and start them fresh.
const blank = () => ({ version: VERSION, subjects: {}, confusions: [] });

/**
 * Open the notebook.
 *
 * Every operation works against what is ACTUALLY in storage at that moment,
 * never against a copy loaded when the notebook was opened. Holding a copy was
 * the P-55 data loss: with two tabs open, whichever saved second wrote its
 * stale copy over the other's cards. Reading, changing and writing within one
 * synchronous step is as close to atomic as localStorage allows.
 *
 * @param events  where "storage" events arrive from — other tabs announcing
 *                changes. Defaults to the page's global object.
 */
export function openNotebook({ backend, now = Date.now, newId = defaultId, events = globalThis } = {}) {
  let store = backend ?? browserBackend();
  let persistent = !!store;
  let memory = blank();          // the whole notebook, when there is no storage at all
  let unsaved = [];              // cards this session could not write, kept visible and retried
  let unsavedLog = [];           // the same, for confusion entries

  /** Keep unreadable bytes recoverable — once, however often they are read. */
  function setAside(raw) {
    try {
      const already = (store.keys?.() ?? []).some(
        (k) => k.startsWith(`${STORAGE_KEY}.unreadable.`) && store.getItem(k) === raw);
      if (!already) store.setItem(`${STORAGE_KEY}.unreadable.${now()}`, raw);
    } catch { /* best effort: failing to copy is not a reason to lose the page */ }
  }

  function load() {
    if (!store) return structuredClone(memory);
    let raw;
    try {
      raw = store.getItem(STORAGE_KEY);
    } catch {
      store = null;
      persistent = false;
      return structuredClone(memory);
    }
    if (raw === null || raw === undefined) return blank();
    let parsed = null;
    try { parsed = JSON.parse(raw); } catch { /* handled below */ }
    if (isNotebook(parsed)) return parsed;
    // Unreadable, or written by a version we do not understand. Its bytes are
    // copied aside before anything can overwrite them.
    setAside(raw);
    return blank();
  }

  /** What is stored, plus anything this session could not store yet. */
  function current() {
    const data = load();
    for (const c of unsaved) {
      const list = (data.subjects[c.subject] ??= []);
      if (!list.some((x) => x.id === c.id)) list.push(c);
    }
    data.confusions ??= [];
    for (const e of unsavedLog)
      if (!data.confusions.some((x) => x.id === e.id)) data.confusions.push(e);
    return data;
  }

  /** The entry with this id, wherever it is. */
  function findConfusion(data, id) {
    return data.confusions.find((e) => e.id === id) ?? null;
  }

  function save(data) {
    if (!store) { memory = data; return { persisted: false }; }
    try {
      store.setItem(STORAGE_KEY, JSON.stringify(data));
      unsaved = [];
      unsavedLog = [];
      return { persisted: true };
    } catch (e) {
      const full = e && (e.name === "QuotaExceededError" || /quota|full/i.test(String(e.message)));
      return {
        persisted: false,
        warning: full
          ? "The device is out of space for the notebook — this card is kept only until the tab closes."
          : "The notebook could not be saved — this card is kept only until the tab closes.",
      };
    }
  }

  load();   // probe once, so `persistent` is honest from the start

  return {
    get persistent() { return persistent; },

    /** Validate and keep a card. Never half-stores. */
    record(input) {
      const errors = REQUIRED
        .filter((k) => typeof input?.[k] !== "string" || !input[k])
        .map((k) => `a card needs ${k}`);
      if (errors.length) return { ok: false, errors };

      const card = { id: newId(), recordedAt: now() };
      for (const k of KEPT) if (input[k] !== undefined) card[k] = input[k];

      const data = current();
      (data.subjects[card.subject] ??= []).push(card);
      const result = save(data);
      if (!result.persisted && store) unsaved.push(card);
      return { ok: true, card, ...result };
    },

    /**
     * Resolve what the learner did with a cue (P-89, ADR 0018).
     *
     * Narrow on purpose. It reaches one field, on a card that is waiting for
     * it, once. Everything else about a card stays append-only — a prediction
     * that could be edited after the outcome is known is exactly the failure
     * R-010 exists to prevent, and this must not become the hole in it.
     *
     * A device that will not take the write loses the response and says so.
     * That is a lost answer to a secondary question, not a lost prediction.
     */
    amendCue(id, response) {
      if (!CUE_RESPONSES.includes(response))
        return { ok: false, errors: [`"${response}" is not a cue response`] };

      const data = current();
      let card = null;
      for (const list of Object.values(data.subjects)) {
        card = list.find((c) => c.id === id);
        if (card) break;
      }
      if (!card) return { ok: false, errors: ["no card with that id"] };
      if (card.cue !== "shown")
        return { ok: false, errors: [card.cue
          ? `that cue was already answered with "${card.cue}"`
          : "no cue was shown on that card"] };

      card.cue = response;
      return { ok: true, card, ...save(data) };
    },

    /**
     * The learner's own words about the gap (R-012).
     *
     * Written once. A second thought is a new attempt, which is a new card —
     * never an edit of this one. Rewriting the gap after reading the
     * explanation would file a post-hoc account as if it were the learner's
     * own first reckoning, which is the thing the gate exists to prevent.
     *
     * Trimmed at the ends and otherwise stored exactly as typed. Spelling,
     * punctuation and capitals are the learner's, and ADR 0002 says nothing
     * else writes here.
     */
    writeReconciliation(id, text) {
      const words = typeof text === "string" ? text.trim() : "";
      if (words.length < MIN_RECONCILIATION)
        return { ok: false, errors: [words
          ? "A few more words — what did you expect, and what happened instead?"
          : "Write the gap in your own words before filing it."] };

      const data = current();
      let card = null;
      for (const list of Object.values(data.subjects)) {
        card = list.find((c) => c.id === id);
        if (card) break;
      }
      if (!card) return { ok: false, errors: ["no card with that id"] };
      if (card.reconciliation !== undefined)
        return { ok: false, errors: ["that gap has already been written up"] };

      card.reconciliation = words;
      // R-014 wants the reconciliation timestamped in its own right: how long
      // after the reveal it was written is part of the dataset, not noise.
      card.reconciledAt = now();
      return { ok: true, card, ...save(data) };
    },

    /* ---- the confusion log (R-013) ------------------------------------
     *
     * One tap. Nothing is required after it, nothing is validated, and the
     * item in view is optional — spec/04 says "card or item in view when
     * logged, IF ANY". The only expensive thing here would be a rule, and a
     * rule is what makes a two-second field cost more than two seconds.
     */
    logConfusion(about = {}) {
      const entry = { id: newId(), loggedAt: now(), resolvedAt: null };
      for (const k of CONFUSION_KEPT) {
        const v = about[k];
        if (typeof v === "string" ? v.trim() : v) entry[k] = typeof v === "string" ? v.trim() : v;
      }

      const data = current();
      data.confusions.push(entry);
      const result = save(data);
      if (!result.persisted && store) unsavedLog.push(entry);
      return { ok: true, entry, ...result };
    },

    /**
     * Say more, having already tapped. Written once, like everything else the
     * learner writes — but unlike a reconciliation there is no floor, because
     * here the words were never the point.
     */
    addConfusionWords(id, text) {
      const words = typeof text === "string" ? text.trim() : "";
      if (!words) return { ok: false, errors: ["there are no words there"] };

      const data = current();
      const entry = findConfusion(data, id);
      if (!entry) return { ok: false, errors: ["no confusion with that id"] };
      if (entry.text !== undefined) return { ok: false, errors: ["that one already has words"] };

      entry.text = words;
      return { ok: true, entry, ...save(data) };
    },

    /**
     * Closed by the learner, and only ever by the learner (R-004). spec/04 is
     * explicit that a teacher deciding it is resolved does not make it so, and
     * neither does the learner having since seen the answer.
     */
    resolveConfusion(id) {
      const data = current();
      const entry = findConfusion(data, id);
      if (!entry) return { ok: false, errors: ["no confusion with that id"] };
      if (entry.resolvedAt !== null) return { ok: false, errors: ["that one is already settled"] };

      entry.resolvedAt = now();
      return { ok: true, entry, ...save(data) };
    },

    confusions(subject) {
      const all = current().confusions;
      return (subject ? all.filter((e) => e.subject === subject) : all).slice();
    },

    /** The open confusion about this item, if the learner already has one. */
    openConfusion(scenario) {
      return current().confusions.find((e) => e.scenario === scenario && e.resolvedAt === null)
        ?? null;
    },

    cards(subject) {
      return (current().subjects[subject] ?? []).slice();
    },

    subjects() {
      const data = current();
      return Object.keys(data.subjects).filter((s) => data.subjects[s].length > 0);
    },

    /** Everything, so the learner can take it with them. */
    export() {
      const data = current();
      return { version: VERSION, exportedAt: now(), subjects: data.subjects,
               confusions: data.confusions };
    },

    /** The learner's call, one subject at a time. */
    forget(subject) {
      const data = current();
      delete data.subjects[subject];
      // The log goes with them. A learner who destroys a subject and finds
      // their own words about it still sitting in another list has not been
      // given what the button said.
      data.confusions = data.confusions.filter((e) => e.subject !== subject);
      unsaved = unsaved.filter((c) => c.subject !== subject);
      unsavedLog = unsavedLog.filter((e) => e.subject !== subject);
      save(data);
    },

    /**
     * Hear about changes made in another tab. Returns an unsubscribe function.
     * A null key means another tab cleared storage outright.
     */
    subscribe(fn) {
      if (typeof events?.addEventListener !== "function") return () => {};
      const onStorage = (e) => { if (e?.key === STORAGE_KEY || e?.key === null) fn(); };
      events.addEventListener("storage", onStorage);
      return () => events.removeEventListener("storage", onStorage);
    },
  };
}
