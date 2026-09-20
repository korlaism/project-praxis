# ADR 0013 · Split R-005 — Calibration Improvement Is a Claim, Transfer Is Exploratory

**Date:** 2026-09-20 **Status:** Accepted **Tickets:** P-07 **Rests on:** judgment
**Amends:** `R-005` · **Adds:** `R-035`

## Context

`R-005` said calibration improves measurably in six weeks in ages 11–15 **and transfers beyond force and motion**. `P-06` recorded it as the riskiest claim in the project on the basis that calibration improves with age unaided while feedback-based training had repeatedly failed in much younger children, with nothing found in our band.

`P-07` searched again, and the earlier characterisation was incomplete in both directions.

**There is in-band evidence, and it is positive.** DiGiacomo & Chen (2016) ran a self-monitoring and self-reflection intervention with grades 6–7, *n*=30, randomised against a delayed-treatment control, and report improved calibration accuracy alongside maths performance. Kleider-Tesler, Prior & Katzir (2019) trained ninety 10th-graders online across three sessions and improved calibration in the best condition.

**There is meta-analytic support, and the moderator runs against us.** Gutierrez de Blume (2022) pools 56 effect sizes over 7,667 participants for learning-strategy instruction on monitoring accuracy: *g* = −.565 [−.639, −.491]. The effect is **larger for adult-only samples**. Age moderates, in the direction we did not want.

**And the most useful finding is not about age at all.** Kleider-Tesler et al. compared three feedback conditions: performance feedback; performance *plus calibration* feedback; and performance feedback with scaffolding — a cue to correct the wrong answer. **Scaffolded correction won, especially for weaker comprehenders.** Telling a learner their confidence was miscalibrated was not the thing that worked.

So the two halves of `R-005` are not supported by the same evidence. One is weakly evidenced in band. The other has nothing behind it at any age — none of the studies above tested transfer to another topic.

## Decision

**Split `R-005`.**

`R-005` keeps the measurable claim: calibration improves in six weeks in ages 11–15. It stays falsifiable, keeps `K-04`, and is no longer marked as a bare guess — it has sources, and it has a moderator working against it, both recorded.

**`R-035` is new and marked Exploratory:** improved calibration transfers beyond force and motion. The phase measures and reports it. **No decision may rest on it, and no kill criterion fires on it.**

Two things follow.

**Exploratory is a machine-readable status, not a softer adjective.** `R-035` is in the `UNSETTLED` tuple in `tools/check-docs.py` permanently — not "until the run settles it", because this run cannot settle it. An `Accepted` ADR resting on `R-035` fails the build, for good. `tools/claims.test.mjs` asserts the spec's claim list and that tuple name the same requirements, because they are two hand-written lists in different files and nothing else connected them. The guard failed open, and a guard that fails open is worse than no guard.

**`K-04` narrows.** It fires on `R-005` alone. A six-week cohort in one topic cannot honestly test transfer, and a kill criterion that cannot fire is decoration.

## What this does not do

**It does not make `R-005` safe.** It is still ours, still weak, and the one meta-analysis that pools the field says our age band moves less than adults do. `n`=30 and a three-session study are not a foundation. `K-04` remains the pivot most likely to fire.

**It does not claim our intervention is the evidenced one.** The studies that worked taught learning strategies or scaffolded a correction. We do commit-before-reveal and a written reconciliation. `R-012` — the learner writes the gap in their own words — is the part of our design closest to what the evidence supports, and that is a coincidence we noticed afterwards, not a design derived from it.

## Consequences worth stating plainly

The single most actionable finding of `P-07` is that **calibration feedback alone was the condition that did not win.** If the product's calibration story becomes "we show you your Brier score", the evidence says that is the weak version. `P-70` carries this into the design rather than leaving it in a research file.

## Requirements addressed

* **`R-005` is amended by this ADR** — narrowed to the improvement claim, with sources.
* **`R-035` is added by this ADR** — exploratory, and nothing may rest on it.
* `R-012` gains an evidential note it did not have before.

## Revisit when

* The cohort runs and `K-04` either fires or does not.
* Anyone finds a study testing calibration **transfer** across topics in 11–15 year olds. Then `R-035` can stop being exploratory and become a claim with a kill criterion.
* Full texts become reachable. The three sources here are verified at citation level, but their results were read from abstracts and secondary summaries — the full texts are paywalled. That is recorded in research/06 and is weaker than `P-06`'s standard.
