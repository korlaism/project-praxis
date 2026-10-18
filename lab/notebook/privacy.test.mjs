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

/**
 * Ways a page can talk to a server. Comments are not code.
 *
 * These match the NAME, not the call. The first version matched `fetch(` and
 * would have missed `const f = opts.fetch ?? globalThis.fetch; f(url)` — which
 * is exactly how lab/model/client.mjs is written, so the narrowed guard below
 * passed for the wrong reason until its own "the seam still transmits" check
 * failed. A module that so much as names one of these is transmitting as far
 * as this test is concerned, and that is the right level of paranoia for it.
 */
const IMPORT_URL = /\bimport\s*\(\s*["'`]https?:/;
const TRANSPORTS = [
  /\bfetch\b/,
  /\bXMLHttpRequest\b/,
  /\bWebSocket\b/,
  /\bsendBeacon\b/,
  /\bEventSource\b/,
  IMPORT_URL,
];

/** Everything between quotes, gone. Prose is not a call. */
function withoutStrings(code) {
  return code.replace(/(["'`])(?:\\.|(?!\1)[^\\])*\1/g, '""');
}

/**
 * The one module allowed to transmit (ADR 0023).
 *
 * This test used to read "the built lab contains no way to send anything
 * anywhere", which was the strongest privacy position this project will ever
 * have. The product needs a model at runtime, so it is narrowed here — in the
 * open, with an ADR, rather than deleted the day it became inconvenient.
 *
 * What it still catches is the thing it was written for: a prediction, a note
 * or a confusion entry being sent somewhere by code nobody reviewed.
 */
const MAY_TRANSMIT = "model/client.mjs";

test("only one module in the built lab can send anything anywhere", () => {
  const offenders = [];
  let allowed = 0;
  for (const file of walk(BUILT).filter((f) => f.endsWith(".js") || f.endsWith(".mjs"))) {
    const where = file.slice(BUILT.length);
    const body = readFileSync(file, "utf8");
    for (const [n, line] of body.split("\n").entries()) {
      // Comments are not code, and neither are strings. The name-based
      // patterns above matched the English word "fetch" in a scenario's own
      // question — "does the order change what memory has to fetch?" — and
      // reported four bank items as transmitting. A page cannot call anything
      // by writing its name inside a quote.
      const code = line.replace(/\/\/.*$/, "").replace(/^\s*\*.*$/, "");
      for (const t of TRANSPORTS) {
        // The dynamic-import rule needs the URL, which lives in the string.
        const against = t === IMPORT_URL ? code : withoutStrings(code);
        if (!t.test(against)) continue;
        if (where === MAY_TRANSMIT) allowed++;
        else offenders.push(`${where}:${n + 1}  ${line.trim()}`);
      }
    }
  }
  assert.deepEqual(offenders, [],
    `only ${MAY_TRANSMIT} may transmit, and these also do:\n  ${offenders.join("\n  ")}`);
  // A narrowing that stopped matching anything would pass for the wrong
  // reason — and would hide the day the seam moved somewhere else.
  assert.ok(allowed > 0, `${MAY_TRANSMIT} no longer transmits — has the seam moved?`);
});

test("the notebook and the session notes are not reachable from the module that transmits", () => {
  // ADR 0023 §4. The seam carries the topic and the primitive contract. It
  // must not be able to reach the record even by accident, and the cheapest
  // durable way to say that is that it does not import it.
  const client = readFileSync(new URL("../model/client.mjs", import.meta.url), "utf8");
  for (const forbidden of ["notebook/store", "session/store", "openNotebook", "openSessions"])
    assert.ok(!client.includes(forbidden),
      `lab/model/client.mjs reaches ${forbidden}; what leaves the device must stay nameable`);
});

test("a notebook card carries nothing that identifies a person", () => {
  const src = readFileSync(new URL("./store.mjs", import.meta.url), "utf8");
  const kept = src.match(/const KEPT = \[([\s\S]*?)\];/)[1];
  const fields = [...kept.matchAll(/"([^"]+)"/g)].map((m) => m[1]);

  // Not a blocklist of bad names — a whitelist of what a card is allowed to be
  // about. Anything new has to be justified here, in front of someone.
  // "session" (P-95) is the id of the session the prediction was made in —
  // a container the learner created by typing a topic, living in the same
  // browser, destroyed with it. It identifies a piece of work, never a
  // person, and it is what lets the record be read a topic at a time.
  //
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
    "reconciliation", "reconciledAt", "session",
  ]);
  const unexpected = fields.filter((f) => !ABOUT_THE_PREDICTION.has(f));
  assert.deepEqual(unexpected, [],
    `new card fields must be justified against P-44 before they ship: ${unexpected.join(", ")}`);
});

test("a confusion entry carries nothing that identifies a person either", () => {
  // The card whitelist above guards one shape. A second record type reusing
  // that test would have been a second shape nobody looked at — which is
  // precisely how a whitelist fails open. R-013 added this log; this is its
  // own gate, and anything new in it is justified here, in front of someone.
  const src = readFileSync(new URL("./store.mjs", import.meta.url), "utf8");
  const kept = src.match(/const CONFUSION_KEPT = \[([\s\S]*?)\];/)[1];
  const fields = [...kept.matchAll(/"([^"]+)"/g)].map((m) => m[1]);

  // "text" is a child's own words about what is confusing them, and it is
  // optional on purpose — spec/04 says a tap with no words is still the
  // signal. Everything else points at what was on screen, not at who was
  // looking. No learner id: there is no account, and the whole log lives on
  // the one device, where forget() takes it with the subject.
  const ABOUT_THE_CONFUSION = new Set(["subject", "scenario", "card", "text"]);
  const unexpected = fields.filter((f) => !ABOUT_THE_CONFUSION.has(f));
  assert.deepEqual(unexpected, [],
    `new confusion fields must be justified against P-44 before they ship: ${unexpected.join(", ")}`);
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
