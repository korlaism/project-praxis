/**
 * Circular motion and release.
 *
 * A reusable STEAM component: pure functions, exact, no engine underneath.
 * The equations are the teaching material, so they stay visible here rather
 * than disappearing into a solver — see research/04-open-source-landscape.md.
 *
 * Coordinates are mathematical (theta = 0 along +x, anticlockwise positive).
 * A renderer that draws with y pointing down should flip y at draw time, not
 * here.
 */

/** Where a body sits on a circle of radius r at angle theta. */
export function positionOnCircle({ cx = 0, cy = 0 }, r, theta) {
  return { x: cx + r * Math.cos(theta), y: cy + r * Math.sin(theta) };
}

/**
 * Velocity at the instant the string is cut.
 *
 * Perpendicular to the string, magnitude omega * r. This is the whole lesson:
 * there is no outward component, and there never was one. The string was
 * pulling *inward*; remove it and nothing pushes the body anywhere — it simply
 * keeps the velocity it already had.
 */
export function tangentVelocity(r, omega, theta) {
  return { x: -omega * r * Math.sin(theta), y: omega * r * Math.cos(theta) };
}

/** The unit vector along the string, centre outward — the common wrong answer. */
export function radialDirection(theta) {
  return { x: Math.cos(theta), y: Math.sin(theta) };
}

/** Straight-line motion. No force, so no acceleration. */
export function advance(p, v, dt) {
  return { x: p.x + v.x * dt, y: p.y + v.y * dt };
}

export function speed(v) {
  return Math.hypot(v.x, v.y);
}

/** Centripetal acceleration — the force the string was actually applying. */
export function centripetalAcceleration(r, omega) {
  return omega * omega * r;
}
