# Pilot Design — Six Weeks, Force and Motion

**Status:** Draft, 2026-09-18. Not yet agreed.
Satisfies `R-030`–`R-034`. Read [Phase 0 Requirements](02-requirements.md) first.

## Shape

Two arms, same teacher, same content, same contact time. The only difference between them is the commit step.

| | Treatment | Control |
|---|---|---|
| Sees the phenomenon | Yes | Yes |
| **Predicts before reveal** | **Required** | No — sees outcome directly |
| **States confidence** | **Required** | No |
| Sees outcome | Yes | Yes |
| Writes the explanation | Yes | Yes |
| Confusion log | Yes | Yes |
| Weekly mistake session | Yes | Yes |

Holding everything but the commit step constant is what makes `R-001` a real test rather than an evaluation of enthusiasm. It is tempting to give the treatment arm more — variants, AI interrogation, a nicer interface — and every addition destroys the experiment.

## Week by week

| Week | Content | Instrument |
|------|---------|-----------|
| 0 | Baseline. FCI/FMCE-derived pre-test, both arms. Guardian consent complete. | Paper or form |
| 1 | Motion without force — constant velocity, the "moving means pushed" bait | 5 items |
| 2 | Falling — mass and rate, the heaviest single misconception | 5 items |
| 3 | Action and reaction — the "bigger thing pushes harder" bait | 5 items |
| 4 | Circular motion — the outward-force bait | 5 items |
| 5 | Friction and inertia — the "things naturally stop" bait | 5 items |
| 6 | Interleaved re-encounter. Everything, in disguise, mixed order. | 5 items |
| +2wk | **Delayed transfer test.** Held-back set, `R-022`. Both arms. | 10 items |

The two-week delay is the measurement. A post-test in week 6 would show the control arm doing fine or better, which is exactly what the spacing literature predicts and exactly why immediate testing has misled a generation of edtech pilots.

## The weekly mistake session

Thirty minutes. One learner presents a mistake they made — what they predicted, how sure they were, what actually happened, what they now think. Not a success. Not a correct answer.

This is the cheapest and most important part of the whole design, and it is free. It does four things nothing else does:

* Makes being wrong **socially survivable**, which is the precondition for honest prediction.
* Supplies the **consequence** that a low-stakes app cannot manufacture — peers are watching, and peers are a real stake in a way a score is not.
* Gives the teacher a live read on where the cohort actually is.
* Produces the cultural artefact that makes the thing spread, if it spreads.

If this session gets skipped, the pilot is not running. It is the first thing to check when results look flat.

## What gets measured

**Primary — decides K-01:**
Normalised gain on the held-back transfer set at two weeks, treatment vs control.

**Secondary:**
* Brier score trajectory per learner across six weeks (`R-005`, K-04).
* Error cluster stability per learner (`R-002`, K-02) — computed in analysis, not shown to anyone during the pilot.
* Confusion log entries: rate, and resolution rate (`R-004`).
* Commit degeneracy rate (K-03) — hand-audited, not inferred.

**Affect, because K-06 depends on it:**
Weekly one-question check, and attrition. Deliberately not a satisfaction survey — see the non-criteria in [Kill Criteria](05-kill-criteria.md).

## What could invalidate the run

Listed now so they are watched for rather than discovered in the analysis:

* **Teacher effect swamps arm effect.** Same teacher on both arms controls for teaching quality but not for enthusiasm asymmetry — the teacher will prefer one arm. Mitigation: the teacher does not know which claim is being tested, and does not see the running results.
* **Control contamination.** Treatment learners talk to control learners about the predictions. Likely. Mitigation: arms drawn from different class sections if at all possible; contamination logged if not.
* **Item quality confounds.** A badly written item produces errors that are about the wording, not the physics. Mitigation: `R-021`, and every item piloted on three learners outside the cohort first.
* **The transfer set is not actually transfer.** If held-back items are too close in surface form, the result overstates. Mitigation: a second pair of eyes classifies each held-back item as near or far transfer before the run, blind to the treatment content.
