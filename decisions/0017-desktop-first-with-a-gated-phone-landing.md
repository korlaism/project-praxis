# ADR 0017 · Desktop First, With a Gated Phone Landing

**Date:** 2026-09-25 **Status:** Accepted **Tickets:** P-84 **Rests on:** judgment
**Amends:** `R-016` · **Relates to:** [ADR 0010](0010-channel-youtube-shorts.md), [ADR 0005](0005-channel-first.md)

## Context

The lab is built for a wide screen. Every screenshot in the product documentation is 1440×900, and that reflects the design rather than the test rig: the canvas *is* the product, the parameter sliders want precision a fingertip does not give, and the record page's reliability diagram needs horizontal room before four confidence levels can be told apart.

Two things in the spec disagree with that.

**`R-016`** requires the instrument to work on **a low-end shared Android phone over intermittent 3G**. It was written about the Phase 1 cohort's real devices, and a shared phone is the realistic case for the learners this is aimed at. It has always been marked a *guess* to be confirmed against those devices before building, and it never has been.

**[ADR 0010](0010-channel-youtube-shorts.md)** commits to YouTube Shorts, one topic a fortnight, each linking to the lab. Shorts are watched on phones, almost entirely. The funnel therefore runs from a phone to a desktop-only destination, which is a hole in the middle of the distribution plan rather than a rendering detail.

## Decision

**The lab is desktop-first. The channel's traffic lands on a phone-readable page that keeps the gate.**

Three parts, and the second is the one that matters.

**1 · The lab does not chase the phone.** Sliders, re-running with changed parameters, the full canvas and the record page are built for a real screen and stay that way. Making all of it work at 360 pixels would produce a different product wearing the same name.

**2 · The landing keeps the gate, or it is not this product.** A page that shows a Short's viewer the question and then the answer is the ordinary explainer this project exists as an argument against. So the landing asks for a prediction and a confidence *first*, exactly as the lab does, and only then shows what happened — as a recording rather than a live simulation — followed by the cue and the explanation.

What the landing gives up is the **apparatus**, not the commitment: no sliders, no re-running with different numbers, no "try it with the masses changed". What it keeps is the one mechanic `R-010` names. It reuses the same scenario data, the same option list and the same gate module; only the interactive canvas is replaced.

**3 · `R-016` is amended rather than deleted.** The requirement stands for the Phase 1 pilot and is unconfirmed; what changes is that it no longer describes the lab. Before the cohort builds anything, the actual devices have to be checked — that question is older than this ADR and is not settled by it.

## What this obliges us to

**The deployed lab has no viewport declaration at all.** `tools/build-topic.mjs` strips every `<meta>` from the entry page, correctly, because the artifact publish skeleton supplies charset and viewport itself. The same bundle now also ships to GitHub Pages and the dev server, which supply nothing — so on a phone the public lab renders at desktop width and scales down to unreadable. `P-86`. This has been true since the repository went public and nobody looked, which is what "desktop first" quietly meant in practice.

**Two surfaces now exist, and the second can rot.** The landing shares scenario data with the lab, so an item's wording cannot drift between them; but nothing yet proves the landing renders every scenario the bank holds. `P-85` builds it, and the check belongs with it.

## Alternatives rejected

### Make the whole lab responsive

The tidy answer, and it costs the thing the product is for. A phone-sized canvas cannot show two lanes of ticker tape with readable gaps, or two falling balls with their landing times, or a reliability diagram with four distinguishable levels. Responsive layout would keep the pixels and lose the argument.

### Accept the mismatch and measure it

Ship desktop-first, watch what phone traffic does on arrival, decide with a number. Genuinely tempting, and it costs nothing today. Rejected because the number it would produce is already predictable — a viewer who taps a Short and gets an unreadable page leaves — and because measuring it means spending the channel's first months finding out.

### Phone first after all

Consistent with `R-016` and with where the audience is. Rejected on the same ground as the responsive option: it makes the canvas hardest exactly where the product lives. If the Phase 1 device check comes back saying the cohort has nothing but shared phones, this is the decision to reopen, and it will be a real reopening rather than a formality.

## Requirements addressed

* **`R-016` is amended by this ADR** — edited in place with a pointer here, not rewritten.
* `R-010` — the gate holds on both surfaces. This is the constraint that shaped the landing rather than one it had to accommodate.
* `R-021` — an item's outcome must be unambiguous to a naive viewer. On the landing the outcome is a recording, so it is the same run, not a re-simulation that might differ.

## Revisit when

* The Phase 1 device check happens. `R-016` is unconfirmed, and if the cohort's phones are all there is, the balance changes.
* The landing exists and the channel runs. If viewers predict on the phone and never open the lab, the landing is the product and this ADR has the emphasis backwards.
* Someone finds a canvas layout that works at 360 pixels without losing what the wide one shows. That would make this ADR unnecessary, which would be the best outcome.
