# ADR 0011 · Author Our Own Items Against the Documented Misconceptions

**Date:** 2026-09-20 **Status:** Accepted **Tickets:** P-58 **Rests on:** judgment
**Amends:** `R-020`

## Context

`P-06` verified that the Force Concept Inventory is password-protected and restricted to verified educators and researchers, who agree to keep it secure — precisely so its items do not leak and lose their validity. The FMCE is handled the same way.

`R-020` says the item bank is "drawn from existing instruments rather than authored", and [ADR 0001](0001-audience-and-first-slice.md) leaned on exactly that: the corpus already exists, it is validated, and we should not rebuild it.

That reasoning survives verification, but it conflated two things. **The misconceptions are published openly. The instruments are not.** Phase 0 publishes everything it makes, so the second half of that sentence is incompatible with the phase we are in.

## Decision

**Write our own items against the documented misconceptions.** The misconception — `outward-in-circles`, `bigger-pushes-harder` — is the borrowed part, and it is openly published. The phenomenon, the wording and the distractors are ours.

Three things follow.

**Distractor writing is named as a craft, not a copy job.** It is the hardest work in the product. The FCI's taxonomy and Driver et al. are the reference for *which* wrong beliefs exist; turning one into a question a thirteen-year-old answers confidently and wrongly is our work.

**The answer check is the compensating validation.** We lose decades of psychometric validation, and gain something no borrowed item has: the simulation is run, and the option marked correct is confirmed to be what actually happens. A validated instrument asserts its answer; ours is checked. Those are different guarantees and neither replaces the other.

**Provenance is recorded on the scenario.** Which misconception, from which source. Otherwise the distinction that made this decision necessary disappears within a month.

**The instruments are never published**, in any form, including paraphrase close enough to leak an item.

## Requirements addressed

* **`R-020` is amended by this ADR** — the item bank is authored against documented misconceptions, not drawn from instruments. The requirement is edited in place with a pointer here rather than silently rewritten.
* `R-021` — an item whose outcome is arguable is a broken item. The answer check enforces this mechanically for our own primitives.
* `R-022` — the held-back transfer set is unaffected: it lives in the parked pilot, administered by a teacher, where the real instrument may be used as intended.

## Alternatives rejected

### Use PhET's published activity questions

Openly licensed and aligned with the sims we now wrap ([ADR 0009](0009-wrap-phet-where-it-exists.md)). Rejected as the primary source because they were written as classroom activities rather than as diagnostics: their distractors are not built around documented misconceptions, which is the one property we actually need.

### Author ours, then validate against the FCI in the pilot

Not rejected — deferred. It is the strongest evidence available and uses the instrument exactly as intended, but it needs the cohort `P-03` has been blocked on. Worth doing the moment there is one.

## Consequences

**Costs.** Every item is now real work, and the first few will be worse than the FCI's. We carry the burden of validity ourselves, with no external instrument to point at.

**Interacts with ADR 0009.** A wrapped PhET scenario cannot run the answer check, so its items rest on authoring craft alone. Wrapped scenarios therefore need more care in review, not less, despite being faster to ship.

**Makes easier.** Everything we write is publishable, which is what Phase 0 needs, and machine-checked, which is what ADR 0007 needs.

## Revisit when

* A cohort exists and our items can be validated against the real instrument — the deferred alternative becomes available.
* An openly licensed diagnostic instrument with misconception-built distractors turns up. If one exists we have not found it, and finding one would change this.
