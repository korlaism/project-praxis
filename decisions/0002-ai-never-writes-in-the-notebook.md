# ADR 0002 · AI Never Writes in the Learner's Notebook

**Date:** 2026-09-18 (accepted 2026-09-19) **Status:** Accepted **Tickets:** P-02 **Rests on:** judgment

> Accepted as a **design stance**, not an empirical finding. What the pilot tests is
> whether the constraint is survivable in practice — whether learners write enough,
> unaided, for `R-002` to be testable at all. If they do not, the rule is not wrong;
> the capture method needs redesigning. See the revisit conditions.

## Context

The learner's own statements — their prediction, their confidence, their reconciliation of the gap — are the only asset this product has that is not a commodity. Explanation is free everywhere. A record of what a specific person believed before they found out is not.

There is a strong and continuous pressure to let the model help with those fields: autocomplete the prediction, suggest a better phrasing of the explanation, summarise the reconciliation into something tidier. Every one of those makes the interface feel better and destroys the asset.

Two mechanisms, both well established. The **generation effect** says a self-produced answer is retained better than a read one; a suggested prediction is a read one. And fluent text reliably produces the *sensation* of understanding without the substance, so a model-polished reconciliation reads as comprehension to the learner, to the teacher, and to us — while carrying no information about what the learner actually thinks.

The failure mode at the end of this road is a notebook full of model output that the learner reviews and recognises. It looks like a knowledge base. It is a transcript of a conversation with a machine, and it is worthless both as learning and as data.

## Decision

No AI-generated text is ever written into a learner-owned field. The learner's prediction, confidence and reconciliation are authored by the learner and by nobody else.

This is enforced in the **data model**, not the interface — the fields are marked as learner-authored in [Data Model](../spec/04-data-model.md) and a write from any other source is invalid. Stating it as a UI principle would not survive the first roadmap review in which someone proposes a helpful autocomplete.

AI may do everything else: ask, challenge, interrogate the mechanism, index, cross-link, quiz, generate item variants, build sandboxes, and summarise *its own* side of an exchange. The boundary is authorship of the canonical claim, not participation.

## Requirements addressed

* `R-015` — no AI-generated text in learner notebook fields.
* `R-012` — the reconciliation is written by the learner, which is only meaningful under this constraint.
* `R-014` — the stored record is evidence of what the learner believed, which requires that they wrote it.

## Alternatives rejected

### AI-assisted drafting with learner editing

The intuitive compromise: model drafts, learner corrects. Rejected because editing is not generating — the retention benefit comes from retrieval and production, both of which are bypassed. It also anchors the learner on the model's answer, which is precisely the wrong anchor before a reveal. And for our purposes it contaminates the dataset irreparably: an edited draft cannot be distinguished from an original, so `R-002` becomes untestable.

### AI polishing after the learner writes

Superficially safe — the original is captured first. Rejected because the learner then reads the polished version back, and that is what they remember. It also creates a quiet incentive to write less, knowing it will be cleaned up.

### Allow it for accessibility

A real case: dyslexia, motor difficulty, a learner more fluent in speech than writing. Rejected as stated, but the need is legitimate and the answer is **transcription, not generation** — speech-to-text preserves authorship, model rephrasing does not. Worth its own ticket rather than an exception here.

## Consequences

**Costs.** The product feels less impressive in a demo. Learner-written text will be short, misspelled and sometimes near-illegible, which makes marking and analysis more expensive — Phase 1 marks by hand partly for this reason. Some learners will write almost nothing and that will be a real data-quality problem, not a solved one.

**Makes harder later.** Any feature that generates study material *from* the notebook has to be carefully scoped so the generated artefact is stored separately and never edits back. Two-way sync with anything is foreclosed.

**Forces a future decision.** Where model-authored content lives, and how it is visually distinguished from learner-authored content so that neither the learner nor a later reader can confuse them.

## Revisit when

* Evidence emerges that transcription-class assistance changes retention outcomes, in either direction.
* Learner-written data quality is so poor that `R-002` cannot be tested at all — in which case the constraint is not wrong, but the capture method needs redesigning before the rule is loosened.
