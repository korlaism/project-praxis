import { test } from "node:test";
import assert from "node:assert/strict";
import { homeModel } from "./home.mjs";
import { SCENARIOS } from "../scenarios/index.mjs";
import { openNotebook, memoryBackend } from "../notebook/store.mjs";

const nb = () => openNotebook({ backend: memoryBackend() });

test("scenarios are grouped by subject, every one of them listed", () => {
  const m = homeModel(nb(), SCENARIOS);
  const listed = m.subjects.flatMap((s) => s.scenarios.map((x) => x.id)).sort();
  assert.deepEqual(listed, Object.keys(SCENARIOS).sort());
  assert.deepEqual(m.subjects.map((s) => s.subject), ["physics"]);
});

test("each scenario shows how many times it has been answered, from the shared notebook", () => {
  const n = nb();
  n.record({ subject: "physics", scenario: "truck-and-fly", choice: "truck" });
  n.record({ subject: "physics", scenario: "truck-and-fly", choice: "equal" });
  const m = homeModel(n, SCENARIOS);
  const truck = m.subjects[0].scenarios.find((s) => s.id === "truck-and-fly");
  assert.equal(truck.answered, 2);
  assert.equal(m.totalCards, 2);
});

test("links point inside the page, so everything stays on one origin", () => {
  const m = homeModel(nb(), SCENARIOS);
  for (const s of m.subjects[0].scenarios) assert.match(s.path, /^\/s\//);
  assert.equal(m.recordPath, "/record");
});
