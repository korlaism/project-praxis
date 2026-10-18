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
import { openModelSettings } from "../model/settings.mjs";
import { composeFor } from "../model/compose.mjs";

let notebook = null;
let sessions = null;
let model = null;
// How a session composes. A seam like the notebook and the scenarios are
// (P-59): it is the one path that would otherwise make the hub untestable
// without a network, and it is the path that most needs testing.
let compose = composeFor;
// What the last composition produced, kept across the re-render that follows
// it. ADR 0023 §6: a generator that is mostly wrong is a fact the learner is
// entitled to, and the first version of this wiped the report off the screen
// the moment it had something to show.
let composed = null;
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

  const groups = homeSessions(sessions, notebook);
  if (!groups.length) return;
  const list = el("div", "hub-sessions");
  const button_ = (r) => navButton("hub-session", r.path,
    el("span", "hub-session-t", r.topic),
    el("span", "hub-session-n", [
      r.notes ? `${r.notes} note${r.notes === 1 ? "" : "s"}` : null,
      r.predictions ? `${r.predictions} prediction${r.predictions === 1 ? "" : "s"}` : null,
    ].filter(Boolean).join(" · ") || "nothing in it yet"));

  for (const g of groups) {
    // A group is a connected component of the link graph (P-100). One that
    // nobody linked is a group of one, and renders as a plain row, so the
    // page is one shape whether or not anything has been linked.
    if (!g.linked) { list.append(button_(g.sessions[0])); continue; }
    const box = el("div", "hub-group");
    box.append(el("span", "hub-group-n", `${g.sessions.length} linked topics`));
    for (const r of g.sessions) box.append(button_(r));
    list.append(box);
  }
  page.append(el("section", "hub-resume", el("h2", "hub-h2", "Pick up where you left off"), list));
}

/**
 * Where the learner points the lab at their own AI (ADR 0023).
 *
 * Everything on this page says what happens before it asks for anything. The
 * key stays in this browser; the only thing it is ever used for is the call
 * described here, to the address typed above it.
 */
function settingsPage() {
  const current = model.get();
  const page = el("main", "hub",
    el("header", "hub-head",
      el("h1", "hub-title", "Your own AI"),
      el("p", "hub-sub",
         "Point the lab at any endpoint that speaks the OpenAI chat shape — a provider, or a server on your own machine.")));

  page.append(el("section", "hub-plain",
    el("h2", "hub-h2", "What is sent, and where"),
    el("p", "hub-empty-p",
       "Only two things leave this device: what you typed as a topic, and the list of simulations the lab can build " +
       "from — their controls and the outcomes they can produce. Both go to the address you enter below, on your " +
       "account, and nowhere else."),
    // Qualified by ADR 0024, and it is a worse sentence than the one it
    // replaced. It is also the true one.
    el("p", "hub-empty-p",
       "Your predictions and your record are never sent. A note is only sent if you pick it, one at a time, " +
       "each time you ask for a simulation — and you see the exact words before they go. Nothing is remembered " +
       "between asks and nothing is picked for you."),
    el("p", "hub-empty-p",
       "There is no server here and no account with us; the key is kept in this browser only, and " +
       "\"Forget it\" removes it."),
    el("p", "hub-empty-p",
       "Anything the AI composes is run here first. If the simulation does not do what the question claims, " +
       "it is thrown away and you never see it.")));

  const field = (id, label, value, type = "text", placeholder = "") => {
    const wrap = el("label", "hub-field");
    wrap.append(el("span", "hub-field-l", label));
    const input = document.createElement("input");
    input.type = type;
    input.id = id;
    input.className = "hub-field-i";
    input.value = value ?? "";
    if (placeholder) input.setAttribute("placeholder", placeholder);
    wrap.append(input);
    return { wrap, input };
  };
  // No vendor's address as a placeholder, for two reasons: the bundle must
  // reference no third party at all (P-44, and tools/build-topic.test.mjs
  // enforces it), and a default address is a recommendation nobody asked us
  // to make. ADR 0023 is bring-your-own, not bring-ours.
  const url = field("model-url", "Endpoint", current?.url, "text", "your provider's chat/completions address");
  const key = field("model-key", "Key", current?.key, "password", "kept in this browser only");
  const name = field("model-name", "Model", current?.model, "text", "the model name your endpoint expects");
  const form = el("section", "hub-form", url.wrap, key.wrap, name.wrap);

  const said = el("p", "hub-said");
  said.hidden = true;
  const acts = el("div", "hub-acts");
  const save = el("button", "hub-note-save", "Save");
  save.type = "button";
  save.onclick = () => {
    const r = model.save({ url: url.input.value, key: key.input.value, model: name.input.value });
    said.hidden = false;
    said.textContent = r.ok ? "Saved. Your sessions can now compose simulations." : r.errors.join("; ");
  };
  acts.append(save);
  if (current) {
    const forget = el("button", "hub-forget", "Forget it");
    forget.type = "button";
    forget.onclick = () => { model.forget(); show(null, "/settings"); };
    acts.append(forget);
  }
  form.append(acts, said);
  page.append(form);

  document.body.append(page);
  const back = navButton("hub-back", "/", "← Lab");
  document.body.append(back);
  return () => { page.remove(); back.remove(); };
}

/** One session: its topic, the learner's notes, and what can be simulated. */
function sessionPage(id) {
  const session = sessions.get(id);
  if (!session) { go("/"); return () => {}; }
  sessions.touch(id);
  const m = sessionModel(sessions.get(id), { scenarios: SCENARIOS, notebook, sessions });
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
  // Each note carries its own choice about whether the model may see it
  // (ADR 0024). Nothing is chosen by default, nothing is remembered between
  // compositions, and the words themselves are on screen next to the choice —
  // a learner cannot consent to a count.
  const sharing = new Set();
  if (m.notes.length) {
    const written = el("div", "hub-note-list");
    for (const note of m.notes) {
      const row = el("div", "hub-note-row");
      row.append(el("p", "hub-note", note.text));
      if (model.configured) {
        const pick = el("button", "hub-note-share", "Show the AI");
        pick.type = "button";
        pick.setAttribute("aria-pressed", "false");
        pick.onclick = () => {
          const on = sharing.has(note.id);
          if (on) sharing.delete(note.id); else sharing.add(note.id);
          pick.textContent = on ? "Show the AI" : "Will be sent";
          pick.className = on ? "hub-note-share" : "hub-note-share is-on";
          pick.setAttribute("aria-pressed", String(!on));
        };
        row.append(pick);
      }
      written.append(row);
    }
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
  }

  // ---- what this topic is linked to (P-100) -----------------------------
  if (m.linked.length || m.linkable.length) {
    const related = el("section", "hub-related", el("h2", "hub-h2", "Related topics"));
    for (const other of m.linked) {
      const row = el("div", "hub-related-row");
      row.append(navButton("hub-session", other.path, el("span", "hub-session-t", other.topic)));
      const cut = el("button", "hub-forget", "Unlink");
      cut.type = "button";
      cut.onclick = () => { sessions.unlink(id, other.id); show(null, `/session/${id}`); };
      row.append(cut);
      related.append(row);
    }
    if (m.linkable.length) {
      const pick = document.createElement("select");
      pick.id = "session-link";
      pick.className = "hub-field-i";
      for (const other of m.linkable) {
        const option = document.createElement("option");
        option.value = other.id;
        option.textContent = other.topic;
        pick.append(option);
      }
      pick.value = m.linkable[0].id;
      const add = el("button", "hub-note-save", "Link");
      add.type = "button";
      add.onclick = () => { sessions.link(id, pick.value); show(null, `/session/${id}`); };
      related.append(el("div", "hub-related-row", pick, add));
    } else if (!m.linked.length) {
      related.append(el("p", "hub-empty-p", "Nothing else to link to yet."));
    }
    page.append(related);
  }

  // ---- compose more, with the learner's own AI (ADR 0023) ---------------
  const made = el("section", "hub-compose");
  const report = el("p", "hub-said");
  report.hidden = !(composed && composed.session === id);
  if (!report.hidden) report.textContent = composed.said;
  if (model.configured) {
    const go = el("button", "hub-note-save", "Compose with your AI");
    go.type = "button";
    go.onclick = async () => {
      go.disabled = true;
      go.textContent = "Composing…";
      report.hidden = false;
      const chosenNow = m.notes.filter((n) => sharing.has(n.id)).length;
      report.textContent = "Asking your model, then running everything it sends back." +
        (chosenNow ? ` Sending ${chosenNow} of your note${chosenNow === 1 ? "" : "s"} with it.` : "");
      const chosen = m.notes.filter((n) => sharing.has(n.id)).map((n) => n.text);
      const r = await compose(session.topic, { settings: model.get(), notes: chosen });
      go.disabled = false;
      go.textContent = "Compose with your AI";

      // The failures are the learner's business too. A generator that is
      // mostly wrong is a fact they are entitled to (ADR 0023 §6), and this
      // has to outlive the re-render below or they never read it.
      composed = { session: id, said: !r.ok
        ? `That did not work: ${r.error}`
        : r.asked === 0
          ? "Your model said none of the simulations here can honestly serve this topic. That is a fair answer."
          : `${r.scenarios.length} of ${r.asked} survived being run here. ` +
            (r.rejected.length
              ? `${r.rejected.length} claimed something the simulation did not do, and ${r.rejected.length === 1 ? "was" : "were"} thrown away.`
              : "") };
      for (const spec of r.scenarios) sessions.keep(id, spec);
      show(null, `/session/${id}`);
    };
    made.append(go, report);
  } else {
    made.append(navButton("hub-session", "/settings",
      el("span", "hub-session-t", "Use your own AI to compose simulations"),
      el("span", "hub-session-n", "not set up")));
  }
  page.append(made);

  if (!m.hasSimulations) {
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

  page.append(navButton("hub-settings", "/settings",
    el("span", "hub-session-t", "Your own AI"),
    el("span", "hub-session-n", model.configured ? "set up" : "not set up")));

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
  // A scenario composed for a session lives in that session, not in the
  // shipped registry. Looked up there first so a generated one is openable.
  const wanted = id && decodeURIComponent(id);
  const spec = wanted && ((sessionId && sessions.get(sessionId)?.scenarios
    ?.find((x) => x.id === wanted)) || SCENARIOS[wanted]);
  const onlySession = !inSession && path.match(/^\/session\/([^/]+)$/)?.[1];

  // The composition report belongs to one session and one visit to it.
  if (composed && path !== `/session/${composed.session}`) composed = null;

  if (path === "/settings") {
    leave = settingsPage();
  } else if (onlySession) {
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
export function startHub({ store = openNotebook(), sessionStore = openSessions(),
                           modelSettings = openModelSettings(), composeWith, scenarios } = {}) {
  notebook = store;
  sessions = sessionStore;
  model = modelSettings;
  if (composeWith) compose = composeWith;
  composed = null;
  if (scenarios) SCENARIOS = scenarios;
  addEventListener("popstate", () => show(currentPath()));
  addEventListener("hashchange", () => show(currentPath()));
  show(currentPath());
}
