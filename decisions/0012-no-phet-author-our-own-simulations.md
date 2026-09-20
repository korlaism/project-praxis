# ADR 0012 · Author Our Own Simulations — PhET Is NonCommercial Now

**Date:** 2026-09-20 **Status:** Accepted **Tickets:** P-66 **Rests on:** judgment
**Supersedes:** [ADR 0009](0009-wrap-phet-where-it-exists.md)

## Context

[ADR 0009](0009-wrap-phet-where-it-exists.md) decided to wrap PhET simulations where they exist and build our own where they do not. Coverage was the argument: PhET has decades of work behind it, and rebuilding a projectile sim to look slightly worse is not progress.

It rested on a licence that had already changed. `research/06-resources.md` recorded PhET's simulation files as CC BY 4.0, marked verified during `P-06`. That came from a licensing page which speaks of CC BY in the **past tense**, for its *historical* collection. `P-64` began by downloading a simulation to self-host, and the file settled it:

> This file is licensed under Creative Commons Attribution-NonCommercial 4.0 International (CC BY-NC 4.0). … **COMMERCIAL USE REQUIRES A COMMERCIAL LICENSE AGREEMENT FROM THE UNIVERSITY OF COLORADO BOULDER.**

PhET's announcement dates the change: simulations published after **29 March 2026** are not covered by the historical CC BY agreement. Educators, schools and researchers are explicitly unaffected. Any use providing commercial advantage or monetary compensation — including by a non-profit — needs a commercial licence and partnership agreement.

[ADR 0008](0008-licence-split.md) commits to an open self-hosted build **and a paid hosted version**. NonCommercial and a paid hosted version cannot both be true of the same file.

## Decision

**No PhET simulation ships in any build of Praxis.** We author our own simulations, as we already author our own items.

The embedded scenario kind built in `P-63` stays. It was never PhET-specific, and it remains how any third-party simulation is mounted — for one whose licence has been verified against *both* builds, not one.

Three things follow.

**Coverage gets slower, and that is the real cost.** Every topic now needs a primitive written and an oracle to check it against. ADR 0009's coverage argument was sound; it is simply unavailable at the price we are able to pay.

**The answer check becomes possible everywhere.** ADR 0009 named this as the consequence that must not be quietly absorbed: *the answer check cannot run inside someone else's simulation.* Wrapping bought coverage by giving up the one mechanical guarantee this project has. Every scenario now runs headless and confirms that the option marked correct is what actually happens. That was a loss we had accepted; it is now returned to us.

**This aligns the simulations with [ADR 0011](0011-author-our-own-items.md).** The items are ours, written against openly published misconceptions. The phenomena are now ours too. What we borrow is the *science*, which is not licensable, and the *documented misconception*, which is published openly.

## What we do not do

**We do not stop citing PhET.** It stays in `research/06-resources.md` as prior art and as the reference for what good looks like. Reading a PhET sim and learning from it is not redistribution.

**We do not build from PhET's GPL-3.0 source.** The source does permit commercial use and would be compatible with the AGPL half — but it is a large codebase whose media assets may not follow the source licence, and the investigation costs more than authoring a primitive. Reopen this only if a specific simulation is worth the work.

**We do not pursue a commercial agreement now.** PhET offers one and it would unblock everything. It also puts a third party's timetable in front of `P-65`, which is already the critical path to the first Short. This is a decision to defer, not to reject: if coverage becomes the binding constraint later, this is the first door to knock on.

## Requirements addressed

* `R-021` — an item whose outcome is arguable is broken. The answer check now applies to every scenario without exception.
* **No requirement covers third-party licensing at all.** That is how a licence could be recorded wrongly, used to justify an ADR, and go unchallenged. `P-67` adds one: every third-party component carries a licence verified against **both** builds, with the date it was checked. Not written here, because a requirement invented inside the ADR that needs it is not a requirement.

## Kill criteria

Unchanged. This affects how fast the corpus grows, not whether the gate works.

## Revisit when

* A simulation we want badly enough is available under a licence that clears both builds, and wrapping it beats authoring it.
* Coverage — not the gate, not calibration — becomes the constraint that is holding the project back. Then reopen the commercial agreement.
* PhET changes its terms again. The lesson of this ADR is that a licence recorded once is not a licence verified.

## Consequences for the record

`P-64` is dropped, not deferred: self-hosting PhET is not something we will do later. `research/06-resources.md` carries the correction and the date. ADR 0009 is left standing with its premise marked false, because a decision taken on bad information is worth being able to see.
