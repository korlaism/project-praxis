# 05 · Generation Spike — Twenty Scenarios Through the Checks

**Run 2026-09-19.** Satisfies `P-45`. The number ADR 0007 said would accept or reject it.

**Read the caveat first.** No model API key was available, so the candidates were written by the same agent that wrote the primitives. **This is an upper bound, not the real number.** A model given only the schema and the primitive documentation would do worse, and finding out how much worse is `P-50`.

---

## The result

| | Unaided | After one automatic repair |
|---|---|---|
| All twenty | **13/20 — 65%** | 19/20 — 95% |
| circular-release | 5/5 | 5/5 |
| contact-collision | 5/5 | 5/5 |
| **two-pucks** | **3/10** | 9/10 |

**ADR 0007 asked for roughly 90% unaided. It got 65%, so the ADR stays `Proposed`.** A note on why that criterion may have measured the wrong thing is below, kept *alongside* the original rather than replacing it — the working agreement is explicit that criteria written before a run do not get edited after it.

## What the number hides

Ten of the twenty were **parameter-independent**: no setting of string length or truck mass changes the answer to "which way does it fly" or "which pushes harder". They pass trivially and inflate the rate.

The informative subset is `two-pucks`, where the parameters genuinely decide the answer — a push below `μmg` means both pucks die, a push above it means one runs away. That subset scored **3/10 unaided**, which is the honest measure of whether a generator can reason about a scenario it is configuring.

## The failures, which were more useful than the passes

**Six schema failures, one root cause.** The generator used a template that hardcoded `errorTags` for `needs`, `same` and `both`, then varied which of those was `correct`. Whenever the correct answer was one of the three, its tag collided with it.

This is exactly the generator failure mode worth designing against: **reusing a template and failing to reconcile it with what varied.** All six were caught before anything ran, by the cheapest check there is, and the error message named the repair precisely:

```
errorTags tags "both", which is the correct answer — a tag names the
wrong belief behind a WRONG option
```

One mechanical repair pass fixed all six without touching a single `correct` value.

**One answer failure, and it is ours, not the generator's.**

```
params        {"push":2,"friction":0.05,"u":2}
claimed       runaway
classify      null
puck A        started 2 -> ended 0.463 m/s
puck B        started 2 -> ended 12.996 m/s
```

With a strong push and light friction, B leaves the track while A is still slowing. The run stops there, so A has neither held its speed nor come to rest, and `classify` cannot say what happened.

The defect is in the primitive, not the scenario: **`two-pucks` declares `done` before its outcome is determinate.** That yields a design rule worth applying to every primitive — *done means the outcome is classifiable* — and it is `P-48`.

## The number that actually decides it

**Escape rate: 0/20.** Not one incorrect or unclassifiable scenario passed all the checks.

That is the property the verification harness exists for. Its job is not to make a generator accurate; it is to make a wrong scenario **unshippable**. On that measure the architecture works, and it works at the cheapest possible layer — six of seven failures never reached a simulation.

Whether that is sufficient to accept ADR 0007 is a judgement for the owner, and deliberately not one this document makes on its own authority.

## What this changes

1. **Validation errors must be repairable by machine.** They already name the fix, and one automated pass took 65% to 95%. A generate→validate→repair loop is clearly worth building before a generate-once pipeline.
2. **Every primitive owes a determinate `done`.** `P-48`.
3. **The pass rate should be reported per-primitive**, because parameter-independent scenarios flatter the total.
4. **The real number is still unknown.** `P-50` runs this with a model that has not seen the primitives.


---

## Revision after `P-48` (2026-09-19)

Fixing the termination defect changed a number in this document, so the change is recorded rather than quietly applied.

**The repaired batch moved from 19/20 to 18/20.** That is not a regression — it is the old classifier having been wrong.

Candidate 14 (`push 0.5, friction 0.1`) previously passed as `needs`. Kinetic friction there is `μmg = 0.4905 N` against a push of `0.5 N`, so the pushed puck gains speed very slowly while the other stops. The old classifier lumped that into `needs` because it only asked whether B had *slowed*; the new one measures both fates and correctly reports `outruns`.

So one of the original passes was false, and the corrected figure is **18/20 after repair, 0/20 escape rate**. The escape rate — the number the architecture actually turns on — is unchanged.

Both remaining failures are now the same honest case: parameters that produce `outruns`, an outcome the scenario's option list does not offer. That is the scenario being unaskable with those options, not the simulation being wrong.


## P-51 · The loop, measured (2026-09-22)

`P-45` reported "one mechanical repair pass reached 95%". Building the loop properly and
re-running the same twenty candidates gives a different and lower number.

| | |
|---|---|
| Unaided | **13/20 (65%)** — unchanged |
| After repair | **18/20 (90%)** |
| Attempts needed | 1× for 13, **2× for 5** |
| Stuck | 2, both `simulation produced "outruns", which is not one of the options` |
| Answers changed by a repair | **0** |

**Why 90% and not 95%.** The two stuck candidates produced an outcome nobody offered. Reaching
95% means adding the missing option — writing a distractor nobody chose the wording of. The
loop refuses to do that, and refusing is the right answer: a repair pass that invents content
is a generator with extra steps.

**Why five candidates needed two passes.** Correcting an answer exposes a misconception tag
that now sits on the correct option, which the first pass could not see because the answer was
still wrong. That is the case for a loop rather than a single pass, and it was the ticket's
premise.

**The number that actually matters is the last row.** A repaired answer makes an item
self-consistent, never sensible — the question may no longer ask about the thing the new answer
answers, and no check can see that. Zero today because every answer failure was refused rather
than repaired. When a real generator is plugged in (`P-50`), that count is the review queue.
