// SPDX-License-Identifier: AGPL-3.0-or-later
/**
 * Praxis Lab — every scenario and the record, in one page.
 *
 * Why one page (P-54): browsers keep storage per origin, and each published
 * artifact is its own origin — so separate topic pages meant separate
 * notebooks, and predictions never accumulated. Here everything lives behind
 * one origin and shares ONE notebook instance.
 *
 * Navigation is a direct call, not a side effect of the address changing. The
 * address bar is updated only as a courtesy, so if a host refuses history
 * changes nothing breaks, because nothing depends on it. Buttons rather than
 * links, because these are in-app actions and not documents.
 */
import { mountScenario } from "../scenario/mount.js";
import { renderRecord } from "../record/view.js";
import { openNotebook } from "../notebook/store.mjs";
import { SCENARIOS } from "../scenarios/index.mjs";
import { homeModel } from "./home.mjs";

let notebook = null;
let leave = null;
let shown = null;

function el(tag, cls, ...kids) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  for (const k of kids) if (k != null && k !== false) n.append(k);
  return n;
}

function navButton(cls, path, ...kids) {
  const b = el("button", cls, ...kids);
  b.type = "button";
  b.onclick = () => go(path);
  return b;
}

function go(path) {
  try {
    if (location.hash !== "#" + path) history.pushState(null, "", "#" + path);
  } catch { /* a sandbox may refuse; the view below does not depend on it */ }
  show(path);
}

function currentPath() {
  const h = (typeof location !== "undefined" && location.hash) || "";
  return h.startsWith("#") ? h.slice(1) || "/" : "/";
}

function home() {
  const m = homeModel(notebook, SCENARIOS);
  const page = el("main", "hub",
    el("header", "hub-head",
      el("h1", "hub-title", "Praxis Lab"),
      el("p", "hub-sub", "Say what you think will happen before you watch it. Every prediction goes into your record.")));

  page.append(navButton("hub-record", m.recordPath,
    el("span", "hub-record-t", "Your record"),
    el("span", "hub-record-n", m.totalCards ? `${m.totalCards} prediction${m.totalCards === 1 ? "" : "s"} so far` : "nothing yet")));

  if (!notebook.persistent)
    page.append(el("p", "hub-warn", "This browser won't let the lab keep your record — predictions will be gone when you close the tab."));

  for (const s of m.subjects) {
    const subject = el("section", "hub-subject", el("h2", "hub-h2", s.subject));
    for (const c of s.concepts) {
      const list = el("div", "hub-list");
      for (const sc of c.scenarios)
        list.append(navButton("hub-card", sc.path,
          el("span", "hub-card-q", sc.question),
          el("span", "hub-card-n", sc.answered ? `answered ${sc.answered}×` : "not tried yet"),
          sc.difficulty ? el("span", `hub-card-d is-${sc.difficulty}`, sc.difficulty) : null));
      subject.append(el("section", "hub-concept",
        el("h3", "hub-h3",
          el("span", "hub-concept-name", c.title),
          // Tried, not correct. Being right is the record page's business, and
          // a front page that scores you is the report card K-06 forbids.
          el("span", "hub-concept-n", `${c.answered}/${c.total} tried`)),
        list));
    }
    page.append(subject);
  }
  document.body.append(page);
  return () => page.remove();
}

/**
 * With ?verify=1, let whoever opened the page drive the simulation. P-69.
 *
 * A browser throttles a hidden or unfocused tab to roughly half a frame per
 * second, so watching a run reach its reveal takes minutes — which is why four
 * tickets in a row were verified against a DOM stub and had to say so.
 *
 * Deliberately not on by default. It exposes no data and sends nothing (the
 * record is already the learner's own, in their own browser), but a page
 * should not carry a control surface nobody asked for, and it must not outlive
 * the lab it drives.
 */
function instrument(lab) {
  const asked = typeof location !== "undefined" && /(?:^|[?&])verify=1(?:&|$)/.test(location.search || "");
  if (!asked) return () => {};
  globalThis.praxisVerify = {
    /** Fixed-step, no animation frames, gate still enforced. */
    advance: (seconds) => (lab.advance(seconds), undefined),
    record: () => lab.record,
    attempts: () => lab.attempts,
  };
  return () => { delete globalThis.praxisVerify; };
}

function show(path) {
  if (path === shown) return;             // back/forward can announce the same move twice
  shown = path;
  leave?.();
  leave = null;
  document.body.className = "";
  try { scrollTo(0, 0); } catch { /* not every host has one */ }

  const id = path.match(/^\/s\/(.+)$/)?.[1];
  const spec = id && SCENARIOS[decodeURIComponent(id)];

  if (spec) {
    document.body.className = "hub-in-scenario";
    const lab = mountScenario(spec, { notebook });
    const back = navButton("hub-back", "/", "← Lab");
    document.body.append(back);
    const unhook = instrument(lab);
    leave = () => { unhook(); lab.destroy(); back.remove(); };
  } else if (path === "/record") {
    const view = renderRecord(document.body, { notebook, scenarios: SCENARIOS });
    const back = navButton("hub-back", "/", "← Lab");
    document.body.append(back);
    leave = () => { view.destroy(); back.remove(); };
  } else {
    leave = home();
  }
}

/**
 * Start the lab. Importing this module has no side effects — the page calls
 * this — so the module graph can be loaded (and checked) without a browser.
 */
export function startHub({ store = openNotebook() } = {}) {
  notebook = store;
  addEventListener("popstate", () => show(currentPath()));
  addEventListener("hashchange", () => show(currentPath()));
  show(currentPath());
}
