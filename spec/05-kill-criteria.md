# Kill Criteria

**Status:** Draft, 2026-09-18. Not yet agreed.

Written before the pilot runs, because criteria written afterwards are rationalisations. Each is a condition that, if met, stops the project or forces a named pivot. No condition here is soft.

## Hard kills

**K-01 · The loop does not beat the control on delayed transfer.**
If the treatment arm's normalised gain on held-back FMCE/FCI-derived transfer items at two weeks is not at least 1.3× the control arm's, the core mechanic does not work and no amount of product polish saves it. Immediate post-test scores do not count — they measure the wrong thing and will look good regardless.

**K-02 · Error signatures are not stable.**
`R-002` predicts a learner's mistakes cluster into a small number of persistent, nameable patterns. If, after six weeks, per-learner error clusters have no more internal consistency than chance reassignment of the same errors across learners, the personalisation thesis is dead. The loop might still be worth something as a generic prediction-practice tool, but the defensible part is gone.

**K-03 · Prediction-first is behaviourally unenforceable.**
If more than ~30% of commits are visibly degenerate — empty, copy-pasted, obviously reverse-engineered from a peer or an AI — then the constraint the whole design rests on cannot be held in a real classroom, and everything downstream is measuring noise.

## Pivot triggers

**K-04 · Calibration does not move.**
`R-005` is ours and unproven. If Brier scores do not improve, the calibration story goes in the bin but the retention story may survive. Pivot: drop confidence capture from the product narrative, keep it as internal telemetry only.

**K-05 · Teachers will not carry it.**
If the weekly mistake session does not survive contact with a real teacher's week — if it is skipped, rushed or resented — then [ADR 0004](../decisions/0004-teacher-mediated-cohort.md) is wrong. Pivot to direct-to-learner, and accept that the consequence and social-stake problems return unsolved and much harder.

**K-06 · Children experience the loop as punishment.**
Being wrong on purpose, repeatedly, with a record kept, is an emotionally loaded design. If cohort affect measurably degrades — withdrawal, anxiety, attrition above ~20% — the mechanic is right and the framing is wrong. Pivot to failure-as-comedy and remove the persistent error record from the learner's own view before touching anything else.

## Non-criteria

These will be tempting to treat as failure and are not:

* **Low engagement in week one.** The loop is deliberately harder than what it replaces. Desirable difficulty feels bad before it feels good.
* **Learners disliking it relative to a chatbot.** They will. Fluent explanation feels like learning; this will feel like work. Preference is not a signal here and should not be collected as one.
* **Immediate quiz scores.** Expected to be flat or slightly worse in the treatment arm. That is what the literature predicts and is not evidence against us.
