# 04 · Open Source STEAM Landscape

What already exists, what we may legally ship, and what this means for building our own components.

**Verification status: licences checked 2026-09-19 against project sources and documentation.** Unlike [Bibliography](99-bibliography.md), this document is not written from memory. Licences change, though — GeoGebra and Mapbox both did — so re-check before depending on any of these commercially.

Satisfies `P-32`. Feeds `P-31` (extract reusable components) and deserves an ADR before we write a line of physics.

---

## 1. The finding that matters most

**PhET is not a competitor to route around. It is an asset, and it is also the question we have to answer.**

PhET Interactive Simulations (University of Colorado Boulder) has hundreds of research-validated HTML5 simulations across physics, chemistry, maths, biology and earth science, built over two decades and used worldwide. Anyone asking "why not just use PhET?" is asking a fair question.

The licensing is two-sided and the distinction is decisive:

| PhET component | Licence | What it means for us |
|---|---|---|
| HTML simulation **files** | **CC BY 4.0** | We may embed, link and redistribute the sims with attribution |
| New simulation **source code** | **GPL-3.0** | Lifting their source into our product is a copyleft problem |
| Reusable **library** dependencies | **MIT** | Safe to build on |
| PhET-iO | Not openly licensed | Off limits |

So the answer to "why not just use PhET" is: **we should**, for the physics — and our differentiator is the thing PhET does not do. A PhET sim lets you play with a phenomenon. It does not stop you and make you **commit a prediction with a confidence level before you are allowed to see what happens**. That gate is the entire product thesis, it is ours, and it works *better* wrapped around a world-class simulation than around one we rushed in two days.

This reframes Phase 0 significantly and should be an ADR.

## 2. Licence triage

Three buckets. The first is the only one we can build a commercial product on without further thought.

### Safe — permissive, commercial use fine

| Project | Field | Licence | Note |
|---|---|---|---|
| **Matter.js** | 2D rigid body physics | MIT | The obvious default for collisions, stacking, constraints |
| **Rapier** | 2D/3D physics, Rust→WASM | Apache-2.0 | Faster, heavier; JS bindings exist |
| **myPhysicsLab** | Classical mechanics, TypeScript | Apache-2.0 | **Exposes the differential equations.** Pedagogically aligned in a way a game engine is not |
| **JSXGraph** | Interactive geometry, plotting | LGPL **or** MIT (dual) | Take the MIT arm. From Universität Bayreuth, built for maths teaching |
| **Manim (Community Edition)** | Mathematical animation, Python | MIT | 3Blue1Brown's engine. Directly relevant to the channel |
| **Mafs** | React components for 2D maths | MIT | Modern, opinionated, small |
| **MathBox** | WebGL maths diagrams | MIT | Presentation-quality, Three.js based |
| **Mol\*** | Molecular visualisation | MIT | The current standard; RCSB PDB uses it |
| **3Dmol.js** | Molecular graphics | BSD | Lighter than Mol\*, easy to embed |
| **Cytoscape.js** | Graphs, networks, pathways | MIT | Biology pathways, concept maps — possibly our knowledge graph later |
| **Escher** | Metabolic pathway maps | MIT | Narrow but excellent |
| **MapLibre GL JS** | Vector tile maps | BSD-3 | The post-Mapbox default |
| **CesiumJS** | 3D globe | Apache-2.0 | Terrain and tile *hosting* is a paid service; the library is free |

### Copyleft — usable, but constrains what we ship

| Project | Field | Licence |
|---|---|---|
| **PhET** simulation source | All STEAM | GPL-3.0 (sim *files* are CC BY 4.0 — see §1) |
| **NetLogo** | Agent-based modelling — ecology, evolution, emergence | GPL-2.0-or-later; commercial licences available |
| **EJSS** (Easy JavaScript Simulations, Open Source Physics) | Physics simulation authoring | GPL |

NetLogo deserves attention despite the licence: agent-based models are the best way to teach population dynamics, natural selection and emergence, and nothing permissive comes close.

### Excluded

**GeoGebra.** Source is GPL-3.0-or-later, but **any commercial use requires a special paid licence**, and the installers, web services and language files are under GeoGebra's own proprietary terms with CC BY-NC-SA assets. The combination makes it non-free as a whole. It is the most obvious tool in school maths and we cannot build on it. Use JSXGraph instead.

## 3. What this means for `P-31`

**Do not write our own gravity integrator.** That was the instinct and it is wrong for collisions, constraints and contact resolution, where Matter.js is MIT and correct.

But there is a real counter-current, and it decides the architecture:

**A game physics engine is pedagogically opaque.** Our bouncing-ball fixture keeps `e²` of the height per bounce, and the *reason* it dies away is the lesson. Hand it to a black-box solver and the number is right while the mechanism is hidden — and hiding the mechanism is precisely what this project exists to stop. Approximate solvers also drift, and a sim that quietly violates conservation while teaching conservation is a defect.

So the proposal for the ADR:

1. **Primitives are thin, exact and legible by default.** Closed-form or explicit integrators, written so the equation is visible in the source and, where useful, on screen. This is where myPhysicsLab (Apache-2.0) is worth studying closely — it is the only permissive project that treats the differential equations as the artefact.
2. **Reach for Matter.js only where the complexity is real** — many bodies, contact, stacking, friction networks — and mark clearly that the sim is then illustrative rather than exact.
3. **Wrap, don't rebuild.** Where PhET has a validated sim for a topic, the cheapest good product is our gate around their CC BY 4.0 sim. Two days of framing beats two weeks of simulation.
4. **The gate stays ours, and stays the only thing we insist on owning.**

## 4. Coverage by field, honestly

| Field | State of the open landscape | Our position |
|---|---|---|
| **Physics** | Excellent and permissive — Matter.js, Rapier, myPhysicsLab, plus PhET's CC BY sims | Strong. The first three topics are here |
| **Mathematics** | Good, once GeoGebra is excluded — JSXGraph, Mafs, MathBox, Manim | Strong |
| **Chemistry** | Viewer-rich, simulation-poor. Mol\*, 3Dmol.js show molecules beautifully; almost nothing simulates reactions at school level | A genuine gap, and therefore an opportunity |
| **Biology** | Pathways and networks well served (Cytoscape.js, Escher). Population and evolution dynamics mean NetLogo, which is GPL | Workable, licence-constrained |
| **Geography / earth** | Mapping is superb and permissive (MapLibre, Cesium, Leaflet, OpenLayers) | Fine, but mapping is not simulation — less natural fit for a prediction gate |

Chemistry is the interesting entry: the tooling to *show* molecules is excellent and free, while the tooling to let a learner **predict what a reaction will do and be wrong** barely exists. That is the same wedge as physics, in an emptier field.

## 5. Open questions for the ADR

* Do we wrap PhET sims in our gate for Phase 0 topics, or build our own? Wrapping is faster and better; building is more ownable. The honest answer is probably **wrap first, build where PhET has no sim.**
* Does a public component repository use MIT or Apache-2.0? Apache-2.0 carries a patent grant and matches Rapier and myPhysicsLab; MIT matches most of the JS ecosystem.
* Do we accept a GPL dependency anywhere? NetLogo is the only one tempting enough to ask.
* Attribution: CC BY 4.0 obliges us to credit PhET visibly. That needs a standing pattern in the harness, not a per-topic afterthought.

## Sources

Licences verified 2026-09-19 from:
[PhET source code](https://phet.colorado.edu/en/about/source-code) ·
[PhET HTML licensing](https://phet.colorado.edu/en/licensing/html) ·
[GeoGebra licence](https://www.geogebra.org/license) ·
[JSXGraph](https://github.com/jsxgraph/jsxgraph) ·
[NetLogo FAQ](http://ccl.northwestern.edu/netlogo/docs/faq.html) ·
[Matter.js](https://github.com/liabru/matter-js) ·
[Rapier](https://rapier.rs/docs/) ·
[myPhysicsLab](https://github.com/myphysicslab/myphysicslab) ·
[Manim CE](https://github.com/ManimCommunity/manim) ·
[Mafs](https://github.com/stevenpetryk/mafs) ·
[Mol\*](https://en.wikipedia.org/wiki/Mol*) ·
[3Dmol.js](https://github.com/3dmol/3Dmol.js) ·
[Cytoscape.js](https://js.cytoscape.org/) ·
[Escher](https://journals.plos.org/ploscompbiol/article?id=10.1371%2Fjournal.pcbi.1004321) ·
[MapLibre GL JS](https://github.com/maplibre/maplibre-gl-js)
