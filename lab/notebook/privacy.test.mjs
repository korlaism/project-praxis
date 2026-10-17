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
import { installDom } from "../harness/dom-stub.mjs";
import { openNotebook, memoryBackend } from "./store.mjs";
import truckFly from "../scenarios/truck-and-fly.mjs";

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
  // "reconciliation" (R-012, P-92) is the hardest addition this list will
  // take, and it was taken deliberately. It holds a child's own prose about
  // their own mistake — the single most sensitive thing in the dataset, and
  // K-06 exists because a persistent record of a child's mistakes is a
  // hazardous artefact. It is here because R-012 is a mechanic, not a
  // convenience: the gap written in their own words is the part of the design
  // closest to the evidence, and the dataset is the deliverable (R-014).
  // What keeps it safe is unchanged and tested above: it cannot leave the
  // device, it is theirs to destroy with forget(), and nothing but the learner
  // writes it (ADR 0002). If a hosted version is ever built, this field is the
  // reason that is a consent question and not a config change.
  //
  // "cue" (P-89) was added on purpose, against this comment. It records which
  // of two buttons the learner pressed after a wrong answer — one of four
  // fixed words, no free text, no new identifier, no timing the card does not
  // already carry. It is about what the learner did with this prediction's
  // reveal, which is what a card is for; ADR 0018 is why it exists.
  const ABOUT_THE_PREDICTION = new Set([
    "subject", "scenario", "choice", "confidence", "observed", "correct",
    "unlisted", "errorTag", "outcomeSource", "params", "committedAt",
    "revealedAt", "attempt", "retryOf", "cue",
    "reconciliation", "reconciledAt",
  ]);
  const unexpected = fields.filter((f) => !ABOUT_THE_PREDICTION.has(f));
  assert.deepEqual(unexpected, [],
    `new card fields must be justified against P-44 before they ship: ${unexpected.join(", ")}`);
});

test("a learner's own words never reach the URL", async () => {
  // The classic accident: prose in a query string or a fragment, where it
  // lands in history, in a shared link and in every screen recording. The lab
  // routes on location.hash, so this is a live hazard rather than a theory.
  const dom = installDom();
  const phrase = "I thought the heavy truck pushed harder than the little fly";
  try {
    const notebook = openNotebook({ backend: memoryBackend() });
    const { mountScenario } = await import("../scenario/mount.js?" + Math.random());
    mountScenario(truckFly, { notebook });
    dom.body.find((n) => n.id === "opt-truck").onclick();
    dom.tick(2000);
    dom.body.find((n) => n.tagName === "BUTTON" && n.textContent === "Show why").onclick();
    dom.body.find((n) => n.tagName === "TEXTAREA").value = phrase;
    dom.body.find((n) => n.tagName === "BUTTON" && n.textContent === "Save").onclick();

    assert.equal(notebook.cards("physics")[0].reconciliation, phrase, "it was filed at all");
    for (const where of ["hash", "search"])
      assert.ok(!String(location[where]).includes("heavy truck"),
        `the learner's words reached location.${where}`);
  } finally {
    dom.restore();
  }
});
