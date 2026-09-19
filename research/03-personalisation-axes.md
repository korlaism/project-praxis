# 03 · Personalisation Axes and the Shared-Context Tension

What "personalised" should mean when every learner has AI access, and what it must not mean.

## The axis everyone builds, and why it is the least interesting

Adaptive difficulty and pacing. Get an item wrong, receive an easier one; get it right, move faster. Every adaptive learning product does this, it will be table stakes within a year, and it is **pointed the wrong way** for our purposes.

Reducing difficulty on struggle optimises for the feeling of progress. The desirable-difficulties literature says the target is a success rate somewhere around 75–85% — high enough to sustain effort, low enough that retrieval is effortful. Above that band, the learner is being entertained. Systems that back off on failure reliably push learners above it.

Our inversion ([ADR 0003](../decisions/0003-bait-error-signatures.md)): hold the success rate in the band, and **choose which failures happen** — concentrating them on the learner's own named weak structures. Personalised difficulty *selection*, not reduction.

## The axes worth building

**1 · Personal analogy base.** Explain the new thing in terms of what *this* person already knows deeply — cricket, cooking, Carnatic rhythm, their own code, chart geometry. This is the one thing a generic tutor structurally cannot do and an AI with your history can. It is currently squandered everywhere.

**2 · Error-signature targeting.** As above. Requires `R-002` to hold, which is what Phase 1 tests.

**3 · Goal-conditioned depth.** The same concept at four resolutions depending on whether it is a passing curiosity, a tool you will use, something you will teach, or something you will extend. Crucially, the **learner declares the intent** — the system does not infer it. Inferring produces the familiar failure where a moment's curiosity gets you enrolled in a course.

**4 · Register and language.** Fluid code-switching, with technical terms preserved in English inside an explanation in Hindi, Tamil or Telugu. This is how bilingual learners actually think, it is served by essentially nobody, and for an India-first product it may be the single largest unfair advantage available. Worth a spike of its own.

**5 · When to break the simplification.** Some learners need the clean lie first — Bohr model, then the truth. Others want the mess immediately and feel patronised by the ladder. That is a genuine pedagogical choice and it is personalisable; it is also almost never exposed.

**6 · Constraint fit.** Twelve-minute commute slots versus three-hour lab blocks. Dyslexia. Low bandwidth. A shared family phone (see `R-016`). Accessibility *is* personalisation, and it is the axis most likely to decide whether the product works in an Indian school at all.

Explicitly **not** an axis: learning styles / modality preference. No empirical support. It will be requested by nearly everyone we speak to about personalisation and the answer is no.

## Tension one: shared context is a feature

If every learner's path is perfectly individualised, a cohort loses its common ground. No shared struggle, no "did you get question four either", no culture, no one to explain it to. That common ground is not incidental — it is where peer explanation, social stake and belonging come from, and it is the thing a lonely adaptive-courseware product conspicuously lacks.

The design answer is **personalised route, shared destination**:

* Everyone converges on the same milestone problems and the same public artefacts.
* Common experiences are **scheduled**, not left to chance — the weekly mistake session is exactly this, and it is why it is a hard requirement (`R-034`) rather than a nice-to-have.
* Individual variation lives in the route, the analogy base and the baiting — not in the destination.

Maximum personalisation is not the goal. Optimal personalisation is, and the optimum is well short of total.

## Tension two: the peer is irreplaceable, and AI will tempt us to remove them

Explaining to a confused human. Being wrong in front of people whose opinion you care about. Having your argument attacked by someone under no obligation to be nice. None of that is substitutable, and all of it is exactly what gets designed out when a product can serve one learner perfectly at zero marginal cost.

The correct move is to spend the windfall on **more** human contact, not less. The teacher's role shifts away from explaining — now a commodity — toward directing attention, setting stakes and holding the culture. That is a better job and a harder one, and it is a claim we should be honest is a claim: K-05 exists because teachers may simply not want it.

## Tension three: motivation gets worse, not better

If the machine can do the task, the instrumental case for learning it collapses. The honest answers:

* You cannot supervise what you cannot do — and supervision is what most work becomes.
* Taste and judgment come only from having made things badly first.
* Competence is genuinely pleasurable, independent of its usefulness.

All three are real and none is self-executing. They have to be designed for, which argues hard for **a visible portfolio of things you made and mistakes you outgrew**, over a score. A learner who can see their own calibration curve improve has evidence of growth that a grade cannot give them and that an AI cannot hand them.

## What Phase 1 tests, and what it does not

Phase 1 implements **none** of this. Personalisation is the thesis, and the pilot tests its precondition — that error signatures exist and are stable (`R-002`) — through *analysis of the dataset*, not through a feature.

This is worth restating because it is the most likely place to waste a year: the personalisation engine is the interesting thing to build and it is worthless if `R-002` is false. Build the measurement first.

**Open question not addressed by Phase 1:** expertise reversal. If guidance that helps novices harms experts, error-signature baiting may be right for a struggling learner and counterproductive for a strong one. Named here so it is a known gap rather than a Phase 2 surprise.
