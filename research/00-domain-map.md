# Domain Map and Reading Path

Where the evidence for this project lives, and in what order to read it.

## Reading path

1. [01 · The Economics Flip](01-the-economics-flip.md) — the founding argument. Why free explanation broke learning and what became scarce instead. Read this first or nothing else makes sense.
2. [02 · Misconceptions and Diagnostic Instruments](02-misconceptions-and-diagnostics.md) — the evidence base, the existing instruments we should not rebuild, and the strongest argument against our design.
3. [03 · Personalisation Axes](03-personalisation-axes.md) — what personalisation should mean when everyone has AI, and the three tensions it creates.
4. [04 · Open Source STEAM Landscape](04-open-source-landscape.md) — what already exists, what we may legally ship, and why PhET is an asset rather than a competitor.
5. [Resources Index](06-resources.md) — everything cited or depended on, with verification status and licences.
6. [Reading List](07-reading-list.md) — the short, ordered cut worth reading, and two things to skip.

Then the spec: [Problem Statement](../spec/01-problem-statement.md) → [Phase 1 Requirements](../spec/02-requirements.md) → [Pilot Design](../spec/03-pilot-design.md).

## The five domains this project sits across

| Domain | What we need from it | Status |
|---|---|---|
| **Misconception research** | The error taxonomy. Force and motion specifically. | **Verified** (`P-06`). One constraint came with it: the instruments are restricted and cannot be published — `P-58` |
| **Memory and practice design** | Spacing, interleaving, retrieval, generation, desirable difficulties. | **Verified** (`P-06`). The strongest ground the project stands on |
| **Metacognition and calibration** | Confidence capture, Brier scoring, hypercorrection. | **Gap closed enough to split the claim.** In-band evidence exists and is positive but thin; a meta-analysis supports the field with **age moderating against us**. `R-005` narrowed, transfer split out as exploratory `R-035` — ADR 0013, `P-07` |
| **Instructional design counter-position** | Cognitive load, worked examples, expertise reversal, the Kirschner critique. | **Verified** (`P-06`); engaged in research/02, not dismissed |
| **India schooling context** | Board curricula, device reality, teacher workload, language mixing, who actually pays. | **Not started** — `P-08`, and the largest unexamined risk |

## The honest state of our evidence

**Strong ground.** That misconceptions are systematic and catalogued. That retrieval, spacing, interleaving and generation improve delayed retention. That prediction-before-observation aids conceptual change. That fluency of explanation is a poor cue for actual learning. Little of this is contested.

**Our own extrapolations, unproven.** That per-learner error signatures are *stable across topics* (`R-002`). That calibration is trainable in 11–15 year olds (`R-005`) and that improvement transfers (`R-035`, exploratory). That baiting a signature beats routing around it (`R-003`). These are the project, and the ones not to state as fact outside this repository.

Verification changed their standing relative to one another. `R-003` gained support — hypercorrection is demonstrated in children (Metcalfe & Finn, 2012). `R-005` was recorded as having lost it, and `P-07` found that reading incomplete in both directions: there **is** in-band evidence and it is positive, and there **is** a meta-analysis, whose age moderator runs against us. The transfer half had nothing behind it at any age and is now `R-035`, exploratory — ADR 0013.

**`R-002` is now the riskiest of the three**, by elimination rather than by new evidence: it is the one nothing has been found for, either way.

**Known gap, now reasoned through (`P-18`, ADR 0018).** Expertise reversal applies to the **cue**, not to error-signature baiting: the effect works by redundancy and so bites on guidance presented alongside the task, while baiting is selection. Phase 1 still does not test it — near-uniform novices — but it records the datum that would. See [03 · Personalisation Axes](03-personalisation-axes.md).

**Largest unexamined risk.** Not pedagogy — distribution. We have done no work on who buys this, what an Indian school's actual constraints are, or what a teacher's week has room for. The pedagogy could be perfect and the project still dead. `P-08`.
