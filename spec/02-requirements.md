# Phase 1 Requirements

**Status:** Draft, 2026-09-18. Not yet agreed.
**Scope:** Phase 1 = a six-week cohort run on the thinnest viable instrument, plus the analysis. No app, no accounts, no infrastructure. Requirement ids are stable and never reused. ADRs cite them.

A requirement whose **Source** column is blank is a guess and is marked as one.

---

## 1. The falsifiable claims

These are the reason the phase exists. Each maps to a kill criterion.

| # | Requirement | Source | Kill |
|---|-------------|--------|------|
| `R-001` | Commit-before-reveal (prediction + confidence) beats matched content without it on **delayed** transfer retention at two weeks, by ≥1.3× normalised gain. | Predict-observe-explain; testing effect; generation effect — see research/02 | K-01 |
| `R-002` | Per-learner errors cluster into ≤6 stable, nameable signatures with internal consistency above chance reassignment. | *Guess.* Misconception catalogues establish that errors are systematic **across** learners; per-learner stability is our extrapolation. | K-02 |
| `R-003` | Deliberately baiting a learner's named signature beats routing around it. | *Guess.* Hypercorrection effect is suggestive, not sufficient. | — |
| `R-004` | Logged confusion is resolved more often than unlogged confusion. | Self-explanation and metacognitive monitoring literature | — |
| `R-005` | Calibration (Brier) improves measurably in six weeks in ages 11–15, and transfers beyond force and motion. | *Guess, and the riskiest one.* `P-06` found calibration improves with **age** unaided, but that **feedback-based calibration training repeatedly failed** in younger children (kindergarten, first grade, 7–8). Nothing found in the 11–15 band. Adjacent evidence is mixed-to-negative, not silent. | K-04 |

## 2. The instrument

| # | Requirement | Notes |
|---|-------------|-------|
| `R-010` | A learner can be shown a phenomenon and **cannot see the outcome** until a prediction and a confidence value are submitted. | The single load-bearing constraint. If it can be bypassed, the phase measures nothing — see K-03. |
| `R-011` | Confidence is captured on every prediction, on a scale a 12-year-old uses honestly. | Not a percentage. Candidate: 4-point "guessing / leaning / fairly sure / certain", mapped to probabilities server-side. |
| `R-012` | After reveal, the learner writes the gap in their own words, free text, before moving on. | Minimum length enforced; quality not machine-graded in Phase 1. |
| `R-013` | One-tap confusion logging, available at every step, never blocking. | Must cost under two seconds or it will not be used. |
| `R-014` | Every prediction, reveal, reconciliation and confusion entry is stored with a timestamp and the item id. | The dataset *is* the deliverable. |
| `R-015` | No AI-generated text is ever written into a learner's own notebook fields. | See ADR 0002. |
| `R-016` | The instrument works on a low-end shared Android phone over intermittent 3G. | *Guess* at the constraint — must be confirmed against the actual pilot cohort's devices before build. |

## 3. Content

| # | Requirement | Notes |
|---|-------------|-------|
| `R-020` | 30 prediction items covering force and motion, each with a documented misconception as its intended bait. | Drawn from published diagnostic instruments, not authored fresh. |
| `R-021` | Each item's outcome is demonstrable — physical demo, video, or simulation — and unambiguous to a naive viewer. | An item whose result is arguable is a broken item. |
| `R-022` | A held-back transfer set of 10 items, same concepts, different surface, never seen during the six weeks. | This is the actual measurement. Kept out of the treatment content entirely. |
| `R-023` | Items are tagged with concept, intended misconception, and difficulty. | Enables the clustering that `R-002` is tested on. |

## 4. The cohort

| # | Requirement | Notes |
|---|-------------|-------|
| `R-030` | Two arms: treatment (full loop) and control (same content and contact time, no commit step). | Without the control, K-01 is unfalsifiable. |
| `R-031` | Minimum 24 learners per arm. | *Guess.* Needs a power calculation against expected effect size before recruitment — this number is currently vibes. |
| `R-032` | Teacher-mediated: a named teacher runs both arms and the weekly mistake session. | See ADR 0004. |
| `R-033` | Guardian consent obtained in writing before any data is collected; no learner data leaves the pilot dataset. | Non-negotiable. Minors. |
| `R-034` | A weekly 30-minute session where a learner presents a **mistake**, not a success. | The culture-setting move and the cheapest source of social stake. |

## 5. Explicit non-requirements for Phase 1

Named so they do not creep in:

* No accounts, auth, or user management.
* No AI in the loop at all. Phase 1 runs on human-authored items and a spreadsheet. The AI-generated variants, the interrogation step, the error-signature clustering — all Phase 2, all gated on `R-001` and `R-002` holding.
* No knowledge graph. Not needed to test the loop, and building it first is the most likely way to waste a year.
* No simulators. `R-021` is satisfiable with video and a physical demo.
* No personalisation. It is the thesis, but it is tested by the *analysis* of Phase 1 data, not implemented in Phase 1.
