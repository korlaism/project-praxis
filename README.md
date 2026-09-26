# Start Here — Project Praxis

Interactive learning built on prediction, mistakes and calibration.

**Phase 0 — publish. Build the lab in public, one topic at a time.** Interactive tools for hard topics, each shipped as a recording of the tool being used, each independently valuable. No cohort, no consent apparatus, no study. See [Phase 0 · Publish](spec/00-publish-phase.md) and [ADR 0005](decisions/0005-channel-first.md).

| Phase | What it is | State |
|-------|-----------|-------|
| **0 · Publish** | Build the lab, put it in front of people, and make what a learner does **persist** | **Active** |
| **1 · Validate** | The six-week controlled cohort run, measuring delayed transfer and calibration | Parked — written, unchanged, blocked on a cohort |
| **2 · Build** | The notebook, the error signatures, the personalisation engine | Gated on `R-001` and `R-002` |

Phase 1 is **parked, not cancelled**: every document stands, and its tickets carry the `parked` label. It could not start — every path through it runs through recruiting a teacher — and it produced no artefact anyone could use. The alternative to validating is making, not envisioning.

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
| [0002](decisions/0002-ai-never-writes-in-the-notebook.md) | AI never writes in the learner's notebook | Accepted |
| [0003](decisions/0003-bait-error-signatures.md) | Bait error signatures; do not reduce difficulty | Accepted |
| [0004](decisions/0004-teacher-mediated-cohort.md) | Teacher-mediated cohort, not direct-to-learner | Accepted |
| [0005](decisions/0005-channel-first.md) | Build the lab in public, topic by topic | Accepted |
| [0006](decisions/0006-the-notebook-is-the-product.md) | The notebook is the product, the tools are the surface | Accepted |
| [0007](decisions/0007-generated-scenarios.md) | Scenarios are generated from verified primitives | Proposed |
| [0008](decisions/0008-licence-split.md) | MIT for the lab kit, AGPL-3.0 for the application | Accepted |
| [0009](decisions/0009-wrap-phet-where-it-exists.md) | Wrap PhET where it exists, build where it does not | Superseded by 0012 |
| [0010](decisions/0010-channel-youtube-shorts.md) | YouTube Shorts, one topic a fortnight | Accepted |
| [0011](decisions/0011-author-our-own-items.md) | Author our own items against the documented misconceptions | Accepted |
| [0012](decisions/0012-no-phet-author-our-own-simulations.md) | Author our own simulations — PhET is NonCommercial now | Accepted |
| [0013](decisions/0013-split-r005-transfer-is-exploratory.md) | Split R-005 — calibration improvement is a claim, transfer is exploratory | Accepted |
| [0014](decisions/0014-the-reveal-cues-before-it-explains.md) | The reveal cues the correction before it explains it | Accepted |
| [0015](decisions/0015-the-record-stays-where-the-learner-is.md) | The record stays where the learner is | Accepted |
| [0016](decisions/0016-the-transfer-set-lives-in-a-private-repository.md) | The held-back transfer set lives in a private repository | Accepted |
| [0017](decisions/0017-desktop-first-with-a-gated-phone-landing.md) | Desktop first, with a gated phone landing | Accepted |
| [0018](decisions/0018-expertise-reversal-applies-to-the-cue.md) | Expertise reversal applies to the cue, not to the bait | Accepted |

Sixteen accepted, one proposed, one superseded. Each declares `Rests on:` in its header: `0001`, `0002` and `0004` rest on **judgment** — directions chosen, whose consequences the pilot tests.

`0003` is the interesting one. It was accepted whole, then narrowed: only *difficulty is selected, not reduced* stands on judgment. Signature targeting, naming the signature back to the learner, and the 75–85% success band all depend on `R-002` and `R-003`, are still unproven, and are now explicitly deferred rather than decided. It also carries an unresolved conflict (`P-18`). `tools/check-docs.py` enforces this — an `Accepted` ADR resting on an unsettled claim fails the build.

## Reading path

**If you have five minutes:** this document, then [Phase 0 · Publish](spec/00-publish-phase.md).

**If you are deciding whether this is worth building:** [Problem Statement](spec/01-problem-statement.md) → [01 · The Economics Flip](research/01-the-economics-flip.md) → [Kill Criteria](spec/05-kill-criteria.md).

**If you are shipping a topic:** [Phase 0 · Publish](spec/00-publish-phase.md) → [02 · Misconceptions & Diagnostic Instruments](research/02-misconceptions-and-diagnostics.md).

**If you want where this is going:** [ADR 0006](decisions/0006-the-notebook-is-the-product.md) → [Generated Scenarios](spec/07-generated-scenarios.md) → [ADR 0007](decisions/0007-generated-scenarios.md) → [Open Source, With a Paid Hosted Version](spec/08-open-source-and-hosted.md).

**If you are building the pilot (parked):** [Phase 1 Requirements](spec/02-requirements.md) → [Pilot Design](spec/03-pilot-design.md) → [Data Model](spec/04-data-model.md).

**If you want the evidence base:** [Domain Map & Reading Path](research/00-domain-map.md).

## Repository layout

```
spec/        What we are building and why it would count as working
             00-publish-phase.md is the active phase; 01-06 are Phase 1, parked
             07-generated-scenarios.md is where this is heading
             08-open-source-and-hosted.md is how it will be shipped
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

**Licensing:** the lab kit is MIT, the application is AGPL-3.0-or-later — see [LICENSING.md](LICENSING.md) and [ADR 0008](decisions/0008-licence-split.md).

Tickets live in Vikunja as `P-NN`. A ticket with no open PR is not finished, however green its tests are.
