// SPDX-License-Identifier: AGPL-3.0-or-later
/**
 * What a typed topic has to do with what we can actually simulate.
 *
 * P-95. This is deliberately dumb word matching and not a model. The point of
 * it is the NO: a topic we have nothing for must say so plainly, because that
 * empty answer is the honest state of the product and the learner should be
 * able to see it rather than be handed an unrelated list.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { conceptsFor } from "./topics.mjs";
import { SCENARIOS } from "../scenarios/index.mjs";

const found = (topic) => conceptsFor(topic, SCENARIOS).map((c) => c.concept).sort();

test("a topic that names a concept finds it", () => {
  assert.deepEqual(found("quadratics"), ["quadratics"]);
  assert.deepEqual(found("straight lines"), ["straight-lines"]);
});

test("a topic finds a concept through an ordinary sentence", () => {
  // Nobody types "falling". They type a question.
  assert.deepEqual(found("why do things fall?"), ["falling"]);
  assert.deepEqual(found("Why Do Things FALL"), ["falling"]);
});

test("a topic naming a subject finds everything in it", () => {
  assert.deepEqual(found("maths"), ["quadratics", "straight-lines"]);
});

test("a word that could sit in any topic matches nothing", () => {
  // "Finding things" and "why do things fall?" share six letters of nothing,
  // and a learner asking about falling was offered binary search until the
  // generic list existed. The length floor alone does not catch this.
  assert.deepEqual(found("things"), []);
  assert.deepEqual(found("what happens"), []);
  assert.deepEqual(found("why do things fall?"), ["falling"], "and the real match still lands");
});

test("a topic we have nothing for finds nothing, and does not guess", () => {
  // The whole reason this function exists. An unrelated list here would be
  // the product lying about what it can do.
  for (const topic of ["photosynthesis", "the french revolution", "electromagnetism", "zzzz"])
    assert.deepEqual(found(topic), [], `"${topic}" matched something it should not`);
});

test("short filler words match nothing on their own", () => {
  assert.deepEqual(found("why do i"), []);
  assert.deepEqual(found("a"), []);
  // "and" is in "Action and reaction" and "for" is in "force". Both are too
  // short to mean anything, and a learner who types one of them has not asked
  // for a concept — this is what the four-character floor is for.
  assert.deepEqual(found("and"), []);
  assert.deepEqual(found("for"), []);
  assert.deepEqual(found("the"), []);
});

test("a broad word may find more than one concept, and returns both", () => {
  const motion = found("motion");
  assert.ok(motion.includes("motion-without-force") && motion.includes("circular-motion"),
    `expected both motion concepts, got ${motion.join(", ")}`);
});

test("each concept comes back with its scenarios and a readable title", () => {
  const [c] = conceptsFor("quadratics", SCENARIOS);
  assert.equal(c.title, "Quadratics");
  assert.equal(c.subject, "maths");
  assert.ok(c.scenarios.length > 0);
  assert.ok(c.scenarios[0].path.startsWith("/s/"));
  assert.ok(c.scenarios[0].question);
});

test("nothing is returned for a topic of nothing", () => {
  for (const bad of ["", "   ", null, undefined]) assert.deepEqual(conceptsFor(bad, SCENARIOS), []);
});
