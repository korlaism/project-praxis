// SPDX-License-Identifier: MIT
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


/**
 * Every outcome a primitive can actually reach across its control grid.
 *
 * P-50 asks for generated scenarios to be split by whether the parameters
 * decide the answer, and this is what decides that. Two of our four primitives
 * return the same outcome at every setting — every cut string flies along the
 * tangent, every collision is equal — which is the lesson, and which also
 * means a generator can be right about them without deriving anything. Scoring
 * those together with the ones where the answer must be worked out reads much
 * better than the generator deserves.
 *
 * Low, middle and high per control, as the primitive contract sweeps.
 */
export function reachableOutcomes(primitive, { dt = 1 / 60, maxSeconds = 120 } = {}) {
  let combos = [{}];
  for (const c of primitive.controls) {
    const mid = Math.round(((c.min + c.max) / 2) / c.step) * c.step;
    const values = [...new Set([c.min, mid, c.max])];
    combos = combos.flatMap((base) => values.map((v) => ({ ...base, [c.key]: v })));
  }
  const seen = new Set();
  for (const params of combos) {
    const p = {};
    for (const c of primitive.controls) p[c.key] = c.default;
    Object.assign(p, params);
    const run = runHeadless(primitive, p, { dt, maxSeconds });
    if (run.finished) {
      const o = primitive.classify(run.state, p);
      if (o !== null) seen.add(o);
    }
  }
  return seen;
}

/** True when no setting of the controls changes the answer. */
export function isParameterIndependent(primitive) {
  return reachableOutcomes(primitive).size <= 1;
}
