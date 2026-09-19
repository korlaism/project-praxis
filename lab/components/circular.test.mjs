import { test } from "node:test";
import assert from "node:assert/strict";
import { positionOnCircle, tangentVelocity, advance, speed } from "./circular.mjs";

const close = (a, b, eps = 1e-9) =>
  assert.ok(Math.abs(a - b) < eps, `expected ${b}, got ${a}`);

test("a point on the circle sits at radius r from the centre", () => {
  const p = positionOnCircle({ cx: 10, cy: -4 }, 3, 0.7);
  close(Math.hypot(p.x - 10, p.y + 4), 3);
});

test("theta = 0 is the positive x direction", () => {
  const p = positionOnCircle({ cx: 0, cy: 0 }, 2, 0);
  close(p.x, 2);
  close(p.y, 0);
});

test("release speed is omega times r — the string length matters", () => {
  close(speed(tangentVelocity(2, 5, 1.1)), 10);
  close(speed(tangentVelocity(4, 5, 1.1)), 20, 1e-9);
});

test("the release velocity is perpendicular to the string", () => {
  // This is the whole misconception: people expect it along the string, outward.
  for (const theta of [0, 0.4, 1.9, 3.3, 5.7]) {
    const p = positionOnCircle({ cx: 0, cy: 0 }, 3, theta);
    const v = tangentVelocity(3, 2, theta);
    const dot = p.x * v.x + p.y * v.y;   // radius vector from centre, dotted with velocity
    close(dot, 0, 1e-9);
  }
});

test("reversing the spin reverses the tangent", () => {
  const a = tangentVelocity(3, 2, 1.0);
  const b = tangentVelocity(3, -2, 1.0);
  close(a.x, -b.x);
  close(a.y, -b.y);
});

test("after release it travels in a straight line at constant speed", () => {
  const p0 = positionOnCircle({ cx: 0, cy: 0 }, 3, 0.9);
  const v = tangentVelocity(3, 2, 0.9);
  let p = p0;
  for (let i = 0; i < 100; i++) p = advance(p, v, 0.01);   // one second, in steps
  close(Math.hypot(p.x - p0.x, p.y - p0.y), speed(v) * 1.0, 1e-9);
});

test("it moves away from the centre, but never along the string", () => {
  const p0 = positionOnCircle({ cx: 0, cy: 0 }, 3, 0.9);
  const v = tangentVelocity(3, 2, 0.9);
  const later = advance(p0, v, 0.5);
  assert.ok(Math.hypot(later.x, later.y) > 3, "distance from centre grows");
  const radialFraction =
    (later.x * p0.x + later.y * p0.y) / (Math.hypot(later.x, later.y) * 3);
  assert.ok(radialFraction < 0.999, "the path is not radial");
});
