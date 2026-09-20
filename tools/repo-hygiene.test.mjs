// SPDX-License-Identifier: AGPL-3.0-or-later
/**
 * Checks that must hold before — and after — the repository is public.
 *
 * P-68. The tailnet address was hardcoded in four places. It is a CGNAT
 * address and never was an access risk, but it publishes the homelab layout
 * and makes the deploy script useless to anyone who is not us. The point of a
 * test rather than a one-off edit is that it cannot quietly come back.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const REPO = new URL("..", import.meta.url).pathname;

/** This file. It states the rule, so it is the one file allowed to spell it out. */
const SELF = "tools/repo-hygiene.test.mjs";

const tracked = () =>
  execFileSync("git", ["ls-files", "-z"], { cwd: REPO, encoding: "utf8" })
    .split("\0")
    .filter(Boolean)
    .filter((f) => !f.startsWith("dist/") && f !== SELF);

/**
 * The CGNAT range Tailscale assigns from: 100.64.x.x through 100.127.x.x.
 *
 * CI found this test matching its own comment, which it could do because the
 * range is written as an address. It passed locally for a worse reason: the
 * file was not yet tracked when it ran, so `git ls-files` did not return it.
 * A test that scans tracked files has to be committed before it has been
 * honestly run.
 */
const TAILNET = /\b100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\.\d{1,3}\.\d{1,3}\b/;

test("no tracked file hardcodes a tailnet address", () => {
  const offenders = [];
  for (const f of tracked()) {
    let body;
    try {
      body = readFileSync(new URL(`../${f}`, import.meta.url), "utf8");
    } catch {
      continue; // binary or unreadable — nothing to match
    }
    for (const [n, line] of body.split("\n").entries()) {
      if (TAILNET.test(line)) offenders.push(`${f}:${n + 1}  ${line.trim()}`);
    }
  }
  assert.deepEqual(
    offenders,
    [],
    `hardcoded tailnet address — use $PRAXIS_HOST:\n  ${offenders.join("\n  ")}`,
  );
});
