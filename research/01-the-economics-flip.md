# 01 · The Economics Flip — Why AI Breaks Learning By Default

The founding argument. Everything in [spec/](../spec/01-problem-statement.md) descends from this document.

## What was scarce, and what is now

Before AI, two things were scarce: **explanation** and **feedback**. Nearly every institution we have is machinery for rationing them. A lecture is one explainer amortised over three hundred listeners. A textbook is explanation made copyable. Grading is feedback rationed to whatever a marker can produce in an evening. Class size, terms, streaming, exams — all of it is downstream of those two costs.

Both have collapsed to roughly zero. Any learner with a phone has an infinitely patient explainer at any depth in any language, and immediate feedback on most things a school would ask.

The institutions have not noticed, but that is the boring observation. The interesting one is what became scarce *instead*:

| Newly scarce | Why |
|---|---|
| **Productive struggle** | The dominant strategy is now to ask. Asking is free and produces no learning. |
| **Trustworthy signal** | Every assessment we own measured a proxy — time spent struggling — that has decoupled from the output. |
| **Consequence** | Being wrong has never been cheaper or more frictionless to undo, and therefore less instructive. |
| **Motivation** | "You will need this" is now a whole lie for most of the curriculum. |

## The mechanism of the damage

This is not a general complaint about technology. It is specific, and it names a known mechanism.

Everything that makes learning durable is a **desirable difficulty** — a cost paid at encoding that buys retention later. Retrieving before reviewing. Generating your own answer before seeing one. Spacing rather than massing. Interleaving rather than blocking. Being wrong and noticing.

A fluent AI removes every single one, and removes them in the direction that *feels* best. Fluent explanation reliably produces the sensation of understanding without the substance — and the learner cannot tell the difference, because the sensation is the only instrument they have.

So the failure mode is not that students learn less. It is that **students learn less while feeling that they have learned more**, and no one — not them, not their teacher — holds a signal that distinguishes the two.

## Why the obvious products are the wrong products

Almost every AI education product shipping now is a better explainer: a tutor that adapts tone, pace and depth. That is the part that was already solved, and it is the part that does the damage. It is also undefensible — the explanation layer is a commodity that improves for free with each model release.

The windfall is somewhere else. What education has never been able to afford is **a consequence-bearing environment where being wrong is cheap, immediate, visible and instructive.** A school cannot let thirty children each break a different circuit, misjudge a collision and watch their own wrong model fail. It has never had the technician-hours or the equipment budget.

That constraint is gone. A working simulator — a reactor, a market, a metabolic pathway, a patient, a distributed system under partition — is now generatable on demand with the failure modes wired in. The marginal cost of letting someone break it is approximately zero, and **the failure is the content**.

Nobody is spending the windfall here. They are spending it on explanation.

## The design inversion

If struggle is the scarce good, the system's job is to manufacture it. Concretely:

**AI is cast as examiner, adversary and lab technician — almost never as explainer.** It asks for the mechanism. It asks what would have to be true. It generates the same idea in new clothes so that re-encounter is genuine rather than recognition. It builds the sandbox. It does not tell you the answer, because the answer is free everywhere else.

**The answer is withheld structurally, not by politeness.** A model that has been asked to be Socratic will fold the moment a learner pushes. The withholding has to live in the data model — a reveal that is *impossible* before a commit exists — which is why `R-010` is a hard requirement and not a UX guideline.

**Mistakes become first-class objects.** Not errors to be corrected and discarded, but records: what was predicted, how confident, what happened, what changed. Learners do not make random mistakes; they make *their* mistakes, and a system that names the recurring signature and baits it deliberately is worth more than any explanation engine.

**Confidence is captured everywhere.** It costs one tap and it converts every wrong answer into two pieces of information instead of one. It also makes possible the only genuinely transferable thing on offer here: teaching a person the shape of their own overconfidence.

## The honest counter-argument

The strongest objection is not "students prefer the chatbot." It is **Kirschner, Sweller and Clark (2006)**, who argue that minimally guided instruction fails, and that discovery learning is reliably beaten by explicit instruction and worked examples — particularly for novices, who lack the schemas to make sense of their own failure.

If that is right, "let them be wrong first" is a recipe for confusion, cognitive overload and the learning of wrong models.

The resolution — and the reason this project is viable rather than naive — is **Kapur's productive failure**: the sequence matters. Failure followed by instruction beats instruction followed by practice. The struggle is not a substitute for being taught; it is what makes being taught land. Which imposes a real constraint on the design: **the reveal and the reconciliation are mandatory, and must be good.** A loop that ends at "you were wrong" is precisely the thing Kirschner et al. are right about.

This tension is the central intellectual risk in the project and is tracked as such. See [02 · Misconceptions & Diagnostic Instruments](02-misconceptions-and-diagnostics.md).

## What follows for the notebook

If the learner's own statements are the asset, then one rule does all the work: **AI never writes in the notebook.** It may ask, challenge, index, cross-link, quiz and summarise its own side. The canonical claims are the learner's, in their words.

Break that and the system degenerates into reading your own model's output back to yourself, which feels like a knowledge base and is not one. Formalised as [ADR 0002](../decisions/0002-ai-never-writes-in-the-notebook.md), and enforced in the data model rather than the interface so that it survives contact with a roadmap.
