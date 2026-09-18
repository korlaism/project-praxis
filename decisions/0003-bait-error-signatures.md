# ADR 0003 · Bait Error Signatures, Do Not Reduce Difficulty

**Date:** 2026-09-18 (accepted 2026-09-19) **Status:** Accepted **Tickets:** P-02 **Rests on:** judgment (the direction only — see Decision)

> Accepted **only as a direction**. P-02 originally accepted the whole ADR; P-19 narrowed
> it, because the mechanism it described rests on `R-002` and `R-003` — both still unproven,
> both marked *Guess.* in the requirements. What is accepted is that difficulty is selected
> rather than reduced, which is what the item bank and the analysis plan need in order to be
> built at all. The mechanism below is deferred, not decided.
>
> A known conflict also stands unresolved: expertise reversal cuts against signature baiting,
> and Phase 0 does not test it (`P-18`).

## Context

Adaptive learning systems, near-universally, reduce difficulty when a learner struggles and increase it when they succeed. The effect is to optimise for the feeling of progress.

The desirable-difficulties literature points the other way. Retention is bought with effort at encoding, and the useful band appears to sit around a 75–85% success rate — high enough to sustain motivation, low enough that retrieval is effortful. Systems that back off on failure push learners above that band, where the experience is pleasant and the retention is poor.

Separately, errors are not random. Misconception research establishes that they are systematic across learners; our extrapolation (`R-002`) is that each learner's errors concentrate into a small number of stable, nameable signatures — and that the structural ones (`special-case-reasoning`, `sign-or-direction`, `boundary-ignored`) persist across subjects, not just topics.

If both hold, the right move is not to route a learner around their weakness. It is to **hold the success rate in the band and choose which failures happen**, concentrating them on the named signature. The hypercorrection effect is suggestive here: high-confidence errors appear to be corrected *better* once revealed, which would make a deliberately baited high-confidence mistake the highest-value teaching moment available.

## Decision

**Accepted:** difficulty is held rather than lowered on struggle. Personalisation in this product means difficulty **selection**, not difficulty **reduction**. That is a direction, it stands on judgment, and it is enough to build the item bank and the analysis plan against.

**Not accepted — deferred until `R-002` survives the run:**

* **The success band.** Context cites 75–85%, which is read off the literature and is sourced to no requirement in this repo. A specific number needs its own requirement before it constrains anything.
* **Targeting a learner's named signature.** This presupposes `R-002`, the claim `K-02` exists to kill. It is a mechanism whose feasibility is under test, not a direction.
* **Naming the signature back to the learner.** This ADR's own Alternatives section calls the opposite option "the alternative most likely to win if K-06 triggers". An open question is not settled by appearing in a Decision section.

Phase 0 implements none of it, and tests only the precondition — that signatures exist and are stable — by analysis of the pilot dataset. If `R-002` holds, each deferred element returns as its own decision rather than arriving by implication.

## Requirements addressed

* `R-011` — confidence capture, without which high-confidence errors cannot be identified. The accepted direction rests on this and nothing else.
* `R-002`, `R-003` — cited by the **deferred** elements above. The accepted direction does not depend on either, which is why this ADR's `Rests on` field reads `judgment`. If both fail, difficulty selection over reduction still stands; only the mechanism goes.

## Alternatives rejected

### Conventional adaptive difficulty

Reduce on failure, increase on success. Rejected: it optimises the wrong variable, it is what every competitor already does, and it is not defensible — there is nothing proprietary in a difficulty dial.

### Avoid known weaknesses, build confidence first

The pastoral instinct, and not obviously wrong for a fragile learner. Rejected as a default because it produces a learner who reliably succeeds on everything except the thing they need, and because it hides the weakness from the one person who most needs to know about it. Retained as a per-learner override, not a system default — K-06 exists partly to catch the case where this was the right call and we made the wrong one.

### Bait, but do not tell the learner

Keep the signature internal and use it only for selection. Rejected because naming it is plausibly the most valuable part: "you tend to reason from one vivid example" is a transferable insight about how they think, and it is available at no extra cost. But this is the alternative most likely to win if K-06 triggers.

## Consequences

**Costs.** Deliberately engineering failure for a child is an emotionally loaded design and can read as cruelty if the framing is wrong. It requires the reveal and reconciliation steps to be genuinely good, or it is exactly the minimally-guided instruction that Kirschner, Sweller and Clark correctly criticise. It also demands per-learner error data before it can do anything, so there is a cold-start period in which the system is worse than a generic one.

**Makes harder later.** Any claim that the product is gentle or encouraging. The marketing surface of this decision is genuinely difficult and should not be solved by quietly softening the mechanic.

**Unresolved conflict.** The **expertise reversal effect** — guidance that helps novices harms experts — cuts against this directly. Signature baiting may be right for a struggling learner and counterproductive for a strong one. Phase 0 does not test this, and it is recorded as a known gap rather than left to surface in Phase 1.

## Revisit when

* `R-002` fails in Phase 0 (K-02) — the deferred mechanism is then dead and should be withdrawn rather than left waiting. The accepted direction survives: holding difficulty rather than lowering it does not require signatures to exist.
* K-06 triggers — the cohort experiences the loop as punishment. The mechanic is probably still right; the framing and the visibility of the error record are what change first.
* Evidence on expertise reversal in this context suggests a success-band floor that should vary with learner strength.
