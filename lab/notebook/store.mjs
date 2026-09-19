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
const KEPT = ["subject", "scenario", "choice", "confidence", "observed", "correct",
              "unlisted", "params", "committedAt", "revealedAt"];

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
const blank = () => ({ version: VERSION, subjects: {} });

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
    return data;
  }

  function save(data) {
    if (!store) { memory = data; return { persisted: false }; }
    try {
      store.setItem(STORAGE_KEY, JSON.stringify(data));
      unsaved = [];
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

    cards(subject) {
      return (current().subjects[subject] ?? []).slice();
    },

    subjects() {
      const data = current();
      return Object.keys(data.subjects).filter((s) => data.subjects[s].length > 0);
    },

    /** Everything, so the learner can take it with them. */
    export() {
      return { version: VERSION, exportedAt: now(), subjects: current().subjects };
    },

    /** The learner's call, one subject at a time. */
    forget(subject) {
      const data = current();
      delete data.subjects[subject];
      unsaved = unsaved.filter((c) => c.subject !== subject);
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
