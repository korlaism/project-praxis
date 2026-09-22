# Phase 1 Requirements

**Status:** Draft, 2026-09-18. Not yet agreed.
**Scope:** Phase 1 = a six-week cohort run on the thinnest viable instrument, plus the analysis. No app, no accounts, no infrastructure. Requirement ids are stable and never reused. ADRs cite them.

A requirement whose **Source** column is blank is a guess and is marked as one.

A claim marked **Exploratory** is one the phase measures but does not test: it maps to no kill criterion, and no ADR may be Accepted resting on it. `tools/check-docs.py` enforces the second half and `tools/claims.test.mjs` keeps the two lists in step.

---

## 1. The falsifiable claims

These are the reason the phase exists. Each maps to a kill criterion.

| # | Requirement | Source | Kill |
|---|-------------|--------|------|
| `R-001` | Commit-before-reveal (prediction + confidence) beats matched content without it on **delayed** transfer retention at two weeks, by ≥1.3× normalised gain. | Predict-observe-explain; testing effect; generation effect — see research/02 | K-01 |
| `R-002` | Per-learner errors cluster into ≤6 stable, nameable signatures with internal consistency above chance reassignment. | *Guess.* Misconception catalogues establish that errors are systematic **across** learners; per-learner stability is our extrapolation. | K-02 |
| `R-003` | Deliberately baiting a learner's named signature beats routing around it. | *Guess.* Hypercorrection effect is suggestive, not sufficient. | — |
| `R-004` | Logged confusion is resolved more often than unlogged confusion. | Self-explanation and metacognitive monitoring literature | — |
| `R-005` | Calibration (Brier) improves measurably in six weeks in ages 11–15. | Weak, and in-band. DiGiacomo & Chen (2016), grades 6–7, *n*=30, randomised with a delayed-treatment control: significantly higher **predictive/postdictive calibration accuracy**. Gutierrez de Blume (2022), 56 effect sizes, 7,667 participants, *g* = −.565, and **intervention duration did not moderate** — the nearest thing the "six weeks" half has to support. `P-71` found the age-moderator reading weaker than `P-07` recorded. See research/06. | K-04 |
| `R-035` | **Exploratory.** Improved calibration transfers beyond force and motion. | *Nothing found, in any age band.* Split out of `R-005` by [ADR 0013](../decisions/0013-split-r005-transfer-is-exploratory.md) because the evidence for the two halves is not the same evidence. Measured and reported; **no decision may rest on it** and no kill criterion fires on it. | — |

## 2. The instrument

| # | Requirement | Notes |
|---|-------------|-------|
| `R-010` | A learner can be shown a phenomenon and **cannot see the outcome** until a prediction and a confidence value are submitted. | The single load-bearing constraint. If it can be bypassed, the phase measures nothing — see K-03. |
| `R-011` | Confidence is captured on every prediction, on a scale a 12-year-old uses honestly. | Not a percentage. Candidate: 4-point "guessing / leaning / fairly sure / certain", mapped to probabilities server-side. |
| `R-012` | After reveal, the learner writes the gap in their own words, free text, before moving on. | Minimum length enforced; quality not machine-graded in Phase 1. Placed **after the cue and the retry** by [ADR 0014](../decisions/0014-the-reveal-cues-before-it-explains.md) — this is the part of the design closest to the scaffolded correction that the evidence supports, and we reached it before the evidence rather than from it. |
| `R-013` | One-tap confusion logging, available at every step, never blocking. | Must cost under two seconds or it will not be used. |
| `R-014` | Every prediction, reveal, reconciliation and confusion entry is stored with a timestamp and the item id. | The dataset *is* the deliverable. A **retry** under ADR 0014 is stored as its own record linked to the original — never as an edit of it. |
| `R-015` | No AI-generated text is ever written into a learner's own notebook fields. | See ADR 0002. |
| `R-016` | The instrument works on a low-end shared Android phone over intermittent 3G. | *Guess* at the constraint — must be confirmed against the actual pilot cohort's devices before build. |

## 3. Content

| # | Requirement | Notes |
|---|-------------|-------|
| `R-020` | 30 prediction items covering force and motion, each with a documented misconception as its intended bait. | ~~Drawn from published diagnostic instruments, not authored fresh.~~ **Amended by [ADR 0011](../decisions/0011-author-our-own-items.md):** authored by us *against* the documented misconceptions. The instruments are restricted and cannot be published (`P-06`); the misconceptions are open. |
| `R-021` | Each item's outcome is demonstrable — physical demo, video, or simulation — and unambiguous to a naive viewer. | An item whose result is arguable is a broken item. |
| `R-022` | A held-back transfer set of 10 items, same concepts, different surface, never seen during the six weeks. | This is the actual measurement. Kept out of the treatment content entirely — and **out of this repository**, which is public: publishing them destroys them exactly as publishing the FCI would. [ADR 0016](../decisions/0016-the-transfer-set-lives-in-a-private-repository.md) puts them in a private repository, still checked by the public answer check. Enforced: a scenario marked `heldBack` fails the build here. |
| `R-023` | Items are tagged with concept, intended misconception, and difficulty. | Enables the clustering that `R-002` is tested on. Enforced by `lab/scenario/bank.test.mjs`. Difficulty is an author's estimate until a cohort produces real numbers, and is recorded so it can be checked against them. |

## 4. The cohort

| # | Requirement | Notes |
|---|-------------|-------|
| `R-030` | Two arms: treatment (full loop) and control (same content and contact time, no commit step). | Without the control, K-01 is unfalsifiable. |
| `R-031` | Minimum 24 learners per arm. | *Guess.* Needs a power calculation against expected effect size before recruitment — this number is currently vibes. |
| `R-032` | Teacher-mediated: a named teacher runs both arms and the weekly mistake session. | See ADR 0004. |
| `R-033` | Guardian consent obtained in writing before any data is collected; no learner data leaves the pilot dataset. | Non-negotiable. Minors. [ADR 0015](../decisions/0015-the-record-stays-where-the-learner-is.md) turns this into a property rather than a promise: nothing is collected, and `lab/notebook/privacy.test.mjs` fails the build if that changes. |
| `R-034` | A weekly 30-minute session where a learner presents a **mistake**, not a success. | The culture-setting move and the cheapest source of social stake. |

## 5. Explicit non-requirements for Phase 1

Named so they do not creep in:

* No accounts, auth, or user management.
* No AI in the loop at all. Phase 1 runs on human-authored items and a spreadsheet. The AI-generated variants, the interrogation step, the error-signature clustering — all Phase 2, all gated on `R-001` and `R-002` holding.
* No knowledge graph. Not needed to test the loop, and building it first is the most likely way to waste a year.
* No simulators. `R-021` is satisfiable with video and a physical demo.
* No personalisation. It is the thesis, but it is tested by the *analysis* of Phase 1 data, not implemented in Phase 1.
