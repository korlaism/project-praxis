# ADR 0024 · The Learner Chooses Which Notes the Model Sees, One at a Time

**Date:** 2026-10-18 **Status:** Accepted **Tickets:** P-101 **Rests on:** judgment
**Relates to:** [ADR 0002](0002-ai-never-writes-in-the-notebook.md), [ADR 0020](0020-the-reconciliation-is-offered-not-demanded.md), [ADR 0023](0023-the-model-seam-and-the-answer-check-as-its-gate.md), `R-012`, `R-015`, `P-44`, `P-60`, K-06

## Context

The product's stated intent ends here: *"a tool to learn things using AI that learns your behaviour from the notes that only you can write."* Everything else in that sentence now exists. The notes do not reach the model.

[ADR 0023](0023-the-model-seam-and-the-answer-check-as-its-gate.md) opened the seam and drew the line in the same breath. §4: the request carries the topic and the primitive contract, **never the notebook, never the session notes, never the confusion log** — asserted against the bytes of the request rather than promised. Its revisit condition names this ticket: *"Anyone proposes sending the notes. §4 is the line, and moving it is a new decision, not a configuration change."*

**A note is not a topic.** A topic is three words typed to get started, and the learner typed them knowing they were a request. A note is written in a box that says *"Anything you want to keep. Nobody writes here but you."* [ADR 0020](0020-the-reconciliation-is-offered-not-demanded.md) called the reconciliation *"the most sensitive thing in the dataset"* and `K-06` exists because a persistent record of a child's mistakes is a hazardous artefact.

And the decisive fact: **some of what is written in that box will not be about physics.** A box offered to a child, promising privacy, invites more than a note about friction. That is not a hypothetical failure mode of the feature; it is the ordinary case for some proportion of learners, and the feature as naively built would post it to a commercial API.

## Decision

**The learner chooses, note by note, every time, and sees the exact words before they go.**

**1 · Nothing is selected by default, and nothing is remembered.** There is no "always share my notes" switch, and the selection does not persist between compositions. Every send is a fresh decision. Composing without choosing anything produces a request **byte-identical to today's**, which the test asserts.

**2 · The exact text is shown, beside where it is going.** Not a count, not a summary, not "3 notes". The sentences themselves, next to the endpoint's address. A learner cannot consent to a number.

**3 · Per note, not per session.** A session's notes are not one thing. The note about forgetting the discriminant and the note written on a bad day are in the same list, and a single switch would send both.

**4 · The prompt says what they are and what they are for.** They are marked as the learner's own words, to be used for **choosing what to compose** — and explicitly **not to be quoted, echoed or referred to**. A scenario that repeats a child's private sentence back at them is surveillance whatever it was composed from, and the instruction is in the prompt because nothing downstream can detect it.

**5 · Everything else is unchanged.** [ADR 0002](0002-ai-never-writes-in-the-notebook.md) and `R-015` stand: the model reads a note it was shown; it still never writes one. The answer check still runs on everything composed, in the browser, before anything is rendered.

**6 · The record is still not sent.** Cards, error tags, confusion entries, the Brier data — none of it. This decision moves one field and names it.

## What this costs, stated before it bites

**The strongest sentence in the settings page is now qualified.** It said *"Your notes, your predictions and your record are never sent."* It becomes *"...unless you pick one, every time, and see it first."* That is a worse sentence and it is the true one.

**Selection friction will suppress use, and that is the trade.** `R-013` holds that a field costing more than two seconds will not be filled; the same logic says a feature requiring a deliberate choice per note will mostly not be used. The alternative is a switch somebody flips once in week one and forgets for six weeks, which is not consent.

**It cannot be undone from the learner's side.** Once a sentence has gone to a third party, no button in this product retrieves it. The design can only govern what goes, which is why it governs it one sentence at a time.

**`P-60` moves from deferred to blocking for any hosted tier.** Bring-your-own-key means the learner's own account and their own relationship with a provider. The moment we operate the endpoint, we are a processor of children's free text, and that is a different legal object entirely.

## Alternatives rejected

### A per-session switch: "use my notes for this topic"

One decision instead of many, and the obvious design. Rejected under §3: a session's notes are not one kind of thing, and the switch is flipped while thinking about the discriminant and still on a fortnight later. Consent that is cheap to give and easy to forget is the shape this product exists not to ship.

### Send the notes, strip anything that looks personal first

A classifier between the learner and the model. Rejected twice over: it would be a model reading every note to decide which the learner may share — the surveillance this ADR is written to avoid, performed earlier — and `spec/03` already commits the comparable judgement (`K-03` degeneracy) to a human auditor rather than inference.

### Summarise the notes locally and send the summary

Appealing, and impossible honestly: the only thing capable of summarising free text here is the model we are deciding whether to show it to.

### Keep ADR 0023 §4 and never send them

The safe answer, and the one that abandons the product's stated purpose. Worth naming plainly: the notes are the whole personalisation thesis, and refusing to move would mean the thing is a scenario browser with a notebook attached. The decision is not whether the risk is real — it is real — but whether the learner gets to take it sentence by sentence or not at all.

## Requirements addressed

* `R-012` — the reconciliation stays what it was: written by the learner, never edited, never generated. It becomes shareable at the learner's choice; it does not become an input by default.
* `R-015`, ADR 0002 — untouched. Reading is not writing, and nothing generated is ever written into a learner's own field.
* `R-014` — the dataset is unchanged. Nothing new is stored; what changes is what may leave.

## Revisit when

* A hosted tier is proposed. `P-60` is then blocking, not deferred, and this ADR's §1 and §2 are the minimum rather than the design.
* Anyone proposes remembering the selection, defaulting it on, or widening it to the record. Each is a new decision and each undoes the reason this one is defensible.
* The pilot — or any real learner — writes something in a note that should never have been near an API. That is the event this design exists to make unlikely and cannot make impossible, and it is the trigger to ask whether the feature earns its risk at all.
