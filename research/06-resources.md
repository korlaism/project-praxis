# Resources Index

Everything this project cites or depends on, in one place. Sources used to be spread across a bibliography, a licence survey and an instruments section; this is the single registry, and those documents keep the argument while pointing here for the record.

**The rule:** a source enters this index in the same change that first cites it. Not later.

**Status:** **V** verified against the source · **U** recorded from working knowledge, unverified · **C** contested, verified as contested.
**`P-06` closed 2026-09-20: every entry below is verified.** Years, journals, volumes and the claims we lean on were checked; corrections are noted inline. Re-verify anything added from memory later — the rule in the working agreement exists for that.

For what is actually worth reading, and in what order, see [Reading List](07-reading-list.md).

---

## 1 · Papers and books

| Status | Source | Where it is used here |
|---|---|---|
| V | Hestenes, Wells & Swackhamer — *Force Concept Inventory*, **The Physics Teacher 30(3), 141–158, 1992** | The error taxonomy. Distractors were built from documented misconceptions and from distilling open-response answers; the paper carries a taxonomy of misconceptions. **This is what made "ages 11–15, force and motion" the right first slice** — ADR 0001's main reason, confirmed |
| V | Thornton & Sokoloff — *Assessing student learning of Newton's laws: the FMCE…*, **American Journal of Physics 66, 1998** | Second item source. Its questions were also developed from student interviews, open-ended responses and expert review |
| V | Hake — *Interactive-engagement versus traditional methods*, **American Journal of Physics 66(1), 64–74, 1998** | Normalised gain. **62 courses, 6,542 students: traditional ⟨g⟩ = 0.23±0.04, interactive engagement ⟨g⟩ = 0.48±0.14** — a ratio of about 2.1×. `K-01` asks for 1.3×, which is conservative against that, though Hake compares whole pedagogies rather than one mechanic |
| V | Driver, Squires, Rushworth & Wood-Robinson — *Making Sense of Secondary Science: research into children's ideas*, **Routledge, 1994** | Misconception catalogue beyond mechanics |
| V | White & Gunstone — *Probing Understanding*, **Falmer Press, 1992** | Predict–observe–explain, which they introduced: the direct ancestor of the commit-before-reveal gate |
| V | Roediger & Karpicke — *Test-enhanced learning*, **Psychological Science 17, 249–255, 2006** | **At a 5-minute delay, restudying beat testing; on delayed tests, testing won decisively.** This is the source for expecting flat or worse immediate scores, and for measuring at two weeks |
| V | Slamecka & Graf — *The generation effect*, **J. Exp. Psychol.: Human Learning & Memory 4(6), 592–604, 1978** | Five experiments, generated beats read across recall, recognition and confidence. Why the learner writes their own words (ADR 0002) |
| V | Cepeda, Pashler, Vul, Wixted & Rohrer — *Distributed practice in verbal recall tasks*, **Psychological Bulletin 132(3), 354–380, 2006** | 839 assessments across 317 experiments. The optimal gap grows with the retention interval |
| V | Rohrer & Taylor — ***The shuffling of mathematics practice problems boosts learning*, Instructional Science 35, 481–498, 2007** *(title and journal corrected)* | Interleaving **impaired practice-session performance yet doubled test scores a day later** — the clearest statement that looking worse while learning is normal |
| V | Bjork & Bjork — *Making things hard on yourself, but in a good way*, **in *Psychology and the Real World*, Worth, 2011, pp. 56–64** | The framing of the project. Names five difficulties: spacing, interleaving, varying conditions, testing over re-presentation, intermittent feedback |
| V | Kapur — *Productive Failure*, **Cognition and Instruction 26(3), 379–424, 2008** | **Load-bearing.** Note the sample: **11th-graders**, Newtonian kinematics, in groups. Our audience is several years younger, which the pilot should not gloss over |
| V | Chi, Bassok, Lewis, Reimann & Glaser — *Self-explanations*, **Cognitive Science 13(2), 145–182, 1989** | Why reconciliation is written by the learner (`R-012`). Studied on worked mechanics examples — our own domain |
| V | Chi & Wylie — *The ICAP framework*, **Educational Psychologist 49(4), 219–243, 2014** | Engagement framing; the most-cited paper in that journal since publication |
| V | Butterfield & Metcalfe — *Errors committed with high confidence are hypercorrected*, **2001** | The basis for `R-003`. **Metcalfe & Finn (2012) show hypercorrection in children specifically**, which is the closest thing we have to support in our age band. Caveat: a 2011 study finds the effect persists a week but high-confidence errors can return |
| V | Brier — *Verification of forecasts expressed in terms of probability*, **Monthly Weather Review 78(1), 1–3, 1950** | The calibration score on the record page |
| V | Kirschner, Sweller & Clark — *Why minimal guidance during instruction does not work*, **Educational Psychologist 41(2), 75–86, 2006** | The strongest argument against this design. Note their own hedge: the advantage of guidance **recedes as prior knowledge grows** |
| V | Kalyuga, Ayres, Chandler & Sweller — *The expertise reversal effect*, **Educational Psychologist 38(1), 23–31, 2003** | The conflict with ADR 0003, now properly cited — `P-18` |
| C | Bloom — *The 2 sigma problem*, **Educational Researcher, 1984** | **Never cite externally**, and now verified as to why: never replicated; reviews find effect sizes nowhere near the claim; some of the studies used tutors working with groups of three rather than one-to-one |
| C | Pashler, McDaniel, Rohrer & Bjork — *Learning styles: concepts and evidence*, **Psychological Science in the Public Interest 9(3), 105–119, 2008** | The citation to answer the learning-styles question with: **no adequate evidence base** for matching instruction to style |

**The gap, now characterised — and it is worse than "no evidence".** `R-005` says calibration is trainable in 11–15 year olds and transfers. Searching found: calibration *does* improve with age on its own (one study contrasts children at .49 accuracy when "really sure" against 16-year-olds at .93); but **feedback-based calibration training has repeatedly failed to improve monitoring accuracy in younger children** — kindergarten, first grade, and 7–8 year olds, in separate studies. Almost all of it sits well below our age band, so nothing here settles 11–15 either way. What it does mean is that the adjacent literature is mixed-to-negative rather than silent, and `R-005` is the riskiest claim in the project. `P-07`.

## 2 · Software we depend on at runtime

Short list, deliberately. The lab has **no npm dependencies and no build step**; every primitive is written here so the equations stay visible (ADR 0007).

| Status | What | Licence | Where |
|---|---|---|---|
| U | Familjen Grotesk (Google Fonts) | SIL OFL 1.1 — to verify | The lab and record interface |
| U | Spline Sans Mono (Google Fonts) | SIL OFL 1.1 — to verify | Readouts, labels and figures |
| V | Node.js test runner | — | `node --test`, the only test tooling |

## 3 · Software considered and not used

Surveyed in [04 · Open Source Landscape](04-open-source-landscape.md), which keeps the reasoning. Licences verified 2026-09-19 against project sources; re-check before depending on any of them, since two have changed before.

| Status | Project | Licence | Standing |
|---|---|---|---|
| V | **PhET Interactive Simulations** | **sims CC BY-NC 4.0 since 29 March 2026** (historical sims CC BY 4.0); source GPL-3.0; libraries MIT | **Re-verified 2026-09-20 and the earlier entry was wrong.** See the correction below |
| V | Matter.js | MIT | Reach for it only where contact and stacking complexity is real |
| V | Rapier | Apache-2.0 | Faster, heavier; Rust→WASM |
| V | myPhysicsLab | Apache-2.0 | Worth studying: the one permissive project treating the equations as the artefact |
| V | JSXGraph | LGPL **or** MIT | The replacement for GeoGebra in school maths |
| V | Manim (Community Edition) | MIT | Relevant to the channel, not the lab |
| V | Mafs · MathBox | MIT | Maths visualisation, if we go there |
| V | Mol\* · 3Dmol.js | MIT · BSD | Chemistry viewers — chemistry *simulation* barely exists, which is the opening |
| V | Cytoscape.js · Escher | MIT | Biology pathways; possibly the knowledge graph later |
| V | MapLibre GL JS · CesiumJS | BSD-3 · Apache-2.0 | Geography; mapping is not simulation |
| V | NetLogo | GPL-2.0-or-later | Nothing permissive comes close for evolution and population dynamics |
| V | EJSS (Open Source Physics) | GPL | Simulation authoring |
| V | **GeoGebra** | GPL-3.0 source, but **commercial use needs a paid licence**; assets CC BY-NC-SA | **Excluded.** The most obvious tool in school maths, and we cannot build on it |

## 3a · Correction: PhET is NonCommercial now

`P-06` recorded PhET's HTML simulation files as **CC BY 4.0**, taken from a search summary of a licensing page that speaks of CC BY in the **past tense**, for its *"historical"* collection. That was wrong for anything published today, and [ADR 0009](../decisions/0009-wrap-phet-where-it-exists.md) was accepted on it.

Downloading a current simulation settles it. `projectile-motion` 1.0.34 states, in the file:

> This file is licensed under Creative Commons Attribution-NonCommercial 4.0 International (CC BY-NC 4.0). … **COMMERCIAL USE REQUIRES A COMMERCIAL LICENSE AGREEMENT FROM THE UNIVERSITY OF COLORADO BOULDER.**

PhET's own announcement confirms the change: simulations released **before 29 March 2026** remain under the historical CC BY 4.0 agreement; those published after are not covered by it. Educators, schools and researchers are explicitly unaffected. Any use providing "commercial advantage or monetary compensation" — including by a non-profit — now needs a commercial licence and partnership agreement.

**What that means here.** The open, self-hosted build could use them. **A paid hosted version is precisely the case the NonCommercial clause excludes**, and that is the business ADR 0008 was written for. The separate fact that PhET's *source* is GPL-3.0 — which does permit commercial use — is a different and heavier route, and its assets may not follow the source.

Decided in [ADR 0012](../decisions/0012-no-phet-author-our-own-simulations.md): **no PhET simulation ships in any build.** PhET stays here as prior art and as the reference for what good looks like — reading a simulation and learning from it is not redistribution.

## 4 · Obligations we have taken on

* **PhET simulations are NonCommercial as of 29 March 2026.** Using one in anything that earns money needs a commercial agreement with the University of Colorado Boulder — see the correction above. This obligation did not exist when ADR 0009 was accepted.
* **The FCI is restricted, and that collides with publishing in the open.** Downloads are limited to verified educators and researchers, password-protected, and users agree to keep the instrument secure — precisely so the items do not leak and lose their validity. **We may build on the documented misconceptions, which are published openly; we may not publish its items.** The channel therefore needs items of our own written against those misconceptions, while the parked pilot can use the real instrument through a teacher, as intended. `P-58`.
* **PhET sims are CC BY 4.0** — using one obliges visible attribution. That belongs in the harness, not in each topic page (`P-33`).
* **Fonts** ship under their own licence; confirm OFL before anything is distributed offline.
* Nothing marked **U** above leaves this repository as a claim until `P-06` closes.
