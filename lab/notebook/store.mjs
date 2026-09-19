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

export function openNotebook({ backend, now = Date.now, newId = defaultId } = {}) {
  let store = backend ?? browserBackend();
  let persistent = !!store;
  let data = { version: VERSION, subjects: {} };

  // ---- load --------------------------------------------------------------
  if (store) {
    let raw = null;
    try {
      raw = store.getItem(STORAGE_KEY);
    } catch {
      store = null;
      persistent = false;
    }
    if (raw !== null && raw !== undefined) {
      let parsed = null;
      try { parsed = JSON.parse(raw); } catch { /* handled below */ }
      if (parsed && parsed.version === VERSION && parsed.subjects && typeof parsed.subjects === "object") {
        data = parsed;
      } else {
        // Unreadable, or written by a version we do not understand. Keep the
        // original bytes where they can be recovered; never overwrite them.
        try { store.setItem(`${STORAGE_KEY}.unreadable.${now()}`, raw); } catch { /* best effort */ }
      }
    }
  }

  function save() {
    if (!store) return { persisted: false };
    try {
      store.setItem(STORAGE_KEY, JSON.stringify(data));
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
      (data.subjects[card.subject] ??= []).push(card);

      return { ok: true, card, ...save() };
    },

    cards(subject) {
      return (data.subjects[subject] ?? []).slice();
    },

    subjects() {
      return Object.keys(data.subjects).filter((s) => data.subjects[s].length > 0);
    },

    /** Everything, so the learner can take it with them. */
    export() {
      return { version: VERSION, exportedAt: now(), subjects: structuredClone(data.subjects) };
    },

    /** The learner's call, one subject at a time. */
    forget(subject) {
      delete data.subjects[subject];
      save();
    },
  };
}
