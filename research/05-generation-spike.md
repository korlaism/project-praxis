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


## P-50 · The split that changes how the number reads (2026-09-29)

Two of the four primitives are **parameter-independent**: no setting of their controls changes
the answer. `circular-release` always produces `tangent`; `contact-collision` always produces
`equal`. That is exactly the lesson those concepts teach — and it means a generator writing an
item for them can be right without working anything out.

Splitting P-45's twenty candidates on that line:

| | |
|---|---|
| Unaided, all twenty | 13/20 (65%) |
| Where the answer cannot vary | **10/10 (100%)** |
| Where it must be derived | **3/10 (30%)** |

The split is computed by `reachableOutcomes()`, which sweeps each primitive's control grid and
collects what comes out, so nothing here rests on judgement about which primitives are "easy".

**What it means.** The generator was perfect at the half of the task where being right requires
nothing, and failed seven times out of ten where it requires deriving an outcome from
parameters. A single pass rate over all four primitives will always read better than the
generator deserves, and every future spike should report both lines.

**The fresh-model run is still unrun.** `OPENAI_API_KEY` is present and authenticates, but its
project has access to `text-embedding-ada-002` only: every chat model returns 403. The harness
is built and inspectable — `node tools/generate-spike.mjs --prompt` prints exactly what would
be sent, and nothing else leaves the machine.


## P-50 · A model that has not seen the primitives (2026-10-02)

Run against **qwen2.5:7b**, locally through Ollama, given the contract and nothing else: the
schema rules, each primitive's controls, and its declared outcomes. No source, and deliberately
not the list of *reachable* outcomes, which for two primitives is the answer key.

| | |
|---|---|
| Scenarios returned | 20 |
| **Unaided pass rate** | **0/20 (0%)** |
| Omitted `schema: 1` | 20/20 |
| Invented option ids (`together_outcome` for `together`) | 20/20 |
| Params outside a control's range | 3/20 |
| Stated answer matching the simulation | 0/20 |

**Forgiving the invented ids entirely** — which the real system must never do, because an option
id that is not an outcome cannot be scored — 8/20 answers match:

| | generous | in-house (`P-45`) |
|---|---|---|
| Where the answer cannot vary | 6/10 (60%) | 10/10 (100%) |
| Where it must be derived | 2/10 (20%) | 3/10 (30%) |
| `two-pucks` | **0/5** | 3/10 |

### What this does and does not establish

**A 7B local model cannot do this task.** Not marginally — it failed every item on format alone,
and on the two primitives whose answer is the same at every setting it still only reached 60%
after being forgiven. That is a floor, as intended, and it is a low one.

**It says nothing about a frontier model.** The question ADR 0007 turns on is unchanged.

**It is partly a measure of the prompt, and that is a flaw in this harness.** The contract is
described in prose with no worked example. Every format failure — the missing `schema` field,
the invented ids — is the kind a single example object would likely have prevented. Until that
is tried, the 0/20 cannot be attributed cleanly to the model.

**The repair loop would not rescue it.** `P-51` refuses to invent an option, and 20/20 candidates
need exactly that. The one failure mode the loop handles well — a tag on the correct answer —
did not appear at all, because the model emitted empty `errorTags` throughout.

**The most interesting number is `two-pucks` at 0/5.** It is the primitive with the richest
outcome space, where the answer genuinely depends on comparing a push against friction. Nothing
about the contract tells a model how to do that arithmetic, and it did not.


## P-50 · The run that measured something (2026-10-14)

The first attempt scored 0/20 and measured the prompt as much as the model. Three harness
corrections later — a worked example, one primitive named per call, and duplicate ids
discarded — qwen2.5:7b produced **13 unique scenarios from 20 calls**.

| | |
|---|---|
| **Unaided pass rate** | **5/13 (38%)** |
| Format failures (schema, ids, params) | **none** |
| Answer-check failures | 8/13 |

| | qwen2.5:7b | in-house (`P-45`) |
|---|---|---|
| Where the answer cannot vary | **5/6 (83%)** | 10/10 (100%) |
| **Where it must be derived** | **0/7 (0%)** | 3/10 (30%) |

Per primitive: `circular-release` 2/2 · `contact-collision` 3/4 · `two-pucks` **0/4** · `free-fall` **0/3**.

### The finding

**A worked example removed every format failure.** No missing `schema`, no invented option ids,
no out-of-range params — the three that accounted for the entire first run. Whatever else is
true, the contract is teachable.

**The model cannot derive an outcome. Zero for seven.** It is competent where the answer is a
fixed property of the phenomenon — a cut string flies along the tangent, a collision is equal —
and it fails every single time the answer depends on comparing a push against friction, or a
mass against air resistance. That is the half of the corpus the whole architecture exists to
generate, and on it this model scores nothing.

### What the harness conceded, so the comparison is read correctly

Three changes were made to get any measurement at all, and each makes the task **easier** than
the one `P-45`'s in-house batch faced:

1. **A worked example.** `P-45` had none.
2. **One primitive named per call.** Left to itself the model wrote `circular-release` seven
   times out of seven — the parameter-independent one — and the derived half went unmeasured.
3. **One scenario per call.** It returns a single object however many are requested.

So 38% is generous, and 0/7 is the honest figure under generous conditions.

### What it does not settle

Nothing about a frontier model. ADR 0007's bar is ~90% unaided and both measured generators are
far below it, but a 7B model failing to compare two numbers is weak evidence about what a large
one would do. That run still needs a key.

### The gate now runs in the learner's browser (P-96, ADR 0023)

The product composes scenarios at runtime from the learner's own endpoint, and every check in
this file now runs **in the page** before anything is shown: schema, primitive, params,
completion, invariants, and the answer check. Nothing that fails is rendered.

Two things keep this file honest about what ships:

* `buildPrompt` moved to `lab/scenario/prompt.mjs`, so **the prompt measured here is the prompt
  the product sends**. A topic is appended when there is one; built without a topic it is
  byte-identical to what produced the numbers above.
* `verify()` moved to `lab/scenario/verify.mjs`. One implementation, used by the offline harness
  and the browser alike — two would drift, and the one that drifted would be the one nobody was
  measuring.

The numbers above still stand and still describe a 7B model. What changes is the consequence: a
generator that fails the derived half now produces **nothing on screen** rather than something
plausible and wrong, and the learner is told how many were thrown away.

### The frontier run was attempted on 2026-10-17 and could not start

`P-90` is blocked, not forgotten. The only model credential on this machine is an
`OPENAI_API_KEY` whose project has access to `text-embedding-ada-002` and nothing else —
`gpt-4o-mini` and `gpt-4.1-mini` both answer `403 … does not have access to model`. No chat
completion is possible with it, so no measurement was taken and **nothing in this file changes**.

What the attempt did produce is `P-94`. The ticket for `P-90` says *"the harness is ready and the
provider is a seam"*, and the seam was fine while the loop around it was not: the default batch
path called the provider with no `try`/`catch`, so a single `429` or `500` part-way through ended
the process, and the transcript was only written after the loop — losing every reply already paid
for. Against a local ollama that cost a retry; against a paid endpoint it costs money, twice. It
is fixed, and the run is now one command whenever a key with chat access appears.

### The measurement base, after `P-91`

Both primitives the spike scored 0/7 on are mechanics, which leaves the finding ambiguous: is a
generator bad at deriving an answer, or bad at pucks? `P-91` adds two maths primitives — `line-pair`
and `quadratic-roots` — chosen so that **every outcome is reachable and the controls decide the
answer**. Three outcomes each, no setting that makes the question vacuous:

| Primitive | Outcomes | Decided by |
|---|---|---|
| `line-pair` | one-point / parallel / same-line | whether `m1 = m2`, then whether `c1 = c2` |
| `quadratic-roots` | two / one / none | the sign of `b² − 4ac` |

Six primitives then, four of them on the derived side. **`P-97` makes it eight and six**, adding
`limiting-reagent` (which reactant runs out first) and `sealed-jar` (what a fizzing reaction
weighs with the lid on or off) — the first primitives in this repository that are neither things
moving nor lines on a grid, which ADR 0007 named as the hard part.

| Primitive | Outcomes | Decided by |
|---|---|---|
| `limiting-reagent` | a / b / neither | which pile permits fewer reactions, `⌊a/needA⌋` against `⌊b/needB⌋` |
| `sealed-jar` | same / lighter | whether the gas can leave |

`P-98` adds computing, and with it the two halves the vision asks for — algorithms and hardware:

| Primitive | Outcomes | Decided by |
|---|---|---|
| `search-race` | linear / binary / tie | the position wanted, against where a halving search looks |
| `cache-walk` | rows / same | whether the cache can hold a line per row |

**Ten primitives across four subjects, eight of them on the derived side.** The next run of the
spike therefore measures the hard half across four subjects rather than one, and a per-subject
split will say whether 0/7 was about mechanics or about derivation.

This changes nothing about what has been measured. No generator has been run against the maths,
chemistry or computing primitives; the figures above stand exactly as they are until `P-90` or a
repeat of `P-50` is run.
