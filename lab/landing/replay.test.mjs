// SPDX-License-Identifier: MIT
/**
 * The landing plays a recording, not a simulation. P-85.
 *
 * ADR 0017: what the phone surface gives up is the apparatus, never the
 * commitment — and the outcome it shows has to be the same run every time, on
 * any device, or R-021 stops holding on the surface most people will meet
 * first.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { recordRun } from "./replay.mjs";
import { runHeadless } from "../scenario/run.mjs";
import { getPrimitive, resolveParams } from "../primitives/index.mjs";
import BANK from "../scenarios/bank/index.mjs";
import { SCENARIOS } from "../scenarios/index.mjs";

const forSpec = (spec) => {
  const p = getPrimitive(spec.primitive);
  return { p, params: resolveParams(p, spec.params) };
};

test("a recording reaches the same outcome as the answer check", () => {
  // If these two ever disagree, the landing is teaching something the lab
  // marks wrong, and both are claiming to be the same run.
  for (const spec of Object.values(SCENARIOS)) {
    const { p, params } = forSpec(spec);
    const rec = recordRun(p, params);
    const head = runHeadless(p, params);
    assert.equal(rec.outcome, p.classify(head.state, params),
      `${spec.id}: recording says "${rec.outcome}"`);
    assert.equal(rec.outcome, spec.correct, `${spec.id}: recording contradicts the item`);
  }
});

test("every scenario in the bank records, and none runs away", () => {
  for (const spec of BANK) {
    const { p, params } = forSpec(spec);
    const rec = recordRun(p, params);
    assert.ok(rec.finished, `${spec.id} never finished`);
    assert.ok(rec.frames.length > 1, `${spec.id} recorded ${rec.frames.length} frames`);
    assert.ok(rec.frames.length < 2000, `${spec.id} recorded ${rec.frames.length} frames — too many to ship`);
  }
});

test("the same scenario records identically twice", () => {
  const spec = SCENARIOS["which-way-does-it-fly"];
  const { p, params } = forSpec(spec);
  const a = recordRun(p, params), b = recordRun(p, params);
  assert.equal(a.frames.length, b.frames.length);
  assert.deepEqual(a.frames.at(-1), b.frames.at(-1));
  assert.equal(a.outcome, b.outcome);
});

test("frames are snapshots, not views of one mutating object", () => {
  // The whole point. If the frames alias the live state, every one of them is
  // the last one and the replay shows a still.
  const spec = SCENARIOS["two-balls-no-air"];
  const { p, params } = forSpec(spec);
  const rec = recordRun(p, params);
  // Compare two frames from INSIDE the loop. An earlier version of this test
  // compared the first against the last and passed while every loop frame
  // aliased the live state, because the first frame is cloned separately.
  assert.ok(rec.frames.length > 3, "too short to tell");
  assert.notDeepEqual(rec.frames[1], rec.frames.at(-1),
    "two frames from the run are identical — the recording is aliasing one mutating object");
  assert.notDeepEqual(rec.frames[1], rec.frames[2],
    "consecutive frames are identical — nothing is being captured");
});

test("an action that needs firing still fires", () => {
  // circular-release never finishes unless the string is cut; the headless
  // runner fires it from autoAt and the recording has to do the same.
  const spec = SCENARIOS["which-way-does-it-fly"];
  const { p, params } = forSpec(spec);
  const rec = recordRun(p, params);
  assert.ok(rec.frames.some((f) => f.cut), "the string was never cut");
});

test("recording refuses to run forever", () => {
  const spec = SCENARIOS["truck-and-fly"];
  const { p, params } = forSpec(spec);
  const rec = recordRun(p, params, { maxSeconds: 0.05 });
  assert.equal(rec.finished, false);
  assert.equal(rec.outcome, null, "an unfinished recording decides nothing");
});
