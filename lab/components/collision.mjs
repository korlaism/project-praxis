/**
 * Contact, force and collision in one dimension.
 *
 * A reusable STEAM component: pure functions, exact, no engine underneath.
 * The equations stay visible because they are the teaching material — a
 * black-box solver would get the numbers right while hiding the mechanism,
 * and hiding the mechanism is what this project exists to stop.
 */

/** Newton's second law, the form that matters here: a = F / m. */
export function accelerationFrom(force, mass) {
  return force / mass;
}

/**
 * Contact modelled as a stiff spring while the bodies overlap.
 *
 * Deliberately not an instantaneous impulse. A collision resolved in one frame
 * hides the very thing worth seeing: during contact there is a force, it acts
 * for a real span of time, and it is the SAME size on both bodies.
 */
export function contactForce(stiffness, overlap) {
  return overlap > 0 ? stiffness * overlap : 0;
}

/** Momentum, p = mv. */
export function momentum(mass, velocity) {
  return mass * velocity;
}

/** Kinetic energy, ½mv². */
export function kineticEnergy(mass, velocity) {
  return 0.5 * mass * velocity * velocity;
}

/**
 * Head-on elastic collision — the closed-form outcome, conserving both
 * momentum and kinetic energy.
 *
 * Kept for checking the stepped simulation against an exact answer. In the
 * limit m1 >> m2 it gives v1 ≈ u1 and v2 ≈ 2u1 − u2: the truck carries on and
 * the fly leaves at roughly twice the truck's speed.
 */
export function elasticCollision1D(m1, u1, m2, u2) {
  const total = m1 + m2;
  return {
    v1: ((m1 - m2) * u1 + 2 * m2 * u2) / total,
    v2: ((m2 - m1) * u2 + 2 * m1 * u1) / total,
  };
}

/**
 * One semi-implicit Euler substep of a spring contact between two bodies.
 *
 * Mutates and returns the force applied this substep, which is the same
 * magnitude on both bodies by construction — the third law is not asserted
 * here, it is the only thing the code can express.
 *
 * Semi-implicit (velocity updated before position) rather than plain Euler,
 * because it conserves energy well for an oscillator and a contact IS half an
 * oscillation. `contactIsExact` checks that claim against the closed form.
 */
export function stepContact(s, h, { mt, mf, stiffness }) {
  const F = contactForce(stiffness, s.xt - s.xf);
  s.vt += accelerationFrom(-F, mt) * h;
  s.vf += accelerationFrom(+F, mf) * h;
  s.xt += s.vt * h;
  s.xf += s.vf * h;
  return F;
}

/**
 * Integrate a whole collision and report the outgoing velocities, so the
 * stepped simulation can be held against `elasticCollision1D`.
 */
export function runContact({ mt, mf, stiffness, u, gap = 0.05, h = 4e-6, maxSteps = 4e6 }) {
  const s = { xt: 0, vt: u, xf: gap, vf: 0 };
  let touched = false;
  for (let i = 0; i < maxSteps; i++) {
    const F = stepContact(s, h, { mt, mf, stiffness });
    if (F > 0) touched = true;
    else if (touched) break;
  }
  return { v1: s.vt, v2: s.vf };
}
