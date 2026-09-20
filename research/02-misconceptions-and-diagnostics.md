# 02 · Misconceptions and Diagnostic Instruments

Why the first slice is force and motion, and what already exists that we should not rebuild.

**Verification status: verified 2026-09-20 (`P-06`).** Every source here was checked; full citations and corrections live in [Resources Index](06-resources.md). Three things verification changed, and they are set out below: the FCI's items cannot be published, Kapur's sample is older than our audience, and the calibration claim is riskier than "unevidenced" suggested.

---

## Why force and motion

The first slice needs a topic where four things are simultaneously true. Force and motion is the only school topic where all four hold strongly:

1. **The misconceptions are documented, catalogued and validated.** Decades of work, with standard instruments built specifically around them.
2. **They are near-universal and deeply held.** Students arrive with a coherent, wrong, intuitively satisfying physics — closer to impetus theory than to Newton — and instruction routinely fails to displace it.
3. **The correct answer is counterintuitive and the demonstration is unambiguous.** Prediction is genuinely surprising, which is what makes commit-before-reveal do any work. Contrast with, say, photosynthesis, where the prediction is not interestingly wrong and the outcome is not visible.
4. **Outcomes are cheap to show correctly.** A ramp, two balls, a trolley. No simulation fidelity risk, no arguable results (`R-021`).

The fourth point is why this beats the engineering-undergraduate alternative that was considered and rejected in [ADR 0001](../decisions/0001-audience-and-first-slice.md). For third-year signals or thermodynamics there is no misconception corpus, and a generated simulator's correctness is itself a research problem.

## Instruments that already exist

*Every source named below is registered in [Resources Index](06-resources.md) with its verification status; this section keeps the argument for using them.*

To confirm under `P-06`. Each is a candidate source for the item bank (`R-020`) and the held-back transfer set (`R-022`).

| Instrument | What it is | Why it matters to us |
|---|---|---|
| **Force Concept Inventory (FCI)** — Hestenes, Wells & Swackhamer, ~1992 | Multiple-choice inventory on Newtonian mechanics. Distractors are *deliberately* the documented misconceptions. | The distractor design is the entire asset. Each wrong option is a pre-labelled error tag — exactly our taxonomy, already validated. |
| **Force and Motion Conceptual Evaluation (FMCE)** — Thornton & Sokoloff, ~1998 | Related instrument, heavier on graphical representation of motion. | Second source, and useful for near/far transfer separation. |
| **Hake (1998)** | Large multi-institution comparison of interactive-engagement vs traditional instruction using normalised gain. | Gives us the normalised-gain metric and a rough sense of the effect size a real intervention produces. Our 1.3× threshold in K-01 should be sanity-checked against it. |
| **Driver et al., _Making Sense of Secondary Science_** (~1994) | Catalogue of children's ideas across science topics. | Breadth beyond mechanics, for whichever topic comes second. |

**The strategic point stands, with one correction.** The misconception corpus is better than anything we would write, and our contribution is the *loop*. But the corpus and the instrument are not the same thing: **the FCI is password-protected and restricted to verified educators**, who agree to keep it secure so the items do not leak and lose their validity.

So the division is: **build on the documented misconceptions, which are published openly; do not publish the instruments' items.** The channel needs items of our own written against those misconceptions — which is authoring, and `R-020` currently says the opposite. The parked pilot can use the real instrument through a teacher, which is exactly how it is meant to be used. `P-58`.

## Mechanisms the loop is betting on

Each needs a source confirmed under `P-06`. The confidence column is our assessment of how safe the bet is, not a finding.

| Mechanism | Claim | Our bet |
|---|---|---|
| **Predict–observe–explain** (White & Gunstone, ~1992) | Committing a prediction before observing improves conceptual change | High — this is the direct ancestor of our loop |
| **Testing effect / retrieval practice** (Roediger & Karpicke, ~2006) | Retrieval beats restudy for delayed retention | High — among the most replicated findings in the field |
| **Generation effect** (Slamecka & Graf, ~1978) | Self-generated answers are retained better than read ones | High |
| **Spacing** (Cepeda et al. meta-analysis, ~2006) | Distributed practice beats massed | High |
| **Interleaving** (Rohrer & Taylor, ~2007) | Mixed practice beats blocked, despite feeling worse | High, and relevant to week 6 |
| **Desirable difficulties** (Bjork & Bjork, ~2011) | Encoding costs buy retention; ease is a false signal | High — the framing of the whole project |
| **Productive failure** (Kapur, 2008) | Failure *followed by* instruction beats instruction then practice | Verified, and load-bearing. **His sample was 11th-graders** — several years older than our audience, which the pilot should not gloss over |
| **Self-explanation** (Chi et al., ~1989) | Explaining to oneself produces gains over passive study | High — justifies `R-012` |
| **ICAP** (Chi & Wylie, ~2014) | Interactive > Constructive > Active > Passive engagement | Medium — useful framing, weaker as evidence |
| **Hypercorrection effect** (Butterfield & Metcalfe, 2001) | High-confidence errors are corrected *better* once revealed | Verified, and better than we thought: **Metcalfe & Finn (2012) show it in children specifically.** Caveat: high-confidence errors can return after a week |

The hypercorrection effect is worth flagging as the most interesting one for us. If high-confidence errors correct best, then capturing confidence is not merely measurement — it identifies which mistakes are the highest-value teaching moments. That is a genuine product mechanic and it falls out of one extra tap.

## The tension we must not paper over

**Kirschner, Sweller & Clark (2006), "Why Minimal Guidance During Instruction Does Not Work"** argues that discovery and problem-based learning are reliably beaten by explicit instruction and worked examples, especially for novices — who by definition lack the schemas needed to interpret their own failure. Adjacent: Sweller's cognitive load theory, the worked example effect, and the expertise reversal effect (guidance that helps novices *harms* experts).

Taken straight, this is an argument that our design will produce confused children who learn wrong models.

Our position, to be defended or abandoned under `P-06`:

* We are not proposing discovery learning. The learner is not asked to *derive* Newtonian mechanics. They are asked to **commit a prediction about a specific phenomenon**, which costs seconds, and then they are shown the answer.
* Kapur's productive failure addresses exactly this sequence and finds failure-then-instruction superior. Our loop is that sequence.
* The consequence is a hard design constraint: **steps 3 and 4 — reveal and reconcile — are mandatory and must be good.** A loop that stops at "you were wrong" is precisely what Kirschner et al. correctly criticise.

Also genuinely unresolved: **expertise reversal cuts against our own personalisation thesis.** If guidance that helps a novice harms an expert, then baiting error signatures (`R-003`) may be right for a struggling learner and actively counterproductive for a strong one. Phase 1 does not test this. It should be a named open question, not a surprise in Phase 2.

## Things we are citing that we should be careful about

* **Bloom's "2 sigma" (1984)** — the claim that one-to-one tutoring produces a two-standard-deviation gain. Enormously cited in edtech pitch decks, and the effect size is contested; the original studies were small and the result has not replicated at that magnitude. **Do not use this number in any external material.**
* **Learning styles** — no support. Will be suggested by anyone we talk to about "personalisation". Personalisation axes in this project are analogy base, error targeting, goal-conditioned depth and register — never modality preference. See [03 · Personalisation Axes](03-personalisation-axes.md).
* **Our own `R-002` and `R-005`.** Per-learner stability of error signatures remains our extrapolation — the literature establishes that misconceptions are systematic *across* learners, not within one.

  `R-005` was recorded as the riskier of the two on a search that `P-07` has since found incomplete. The corrected picture:

  * **In band, positive, thin.** DiGiacomo & Chen (2016), grades 6–7, *n*=30, randomised against a delayed-treatment control: calibration accuracy improved. Kleider-Tesler, Prior & Katzir (2019), ninety 10th-graders, three online sessions: calibration improved in the best condition.
  * **Meta-analytic, supportive, with the moderator against us.** Gutierrez de Blume (2022): 56 effect sizes, 7,667 participants, *g* = −.565 [−.639, −.491] for learning-strategy instruction on monitoring accuracy — **larger for adult-only samples**.
  * **The earlier negative results stand**, and they sit in much younger children than ours.
  * **Transfer has nothing behind it at any age.** None of the above tested transfer to another topic. Split out as `R-035`, exploratory, by ADR 0013.

  **The finding that matters most is not about age.** Kleider-Tesler et al. compared performance feedback, performance *plus calibration* feedback, and performance feedback with scaffolding — a cue to correct the wrong answer. **Scaffolded correction won, especially for weaker comprehenders.** Telling a learner their confidence was miscalibrated was not what worked. `R-012` — write the gap in your own words — is the part of our design closest to that, which we did not arrive at from this evidence. `P-70`.

  `K-04` remains the pivot most likely to trigger, and now fires on `R-005` alone.
