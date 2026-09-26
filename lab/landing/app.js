// SPDX-License-Identifier: AGPL-3.0-or-later
/**
 * The phone landing. P-85, ADR 0017.
 *
 * Where a YouTube Short's link arrives. It is not a smaller lab: it gives up
 * the apparatus — no sliders, no re-running with different numbers — and keeps
 * the one thing that makes this project different from every other explainer.
 *
 * You predict first. A page that shows a viewer the question and then the
 * answer is the thing Praxis exists as an argument against, so the gate here is
 * the same module the lab uses, not a lookalike.
 *
 * What plays after the commitment is a RECORDING (replay.mjs), so the outcome
 * is the same run on every device.
 */
import { createGate, CONFIDENCE } from "../harness/gate.mjs";
import { SCENARIOS } from "../scenarios/index.mjs";
import { getPrimitive, resolveParams } from "../primitives/index.mjs";
import { recordRun } from "./replay.mjs";
import { errorTagFor } from "../scenario/mount.js";
import { openNotebook } from "../notebook/store.mjs";

const CONF_LABEL = {
  guessing: "guessing",
  leaning: "leaning that way",
  "fairly-sure": "fairly sure",
  certain: "certain",
};

function el(tag, cls, parent, text) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text != null) n.textContent = text;
  parent?.append(n);
  return n;
}

/** The scenario asked for, or the first one, so a bare link still works. */
export function scenarioFromHash(hash, scenarios = SCENARIOS) {
  const id = (hash || "").replace(/^#\/?s?\/?/, "").trim();
  return scenarios[decodeURIComponent(id)] ?? null;
}

export function mountLanding(spec, { root = document.body, notebook } = {}) {
  const primitive = getPrimitive(spec.primitive);
  const params = resolveParams(primitive, spec.params ?? {});
  const gate = createGate({ options: spec.options, correct: spec.correct });

  const page = el("div", "pl", root);
  el("h1", "pl-q", page, spec.question);
  if (spec.note) el("p", "pl-note", page, spec.note);

  const stage = el("div", "pl-stage", page);
  const canvas = el("canvas", "pl-canvas", stage);
  const ctx = canvas.getContext("2d");

  const ask = el("div", "pl-ask", page);
  el("p", "pl-ask-h", ask, "What do you think happens?");
  let pending = null;
  for (const o of spec.options) {
    const b = el("button", "pl-opt", ask, o.label);
    b.type = "button";
    b.id = `pl-opt-${o.id}`;
    b.onclick = () => commit(o.id);
  }
  const confRow = el("div", "pl-conf", ask);
  for (const level of CONFIDENCE) {
    const b = el("button", null, confRow, CONF_LABEL[level]);
    b.type = "button";
    b.setAttribute("aria-pressed", "false");
    b.onclick = () => {
      pending = pending === level ? null : level;
      for (const c of confRow.children)
        c.setAttribute("aria-pressed", String(c === b && pending === level));
    };
  }
  el("p", "pl-conf-note", ask, "How sure are you? (optional)");

  const verdict = el("div", "pl-verdict", page);
  verdict.hidden = true;

  // ---- the recording ----------------------------------------------------
  // Taken once, before anything is shown, so the frames exist by the time
  // there is anything to play. It is the same run the answer check measured.
  const run = recordRun(primitive, params);
  let frame = 0, timer = null, explained = false;

  function size() {
    const w = stage.clientWidth || 340;
    const h = Math.round(Math.min(w * 0.95, 420));
    const dpr = Math.min(devicePixelRatio || 1, 2);
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.height = `${h}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    paint();
  }

  function paint() {
    const view = { w: canvas.width / Math.min(devicePixelRatio || 1, 2), h: parseInt(canvas.style.height, 10) || 320 };
    try {
      primitive.draw(ctx, run.frames[frame], params, view, { revealed: gate.state === "revealed" });
    } catch (err) {
      // A drawing failure must not take the page with it — the question and
      // the options are the part that has to survive (P-27).
      console.error("draw failed:", err);
    }
  }

  function play() {
    stop();
    timer = setInterval(() => {
      if (frame >= run.frames.length - 1) { stop(); return finish(); }
      frame++;
      paint();
    }, run.dt * 1000);
  }
  function stop() { if (timer) clearInterval(timer), (timer = null); }

  /**
   * A hidden tab clamps setInterval to about once a second, so playback
   * crawls (the shape of P-69, in a different timer).
   *
   * This one resumes, where the lab deliberately does not. The lab is a
   * simulation you are watching happen and restarting it is the learner's
   * call; this is a recording, and a recording that carries on where it was
   * is what anyone who has used a video expects.
   */
  function onVisibility() {
    if (gate.state !== "committed") return;          // nothing is playing
    if (document.hidden) stop();
    else if (!timer) play();
  }

  function commit(id) {
    if (gate.state !== "awaiting") return;
    gate.commit(id, pending);
    ask.hidden = true;
    frame = 0;
    play();
  }

  function finish() {
    if (gate.state !== "committed") return;
    gate.reveal(run.outcome ?? undefined);
    paint();
    render();
    try {
      notebook?.record({
        subject: spec.subject, scenario: spec.id, ...gate.record,
        errorTag: errorTagFor(spec, gate.record), outcomeSource: "observed", params,
      });
    } catch (err) {
      console.error("could not file the prediction:", err);
    }
  }

  function render() {
    if (gate.state !== "revealed") { verdict.hidden = true; return; }
    const rec = gate.record;
    verdict.hidden = false;
    verdict.className = `pl-verdict ${gate.isCorrect ? "is-right" : "is-wrong"}`;
    verdict.innerHTML = "";
    const said = spec.options.find((o) => o.id === gate.choice)?.label ?? gate.choice;
    el("b", null, verdict,
       rec.unlisted ? "What happened was none of the choices."
       : gate.isCorrect ? "You had it." : `You said: ${said}${gate.confidence ? ` — ${CONF_LABEL[gate.confidence]}` : ""}.`);

    // ADR 0014: cue first, explanation second, and only on a first wrong go.
    const cue = !gate.isCorrect && rec.attempt === 0 && !explained
      ? spec.cues?.[errorTagFor(spec, rec)] ?? null
      : null;

    if (cue) {
      el("span", null, verdict, ` ${cue}`);
      const acts = el("div", "pl-acts", verdict);
      const again = el("button", "pl-again", acts, "Watch it again");
      again.type = "button";
      again.onclick = () => { frame = 0; paint(); play(); };
      const why = el("button", null, acts, "Show why");
      why.type = "button";
      why.onclick = () => { explained = true; render(); };
    } else {
      el("span", null, verdict, ` ${spec.explain ?? ""}`);
      const acts = el("div", "pl-acts", verdict);
      const open = el("a", "pl-open", acts, "Open the full lab →");
      open.href = `../#/s/${encodeURIComponent(spec.id)}`;
      el("p", "pl-open-note", verdict,
         "The lab lets you change the numbers and run it again. It wants a bigger screen.");
    }
  }

  size();
  addEventListener("resize", size);
  document.addEventListener("visibilitychange", onVisibility);
  return {
    destroy() {
      stop();
      removeEventListener("resize", size);
      document.removeEventListener("visibilitychange", onVisibility);
      page.remove();
    },
    /**
     * Step the recording without waiting for a timer — the same reason the lab
     * has advance() (P-69): a throttled tab makes playback unwatchable, and a
     * test should not sleep. Stops the timer first, so the two cannot race.
     */
    advance(frames = run.frames.length) {
      stop();
      for (let i = 0; i < frames && frame < run.frames.length - 1; i++) frame++;
      paint();
      if (frame >= run.frames.length - 1) finish();
      return this;
    },
    get record() { return gate.record; },
    get frames() { return run.frames.length; },
  };
}

export function startLanding({ store } = {}) {
  const notebook = store ?? openNotebook();
  const spec = scenarioFromHash(location.hash) ?? Object.values(SCENARIOS)[0];
  const view = mountLanding(spec, { notebook });

  // The same verification hook the lab carries (P-69), for the same reason:
  // a throttled tab makes playback unwatchable, so checking this surface from
  // outside would otherwise mean waiting minutes. Off unless asked for.
  if (/(?:^|[?&])verify=1(?:&|$)/.test(location.search || "")) {
    globalThis.praxisVerify = {
      advance: (frames) => (view.advance(frames), undefined),
      record: () => view.record,
    };
  }
  return view;
}
