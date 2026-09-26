# Generated Scenarios — Architecture and Feasibility

**Status:** Draft, 2026-09-19. Not yet agreed.
The technical assessment behind [ADR 0007](../decisions/0007-generated-scenarios.md). Satisfies `P-39`.

---

## The idea

A learner names a subject or a question. The system generates an interactive scenario on demand — to explain, to test, or to play with — rather than serving one of a fixed set someone authored in advance. They take snapshots, write in their own words in a per-subject notebook, and what they write is later interrogated.

This is a better architecture than the one we have been building, and it reframes work already done rather than discarding it:

| Built so far | What it was | What it becomes |
|---|---|---|
| `components/*.mjs` | Our authoring convenience | **The vocabulary a model composes at runtime** |
| `harness/lab.js` | A template for hand-written topics | **A runtime contract** |
| The three topics | The product | **Reference implementations that define the spec** |

It also makes `P-31` — extracting the components properly — considerably more important than it looked.

## The decision that makes it feasible: generate the spec, not the physics

There are two tiers, and conflating them is how this fails.

**Tier 1 — parameterised scenarios over verified primitives.** The model emits JSON against a constrained schema: which primitive, what parameters, the question, the options, which is correct, the explanation. The physics is ours, written once, tested once, exact.

```json
{ "primitive": "circular-release",
  "params": { "r": 1.4, "omega": 2.2 },
  "question": "…", "options": [...], "correct": "tangent",
  "explain": "…" }
```

The harness already consumes almost exactly this shape. **This is reliable today.**

**Tier 2 — generated simulation code.** The model writes `setup`, `step` and `draw` itself. Far more expressive, and where the real difficulty lives.

Tier 1 first. Tier 2 only behind the verification described below.

## The hard problem is verification, not generation

Getting a model to emit a plausible simulation is easy and largely solved. Getting one that is *physically correct* is the entire engineering problem, and in an education product a confidently wrong simulation is worse than no simulation at all. [04 · Open Source Landscape](../research/04-open-source-landscape.md) already commits us to this: a simulation that quietly violates conservation while teaching conservation is a defect.

Four checks, in increasing order of how much they buy:

**1 · Runtime invariants.** Run the scenario headlessly for N steps before a learner ever sees it. Reject on NaN, unbounded growth, positions leaving the world, or energy and momentum drifting outside tolerance. Cheap, mechanical, catches most generated nonsense.

**2 · Closed-form oracles.** We already write these — `elasticCollision1D`, `positionUnderConstantForce`, `stoppingDistance`. Any generated scenario reducing to a known case is checked against the exact answer. This is why the primitives carry their own analytic solutions, and it is worth keeping that discipline for every primitive added.

**3 · Property and limit checks.** Symmetry, dimensional consistency, and behaviour at the limits: as μ→0 nothing ever stops; as m₂→0 the heavy body is unaffected; reversing the spin reverses the tangent. Several of these are already unit tests and generalise directly.

**4 · The answer check — the one that matters most.** Run the scenario. Observe what actually happens. Assert that the option marked `correct` is what occurred, and that every distractor did *not* occur.

That fourth check closes the loop on the single largest risk in AI-generated education content: a confidently stated answer that is wrong. It is mechanically decidable because we control the simulation, and **no amount of model quality substitutes for it.**

## Notebook evaluation

Per-subject notebooks. A snapshot is a scenario spec plus a seed plus a timestamp — small, replayable, and cheap to store precisely *because* we generate specs rather than code.

What AI does with notebook entries is bounded by [ADR 0002](../decisions/0002-ai-never-writes-in-the-notebook.md), which is unchanged and now matters more, not less:

* **Allowed:** interrogate an entry, ask for the mechanism, find contradictions with what the learner wrote earlier, cross-link, generate variants that bait the same error, quiz.
* **Never:** author or rewrite the learner's own words.

The interesting capability falls out of persistence: *"You wrote in March that heavier things fall faster. Does this survive?"* That is the examiner role from the founding thesis, and it is the part AI is genuinely suited to.

## The check that cannot be written

Every check in this document asks whether an item is **self-consistent**: does the schema hold, does the run settle, is the stated answer what happened. None of them asks whether the item is **any good**, and there is one failure mode worth naming because it passes everything.

**An item is broken if the misconception it baits produces the correct answer.**

The case that found this: two pucks on a rough floor with nothing pushing either of them. The simulation says `both` — they slow and stop. A learner who believes *things naturally stop* also answers `both`, and is marked right. The item rewards the belief it was built to expose, and every automated check passes it, because nothing here is wrong.

It cannot be machine-checked. Knowing that a distractor happens to coincide with the truth means knowing what the distractor is *for*, which is the authoring judgment the checks exist to free up, not replace. `P-51`'s repair loop is silent on it too — it can make an item self-consistent, never sensible.

So it is a rule for whoever writes an item, stated where they will read it: **after choosing the correct answer, check what each wrong belief would predict. If one of them predicts the right answer, the parameters are wrong, not the wording.**

**And sometimes there is no wording that saves it.** `P-79` went looking for the balanced case in `two-pucks` — the push tuned to cancel friction exactly, so the pushed puck holds its speed while the other slows. It is the most valuable configuration in the whole concept, because it is the one situation where *a force keeps it moving* is visibly true, which is precisely why the belief is so hard to shift.

It cannot be an item. Whatever the question asks, a learner holding the misconception predicts that the pushed puck keeps its speed, and is marked right. Saying so in the note does not help: with the balance stated, the correct reasoner and the mistaken one give the same answer for different reasons, and the gate only records the answer.

The architecture is the constraint. Options are outcomes, so an item can ask *what happens* and never *why*. The balanced case belongs in an explanation, or in a learner's own experimenting, and the primitive can still produce it for both. It does not belong in the bank.

## Honest risks

| Risk | Severity | Handling |
|---|---|---|
| Generated physics is subtly wrong | **High** — fatal to trust | The four checks above; Tier 1 until they are proven |
| Coverage limited to primitives we build | Medium | Mechanics is cheap; chemistry and biology are not — research/04 found chemistry simulation tooling barely exists |
| Generated `draw()` is ugly or off-canvas | Medium | The harness renders known primitives; Tier 2 draws only inside a viewport it is given |
| Tier 2 code execution | Medium | Web Worker, no DOM, no network, step budget. Sandboxing is the *easy* part; correctness is not |
| Latency and cost per scenario | Low | One model call; cache by spec hash |
| The model ignores the schema | Low | Constrained decoding, validate and reject |

## What would settle this

A spike, not an argument. Generate twenty scenarios across the three existing primitives, run every one through the four checks, and count how many pass without human intervention. If Tier 1 lands above roughly 90%, the architecture is real. If the answer check fails often, that is the most important number in the project and we should know it early.
