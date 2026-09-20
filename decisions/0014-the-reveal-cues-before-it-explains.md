# ADR 0014 · The Reveal Cues the Correction Before It Explains It

**Date:** 2026-09-20 **Status:** Accepted **Tickets:** P-70 **Rests on:** judgment

## Context

`P-07` found the one study that put the obvious design head-to-head with the alternative. Kleider-Tesler, Prior & Katzir (2019) gave ninety 10th-graders three feedback conditions: performance feedback; performance **plus calibration** feedback; and performance feedback with **scaffolding** — a cue to correct the wrong answer. Scaffolded correction won, and won most for the weakest comprehenders.

The condition that lost is close to what we built. Our reveal states the outcome and then explains it, and the record page shows a Brier score. "You said you were certain, and you were wrong" is calibration feedback. It is the intuitive design, it is what a calibration product sells, and it is the arm that underperformed.

What we already have, and have not used, is the tag. Every wrong option carries an `errorTags` entry naming the misconception behind it — `outward-in-circles`, `motion-implies-force`. At reveal we know not merely *that* the learner was wrong but *which wrong belief they acted on*. That is the raw material for a cue, and it is currently used only for filing.

## Decision

**When the learner is wrong, the reveal cues the correction before it explains it.**

The order becomes: outcome → **cue** → the learner may predict again → explanation. The cue is authored per misconception tag and points at the thing to watch. It does not contain the answer.

Four constraints, and the first is load-bearing.

**The first commitment is never overwritten.** A second prediction is a new record, linked to the first and marked as a retry. `gate.commit()` already throws on a second commit — *"already committed — reset to change it"* — and that behaviour stays exactly as it is. If a retry could overwrite the original, `R-010` would be measuring post-hoc confidence, every Brier score in the dataset would be flattering and wrong, and `K-03` would have fired without anyone noticing. **This is the whole risk of this ADR and the reason it is safe.**

**A cue may not state the outcome.** A cue that gives the answer is the explanation moved earlier, which is the arm that lost. The test is whether a learner who reads only the cue still has to decide something.

**Cues cannot be machine-checked.** The answer check runs the simulation and confirms the option marked `correct` is what happens; it has nothing to say about prose. Cues are authored against the misconception, reviewed like items, and carry the same provenance as items under [ADR 0011](0011-author-our-own-items.md).

**The retry is optional and never blocks.** A learner who wants the explanation gets it. Forcing a second attempt out of someone who has just been told they are wrong is the fastest route to `K-06`.

## What this does not decide

**Whether to demote the Brier score.** The tempting reading is "calibration feedback lost, so stop showing calibration". That is not what a three-condition study with *n*=90 supports, and [ADR 0006](0006-the-notebook-is-the-product.md) makes the record the product. It also depends on a fact we do not have: whether calibration feedback was genuinely null or merely smaller than scaffolding. `P-71` reads the full text; that decision waits for it.

**Whether cues are generated.** They are authored now. Generating them per tag is exactly the shape `P-51`'s generate-validate-repair loop is for, and it is a much safer target than generating scenarios — a bad cue is visible to a reader in a way a subtly wrong simulation is not.

## Requirements addressed

* `R-012` — the learner writes the gap in their own words. Unchanged, and now placed after the cue and the retry rather than immediately after the outcome. This is the part of the existing design closest to scaffolded correction, arrived at before the evidence rather than from it.
* `R-010` — protected by the immutability constraint above, not merely unaffected by it.
* `R-014` — the retry is stored with its own timestamp and its link to the original. Whether a cue was shown, and whether the retry succeeded, is the measurable this ADR creates.

## Kill criteria

`K-03` is the one to watch: if a retry can be made to overwrite an original commitment, the instrument measures nothing. `P-72` writes that test before the feature exists.

`K-06` is the other: a cue that reads as "here is what you should have known" is a reprimand with extra steps.

## Revisit when

* `P-71` reports what the full text actually says. If calibration feedback was merely smaller rather than null, the Brier score keeps its place unchanged.
* The first cohort produces retry data. If nobody uses the retry, the cue is decoration and this ADR is wrong.
* Evidence appears for scaffolded correction outside reading comprehension. Everything above rests on one study, in one domain, at the top of our age band, read from an abstract.
