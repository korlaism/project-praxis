# Start Here — Project Praxis

Interactive learning built on prediction, mistakes and calibration.

**Phase 0 — validation. No product code.** The output of this phase is evidence, not software: a six-week cohort run on the thinnest possible instrument, measuring whether the core loop moves delayed transfer retention and calibration. If it does not, see [Kill Criteria](spec/05-kill-criteria.md).

---

## The one-paragraph thesis

Before AI, explanation and feedback were scarce, and almost every institution we have — lectures, textbooks, grading — is machinery for rationing them. Both are now approximately free. What becomes scarce instead is *productive struggle*: the prediction made before the answer is known, the mistake noticed, the confusion held long enough to be resolved. Every one of those is a desirable difficulty, and a helpful chatbot removes all of them. So the opportunity is not an AI that explains well — that is a commodity shipping in every product this year. It is an environment that **manufactures difficulty and consequence**, and casts AI as examiner, adversary and lab technician rather than as explainer.

## The loop

The entire product, such as it is, is six steps:

| # | Step | What the learner does | What the system does |
|---|------|----------------------|----------------------|
| 1 | **Provocation** | Meets a phenomenon or a broken thing — never a topic | Selects it to bait a known weak structure |
| 2 | **Commit** | States a prediction **and a confidence number**, before seeing anything | Locks it. This is the highest-value data in the system |
| 3 | **Encounter** | Runs it, breaks it, watches it | Shows the real outcome |
| 4 | **Reconcile** | Explains the gap in their own words | Interrogates: mechanism, what would have to be true, what next |
| 5 | **Compress** | Writes one card, their words | Stores it as their canonical claim, with dependencies |
| 6 | **Re-encounter** | Meets the same idea in new clothes, later | Spaces, interleaves, generates variants |

Step 2 is the load-bearing one. Everything else is in service of having an honest, timestamped record of what this person believed before they found out.

## What is decided

| ADR | Decision | Status |
|-----|----------|--------|
| [0001](decisions/0001-audience-and-first-slice.md) | Ages 11–15, force and motion, six weeks | Accepted |
| [0002](decisions/0002-ai-never-writes-in-the-notebook.md) | AI never writes in the learner's notebook | Proposed |
| [0003](decisions/0003-bait-error-signatures.md) | Bait error signatures; do not reduce difficulty | Proposed |
| [0004](decisions/0004-teacher-mediated-cohort.md) | Teacher-mediated cohort, not direct-to-learner | Proposed |

Three of four are **Proposed**, not Accepted. They are the design stances the pilot exists to test, written down so that changing our minds later is visible rather than quiet.

## Reading path

**If you have five minutes:** this document, then [Kill Criteria](spec/05-kill-criteria.md).

**If you are deciding whether this is worth building:** [Problem Statement](spec/01-problem-statement.md) → [01 · The Economics Flip](research/01-the-economics-flip.md) → [Kill Criteria](spec/05-kill-criteria.md).

**If you are building the pilot:** [Phase 0 Requirements](spec/02-requirements.md) → [Pilot Design](spec/03-pilot-design.md) → [Data Model](spec/04-data-model.md).

**If you want the evidence base:** [Domain Map & Reading Path](research/00-domain-map.md).

## Repository layout

```
spec/        What we are building and why it would count as working
research/    Evidence, prior art, and the arguments against us
decisions/   ADRs — one per settled question
tools/       sync-outline.py and its manifest. Not documentation.
```

Markdown on disk is the source of truth. Outline is a published, mobile-readable mirror — **never edit a document in Outline and expect it to survive the next sync.**

```bash
source ~/.config/homelab/env
python3 tools/sync-outline.py --dry-run
python3 tools/sync-outline.py
```

Tickets live in Vikunja as `P-NN`. A ticket with no open PR is not finished, however green its tests are.
