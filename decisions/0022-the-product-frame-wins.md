# ADR 0022 · The Product Frame Wins, and Phase 1's Scope Sentence Does Not

**Date:** 2026-10-18 **Status:** Accepted **Tickets:** P-95 **Rests on:** judgment
**Relates to:** [ADR 0001](0001-audience-and-first-slice.md), [ADR 0004](0004-teacher-mediated-cohort.md), [ADR 0006](0006-the-notebook-is-the-product.md), [ADR 0017](0017-desktop-first-with-a-gated-phone-landing.md), [ADR 0021](0021-logged-confusion-is-measured-not-killable.md)

## Context

[Phase 1 Requirements](../spec/02-requirements.md) opens with a scope sentence that has governed every ticket in this repository:

> *Phase 1 = a six-week cohort run on the thinnest viable instrument, plus the analysis. **No app, no accounts, no infrastructure.***

It has been obeyed exactly. The result is a research instrument: a gate, a cue, a reconciliation, a confusion log, a device-local notebook, 23 hand-authored scenarios, and a 1,388-line scenario directory with no tests because it is content rather than code. Everything in it is defensible against that sentence.

It is also not the product that was asked for. The intent, stated plainly by the person building this: **a tool that helps a student build their own learning sessions with AI — their own model or a hosted one — where AI composes interactive simulations out of engines we pre-build, and the learner's own notes are what the system learns them from.**

Measured against that, the honest position on 2026-10-18 was roughly 15% complete, and concentrated in one corner. Three of its load-bearing pieces were at zero: a session shell, a topic graph, and **any AI at runtime at all** — the built lab contains no network transport and `lab/notebook/privacy.test.mjs` asserts that it cannot.

This is not drift. **The spec was working as written, and it describes a different artefact.** The gap persisted because every ticket was drawn from a queue derived from that sentence, and nobody asked whether the sentence was still the right one.

## Decision

**The product frame governs from here. The Phase 1 scope sentence no longer selects what gets built.**

**1 · "No app" is retired as a constraint.** It was the right call for a six-week classroom study and it is the wrong call for the thing being built. A session shell, and later a topic graph and a runtime model seam, are now in scope.

**2 · Nothing already built is thrown away, and most of it was never the pilot's.** The gate, the cue, the reconciliation, the confusion log and the device-local notebook are product mechanics that the pilot would also have used. The one genuinely differentiating asset — **the answer check**, which runs a generated simulation headlessly and refuses it unless the claimed answer is what actually happened — is the product's asset first and the pilot's second.

**3 · The hand-authored scenario bank is reclassified as fixtures.** 23 items exist to prove the primitive registry and the answer check work. They are not the deliverable and the bank is not to be grown as an end in itself. New scenarios are authored only when they exercise something the registry cannot yet do.

**4 · Phase 1 is not cancelled, it is unscheduled.** `spec/02` §1's claims, `spec/05`'s kill criteria and the cohort design stay in the repository, unchanged and still true, as the validation plan for when there is a cohort. What changes is that **the ticket queue is no longer drawn from them.** Requirement ids keep their meaning; `R-010` through `R-016` describe the product's mechanics just as well as the instrument's.

**5 · The research discipline stays.** Tickets, failing tests first, ADRs, the answer check, the privacy whitelist, mutation-checking what ships. None of that was pilot machinery; it is how this repository avoids lying to itself, and a product needs that more than a study does.

## What this costs, stated before it bites

**The claims get weaker, not stronger.** `K-01`'s retention comparison needs a cohort and an arm; a product used by whoever downloads it produces neither. ADR 0021 already recorded that the voluntary half of the design cannot be causally evaluated. With the pilot unscheduled, **nothing in the product is being tested against a criterion at all** until someone deliberately runs one. That is a real loss and it should be felt, not smoothed over.

**The minors question gets harder, not easier.** `K-06` and `R-033` were written for a consented classroom. "Students of all ages", bring-your-own-key, and a possible hosted tier is a wider and less controlled population. `P-60` — data protection for a hosted product used by minors — stops being a someday ticket.

**The no-transport property is about to be deliberately broken.** It is currently the strongest privacy position this project will ever have, and it is held by a passing test. Runtime AI ends it. That is its own decision, its own ADR, and its own consent design — not a patch, and not this ticket.

## Alternatives rejected

### Keep both frames and alternate

What was happening already, without anyone choosing it. Rejected because the queue, not the intent, decides what gets built, and the queue was entirely one frame. Two frames with one queue is one frame.

### Finish Phase 1 first, then build the product

Defensible, and the usual advice. Rejected because the pilot's critical path is a teacher and a consented cohort ([ADR 0004](0004-teacher-mediated-cohort.md)) — a real-world dependency with real-world latency that no amount of building moves. Waiting on it means building instrument polish for a study that cannot start, which is what the last stretch of tickets was.

### Start the product from scratch

Tempting, because the spec is now partly about something else. Rejected: the answer check, the primitive contract, the gate and the notebook are the hard-won parts, and they port unchanged. What needs rewriting is the queue, not the code.

## Revisit when

* A teacher and a cohort exist. Phase 1 is then schedulable, and the claims in `spec/02` §1 become live again rather than archived.
* The frontier generation run (`P-90`) returns. If a capable model cannot compose a scenario that survives the answer check, the product's central premise needs a repair loop or a human in the loop, and the shape of the thing changes.
* Anyone proposes growing the scenario bank as a deliverable. That is the old frame returning, and §3 above is the answer.
