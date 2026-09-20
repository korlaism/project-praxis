# ADR 0008 · MIT for the Lab Kit, AGPL-3.0 for the Application

**Date:** 2026-09-20 **Status:** Accepted **Tickets:** P-59, P-31 **Rests on:** judgment

> A decision about what the business is, not only what the repository says. It is also the
> hardest decision here to reverse — relicensing later needs every contributor's agreement —
> which is why it was taken deliberately rather than settled in passing inside `P-31`.

## Context

Praxis is open source, with a paid hosted version a student can use straight away ([Open Source, With a Paid Hosted Version](../spec/08-open-source-and-hosted.md)). That makes the licence strategic. `P-31` was about to pick MIT or Apache-2.0 for a component repository as housekeeping, which would have decided this by accident.

Three shapes were available. **Permissive everywhere** buys the widest adoption and the least procurement friction, and lets anyone better funded host the product against us. **Network copyleft everywhere** protects the hosted business, and taxes exactly the adoption the components are meant to win. **Open core** protects revenue most directly and tends to hollow out the open part, taking the goodwill with it.

The project already knows which parts are which. [ADR 0005](0005-channel-first.md) treats the tools as the acquisition surface; [ADR 0006](0006-the-notebook-is-the-product.md) says the notebook is the product. Those are two different things and they deserve two different licences.

## Decision

**The lab kit is MIT.** The physics components, the harness and its commit-before-reveal gate, the primitives, the scenario schema, the headless runner and the verification checks. We would rather these spread than stay ours: a generated-scenario ecosystem that verifies its own answers is better for everyone, including us, and the components are the cheapest credibility this project has.

**The application is AGPL-3.0-or-later.** The notebook, calibration, the record page and the assembled hub. Running it for your own school, class or child is unrestricted. Hosting a modified version *as a service for others* obliges publishing the changes.

Every source file carries an `SPDX-License-Identifier`, so the boundary is readable per file and cannot drift. [LICENSING.md](../LICENSING.md) is the map; licence texts are verbatim from their canonical sources.

## Requirements addressed

* `R-015` and ADR 0002 are unaffected: the authorship rule is a design constraint, not a licence term.
* No claim from [Phase 1 Requirements](../spec/02-requirements.md) §1 is touched, which is why this rests on judgment.

## Alternatives rejected

### Permissive everywhere

Rejected for the application only. A funded competitor could host it unchanged and compete on distribution, which is the one axis where a solo project loses. Retained for the kit, where the same openness is the point.

### AGPL everywhere

Rejected because it taxes the wrong half. A publisher or another channel embedding our circular-motion primitive should not need legal review; that friction would cost exactly the spread the kit exists to win.

### Open core

Rejected on how it fails rather than whether it works. The pressure is permanent and one-directional — every good thing becomes a candidate to withhold — and the open half decays quietly.

## Consequences

**Costs.** Two licences are more explaining than one, and contributors must know which half they are in — hence the per-file SPDX headers and the map. AGPL will deter some commercial adopters of the application, which is the intended trade but still a cost. Moving a file across the boundary later is a relicensing question, not a refactor.

**Foreclosed.** Including GPL-3.0 code (PhET's simulation *source*, for instance) inside the MIT half. The CC BY 4.0 **sims** remain usable either side — `P-33` is unaffected.

**Makes easier.** A school's procurement answer: run it yourself, we hold nothing. And a component library others can adopt without asking anyone.

**New work.** Confirm the copyright holder name before anything is published widely; a contribution policy if anyone else ever commits.

## Revisit when

* A serious adopter of the *application* is blocked specifically by AGPL — the evidence, not the fear, should move it.
* The hosted version is abandoned, which removes the reason the halves differ.
* A dependency we want lands on the wrong side of the boundary.
