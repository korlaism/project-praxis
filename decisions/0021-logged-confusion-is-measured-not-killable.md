# ADR 0021 · Logged Confusion Is Measured, Not Killable

**Date:** 2026-10-17 **Status:** Accepted **Tickets:** P-93 **Rests on:** judgment
**Relates to:** [ADR 0019](0019-claims-without-a-kill-criterion.md), [ADR 0013](0013-split-r005-transfer-is-exploratory.md), [ADR 0020](0020-the-reconciliation-is-offered-not-demanded.md), `R-004`, `R-013`

## Context

[ADR 0019](0019-claims-without-a-kill-criterion.md) marked `R-004` — *logged confusion is resolved more often than unlogged confusion* — **`Deferred`**, with a reason stated plainly: *"`R-004` depends on confusion logging (`R-013`), which is not built, so Phase 1 does not measure it either."* It set its own expiry: *"`R-013` is built. `R-004` becomes measurable in the same run and should do the same"* — that is, take a real kill criterion rather than keep its mark.

`P-93` built `R-013`. The reason has expired, and the mark cannot be left standing on a sentence that is no longer true.

But the obvious move — write `K-07` and be done — does not survive contact with what the log actually is.

**"Unlogged confusion" is not observable.** The claim compares two populations, and one of them is defined by the absence of the only signal that would reveal it. Confusion nobody logged leaves no trace; it cannot be counted, only assumed. The nearest proxy is *concepts the learner answered wrongly without logging*, and that conflates "was not confused" with "was confused and said nothing" — which is the whole phenomenon.

**Logging is voluntary, so the comparison is self-selected.** A learner who taps is plausibly a different learner: more willing to admit being lost, more metacognitively engaged, perhaps simply more engaged. Any gap in resolution rate between the logged and the unlogged is a gap between those two people before it is a gap between two conditions. This is the same confound [ADR 0020](0020-the-reconciliation-is-offered-not-demanded.md) recorded against `R-012`'s write rate three hours earlier, and for the same reason: a mechanic that is offered rather than assigned cannot be compared as though it were assigned.

**Making it compulsory would not fix it and would break the thing.** `R-013` is *one-tap, never blocking*, and spec/04 calls the log "deliberately almost empty" because a field that costs more than two seconds will not be filled. A forced confusion check is a different instrument measuring a different thing.

ADR 0019 already named the principle this runs into, in its own text: *"a kill criterion that cannot fire honestly is worse than none"*, and it rejected attaching criteria anyway because *"decoration in the kill-criteria list is worse than an admitted gap."*

## Decision

**`R-004` moves from `Deferred` to `Exploratory`. It gets no kill criterion.**

The mark changes because the fact underneath it changed: the pilot will now produce confusion-log data — entry rate, words rate, resolution rate, time to resolution — where before it would have produced none. `spec/03` already lists those as things the pilot reports. A reader who sees `Exploratory` expects data at the end of the run, and now there will be some.

The criterion does not follow, because the claim as written cannot be tested by the data the instrument can produce. **The numbers are reported; nothing stops on them; no ADR may be `Accepted` resting on `R-004`** — it stays in `check-docs.py`'s `UNSETTLED` tuple, where that fails the build.

**What the pilot is actually asked for** is the descriptive half, and it is worth having on its own: do learners use a two-second escape hatch at all, what do they write when they do, and do they ever come back and close one. If nobody taps it, that is a fact about the design worth knowing and it needs no criterion to be useful.

## Requirements addressed

* `R-013` — built: one tap, available before the commit, during the run and after the reveal, blocking nothing.
* `R-004` — re-marked, honestly. The claim is unchanged; what changed is that it is now measured rather than absent, and that its design makes it correlational rather than killable.
* `R-014` — entries carry a timestamp and the item in view, as cards do.

## Alternatives rejected

### Write `K-07` on the resolution-rate gap

The literal reading of ADR 0019's revisit condition. Rejected on that same ADR's own standard: the comparison's control group is unobservable and its treatment group is self-selected, so the criterion could not fire honestly in either direction. A criterion that fires on a confound is worse than no criterion, because it ends an argument that should still be open.

### Randomise the log — half the cohort gets the button

This would make `R-004` genuinely testable, and it is the right design for a study of *this* question. Rejected for Phase 1: the cohort is one class, the arms are already committed to `R-001`, and splitting on a second factor leaves cells too small to read. It is also a poor trade — withholding a two-second escape hatch from half the children for six weeks, to settle a claim that is not the thesis.

### Leave it `Deferred`

Least work, and now false. `Deferred` means Phase 1 neither tests nor measures it, and Phase 1 will measure it. The mark would be a quiet lie in the one table built to stop quiet lies.

### Drop `R-004` from section 1

It is a claim, it is falsifiable in principle, and the reason it cannot be killed here is a fact about our instrument rather than about the claim. ADR 0019 rejected the same move for `R-003` and the argument holds.

## Consequences

**Costs.** `R-004` is now permanently soft inside Phase 1. If confusion logging turns out to be the most-used thing in the product, we still cannot claim it causes resolution, and the write-up has to say so.

**Buys.** The first real data on whether learners will admit confusion to a machine when nothing forces them to, and a kill-criteria list that still means what it says.

**Pattern worth noticing.** Three mechanics now — the cue ([ADR 0018](0018-expertise-reversal-applies-to-the-cue.md)), the reconciliation ([ADR 0020](0020-the-reconciliation-is-offered-not-demanded.md)) and the confusion log — are optional by design, and all three are therefore self-selected and uncomparable. That is a coherent stance about children rather than three separate accidents, but it means **the product's voluntary half cannot be causally evaluated by this pilot at all**. Only `R-001`'s gate, which is compulsory, carries a real criterion. That is worth a decision of its own before Phase 2 designs anything.

## Revisit when

* The pilot reports the log. If usage is high and the resolution rate is strikingly different, a Phase 2 study with a randomised arm becomes worth its cost, and this gets a real criterion there.
* Anyone proposes making the log compulsory to make `R-004` testable. The claim is not worth the instrument.
* Phase 2 scope is drawn. The pattern noted above — a product whose optional half cannot be evaluated — should be faced then rather than rediscovered.
