// SPDX-License-Identifier: MIT
import { test } from "node:test";
import assert from "node:assert/strict";
import { accelerationFrom, contactForce, elasticCollision1D, momentum, kineticEnergy,
         stepContact, runContact } from "./collision.mjs";

const close = (a, b, eps = 1e-9) =>
  assert.ok(Math.abs(a - b) <= eps, `expected ${b}, got ${a}`);

test("acceleration is force divided by mass", () => {
  close(accelerationFrom(10, 2), 5);
  close(accelerationFrom(-10, 4), -2.5);
});

test("the SAME force produces accelerations in inverse proportion to mass", () => {
  // The whole topic. Newton's third law gives equal forces; it does not give
  // equal accelerations, and conflating the two is the misconception.
  const F = 12;
  const truck = accelerationFrom(F, 2000);
  const fly = accelerationFrom(F, 0.0002);
  close(fly / truck, 2000 / 0.0002, 1e-3);
  assert.ok(Math.abs(fly) > Math.abs(truck), "the lighter body accelerates far more");
});

test("no contact means no force", () => {
  close(contactForce(500, -0.01), 0);
  close(contactForce(500, 0), 0);
});

test("contact force grows with overlap", () => {
  close(contactForce(500, 0.02), 10);
  assert.ok(contactForce(500, 0.04) > contactForce(500, 0.02));
});

test("an elastic collision conserves momentum", () => {
  const [m1, u1, m2, u2] = [3, 5, 7, -2];
  const { v1, v2 } = elasticCollision1D(m1, u1, m2, u2);
  close(momentum(m1, v1) + momentum(m2, v2), momentum(m1, u1) + momentum(m2, u2), 1e-9);
});

test("an elastic collision conserves kinetic energy", () => {
  const [m1, u1, m2, u2] = [3, 5, 7, -2];
  const { v1, v2 } = elasticCollision1D(m1, u1, m2, u2);
  close(kineticEnergy(m1, v1) + kineticEnergy(m2, v2),
        kineticEnergy(m1, u1) + kineticEnergy(m2, u2), 1e-9);
});

test("equal masses simply exchange velocities", () => {
  const { v1, v2 } = elasticCollision1D(2, 6, 2, -1);
  close(v1, -1);
  close(v2, 6);
});

test("a truck meeting a fly barely notices, and the fly leaves at twice the truck's speed", () => {
  const { v1, v2 } = elasticCollision1D(2000, 20, 0.0002, 0);
  close(v1, 20, 1e-4);                 // the truck is essentially unaffected
  close(v2, 40, 1e-3);                 // the fly departs at ~2u
  assert.ok(v2 > v1, "the fly ends up faster than the truck that hit it");
});

test("a substep applies the same force magnitude to both bodies", () => {
  const s = { xt: 0.01, vt: 10, xf: 0, vf: 0 };
  const before = { vt: s.vt, vf: s.vf };
  const F = stepContact(s, 1e-5, { mt: 1000, mf: 0.001, stiffness: 500 });
  close((before.vt - s.vt) * 1000, (s.vf - before.vf) * 0.001, 1e-9);
  assert.ok(F > 0);
});

test("the stepped contact reproduces the exact elastic result", () => {
  // The claim in research/04: a simulation that quietly violates conservation
  // while teaching conservation is a defect. This is that check.
  const cfg = { mt: 2000, mf: 200e-6, stiffness: 500, u: 20 };
  const sim = runContact(cfg);
  const exact = elasticCollision1D(cfg.mt, cfg.u, cfg.mf, 0);
  close(sim.v2, exact.v2, 1e-3);
  close(sim.v1, exact.v1, 1e-6);
});

test("it stays exact across the range the sliders allow", () => {
  for (const mt of [1000, 5000]) for (const mf of [10e-6, 500e-6]) for (const u of [5, 30]) {
    const sim = runContact({ mt, mf, stiffness: 500, u });
    const exact = elasticCollision1D(mt, u, mf, 0);
    const err = Math.abs(sim.v2 - exact.v2) / Math.abs(exact.v2);
    assert.ok(err < 2e-3, `mt=${mt} mf=${mf} u=${u}: v2 off by ${(err * 100).toFixed(3)}%`);
  }
});
