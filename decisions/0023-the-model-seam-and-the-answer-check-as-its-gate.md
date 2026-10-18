# ADR 0023 · The Model Seam, and the Answer Check as Its Gate

**Date:** 2026-10-18 **Status:** Accepted **Tickets:** P-96 **Rests on:** judgment
**Relates to:** [ADR 0002](0002-ai-never-writes-in-the-notebook.md), [ADR 0007](0007-generated-scenarios.md), [ADR 0022](0022-the-product-frame-wins.md), `R-015`, `P-44`, `P-60`, K-06

## Context

[ADR 0022](0022-the-product-frame-wins.md) chose the product frame. The product is *"open the application, either with my own AI or the one the company operates."* Today the built lab **cannot talk to anything**: `lab/notebook/privacy.test.mjs` walks the bundle and fails if it finds `fetch`, `XMLHttpRequest`, `WebSocket`, `sendBeacon` or `EventSource` anywhere in it.

That property is not an accident and it is not small. `P-44` established it deliberately for a cohort of minors, and ADR 0022 called it *"the strongest privacy position this project will ever have."* It is also now the thing standing between the repository and the product.

The other half of the context is [ADR 0007](0007-generated-scenarios.md), which decided that scenarios are **composed** by a model out of primitives we build, never written as code by a model, and that four checks stand between a generated scenario and a learner — the last and most important being **the answer check**: run the simulation headlessly, and refuse the scenario unless the option it marks correct is what actually happened.

Until now that check has only ever run offline, in a research harness. The measurement it produced is not reassuring: a local 7B model scored **0 of 7** on the half of the corpus where the answer has to be derived (`research/05`), and `P-90` — the same spike against a frontier model — is still blocked on a credential. **Generation quality is unknown and the one measurement we have is bad.**

## Decision

**Open the seam, confine it to one module, and put the answer check in front of everything that comes through it.**

**1 · Bring-your-own-key, and nothing else yet.** The learner supplies an endpoint, a key and a model name. They are kept in that browser and sent to **nobody but the endpoint the learner named**. There is no server in this change, no account, and no hosted tier — that is a business and legal decision that needs `P-60`'s data-protection work first, and it does not get made by accident here.

**2 · Off by default, and invisible when off.** With no key configured, the lab behaves exactly as it does today: no transport, no request, no mention of a model in any code path that runs. The product must remain whole for someone who never configures one.

**3 · One module may transmit, and the test now says which.** `privacy.test.mjs` changes from *"the bundle contains no transport"* to *"transport appears in exactly one named module and nowhere else."* This is weaker and it is honest. A guard quietly deleted when it becomes inconvenient was never a guard; a guard narrowed on purpose, in the open, still catches the thing it was written for — which is a prediction being sent somewhere by code nobody reviewed.

**4 · What leaves is named, and the test reads the request body.** The topic the learner typed, and the primitive contract — the controls, outcome ids and outcome text that a scenario must be composed from. **Never the notebook, never the session notes, never the confusion log, never the record.** This is asserted against the actual bytes of the request, not promised in a comment.

**5 · The answer check is the gate, and it is not optional.** Every generated scenario is validated against the schema, its parameters checked against the primitive's controls, run headlessly in the learner's own browser, and compared: the option marked correct must be what the simulation actually did. **Anything that fails is discarded and never rendered.** The model proposes; the simulation decides. This is the only reason putting runtime generation in front of a learner is defensible at all, and it is why ADR 0007's Tier 1 — compose from primitives, never write code — is load-bearing rather than cautious.

**6 · The failures are shown, not hidden.** When a model produces four scenarios and one survives, the page says so. A generator that is mostly wrong is a fact the learner is entitled to, and `research/05` says that is the likely case today.

**7 · The learner is told what is sent, where, and on whose account** — in the settings page, in plain words, before they can enter a key.

## What this costs, stated before it bites

**The no-transport property is gone and cannot be got back.** Everything downstream of `P-44` was easy because the answer to *"what do you collect?"* was *"nothing, there is no server."* The answer is now longer: *we still collect nothing, there is still no server, and the learner's own key sends their topic to a third party they chose.* That is defensible and it is not as strong.

**`K-06` and the minors question get harder.** A child's typed topic now reaches a commercial API under someone's account. The mitigations are real but partial: topic only, no record, no notes, off by default, and said out loud on the settings page. `P-60` stops being deferrable the moment a hosted tier is considered.

**A key in `localStorage` is a key on the device.** It is the learner's own key, in their own browser, in a page that renders every learner-written string as text and never as markup. That is the honest size of the exposure, and it is why there is no "remember my key on our server" and never will be in this design.

**Generation may simply not work yet.** The one measurement says a small model fails the derived half completely. The gate means a bad model produces *nothing* rather than something wrong — which is the right failure, but it is still a failure, and `P-90` is the ticket that tells us how big.

## Alternatives rejected

### A hosted endpoint we operate, first

The paid tier, and the thing with a business model attached. Rejected for now because it needs accounts, a server, a data-protection position for minors (`P-60`) and a lawyer, and because every one of those is easier to get right once the seam has been proven against an endpoint we do not own.

### Proxy the learner's key through our server to hide it from the page

Standard practice for a web app, and wrong here. It would mean the key, the topic and the timing all passing through us — collecting exactly what `P-44` was written to avoid — in exchange for protecting a key from the person who owns it.

### Let the model see the learner's notes, so it can personalise

This is where the product is eventually going; the vision is explicit that *the AI learns your behaviour from the notes that only you can write.* Rejected **in this ticket** on scope and on consent: notes are the most sensitive thing in the dataset ([ADR 0020](0020-the-reconciliation-is-offered-not-demanded.md)), and sending a child's own words about their own mistakes to a third party is a decision that deserves its own ADR, its own consent design, and probably its own switch.

### Show generated scenarios and let the learner judge them

Cheaper, and it is what most of this year's AI-education products do. Rejected on `research/04`'s standing commitment: a simulation that silently violates the thing it is teaching is the defect we exist not to ship. A learner cannot audit a simulation — that is the whole reason they are watching it.

## Requirements addressed

* `R-015` — unchanged and reinforced. The model composes scenarios; it still never writes in the learner's notebook, and now it cannot even read it.
* `R-010` — unchanged. A generated scenario meets the same gate: predict, then watch.
* ADR 0007's four checks — now run in the browser, for the first time, on the only scenarios that need them most.

## Revisit when

* `P-90` returns a frontier measurement. If a capable model clears the answer check reliably, generation becomes the primary way scenarios exist and the authored bank shrinks further. If it does not, this seam carries a repair loop or a human.
* A hosted tier is seriously proposed. That is `P-60`, a server, accounts, and this ADR's §1 being revisited rather than quietly widened.
* Anyone proposes sending the notes. §4 is the line, and moving it is a new decision, not a configuration change.
