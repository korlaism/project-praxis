# ADR 0001 · Audience and First Slice

**Date:** 2026-09-18 **Status:** Accepted **Rests on:** judgment

## Context

The loop described in [01 · The Economics Flip](../research/01-the-economics-flip.md) is domain-agnostic. The first slice therefore has to be chosen on grounds other than fit, and two candidates were live:

**Engineering undergraduates.** Self-selected and motivated, tolerant of rough interfaces, recruitable online, no guardian consent, and the founder could dogfood directly. The sandbox is the real thing — code, circuits, CAD — and consequence needs no invention because it either works or it does not.

**School students, 11–15.** The founder studied these subjects and **struggled with them**, which is the relevant fact. The subjects are near-universal, so one content investment serves every learner. Against: guardian consent, minors' data, a parent-or-school buyer rather than a learner buyer, and harder motivation.

The founder's stated constraint is a single bachelor's worth of domain range, which was raised as a reason to doubt the school option and turns out to cut the other way.

Two facts decided it.

**The core asset of this product is a misconception map, and struggle is the only way to author one.** Someone who found mechanics easy cannot design a confusion log — they do not remember what the wrong model felt like from inside, or why the textbook explanation failed to land. Having struggled is a non-transferable authoring advantage, and it is the one we have.

**For school science the misconception corpus already exists and is validated; for third-year engineering it does not.** The FCI and FMCE were built around documented misconceptions, and their distractors are effectively a pre-labelled error taxonomy — the hardest part of our build, already done and free. There is no equivalent for VLSI or thermodynamics. Content economics point the same way: school topics are universal, engineering fragments into hundreds of small-audience courses, and per-user content cost in the fragmented case is brutal against a narrow domain range.

Force and motion specifically, because it is the only school topic where the misconceptions are richly documented, near-universally held, counterintuitive enough that prediction does real work, *and* demonstrable with a ramp and two balls — no simulator fidelity risk. See [02 · Misconceptions and Diagnostic Instruments](../research/02-misconceptions-and-diagnostics.md).

## Decision

The first slice is **ages 11–15, force and motion, six weeks, teacher-mediated cohort**. Engineering undergraduates are deferred indefinitely, not scheduled.

Two adjustments neutralise the downsides. The pilot runs through a teacher or tuition cohort rather than direct-to-learner, which handles guardian consent, motivation and the social-stake problem in one move ([ADR 0004](0004-teacher-mediated-cohort.md)). And a private adult track is kept for dogfooding: the engine is domain-agnostic, so pointing it at something the founder is currently learning costs almost nothing and recovers the daily-use feedback the undergraduate path would have provided.

## Requirements addressed

* `R-020` — the item bank is drawn from existing force-and-motion instruments rather than authored.
* `R-021` — outcomes are demonstrable with physical apparatus, so no simulator correctness risk in Phase 1.
* `R-023` — items carry a documented intended misconception, which the FCI distractors supply directly.
* `R-002` — a validated cross-learner taxonomy is the precondition for testing per-learner stability.

## Alternatives rejected

### Engineering undergraduates

Lost on content economics against a narrow domain range, and on the absence of any misconception corpus. The dogfooding advantage was real and is recovered by the private adult track. The "immediate impact" argument was genuine but is an argument about which outcome we would prefer, not about which pilot produces a trustworthy answer in six weeks.

### Postgraduate and research

A different loop — claim graphs, pre-registered hypotheses, negative-results logs, AI as adversarial reviewer. High per-user value and the founder is the user. Rejected for now because the audience is small, and because the thing being tested there is "am I fooling myself", which is much harder to measure in six weeks than delayed retention.

### School, but a broader science slice

Rejected on measurement grounds. Six weeks supports one topic if the result is to mean anything, and a broad slice would produce an underpowered answer about everything instead of a clear one about something.

## Consequences

**Costs accepted.** Minors, therefore guardian consent, data minimisation and a duty of care that shapes the data model (see privacy in [Data Model](../spec/04-data-model.md)) and creates kill criterion K-06. Recruitment depends on securing a teacher and a cohort, which is a real-world dependency with real-world latency — likely the critical path. The buyer is not the learner, so nothing about Phase 1 validates willingness to pay.

**Foreclosed for now.** Any Phase 1 claim about engineering or professional learning. The India schooling context becomes load-bearing and is currently unexamined — `P-08`, and the largest unexamined risk in the project.

**New work created.** Guardian consent process. Teacher recruitment. Verification of the instrument literature (`P-06`). A power calculation, because `R-031`'s cohort size of 24 per arm is currently a guess.

## Revisit when

* No teacher or cohort can be secured within a reasonable window — the pivot is then direct-to-learner, with K-05's problems arriving unsolved.
* ~~`P-06` finds the FCI/FMCE distractor sets unusable as an error taxonomy, which removes the main reason school beat engineering.~~ **Tested 2026-09-20 and it did not trigger:** both instruments' distractors were built from documented misconceptions, and the FCI publishes a taxonomy of them. One qualification came with it — the instruments themselves are restricted and must not be published, so we build on the misconceptions and write our own items (`P-58`). The reason this decision rests on is intact.
* Verification shows force and motion misconceptions are already well displaced by current teaching in the target cohort, leaving nothing to bait.
