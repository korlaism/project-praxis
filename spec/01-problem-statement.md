# Problem Statement

**Status:** Draft, 2026-09-18. Not yet agreed.

## The problem we are actually solving

Not "students lack access to good explanation." That problem is closed. Any child with a phone now has an infinitely patient tutor that will explain photosynthesis at whatever depth they ask for, in whatever language, as many times as they like. Measured against the constraint that shaped every school ever built, this is already won.

The problem is that **the same tool that ended the explanation shortage also ended the struggle**, and the struggle was where the learning lived.

A student facing a physics problem with an AI in reach has a dominant strategy: ask. It produces a correct answer, a feeling of comprehension, and no learning whatsoever. The feeling is the dangerous part — fluent explanation reliably produces the sensation of understanding without the substance, and the student has no way to tell the difference. Neither does their teacher, because every assessment instrument we own is now trivially gameable.

So we have arrived at a specific and novel failure: **learners who are better-informed and less capable than the generation before them**, with no reliable signal to anyone — including themselves — about which.

## Three consequences worth naming

**Assessment is broken, not weakened.** Homework, essays and problem sets measured a proxy — time spent struggling — that has now decoupled entirely from the output. Nothing we currently measure carries information any more.

**Metacognition is unmoored.** Students have always been poorly calibrated about their own knowledge. The difference is that previously, reality corrected them: you sat the exam and found out. Now the correction arrives later, higher-stakes, and in the form of an inability to do the job.

**Motivation has lost its floor.** "You will need this" was always half a lie, and it is now a whole one for most of the curriculum. There are honest answers — you cannot supervise what you cannot do; taste comes only from having made things; competence is genuinely pleasurable — but they have to be *designed for* now rather than assumed.

## Why a product rather than a policy

The instinct in schools is prohibition: ban the tool, return to invigilated paper. This fails for the obvious reason and one non-obvious one. The obvious reason is that it is unenforceable. The non-obvious one is that it forfeits the enormous upside — the ability to generate, on demand and at zero marginal cost, the one thing education has never been able to afford at scale: **a consequence-bearing environment where being wrong is cheap, immediate, visible and instructive.**

A school cannot let thirty children each break a different circuit, misjudge a collision, and watch their own wrong model fail in front of them. It has never had the technician-hours. That constraint is gone, and almost nobody is spending the windfall on this. They are spending it on better explanation, which is the part that was already solved and the part that hurts.

## What we believe, stated so it can be falsified

1. Forcing a **prediction with a stated confidence** before any reveal produces measurably better delayed retention than the same content without it. — `R-001`
2. A learner's errors are **not random**; they cluster into a small number of stable, nameable signatures that persist across surface topics. — `R-002`
3. Naming a learner's error signature back to them, and then **deliberately baiting it**, beats routing around it. — `R-003`
4. Confusion that is **logged** — made legitimate, timestamped, addressable — gets resolved more often than confusion that is merely felt. — `R-004`
5. **Calibration is trainable** in six weeks in 11–15 year olds. — `R-005`
6. **Improved calibration transfers** beyond the topic taught. — `R-035`, **exploratory**: split from `R-005` by ADR 0013 because there is in-band evidence for the first and none at all for this one.

Claims 1, 2 and 4 rest on existing literature and we expect them to hold; see [02 · Misconceptions & Diagnostic Instruments](../research/02-misconceptions-and-diagnostics.md). Claims 3 and 5 are ours, are the commercially interesting ones, and are the reason the pilot exists.

## What this is not

* Not a tutor. The market has enough, they are free, and explanation is the commodity.
* Not a content library. The misconception corpus for school physics already exists and is better than anything we would author.
* Not an assessment product, yet — though an honest signal about what a learner actually knows is plausibly the most valuable thing this loop incidentally produces, and is the obvious Phase 2.
