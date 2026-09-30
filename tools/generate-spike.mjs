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
import { writeFileSync } from "node:fs";
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

async function generate(model, prompt) {
  const url = process.env.PRAXIS_MODEL_URL ?? "https://api.openai.com/v1/chat/completions";
  const key = process.env.PRAXIS_MODEL_KEY ?? process.env.OPENAI_API_KEY;
  if (!key) throw new Error("no model key — set PRAXIS_MODEL_KEY or OPENAI_API_KEY");
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
    }),
  });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} from ${url}: ${(await res.text()).slice(0, 400)}`);
  const body = await res.json();
  return { text: body.choices[0].message.content, usage: body.usage };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const prompt = buildPrompt();
  if (args.includes("--prompt")) {
    console.log(prompt);
    process.exit(0);
  }
  const model = args[args.indexOf("--model") + 1] ?? "gpt-4o";
  const { text, usage } = await generate(model, prompt);
  const parsed = JSON.parse(text);
  const specs = Array.isArray(parsed) ? parsed : (parsed.scenarios ?? parsed.items ?? Object.values(parsed)[0]);
  const out = `lab/scenarios/candidates/batch-02-${model}.mjs`;
  writeFileSync(out, "// SPDX-License-Identifier: MIT\n" +
    `// Generated by ${model} from the contract alone (P-50). Not edited.\n` +
    `export default ${JSON.stringify(specs, null, 2)};\n`);
  console.error(`${specs.length} scenarios -> ${out}  (${usage?.total_tokens ?? "?"} tokens)`);
}
