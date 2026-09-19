# ADR 0007 · Scenarios Are Generated From Verified Primitives, Not Authored

**Date:** 2026-09-19 **Status:** Proposed **Tickets:** P-39 **Rests on:** judgment, pending the `P-45` spike

> **Proposed, not Accepted.** The architecture is sound on paper and the feasibility is not yet
> demonstrated. What would accept it is a number, not an argument: generate twenty scenarios,
> run every one through the four checks in [Generated Scenarios](../spec/07-generated-scenarios.md),
> and count how many pass unaided. Above roughly 90% and this is the shape of the product.

## Context

Hand-authoring topics does not scale and, worse, it does not match the goal. The owner's intent is that a learner names a subject and gets an interactive scenario built for them — to explain, to test, or to play with — then snapshots it into their notebook.

Three tools took three days each including their components. A curriculum is thousands of scenarios. More importantly, an authored library can only ever answer questions we anticipated, and the entire premise of the notebook is that it responds to *this* learner's errors.

The architecture already built turns out to fit, once it is read differently: the components become the vocabulary a model composes at runtime, the harness becomes a runtime contract, and the three topics become reference implementations that define the spec.

## Decision

Scenarios are **generated as a specification, not as physics code**.

A model emits JSON against a constrained schema — which primitive, what parameters, the question, the options, the correct answer, the explanation. The physics belongs to our verified primitive library and is written once and tested once. This is Tier 1 and it is the whole of the near-term plan.

Tier 2 — the model writing `setup`, `step` and `draw` itself — is deferred behind the verification harness, not abandoned.

**Verification is the product, not a safeguard.** Four checks, specified in [Generated Scenarios](../spec/07-generated-scenarios.md): runtime invariants, closed-form oracles, property and limit checks, and the answer check — run the scenario, confirm the option marked correct is what actually happened and no distractor did. That last one closes the loop on the largest risk in AI-generated education content and is mechanically decidable because we own the simulation.

Every primitive added must carry its own analytic solution, so the oracle exists before the generator can reach for it.

## Requirements addressed

* `R-020`, `R-021`, `R-023` — items built on documented misconceptions with unambiguous demonstrable outcomes. Generation does not relax these; the answer check enforces `R-021` mechanically rather than by review.
* `R-015` — unchanged and load-bearing. AI generates the *scenario*; it never writes in the learner's notebook ([ADR 0002](0002-ai-never-writes-in-the-notebook.md)).

## Alternatives rejected

### Keep authoring topics by hand

Does not scale, and can only answer questions we thought of first. Retained for the reference implementations that define the schema.

### Let the model write the simulation code directly (Tier 2 now)

The expressive option, and the tempting one. Rejected for now because sandboxing is the easy part and correctness is not: a generated simulation that silently violates conservation while teaching conservation is precisely the defect `research/04` commits us against. Revisit once the four checks are proven on Tier 1.

### Wrap PhET sims instead of generating

Still the right answer where PhET has a sim, and `P-33` remains open. It does not generalise: a PhET simulation cannot be composed around one learner's error signature, which is the whole point of the notebook.

## Consequences

**Costs.** The primitive library becomes load-bearing rather than convenient, which promotes `P-31` sharply. Each primitive now owes an analytic solution as well as an implementation. A verification harness is real engineering and must exist before generation is exposed to anyone.

**Makes harder later.** Anything that assumes a fixed catalogue — pre-rendered thumbnails, hand-written lesson plans, a static sitemap.

**Buys.** Snapshots become trivial: a spec plus a seed plus a timestamp, small and replayable, precisely because we store specs rather than code.

**Coverage is honestly limited.** Mechanics is cheap. Chemistry and biology are not, and `research/04` found chemistry simulation tooling barely exists — which is an opportunity and a cost at the same time.

## Revisit when

* The `P-45` spike returns below roughly 90% unaided pass rate, especially on the answer check.
* Tier 2 verification proves tractable, at which point the deferral should be lifted deliberately rather than by drift.
