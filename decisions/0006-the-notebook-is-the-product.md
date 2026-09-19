# ADR 0006 · The Notebook Is the Product, the Tools Are the Surface

**Date:** 2026-09-19 **Status:** Accepted **Tickets:** P-39 **Rests on:** judgment

> A direction, not a claim about outcomes. Nothing here asserts that learners will keep a
> notebook. It asserts which of two products we are building, and therefore what gets built
> next — which had become genuinely unclear.

## Context

Three topic tools exist, 49 tests pass, and **nothing persists**. Every prediction a learner makes is discarded when the tab closes.

That makes each topic a terminal artefact: predict, be surprised, leave. Nothing accumulates for the learner, so there is no reason to return; and nothing accumulates for us, which has a consequence nobody had stated plainly — **`R-002` cannot be tested by this path at all.** The claim that a learner's errors cluster into stable signatures requires a record across topics. We could ship thirty tools and still know nothing about it.

Underneath that sat a fork we had not named:

* **A — the notebook.** A learner-owned record of what they believed, when, how sure they were, and what class of mistake they keep making. Compounding, defensible, slow.
* **B — the lab.** A library of interactive tools that teachers and publishers embed. Faster to revenue, barely defensible, and it already substantially exists.

We were building B's raw material while claiming A's thesis. The simulations were never the defensible asset — PhET has hundreds and gives them away under CC BY 4.0 ([04 · Open Source Landscape](../research/04-open-source-landscape.md)).

## Decision

**The notebook is the product. The tools are the acquisition surface.**

Topic production stops at three. The next build is persistence: prediction cards that survive across scenarios, a record the learner owns, and a calibration curve — the one thing on offer that no explainer, no textbook and no chatbot gives a thirteen-year-old.

Notebooks are **per subject**, so a learner keeps one for physics, one for chemistry, and so on.

New scenarios are chosen to **cross-cut error classes**, not to cover curriculum. Testing whether a signature transfers requires scenarios that share a structural error — `special-case-reasoning`, `boundary-ignored` — across different physics. Building more topics before that is building content with no hypothesis.

## Requirements addressed

* `R-014` — every prediction, reveal, reconciliation and confusion entry stored with a timestamp and item id. Written in Phase 1 for a spreadsheet; it is the same object.
* `R-011` — confidence capture, which the gate already does and then discards.
* `R-002` — this decision is the precondition for ever testing it.
* `R-004` — logged confusion, which needs somewhere to live.

## Alternatives rejected

### Keep shipping topics

The default, and it produces a stream of one-off artefacts indistinguishable from PhET-with-a-question. Rejected because nothing compounds, for anyone.

### Build the lab as the product

Defensible as a business — teachers and publishers do pay for good interactive content. Rejected as the *primary* direction because the moat is thin, the work is a treadmill, and it abandons the only claim that made this project interesting. It remains a live fallback if the notebook finds no purchase, and the tools built for A serve B unchanged.

### Both at once

Rejected on attention, not on merit. Two products need two distribution stories, and neither the channel nor the notebook has one yet.

## Consequences

**Costs.** Persistence brings identity, storage and — since the learners are minors — a duty of care that [Data Model](../spec/04-data-model.md) already anticipates. `R-033` requires guardian consent before data collection, and that now applies outside the parked pilot. A record of a child's mistakes remains a hazardous artefact, and `K-06` is live.

**Makes harder later.** Anything anonymous and frictionless. A prediction that is stored is a prediction that needs a home, and possibly an account.

**Forces a future decision.** Where the notebook lives: browser-local, learner-exported, or hosted. Local first is the obvious start and it is the one that keeps the consent question small.

## Revisit when

* Persistence ships and nobody returns to look at their own record — then the notebook is not the product and B deserves a second hearing.
* Calibration proves untrackable in this age band (`P-07`, `R-005`), removing the most compelling thing the record shows.
