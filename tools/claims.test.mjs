// SPDX-License-Identifier: AGPL-3.0-or-later
/**
 * The falsifiable claims in spec/02-requirements.md section 1 and the UNSETTLED
 * tuple in tools/check-docs.py have to name the same requirements.
 *
 * They were written by hand, separately, and nothing connected them. Add a
 * claim and forget the tuple, and check-docs.py quietly stops refusing ADRs
 * that rest on it — the guard fails open, which is the worst way to fail.
 * P-07 added a claim, which is how this got noticed.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");

/** Requirement ids in section 1 ("The falsifiable claims"), in order. */
function claimsInSpec() {
  const spec = read("spec/02-requirements.md");
  const section = spec.split(/^## /m).find((s) => s.startsWith("1. The falsifiable claims"));
  assert.ok(section, "spec/02-requirements.md has no section '1. The falsifiable claims'");
  return [...section.matchAll(/^\|\s*`(R-\d+)`/gm)].map((m) => m[1]);
}

/** Requirement ids in the UNSETTLED tuple in check-docs.py. */
function claimsInChecker() {
  const py = read("tools/check-docs.py");
  const m = py.match(/^UNSETTLED\s*=\s*\(([^)]*)\)/m);
  assert.ok(m, "tools/check-docs.py has no UNSETTLED tuple");
  return [...m[1].matchAll(/"(R-\d+)"/g)].map((x) => x[1]);
}

test("every falsifiable claim is one check-docs.py refuses to rest an ADR on", () => {
  assert.deepEqual(
    claimsInChecker(),
    claimsInSpec(),
    "spec/02-requirements.md section 1 and UNSETTLED in tools/check-docs.py disagree",
  );
});

test("an exploratory claim is marked as such in the requirements table", () => {
  const spec = read("spec/02-requirements.md");
  const section = spec.split(/^## /m).find((s) => s.startsWith("1. The falsifiable claims"));
  const exploratory = [...section.matchAll(/^\|\s*`(R-\d+)`[^\n]*\*\*Exploratory\*\*/gm)].map((m) => m[1]);
  // Not a rule about how many there are — a rule that the label is machine-readable,
  // so "exploratory" cannot become a word in prose that nothing enforces.
  for (const id of exploratory) {
    assert.ok(
      claimsInChecker().includes(id),
      `${id} is marked Exploratory but check-docs.py would let an ADR rest on it`,
    );
  }
});
