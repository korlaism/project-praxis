# ADR 0004 · Teacher-Mediated Cohort, Not Direct-to-Learner

**Date:** 2026-09-18 (accepted 2026-09-19) **Status:** Accepted **Tickets:** P-02 **Rests on:** judgment

> Accepted because it is the **precondition for the rest of Phase 0**, not because the
> evidence is in: `P-03` recruits the cohort, and no measurement is possible until it
> lands. K-05 remains the check on whether teachers will actually carry it.

## Context

[ADR 0001](0001-audience-and-first-slice.md) selects 11–15 year olds, which brings three problems that a self-selected adult audience does not have: guardian consent and minors' data, weaker intrinsic motivation, and no source of real consequence.

The third is the serious one. The loop's value depends on honest prediction, and honest prediction depends on being wrong being survivable *and* on being wrong mattering. Fake stakes teach nothing, and a score is the weakest stake available. A direct-to-learner app has to manufacture consequence from nothing — which is where gamification comes from, and gamified stakes are fake stakes with better animation.

A cohort with a teacher supplies what the app cannot. Peers are watching, and peers are a real stake. It also happens to solve consent (one adult, one process), motivation (attendance is not optional), and recruitment (one conversation yields thirty learners instead of thirty conversations yielding thirty learners).

And the weekly mistake session — one learner presenting a mistake rather than a success — is only possible with a group and an adult holding the room. It is the cheapest and most important element of the pilot design and it is free.

## Decision

Phase 0 runs through a named teacher with a real cohort, in a school or tuition setting. Both arms are taught by the same teacher. There is no direct-to-learner path in Phase 0.

The teacher does not see running results and is not told which claim is under test, because enthusiasm asymmetry between arms is the largest uncontrolled variable in the design.

## Requirements addressed

* `R-032` — teacher-mediated, one teacher across both arms.
* `R-034` — the weekly mistake session, which requires a group.
* `R-033` — guardian consent, tractable through a single institutional relationship.
* `R-030` — a control arm, which is practically impossible to recruit direct-to-learner.

## Alternatives rejected

### Direct-to-learner

Faster to start, no institutional dependency, no consent negotiation. Rejected because the control arm becomes near-impossible to recruit honestly, consequence has to be manufactured, and self-selected 11–15 year olds who install a deliberately difficult learning app are not a sample we could generalise from.

### Parent-mediated

Consent is simple and motivation is externally supplied. Rejected because it supplies no peers, and because a parent watching a child be deliberately wrong is a worse dynamic than a teacher doing so — the record becomes a report card and K-06 arrives immediately.

### Teacher-mediated but same-class arms

Simpler to schedule. Rejected, with reservations, because contamination between arms within one class is close to certain — treatment learners will discuss the predictions. Different sections are preferred where possible; if not possible, contamination is logged rather than pretended away. This remains the weakest point in the pilot design.

## Consequences

**Costs.** A real-world dependency on securing a teacher and a cohort, with real-world latency, and it is likely the critical path for the entire phase. The pilot inherits an institution's calendar. Nothing about Phase 0 validates whether a learner or a parent would pay, because neither is the customer here.

**Makes harder later.** If the product eventually goes direct-to-learner, none of the consequence mechanism transfers, and that problem returns unsolved and harder. We will also have six weeks of data collected under teacher supervision, which may not generalise to unsupervised use at all.

**New work created.** Teacher recruitment and a consent process, both before any measurement begins. A teacher-facing brief that explains the loop without revealing which claim is under test.

## Revisit when

* K-05 triggers — the weekly mistake session does not survive a real teacher's week, or is resented. The pivot is direct-to-learner with the consequence problem unsolved.
* No cohort can be secured in a reasonable window, making this decision academic.
* Phase 1 targets an audience where institutional mediation is not available.
