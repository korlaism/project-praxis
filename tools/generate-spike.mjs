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

export function buildPrompt() {
  const primitives = Object.values(PRIMITIVES).map((p) => ({
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
    "Emit a JSON array of exactly 20 objects. Each object:",
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
    "Spread the twenty across all four primitives. Return the JSON array and nothing else.",
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

async function generate(model, prompt) {
  const url = process.env.PRAXIS_MODEL_URL ?? "https://api.openai.com/v1/chat/completions";
  const key = process.env.PRAXIS_MODEL_KEY ?? process.env.OPENAI_API_KEY;
  if (!key) throw new Error("no model key — set PRAXIS_MODEL_KEY or OPENAI_API_KEY");
  const call = (extra) => fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
    body: JSON.stringify({ model, messages: [{ role: "user", content: prompt }], ...extra }),
  });

  // Ask for JSON where the provider understands the request, and carry on
  // where it does not: a local server's OpenAI-compatible endpoint often
  // rejects response_format, and that is not a reason to abandon the run.
  let res = await call({ response_format: { type: "json_object" } });
  if (!res.ok && res.status === 400) res = await call({});
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} from ${url}: ${(await res.text()).slice(0, 400)}`);
  const body = await res.json();
  return { text: body.choices?.[0]?.message?.content ?? "", usage: body.usage };
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
  const { text, usage } = from
    ? { text: readFileSync(from, "utf8"), usage: null }
    : await generate(model, prompt);
  // Keep what the model actually said. The first run of this parsed the wrong
  // array and there was nothing left to look at afterwards.
  const rawPath = `lab/scenarios/candidates/batch-02-${model}.raw.json`;
  if (!from) writeFileSync(rawPath, text);
  const specs = extractScenarios(text);
  const out = `lab/scenarios/candidates/batch-02-${model}.mjs`;
  writeFileSync(out, "// SPDX-License-Identifier: MIT\n" +
    `// Generated by ${model} from the contract alone (P-50). Not edited.\n` +
    `export default ${JSON.stringify(specs, null, 2)};\n`);
  console.error(`${specs.length} scenarios -> ${out}  (${usage?.total_tokens ?? "?"} tokens)`);
}
