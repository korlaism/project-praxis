# ADR 0010 · YouTube Shorts, One Topic a Fortnight

**Date:** 2026-09-20 **Status:** Accepted **Tickets:** P-29 **Rests on:** judgment

> Accepted to unblock, not because the platform is obviously right. Three tools have existed
> with nowhere to put them since the first one shipped, and `P-08` still calls distribution the
> largest unexamined risk. A decided channel that turns out wrong is recoverable; an undecided
> one has already cost weeks.

## Context

[ADR 0005](0005-channel-first.md) settled that the lab is built in public and that **the tool is the content** — the video is a recording of the tool being used, not an advertisement pointing at it. That rule only works if a viewer can actually reach the tool, which makes link behaviour a platform requirement rather than a nicety.

Instagram Reels would reach an Indian school-age audience faster and pushes new accounts harder. But links are hostile there — bio-link only — so far fewer viewers reach the lab, which undercuts the entire premise. Its cadence appetite is also higher than three tools can feed.

## Decision

**YouTube Shorts.** Vertical, 30–60 seconds, opening on the provocation and never on the subject. The lab is linked in the description and a pinned comment.

**One topic a fortnight.** Three built tools already cover six weeks, so the channel starts from stock rather than from a sprint — and the cadence survives a bad week, which is the only cadence worth committing to.

The same recording re-cuts for Instagram and LinkedIn later without reshooting. Shorts are searchable indefinitely, which suits a catalogue that accumulates.

## Requirements addressed

* `R-034`-adjacent only. Nothing in [Phase 1 Requirements](../spec/02-requirements.md) §1 is touched — no claim is tested by a channel, and nothing observed on one may be reported as though it were (Phase 0 · Publish).

## Alternatives rejected

### Instagram Reels first

Faster reach, and the wrong trade. Bio-only links break "the tool is the content", and the algorithm wants a cadence we cannot sustain honestly.

### Wait for eight to ten topics

Launches with depth and keeps the largest risk unexamined longest. Distribution is the thing we know least about; three posts that teach us how people behave beat ten that teach us nothing yet.

## Consequences

**The lab must be publicly reachable, and it is not.** Today it lives on Tailscale and in a private artifact. A Short pointing at either is a Short pointing at nothing. This is now on the critical path — `P-65`.

**Publishing to minors' attention** carries obligations even with no account and no data collection. `K-06` applies to what the channel says about being wrong, not only to what the record page shows.

**A fortnight is a promise.** Missing it visibly is worse than never starting; `K-05`'s spirit applies here — if the cadence is not survivable, the honest move is to change it deliberately rather than let it lapse.

## Revisit when

* Six topics are out and the link-through rate to the lab is negligible — then the format is wrong even if the reach is fine.
* Reels' reach proves decisive enough to accept worse link behaviour, with numbers rather than a hunch.
