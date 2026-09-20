# ADR 0009 · Wrap PhET Where It Exists, Build Where It Does Not

**Date:** 2026-09-20 **Status:** Accepted **Tickets:** P-33 **Rests on:** judgment

> Accepted for coverage, with one consequence that must not be quietly absorbed: **the answer
> check cannot run inside someone else's simulation.** The rest of this ADR is mostly about
> what replaces it.

## Context

PhET has hundreds of research-validated simulations under **CC BY 4.0** ([Resources Index](../research/06-resources.md)), free to redistribute with attribution. Our own primitives take roughly a week each; a wrapped sim takes about two days of framing, on a simulation better than ours would be.

It also answers the question anyone will eventually ask — *why not just use PhET?* Because a PhET sim lets you **play** with a phenomenon; it never stops you and makes you **commit a prediction with a confidence level before you may see what happens**. The gate is the wedge, and it works better around a world-class simulation than around one rushed in two days.

## Decision

**Where PhET has a simulation for a topic, wrap it in our gate. Where it does not, build a primitive.**

Three things this decision carries with it:

**Self-host the simulation, do not hot-link it.** CC BY 4.0 permits redistribution, and serving the files ourselves removes a network dependency from the core loop, works in a published sandbox that blocks third-party frames, and works on a slow Indian connection or none at all — which `P-08` will care about more than we do today.

**Attribution lives in the harness, once.** CC BY obliges visible credit. Per-topic attribution would be forgotten exactly once and that once would matter.

**Wrapped scenarios are hand-authored only.** They are outside ADR 0007's generation path, because generation without the answer check is how a confidently wrong scenario reaches a child.

## The consequence: no answer check

Our strongest verification — run the scenario, confirm the option marked correct is what actually happened — works because we own the simulation. Inside an embedded sim we cannot observe the outcome, so `classify()` does not exist and the check cannot run.

What replaces it, and it is weaker:

* The correct answer is **asserted by a human author** against a documented misconception, not measured.
* The card records that the outcome was **asserted rather than observed**, so `R-002` analysis can tell the two kinds of evidence apart instead of silently mixing them.
* The gate already has the seam: `reveal()` with no argument falls back to the configured answer (P-52), which is exactly the wrapped case.
* A wrapped scenario's parameters are not ours either, so the verdict cannot track a changed setup the way P-52 made it track ours. A wrapped scenario should therefore not expose parameter controls it cannot score.

**Our own primitives remain the only path with machine-checked answers**, and the only path a generator may use. That is now a reason to keep building them, not just a slower alternative.

## Requirements addressed

* `R-020`, `R-021` — items built on documented misconceptions with demonstrable outcomes. Wrapping satisfies these through a validated instrument rather than through our own physics.
* `R-010` — unchanged. The gate wraps the embed; the sim is unreachable until a commit exists.

## Alternatives rejected

### Keep building our own primitives only

Rejected on coverage, not on quality — it is the better artefact and roughly five times the work per topic. Retained wherever PhET has nothing, which includes most of chemistry.

### Wrap now, replace later

Rejected because "later" rarely arrives, and the intervening scenarios stay unverifiable and uncomposable while pretending to be temporary.

## Consequences

**Costs.** A second kind of scenario, with weaker guarantees, that must be visibly distinguishable in the code and in the record. An attribution obligation. Storage for the sims we redistribute.

**Forecloses.** Composing a wrapped sim around a learner's error signature — it is someone else's simulation and cannot be parameterised by us. Personalisation, when it comes, will work on our primitives.

**Does not affect the licence.** Embedding does not mix code, and the sims are CC BY content rather than GPL source — see ADR 0008.

## Revisit when

* The proportion of wrapped scenarios grows to where most of the catalogue cannot be machine-checked. That is the line at which coverage has started eating the thing that makes this trustworthy.
* Generation matures enough that our own primitives are cheaper per topic than framing someone else's sim.
