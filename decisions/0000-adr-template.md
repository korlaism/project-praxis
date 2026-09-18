# ADR Template

**Date:** YYYY-MM-DD **Status:** Proposed | Accepted | Superseded by NNNN | Open **Rests on:** judgment | `R-0NN`, …

`Rests on` is what makes the status honest, so fill it before anything else. `judgment` means this is a **design stance** — a direction chosen, whose consequences the pilot tests; it can be accepted whenever someone decides. Naming requirement ids from [Phase 0 Requirements](../spec/02-requirements.md) §1 means the decision is **wrong if that claim is false**, and it cannot be `Accepted` until the claim survives the run. Citing a §1 claim elsewhere in the ADR as context is fine; depending on one is what this field records.

## Context

What forces are in play. The constraint, the conflict, or the discovery that makes this a decision rather than a default. State facts and cite sources — landscape entries, papers, measurements. Keep opinions for the next section.

## Decision

What we are doing. Active voice, one paragraph, no hedging.

## Requirements addressed

* `R-000` — how this satisfies it.

An ADR that cites no requirement is solving a problem nobody asked about. If the requirement does not exist yet, add it to `spec/requirements.md` first.

## Alternatives rejected

### Option A

What it was, and the specific reason it lost. "We preferred the other one" is not a reason — name the requirement it failed, the cost it carried, or the assumption it made that does not hold here.

### Option B

…

## Consequences

What this costs. Include what it makes *harder* later, what it forecloses, and what new work it creates. If it forces a future decision, say which one.

## Revisit when

The condition that would make this decision wrong — a requirement changes, a benchmark comes back differently, a dependency is abandoned. Blank means "no known trigger", which is itself worth stating.
