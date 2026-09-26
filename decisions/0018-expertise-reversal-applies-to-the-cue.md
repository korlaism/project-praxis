# ADR 0018 · Expertise Reversal Applies to the Cue, Not to the Bait

**Date:** 2026-09-26 **Status:** Accepted **Tickets:** P-18 **Rests on:** judgment
**Relates to:** [ADR 0003](0003-bait-error-signatures.md), [ADR 0014](0014-the-reveal-cues-before-it-explains.md), `R-002`, `R-003`

## Context

[ADR 0003](0003-bait-error-signatures.md) carries an unresolved conflict in its own Consequences section: *"the expertise reversal effect — guidance that helps novices harms experts — cuts against this directly. Signature baiting may be right for a struggling learner and counterproductive for a strong one."* The same sentence is repeated in three research files. `P-18` asked whether it is real and whether it must be settled before Phase 1.

**It is real, and it is not where we put it.**

The effect works through **redundancy**. Kalyuga, Ayres, Chandler & Sweller (2003): a technique that helps a novice loses effect and then reverses as prior knowledge grows, because a learner who already holds the schema must reconcile the external explanation against the internal one, and that reconciliation costs working memory that the novice was spending on the explanation itself. The mechanism is about **guidance presented alongside the task**. Worked examples are the canonical case.

Read that way, our three pieces come apart.

**Difficulty selection is not guidance.** The part of ADR 0003 that is actually accepted — hold difficulty rather than lower it on struggle — adds nothing for a learner to reconcile. It is also **already expertise-relative**: holding a success-rate band means a stronger learner meets harder items to stay in the same band. Adjusting as knowledge grows is what the effect *recommends*, not what it warns against.

**Baiting is selection, not explanation.** Choosing which item a learner meets adds no external account to reconcile against their own. A strong learner baited on a signature they have already fixed is having their time wasted by a stale measurement — a real risk, and a different one. It belongs to `R-002`'s stability claim, which `K-02` already exists to kill, not to cognitive load.

**The cue is guidance, presented alongside, automatically.** [ADR 0014](0014-the-reveal-cues-before-it-explains.md) shows a learner who answered wrongly a hint aimed at the misconception behind their choice, before any explanation. For someone who already knows why they slipped, that is exactly the redundant external account the effect describes. And the study ADR 0014 rests on contains the interaction in its own result: scaffolded correction worked *"especially for poor comprehenders"*.

The conflict did not move. ADR 0014 was written three days ago; the conflict was recorded in September against the only mechanism that existed then.

## Decision

**Record the conflict against the cue, not the bait, and do not act on it in Phase 1.**

**1 · ADR 0003's accepted direction stands unqualified.** Difficulty selection over reduction is not in tension with expertise reversal and never was. The note in that ADR is annotated rather than removed, because a conflict that was recorded and then reasoned about is worth being able to follow.

**2 · Phase 1 does not test it, and should not try.** The cohort is 11–15 year olds on force and motion — near-uniform novices in this domain, which is precisely the population where the effect does not show. Testing it needs expertise variance we will not have, and building for it would be building for a learner the pilot cannot contain.

**3 · What Phase 1 owes it is the datum.** The question becomes answerable only if we can later ask *who used the cue*. Today the record cannot say: it holds the attempt and the retry, but not whether a cue was shown, nor whether the learner retried after it or asked for the explanation instead. `P-89` adds that. It is one field and it is the difference between a question we can answer from the pilot dataset and one we cannot.

**4 · The mitigation already in place is named, so it is not lost.** The cue is **not compulsory**. ADR 0014 offers "predict again" and "show why" side by side, and a learner who does not need the hint can take the explanation in one tap. That optionality is what keeps this from being a live harm today, and it is now a constraint rather than a convenience: **the cue must never become the only path forward.**

## What would change the answer

If the cue were ever shown before the learner's answer, or made compulsory, or extended into a multi-step scaffold, this stops being a deferred question. Each of those turns an optional hint into guidance the learner must process, which is the exact shape the effect punishes.

## Requirements addressed

* `R-002`, `R-003` — untouched. The stale-signature risk named above is a restatement of what `K-02` already tests, not a new claim.
* `R-014` — the dataset is the deliverable, and it is currently missing the field that makes this question answerable. `P-89`.

## Revisit when

* `P-89` lands and the pilot produces cue-response data. If strong learners systematically skip the cue, the effect is visible in our own numbers and the design follows it.
* The audience widens beyond the band ADR 0001 chose. A product used by a physics undergraduate and a thirteen-year-old has the expertise variance Phase 1 lacks, and then this is a live design question rather than a note.
* Anyone proposes making the cue mandatory, for any reason. That is the trigger, and it is worth refusing on this ground alone.
