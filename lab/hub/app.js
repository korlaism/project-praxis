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
import { SCENARIOS as SHIPPED } from "../scenarios/index.mjs";
import { homeModel } from "./home.mjs";
import { openSessions } from "../session/store.mjs";
import { sessionModel, homeSessions } from "../session/view.mjs";

let notebook = null;
let sessions = null;
let leave = null;
let shown = null;
// The scenarios this instance lists. A seam rather than an assumption (P-59):
// the notebook backend and the mount were already injectable, and this was not,
// so a school or a hosted tenant could not bring its own items without editing
// the source. Defaults to what ships.
let SCENARIOS = SHIPPED;

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

/** The prompt box, and what the learner was last doing underneath it (P-95). */
function opener(page) {
  const box = document.createElement("input");
  box.type = "text";
  box.id = "hub-topic";
  box.className = "hub-topic";
  box.value = "";
  // It names the field and proposes nothing. Nothing here generates anything
  // either — ADR 0022 leaves the runtime model seam to its own decision, and
  // a box that pretended otherwise would be the shell lying about the thing.
  box.setAttribute("placeholder", "What do you want to work on?");
  box.setAttribute("aria-label", "What do you want to work on?");

  const open = () => {
    const r = sessions.start(box.value);
    if (!r.ok) return;
    box.value = "";
    go(`/session/${r.session.id}`);
  };
  box.onkeydown = (e) => { if (e.key === "Enter") open(); };

  const start = el("button", "hub-start", "Start");
  start.type = "button";
  start.onclick = open;
  page.append(el("div", "hub-opener", box, start));

  const rows = homeSessions(sessions, notebook);
  if (!rows.length) return;
  const list = el("div", "hub-sessions");
  for (const r of rows)
    list.append(navButton("hub-session", r.path,
      el("span", "hub-session-t", r.topic),
      el("span", "hub-session-n", [
        r.notes ? `${r.notes} note${r.notes === 1 ? "" : "s"}` : null,
        r.predictions ? `${r.predictions} prediction${r.predictions === 1 ? "" : "s"}` : null,
      ].filter(Boolean).join(" · ") || "nothing in it yet")));
  page.append(el("section", "hub-resume", el("h2", "hub-h2", "Pick up where you left off"), list));
}

/** One session: its topic, the learner's notes, and what can be simulated. */
function sessionPage(id) {
  const session = sessions.get(id);
  if (!session) { go("/"); return () => {}; }
  sessions.touch(id);
  const m = sessionModel(sessions.get(id), { scenarios: SCENARIOS, notebook });
  const page = el("main", "hub");

  // The topic is editable in place: what you typed to get started is a first
  // guess, and renaming it should not need a button of its own.
  const topic = document.createElement("input");
  topic.type = "text";
  topic.className = "hub-session-topic";
  topic.id = "session-topic";
  topic.value = m.topic;
  topic.setAttribute("aria-label", "Topic");
  topic.onchange = () => { sessions.rename(id, topic.value); show(null, `/session/${id}`); };
  page.append(el("header", "hub-head", topic,
    el("p", "hub-sub", m.predictions
      ? `${m.predictions} prediction${m.predictions === 1 ? "" : "s"} made here`
      : "Nothing predicted here yet.")));

  // ---- the notes, which only the learner writes -------------------------
  const notes = el("section", "hub-notes", el("h2", "hub-h2", "Your notes"));
  const box = document.createElement("textarea");
  box.id = "session-note";
  box.className = "hub-note-box";
  box.value = "";
  box.setAttribute("rows", "3");
  box.setAttribute("placeholder", "Anything you want to keep. Nobody writes here but you.");
  box.setAttribute("aria-label", "A note, in your own words");
  const save = el("button", "hub-note-save primary", "Save note");
  save.type = "button";
  save.onclick = () => {
    if (!sessions.note(id, box.value).ok) return;
    box.value = "";
    show(null, `/session/${id}`);
  };
  notes.append(box, save);
  if (m.notes.length) {
    const written = el("div", "hub-note-list");
    for (const note of m.notes) written.append(el("p", "hub-note", note.text));
    notes.append(written);
  }
  page.append(notes);

  // ---- what we can actually simulate for this topic ---------------------
  if (m.hasSimulations) {
    for (const c of m.concepts) {
      const list = el("div", "hub-list");
      for (const sc of c.scenarios)
        list.append(navButton("hub-card", sc.path,
          el("span", "hub-card-q", sc.question),
          sc.difficulty ? el("span", `hub-card-d is-${sc.difficulty}`, sc.difficulty) : null));
      page.append(el("section", "hub-concept",
        el("h3", "hub-h3", el("span", "hub-concept-name", `${c.title} — ${c.subject}`)), list));
    }
  } else {
    // The honest empty state. There is no simulation for most topics, and
    // saying so is the product's roadmap made visible rather than a failure
    // to hide behind an unrelated list.
    const none = el("section", "hub-empty",
      el("h2", "hub-h2", "No simulations for this topic yet"),
      el("p", "hub-empty-p",
         "Your notes are kept either way. What can be simulated today is this, and it is meant to look short:"));
    const have = el("div", "hub-empty-list");
    for (const c of m.available) have.append(el("span", "hub-empty-c", `${c.title} (${c.subject})`));
    none.append(have);
    page.append(none);
  }

  document.body.append(page);
  const back = navButton("hub-back", "/", "← Sessions");
  document.body.append(back);
  return () => { page.remove(); back.remove(); };
}

function home() {
  const m = homeModel(notebook, SCENARIOS);
  const page = el("main", "hub",
    el("header", "hub-head",
      el("h1", "hub-title", "Praxis Lab"),
      el("p", "hub-sub", "Say what you think will happen before you watch it. Every prediction goes into your record.")));

  opener(page);

  page.append(navButton("hub-record", m.recordPath,
    el("span", "hub-record-t", "Your record"),
    el("span", "hub-record-n", m.totalCards ? `${m.totalCards} prediction${m.totalCards === 1 ? "" : "s"} so far` : "nothing yet")));

  if (!notebook.persistent)
    page.append(el("p", "hub-warn", "This browser won't let the lab keep your record — predictions will be gone when you close the tab."));

  page.append(el("h2", "hub-h2 hub-browse", "Or browse everything"));
  for (const s of m.subjects) {
    const subject = el("section", "hub-subject", el("h3", "hub-h3", s.subject));
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

/**
 * @param path   where to go, or null to re-render where we already are after
 *               a change the page made to itself (a note written, a rename)
 */
function show(path, again = null) {
  if (again !== null) { shown = null; path = again; }
  if (path === shown) return;             // back/forward can announce the same move twice
  shown = path;
  leave?.();
  leave = null;
  document.body.className = "";
  try { scrollTo(0, 0); } catch { /* not every host has one */ }

  // A scenario opened from inside a session carries it in the address: the
  // card knows where it was made, and leaving returns to the session.
  const inSession = path.match(/^\/session\/([^/]+)\/s\/(.+)$/);
  const id = inSession?.[2] ?? path.match(/^\/s\/(.+)$/)?.[1];
  const sessionId = inSession?.[1] ?? null;
  const spec = id && SCENARIOS[decodeURIComponent(id)];
  const onlySession = !inSession && path.match(/^\/session\/([^/]+)$/)?.[1];

  if (onlySession) {
    leave = sessionPage(onlySession);
  } else if (spec) {
    document.body.className = "hub-in-scenario";
    if (sessionId) sessions.touch(sessionId);
    const lab = mountScenario(spec, { notebook, session: sessionId });
    const back = navButton("hub-back", sessionId ? `/session/${sessionId}` : "/",
                           sessionId ? "← Session" : "← Lab");
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
export function startHub({ store = openNotebook(), sessionStore = openSessions(), scenarios } = {}) {
  notebook = store;
  sessions = sessionStore;
  if (scenarios) SCENARIOS = scenarios;
  addEventListener("popstate", () => show(currentPath()));
  addEventListener("hashchange", () => show(currentPath()));
  show(currentPath());
}
