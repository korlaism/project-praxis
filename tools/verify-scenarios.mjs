#!/usr/bin/env node
/**
 * Run candidate scenarios through every check in spec/07-generated-scenarios.md
 * and report how many pass unaided.
 *
 * Usage: node tools/verify-scenarios.mjs [--repair] <module exporting an array of specs>
 *
 * With --repair, each failing candidate goes round the generate-validate-repair
 * loop (P-51) and the report says how many attempts each needed. That number is
 * a better measure of generator quality than a single-pass rate.
 */
import { validateScenario } from "../lab/scenario/schema.mjs";
import { runHeadless } from "../lab/scenario/run.mjs";
import { PRIMITIVES, resolveParams } from "../lab/primitives/index.mjs";
import { repairLoop } from "../lab/scenario/repair.mjs";

const CHECKS = ["schema", "primitive", "params", "completes", "invariants", "answer"];

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

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const repairing = args.includes("--repair");
  const target = args.find((a) => !a.startsWith("--"));
  const mod = await import(new URL(target, `file://${process.cwd()}/`).href);
  const specs = mod.default;
  const rows = specs.map((s, i) => ({ i, s, ...verify(s) }));
  const clean = rows.filter((r) => Object.keys(r.fail).length === 0);

  console.log(`\n${specs.length} candidates\n`);
  for (const r of rows) {
    const ok = Object.keys(r.fail).length === 0;
    const id = `${String(r.i + 1).padStart(2)} ${r.s.primitive.padEnd(18)}`;
    if (ok) console.log(`  PASS  ${id}  -> ${r.observed}`);
    else {
      const first = CHECKS.find((c) => r.fail[c]);
      console.log(`  FAIL  ${id}  [${first}] ${r.fail[first]}`);
    }
  }
  const byCheck = Object.fromEntries(CHECKS.map((c) => [c, rows.filter((r) => r.fail[c]).length]));
  console.log(`\n  unaided pass rate: ${clean.length}/${specs.length}` +
              ` (${((clean.length / specs.length) * 100).toFixed(0)}%)`);
  console.log("  failures by check:", Object.entries(byCheck).filter(([, n]) => n).map(([c, n]) => `${c}=${n}`).join(" ") || "none");

  const byPrim = {};
  for (const r of rows) {
    const b = (byPrim[r.s.primitive] ??= { n: 0, ok: 0 });
    b.n++; if (Object.keys(r.fail).length === 0) b.ok++;
  }
  console.log("  by primitive:", Object.entries(byPrim).map(([p, b]) => `${p} ${b.ok}/${b.n}`).join("  "));

  // P-51 · the loop, not a single pass.
  if (repairing) {
  const loops = specs.map((s, i) => ({ i, ...repairLoop(s) }));
  const fixed = loops.filter((l) => l.ok);
  const answerChanged = loops.filter((l) => l.ok && l.changes.some((c) => c.startsWith("correct:")));

  const attempts = {};
  for (const l of fixed) attempts[l.attempts] = (attempts[l.attempts] ?? 0) + 1;

  console.log(`\n  after repair:      ${fixed.length}/${specs.length}` +
              ` (${((fixed.length / specs.length) * 100).toFixed(0)}%)`);
  console.log("  attempts needed:  ",
              Object.entries(attempts).map(([n, c]) => `${n}× for ${c}`).join(", ") || "none");

  const stuck = loops.filter((l) => !l.ok);
  for (const l of stuck)
    console.log(`  STUCK ${String(l.spec.id ?? `#${l.i + 1}`).padEnd(20)} [${Object.keys(l.fail)[0]}] ${Object.values(l.fail)[0]}`);

  // The number that decides whether any of this is trustworthy. A repaired
  // answer makes an item self-consistent, never sensible: the question may no
  // longer be asking about the thing the new answer answers, and no check can
  // see that. These are the ones a human has to read.
  console.log(`\n  NEEDS A HUMAN:     ${answerChanged.length} had their stated answer changed`);
  for (const l of answerChanged)
    console.log(`    ${String(l.spec.id ?? `#${l.i + 1}`).padEnd(20)} ${l.changes.filter((c) => c.startsWith("correct:"))[0]}`);
  }
}
