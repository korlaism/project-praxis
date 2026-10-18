// SPDX-License-Identifier: AGPL-3.0-or-later
/**
 * Sessions — a topic, the notes written in it, and somewhere to come back to.
 *
 * ADR 0022, P-95. The first piece of the product shell: you open the lab,
 * you say what you want to work on, and what you were doing last time is
 * waiting underneath.
 *
 * Its own store rather than a corner of the notebook. A session is a
 * CONTAINER for what the learner did; the notebook is what they did. Keeping
 * them apart means a session can be dropped without touching the record of
 * the predictions made inside it, which is the behaviour a learner expects
 * from "close this" and not from "delete my work".
 *
 * The notes here are not R-012's reconciliation. That one is bound to a
 * single reveal and is written once. These are the learner's own running
 * notes on a topic, unlimited, and the thing the vision means by "notes that
 * only you can write".
 */

export const SESSIONS_KEY = "praxis.sessions.v1";
const VERSION = 1;
// What a session is allowed to hold, checked in privacy.test.mjs the way the
// card and the confusion entry are. `topic` and note `text` are the learner's
// own words; nothing here is about who they are.
const KEPT = ["topic"];

const isStore = (d) => d && d.version === VERSION && Array.isArray(d.sessions);
const blank = () => ({ version: VERSION, sessions: [] });

function defaultId() {
  return globalThis.crypto?.randomUUID?.() ??
    `s-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/** localStorage if it exists and actually works, otherwise null. */
function browserBackend() {
  try {
    if (typeof localStorage === "undefined") return null;
    const probe = SESSIONS_KEY + ".probe";
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

export function openSessions({ backend, now = Date.now, newId = defaultId } = {}) {
  let store = backend ?? browserBackend();
  let memory = blank();
  let unsaved = false;          // this session's work, kept visible until it can be written

  /** Keep unreadable bytes recoverable — the notebook's promise, kept here too. */
  function setAside(raw) {
    try {
      const already = (store.keys?.() ?? []).some(
        (k) => k.startsWith(`${SESSIONS_KEY}.unreadable.`) && store.getItem(k) === raw);
      if (!already) store.setItem(`${SESSIONS_KEY}.unreadable.${now()}`, raw);
    } catch { /* best effort: failing to copy is not a reason to lose the page */ }
  }

  function load() {
    if (!store || unsaved) return memory;
    let raw;
    try { raw = store.getItem(SESSIONS_KEY); } catch { store = null; return memory; }
    if (raw === null || raw === undefined) return blank();
    let parsed = null;
    try { parsed = JSON.parse(raw); } catch { /* handled below */ }
    if (isStore(parsed)) return parsed;
    setAside(raw);
    return blank();
  }

  function save(data) {
    memory = data;
    if (!store) return { persisted: false };
    try {
      store.setItem(SESSIONS_KEY, JSON.stringify(data));
      unsaved = false;
      return { persisted: true };
    } catch {
      unsaved = true;
      return {
        persisted: false,
        warning: "This browser would not keep the session — it will be gone when the tab closes.",
      };
    }
  }

  const words = (t) => (typeof t === "string" ? t.trim() : "");

  /** Find a session and apply a change to it, or say why not. */
  function change(id, fn) {
    const data = load();
    const session = data.sessions.find((s) => s.id === id);
    if (!session) return { ok: false, errors: ["no session with that id"] };
    const refused = fn(session);
    if (refused) return refused;
    session.touchedAt = now();
    return { ok: true, session, ...save(data) };
  }

  return {
    /** Start a session on whatever the learner typed. */
    start(topic) {
      const t = words(topic);
      if (!t) return { ok: false, errors: ["say what you want to work on"] };

      const session = { id: newId(), startedAt: now(), touchedAt: now(), notes: [] };
      for (const k of KEPT) if (k === "topic") session[k] = t;

      const data = load();
      data.sessions.push(session);
      return { ok: true, session, ...save(data) };
    },

    /** Most recently touched first — the list is for resuming. */
    list() {
      return load().sessions.slice().sort((a, b) => b.touchedAt - a.touchedAt);
    },

    get(id) {
      return load().sessions.find((s) => s.id === id) ?? null;
    },

    /** Say you were here. Opening a session counts; so does working in it. */
    touch(id) {
      return change(id, () => null);
    },

    /**
     * A note, in the learner's own words. Unlimited, kept in the order
     * written, and never edited afterwards — what they thought on Tuesday is
     * not what they think now, and both are worth having.
     *
     * Nothing else writes here. ADR 0002 and R-015 are about the notebook's
     * own fields, and this is the field the vision means by "notes that only
     * you can write".
     */
    note(id, text) {
      const t = words(text);
      if (!t) return { ok: false, errors: ["there are no words there"] };
      return change(id, (session) => {
        session.notes.push({ id: newId(), writtenAt: now(), text: t });
        return null;
      });
    },

    /** A topic typed at the start is a first guess, not a commitment. */
    rename(id, topic) {
      const t = words(topic);
      if (!t) return { ok: false, errors: ["a session needs a topic"] };
      return change(id, (session) => { session.topic = t; return null; });
    },

    /**
     * Close a session for good, taking its notes with it. The predictions
     * made inside it stay in the notebook, which is the learner's record and
     * is theirs to clear separately.
     */
    drop(id) {
      const data = load();
      const before = data.sessions.length;
      data.sessions = data.sessions.filter((s) => s.id !== id);
      if (data.sessions.length === before) return { ok: false, errors: ["no session with that id"] };
      return { ok: true, ...save(data) };
    },

    /** Everything, so the learner can take it with them. */
    export() {
      return { version: VERSION, exportedAt: now(), sessions: load().sessions };
    },
  };
}
