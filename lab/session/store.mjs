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
// A store written before links existed has no `links`. That is a store we
// understand, not a corrupt one.
const blank = () => ({ version: VERSION, sessions: [], links: [] });

/**
 * One edge, in one order, so a link cannot half-exist.
 *
 * Links are symmetric: if quadratics relates to straight lines, the reverse
 * holds. A direction would be a claim about learning order — "builds on" —
 * and nothing here measures that. Stored once rather than as a list on each
 * side, because two lists that must agree are two lists that can disagree.
 */
const edge = (a, b) => (a < b ? [a, b] : [b, a]);
const sameEdge = (x, y) => x[0] === y[0] && x[1] === y[1];

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
    const data = read();
    data.links ??= [];
    return data;
  }

  function read() {
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

      const session = { id: newId(), startedAt: now(), touchedAt: now(), notes: [], scenarios: [] };
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
      const session = load().sessions.find((s) => s.id === id) ?? null;
      // Sessions written before scenarios could be composed have no list.
      // That is a session we understand, not a broken one.
      if (session && !session.scenarios) session.scenarios = [];
      return session;
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

    /**
     * Keep a scenario composed for this session (P-96, ADR 0023).
     *
     * Only ever called with a spec that has already survived the answer check
     * — lab/model/compose.mjs is the only caller, and nothing that failed
     * reaches it. This store does not re-run the check and must not be
     * mistaken for the thing that does.
     */
    keep(id, spec) {
      if (!spec?.id) return { ok: false, errors: ["a scenario needs an id"] };
      return change(id, (session) => {
        session.scenarios ??= [];
        if (!session.scenarios.some((x) => x.id === spec.id)) session.scenarios.push(spec);
        return null;
      });
    },

    /**
     * Link two sessions (P-100). Symmetric, and idempotent: saying it twice
     * is saying it once.
     */
    link(a, b) {
      const data = load();
      if (a === b) return { ok: false, errors: ["a topic is already itself"] };
      const both = [a, b].every((id) => data.sessions.some((x) => x.id === id));
      if (!both) return { ok: false, errors: ["no session with that id"] };

      const e = edge(a, b);
      if (!data.links.some((x) => sameEdge(x, e))) data.links.push(e);
      for (const id of [a, b]) {
        const session = data.sessions.find((x) => x.id === id);
        session.touchedAt = now();
      }
      return { ok: true, ...save(data) };
    },

    /** Either end can undo it. */
    unlink(a, b) {
      const data = load();
      const e = edge(a, b);
      const before = data.links.length;
      data.links = data.links.filter((x) => !sameEdge(x, e));
      if (data.links.length === before) return { ok: false, errors: ["those were not linked"] };
      return { ok: true, ...save(data) };
    },

    /** Which sessions this one is linked to, derived rather than stored. */
    linksOf(id) {
      return load().links.filter((e) => e.includes(id)).map((e) => (e[0] === id ? e[1] : e[0]));
    },

    /**
     * Groups, as the connected components of the link graph.
     *
     * The vision asks for topics that link to each other OR group together.
     * These are the same thing: a group is what the links already say, so
     * there is no second structure to keep in step with the first. A chain —
     * a links b, b links c — is one group, because all three belong together
     * even though a and c were never linked directly.
     */
    groups() {
      const data = load();
      const neighbours = new Map(data.sessions.map((s) => [s.id, []]));
      for (const [a, b] of data.links) {
        if (!neighbours.has(a) || !neighbours.has(b)) continue;
        neighbours.get(a).push(b);
        neighbours.get(b).push(a);
      }
      const seen = new Set();
      const out = [];
      for (const s of data.sessions) {
        if (seen.has(s.id)) continue;
        const group = [];
        const queue = [s.id];
        seen.add(s.id);
        while (queue.length) {
          const id = queue.shift();
          group.push(id);
          for (const next of neighbours.get(id) ?? [])
            if (!seen.has(next)) { seen.add(next); queue.push(next); }
        }
        out.push(group);
      }
      return out;
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
      // A link to something that no longer exists is a dead row in the store
      // and a button on the page that goes nowhere.
      data.links = data.links.filter((e) => !e.includes(id));
      return { ok: true, ...save(data) };
    },

    /** Everything, so the learner can take it with them. */
    export() {
      const data = load();
      return { version: VERSION, exportedAt: now(), sessions: data.sessions, links: data.links };
    },
  };
}
