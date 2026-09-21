// SPDX-License-Identifier: MIT
/**
 * Falling, with and without air.
 *
 * The model is two bodies of the SAME SIZE AND SHAPE and different mass —
 * Galileo's two cannonballs, not a hammer and a feather. That is the honest
 * way to show the concept: with the shape held constant, the only thing left
 * that could matter is mass, and in a vacuum it demonstrably does not.
 *
 * Air resistance is quadratic, F = k·v², with k a property of the shape. Two
 * bodies of the same shape share k, so the heavier one has the higher terminal
 * speed and reaches the ground first. This is why a feather loses: not because
 * it is light, but because it is light FOR ITS SIZE.
 */

export const G = 9.81;

/** The closed form, and the oracle the simulation is checked against. */
export function freeFallTime(height, g = G) {
  if (height <= 0) return 0;
  return Math.sqrt((2 * height) / g);
}

/** Steady speed where drag cancels weight: k·v² = m·g. Infinite without air. */
export function terminalSpeed(mass, k, g = G) {
  if (k <= 0) return Infinity;
  return Math.sqrt((mass * g) / k);
}

/**
 * One step. Position advances by v·dt + ½·a·dt², not by v·dt.
 *
 * The other primitives use semi-implicit Euler, and it is wrong here. Its
 * position error is O(dt), which lands as a systematic g·dt·t/2 bias in the
 * fall TIME — 8 ms at 60fps, against differences this primitive reports as
 * meaningful at 10 ms. It would make both bodies land measurably early and
 * still call it a tie, for the wrong reason. With constant acceleration the
 * quadratic form is exact, and with drag it is far closer.
 *
 * @param {{y:number,v:number,landed:boolean,t:number}} body  y measured DOWN from the drop point
 */
export function stepFall(body, { mass, k, height, g = G }, dt) {
  if (body.landed) return body;
  const drag = k > 0 ? (k * body.v * body.v) / mass : 0;   // always opposes motion, and it only ever falls
  const a = g - drag;
  body.y += body.v * dt + 0.5 * a * dt * dt;
  body.v += a * dt;
  body.t += dt;
  if (body.y >= height) {
    // Land it on the floor, not through it, and correct the time to the
    // crossing rather than the end of the step: at 60fps a whole step is
    // 17ms, which is larger than the difference this primitive measures.
    const overshoot = body.y - height;
    body.t -= body.v > 0 ? overshoot / body.v : 0;
    body.y = height;
    body.landed = true;
  }
  return body;
}
