// SPDX-License-Identifier: MIT
/**
 * Generate, validate, repair — a loop rather than a single pass. P-51.
 *
 * The spike found that one mechanical repair took 65% of candidates to 95%,
 * because a validation error usually names its own fix. It also found the
 * shape of the danger: **a repair that makes a wrong item look right is worse
 * than a rejected one**, because nothing downstream will question it again.
 *
 * So every repair here is one where the validator has already established the
 * fact, and the fix is bookkeeping rather than judgment:
 *
 *   - a misconception tag sitting on the correct answer means nothing, so it
 *     goes;
 *   - a cue for a tag no option carries points at nobody, so it goes;
 *   - a stated answer that disagrees with the simulation is the claim that is
 *     wrong, not the run.
 *
 * Everything else is refused. Nothing here writes prose, invents an option or
 * changes what a scenario is about — those are the author's, and a distractor
 * written by a repair pass is one nobody chose the wording of.
 *
 * **What this cannot check**, and it matters: correcting `correct` makes an
 * item self-consistent, not sensible. The question may no longer be asking
 * about the thing the new answer answers. Every change is reported so a human
 * reads it; `changes` is not a log, it is the review queue.
 */
import { validateScenario } from "./schema.mjs";
import { runHeadless } from "./run.mjs";
import { PRIMITIVES, resolveParams } from "../primitives/index.mjs";

/** Run every check, exactly as tools/verify-scenarios.mjs does. */
export function inspect(spec) {
  const fail = {};
  const note = (check, why) => (fail[check] ??= why);

  const v = validateScenario(spec);
  if (!v.ok) note("schema", v.errors[0]);

  const primitive = PRIMITIVES[spec?.primitive];
  if (!primitive) {
    note("primitive", `unknown primitive ${JSON.stringify(spec?.primitive)}`);
    return { fail, observed: null };
  }

  let observed = null;
  try {
    const p = resolveParams(primitive, spec.params ?? {});
    const run = runHeadless(primitive, p);
    if (!run.finished) note("completes", "the run never settled");
    else {
      observed = primitive.classify(run.state, p);
      if (observed === null) note("completes", "finished but could not be classified");
      else if (!spec.options?.some((o) => o.id === observed))
        note("answer", `simulation produced "${observed}", which is not one of the options`);
      else if (observed !== spec.correct)
        note("answer", `claims "${spec.correct}", simulation produced "${observed}"`);
    }
  } catch (err) {
    note("completes", `threw: ${err.message}`);
  }
  return { fail, observed };
}

/**
 * One repair pass. Returns a NEW spec and what was changed, or null when there
 * is nothing honest to offer.
 */
export function autoRepair(spec, report) {
  const { fail, observed } = report;
  const changes = [];
  const next = structuredClone(spec);

  // 1 · the answer disagrees with the simulation, and the simulation wins —
  //     but only when what happened was actually on offer. Adding the missing
  //     option would be inventing the content of a choice.
  if (fail.answer && observed && next.options?.some((o) => o.id === observed) && next.correct !== observed) {
    changes.push(`correct: "${next.correct}" → "${observed}" (the simulation's outcome)`);
    next.correct = observed;
  }

  // 2 · a misconception tag on the correct answer names no wrong belief.
  if (next.errorTags && typeof next.errorTags === "object") {
    const ids = new Set((next.options ?? []).map((o) => o.id));
    for (const tag of Object.keys(next.errorTags)) {
      if (tag === next.correct) {
        changes.push(`errorTags: dropped "${tag}", which is the correct answer`);
        delete next.errorTags[tag];
      } else if (!ids.has(tag)) {
        changes.push(`errorTags: dropped "${tag}", which is not an option`);
        delete next.errorTags[tag];
      }
    }
  }

  // 3 · a cue keyed to a tag nothing carries can never be shown.
  if (next.cues && typeof next.cues === "object") {
    const tags = new Set(Object.values(next.errorTags ?? {}));
    for (const key of Object.keys(next.cues)) {
      if (!tags.has(key)) {
        changes.push(`cues: dropped "${key}", which no option carries`);
        delete next.cues[key];
      }
    }
  }

  return changes.length ? { spec: next, changes } : null;
}

/**
 * Validate, repair, validate again — up to `maxAttempts` times.
 *
 * `attempt` is the seam a real generator plugs into: hand it the spec and the
 * errors, get a revision back. The default is the mechanical repairer, which
 * needs no model and no key, so the loop is testable and deterministic on its
 * own (P-50 is the ticket for the model).
 */
export function repairLoop(spec, { attempt = autoRepair, maxAttempts = 4 } = {}) {
  let current = structuredClone(spec);
  const changes = [];

  for (let attempts = 1; attempts <= maxAttempts; attempts++) {
    const report = inspect(current);
    if (Object.keys(report.fail).length === 0)
      return { ok: true, spec: current, attempts, changes, fail: {}, observed: report.observed };

    if (attempts === maxAttempts) return { ok: false, spec: current, attempts, changes, fail: report.fail };

    const repaired = attempt(current, report);
    // Nothing offered, or nothing moved: stop rather than spin.
    if (!repaired || JSON.stringify(repaired.spec) === JSON.stringify(current))
      return { ok: false, spec: current, attempts, changes, fail: report.fail };

    current = repaired.spec;
    changes.push(...repaired.changes);
  }
  return { ok: false, spec: current, attempts: maxAttempts, changes, fail: inspect(current).fail };
}
