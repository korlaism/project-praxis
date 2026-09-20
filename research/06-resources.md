# Resources Index

Everything this project cites or depends on, in one place. Sources used to be spread across a bibliography, a licence survey and an instruments section; this is the single registry, and those documents keep the argument while pointing here for the record.

**The rule:** a source enters this index in the same change that first cites it. Not later.

**Status:** **V** verified against the source · **U** recorded from working knowledge, unverified · **C** contested, handle with care.
Nothing marked **U** may be cited outside this repository — `P-06`.

For what is actually worth reading, and in what order, see [Reading List](07-reading-list.md).

---

## 1 · Papers and books

| Status | Source | Where it is used here |
|---|---|---|
| U | Hestenes, Wells & Swackhamer — *Force Concept Inventory*, The Physics Teacher, ~1992 | The item bank and the error taxonomy. Its distractors **are** our `errorTags` |
| U | Thornton & Sokoloff — *Force and Motion Conceptual Evaluation*, ~1998 | Second item source; graphical items help separate near from far transfer |
| U | Hake — interactive engagement vs traditional, ~1998 | Normalised gain, the measure behind `K-01`'s 1.3× threshold |
| U | Driver et al. — *Making Sense of Secondary Science*, ~1994 | Misconception catalogue beyond mechanics, for whichever subject comes second |
| U | White & Gunstone — *Probing Understanding*, ~1992 | Predict–observe–explain: the direct ancestor of the commit-before-reveal gate |
| U | Roediger & Karpicke — testing effect, ~2006 | Retrieval over restudy; why the loop measures delayed transfer |
| U | Slamecka & Graf — generation effect, ~1978 | Why the learner writes their own words (ADR 0002) |
| U | Cepeda et al. — spacing meta-analysis, ~2006 | The spacing schedule in the parked pilot |
| U | Rohrer & Taylor — interleaving, ~2007 | Week 6 of the pilot design |
| U | Bjork & Bjork — *Making Things Hard on Yourself, But in a Good Way*, ~2011 | The framing of the entire project |
| U | Kapur — *Productive Failure*, ~2008; Kapur & Bielaczyc, ~2012 | **Load-bearing.** Failure-then-instruction is the sequence the loop implements |
| U | Chi et al. — self-explanation, ~1989 | Why reconciliation is written by the learner (`R-012`) |
| U | Chi & Wylie — ICAP, ~2014 | Engagement framing; weaker as evidence |
| U | Butterfield & Metcalfe — hypercorrection | The best support for `R-003`; why confidence is captured at all |
| U | Brier — verification of forecasts, 1950 | The calibration score on the record page |
| U | Kirschner, Sweller & Clark — *Why Minimal Guidance During Instruction Does Not Work*, ~2006 | The strongest argument **against** this design. Engaged in research/02, not dismissed |
| U | Sweller — cognitive load; worked example effect | Same objection, the mechanism behind it |
| U | Expertise reversal effect | Cuts against ADR 0003; unresolved, tracked as `P-18` |
| C | Bloom — "2 sigma", 1984 | **Never cite externally.** Effect size contested, has not replicated at that magnitude |
| C | Learning styles / modality preference | No empirical support. Will be requested anyway; the answer is no |

**A gap, stated as one:** no source found for calibration training in ages 11–15. `R-005` rests on nothing yet — `P-07`.

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
| V | **PhET Interactive Simulations** | sims **CC BY 4.0**; source GPL-3.0; libraries MIT | The most consequential open question — wrap or build, `P-33` |
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

## 4 · Obligations we have taken on

* **PhET sims are CC BY 4.0** — using one obliges visible attribution. That belongs in the harness, not in each topic page (`P-33`).
* **Fonts** ship under their own licence; confirm OFL before anything is distributed offline.
* Nothing marked **U** above leaves this repository as a claim until `P-06` closes.
