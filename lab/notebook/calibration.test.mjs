/**
 * Calibration — does "certain" actually mean you are usually right?
 *
 * The one thing no explainer, textbook or chatbot shows a learner: the shape
 * of their own over- and under-confidence. It is also K-06 territory, so the
 * maths refuses to say anything it cannot support — too few cards at a level
 * are reported as too few, never as a verdict.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { STATED, LEVELS, calibration, brier, overconfidence, trend, summary, MIN_PER_LEVEL }
  from "./calibration.mjs";

let t = 0;
const c = (confidence, correct, over = {}) =>
  ({ confidence, correct, unlisted: false, recordedAt: ++t, ...over });

test("stated confidence rises with each level", () => {
  const ps = LEVELS.map((l) => STATED[l]);
  for (let i = 1; i < ps.length; i++) assert.ok(ps[i] > ps[i - 1], `${LEVELS[i]} must exceed ${LEVELS[i - 1]}`);
  assert.ok(ps.every((p) => p > 0 && p < 1));
});

test("each level reports how often you were right when you said it", () => {
  const cards = [c("certain", true), c("certain", false), c("certain", false), c("certain", true),
                 c("guessing", true)];
  const byLevel = Object.fromEntries(calibration(cards).map((r) => [r.level, r]));
  assert.equal(byLevel.certain.n, 4);
  assert.equal(byLevel.certain.hits, 2);
  assert.equal(byLevel.certain.accuracy, 0.5);
  assert.equal(byLevel.guessing.n, 1);
  assert.equal(byLevel.leaning.accuracy, null, "no cards means no accuracy, not zero");
});

test("too few cards at a level are marked as too few to say", () => {
  const rows = calibration([c("certain", true), c("certain", true)]);
  const certain = rows.find((r) => r.level === "certain");
  assert.equal(certain.enough, MIN_PER_LEVEL <= 2);
  assert.equal(certain.enough, false);
});

test("cards with no confidence stated sit out of calibration but are still counted", () => {
  const cards = [c(undefined, true), c(null, false), c("leaning", true)];
  assert.equal(calibration(cards).reduce((s, r) => s + r.n, 0), 1);
  const s = summary(cards);
  assert.equal(s.total, 3);
  assert.equal(s.noConfidence, 2);
});

test("an outcome that was none of the choices is not held against anyone", () => {
  // Nobody could have been right, so it tells us nothing about calibration.
  const cards = [c("certain", false, { unlisted: true }), c("certain", true)];
  assert.equal(calibration(cards).find((r) => r.level === "certain").n, 1);
  assert.equal(summary(cards).unlisted, 1);
});

test("Brier score: sure and right is good, sure and wrong is bad, exactly", () => {
  const p = STATED.certain;
  assert.ok(Math.abs(brier([c("certain", true)]) - (p - 1) ** 2) < 1e-12);
  assert.ok(Math.abs(brier([c("certain", false)]) - p ** 2) < 1e-12);
  assert.ok(brier([c("certain", false)]) > brier([c("guessing", false)]),
    "being certain and wrong must cost more than guessing and wrong");
});

test("overconfidence is positive when you claim more than you deliver", () => {
  assert.ok(overconfidence([c("certain", false), c("certain", false)]) > 0);
  assert.ok(overconfidence([c("guessing", true), c("guessing", true)]) < 0);
});

test("nothing to go on gives nulls, not zeros and not a crash", () => {
  assert.equal(brier([]), null);
  assert.equal(overconfidence([]), null);
  assert.equal(trend([]), null);
  assert.deepEqual(calibration([]).map((r) => r.n), LEVELS.map(() => 0));
});

test("trend compares earlier with recent, and stays quiet until there is enough", () => {
  const few = Array.from({ length: 5 }, () => c("certain", true));
  assert.equal(trend(few), null, "five cards is not a trend");

  // earlier: confidently wrong; recent: confidently right
  const cards = [
    ...Array.from({ length: 5 }, () => c("certain", false)),
    ...Array.from({ length: 5 }, () => c("certain", true)),
  ];
  const tr = trend(cards);
  assert.ok(tr.recent < tr.earlier);
  assert.equal(tr.improving, true);
});

test("trend orders by when cards were recorded, not by array position", () => {
  const cards = [
    ...Array.from({ length: 5 }, (_, i) => c("certain", true, { recordedAt: 100 + i })),
    ...Array.from({ length: 5 }, (_, i) => c("certain", false, { recordedAt: 1 + i })),
  ];
  assert.equal(trend(cards).improving, true);
});
