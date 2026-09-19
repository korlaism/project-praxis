# ADR 0005 · Build the Lab in Public, Topic by Topic

**Date:** 2026-09-19 **Status:** Accepted **Tickets:** P-23 **Rests on:** judgment

> Accepted as a **direction and a sequence**, not a claim about outcomes. Nothing here asserts
> that a channel will find an audience. It asserts that making and publishing tools is a better
> use of the next months than waiting on a cohort, and that the work is not wasted if the
> audience never arrives.

## Context

Phase 1 as written could not start. Every path through it runs through `P-03` — recruit a teacher and a cohort — which is a real-world dependency with latency nobody can compress. Meanwhile the phase produced no artefact: seventeen documents, nothing usable.

The owner's objection is that validating before building strangles invention, and that a survey of cart owners produces a better cart. The historical record sharpens rather than refutes this: Ford built a Quadricycle in a shed, the Wrights built a wind tunnel and hundreds of gliders, and neither substituted deliberation for making. **The alternative to validating is making, not envisioning.**

Separately, three structural facts favour a channel over a cohort as the first move:

* **Distribution is the largest unexamined risk** (`P-08`), and it is not a pedagogy problem. A channel attacks it directly; a cohort does not touch it.
* **Each tool is independently valuable.** A good simulation of circular motion is worth something forever, regardless of whether the notebook ships. Six weeks of cohort data is worth nothing if the thesis is wrong.
* **It reaches learners directly.** Children have no agency over what software they are given and complete agency over what they watch. This bypasses the school-or-parent buyer that [ADR 0004](0004-teacher-mediated-cohort.md) routes through.

## Decision

A new **Phase 0 · Publish** sits in front of the validation work: build the simulated lab one topic at a time, publish each as a recording of the tool being used, and invite people to use it. Phase 1 is renumbered from 0 and **parked, not cancelled** — its documents stand unchanged and its tickets are labelled `parked`.

Two rules govern the phase and are stated in [Phase 0 · Publish](../spec/00-publish-phase.md): no deliverable that is not runnable, and the tool *is* the content rather than being advertised by it. The posture is **provoke, then hand over the tool** — never explain-first, which would put us in the commodity business the whole thesis rejects.

## Requirements addressed

* `R-020`, `R-021`, `R-023` — the topic tools are built on documented misconceptions with unambiguous demonstrable outcomes, exactly as the item bank would be. Work here feeds Phase 1 rather than diverging from it.
* `P-08` — distribution, addressed directly for the first time.

No claim from [Phase 1 Requirements](../spec/02-requirements.md) §1 is tested by this phase, which is why this ADR rests on judgment.

## Alternatives rejected

### Run Phase 1 as written, first

Rejected on latency, not on merit. It cannot begin until a teacher says yes, and produces nothing in the meantime. Parked intact so it can run once there is a cohort — and a channel plausibly makes recruiting one *easier*, since a teacher can be shown something.

### Build the notebook first, privately

The obvious "just build the product" move. Rejected because the notebook is the part that depends on unproven claims (`R-002`, `R-003`), while the simulated lab depends on none of them. Building the dependent thing first is backwards.

### A channel that explains topics clearly

The default shape, and the one the owner first described. Rejected as **off-thesis**: this project's whole claim is that explanation is the commodity. An explainer channel competes in the most crowded niche online, with no differentiator, while contradicting the premise of the product it exists to distribute.

## Consequences

**Costs.** Content is a treadmill and consistency is the whole game; the "tool is the content" rule exists to blunt this and may not be enough. Publishing to minors' attention carries obligations even with no account and no data collection. Two days per topic is a hard budget precisely because it is the constraint most likely to be broken.

**Makes harder later.** A public body of work is a public commitment to a direction; pivoting away from force-and-motion or from the provocation posture becomes visibly a reversal. Anything shipped is also anything a competitor can see.

**Forces a future decision.** Whether the channel is marketing, a distribution moat, or the product itself. The working assumption is **moat** — which is why tools must be reusable rather than disposable props, and why `P-25` builds a harness before `P-26` builds a topic. That assumption deserves its own ADR once there is any evidence.

**Explicitly unaffected.** ADRs 0001–0004 all still hold. The audience, the notebook-authorship rule, the difficulty direction and the teacher-mediated cohort are unchanged; only the order of work changed.

## Revisit when

* Six topics are out and nothing indicates anyone cares — reconsider whether the channel is a moat or a distraction, before it becomes the job.
* A teacher and cohort become available sooner than expected, making Phase 1 startable in parallel.
* The two-day budget is repeatedly broken, which means the tools are the wrong size and the phase is quietly becoming a product build.
