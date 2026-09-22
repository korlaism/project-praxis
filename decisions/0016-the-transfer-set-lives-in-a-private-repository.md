# ADR 0016 · The Held-Back Transfer Set Lives in a Private Repository

**Date:** 2026-09-22 **Status:** Accepted **Tickets:** P-78 **Rests on:** judgment
**Relates to:** `R-022`, `K-01`, [ADR 0011](0011-author-our-own-items.md), [ADR 0005](0005-channel-first.md)

## Context

`R-022` holds back ten items — same concepts, different surface, never seen during the six weeks. It is not a nice-to-have: **normalised gain on that set at two weeks, treatment against control, is what `K-01` is measured on.** It is the experiment.

`P-65` made this repository public. That turned a filing question into a live one, because a published transfer item is a destroyed transfer item — a learner or a teacher can simply read it, and then it measures recognition of something seen rather than transfer to something new. This is the argument `P-06` already accepted about the FCI, which is password-protected for exactly this reason, and which [ADR 0011](0011-author-our-own-items.md) built on: **we may publish the misconceptions, never the instrument.**

Nothing has been authored yet, so nothing has leaked. That is the whole reason to decide now rather than when the pilot unparks.

## Decision

**The transfer set lives in a separate private repository, holding only item data, validated by the public tools.**

The line is between tools and data, and it is the same line the licence split already draws: the harness, the schema, the primitives and the answer check are public and MIT; the ten items are not ours to publish because publishing them spends them.

Four things follow.

**They are never committed here, not once.** Git history does not forget, and this repository is public — a commit that is reverted a minute later is still a commit anyone can read forever. `lab/scenario/bank.test.mjs` fails the build on any scenario marked `heldBack: true`, checked against the whole registry rather than just the bank, because the mistake to guard against is someone adding a transfer item wherever felt natural at the time.

**The answer check still runs over them.** This is the point of keeping them as scenario data rather than as prose on paper. [ADR 0011](0011-author-our-own-items.md) gave up decades of psychometric validation and named the answer check as the compensating guarantee: the simulation is run and the option marked correct is confirmed to be what happens. A measurement instrument is the last place to give that up. The private repository uses the same schema and the same `verify-scenarios`, because the tools are public and the data does not have to be.

**The flag is in the public schema on purpose.** `heldBack` is validated here even though no item here may carry it. It costs one line, it lets the private set use an unmodified validator, and it makes an item that arrives in the wrong place refusable rather than merely unwelcome.

**It does not exist until the pilot needs it.** [ADR 0005](0005-channel-first.md) parks the pilot, and a private repository containing ten unauthored items is filing, not work. This ADR settles *where*, so that the first person to write one has somewhere to put it.

## Alternatives rejected

### Paper, administered by the teacher

Consistent with [ADR 0004](0004-teacher-mediated-cohort.md), which already has a teacher administering the real instrument, and it is the strongest option on confidentiality. Rejected because it **surrenders the answer check on the only items that have to be right.** Our items are ours; their claim to validity is that the outcome is demonstrated rather than asserted. An item on paper is an asserted answer, which is what ADR 0011 spent its whole argument not doing.

Worth noting where this stays true: the *real* instrument, if the parked pilot ever uses the FCI as intended, is still paper through a teacher. That is someone else's validated instrument and none of our guarantees apply to it.

### Encrypted inside this repository

Rejected, and the reasons are worth keeping because it is a tempting shape. Everyone who runs the pilot needs the key, so the key spreads to exactly the population that must not read the items. A leaked key cannot be recalled, and by then the ciphertext is in a public history forever. And it would put the items one `git log -p` away from a mistake, rather than in a different place entirely.

### Only in the school's own self-hosted instance

Incoherent with [ADR 0008](0008-licence-split.md): anyone can self-host, so "only in a self-hosted instance" means "available to anyone who self-hosts". It also reverses [ADR 0015](0015-the-record-stays-where-the-learner-is.md), which puts *learner data* in the school's hands — that is data we should not hold, and this is data they should not.

## Requirements addressed

* **`R-022`** — held back, and now held back from us too. The repository is public, so "kept out of the treatment content entirely" has to mean kept out of the published artefact.
* `R-021` — an item whose outcome is arguable is broken. Still enforced on these, by the same answer check, from the private side.
* `R-020` — the thirty-item bank is unaffected. `P-09` already recorded that ten of the "thirty" were never this repository's to hold.

## Kill criteria

`K-01` depends on this set existing and being unseen. Both failure modes are now nameable: an item that leaks, and an item nobody verified.

## Revisit when

* The pilot unparks and the set is actually authored. Everything above is written before the first item exists and will be wrong somewhere.
* `P-10` classifies the set blind as near or far transfer. If most of it lands as *near*, the problem is not where the items live but that our four primitives cannot produce a genuinely different surface — `spec/03` already names that risk, and it is the more dangerous one.
* The component packaging in `P-31` lands, which would let the private repository depend on a published schema rather than a checkout sitting next to it.
