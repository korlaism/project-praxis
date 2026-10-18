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
import { PRIMITIVES } from "../lab/primitives/index.mjs";
import { isParameterIndependent } from "../lab/scenario/run.mjs";
import { repairLoop } from "../lab/scenario/repair.mjs";
import { verify, CHECKS } from "../lab/scenario/verify.mjs";

// Re-exported: the checks moved to lab/ under ADR 0023 so the browser runs the
// same gate this tool reports on.
export { verify, CHECKS };

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

  // P-50. Two of our primitives answer the same at every setting, so a
  // generator can be right about them without deriving anything. Reporting one
  // rate over all four reads much better than the generator deserves.
  const split = { fixed: { n: 0, ok: 0 }, derived: { n: 0, ok: 0 } };
  for (const r of rows) {
    const prim = PRIMITIVES[r.s.primitive];
    if (!prim) continue;
    const bucket = isParameterIndependent(prim) ? split.fixed : split.derived;
    bucket.n++;
    if (Object.keys(r.fail).length === 0) bucket.ok++;
  }
  const pct = (b) => (b.n ? `${b.ok}/${b.n} (${((b.ok / b.n) * 100).toFixed(0)}%)` : "none");
  console.log(`\n  where the answer cannot vary:  ${pct(split.fixed)}`);
  console.log(`  where it must be derived:      ${pct(split.derived)}`);

  // P-102. P-50's 0/7 on the derived side came entirely from mechanics, which
  // left it ambiguous: bad at deriving, or bad at pucks? With ten primitives
  // across four subjects that is answerable inside one run — provided the
  // derived half is reported per subject rather than as one number.
  //
  // The subject comes from the PRIMITIVE, which is ours, not from the
  // scenario, which the model wrote. The two can disagree; that is reported
  // below rather than treated as a failure, because adding a check mid-stream
  // would make this run incomparable to the one it exists to follow up.
  const bySubject = {};
  let mislabelled = 0;
  for (const r of rows) {
    const prim = PRIMITIVES[r.s.primitive];
    if (!prim) continue;
    if (r.s.subject && r.s.subject !== prim.subject) mislabelled++;
    const b = (bySubject[prim.subject] ??= { fixed: { n: 0, ok: 0 }, derived: { n: 0, ok: 0 } });
    const bucket = isParameterIndependent(prim) ? b.fixed : b.derived;
    bucket.n++;
    if (Object.keys(r.fail).length === 0) bucket.ok++;
  }
  console.log("\n  the derived half, by subject:");
  for (const [subject, b] of Object.entries(bySubject).sort())
    console.log(`    ${subject.padEnd(10)} derived ${pct(b.derived).padEnd(16)}` +
                (b.fixed.n ? `  (fixed ${pct(b.fixed)})` : ""));
  if (mislabelled)
    console.log(`\n  ${mislabelled} scenario(s) named a subject their primitive does not belong to`);

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
