// SPDX-License-Identifier: AGPL-3.0-or-later
/**
 * Snapshots — a scenario, exactly as the learner had it, kept. P-43.
 *
 * ADR 0007 stores scenarios as SPECIFICATIONS rather than as code, and this
 * is what that buys: a snapshot is the spec plus the parameters the learner
 * actually dialled plus a timestamp. Small, and replayable by construction.
 *
 * No seed. The ticket asked for one, and nothing in a run is random — every
 * primitive steps deterministically from its parameters, which `runHeadless`
 * already relies on and `analytic.test.mjs` now checks. A seed would be a
 * field nothing reads, suggesting a reproducibility problem we do not have.
 *
 * The whole spec is carried rather than an id. A generated scenario lives in
 * the session it was composed for (P-96); drop that session and a card
 * pointing at it has nothing to re-open. A snapshot depends on nothing else.
 *
 * The note is the learner's, written once, and nothing else writes it —
 * ADR 0002 and R-015, the same rule as the reconciliation and session notes.
 */
export const SNAPSHOTS_KEY = "praxis.snapshots.v1";
const VERSION = 1;
// What a snapshot is allowed to hold, checked in privacy.test.mjs alongside
// the card and the confusion entry. `spec` and `params` are the scenario, not
// the person; `note` is the learner's own words about it.
const KEPT = ["spec", "params", "note", "session"];

const isStore = (d) => d && d.version === VERSION && Array.isArray(d.snapshots);
const blank = () => ({ version: VERSION, snapshots: [] });

function defaultId() {
  return globalThis.crypto?.randomUUID?.() ??
    `k-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function browserBackend() {
  try {
    if (typeof localStorage === "undefined") return null;
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

export function openSnapshots({ backend, now = Date.now, newId = defaultId } = {}) {
  let store = backend ?? browserBackend();
  let memory = blank();
  let unsaved = false;

  /** Keep unreadable bytes recoverable — the notebook's promise, kept here too. */
  function setAside(raw) {
    try {
      const already = (store.keys?.() ?? []).some(
        (k) => k.startsWith(`${SNAPSHOTS_KEY}.unreadable.`) && store.getItem(k) === raw);
      if (!already) store.setItem(`${SNAPSHOTS_KEY}.unreadable.${now()}`, raw);
    } catch { /* best effort */ }
  }

  function load() {
    if (!store || unsaved) return memory;
    let raw;
    try { raw = store.getItem(SNAPSHOTS_KEY); } catch { store = null; return memory; }
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
      store.setItem(SNAPSHOTS_KEY, JSON.stringify(data));
      unsaved = false;
      return { persisted: true };
    } catch {
      unsaved = true;
      return { persisted: false,
               warning: "This browser would not keep the snapshot — it will be gone when the tab closes." };
    }
  }

  const words = (t) => (typeof t === "string" ? t.trim() : "");

  return {
    /** Keep this scenario, as it is right now. */
    take({ spec, params, session = null } = {}) {
      // A wrapped scenario (ADR 0009) has an embed instead of a primitive and
      // is still a scenario. Requiring a primitive quietly refused to keep
      // one, and the refusal looked like a button that did nothing.
      if (!spec?.id || !(spec.primitive || spec.embed))
        return { ok: false, errors: ["a snapshot needs a scenario to be a snapshot of"] };

      const snapshot = { id: newId(), takenAt: now() };
      for (const k of KEPT) {
        if (k === "spec") snapshot.spec = structuredClone(spec);
        else if (k === "params") snapshot.params = structuredClone(params ?? spec.params ?? {});
        else if (k === "session" && session) snapshot.session = session;
      }

      const data = load();
      data.snapshots.push(snapshot);
      return { ok: true, snapshot, ...save(data) };
    },

    /** Newest first: the one just kept is the one being looked for. */
    list(session) {
      const all = load().snapshots.slice().sort((a, b) => b.takenAt - a.takenAt);
      return session ? all.filter((x) => x.session === session) : all;
    },

    get(id) {
      return load().snapshots.find((x) => x.id === id) ?? null;
    },

    /** The learner's own words about this one. Written once. */
    note(id, text) {
      const t = words(text);
      if (!t) return { ok: false, errors: ["there are no words there"] };
      const data = load();
      const snapshot = data.snapshots.find((x) => x.id === id);
      if (!snapshot) return { ok: false, errors: ["no snapshot with that id"] };
      if (snapshot.note !== undefined) return { ok: false, errors: ["that one is already written up"] };
      snapshot.note = t;
      return { ok: true, snapshot, ...save(data) };
    },

    forget(id) {
      const data = load();
      const before = data.snapshots.length;
      data.snapshots = data.snapshots.filter((x) => x.id !== id);
      if (data.snapshots.length === before) return { ok: false, errors: ["no snapshot with that id"] };
      return { ok: true, ...save(data) };
    },

    export() {
      return { version: VERSION, exportedAt: now(), snapshots: load().snapshots };
    },
  };
}
