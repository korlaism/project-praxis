// SPDX-License-Identifier: AGPL-3.0-or-later
/**
 * The record does not leave the device.
 *
 * P-44. Everything about consent turns on what is actually collected, and
 * today the answer is nothing: no account, no server, no identifier, one
 * localStorage key. That is the strongest position this product will ever
 * have, and it is currently an accident of not having built the other thing
 * yet. This makes it a property, so that sending a child's prediction
 * somewhere becomes a decision someone has to take on purpose.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const BUILT = new URL("../../dist/index/", import.meta.url).pathname;

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}

/** Ways a page can talk to a server. Comments and strings are not calls. */
const TRANSPORTS = [
  /\bfetch\s*\(/,
  /\bnew\s+XMLHttpRequest\b/,
  /\bnew\s+WebSocket\b/,
  /\bnavigator\s*\.\s*sendBeacon\b/,
  /\bnew\s+EventSource\b/,
  /\bimport\s*\(\s*["'`]https?:/,
];

test("the built lab contains no way to send anything anywhere", () => {
  const offenders = [];
  for (const file of walk(BUILT).filter((f) => f.endsWith(".js") || f.endsWith(".mjs"))) {
    const body = readFileSync(file, "utf8");
    for (const [n, line] of body.split("\n").entries()) {
      // Strip line comments before matching: prose about fetch is not fetch.
      const code = line.replace(/\/\/.*$/, "").replace(/^\s*\*.*$/, "");
      for (const t of TRANSPORTS)
        if (t.test(code)) offenders.push(`${file.slice(BUILT.length)}:${n + 1}  ${line.trim()}`);
    }
  }
  assert.deepEqual(offenders, [], `the lab must not be able to transmit:\n  ${offenders.join("\n  ")}`);
});

test("a notebook card carries nothing that identifies a person", () => {
  const src = readFileSync(new URL("./store.mjs", import.meta.url), "utf8");
  const kept = src.match(/const KEPT = \[([\s\S]*?)\];/)[1];
  const fields = [...kept.matchAll(/"([^"]+)"/g)].map((m) => m[1]);

  // Not a blocklist of bad names — a whitelist of what a card is allowed to be
  // about. Anything new has to be justified here, in front of someone.
  const ABOUT_THE_PREDICTION = new Set([
    "subject", "scenario", "choice", "confidence", "observed", "correct",
    "unlisted", "errorTag", "outcomeSource", "params", "committedAt",
    "revealedAt", "attempt", "retryOf",
  ]);
  const unexpected = fields.filter((f) => !ABOUT_THE_PREDICTION.has(f));
  assert.deepEqual(unexpected, [],
    `new card fields must be justified against P-44 before they ship: ${unexpected.join(", ")}`);
});
