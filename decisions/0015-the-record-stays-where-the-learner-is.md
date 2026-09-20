# ADR 0015 · The Record Stays Where the Learner Is

**Date:** 2026-09-20 **Status:** Accepted **Tickets:** P-44 **Rests on:** judgment
**Relates to:** `R-033`, `K-06`, [ADR 0006](0006-the-notebook-is-the-product.md), [ADR 0008](0008-licence-split.md)

## Context

`R-033` — written guardian consent before any data is collected — was scoped to the parked pilot. [ADR 0006](0006-the-notebook-is-the-product.md) made the record the product, and [ADR 0008](0008-licence-split.md) added a paid hosted version, so the question stopped being hypothetical.

**What is actually collected today, read from the code rather than assumed:** nothing. No account, no server, no identifier. One `localStorage` key, `praxis.notebook.v1`, holding cards about predictions — which scenario, which option, how confident, what happened, which misconception. `grep` finds **no `fetch`, no `XMLHttpRequest`, no `WebSocket`, no `sendBeacon`** anywhere in `lab/`. There is no code path by which a child's prediction reaches us, because there is no code that sends anything anywhere.

That is the strongest position this product will ever be in, and until now it was an accident of not having built the other thing yet.

**One exception, found while auditing and not yet fixed.** Every page loads its fonts from `fonts.googleapis.com`, which sends the learner's IP address and user-agent to a third party on every visit. "Nothing leaves the device" is therefore **not true as shipped**. `P-76` self-hosts the fonts. It is named here rather than quietly excluded, because an invariant with a silent exception is worse than no invariant.

**What is deliberately not in this ADR:** any claim about which data-protection regimes apply. `P-60` requires that none be named as fact until it is checked, and it has not been. Nothing below depends on the answer — that is the point of it.

## Decision

**The record stays where the learner is. Moving it is a decision, never a default.**

**1 · Local by default, forever.** The browser-local notebook is not a stepping stone to a server; it is the product's normal mode. A learner with no account and no connection gets the whole loop. `lab/notebook/privacy.test.mjs` fails the build if the built lab gains any means of transmission, and fails if a card gains a field that is not about the prediction. Sending a child's data somewhere now requires deleting a test, in front of a reviewer.

**2 · Self-hosting is the answer for schools, not a fallback.** A school runs it, and the school holds the records — we never do. This is what the swappable storage adapter in ADR 0008 is *for*, and it means the hardest version of the consent question can be answered by not being the one holding the data. It is also the honest reading of "open source": the thing you can run yourself is the whole thing.

**3 · The hosted version is the only thing that creates a consent obligation, and it does not ship before `P-60`.** When it exists: opt-in, never silent migration; pseudonymous ids only, no names, per `R-033`; the learner can export and delete, and deletion means deletion rather than a flag.

**4 · Who sees what.** The learner sees everything. **A teacher sees only aggregates, and never a ranked list** — the mistake session in ADR 0004 needs "three people believed the force is stored in the ball", not "Priya got four wrong". **We build no parent portal.** A parent sees the record when the learner shows it to them, on the learner's device, which is what already happens with a notebook. This is `K-06` expressed as access control: an error record that a parent can pull up without the child is a report card, whatever the interface calls it.

**5 · A field that identifies a person is a decision, not a refactor.** The card schema holds no identifier at all today. The test encodes the fields a card is *allowed* to be about as a whitelist, so adding a name, an email or a device id fails the build rather than passing review as a small change.

## Alternatives rejected

### Account-first, with local storage as the offline case

The normal shape for this kind of product, and it inverts the argument. It makes collection the default and privacy a setting, which means every later question — retention, export, deletion, who can see a class — starts from "what do we already hold?" rather than "what do we need?". It also makes the hosted version compulsory to the experience, which contradicts ADR 0008.

### Wait for `P-60` before deciding anything

Tempting, and wrong. The decisions above hold whichever regimes turn out to apply, because they reduce what is collected rather than describe how to handle it. Waiting would also have left the invariant unwritten while the code drifted.

### Let teachers see individual records

The mistake session is the pedagogical heart of ADR 0004 and it would be easier to run with names. Rejected under `K-06`: being wrong on purpose only works if being wrong is safe, and a named error list seen by the adult who grades you is not safe. If the pilot shows aggregates are unworkable, that is a `K-05` finding and gets decided then, with evidence.

## Requirements addressed

* `R-033` — guardian consent before collection. Restated as a property of the design rather than a promise: with nothing collected, the obligation does not arise, and the hosted version cannot ship without meeting it.
* `R-015` — no AI-generated text in a learner's own fields. Unaffected and still true.
* `K-06` — the record must never read as a report card. Point 4 is that criterion made concrete.

## Revisit when

* `P-60` reports. If a regime imposes something these decisions do not already satisfy, this ADR gets amended rather than worked around.
* The hosted version is actually built. Every clause above about it is written ahead of the code and will be wrong somewhere.
* A school asks for individual visibility for a reason we have not thought of. That is a real possibility and it deserves a real argument, not this ADR quoted at them.
