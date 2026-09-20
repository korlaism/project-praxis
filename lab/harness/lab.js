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
 *     question, note, options, correct, explain,
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
  verdict.hidden = true;

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
  const againBtn = button(transport, "Ask again", () => { gate.reset(); softReset(); render(); });

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
      if (gate.state !== "awaiting") { gate.reset(); committedParams = null; }
      softReset();
      render();
    };
    show();
    wrap.append(input, out);
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
      const s = document.createElement("span");
      const why = typeof topic.explain === "function" ? topic.explain(rec) : topic.explain;
      s.textContent = " " + (why ?? "");
      verdict.append(b, s);
    } else {
      verdict.hidden = true;
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
    running = false;
    if (raf) cancelAnimationFrame(raf), (raf = null);
    destroyed = true;
    removeEventListener("resize", resize);
    removeEventListener("keydown", onKey);
    observer?.disconnect();
    root.remove();
  }

  const api = { reveal, play, pause, destroy, get choice() { return gate.choice; },
                get record() { return { ...gate.record, params: committedParams }; } };

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
