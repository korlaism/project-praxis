// SPDX-License-Identifier: MIT
/**
 * Straight-line motion, force and friction.
 *
 * A reusable STEAM component: pure, exact, no engine underneath. The equations
 * stay visible because they are the teaching material.
 *
 * The point this file exists to make: `integrate(s, 0, dt)` leaves the velocity
 * untouched, forever. Nothing is needed to keep something moving.
 */

/** Semi-implicit Euler: velocity first, then position. */
export function integrate(s, acceleration, dt) {
  s.v += acceleration * dt;
  s.x += s.v * dt;
  return s;
}

/** Kinetic friction, opposing whichever way it is travelling. */
export function frictionAcceleration(mu, g, v) {
  if (v === 0) return 0;
  return -Math.sign(v) * mu * g;
}

/**
 * One step under friction alone.
 *
 * Clamped at rest rather than allowed to reverse. A naive `-mu*g*sign(v)`
 * overshoots through zero on the last step and the body judders backwards
 * forever — a small bug that would quietly teach the wrong thing.
 */
export function applyFriction(s, mu, g, dt) {
  const a = frictionAcceleration(mu, g, s.v);
  const stops = a !== 0 && Math.abs(s.v) <= Math.abs(a * dt);
  if (stops) { s.v = 0; return s; }
  return integrate(s, a, dt);
}

/** Closed form, for holding the stepped version to account: x = x₀ + v₀t + ½at². */
export function positionUnderConstantForce(x0, v0, a, t) {
  return x0 + v0 * t + 0.5 * a * t * t;
}

/** How far it slides before friction stops it: u² / 2μg. */
export function stoppingDistance(mu, g, u) {
  return mu === 0 ? Infinity : (u * u) / (2 * mu * g);
}

/**
 * Net acceleration of a body that may be at rest, including static friction.
 *
 * Without the resting case, a body whose push is smaller than friction stops,
 * loses its friction the instant v hits zero, gets restarted by the push, and
 * creeps forward forever. It looks like slow steady motion and it is a lie —
 * a box you cannot shift does not inch across the floor.
 *
 * One coefficient is used for both static and kinetic friction. Real surfaces
 * differ; the simplification is deliberate and does not affect the lesson.
 */
export function netAccelerationWithFriction({ v, appliedForce, mass, mu, g }) {
  const maxFriction = mu * mass * g;
  if (v === 0) {
    if (Math.abs(appliedForce) <= maxFriction) return 0;          // it stays put
    return (appliedForce - Math.sign(appliedForce) * maxFriction) / mass;
  }
  return appliedForce / mass + frictionAcceleration(mu, g, v);
}

/** One step for a body under a push and friction, clamped at rest. */
export function stepWithFriction(s, { appliedForce, mass, mu, g }, dt) {
  const a = netAccelerationWithFriction({ v: s.v, appliedForce, mass, mu, g });
  const wouldCross = s.v !== 0 && Math.sign(s.v + a * dt) !== Math.sign(s.v);
  if (wouldCross && Math.abs(appliedForce) <= mu * mass * g) { s.v = 0; return s; }
  return integrate(s, a, dt);
}
