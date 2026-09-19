import { test } from "node:test";
import assert from "node:assert/strict";
import { integrate, frictionAcceleration, applyFriction, positionUnderConstantForce,
         stoppingDistance, netAccelerationWithFriction, stepWithFriction } from "./motion.mjs";

const close = (a, b, eps = 1e-9) =>
  assert.ok(Math.abs(a - b) <= eps, `expected ${b}, got ${a}`);

test("with no force at all, speed never changes", () => {
  // The entire topic. Nothing is needed to keep it moving.
  const s = { x: 0, v: 7 };
  for (let i = 0; i < 10000; i++) integrate(s, 0, 1e-3);
  close(s.v, 7, 1e-12);
  close(s.x, 70, 1e-9);
});

test("a constant force does not hold speed — it keeps adding to it", () => {
  const s = { x: 0, v: 3 };
  const a = 2;
  const dt = 1e-4, steps = 50000;          // 5 seconds
  for (let i = 0; i < steps; i++) integrate(s, a, dt);
  close(s.v, 3 + a * 5, 1e-9);
  close(s.x, positionUnderConstantForce(0, 3, a, 5), 1e-3);
});

test("friction opposes motion, whichever way it is going", () => {
  assert.ok(frictionAcceleration(0.2, 9.81, 5) < 0);
  assert.ok(frictionAcceleration(0.2, 9.81, -5) > 0);
  close(frictionAcceleration(0.2, 9.81, 0), 0);
});

test("friction brings it to rest and leaves it there", () => {
  // Naive -mu*g*sign(v) flips the sign at low speed and makes the puck
  // judder backwards forever. It must clamp to rest instead.
  const s = { x: 0, v: 4 };
  for (let i = 0; i < 20000; i++) applyFriction(s, 0.3, 9.81, 1e-3);
  close(s.v, 0, 1e-12);
  const restingAt = s.x;
  for (let i = 0; i < 5000; i++) applyFriction(s, 0.3, 9.81, 1e-3);
  close(s.x, restingAt, 1e-12, "a resting puck must not creep");
});

test("it stops where the textbook says it stops", () => {
  const [mu, g, u] = [0.25, 9.81, 6];
  const s = { x: 0, v: u };
  let steps = 0;
  // Run until it actually stops — u/(mu*g) is about 2.4s here, and an
  // arbitrary step count silently measures a puck still in motion.
  while (s.v > 0 && steps++ < 1e7) applyFriction(s, mu, g, 1e-5);
  assert.equal(s.v, 0, "it should have come to rest");
  close(s.x, stoppingDistance(mu, g, u), 1e-3);
});

test("zero friction never stops anything", () => {
  const s = { x: 0, v: 9 };
  for (let i = 0; i < 100000; i++) applyFriction(s, 0, 9.81, 1e-3);
  close(s.v, 9, 1e-12);
});

test("a push smaller than friction does not shift a resting body", () => {
  const a = netAccelerationWithFriction({ v: 0, appliedForce: 0.4, mass: 0.5, mu: 0.12, g: 9.81 });
  close(a, 0);
});

test("a push bigger than friction does shift it", () => {
  const a = netAccelerationWithFriction({ v: 0, appliedForce: 2, mass: 0.5, mu: 0.12, g: 9.81 });
  assert.ok(a > 0);
  close(a, (2 - 0.12 * 0.5 * 9.81) / 0.5);
});

test("a body stopped by friction stays stopped, it does not creep", () => {
  // The defect this replaced: it stops, friction vanishes at v=0, the push
  // restarts it, and it inches forward forever looking like steady motion.
  const cfg = { appliedForce: 0.4, mass: 0.5, mu: 0.12, g: 9.81 };
  const s = { x: 0, v: 4 };
  for (let i = 0; i < 20000; i++) stepWithFriction(s, cfg, 1e-3);
  close(s.v, 0, 1e-12);
  const restingAt = s.x;
  for (let i = 0; i < 20000; i++) stepWithFriction(s, cfg, 1e-3);
  close(s.x, restingAt, 1e-12, "it crept");
});

test("with no friction at all, any push keeps adding speed forever", () => {
  const cfg = { appliedForce: 0.6, mass: 0.5, mu: 0, g: 9.81 };
  const s = { x: 0, v: 4 };
  for (let i = 0; i < 5000; i++) stepWithFriction(s, cfg, 1e-3);
  close(s.v, 4 + (0.6 / 0.5) * 5, 1e-9);
});
