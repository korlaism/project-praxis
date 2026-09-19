# 02 · Misconceptions and Diagnostic Instruments

Why the first slice is force and motion, and what already exists that we should not rebuild.

**Verification status: unverified.** The items below are recorded from working knowledge and have **not** been checked against sources in this repository yet. Every entry needs confirmation of its claim, and several need confirmation that the effect size is what we think. Ticket `P-06` covers this. Treat nothing here as established until that ticket closes.

---

## Why force and motion

The first slice needs a topic where four things are simultaneously true. Force and motion is the only school topic where all four hold strongly:

1. **The misconceptions are documented, catalogued and validated.** Decades of work, with standard instruments built specifically around them.
2. **They are near-universal and deeply held.** Students arrive with a coherent, wrong, intuitively satisfying physics — closer to impetus theory than to Newton — and instruction routinely fails to displace it.
3. **The correct answer is counterintuitive and the demonstration is unambiguous.** Prediction is genuinely surprising, which is what makes commit-before-reveal do any work. Contrast with, say, photosynthesis, where the prediction is not interestingly wrong and the outcome is not visible.
4. **Outcomes are cheap to show correctly.** A ramp, two balls, a trolley. No simulation fidelity risk, no arguable results (`R-021`).

The fourth point is why this beats the engineering-undergraduate alternative that was considered and rejected in [ADR 0001](../decisions/0001-audience-and-first-slice.md). For third-year signals or thermodynamics there is no misconception corpus, and a generated simulator's correctness is itself a research problem.

## Instruments that already exist

To confirm under `P-06`. Each is a candidate source for the item bank (`R-020`) and the held-back transfer set (`R-022`).

| Instrument | What it is | Why it matters to us |
|---|---|---|
| **Force Concept Inventory (FCI)** — Hestenes, Wells & Swackhamer, ~1992 | Multiple-choice inventory on Newtonian mechanics. Distractors are *deliberately* the documented misconceptions. | The distractor design is the entire asset. Each wrong option is a pre-labelled error tag — exactly our taxonomy, already validated. |
| **Force and Motion Conceptual Evaluation (FMCE)** — Thornton & Sokoloff, ~1998 | Related instrument, heavier on graphical representation of motion. | Second source, and useful for near/far transfer separation. |
| **Hake (1998)** | Large multi-institution comparison of interactive-engagement vs traditional instruction using normalised gain. | Gives us the normalised-gain metric and a rough sense of the effect size a real intervention produces. Our 1.3× threshold in K-01 should be sanity-checked against it. |
| **Driver et al., _Making Sense of Secondary Science_** (~1994) | Catalogue of children's ideas across science topics. | Breadth beyond mechanics, for whichever topic comes second. |

**The strategic point: we are not authoring content.** The misconception corpus for school physics is better than anything we would write, it is free, and it comes with validated distractors. Our contribution is the *loop*, not the items. Any plan that starts with content authoring has misunderstood the project.

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
| **Productive failure** (Kapur, ~2008) | Failure *followed by* instruction beats instruction then practice | Medium-high, and load-bearing — see the tension below |
| **Self-explanation** (Chi et al., ~1989) | Explaining to oneself produces gains over passive study | High — justifies `R-012` |
| **ICAP** (Chi & Wylie, ~2014) | Interactive > Constructive > Active > Passive engagement | Medium — useful framing, weaker as evidence |
| **Hypercorrection effect** (Butterfield & Metcalfe) | High-confidence errors are corrected *better* once revealed | Medium, and the best support we have for `R-003` |

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
* **Our own `R-002` and `R-005`** — that per-learner error signatures are stable, and that calibration is trainable in this age band. The literature establishes that misconceptions are systematic *across* learners. Per-learner stability is our extrapolation, and calibration training in 11–15 year olds is, as far as we have looked, unevidenced. These are the two claims the pilot exists to settle, and the two that must not be stated as established anywhere outside this repository.
