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
import { writeFileSync, readFileSync } from "node:fs";
import { PRIMITIVES } from "../lab/primitives/index.mjs";

const TAGS = [
  "motion-implies-force", "heavier-falls-faster", "bigger-pushes-harder",
  "outward-in-circles", "things-naturally-stop", "force-is-stored",
  "special-case-reasoning", "sign-or-direction", "boundary-ignored",
];

export function buildPrompt(count = 20, only = null) {
  const primitives = Object.values(PRIMITIVES)
    .filter((p) => !only || p.id === only)
    .map((p) => ({
    primitive: p.id,
    controls: p.controls.map((c) => ({ key: c.key, min: c.min, max: c.max, step: c.step, unit: (c.unit ?? "").trim() })),
    outcomes: Object.fromEntries(p.outcomes.map((o) => [o, p.outcomeText[o]])),
  }));

  return [
    "You are writing prediction items for a physics lab aimed at 11-15 year olds.",
    "",
    "Each item names a simulation primitive and a set of parameters. The simulation is then run,",
    "and the option you marked `correct` must be the outcome it actually produces. You cannot see",
    "the source; you have the controls and the outcomes below and nothing else.",
    "",
    "## The contract",
    "",
    `Emit a JSON array of exactly ${count} ${count === 1 ? "object" : "objects"}. Each object:`,
    "",
    '  schema      1',
    '  id          a short kebab-case id, unique across the twenty',
    '  subject     "physics"',
    '  primitive   one of the primitive names below',
    '  params      an object giving a value for EVERY control of that primitive, within min..max',
    '  question    what the learner is asked, in plain language',
    '  note        optional one line of framing',
    '  options     2 to 6 objects of { id, label }. Option ids MUST be outcome ids of that primitive,',
    '              and the outcome the simulation produces MUST be among them',
    '  correct     the option id the simulation will produce for these params',
    '  errorTags   { option id -> misconception tag } for WRONG options only.',
    '              Tagging the correct option is rejected. Tags must come from the list below.',
    '  explain     why the outcome happens',
    "",
    "Rules that reject an item outright: a tag on the correct option; an option id that is not an",
    "outcome of that primitive; a params value outside a control's range; a `correct` that is not",
    "what the simulation produces.",
    "",
    "## Misconception tags",
    "",
    TAGS.map((t) => `  ${t}`).join("\n"),
    "",
    "## The primitives",
    "",
    "```json",
    JSON.stringify(primitives, null, 2),
    "```",
    "",
    "## One worked example, for shape only",
    "",
    "The primitive below is **invented** and is not available to you. It is here to show the",
    "exact shape of an object — nothing about its physics transfers, and no answer in it is a",
    "hint about any real primitive.",
    "",
    "```json",
    JSON.stringify([{
      schema: 1,
      id: "a-kettle-on-a-hob",
      subject: "physics",
      primitive: "example-only-not-real",
      params: { heat: 2.5, water: 0.8 },
      question: "The hob is on full. What does the water do first?",
      note: "One line of framing, optional.",
      options: [
        { id: "boils", label: "It boils" },
        { id: "steams", label: "It steams without boiling" },
        { id: "nothing", label: "Nothing happens" },
      ],
      correct: "boils",
      errorTags: { steams: "boundary-ignored", nothing: "special-case-reasoning" },
      explain: "Why the outcome happens, in a sentence or two.",
    }], null, 2),
    "```",
    "",
    `That array holds **one** object only to keep the example short. **Yours holds ${count}.**`,
    "The example showed the shape of an item, not how many to write.",
    "",
    "Note what that example does, because items are rejected for getting these wrong:",
    "",
    "  - `schema` is present and is the number 1",
    "  - every option id is an **outcome id of the primitive, spelled exactly** — not a variant",
    "    of it. If an outcome is `together`, the option id is `together`, never `together_outcome`",
    "  - `correct` is one of those option ids",
    "  - `errorTags` names only WRONG options, and the correct one never appears there",
    "  - `params` gives a value for every control, inside its range",
    "",
    only
      ? `Write ${count === 1 ? "it" : `all ${count}`} for the primitive **${only}**. Return the JSON array and nothing else.`
      : `Spread the ${count} across the four primitives. Return the JSON array and nothing else.`,
  ].join("\n");
}

/**
 * Pull the array of scenarios out of whatever the model returned.
 *
 * Deliberately forgiving about SHAPE and not at all about CONTENT: a model
 * that wraps its answer in a markdown fence or an envelope object has not made
 * a mistake worth failing the run over, and every actual claim it makes is
 * about to be checked anyway. Nothing here repairs a scenario — that is P-51's
 * job, and it is reported separately so the unaided number stays honest.
 */
const looksLikeScenario = (x) =>
  x && typeof x === "object" && !Array.isArray(x) &&
  ("primitive" in x || "question" in x || "correct" in x);

export function extractScenarios(text) {
  let body = text.trim();
  const fence = body.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) body = fence[1].trim();
  const start = body.search(/[[{]/);
  if (start > 0) body = body.slice(start);
  const parsed = JSON.parse(body);

  // Find the array of SCENARIOS, not merely the first array in the reply.
  // Asking for response_format json_object forces a top-level object, so the
  // array is always nested — and "first array found" picked the `options` of
  // scenario one, which looked like four successful scenarios and was nothing
  // of the kind.
  const found = [];
  (function walk(node, depth) {
    if (depth > 6 || !node || typeof node !== "object") return;
    if (Array.isArray(node)) {
      if (node.length && node.every(looksLikeScenario)) found.push(node);
      for (const v of node) walk(v, depth + 1);
      return;
    }
    for (const v of Object.values(node)) walk(v, depth + 1);
  })(parsed, 0);

  if (found.length) return found.sort((a, b) => b.length - a.length)[0];

  // A dict of scenarios, keyed "0", "1", "2"… json_object mode cannot return a
  // bare array, so a model asked for twenty often numbers them instead. There
  // is no array anywhere in that reply and the walk above finds nothing.
  const values = Object.values(parsed ?? {});
  if (values.length > 1 && values.every(looksLikeScenario)) return values;

  if (looksLikeScenario(parsed)) return [parsed];              // a single one, unwrapped
  throw new Error(`no scenarios in the reply: ${body.slice(0, 300)}`);
}

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

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const prompt = buildPrompt();
  if (args.includes("--prompt")) {
    console.log(prompt);
    process.exit(0);
  }
  const model = args[args.indexOf("--model") + 1] ?? "gpt-4o";

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
    const seen = new Set();
    for (const id of Object.keys(PRIMITIVES)) {
      for (let i = 0; i < perPrimitive; i++) {
        let got = [];
        try {
          const { text } = await generate(model, buildPrompt(1, id));
          raw += (raw ? "\n---\n" : "") + text;
          got = extractScenarios(text);
        } catch (err) { console.error(`  ${id} ${i + 1}: ${err.message.slice(0, 80)}`); continue; }
        for (const s of got) {
          const key = `${s.primitive}:${s.id}`;
          if (seen.has(key)) continue;
          seen.add(key);
          specs.push(s);
        }
      }
      console.error(`  ${id}: ${specs.filter((s) => s.primitive === id).length} unique`);
    }
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

  if (!from) writeFileSync(`lab/scenarios/candidates/batch-02-${model}.raw.json`, raw);
  const out = `lab/scenarios/candidates/batch-02-${model}.mjs`;
  writeFileSync(out, "// SPDX-License-Identifier: MIT\n" +
    `// Generated by ${model} from the contract alone (P-50). Not edited.\n` +
    `export default ${JSON.stringify(specs, null, 2)};\n`);
  console.error(`${specs.length} scenarios -> ${out}`);
}
