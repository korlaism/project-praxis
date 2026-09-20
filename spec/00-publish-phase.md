# Phase 0 · Publish — The Lab in Public

**Status:** Draft, 2026-09-19. Not yet agreed.
**Scope:** Build the simulated lab one topic at a time and publish each one. No cohort, no consent apparatus, no study. See [ADR 0005](../decisions/0005-channel-first.md).

Phase 1 remains written down and unchanged. It is parked, not cancelled.

---

## Why this phase exists

The phase that used to sit here was a six-week controlled cohort run. It was rigorous and it could not start: every path through it ran through recruiting a teacher (`P-03`), a real-world dependency with real-world latency that no amount of effort makes faster. It also contained no artefact. Nothing in seventeen documents could be *used*.

The objection that produced this phase is that validating first can strangle invention — that a survey of cart owners yields a better cart. The historical record actually makes a sharper point: Ford did not skip research and think harder, he built a Quadricycle in a shed. The Wrights built a wind tunnel and hundreds of gliders. **The alternative to validating is not envisioning, it is making.**

So this phase makes things, in public, and gets its signal from whether anyone cares.

## The two rules

**1 · No deliverable that isn't runnable.** A document that cannot be used is not an output of this phase. The artefacts are tools.

**2 · The tool is the content.** The published video is a recording of the tool being used, not an advertisement pointing at it. One build, two uses. This is the rule that stops a content treadmill from consuming the project — if the video and the tool are separate artefacts, the video wins, every week, forever.

## The posture: provoke, don't explain

The founding thesis is that **explanation is the commodity and struggle is the scarce good** ([01 · The Economics Flip](../research/01-the-economics-flip.md)). A channel that explains hard topics clearly is manufacturing the commodity, in the most crowded niche on the internet, against people who have been doing it for a decade.

Every topic therefore opens on the **surprise**, not the subject:

| Off-thesis | On-thesis |
|---|---|
| "Here's how circular motion works" | "You think you know which way this flies. You don't — and most engineering students get it wrong too." |
| Explanation, then a demo that confirms it | A commitment, then a result that contradicts it |
| The viewer learns something | The viewer is caught being wrong, then handed the thing to break |

The commit-before-reveal loop is the product; the channel is the same loop with a bigger room. Where the format allows a viewer to commit before the reveal — a poll, a pause, a comment — take it.

## What "a topic is done" means

A topic ships when all four exist:

1. **The tool.** Interactive, runs in a browser, does one idea properly. The failure modes are the point — a learner must be able to *break* it and see their own wrong model fail.
2. **The provocation.** A single question a naive viewer will answer confidently and wrongly, drawn from the documented misconception for that topic (`R-020`, `R-023`).
3. **The recording.** The tool being used, cut short, opening on the provocation.
4. **The link.** Anyone watching can go and use the thing themselves.

## Time budget

**Two days per topic, hard.** A tight simulation is a day or two; an untethered one is three weeks, and at three weeks you ship four topics a year and the project dies of slowness. If a topic cannot be done in two days, the topic is too big — split it or drop it.

The budget is why `P-25` builds a reusable harness first. Tools are the durable asset, not disposable video props.

## What this phase is not

* **Not a study.** No control arm, no cohort, no consent apparatus, no statistical claim. Nothing observed here tests `R-001`–`R-005`, and no number from it may be reported as though it did.
* **Not the notebook.** Prediction cards, the confusion log and the error record are Phase 1 and later. A topic tool takes no account and stores nothing about a person.
* **Not a licence to drop the honesty rules.** The literature/ours split holds, every source is registered as it is cited ([Resources Index](../research/06-resources.md)), and a simulation that misrepresents the physics is a defect whatever it does for reach.
* **Not a licence to publish someone else's instrument.** The FCI and FMCE are restricted to verified educators precisely so their items do not leak. We build on the documented misconceptions, which are open, and write our own items — `P-58`.

## What it produces

* A growing set of reusable, independently valuable tools — each one worth something on its own if the product thesis never holds.
* An audience reached **directly**, with no school, teacher or parent in the path. This is the part Phase 1 could not do and it attacks `P-08` head-on.
* Real signal, cheaply: does anyone click through to the tool, do they return, what do they argue about. Weak evidence by Phase 1's standards, and far better than none.
* A standing answer to "show me" that no document provides.
