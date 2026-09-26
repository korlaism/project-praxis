# Reading List

For you, not for the project. Seven things worth your time, in the order to read them, with what to take from each — and two to skip.

The full register of everything cited is [Resources Index](06-resources.md). This is the short, opinionated cut.

**All verified** as of 2026-09-20 — citations, years and the claims we lean on were checked (`P-06`). What follows is what to take from each, not homework.

---

## Read these, in this order

### 1 · Bjork & Bjork — *Making Things Hard on Yourself, But in a Good Way* (~2011)
**Twenty minutes. Start here.** A short chapter, not a paper, and it is the frame for the entire project: the things that make learning feel easy are the things that stop it sticking. Everything Praxis does — withholding the answer, spacing, interleaving, baiting — is one of the difficulties described here.

**Take:** the phrase "desirable difficulty", and the idea that your own sense of how well you are learning is an unreliable instrument.

### 2 · Kapur — *Productive Failure* (~2008)
**An afternoon.** Why letting someone fail *first* and explaining *after* beats explaining first. This is the sequence the loop implements, and it is the single most load-bearing citation we have.

**Take:** failure is not a substitute for instruction; it is what makes instruction land. That is why the reveal and reconcile steps are mandatory.

### 3 · Kirschner, Sweller & Clark — *Why Minimal Guidance During Instruction Does Not Work* (~2006)
**An afternoon. Read it because it argues against us.** It says discovery learning fails and explicit instruction wins, especially for novices who lack the schemas to interpret their own failure. Taken straight, it says Praxis produces confused children.

**Take:** the strongest objection, in its own words, so you can answer it without flinching. Our answer is #2 — but only if the explanation after the failure is genuinely good. If you ever find yourself shipping a loop that stops at "you were wrong", this paper is the reason it will fail.

### 4 · Hestenes, Wells & Swackhamer — *Force Concept Inventory* (~1992)
**An hour, skimming.** Do not read it as a paper; read the **questions**, and especially the wrong answers. Each distractor was built from a documented misconception, which is exactly our `errorTags`. This is the corpus that made "ages 11–15, force and motion" the right first slice.

**Take:** how a good distractor is written. It is the hardest craft in the whole product, and thirty years of work already exists.

### 5 · Hake — *Interactive engagement versus traditional methods* (~1998)
**An hour.** Six thousand students, one measure — normalised gain. It is where our 1.3× threshold in `K-01` comes from.

**Take:** a calibrated sense of what a real intervention achieves. The numbers: traditional courses gained 0.23, interactive-engagement courses 0.48 — about 2.1×. Our `K-01` bar of 1.3× is conservative against that, though Hake was comparing whole pedagogies and we are testing one mechanic.

### 6 · Roediger & Karpicke — the testing effect (~2006)
**An hour.** Retrieving something beats re-reading it, for durable memory. Among the most replicated findings in the field, and the reason the pilot measures delayed transfer rather than an immediate quiz.

**Take:** why the number that matters arrives two weeks later.

### 7 · Butterfield & Metcalfe — the hypercorrection effect
**An hour.** Errors made with **high** confidence are corrected best once revealed. If it holds, confidence is not just a measurement — it identifies which mistakes are the most valuable teaching moments available.

**Take:** the strongest argument that capturing confidence earns its one extra tap. Better than we thought — Metcalfe & Finn (2012) show hypercorrection **in children**. The caveat worth knowing: high-confidence errors can return after a week.

---

## If you want one more

**Driver et al. — *Making Sense of Secondary Science* (~1994).** A book, not an afternoon. Worth having on the shelf when you start writing items beyond mechanics: a catalogue of what children actually believe about science, gathered over decades.

## Skip these

**Bloom's "2 sigma" (1984).** You will meet it in every edtech pitch deck: one-to-one tutoring, two standard deviations. The effect size is contested and has not replicated at that magnitude. Knowing that is worth more than reading it — and we never cite it.

**Anything on learning styles.** No empirical support. Someone will ask you about it in the first ten conversations about personalisation; the answer is no, and the axes we do use are in [03 · Personalisation Axes](03-personalisation-axes.md).

## The gap worth knowing about

**Calibration training in 11–15 year olds — found, and it changed the claim.** `P-07` searched again and the picture is better and more specific than `P-06` recorded. Three worth your time, in this order:

1. **Kleider-Tesler, Prior & Katzir (2019)** — ninety 10th-graders, three online sessions, three feedback conditions. **Scaffolded correction beat telling learners their confidence was miscalibrated.** Read this one first: it is about what we should build, not just whether the claim survives.
2. **Gutierrez de Blume (2022)** — the meta-analysis, 56 effect sizes. Read the moderator table. The effect is real and **adults move more than children do**.
3. **DiGiacomo & Chen (2016)** — grades 6–7, *n*=30. The only in-band study found. Small, randomised, positive.

`R-005` is narrowed to the improvement claim and keeps `K-04`. Transfer became `R-035`, exploratory, because none of these tested it — ADR 0013.

**Access, as at `P-71`:** all three full texts are closed — no open-access copy, and the publishers refuse. The abstracts are read verbatim from ERIC and APA PsycNet, which is as far as anyone gets without a library or an email to the authors. Researchers usually send a PDF when asked, and **one question is worth the email**: in Kleider-Tesler et al., did calibration feedback fail outright, or merely do less well than scaffolding? ADR 0014 defers a real product decision on the answer.


## A lead, not a source

**"A cornerstone of adaptivity — a meta-analysis of the expertise reversal effect"** turned up while
working `P-18`. Only its title and that it exists are known: it has not been opened, its authors and
journal are unconfirmed, and nothing in this repository rests on it. Recorded here so the next person
looking at ADR 0018 knows there is probably a meta-analysis to read, and knows equally that **nobody
here has read it.**

If it says what its title suggests — that expertise reversal is the basis for adaptivity rather than an
objection to it — it strengthens ADR 0018's reading rather than upsetting it. That is a reason to check,
not a reason to assume.
