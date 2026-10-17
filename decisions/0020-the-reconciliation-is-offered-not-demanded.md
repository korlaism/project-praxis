# ADR 0020 · The Reconciliation Is Offered, Not Demanded

**Date:** 2026-10-17 **Status:** Accepted **Tickets:** P-92 **Rests on:** judgment
**Relates to:** [ADR 0002](0002-ai-never-writes-in-the-notebook.md), [ADR 0014](0014-the-reveal-cues-before-it-explains.md), [ADR 0018](0018-expertise-reversal-applies-to-the-cue.md), `R-012`, `R-014`, `R-015`, K-03, K-06

## Context

`R-012` has been in the requirements since the first draft and had never been built: *"After reveal, the learner writes the gap in their own words, free text, **before moving on**. Minimum length enforced."*

It is not a minor field. It is the part of the design closest to the evidence that actually supports it — self-explanation (Chi, Bassok, Lewis, Reimann & Glaser, 1989, on worked mechanics examples) and the scaffolded correction that won in Kleider-Tesler et al. [ADR 0013](0013-split-r005-transfer-is-exploratory.md) records that we arrived at it before the evidence rather than from it, which makes it luck rather than design, but it is still the strongest-supported thing in the product after the gate.

Building it forces a question the requirement's own wording assumes away.

**"Before moving on" has no referent in the lab.** `R-012` was written for the Phase 1 instrument — spec/02's scope is explicit: *"a six-week cohort on the thinnest viable instrument… No app."* On a worksheet, in a room, with a teacher, "before moving on" is a real constraint. In the lab there is no sequence to be held back from: the hub is a list, the learner picks what they like, and after the reveal **nothing is being withheld**.

**A block with nothing behind it is theatre.** `R-010`'s gate has teeth because there is something on the other side of it — the outcome, which does not exist in the page until a commit exists. A reconciliation gate has nothing on the other side. Its only power is over a learner who stayed, and the escape is to close the tab, which is the one exit that leaves no record. It would train precisely the behaviour K-03 is about.

**K-06 is live.** *"Being wrong on purpose, repeatedly, with a record kept, is an emotionally loaded design."* A compulsory writing box, presented to a child in the seconds after being told they were wrong, with a counter refusing to let them leave, is a strong candidate for the thing that criterion exists to catch. [ADR 0018](0018-expertise-reversal-applies-to-the-cue.md) took the same shape of decision three weeks ago and named the trigger: *"Anyone proposes making the cue mandatory, for any reason. That is the trigger, and it is worth refusing on this ground alone."*

## Decision

**Build the box. Do not build the block. Record whether it was written.**

**1 · It is offered on every reveal, and it blocks nothing.** The learner can ask again, change the setup, or leave with the box untouched. No control is disabled by an empty box.

**2 · It arrives where ADR 0014 put it** — after the outcome, after the cue, after the retry, with the explanation. Never beside an unanswered cue, where it would be a third thing competing with the two that matter.

**3 · A minimum length is enforced on what can be filed,** as `R-012` requires, and it is a floor rather than a bar. Twelve characters, trimmed: enough that a stray keypress or a single shrug cannot be filed, few enough that *"Air resistance."* is a complete answer. The number is arbitrary and is written down as arbitrary. **Nothing machine-grades the content** — spec/03 puts commit degeneracy (K-03) in a human auditor's hands and says explicitly that it is *not inferred*.

**4 · Written once, never edited.** A second thought is a new attempt, which is a new card, exactly as a retry is ([ADR 0014](0014-the-reveal-cues-before-it-explains.md), `R-014`). A reconciliation that could be rewritten after reading the explanation would file a post-hoc account as a first reckoning, which is what the gate exists to keep out of the record.

**5 · Nothing but the learner writes in it.** No placeholder sentence, no suggestion, no completion, no pre-fill — `R-015` and [ADR 0002](0002-ai-never-writes-in-the-notebook.md). A sentence sitting in the box is a sentence to agree with, and agreeing is not reconciling.

**6 · The lab only, not the landing.** [ADR 0017](0017-desktop-first-with-a-gated-phone-landing.md) makes the phone page a channel funnel that keeps the gate, not the instrument. Typing a reflection on a phone, arriving from a short video, is a different act and would mostly produce the text K-03 is about. A landing card simply carries no reconciliation, and its absence is visible in the data rather than inferred from it.

**What replaces the enforcement is the measurement.** The card says whether the gap was written and when. That turns "do learners do this when not forced?" from an assumption into a number the pilot reports — which is worth more than a compliance rate obtained by refusing to let a child leave.

## Requirements addressed

* `R-012` — built, with the *before moving on* clause deliberately not implemented. The requirement's note is amended to say so; this ADR is the reason.
* `R-014` — the reconciliation is stored with its own timestamp, because how long after the reveal it was written is part of the dataset.
* `R-015` — nothing generated is ever written into the field, and the test asserts the box stays empty across render cycles.

## Alternatives rejected

### Block the next scenario until the gap is written

The literal reading. Rejected on K-06 and on enforceability: the only learner it binds is one who already intended to stay, and the way out is to close the tab — which removes them from the dataset entirely rather than recording a skip. It also makes the product's second mechanic feel like a toll, four seconds after telling a child they were wrong.

### Block only "Ask again", not leaving

Softer, and genuinely implementable. Rejected because it punishes exactly the learner we want — the one who wants another go immediately — and because "Predict again" (the retry, which comes before this box) is the control that actually matters for a second attempt. The gain is a few more notes of likely-degenerate text; the cost is making the eager learner the one who gets stopped.

### Prompt with a sentence stem to make writing easier

"I thought ___ would happen because ___." Tempting, and it would raise the write rate. Rejected under `R-015` and ADR 0002: a stem is text we wrote appearing in the learner's own field, and the completion it invites is shaped by our grammar rather than their reasoning. If the write rate turns out to be the problem, this comes back as a decision with data behind it.

### Machine-score the reconciliation for degeneracy

Rejected on spec/03, which commits K-03 to hand audit and says it is not inferred. A classifier here would also be a model writing a judgement about a child into a record the child can see, which is the next thing after writing in the notebook itself.

## Consequences

**Costs.** The write rate is now an open empirical question rather than a design guarantee, and it may be low. `R-012`'s contribution to any retention result becomes correlational — learners who write are plausibly different from learners who do not, and the pilot analysis must say so rather than comparing them as if assigned.

**Makes harder later.** If a hosted version ever syncs notebooks, this field is the one that makes that a consent conversation rather than a configuration change. It holds a child's own prose about their own mistakes, and K-06 already says a persistent record of those is a hazardous artefact.

**Buys.** A number where there was an assumption, and a mechanic that cannot be experienced as punishment on the day it ships.

## Revisit when

* The pilot reports the write rate. Below roughly a third, the enforcement question comes back — with data, and with the sentence-stem alternative above as the first thing to try, not the block.
* Anyone proposes making the box compulsory. Same standing as ADR 0018's cue trigger: it is worth refusing on this ground alone, and if it is overridden, K-06's affect measures are the thing to watch.
* `R-012` is ever asked to carry a causal claim. It cannot, under this design, and nothing may be Accepted resting on one.
