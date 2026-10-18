// SPDX-License-Identifier: AGPL-3.0-or-later
/**
 * Every check that stands between a generated scenario and a learner.
 *
 * ADR 0007 named four; this is all of them in one place: the schema, the
 * primitive and its controls, that the simulation settles at all, that its
 * state stays sane, and — the one that matters — **the answer check**. Run
 * the thing headlessly and refuse the scenario unless the option it marks
 * correct is what actually happened.
 *
 * It lives in lab/ rather than tools/ because of ADR 0023. Until now this ran
 * only in an offline harness; now it runs in the learner's own browser, in
 * front of everything a model composes at runtime. The model proposes; the
 * simulation decides. Nothing that fails here is ever rendered.
 *
 * One implementation, used by both, because two would drift and the one that
 * drifted would be the one nobody was measuring.
 */
import { validateScenario } from "./schema.mjs";
import { runHeadless } from "./run.mjs";
import { PRIMITIVES, resolveParams } from "../primitives/index.mjs";

export const CHECKS = ["schema", "primitive", "params", "completes", "invariants", "answer"];

export function verify(spec) {
  const fail = {};
  const note = (check, why) => (fail[check] ??= why);

  const v = validateScenario(spec);
  if (!v.ok) note("schema", v.errors[0]);

  const primitive = PRIMITIVES[spec.primitive];
  if (!primitive) {
    note("primitive", `unknown primitive "${spec.primitive}"`);
    return { fail, observed: null };
  }

  const known = primitive.controls.map((c) => c.key);
  for (const [k, val] of Object.entries(spec.params ?? {})) {
    const c = primitive.controls.find((x) => x.key === k);
    if (!c) { note("params", `"${k}" is not a control of ${primitive.id}`); continue; }
    if (val < c.min || val > c.max) note("params", `${k}=${val} outside [${c.min}, ${c.max}]`);
  }
  void known;

  const params = resolveParams(primitive, spec.params);
  let run;
  try {
    run = runHeadless(primitive, params);
  } catch (e) {
    note("completes", `threw: ${e.message}`);
    return { fail, observed: null };
  }
  if (!run.finished) note("completes", `never settled (${run.seconds.toFixed(1)}s budget)`);

  // invariants: nothing NaN, nothing absurd
  const numbers = [];
  const walk = (o, d = 0) => {
    if (d > 3 || o == null) return;
    if (typeof o === "number") numbers.push(o);
    else if (Array.isArray(o)) o.slice(0, 50).forEach((x) => walk(x, d + 1));
    else if (typeof o === "object") Object.values(o).forEach((x) => walk(x, d + 1));
  };
  walk(run.state);
  if (numbers.some((n) => Number.isNaN(n))) note("invariants", "state contains NaN");
  if (numbers.some((n) => !Number.isFinite(n))) note("invariants", "state contains a non-finite value");
  if (numbers.some((n) => Math.abs(n) > 1e9)) note("invariants", "state contains a runaway value");

  let observed = null;
  try {
    observed = primitive.classify(run.state, params);
  } catch (e) {
    note("answer", `classify threw: ${e.message}`);
  }
  if (observed === null) note("answer", "classify could not determine what happened");
  else if (observed !== spec.correct)
    note("answer", `claims "${spec.correct}", simulation produced "${observed}"`);

  return { fail, observed };
}
