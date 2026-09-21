// SPDX-License-Identifier: MIT
import { test } from "node:test";
import assert from "node:assert/strict";
import { freeFallTime, terminalSpeed, stepFall, G } from "./falling.mjs";

const drop = (mass, k, height, dt = 1 / 240) => {
  const b = { y: 0, v: 0, t: 0, landed: false };
  for (let i = 0; i < 200000 && !b.landed; i++) stepFall(b, { mass, k, height }, dt);
  return b;
};

test("without air, the simulation matches the closed form", () => {
  // The oracle. If these drift apart the integrator is wrong, and every
  // falling item built on it is unverifiable.
  for (const h of [1, 5, 20, 45]) {
    const b = drop(1, 0, h);
    assert.ok(Math.abs(b.t - freeFallTime(h)) < 0.005,
      `h=${h}: simulated ${b.t.toFixed(4)}s vs closed form ${freeFallTime(h).toFixed(4)}s`);
  }
});

test("without air, mass makes no difference at all", () => {
  const light = drop(0.1, 0, 20), heavy = drop(50, 0, 20);
  assert.ok(Math.abs(light.t - heavy.t) < 1e-9,
    `500x the mass changed the fall by ${Math.abs(light.t - heavy.t)}s`);
});

test("with air, the heavier body of the same shape lands first", () => {
  const light = drop(0.1, 0.02, 20), heavy = drop(5, 0.02, 20);
  assert.ok(heavy.t < light.t, `heavy ${heavy.t.toFixed(3)}s, light ${light.t.toFixed(3)}s`);
});

test("terminal speed rises with mass and is infinite in a vacuum", () => {
  assert.equal(terminalSpeed(1, 0), Infinity);
  assert.ok(terminalSpeed(5, 0.02) > terminalSpeed(0.1, 0.02));
  // k·v² = m·g at terminal, by definition
  const m = 3, k = 0.05, v = terminalSpeed(m, k);
  assert.ok(Math.abs(k * v * v - m * G) < 1e-9);
});

test("nothing falls through the floor, and the landing time is interpolated", () => {
  // A whole 60fps step is 17ms, larger than the differences this measures.
  const coarse = drop(1, 0, 10, 1 / 60), fine = drop(1, 0, 10, 1 / 2000);
  assert.ok(Math.abs(coarse.t - fine.t) < 0.005,
    `coarse ${coarse.t.toFixed(4)}s vs fine ${fine.t.toFixed(4)}s`);
  assert.equal(coarse.y, 10);
});
