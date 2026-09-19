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

  // ---- stage ------------------------------------------------------------
  const stage = el("div", "lab-stage", root);
  const canvas = document.createElement("canvas");
  stage.appendChild(canvas);
  const ctx = canvas.getContext("2d");

  const gateEl = el("div", "lab-gate", stage);
  el("div", "lab-gate-label", gateEl).textContent = "Commit before you watch";
  const optsEl = el("div", "lab-opts", gateEl);

  let pendingConfidence = null;
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
      gateEl.hidden = true;
      play();
      render();
    };
  }

  const verdict = el("div", "lab-verdict", stage);
  verdict.hidden = true;

  // ---- foot -------------------------------------------------------------
  const foot = el("div", "lab-foot", root);
  const transport = el("div", "lab-transport", foot);
  const playBtn = button(transport, "Play", () => (running ? pause() : play()), "primary");
  const stepBtn = button(transport, "Step", () => { tick(1 / 60); render(); });
  const resetBtn = button(transport, "Reset", () => { softReset(); render(); });
  const againBtn = button(transport, "Ask again", () => { gate.reset(); softReset(); render(); });

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
    input.oninput = () => { params[p.key] = +input.value; show(); softReset(); render(); };
    show();
    wrap.append(input, out);
  }
  const clock = el("div", "lab-clock", foot);

  // ---- loop -------------------------------------------------------------
  let state, t, running = false, raf = null, last = 0;

  function softReset() {
    pause();
    t = 0;
    state = topic.setup?.({}, params) ?? {};
  }

  function tick(dt) {
    if (!gate.canRun) return;            // the whole point: locked until committed
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
    const r = stage.getBoundingClientRect();
    const dpr = Math.min(devicePixelRatio || 1, 2);
    const w = Math.max(320, Math.floor(r.width - 32));
    const h = Math.max(240, Math.floor(r.height - 32));
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    render();
  }

  function render() {
    const view = { w: canvas.width / (devicePixelRatio || 1), h: canvas.height / (devicePixelRatio || 1), t };
    ctx.clearRect(0, 0, view.w, view.h);
    topic.draw?.(ctx, state, params, view);

    gateEl.hidden = gate.canRun;
    playBtn.textContent = running ? "Pause" : "Play";
    for (const b of [playBtn, stepBtn, resetBtn]) b.disabled = !gate.canRun;
    againBtn.disabled = !gate.canRun;
    clock.textContent = `t = ${t.toFixed(2)}s`;

    if (gate.state === "revealed") {
      verdict.hidden = false;
      verdict.className = `lab-verdict ${gate.isCorrect ? "is-right" : "is-wrong"}`;
      const said = topic.options.find((o) => o.id === gate.choice)?.label ?? gate.choice;
      const conf = gate.confidence ? ` — ${CONF_LABEL[gate.confidence]}` : "";
      verdict.innerHTML = "";
      const b = document.createElement("b");
      b.textContent = gate.isCorrect ? "You had it." : `You said: ${said}${conf}.`;
      const s = document.createElement("span");
      s.textContent = " " + (topic.explain ?? "");
      verdict.append(b, s);
    } else {
      verdict.hidden = true;
    }
  }

  /** A topic calls this when the outcome has become undeniable on screen. */
  function reveal() {
    if (gate.state === "committed") { gate.reveal(); render(); }
  }

  softReset();
  addEventListener("resize", resize);
  resize();
  addEventListener("keydown", (e) => {
    if (e.key === " ") { e.preventDefault(); gate.canRun && (running ? pause() : play()); }
    if (e.key === "r") { softReset(); render(); }
  });

  return { reveal, get record() { return gate.record; }, play, pause };
}

// ---- tiny helpers --------------------------------------------------------
function el(tag, cls, parent) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
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
