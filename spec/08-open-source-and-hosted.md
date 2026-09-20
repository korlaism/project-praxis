# Open Source, With a Paid Hosted Version

**Status:** Note, 2026-09-20. **Not a decision** — recorded because it changes decisions that are still open. The ADR comes when the licence is chosen (`P-59`).

Praxis is an open source project: everything customisable, storage and model provider included. Alongside it, a paid hosted version a student can use straight away without running anything.

---

## It fits the thesis rather than bending it

[01 · The Economics Flip](../research/01-the-economics-flip.md) already argued that a learner's notebook should be **an open, portable format they own**, carried between schools, jobs and decades — and predicted the market would build silos instead. Open source is that argument taken seriously rather than a new direction bolted on.

It also answers a question the project could not otherwise answer well. A school that will not send children's records to a stranger's server can run it themselves. That is a real answer, not a dodge, and it is worth more than any privacy policy.

## The seams this requires

Some of these are accidentally already true, which is a good sign the architecture was pointed the right way.

| Seam | Today | What is needed |
|---|---|---|
| **Storage** | `openNotebook({ backend })` — already injectable, already tested against a memory backend | Adapters: browser-local (default), self-hosted, hosted |
| **Scenarios** | Data, not code (ADR 0007), loaded from a registry | A scenario source that can be a folder, a server, or a generator |
| **Model provider** | None yet; generation is `P-51` | A generator interface: request in, **validated** spec out. The provider is the learner's or the host's choice |
| **Identity** | None — nothing takes an account | Optional, and off by default. The lab must keep working with no account at all |
| **Deployment** | A static bundle (`P-35`) | Unchanged, and that is the point: the open build should stay a folder of files anyone can serve |

## What is not customisable

A fork can change the storage, the model, the styling and the scenarios. If it changes these, it is a different product wearing this one's name:

1. **The commit-before-reveal gate.** `R-010`: the outcome is unreachable before a prediction and confidence exist. Enforced in the state machine, not the interface, for exactly this reason.
2. **The verification checks** — above all the answer check: run the scenario, confirm the option marked correct is what actually happened. **Swap the model, never the checks.** A pluggable provider without fixed verification is how a generated lie reaches a child.
3. **AI never writes in the learner's notebook** (ADR 0002).

These three are what a build has to honour to call itself Praxis. Worth writing as a conformance test suite before anyone forks, not after.

## The licence is now a real decision

`P-31` was about to choose MIT or Apache-2.0 for a component repository as a matter of housekeeping. With a paid hosted version planned, it is a strategic choice, and it belongs to `P-59`:

* **Permissive (MIT / Apache-2.0).** Maximum adoption and contribution. Anyone may host it commercially, including someone better funded than us.
* **Network copyleft (AGPL-3.0).** A competitor who hosts a modified version must publish their changes. Deters some commercial adopters and some schools' procurement, and is the usual choice for this exact shape.
* **Open core.** Core open, hosted-only features proprietary. The common failure is that the open part slowly hollows out and the goodwill goes with it.

**Decided 2026-09-20 — [ADR 0008](../decisions/0008-licence-split.md):** the lab kit is MIT, the application is AGPL-3.0-or-later. The split follows one this project already made — ADR 0005 treats the tools as the acquisition surface and ADR 0006 says the notebook is the product, so they get different licences.

## What the hosted version costs

**Children's records on our servers turns consent into compliance.** `P-44` was scoped to browser-local storage, which kept it small. Hosting changes that, and which rules apply depends on where the learners are. *The specific regimes are unverified — none has been checked, and none may be named as fact until they are (`P-60`).*

`K-06` also gets heavier, not lighter: a persistent record of a child's mistakes held by a company is a different object from the same record on their own laptop.

## What this does not change

Phase 0, the gate, the honesty rules, and every ADR from 0001 to 0007. The open build and the hosted build run the same lab; the difference is where the notebook lives and who operates it.
