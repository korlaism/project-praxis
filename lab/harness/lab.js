// SPDX-License-Identifier: MIT
/**
 * Praxis lab harness.
 *
 * A topic supplies physics and drawing; the harness supplies the commit gate,
 * the transport, the parameter sliders and a layout that survives being screen
 * recorded. Build once, reuse per topic — the tools are the durable asset.
 *
 *   import { mountLab } from "./harness/lab.js";
 *   mountLab({
 *     question, note, options, correct, explain, cue,
 *     params: [{ key, label, min, max, step, value, unit }],
 *     setup(state, p), step(state, dt, p), draw(ctx, state, p, view),
 *   });
 *
 * Nothing here takes an account or stores anything about a person. That is a
 * Phase 1 concern and this phase deliberately does not touch it.
 */
import { createGate, CONFIDENCE } from "./gate.mjs";

const CONF_LABEL = {
  guessing: "guessing",
  leaning: "leaning that way",
  "fairly-sure": "fairly sure",
  certain: "certain",
};

export function mountLab(topic) {
  const root = document.createElement("div");
  root.className = "lab";
  document.body.appendChild(root);

  const gate = createGate({ options: topic.options, correct: topic.correct });
  const params = Object.fromEntries((topic.params ?? []).map((p) => [p.key, p.value]));

  // ---- head -------------------------------------------------------------
  const head = el("div", "lab-head", root);
  el("h1", "lab-q", head).textContent = topic.question;
  if (topic.note) el("p", "lab-sub", head).textContent = topic.note;

  // A wrapped scenario embeds someone else's simulation instead of drawing our
  // own (ADR 0009). Nothing can watch what happens inside it, so there is no
  // loop, no transport and no answer check — the learner reveals it themselves.
  const wrapped = !!topic.embed;

  // ---- stage ------------------------------------------------------------
  const stage = el("div", "lab-stage", root);
  let canvas = null, ctx = null, frame_ = null, embedBox = null;
  if (wrapped) {
    embedBox = el("div", "lab-embed", stage);   // filled once a commit exists
  } else {
    canvas = document.createElement("canvas");
    stage.appendChild(canvas);
    ctx = canvas.getContext("2d");
  }

  const gateEl = el("div", "lab-gate", root);
  el("div", "lab-gate-label", gateEl).textContent = "Commit before you watch";
  const optsEl = el("div", "lab-opts", gateEl);

  let pendingConfidence = null;
  let committedParams = null;          // the setup the learner actually answered
  const confWrap = el("div", "lab-conf", gateEl);
  for (const level of CONFIDENCE) {
    const b = el("button", null, confWrap);
    b.type = "button";
    b.textContent = CONF_LABEL[level];
    b.setAttribute("aria-pressed", "false");
    b.onclick = () => {
      pendingConfidence = pendingConfidence === level ? null : level;
      for (const c of confWrap.children)
        c.setAttribute("aria-pressed", String(c === b && pendingConfidence === level));
    };
  }
  el("div", "lab-conf-label", gateEl).textContent = "How sure are you? (optional)";

  for (const opt of topic.options) {
    const b = el("button", "lab-opt", optsEl);
    b.type = "button";
    b.id = `opt-${opt.id}`;
    b.textContent = opt.label;
    b.onclick = () => {
      gate.commit(opt.id, pendingConfidence);
      committedParams = { ...params };
      gateEl.hidden = true;
      // The simulation is not merely hidden before a commit — it does not
      // exist. R-010 at its strictest, and it saves loading it too.
      if (wrapped) showEmbed(); else play();
      render();
    };
  }

  const verdict = el("div", "lab-verdict", root);
  // Set when the learner asks for the explanation instead of trying again.
  let explained = false;
  // P-89 / ADR 0018. "shown" from the moment a cue is on screen until the
  // learner does something about it; then what they did, so it is reported
  // once. Null when no cue is standing.
  let cueState = null;

  /**
   * Say what the learner did with the cue — once, and never for a cue that
   * was not shown. The notebook's problem if it fails, not the learner's: the
   * retry or the explanation they asked for happens either way.
   */
  function answerCue(response) {
    if (cueState !== "shown") return;
    cueState = response;
    try {
      topic.onCueResponse?.(response);
    } catch (err) {
      console.error("onCueResponse failed:", err);
    }
  }
  verdict.hidden = true;

  /* ---- the gap, in the learner's own words (R-012) ----------------------
   *
   * Built once and reused. The verdict panel above is rebuilt on every frame;
   * a box rebuilt with it would throw away whatever was half-written, which
   * would make this worse than not having it at all.
   *
   * It arrives empty and nothing ever fills it — R-015 and ADR 0002. The only
   * writer is the person whose notebook it is.
   */
  let noteEl = null, noteBox = null, noteSaveBtn = null, notePrompt = null, noteSaid = null;
  let noteFiled = false, noteSaidText = "";
  if (typeof topic.onNote === "function") {
    noteEl = el("div", "lab-note", root);
    noteEl.hidden = true;
    notePrompt = el("label", "lab-note-prompt", noteEl);
    notePrompt.setAttribute("for", "lab-note-box");
    noteBox = document.createElement("textarea");
    noteBox.id = "lab-note-box";
    noteBox.className = "lab-note-box";
    noteBox.setAttribute("rows", "3");
    // No placeholder. A sentence sitting in the box is a sentence to agree
    // with, and agreeing is not reconciling.
    noteEl.appendChild(noteBox);
    const noteActs = el("div", "lab-note-acts", noteEl);
    noteSaveBtn = button(noteActs, "Save", () => fileNote(), "primary");
    noteSaid = el("p", "lab-note-said", noteEl);
    noteSaid.hidden = true;
  }

  /**
   * File what the learner wrote. Whoever supplied onNote owns the rules about
   * what is long enough; the harness only reports back what it was told.
   */
  function fileNote() {
    if (noteFiled || !noteBox) return;
    let r;
    try {
      r = topic.onNote(noteBox.value ?? "");
    } catch (err) {
      console.error("onNote failed:", err);
      r = { ok: false, errors: ["The notebook could not take that just now."] };
    }
    if (r?.ok) {
      noteFiled = true;
      noteSaidText = (noteBox.value ?? "").trim();
    } else {
      // The words stay in the box. Throwing away what someone just wrote
      // because it was too short is the surest way never to see a second try.
      noteSaidText = r?.errors?.[0] ?? "That could not be filed.";
    }
    renderNote();
  }

  /** Show, hide and dress the box. It is never rebuilt, only reconfigured. */
  function renderNote(cueOnScreen = false) {
    if (!noteEl) return;
    // ADR 0014 fixes the order: outcome, cue, retry, explanation — and only
    // then this. A writing box beside an unanswered cue competes with it.
    noteEl.hidden = !(gate.state === "revealed" && !cueOnScreen);
    notePrompt.textContent = gate.isCorrect
      ? "In your own words — why did it happen?"
      : "In your own words — what did you expect, and what happened instead?";
    notePrompt.hidden = noteFiled;
    noteBox.hidden = noteFiled;
    noteSaveBtn.hidden = noteFiled;
    noteSaid.hidden = !noteSaidText;
    noteSaid.textContent = noteSaidText;
  }

  // ---- foot -------------------------------------------------------------
  const foot = el("div", "lab-foot", root);
  const transport = el("div", "lab-transport", foot);
  let playBtn = null, stepBtn = null, resetBtn = null, showBtn = null;
  if (wrapped) {
    showBtn = button(transport, "Show the answer", () => reveal(), "primary");
  } else {
    playBtn = button(transport, "Play", () => (running ? pause() : play()), "primary");
    stepBtn = button(transport, "Step", () => { tick(1 / 60); render(); });
    resetBtn = button(transport, "Reset", () => { softReset(); render(); });
  }
  // "Keep this" (P-43). The setup a learner dialled is a question they asked,
  // and it is gone the moment they move a slider. Available at every step,
  // including before a commit: the interesting setup is often the one they
  // built BEFORE finding out what it does.
  let keepBtn = null, keptSaid = null;
  if (typeof topic.onKeep === "function") {
    keepBtn = button(transport, "Keep this", () => {
      let r;
      try {
        r = topic.onKeep({ ...params });
      } catch (err) {
        console.error("onKeep failed:", err);
        r = { ok: false };
      }
      keptSaid.hidden = false;
      keptSaid.textContent = r?.ok ? "Kept, with these settings." : "That could not be kept.";
    });
  }

  const againBtn = button(transport, "Ask again",
    () => { answerCue("left"); gate.reset(); softReset(); render(); });

  // Topic-supplied actions — "Cut the string", "Release", "Collide". The
  // moment a learner chooses to act is often the interesting one, so it
  // belongs to the topic rather than the transport.
  const actionBtns = [];
  for (const a of topic.actions ?? []) {
    const b = button(transport, a.label, () => {
      a.onClick(state, params, api);
      render();
    }, a.primary ? "primary" : null);
    actionBtns.push({ b, a });
  }

  const paramsEl = el("div", "lab-params", foot);
  for (const p of topic.params ?? []) {
    const wrap = el("label", "lab-param", paramsEl);
    wrap.append(p.label);
    const input = document.createElement("input");
    Object.assign(input, { type: "range", min: p.min, max: p.max, step: p.step });
    input.id = `param-${p.key}`;
    input.value = String(p.value);
    const out = document.createElement("output");
    const show = () => (out.textContent = `${(+input.value).toFixed(decimals(p.step))}${p.unit ?? ""}`);
    input.oninput = () => {
      params[p.key] = +input.value;
      show();
      // A prediction is a claim about a specific setup. Change the setup after
      // committing and it is a different question, so the old answer cannot
      // stand — otherwise the verdict scores a question nobody asked (P-52).
      if (gate.state !== "awaiting") { answerCue("left"); gate.reset(); committedParams = null; }
      softReset();
      render();
    };
    show();
    wrap.append(input, out);
  }
  /* ---- "I'm stuck" (R-013) ---------------------------------------------
   *
   * In the foot, so it is on screen at every step — before the commit, while
   * it runs, and after the reveal. Confusion does not wait for a convenient
   * moment, and the moment before committing is the likeliest one of all.
   *
   * One tap logs it. Everything after that is optional: spec/04 calls this
   * log "deliberately almost empty", and a field that costs more than two
   * seconds will not be filled.
   */
  let confusionEl = null, stuckBtn = null, wordsBox = null, addBtn = null, sortedBtn = null;
  let wordsSaid = false;
  const confusion = topic.confusion;
  if (confusion) {
    confusionEl = el("div", "lab-confusion", foot);
    stuckBtn = button(confusionEl, "I'm stuck", () => {
      if (!run(() => confusion.log())) return;
      wordsSaid = false;
      renderConfusion();
    });
    wordsBox = document.createElement("input");
    wordsBox.type = "text";
    wordsBox.id = "lab-confusion-words";
    wordsBox.className = "lab-confusion-words";
    // A placeholder here, and deliberately none on the reconciliation box. The
    // difference is what it invites: this one NAMES the field and proposes no
    // content, where a sentence stem in the reconciliation would be our
    // grammar shaping their reasoning (R-015, ADR 0002). It is also never a
    // value — it vanishes on the first keystroke and is never submitted.
    wordsBox.setAttribute("placeholder", "what's confusing? (optional)");
    wordsBox.setAttribute("aria-label", "What is confusing? (optional)");
    confusionEl.appendChild(wordsBox);
    addBtn = button(confusionEl, "Add", () => {
      if (!wordsBox.value.trim()) return;
      if (!run(() => confusion.words(wordsBox.value))) return;
      wordsSaid = true;
      renderConfusion();
    });
    sortedBtn = button(confusionEl, "Sorted it", () => {
      if (!run(() => confusion.resolve())) return;
      wordsBox.value = "";
      wordsSaid = false;
      renderConfusion();
    });
  }

  /** Call the notebook without letting it take the page down. */
  function run(fn) {
    try {
      return fn() ?? true;
    } catch (err) {
      console.error("the notebook refused a confusion:", err);
      return false;
    }
  }

  /**
   * Show the one control that applies. Nothing here touches the gate, the
   * loop or the verdict — being stuck is not an event in the simulation.
   */
  function renderConfusion() {
    if (!confusionEl) return;
    const open = !!confusion.isOpen?.();
    stuckBtn.hidden = open;
    sortedBtn.hidden = !open;
    // The words are offered once the tap exists to attach them to, and the
    // offer goes away once they have been said. It is never a prerequisite.
    const canSay = open && !wordsSaid && typeof confusion.words === "function";
    wordsBox.hidden = !canSay;
    addBtn.hidden = !canSay;
  }

  if (keepBtn) {
    keptSaid = el("p", "lab-kept", foot);
    keptSaid.hidden = true;
  }

  const clock = el("div", "lab-clock", foot);

  // ---- loop -------------------------------------------------------------
  /** Load the wrapped simulation, and credit it — the licence obliges that. */
  function showEmbed() {
    // Held by reference, not searched for: a real HTMLCollection has no
    // .find, so searching worked against the test stub and threw in a browser.
    if (!embedBox || frame_) return;
    frame_ = document.createElement("iframe");
    frame_.setAttribute("src", topic.embed.src);
    frame_.setAttribute("title", topic.embed.title);
    frame_.setAttribute("loading", "lazy");
    frame_.className = "lab-frame";
    embedBox.appendChild(frame_);
  }

  let state, t, running = false, raf = null, last = 0;
  let dpr = 1, viewW = 0, viewH = 0, drawFailed = false;
  let destroyed = false, observer = null;

  function softReset() {
    explained = false;
    cueState = null;
    // A new attempt is a new setup; the last confirmation no longer describes
    // what is on screen.
    if (keptSaid) { keptSaid.hidden = true; keptSaid.textContent = ""; }
    // A new attempt is a new card, so it is a new gap to write up.
    noteFiled = false;
    noteSaidText = "";
    if (noteBox) noteBox.value = "";
    // State first. pause() renders, and rendering without state throws out of
    // mountLab, which kills resize() and leaves the canvas black forever.
    t = 0;
    state = topic.setup?.({}, params) ?? {};
    if (wrapped) {
      // Asking again means the simulation goes away until the next commit.
      frame_?.remove();
      frame_ = null;
      render();
      return;
    }
    pause();
  }

  function tick(dt) {
    if (destroyed || wrapped || !gate.canRun) return;   // locked until committed, and gone once left
    t += dt;
    topic.step?.(state, dt, params);
  }

  function frame(now) {
    const dt = Math.min((now - last) / 1000, 1 / 30);
    last = now;
    tick(dt);
    render();
    if (running) raf = requestAnimationFrame(frame);
  }

  function play() {
    if (!gate.canRun || running) return;
    running = true;
    last = performance.now();
    raf = requestAnimationFrame(frame);
    render();
  }

  function pause() {
    running = false;
    if (raf) cancelAnimationFrame(raf), (raf = null);
    render();
  }

  /**
   * Advance the simulation by `seconds`, in fixed steps, with no animation
   * frames at all. P-69.
   *
   * Two problems, one answer. A browser throttles a hidden tab to about half a
   * frame per second, and dt is clamped to 1/30s per frame, so the run crawls
   * at roughly a two-hundredth of real time — which made this page effectively
   * unverifiable outside these tests, four tickets in a row. And a fixed step
   * is reproducible, where wall-clock frames are not.
   *
   * It is a clock, not a bypass: the gate is still asked, so nothing advances
   * before a commitment exists.
   */
  function advance(seconds, dt = 1 / 60) {
    if (destroyed) return api;
    const steps = Math.max(0, Math.round(seconds / dt));
    for (let i = 0; i < steps; i++) {
      if (destroyed) break;                  // a reveal can tear the lab down
      tick(dt);
    }
    render();
    return api;
  }

  // A tab you switch away from should not fall behind; it should stop. Left
  // paused rather than resumed on return, so nothing moves without the
  // learner, and the transport button says which state it is in.
  function onVisibility() {
    if (document.hidden && running) pause();
  }

  // ---- render -----------------------------------------------------------
  function resize() {
    if (destroyed || wrapped) return;        // nothing of ours to size
    const r = stage.getBoundingClientRect();
    dpr = Math.min(devicePixelRatio || 1, 2);
    // A stage that has not laid out yet reports ~0. Falling back to the viewport
    // keeps the canvas real rather than collapsing it to the minimum.
    const availW = r.width > 40 ? r.width - 32 : innerWidth - 32;
    const availH = r.height > 40 ? r.height - 32 : innerHeight * 0.6;
    viewW = Math.max(320, Math.floor(availW));
    viewH = Math.max(240, Math.floor(availH));
    canvas.width = Math.round(viewW * dpr);
    canvas.height = Math.round(viewH * dpr);
    canvas.style.width = `${viewW}px`;
    canvas.style.height = `${viewH}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    render();
  }

  function render() {
    if (destroyed) return;
    if (wrapped) { renderChrome(); return; }
    const view = { w: viewW, h: viewH, t };
    ctx.clearRect(0, 0, view.w, view.h);
    try {
      topic.draw?.(ctx, state, params, view, { revealed: gate.state === "revealed" });
    } catch (err) {
      // Report it and keep the harness alive — a broken topic should not also
      // break the transport, the gate and every future resize.
      if (!drawFailed) { drawFailed = true; console.error("topic draw() failed:", err); }
      ctx.fillStyle = "#D65442";
      ctx.font = '13px "Spline Sans Mono", ui-monospace, monospace';
      ctx.fillText("topic draw() failed — see console", 16, 24);
    }

    playBtn.textContent = running ? "Pause" : "Play";
    for (const b of [playBtn, stepBtn, resetBtn]) b.disabled = !gate.canRun;
    clock.textContent = `t = ${t.toFixed(2)}s`;
    renderChrome();

    renderVerdict();
  }

  /** Everything that is the same whether we drew it or embedded it. */
  function renderChrome() {
    // Not renderConfusion(): being stuck is not an event in the simulation, so
    // nothing the loop does can change it. Every handler that CAN renders for
    // itself, and a per-frame redraw here was untested and untestable weight.
    gateEl.hidden = gate.canRun;
    againBtn.disabled = !gate.canRun;
    if (showBtn) showBtn.disabled = !gate.canRun || gate.state === "revealed";
    for (const { b, a } of actionBtns)
      b.disabled = !gate.canRun || (a.enabled ? !a.enabled(state, params) : false);
    renderVerdict();
  }

  function renderVerdict() {
    if (gate.state === "revealed") {
      const rec = api.record;
      verdict.hidden = false;
      verdict.className = `lab-verdict ${gate.isCorrect ? "is-right" : "is-wrong"}`;
      const said = topic.options.find((o) => o.id === gate.choice)?.label ?? gate.choice;
      const conf = gate.confidence ? ` — ${CONF_LABEL[gate.confidence]}` : "";
      verdict.innerHTML = "";
      const b = document.createElement("b");
      b.textContent = rec.unlisted
        ? "What happened was none of the choices."
        : gate.isCorrect ? "You had it." : `You said: ${said}${conf}.`;

      // ADR 0014: outcome, cue, optional retry, explanation. Handing over the
      // explanation the instant someone is wrong is the arm the evidence says
      // lost. Cue only the FIRST attempt — cueing twice is nagging, not
      // scaffolding — and never when they were right.
      const cue = !gate.isCorrect && rec.attempt === 0 && !explained
        ? (typeof topic.cue === "function" ? topic.cue(rec) : null)
        : null;

      const s = document.createElement("span");
      if (cue) {
        // Recorded the first time it is on screen, so the card filed at the
        // reveal can say the cue was offered even if nothing is done with it.
        if (cueState === null) cueState = "shown";
        s.textContent = " " + cue;
        verdict.append(b, s);
        const acts = el("div", "lab-verdict-acts", verdict);
        // Neither is compulsory. Forcing a second attempt on someone just told
        // they are wrong is the shortest path to K-06.
        button(acts, "Predict again", () => {
          answerCue("retried");
          gate.retry();
          softReset();
          render();
        }, "primary");
        button(acts, "Show why", () => { answerCue("explained"); explained = true; render(); });
        renderNote(true);
      } else {
        const why = typeof topic.explain === "function" ? topic.explain(rec) : topic.explain;
        s.textContent = " " + (why ?? "");
        verdict.append(b, s);
        renderNote(false);
      }
    } else {
      verdict.hidden = true;
      renderNote(false);
    }
  }

  /**
   * A topic calls this when the outcome has become undeniable on screen, with
   * what it OBSERVED. Omitting it falls back to the configured answer.
   */
  function reveal(observed) {
    if (destroyed || gate.state !== "committed") return;   // first reveal only, never after leaving
    gate.reveal(observed);
    render();
    // Hand the record on (the notebook, P-40). A failure here is the notebook's
    // problem, not the learner's: the verdict above has already rendered.
    try {
      topic.onReveal?.(api.record);
    } catch (err) {
      console.error("onReveal failed:", err);
    }
  }

  /**
   * Leave cleanly. A page that opens many scenarios in turn (the hub, and every
   * generated scenario after it) cannot afford old ones that keep simulating,
   * keep listening for keys, or write to the notebook after they have gone.
   */
  function destroy() {
    if (destroyed) return;
    // The hub destroys one scenario to mount the next. Walking away from a cue
    // is a response, and the commonest one — unrecorded, ADR 0018's question
    // would be answered from only the learners who pressed something.
    answerCue("left");
    running = false;
    if (raf) cancelAnimationFrame(raf), (raf = null);
    destroyed = true;
    removeEventListener("resize", resize);
    removeEventListener("keydown", onKey);
    document.removeEventListener("visibilitychange", onVisibility);
    observer?.disconnect();
    root.remove();
  }

  const api = { reveal, play, pause, advance, destroy, get choice() { return gate.choice; },
                get attempts() { return gate.attempts; },
                get record() { return { ...gate.record, params: committedParams, cue: cueState }; } };

  function onKey(e) {
    if (e.key === " ") { e.preventDefault(); gate.canRun && (running ? pause() : play()); }
    if (e.key === "r") { softReset(); render(); }
  }

  if (wrapped) {
    const a = topic.embed.attribution;
    el("p", "lab-credit", foot,
       `${a.work} by ${a.author} — ${a.licence}`);
  }

  softReset();
  renderConfusion();
  document.addEventListener("visibilitychange", onVisibility);
  addEventListener("resize", resize);
  resize();
  // The first rect can be wrong before fonts and layout settle; a ResizeObserver
  // corrects it without a guessed timeout.
  if (typeof ResizeObserver === "function") (observer = new ResizeObserver(resize)).observe(stage);
  requestAnimationFrame(resize);
  addEventListener("keydown", onKey);

  return api;
}

// ---- tiny helpers --------------------------------------------------------
function el(tag, cls, parent, text) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text !== undefined) n.textContent = text;
  parent?.appendChild(n);
  return n;
}
function button(parent, label, onclick, cls) {
  const b = el("button", cls, parent);
  b.type = "button";
  b.textContent = label;
  b.onclick = onclick;
  return b;
}
function decimals(step) {
  const s = String(step);
  return s.includes(".") ? s.split(".")[1].length : 0;
}
