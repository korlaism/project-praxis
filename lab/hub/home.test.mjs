// SPDX-License-Identifier: AGPL-3.0-or-later
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

/* ── Grouped by concept (P-80) ────────────────────────────────────────────
 *
 * Fourteen items in one flat list is a wall. They carry concept tags already
 * (R-023), and the concepts are the pilot's weekly structure — which is also
 * what the channel wants, one Short per concept linking to that concept's
 * items.
 */

test("every scenario in the registry is reachable from the front page", () => {
  // The bank existed for a day with nothing linking to it. From a learner's
  // point of view that is the same as it not existing.
  const m = homeModel(nb(), SCENARIOS);
  const listed = m.subjects.flatMap((s) => s.concepts.flatMap((c) => c.scenarios.map((x) => x.id)));
  assert.deepEqual(listed.slice().sort(), Object.keys(SCENARIOS).sort());
  assert.ok(listed.length >= 14, `only ${listed.length} scenarios reachable`);
});

test("concepts come in the order the pilot teaches them, not alphabetically", () => {
  const m = homeModel(nb(), SCENARIOS);
  const order = m.subjects[0].concepts.map((c) => c.concept);
  assert.deepEqual(order, [
    "motion-without-force", "falling", "action-and-reaction",
    "circular-motion", "friction-and-inertia",
  ]);
});

test("each concept carries a title a learner would read", () => {
  const m = homeModel(nb(), SCENARIOS);
  for (const c of m.subjects[0].concepts) {
    assert.ok(c.title && !c.title.includes("-"), `${c.concept} has no readable title`);
    assert.ok(c.scenarios.length > 0, `${c.concept} is listed but empty`);
  }
});

test("every scenario carries a concept — an untagged one would vanish", () => {
  for (const spec of Object.values(SCENARIOS))
    assert.ok(spec.concept, `${spec.id} has no concept and would not be listed anywhere`);
});

test("progress is counted per concept, not just per item", () => {
  const n = nb();
  n.record({ subject: "physics", scenario: "two-balls-no-air", choice: "together" });
  const m = homeModel(n, SCENARIOS);
  const falling = m.subjects[0].concepts.find((c) => c.concept === "falling");
  assert.equal(falling.answered, 1);
  assert.equal(falling.total, falling.scenarios.length);
});
