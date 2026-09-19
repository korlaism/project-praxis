import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync } from "node:fs";
import { recordModel } from "./model.mjs";
import { SCENARIOS } from "../scenarios/index.mjs";
import { openNotebook, memoryBackend } from "../notebook/store.mjs";

let t = 0;
const nb = () => openNotebook({ backend: memoryBackend(), now: () => ++t });

test("every shipped scenario file is registered", () => {
  // A scenario missing from the registry would never appear in the lab, and
  // its cards would show up in the record as bare ids.
  const files = readdirSync(new URL("../scenarios/", import.meta.url))
    .filter((f) => f.endsWith(".mjs") && f !== "index.mjs");
  for (const f of files) assert.ok(SCENARIOS[f.replace(/\.mjs$/, "")], `${f} is not in scenarios/index.mjs`);
});

test("an empty notebook says so, rather than drawing an empty chart", () => {
  const m = recordModel(nb(), SCENARIOS);
  assert.equal(m.empty, true);
  assert.deepEqual(m.subjects, []);
});

test("rows read in words, newest first", () => {
  const n = nb();
  n.record({ subject: "physics", scenario: "truck-and-fly", choice: "truck", confidence: "certain",
             observed: "equal", correct: false, unlisted: false });
  n.record({ subject: "physics", scenario: "what-keeps-it-moving", choice: "runaway",
             observed: "runaway", correct: true, unlisted: false });
  const [physics] = recordModel(n, SCENARIOS).subjects;
  assert.equal(physics.subject, "physics");
  assert.equal(physics.rows[0].scenario, "what-keeps-it-moving", "newest first");
  const truck = physics.rows[1];
  assert.equal(truck.question, SCENARIOS["truck-and-fly"].question);
  assert.equal(truck.said, "The truck pushes much harder on the fly");
  assert.equal(truck.happened, "They push on each other exactly as hard");
  assert.equal(truck.sure, "certain");
  assert.equal(truck.verdict, "wrong");
});

test("an outcome that was none of the options is described, and not scored", () => {
  const n = nb();
  n.record({ subject: "physics", scenario: "what-keeps-it-moving", choice: "runaway",
             observed: "outruns", correct: false, unlisted: true });
  const row = recordModel(n, SCENARIOS).subjects[0].rows[0];
  assert.equal(row.verdict, "unlisted");
  assert.match(row.happened, /gained speed while friction slowed/);
});

test("a card from a scenario that no longer exists still shows up", () => {
  const n = nb();
  n.record({ subject: "physics", scenario: "retired-scenario", choice: "a", observed: "b",
             correct: false, unlisted: false });
  const row = recordModel(n, SCENARIOS).subjects[0].rows[0];
  assert.equal(row.said, "a");
  assert.equal(row.happened, "b");
  assert.equal(row.question, null);
});

test("each subject carries its own calibration and summary", () => {
  const n = nb();
  n.record({ subject: "physics", scenario: "truck-and-fly", choice: "equal", confidence: "leaning",
             observed: "equal", correct: true, unlisted: false });
  n.record({ subject: "chemistry", scenario: "x", choice: "a", confidence: "certain",
             observed: "b", correct: false, unlisted: false });
  const m = recordModel(n, SCENARIOS);
  assert.deepEqual(m.subjects.map((s) => s.subject).sort(), ["chemistry", "physics"]);
  const physics = m.subjects.find((s) => s.subject === "physics");
  assert.equal(physics.calibration.find((r) => r.level === "leaning").n, 1);
  assert.equal(physics.summary.total, 1);
});
