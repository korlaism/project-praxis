#!/usr/bin/env node
// SPDX-License-Identifier: AGPL-3.0-or-later
/**
 * The generation spike, run against a model that has not seen the primitives.
 *
 * P-45 returned 65% unaided, but its candidates were written by the same agent
 * that wrote the primitives, so it is an upper bound rather than the number.
 * P-50 exists to get the real one: give a model **only the contract** — the
 * schema rules, each primitive's controls and the outcomes it can produce —
 * and nothing of the source, then run what it emits through every check.
 *
 * Deliberately NOT in the prompt: which outcomes are actually reachable. Two of
 * the four primitives answer the same at every setting, so telling the model
 * that would hand it the answer for half the items and inflate precisely the
 * number this exists to measure. It gets the declared outcome list, as P-50
 * says, and works out the rest.
 *
 * Usage:
 *   node tools/generate-spike.mjs --prompt            # print what would be sent
 *   node tools/generate-spike.mjs --model gpt-4o      # generate
 *
 * The provider is a seam, not an assumption (P-59): it speaks the OpenAI chat
 * completions shape, which most providers now offer, and both the endpoint and
 * the key come from the environment.
 *
 *   PRAXIS_MODEL_URL   default https://api.openai.com/v1/chat/completions
 *   PRAXIS_MODEL_KEY   falls back to OPENAI_API_KEY
 *
 * That matters here and not only in principle: the key on this machine is
 * scoped to embeddings, so every chat model returns 403. Any other compatible
 * endpoint — another vendor, a local server — runs the spike unchanged.
 *
 * What leaves this machine is the prompt below and nothing else. Every part of
 * it is already public in this repository.
 */
import { writeFileSync, readFileSync, existsSync } from "node:fs";
import { buildPrompt, extractScenarios } from "../lab/scenario/prompt.mjs";
// Needed by the per-primitive path below. P-96 moved buildPrompt into lab/
// and took this import with it, which broke that path and nothing noticed:
// the tests exercise the exported functions and never the CLI's own branch.
// collectPerPrimitive exists so that branch is a tested function too.
import { PRIMITIVES } from "../lab/primitives/index.mjs";

// Re-exported: these moved to lab/ under ADR 0023 so the product sends the
// same prompt this spike measures. The spike's own tests import them here.
export { buildPrompt, extractScenarios };

/**
 * One call to the provider. The only thing in this file that knows about HTTP.
 *
 * A failure carries its status, because everything above here decides what to
 * do from that number and nothing else. Losing it is what made every failure
 * fatal and indistinguishable: a rate limit is the provider saying "later",
 * and a 400 is the provider saying the request is wrong — sending that one
 * again spends money to be told so twice.
 */
export async function callModel(model, prompt, opts = {}) {
  const f = opts.fetch ?? globalThis.fetch;
  const url = opts.url ?? process.env.PRAXIS_MODEL_URL ?? "https://api.openai.com/v1/chat/completions";
  const key = opts.key ?? process.env.PRAXIS_MODEL_KEY ?? process.env.OPENAI_API_KEY;
  if (!key) throw new Error("no model key — set PRAXIS_MODEL_KEY or OPENAI_API_KEY");
  const call = (extra) => f(url, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
    body: JSON.stringify({ model, messages: [{ role: "user", content: prompt }], ...extra }),
  });

  // Ask for JSON where the provider understands the request, and carry on
  // where it does not: a local server's OpenAI-compatible endpoint often
  // rejects response_format, and that is not a reason to abandon the run.
  let res = await call({ response_format: { type: "json_object" } });
  if (!res.ok && res.status === 400) res = await call({});
  if (!res.ok) {
    const err = new Error(`${res.status} ${res.statusText} from ${url}: ${(await res.text()).slice(0, 400)}`);
    err.status = res.status;
    throw err;
  }
  const body = await res.json();
  return { text: body.choices?.[0]?.message?.content ?? "", usage: body.usage };
}

/** Worth asking again: the provider said "later", or "our fault". */
const RETRYABLE = new Set([408, 409, 429, 500, 502, 503, 504]);
const naplength = (attempt, base) => base * 2 ** (attempt - 1);
const nap = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Ask until the model answers, give up, or runs out of patience — and hand
 * back everything bought along the way (P-94).
 *
 * The loop this replaced had no try/catch at all. One 500 on the third of
 * four calls threw out of it, ended the process, and lost both replies
 * already paid for, because the transcript was only written at the end.
 * Against a local ollama that cost a retry. Against the endpoint P-90 is
 * waiting for it costs money, twice.
 *
 * @param call   (ask, n) => { text }, throwing an Error carrying .status
 * @param sleep  injected so a test can watch the back-off without living it
 */
export async function collect({ call, want = 20, batch = 5, attempts = 3,
                                sleep = nap, wait = 500 } = {}) {
  const specs = [], failures = [], seen = new Set();
  let raw = "";
  const maxCalls = Math.ceil(want / batch) + 2;

  for (let n = 1; specs.length < want && n <= maxCalls; n++) {
    const ask = Math.min(batch, want - specs.length);
    let text = null;
    for (let a = 1; a <= attempts; a++) {
      try {
        ({ text } = await call(ask, n));
        break;
      } catch (err) {
        failures.push({ call: n, attempt: a, status: err.status ?? null, message: err.message });
        if (!(RETRYABLE.has(err.status) && a < attempts)) break;
        await sleep(naplength(a, wait));
      }
    }
    if (text === null) continue;

    // Keep what it actually said, whatever happens next. The first P-50 run
    // parsed the wrong array and had nothing left to look at afterwards.
    raw += (raw ? "\n---\n" : "") + text;
    let got = [];
    try {
      got = extractScenarios(text);
    } catch (err) {
      failures.push({ call: n, status: null, message: err.message });
      continue;
    }
    for (const spec of got) {
      const id = String(spec.id ?? `item-${specs.length}`);
      if (seen.has(id)) continue;              // a repeat is not a new sample
      seen.add(id);
      specs.push(spec);
    }
  }
  return { specs, raw, failures };
}

/**
 * One call per primitive, `each` times over (P-50).
 *
 * Left to itself this generator wrote the same parameter-independent
 * primitive seven times out of seven, so the half of the corpus where the
 * answer must be derived went entirely unmeasured. Naming the primitive makes
 * the task no easier — the contract, the controls and the outcome list are
 * unchanged, and there is still no answer key.
 *
 * @param call  (primitiveId) => { text }
 */
export async function collectPerPrimitive({ call, each = 2, onPrimitive = () => {} } = {}) {
  const specs = [], failures = [];
  const seen = new Set();
  let raw = "";
  for (const id of Object.keys(PRIMITIVES)) {
    for (let i = 0; i < each; i++) {
      let got = [];
      try {
        const { text } = await call(id);
        raw += (raw ? "\n---\n" : "") + text;
        got = extractScenarios(text);
      } catch (err) {
        failures.push({ primitive: id, attempt: i + 1, status: err.status ?? null, message: err.message });
        continue;
      }
      for (const spec of got) {
        // Keyed by primitive AND id: two primitives may both call their first
        // item "item-1", and neither is a repeat of the other.
        const key = `${spec.primitive}:${spec.id}`;
        if (seen.has(key)) continue;
        seen.add(key);
        specs.push(spec);
      }
    }
    onPrimitive(id, specs.filter((s) => s.primitive === id).length);
  }
  return { specs, raw, failures };
}

/** One call with the same patience, for the per-primitive path. */
async function generate(model, prompt, { attempts = 3, sleep = nap, wait = 500 } = {}) {
  for (let a = 1; ; a++) {
    try {
      return await callModel(model, prompt);
    } catch (err) {
      if (!(RETRYABLE.has(err.status) && a < attempts)) throw err;
      await sleep(naplength(a, wait));
    }
  }
}

/**
 * Where a run's output goes. Dated rather than keyed on the model alone: a
 * second run of the same model used to overwrite the first silently, and did,
 * to P-50's own recorded output (P-102).
 */
export function outputPaths(model, label) {
  const stem = `lab/scenarios/candidates/batch-${label ?? new Date().toISOString().slice(0, 10)}-${model}`;
  return { out: `${stem}.mjs`, raw: `${stem}.raw.json` };
}

/**
 * Refuse to overwrite a previous run — BEFORE spending anything.
 *
 * The first version of this checked after generating, which is the worst of
 * both: it threw away sixteen scenarios and ninety minutes to protect a pair
 * of empty files left by a failed attempt (P-103). A guard that fires after
 * the expense has already destroyed the thing it was meant to protect.
 *
 * @returns {string[]} paths that are in the way, empty when it is safe
 */
export function refuseToClobber(paths, { exists = existsSync } = {}) {
  return [paths.out, paths.raw].filter((p) => exists(p));
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const prompt = buildPrompt();
  if (args.includes("--prompt")) {
    console.log(prompt);
    process.exit(0);
  }
  const model = args[args.indexOf("--model") + 1] ?? "gpt-4o";
  const label = args.includes("--label") ? args[args.indexOf("--label") + 1] : null;
  const paths = outputPaths(model, label);

  // Before the first call, not after the last one.
  if (!args.includes("--prompt") && !args.includes("--overwrite")) {
    const inTheWay = refuseToClobber(paths);
    if (inTheWay.length) {
      console.error(`\n  these already exist:\n    ${inTheWay.join("\n    ")}`);
      console.error("\n  A previous run's output is evidence. Pass --label <name> for this one,");
      console.error("  or --overwrite only if you mean to discard what is there.");
      console.error("  Nothing has been generated, so nothing has been spent.");
      process.exit(1);
    }
  }

  // --from re-reads a reply already saved, so a parsing fix costs nothing to
  // re-apply and the sample stays the one the model actually produced.
  const from = args.includes("--from") ? args[args.indexOf("--from") + 1] : null;
  const want = Number(args.includes("--count") ? args[args.indexOf("--count") + 1] : 20);
  // A small model asked for twenty objects in one reply returns one, whatever
  // the instruction says. Asking in batches is a harness detail, not a change
  // to what is being measured: it still composes each item from the contract
  // alone, and every item still faces the same checks.
  const batch = Number(args.includes("--batch") ? args[args.indexOf("--batch") + 1] : 5);

  // Naming one primitive per call. Left to itself this model returns a single
  // scenario per reply and the same primitive every time — seven calls gave
  // four items, all circular-release, so the half of the corpus where the
  // answer must be derived went entirely unmeasured. Naming the primitive
  // makes the task no easier: the contract, the controls and the outcome list
  // are unchanged, and there is still no answer key.
  const perPrimitive = Number(args.includes("--per-primitive")
    ? args[args.indexOf("--per-primitive") + 1] : 0);

  let specs = [];
  let raw = "";
  let failed = [];
  if (from) {
    raw = readFileSync(from, "utf8");
    specs = extractScenarios(raw);
  } else if (perPrimitive) {
    const r = await collectPerPrimitive({
      call: (id) => generate(model, buildPrompt(1, id)),
      each: perPrimitive,
      onPrimitive: (id, n) => console.error(`  ${id}: ${n} unique`),
    });
    specs = r.specs;
    raw = r.raw;
    failed = r.failures;
  } else {
    const r = await collect({
      call: async (ask, n) => {
        const out = await callModel(model, buildPrompt(ask));
        console.error(`  call ${n}: asked ${ask}`);
        return out;
      },
      want, batch,
    });
    specs = r.specs;
    raw = r.raw;
    failed = r.failures;
  }

  // A run that lost calls says so. Silence here reads as a model that produced
  // nothing, when what happened was an endpoint that refused to answer.
  for (const f of failed)
    console.error(`  call ${f.call}${f.attempt ? ` try ${f.attempt}` : ""}: ` +
                  `${f.status ?? "unparseable"} — ${String(f.message).slice(0, 90)}`);
  if (failed.length) console.error(`  ${failed.length} call(s) lost`);

  // Where it goes was decided before the first call (see outputPaths /
  // refuseToClobber above the main block). Writing is the cheap part.
  if (!from) writeFileSync(paths.raw, raw);
  writeFileSync(paths.out, "// SPDX-License-Identifier: MIT\n" +
    `// Generated by ${model} from the contract alone. Not edited.\n` +
    `export default ${JSON.stringify(specs, null, 2)};\n`);
  console.error(`${specs.length} scenarios -> ${paths.out}`);
}
