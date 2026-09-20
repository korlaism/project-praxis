// SPDX-License-Identifier: MIT
import { test } from "node:test";
import assert from "node:assert/strict";
import { validateScenario } from "./schema.mjs";

const ok = () => ({
  schema: 1,
  primitive: "circular-release",
  params: { r: 1.2, omega: 2.4 },
  question: "You cut the string. Which way does it fly?",
  options: [
    { id: "outward", label: "Straight outward" },
    { id: "tangent", label: "Along the tangent" },
  ],
  correct: "tangent",
  explain: "The string pulled inward the whole time.",
  errorTags: { outward: "outward-in-circles" },
});

const fails = (spec, pattern) => {
  const r = validateScenario(spec);
  assert.equal(r.ok, false, "expected this spec to be rejected");
  assert.ok(r.errors.some((e) => pattern.test(e)), `no error matched ${pattern}\n  got: ${r.errors.join("; ")}`);
};

test("a well-formed scenario validates", () => {
  const r = validateScenario(ok());
  assert.deepEqual(r.errors, []);
  assert.equal(r.ok, true);
});

test("the question and explanation are required", () => {
  fails({ ...ok(), question: "" }, /question/i);
  fails({ ...ok(), explain: undefined }, /explain/i);
});

test("a choice needs at least two options", () => {
  fails({ ...ok(), options: [{ id: "a", label: "A" }], correct: "a" }, /two/i);
});

test("option ids must be unique", () => {
  fails({ ...ok(), options: [{ id: "a", label: "A" }, { id: "a", label: "Also A" }] }, /unique/i);
});

test("the correct answer must be one of the options", () => {
  fails({ ...ok(), correct: "nonsense" }, /correct/i);
});

test("params must be numbers a primitive can use", () => {
  fails({ ...ok(), params: { r: "quite long" } }, /param/i);
});

test("an error tag must name an option that exists", () => {
  fails({ ...ok(), errorTags: { ghost: "made-up" } }, /errorTags/i);
});

test("the correct answer cannot carry a misconception tag", () => {
  // A tag says "this wrong answer comes from this specific wrong belief".
  // Tagging the right answer means the generator has confused itself.
  fails({ ...ok(), errorTags: { tangent: "outward-in-circles" } }, /correct answer/i);
});

test("an unknown schema version is refused rather than guessed at", () => {
  fails({ ...ok(), schema: 7 }, /schema version/i);
});

test("errors accumulate — it reports everything wrong at once", () => {
  const r = validateScenario({ schema: 1, primitive: "x", params: {}, options: [] });
  assert.ok(r.errors.length >= 3, `expected several errors, got ${r.errors.length}`);
});

test("id and subject are optional, but must be real strings when given", () => {
  // Optional so a generator's first draft still validates; the notebook needs
  // them, so every SHIPPED scenario is held to having both (scenarios.test).
  assert.equal(validateScenario({ ...ok(), id: "which-way", subject: "physics" }).ok, true);
  fails({ ...ok(), id: "" }, /id/);
  fails({ ...ok(), subject: 7 }, /subject/);
});
