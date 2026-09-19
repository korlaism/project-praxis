/**
 * Spike batch 01, after one repair pass — P-45.
 *
 * The only change from batch-01 is that errorTags are computed rather than
 * hardcoded, so a tag can never land on the correct answer. That was the
 * single generator mistake behind six of the seven failures, and the schema
 * error message named the fix precisely.
 *
 * Nothing about any `correct` value was changed.
 */
import batch from "./batch-01.mjs";

const TAGS = {
  outward: "outward-in-circles", curve: "force-is-stored", spiral: "outward-in-circles",
  truck: "bigger-pushes-harder", fly: "special-case-reasoning",
  needs: "motion-implies-force", same: "motion-implies-force", both: "things-naturally-stop",
};

export default batch.map((s) => ({
  ...s,
  errorTags: Object.fromEntries(
    s.options.filter((o) => o.id !== s.correct && TAGS[o.id]).map((o) => [o.id, TAGS[o.id]]),
  ),
}));
