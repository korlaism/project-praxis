# Working Agreement

**Status:** Draft, 2026-09-18.

How this project avoids the two ways it will otherwise fail: building the interesting thing before the necessary thing, and quietly moving the goalposts after the results come in.

## Against drift

**One ticket, one branch, one PR.** Nothing lands on the default branch directly. A ticket with no open PR is not finished.

**Phase 0 builds no product.** Every requirement in [Phase 0 Requirements](02-requirements.md) §5 is a non-requirement on purpose. The knowledge graph, the simulators, the AI interrogator and the variant generator are all more fun than running a cohort, and all of them are gated on `R-001` and `R-002` holding. If a branch starts to look like an application, it is the wrong branch.

**Findings become tickets, not inline fixes.** Anything surfaced mid-ticket — a defect, a wrong assumption, a better idea — gets its own ticket marked `needs-review` and is confirmed independently. The current ticket carries on.

**ADRs record what was settled, and say when they are not settled.** Three of the four current ADRs are `Proposed`, which is the honest status for a design stance the pilot exists to test. Promoting one to `Accepted` requires evidence, not a week passing.

## Against goalpost-moving

**[Kill Criteria](05-kill-criteria.md) were written before the run and do not get edited after it.** If a criterion turns out to be badly specified, that is recorded as a note *alongside* the original, not as a replacement for it.

**The primary measure is delayed transfer at two weeks.** Immediate post-test scores are expected to be flat or worse and are not evidence of anything. This is written down here because in week six there will be a number available that looks good, and the temptation to report it will be real.

**Learner preference is not collected as a success signal.** The loop is deliberately harder than a chatbot and will be liked less. See the non-criteria.

**The teacher does not see running results,** and does not know which claim is under test. Both arms are theirs; enthusiasm asymmetry is the largest uncontrolled variable in the design.

## On the source of truth

Markdown on disk. Outline is a mirror and the next sync overwrites anything edited there. Tickets in Vikunja as `P-NN`.

```bash
source ~/.config/homelab/env
python3 tools/sync-outline.py --dry-run
```

## On working with minors

Guardian consent in writing before any data collection, without exception (`R-033`). Pseudonymous ids throughout. The error record is not shown to peers or parents. If a choice arises between a cleaner dataset and a child's dignity, it is not a choice.
