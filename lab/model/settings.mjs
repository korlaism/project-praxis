// SPDX-License-Identifier: AGPL-3.0-or-later
/**
 * The learner's own endpoint, key and model name (ADR 0023).
 *
 * Kept in their browser. Sent to nobody but the endpoint they named — there
 * is no server in this design, no account, and no proxy that would route a
 * key through us in order to hide it from the person who owns it.
 *
 * A key in localStorage is a key on the device. That is the honest size of
 * the exposure: the learner's own key, in their own browser, in a page that
 * renders every learner-written string as text and never as markup.
 */
export const MODEL_KEY = "praxis.model.v1";

/** http and https only — and nothing that could execute instead of fetching. */
function usable(url) {
  try {
    const u = new URL(url);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

function browserBackend() {
  try {
    if (typeof localStorage === "undefined") return null;
    return {
      getItem: (k) => localStorage.getItem(k),
      setItem: (k, v) => localStorage.setItem(k, v),
      removeItem: (k) => localStorage.removeItem(k),
    };
  } catch {
    return null;
  }
}

export function openModelSettings({ backend } = {}) {
  const store = backend ?? browserBackend();

  function load() {
    if (!store) return null;
    let raw;
    try { raw = store.getItem(MODEL_KEY); } catch { return null; }
    if (!raw) return null;
    try {
      const d = JSON.parse(raw);
      return d && d.url && d.key && d.model ? d : null;
    } catch {
      return null;
    }
  }

  return {
    get configured() { return load() !== null; },
    get() { return load(); },

    save({ url, key, model } = {}) {
      const errors = [];
      if (!usable(String(url ?? ""))) errors.push("that is not an http or https address");
      if (!String(key ?? "").trim()) errors.push("a key is needed to call an endpoint");
      if (!String(model ?? "").trim()) errors.push("a model name is needed");
      if (errors.length) return { ok: false, errors };

      const settings = { url: String(url).trim(), key: String(key).trim(), model: String(model).trim() };
      try {
        store?.setItem(MODEL_KEY, JSON.stringify(settings));
      } catch {
        return { ok: false, errors: ["this browser would not keep the settings"] };
      }
      return { ok: true, settings };
    },

    /** Remove it entirely. A forgotten key leaves nothing behind. */
    forget() {
      try { store?.removeItem(MODEL_KEY); } catch { /* nothing more we can do */ }
    },
  };
}
