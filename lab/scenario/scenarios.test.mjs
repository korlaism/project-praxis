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
import { runHeadless, checkAnswer, reachableOutcomes, isParameterIndependent } from "./run.mjs";
import { PRIMITIVES, getPrimitive, resolveParams } from "../primitives/index.mjs";

import whichWay from "../scenarios/which-way-does-it-fly.mjs";
import truckFly from "../scenarios/truck-and-fly.mjs";
import pucks from "../scenarios/what-keeps-it-moving.mjs";
import BANK from "../scenarios/bank/index.mjs";

const SHIPPED = { whichWay, truckFly, pucks };

/* ── P-99: an outcome list does two jobs, and now says which is which ─────
 *
 * `outcomes` is both what the simulation can produce AND the vocabulary a
 * scenario's options are drawn from. Nothing distinguished them, so a
 * reachability test over the whole list flagged two-pucks' "needs" — a
 * deliberate wrong answer — as a defect, and the test had to be narrowed to
 * claimed answers instead. The generator then wrote an item whose correct
 * answer was "needs", because nothing in the prompt said it cannot happen.
 */

test("every primitive's distractors are among its outcomes", () => {
  for (const [id, p] of Object.entries(PRIMITIVES)) {
    for (const d of p.distractors ?? [])
      assert.ok(p.outcomes.includes(d), `${id}: "${d}" is a distractor but not an outcome`);
  }
});

test("every outcome that is not a distractor can actually be reached", () => {
  // The strong form, which P-98 could not assert and had to weaken. An
  // outcome a learner can never dial is one they meet only as "what happened
  // was none of the choices" — P-79, found twice.
  for (const [id, p] of Object.entries(PRIMITIVES)) {
    const reachable = reachableOutcomes(p);
    const distractors = new Set(p.distractors ?? []);
    for (const outcome of p.outcomes) {
      if (distractors.has(outcome)) continue;
      assert.ok(reachable.has(outcome),
        `${id} declares "${outcome}" and no setting of its controls produces it — ` +
        `either make it reachable or declare it a distractor`);
    }
  }
});

test("every declared distractor really is unreachable", () => {
  // Without this, the test above is dodged by declaring an awkward outcome a
  // distractor. A distractor is a claim about the simulation, and claims are
  // checked here.
  for (const [id, p] of Object.entries(PRIMITIVES)) {
    const reachable = reachableOutcomes(p);
    for (const d of p.distractors ?? [])
      assert.ok(!reachable.has(d),
        `${id} calls "${d}" a distractor, but the simulation produces it`);
  }
});

test("the primitives with distractors are the ones whose answer never varies", () => {
  // Not a coincidence worth leaving implicit: a primitive that always answers
  // the same way needs wrong options to be a question at all, and every other
  // outcome it names is one of them. two-pucks is the exception — it varies,
  // and still carries one belief nobody can dial.
  const withDistractors = Object.entries(PRIMITIVES)
    .filter(([, p]) => (p.distractors ?? []).length).map(([id]) => id).sort();
  assert.deepEqual(withDistractors, ["circular-release", "contact-collision", "two-pucks"]);

  for (const id of ["circular-release", "contact-collision"]) {
    const p = PRIMITIVES[id];
    assert.ok(isParameterIndependent(p), `${id} should answer the same at every setting`);
    assert.equal(p.distractors.length, p.outcomes.length - 1,
      `${id}: every outcome but the one it always produces should be a distractor`);
  }
});

test("every answer a scenario claims is one its primitive can actually produce", () => {
  // P-79: an item whose correct answer no setting of the controls reaches is
  // an item nobody can ever be right about by watching.
  //
  // Deliberately about the CLAIMED answer and not about every declared
  // outcome. An outcome list is also the vocabulary a scenario's options are
  // drawn from, so a primitive may legitimately declare outcomes that exist
  // only to be wrong answers — two-pucks declares "needs" for that reason,
  // and asserting over the whole list flags it as a defect when it is not.
  const reachable = new Map();
  for (const spec of [...Object.values(SHIPPED), ...BANK]) {
    if (spec.embed) continue;
    const p = getPrimitive(spec.primitive);
    if (!reachable.has(p.id)) reachable.set(p.id, reachableOutcomes(p));
    assert.ok(reachable.get(p.id).has(spec.correct),
      `${spec.id} claims "${spec.correct}", which no setting of ${p.id}'s controls produces`);
  }
});

test("every primitive satisfies the contract", () => {
  for (const [id, p] of Object.entries(PRIMITIVES)) {
    assert.equal(p.id, id, `${id}: id must match its registry key`);
    for (const fn of ["setup", "step", "draw", "classify"])
      assert.equal(typeof p[fn], "function", `${id}: missing ${fn}()`);
    assert.ok(Array.isArray(p.controls) && p.controls.length, `${id}: needs controls`);
    assert.ok(Array.isArray(p.outcomes) && p.outcomes.length >= 2, `${id}: needs outcomes`);
    // Ours, not the model's (P-102). A generated scenario claims a subject
    // too; knowing the primitive's own is what lets a measurement be split
    // by subject without trusting what the generator wrote.
    assert.ok(typeof p.subject === "string" && p.subject, `${id}: needs a subject`);
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

/* ── Every shipped scenario cues every misconception it names (ADR 0014) ──
 *
 * A wrong option with a tag but no cue is a learner told they are wrong and
 * handed the explanation — the arm the evidence says lost. If we are going to
 * tag the belief, we owe it a cue.
 */

test("every misconception tag a scenario carries has a cue", () => {
  for (const spec of Object.values(SHIPPED)) {
    const tags = new Set(Object.values(spec.errorTags ?? {}));
    for (const tag of tags)
      assert.ok(spec.cues?.[tag], `${spec.id} tags "${tag}" but offers no cue for it`);
  }
});

test("a cue never quotes the answer it is supposed to withhold", () => {
  // No validator can tell whether a cue gives the game away; this catches only
  // the crudest version, which is pasting the right option in. The real rule
  // is the authoring one: a learner who reads only the cue must still have
  // something left to decide.
  for (const spec of Object.values(SHIPPED)) {
    const right = spec.options.find((o) => o.id === spec.correct);
    for (const [tag, cue] of Object.entries(spec.cues ?? {})) {
      const c = cue.toLowerCase();
      assert.ok(!c.includes(right.label.toLowerCase()),
        `${spec.id} cue for "${tag}" quotes the correct option`);
      assert.ok(cue.trim().length > 30,
        `${spec.id} cue for "${tag}" is too short to point at anything`);
    }
  }
});

/* ── Which primitives can a generator be right about by accident (P-50) ─── */

test("two primitives answer the same at every setting, and the rest do not", () => {
  // Not a preference — a fact about the physics, and the reason a single
  // pass rate over all four flatters a generator. Every cut string flies
  // along the tangent and every collision is equal; the pucks and the falling
  // balls have to be worked out.
  const independent = Object.entries(PRIMITIVES)
    .filter(([, p]) => isParameterIndependent(p)).map(([id]) => id).sort();
  assert.deepEqual(independent, ["circular-release", "contact-collision"]);

  assert.deepEqual([...reachableOutcomes(PRIMITIVES["circular-release"])], ["tangent"]);
  assert.deepEqual([...reachableOutcomes(PRIMITIVES["contact-collision"])], ["equal"]);
  assert.ok(reachableOutcomes(PRIMITIVES["two-pucks"]).size >= 3);
  assert.ok(reachableOutcomes(PRIMITIVES["free-fall"]).size === 2);

  // Every subject added since has landed on the derived side, deliberately
  // (P-91, P-97). The generator's 0-of-7 there is the measurement that needs
  // more than one subject behind it before it means anything.
  for (const id of ["line-pair", "quadratic-roots", "limiting-reagent", "sealed-jar",
                    "search-race", "cache-walk"])
    assert.equal(isParameterIndependent(PRIMITIVES[id]), false, `${id} drifted to the easy side`);
  assert.equal(reachableOutcomes(PRIMITIVES["limiting-reagent"]).size, 3);
  assert.equal(reachableOutcomes(PRIMITIVES["sealed-jar"]).size, 2);
  assert.equal(reachableOutcomes(PRIMITIVES["cache-walk"]).size, 2);
  // Three, and the third is the one that went missing: search-race could
  // produce a tie that no setting of its controls reached until its range
  // started at two items. P-79, found for the second time.
  assert.equal(reachableOutcomes(PRIMITIVES["search-race"]).size, 3);
});
