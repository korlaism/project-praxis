# Data Model — Prediction Card, Confusion Log, Error Signature

**Status:** Draft, 2026-09-18. Not yet agreed.
Satisfies `R-014`, `R-023`. Phase 1 implements this in a spreadsheet; the shape is specified now because the *dataset is the deliverable* and a badly shaped one cannot be re-collected.

## Prediction card

The atomic unit. One card is one pass through the loop.

| Field | Type | Written by | Notes |
|-------|------|-----------|-------|
| `card_id` | id | system | |
| `learner_id` | id | system | Pseudonymous. No names in the dataset. |
| `item_id` | id | system | → item bank |
| `shown_at` | timestamp | system | |
| `prediction` | text | **learner** | Free text. Never pre-filled, never suggested. |
| `confidence` | enum(4) | **learner** | guessing / leaning / fairly sure / certain |
| `committed_at` | timestamp | system | Reveal is impossible before this exists — `R-010` |
| `outcome_correct` | bool | marker | Human-marked in Phase 1 |
| `reconciliation` | text | **learner** | The gap, in their words — `R-012` |
| `error_tag` | enum | marker | From the taxonomy below. Blank if correct. |
| `degenerate` | bool | auditor | Empty, copied, or reverse-engineered — feeds K-03 |

Three fields are written by the learner and by nobody else, ever. That is [ADR 0002](../decisions/0002-ai-never-writes-in-the-notebook.md), and it is a data-model constraint rather than a UI preference precisely so that it survives contact with a product manager.

## Item bank

| Field | Type | Notes |
|-------|------|-------|
| `item_id` | id | |
| `concept` | enum | force / falling / reaction / circular / friction |
| `intended_misconception` | enum | The bait — `R-020` |
| `difficulty` | 1–5 | Author estimate, revised from observed pass rate |
| `outcome_medium` | enum | demo / video / sim |
| `transfer_set` | bool | True = held back, never shown during the six weeks — `R-022` |
| `transfer_distance` | enum | near / far. Classified blind, before the run. |

## Confusion log

Deliberately almost empty. A field that costs more than two seconds will not be filled — `R-013`.

| Field | Type | Notes |
|-------|------|-------|
| `entry_id` | id | |
| `learner_id` | id | |
| `logged_at` | timestamp | |
| `context` | id | Card or item in view when logged, if any |
| `text` | text, optional | **Optional on purpose.** A tap with no words is still the signal. |
| `resolved_at` | timestamp, nullable | Set when the learner says so — not when a teacher decides — `R-004` |

The optionality matters. The value of this object is not its content; it is that confusion becomes a legitimate, countable, addressable thing instead of a private feeling. Requiring an articulation defeats it, because the learners who most need it are exactly the ones who cannot yet say what they do not understand.

## Error taxonomy

Phase 1 uses a fixed starting taxonomy for force and motion, drawn from the published misconception catalogues. `R-002` is the claim that per-learner distributions over these tags are stable and clustered; the tags themselves are not our invention.

| Tag | The wrong belief underneath |
|-----|------------------------------|
| `motion-implies-force` | Movement requires a force in the direction of travel |
| `heavier-falls-faster` | Mass determines rate of fall |
| `bigger-pushes-harder` | The larger body exerts the greater force in an interaction |
| `outward-in-circles` | Circular motion involves an outward force |
| `things-naturally-stop` | Rest is the default state; motion is the thing needing explanation |
| `force-is-stored` | An object carries a quantity of "push" that depletes |
| `special-case-reasoning` | Generalising from one vivid instance |
| `sign-or-direction` | Mechanics correct, direction inverted |
| `boundary-ignored` | Right in general, wrong at the limits |

The last three are structural rather than topical, which is the interesting part: if `R-002` holds, those are the tags expected to persist when the learner moves to a different subject entirely. That, and not the physics, is where the personalisation thesis lives.

## Error signature

Not stored in Phase 1 — **computed in analysis.** Written down here because the shape of the analysis determines what the pilot must capture.

A learner's signature is their distribution over error tags, weighted by the confidence held at the time. A high-confidence wrong answer carries far more information than a low-confidence one, and plausibly corrects better once challenged. Phase 2 would name the top two or three tags back to the learner and bait them deliberately ([ADR 0003](../decisions/0003-bait-error-signatures.md)); Phase 1 only has to prove the signature exists.

## Privacy

Minors, so the defaults invert. Pseudonymous ids, no names in the dataset, guardian consent before any collection (`R-033`), no third-party processing, no data leaves the pilot set, and the raw error record is **not** exposed to the learner's peers or to their parents. K-06 exists because a persistent record of a child's mistakes is a genuinely hazardous artefact and has to be designed as one.
