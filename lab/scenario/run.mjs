/**
 * Run a scenario with no DOM and no canvas.
 *
 * This is what makes a generated scenario checkable before anyone sees it: the
 * simulation is stepped to completion and its outcome measured, which is the
 * answer check in ADR 0007. Actions carrying `autoAt` fire at that time, so a
 * scenario needing an interaction is still deterministic.
 */
export function runHeadless(primitive, params, { dt = 1 / 60, maxSeconds = 120 } = {}) {
  const state = primitive.setup(params);
  const fired = new Set();
  const api = { play() {}, pause() {}, reveal() {} };
  let t = 0;

  while (!state.done && t < maxSeconds) {
    for (const a of primitive.actions ?? []) {
      if (a.autoAt === undefined || fired.has(a.id)) continue;
      if (t >= a.autoAt && (!a.enabled || a.enabled(state, params))) {
        a.onClick(state, params, api);
        fired.add(a.id);
      }
    }
    primitive.step(state, dt, params);
    t += dt;
  }
  return { state, seconds: t, finished: !!state.done };
}

/**
 * The answer check: does the option marked correct match what actually happened,
 * and did no distractor happen instead?
 */
export function checkAnswer(spec, primitive, params) {
  const run = runHeadless(primitive, params);
  const observed = primitive.classify(run.state, params);
  return {
    ok: observed === spec.correct,
    observed,
    claimed: spec.correct,
    finished: run.finished,
    seconds: run.seconds,
  };
}
