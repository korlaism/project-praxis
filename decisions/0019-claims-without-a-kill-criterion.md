# ADR 0019 · A Claim With No Kill Criterion Is Marked, Not Left Blank

**Date:** 2026-09-28 **Status:** Accepted **Tickets:** P-20 **Rests on:** judgment
**Amends:** `R-003`, `R-004` · **Relates to:** [ADR 0013](0013-split-r005-transfer-is-exploratory.md)

## Context

Section 1 of the requirements opens: *"These are the reason the phase exists. Each maps to a kill criterion."* Two of its six claims did not.

`R-003` — baiting a learner's named signature beats routing around it — carried `—` in the Kill column while being cited first among the requirements ADR 0003 addresses. `R-004` — logged confusion is resolved more often than unlogged confusion — carried `—` too, and nobody had noticed: `P-20` named only `R-003`.

A falsifiable claim with nothing able to falsify it is not a falsifiable claim. It is an assumption sitting in the section reserved for things the run can contradict, drawing authority from its neighbours.

Neither can honestly be given a criterion. `R-003`'s mechanism is deferred by ADR 0003 until `R-002` survives, so Phase 1 does not test it and could not fire on it. `R-004` depends on confusion logging (`R-013`), which is not built, so Phase 1 does not measure it either.

## Decision

**A claim in section 1 either names a kill criterion or is marked, in the table, with why it has none.** Two marks, because the two cases are different and collapsing them would hide something:

**`Exploratory`** — measured and reported, but nothing kills on it. `R-035` (calibration transfer) is the case: the pilot will produce the number, and no result makes us stop.

**`Deferred`** — Phase 1 neither tests nor measures it. `R-003` and `R-004` are now marked this way. The distinction matters because a reader who sees `Exploratory` expects data at the end of the run, and for these two there will be none.

Both marks carry the same two consequences, which are the ones that matter: **no decision may rest on the claim** — all four ids are in `check-docs.py`'s `UNSETTLED` tuple, where an `Accepted` ADR resting on them fails the build — and **no kill criterion fires on them**.

`tools/claims.test.mjs` now checks section 1's opening promise rather than restating it: every claim names a `K-` criterion or carries one of the two marks, and never both.

## What this does not do

**It does not weaken either claim.** `R-003` is still the personalisation thesis and still the most commercially interesting thing here. Marking it `Deferred` says when it will be tested, not whether it is true.

**It does not excuse the gap.** The right answer for `R-004` is to build `R-013` and give it a criterion; the right answer for `R-003` is for `R-002` to survive Phase 1 so its mechanism can be tested. The marks are honest bookkeeping until then, not a resting place.

## Alternatives rejected

### Attach kill criteria anyway

Write `K-07` and `K-08` and move on. Rejected because a criterion that cannot fire in the phase it belongs to is decoration, and decoration in the kill-criteria list is worse than an admitted gap — it is the list the whole project is supposed to be honest with itself through.

### Move them out of section 1

Tidier, and it loses the thing worth keeping: these are claims, they are falsifiable in principle, and the reason they are untested is a fact about our phasing rather than about them. Out of section 1 they become background, and `R-003` is not background.

## Revisit when

* `R-002` survives Phase 1. `R-003`'s mechanism becomes testable and it should take a real criterion rather than keep its mark.
* `R-013` is built. `R-004` becomes measurable in the same run and should do the same.
