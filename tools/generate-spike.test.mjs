// SPDX-License-Identifier: AGPL-3.0-or-later
/**
 * The spike tool's two jobs that can be tested without a model: what it sends,
 * and what it accepts back. P-50.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { buildPrompt, extractScenarios } from "./generate-spike.mjs";

test("the prompt carries the contract and not the answers", () => {
  const p = buildPrompt();
  // What a generator legitimately needs.
  for (const primitive of ["circular-release", "contact-collision", "two-pucks", "free-fall"])
    assert.match(p, new RegExp(primitive), `${primitive} is missing from the prompt`);
  assert.match(p, /"key": "friction"/, "the controls are missing");
  assert.match(p, /tangent/, "the declared outcomes are missing");

  // What it must NOT carry: which outcomes are actually reachable. For the two
  // parameter-independent primitives that is the answer key, and it would
  // inflate the number this spike exists to measure.
  assert.doesNotMatch(p, /reachable/i, "the prompt leaks which outcomes can occur");
  // And no source: the model composes against the contract, not our physics.
  assert.doesNotMatch(p, /stepWithFriction|Math\.sqrt|export function/,
    "the prompt leaks implementation");
});

test("a reply is accepted however it is wrapped, and never repaired", () => {
  // A realistic item, because the extractor now recognises scenarios by shape:
  // the thin {"id":"a"} these used to pass is indistinguishable from an option.
  const one = '[{"id":"a","primitive":"two-pucks","question":"q","correct":"same"}]';
  assert.equal(extractScenarios(one).length, 1);
  assert.equal(extractScenarios("```json\n" + one + "\n```").length, 1);
  assert.equal(extractScenarios('{"scenarios":' + one + "}").length, 1);
  assert.equal(extractScenarios("Here you go:\n" + one).length, 1);
  // Shape only. The content is untouched, so the checks see what the model said.
  const wrong = '[{"id":"a","primitive":"two-pucks","question":"q","correct":"nonsense"}]';
  assert.equal(extractScenarios(wrong)[0].correct, "nonsense");
});

test("an unusable reply fails loudly rather than yielding nothing", () => {
  assert.throws(() => extractScenarios("I cannot help with that."));
});

test("the scenario array is found, not merely the first array in the reply", () => {
  // The first real reply wrapped one scenario in an object, and "first array
  // found" returned its `options` — four option objects that looked like four
  // successful scenarios. json_object mode forces an object, so this is the
  // normal shape rather than an edge case.
  const reply = JSON.stringify({
    scenarios: [
      { id: "a", primitive: "two-pucks", question: "q", correct: "same",
        options: [{ id: "same", label: "x" }, { id: "both", label: "y" }] },
      { id: "b", primitive: "free-fall", question: "q", correct: "together",
        options: [{ id: "together", label: "x" }] },
    ],
  });
  const out = extractScenarios(reply);
  assert.equal(out.length, 2, "picked a nested options array instead of the scenarios");
  assert.equal(out[0].primitive, "two-pucks");
});

test("a single unwrapped scenario still counts as one", () => {
  const one = JSON.stringify({ id: "a", primitive: "two-pucks", question: "q", correct: "same" });
  assert.equal(extractScenarios(one).length, 1);
});

test("an options array alone is not mistaken for scenarios", () => {
  assert.throws(() => extractScenarios(JSON.stringify({ options: [{ id: "a", label: "x" }] })));
});

test("scenarios numbered as object keys are found", () => {
  // What qwen2.5 actually returned: json_object mode cannot produce a bare
  // array, so twenty scenarios came back keyed "0".."19" with no array in the
  // reply at all.
  const reply = JSON.stringify(Object.fromEntries(
    [0, 1, 2].map((i) => [String(i), { id: `s${i}`, primitive: "two-pucks", question: "q", correct: "same" }]),
  ));
  assert.equal(extractScenarios(reply).length, 3);
});

test("the worked example teaches shape without leaking an answer", () => {
  const p = buildPrompt();
  assert.match(p, /One worked example/, "the example is missing");
  assert.match(p, /"schema": 1/, "the example does not show the schema field");
  assert.match(p, /together_outcome/, "the example does not warn about id variants");
  // The example must use an INVENTED primitive: using a real one would hand
  // over a correct answer for it, and two of the four always answer the same.
  assert.match(p, /example-only-not-real/, "the example should name a primitive that does not exist");
  for (const real of ["circular-release", "contact-collision", "two-pucks", "free-fall"]) {
    const example = p.slice(p.indexOf("One worked example"));
    assert.ok(!example.includes(`"primitive": "${real}"`),
      `the example uses ${real}, which gives away an answer for it`);
  }
});

/* ── P-94: a paid run must not throw away what it has already bought ───────
 *
 * None of this mattered against a local ollama, where a lost call costs a
 * retry. Against the endpoint P-90 is waiting for, every call is money.
 */

import { collect, callModel } from "./generate-spike.mjs";

/** A provider that answers from a script: strings are replies, numbers are HTTP codes. */
function provider(script) {
  const seen = [];
  return {
    seen,
    async call() {
      const next = script[seen.length];
      seen.push(next);
      if (next === undefined) throw new Error("the test ran out of scripted replies");
      if (typeof next === "number") {
        const e = new Error(`HTTP ${next}`);
        e.status = next;
        throw e;
      }
      return { text: next };
    },
  };
}

const one = (id) => JSON.stringify([{
  id, primitive: "two-pucks", concept: "friction", difficulty: "easy", subject: "physics",
  params: {}, question: "q?", options: [{ id: "both", label: "b" }, { id: "outruns", label: "o" }],
  correct: "both", errorTags: { outruns: "motion-implies-force" },
}]);

test("a provider failure keeps every reply already paid for", async () => {
  // The defect: one 500 on the third call threw out of the loop, the process
  // ended, and the two replies already bought were never written anywhere.
  const p = provider([one("a"), one("b"), 500, one("c")]);
  const r = await collect({ call: p.call, want: 3, batch: 1, attempts: 1 });
  assert.deepEqual(r.specs.map((s) => s.id), ["a", "b", "c"]);
  assert.ok(r.raw.includes('"a"') && r.raw.includes('"b"'),
    "the replies bought before the failure are not in the transcript");
  assert.equal(r.failures.length, 1);
});

test("the transcript is handed back even when every call fails", async () => {
  const p = provider([500, 500, 500, 500, 500, 500, 500, 500]);
  const r = await collect({ call: p.call, want: 2, batch: 1, attempts: 1 });
  assert.deepEqual(r.specs, []);
  assert.equal(typeof r.raw, "string", "a run that bought nothing must still hand back a transcript");
  assert.ok(r.failures.length > 0, "and must still say what happened");
});

test("a rate limit is waited out, not thrown away", async () => {
  // 429 is the provider saying "later", which is not the same as "no". Twenty
  // calls fired back to back is exactly the shape that earns one.
  const p = provider([429, one("a")]);
  const waits = [];
  const r = await collect({ call: p.call, want: 1, batch: 1, sleep: (ms) => waits.push(ms) });
  assert.deepEqual(r.specs.map((s) => s.id), ["a"]);
  assert.equal(waits.length, 1, "it did not wait before trying again");
  assert.ok(waits[0] > 0);
});

test("waiting backs off rather than hammering", async () => {
  const p = provider([429, 429, 429, one("a")]);
  const waits = [];
  await collect({ call: p.call, want: 1, batch: 1, attempts: 4, sleep: (ms) => waits.push(ms) });
  assert.equal(waits.length, 3);
  assert.ok(waits[1] > waits[0] && waits[2] > waits[1], `no back-off: ${waits.join(", ")}`);
});

test("a run gives up on a call rather than retrying for ever", async () => {
  const p = provider(Array(20).fill(429));
  const r = await collect({ call: p.call, want: 1, batch: 1, sleep: () => {} });
  assert.ok(p.seen.length < 20, "it would retry a dead endpoint until the credit ran out");
  assert.ok(r.failures.length > 0);
});

test("a refusal that is the prompt's fault is not retried", async () => {
  // 400 means the request is wrong, and sending it again spends money to be
  // told so twice. Only "later" and "our fault" are worth repeating.
  const p = provider([400, 400, one("a")]);
  const r = await collect({ call: p.call, want: 1, batch: 1, sleep: () => {} });
  // The thing that proves it: no call has a SECOND attempt. Counting 400s
  // alone cannot tell a retry apart from the next call meeting the same wall.
  assert.deepEqual(r.failures.map((f) => f.attempt), [1, 1],
    `a bad request was sent again: ${JSON.stringify(r.failures.map((f) => [f.call, f.attempt]))}`);
  assert.deepEqual(r.specs.map((s) => s.id), ["a"], "and the run carried on to the next call");
});

test("a repeat is not a new sample", async () => {
  const p = provider([one("a"), one("a"), one("b")]);
  const r = await collect({ call: p.call, want: 2, batch: 1, attempts: 1 });
  assert.deepEqual(r.specs.map((s) => s.id), ["a", "b"]);
});

test("an unparseable reply costs its call but not the run", async () => {
  const p = provider(["I'd be happy to help with that!", one("a")]);
  const r = await collect({ call: p.call, want: 1, batch: 1, attempts: 1 });
  assert.deepEqual(r.specs.map((s) => s.id), ["a"]);
  assert.ok(r.raw.includes("happy to help"), "what it actually said must still be kept");
  assert.equal(r.failures.filter((f) => f.status === null).length, 1,
    "a call that bought prose instead of scenarios must be reported as lost");
});

test("the HTTP status is carried, so the loop can tell a wait from a refusal", async () => {
  // callModel is the only thing that knows about HTTP; everything above it
  // decides on the number. Losing the status is what made every failure fatal.
  const fetched = [];
  const fakeFetch = async () => {
    fetched.push(1);
    return { ok: false, status: 429, statusText: "Too Many Requests", text: async () => "slow down" };
  };
  await assert.rejects(
    () => callModel("m", "p", { fetch: fakeFetch, url: "http://x", key: "k" }),
    (err) => err.status === 429);
});

/* ── P-102: the per-primitive path is a function, and therefore tested ─────
 *
 * It used to live inside the CLI's main block, where nothing reached it. When
 * P-96 moved buildPrompt into lab/ and took the PRIMITIVES import with it,
 * that path broke outright — ReferenceError on the first line — and the whole
 * suite stayed green, because every test here calls an exported function and
 * none of them runs the command.
 */

import { collectPerPrimitive } from "./generate-spike.mjs";
import { PRIMITIVES } from "../lab/primitives/index.mjs";

/** A reply naming whichever primitive was asked for. */
const from = (primitive, id = `${primitive}-1`) =>
  JSON.stringify([{ ...JSON.parse(one(id))[0], primitive }]);

test("every primitive is asked for, the named number of times", () => {
  const asked = [];
  return collectPerPrimitive({ call: async (id) => { asked.push(id); return { text: from(id) }; }, each: 2 })
    .then(() => {
      assert.equal(asked.length, Object.keys(PRIMITIVES).length * 2);
      for (const id of Object.keys(PRIMITIVES))
        assert.equal(asked.filter((x) => x === id).length, 2, `${id} was not asked for twice`);
    });
});

test("a primitive that fails every time does not stop the others", async () => {
  const r = await collectPerPrimitive({
    call: async (id) => {
      if (id === "two-pucks") throw new Error("500 boom");
      return { text: from(id) };
    },
    each: 1,
  });
  assert.equal(r.failures.length, 1);
  assert.equal(r.failures[0].primitive, "two-pucks");
  assert.equal(r.specs.length, Object.keys(PRIMITIVES).length - 1);
});

test("the same id from two different primitives is not a repeat", async () => {
  // Every primitive naming its item "item-1" is one scenario each, not one
  // scenario total.
  const r = await collectPerPrimitive({ call: async (id) => ({ text: from(id, "item-1") }), each: 1 });
  assert.equal(r.specs.length, Object.keys(PRIMITIVES).length);
});

test("the transcript keeps every reply, including from primitives that failed later", async () => {
  const r = await collectPerPrimitive({ call: async (id) => ({ text: from(id) }), each: 1 });
  for (const id of Object.keys(PRIMITIVES))
    assert.ok(r.raw.includes(id), `${id}'s reply is missing from the transcript`);
});

/* ── P-103: the guard runs before the money is spent ─────────────────────── */

import { outputPaths, refuseToClobber } from "./generate-spike.mjs";

test("a run's output path is dated, so one run cannot overwrite another", () => {
  const a = outputPaths("qwen2.5:7b", "2026-10-19");
  const b = outputPaths("qwen2.5:7b", "2026-10-19b");
  assert.notEqual(a.out, b.out);
  assert.match(a.out, /batch-2026-10-19-qwen2\.5:7b\.mjs$/);
  assert.match(a.raw, /\.raw\.json$/);
});

test("a path already in the way is reported", () => {
  const paths = outputPaths("m", "x");
  assert.deepEqual(refuseToClobber(paths, { exists: () => false }), []);
  assert.deepEqual(refuseToClobber(paths, { exists: (p) => p === paths.out }), [paths.out]);
  assert.equal(refuseToClobber(paths, { exists: () => true }).length, 2);
});

test("the guard needs nothing from the run, so it can run before it", () => {
  // The point of the fix. The first version checked after generating, and
  // threw away sixteen scenarios and ninety minutes to protect two empty
  // files. A guard that fires after the expense has destroyed what it
  // protected. These take a model and a label and nothing else.
  assert.equal(outputPaths.length, 2);
  assert.doesNotThrow(() => refuseToClobber(outputPaths("m", "x"), { exists: () => false }));
});
