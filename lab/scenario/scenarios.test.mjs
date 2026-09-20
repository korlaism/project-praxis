// SPDX-License-Identifier: MIT
/**
 * Every shipped scenario, held to the contract a generated one will face.
 *
 * The last test here is the answer check from ADR 0007 — run the simulation,
 * see what actually happens, and confirm it is the option the scenario claims
 * is correct. It is the single most valuable check in the project, because it
 * is the one no amount of model quality substitutes for.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { validateScenario } from "./schema.mjs";
import { runHeadless, checkAnswer } from "./run.mjs";
import { PRIMITIVES, getPrimitive, resolveParams } from "../primitives/index.mjs";

import whichWay from "../scenarios/which-way-does-it-fly.mjs";
import truckFly from "../scenarios/truck-and-fly.mjs";
import pucks from "../scenarios/what-keeps-it-moving.mjs";

const SHIPPED = { whichWay, truckFly, pucks };

test("every primitive satisfies the contract", () => {
  for (const [id, p] of Object.entries(PRIMITIVES)) {
    assert.equal(p.id, id, `${id}: id must match its registry key`);
    for (const fn of ["setup", "step", "draw", "classify"])
      assert.equal(typeof p[fn], "function", `${id}: missing ${fn}()`);
    assert.ok(Array.isArray(p.controls) && p.controls.length, `${id}: needs controls`);
    assert.ok(Array.isArray(p.outcomes) && p.outcomes.length >= 2, `${id}: needs outcomes`);
    for (const c of p.controls) {
      for (const k of ["key", "label", "min", "max", "step", "default"])
        assert.ok(c[k] !== undefined, `${id}: control ${c.key} missing ${k}`);
      assert.ok(c.default >= c.min && c.default <= c.max, `${id}: ${c.key} default out of range`);
    }
  }
});

test("a wrapped scenario is excluded from the answer check, and says whose work it is", () => {
  // ADR 0009: nothing can watch someone else's simulation, so the check that
  // makes our own scenarios trustworthy cannot run. The compensating rule is
  // that a wrapped one must credit its source and carry no parameters.
  for (const spec of Object.values(SHIPPED)) {
    if (!spec.embed) continue;
    assert.ok(spec.embed.attribution?.licence, `${spec.id}: wrapped scenarios must credit their source`);
    assert.equal(spec.params, undefined, `${spec.id}: a wrapped scenario cannot carry params`);
  }
});

for (const [name, spec] of Object.entries(SHIPPED)) {
  test(`${name}: validates against the schema`, () => {
    const r = validateScenario(spec);
    assert.deepEqual(r.errors, []);
  });

  test(`${name}: carries the id and subject a notebook card needs`, () => {
    assert.ok(typeof spec.id === "string" && spec.id, "no id — the card could not say which scenario");
    assert.ok(typeof spec.subject === "string" && spec.subject, "no subject — the card has no notebook");
  });

  test(`${name}: names a real primitive, and only params it has`, { skip: !!spec.embed }, () => {
    const p = getPrimitive(spec.primitive);
    const keys = p.controls.map((c) => c.key);
    for (const k of Object.keys(spec.params))
      assert.ok(keys.includes(k), `param "${k}" is not a control of ${p.id}`);
  });

  test(`${name}: every option is either correct or carries an error tag`, () => {
    // An untagged wrong answer is a wasted distractor — it tells us nothing
    // about why the learner chose it, which is what R-002 needs.
    for (const o of spec.options) {
      if (o.id === spec.correct) continue;
      assert.ok(spec.errorTags?.[o.id], `option "${o.id}" has no error tag`);
    }
  });

  test(`${name}: finishes within the step budget`, { skip: !!spec.embed }, () => {
    const p = getPrimitive(spec.primitive);
    const run = runHeadless(p, resolveParams(p, spec.params));
    assert.ok(run.finished, `did not settle within ${run.seconds.toFixed(1)}s`);
  });

  test(`${name}: THE ANSWER CHECK — the claimed answer is what actually happens`, { skip: !!spec.embed }, () => {
    const p = getPrimitive(spec.primitive);
    const r = checkAnswer(spec, p, resolveParams(p, spec.params));
    assert.equal(r.observed, r.claimed,
      `scenario claims "${r.claimed}" but the simulation produced "${r.observed}"`);
  });
}

test("the answer check catches a scenario that claims the wrong thing", () => {
  // Proving the check bites, rather than trusting that it would.
  const p = getPrimitive(pucks.primitive);
  const lie = { ...pucks, correct: "needs" };
  const r = checkAnswer(lie, p, resolveParams(p, pucks.params));
  assert.equal(r.ok, false);
  assert.equal(r.observed, "runaway");
});

test("the answer check catches params that contradict the answer", () => {
  // Friction on, and the pushed puck no longer runs away. A generator that
  // changes the parameters without rethinking the answer gets caught here.
  const p = getPrimitive(pucks.primitive);
  const r = checkAnswer(pucks, p, resolveParams(p, { ...pucks.params, friction: 0.25, push: 0.4 }));
  assert.equal(r.ok, false, `expected a mismatch, observed "${r.observed}"`);
});
