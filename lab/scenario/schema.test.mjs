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

// ---- P-63 / ADR 0009: a scenario that wraps someone else's simulation ----

const embedded = () => ({
  schema: 1,
  id: "wrapped-example",
  subject: "physics",
  embed: {
    src: "embeds/example/index.html",
    title: "Example simulation",
    attribution: { work: "Example Sim", author: "PhET Interactive Simulations",
                   licence: "CC BY 4.0", url: "https://phet.colorado.edu/" },
  },
  question: "What happens when you let go?",
  options: [{ id: "a", label: "A" }, { id: "b", label: "B" }],
  correct: "b",
  errorTags: { a: "outward-in-circles" },
  explain: "Because.",
});

test("a wrapped scenario validates", () => {
  assert.deepEqual(validateScenario(embedded()).errors, []);
});

test("a scenario is either ours or wrapped, never both", () => {
  // They carry different guarantees. A spec claiming both would leave it
  // ambiguous whether the answer was checked or merely asserted.
  fails({ ...embedded(), primitive: "circular-release" }, /both|either/i);
  const neither = { ...embedded() }; delete neither.embed;
  fails(neither, /primitive/i);
});

test("a wrapped scenario must say whose work it is", () => {
  const noAttr = embedded(); delete noAttr.embed.attribution;
  fails(noAttr, /attribution/i);
  const noSrc = embedded(); delete noSrc.embed.src;
  fails(noSrc, /src/i);
  const thin = embedded(); thin.embed.attribution = { work: "x" };
  fails(thin, /licence|author/i);
});

test("a wrapped scenario may not reach outside the bundle for its simulation", () => {
  // ADR 0009: self-host the sim. A remote src is a network dependency in the
  // core loop and breaks wherever third-party frames are blocked.
  fails({ ...embedded(), embed: { ...embedded().embed, src: "https://phet.colorado.edu/sims/x" } },
        /self-host|relative/i);
});

test("a wrapped scenario cannot carry parameters it could not score", () => {
  fails({ ...embedded(), params: { r: 1.2 } }, /param/i);
});

/* ── Cues (ADR 0014) ──────────────────────────────────────────────────────
 *
 * A cue is keyed by the misconception tag, not the option id: it answers
 * "what should someone who believes THIS be told to watch?", and the same
 * wrong belief shows up in more than one scenario.
 */

const cued = (over = {}) => ({
  schema: 1,
  primitive: "circular-release",
  params: { radius: 1.2, omega: 2.4 },
  question: "Which way does it fly?",
  explain: "No force means a straight line.",
  options: [
    { id: "out", label: "Straight outward" },
    { id: "tan", label: "Along the tangent" },
    { id: "curve", label: "It keeps curving" },
  ],
  correct: "tan",
  errorTags: { out: "outward-in-circles", curve: "force-is-stored" },
  ...over,
});

test("a cue for every tag an option carries is valid", () => {
  const v = validateScenario(cued({
    cues: {
      "outward-in-circles": "Watch the moment the string goes slack — what is still pulling?",
      "force-is-stored": "Look at what touches the ball after the cut.",
    },
  }));
  assert.deepEqual(v.errors, []);
  assert.equal(v.ok, true);
});

test("a cue for a tag no option carries is refused", () => {
  const v = validateScenario(cued({ cues: { "things-naturally-stop": "Watch the speed." } }));
  assert.match(v.errors.join("\n"), /things-naturally-stop.*no option carries/s);
  assert.equal(v.ok, false);
});

test("a cue keyed by the correct answer is refused", () => {
  const v = validateScenario(cued({ cues: { tan: "Watch the tangent." } }));
  assert.match(v.errors.join("\n"), /correct answer/);
  assert.equal(v.ok, false);
});

test("an empty cue is refused — a blank cue is worse than none", () => {
  const v = validateScenario(cued({ cues: { "outward-in-circles": "   " } }));
  assert.match(v.errors.join("\n"), /must be a non-empty cue/);
  assert.equal(v.ok, false);
});

test("cues must be an object", () => {
  const v = validateScenario(cued({ cues: ["watch it"] }));
  assert.match(v.errors.join("\n"), /cues must be an object/);
});

test("cues are optional", () => {
  assert.equal(validateScenario(cued()).ok, true);
});
