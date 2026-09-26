// SPDX-License-Identifier: MIT
/**
 * Record a run once, so the phone can play it back. P-85, ADR 0017.
 *
 * The landing shows what happened as a **recording**, not a live simulation.
 * That is not a performance decision: the lab steps at wall-clock time clamped
 * per frame, so on a slow or throttled device the same scenario can take a
 * different path through the integrator. On the surface most people will meet
 * first — a link under a thirty-second video — the outcome has to be the same
 * run every time, or `R-021` stops holding where it matters most.
 *
 * So the run is stepped at a fixed dt with the same action handling the answer
 * check uses, and each frame is deep-copied out. Playback draws stored states
 * and never steps anything.
 */

/**
 * @param primitive a registry primitive
 * @param params    resolved parameters
 * @returns {{frames: object[], outcome: string|null, dt: number, finished: boolean}}
 */
export function recordRun(primitive, params, { fps = 30, maxSeconds = 30 } = {}) {
  const dt = 1 / fps;
  const state = primitive.setup(params);
  const fired = new Set();
  // The action api the primitives expect. Nothing here plays or reveals:
  // a recording has no transport.
  const api = { play() {}, pause() {}, reveal() {} };

  const frames = [structuredClone(state)];
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
    frames.push(structuredClone(state));
  }

  const finished = !!state.done;
  return {
    frames,
    dt,
    finished,
    // An unfinished recording decides nothing, exactly as an unfinished run
    // classifies as null rather than guessing.
    outcome: finished ? primitive.classify(state, params) : null,
  };
}
