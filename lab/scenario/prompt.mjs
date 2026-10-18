// SPDX-License-Identifier: AGPL-3.0-or-later
/**
 * The contract a model is given, and how its reply is read back.
 *
 * This lives in lab/ rather than tools/ because of ADR 0023: the product now
 * composes scenarios at runtime, and **the prompt the spike measures must be
 * the prompt the product sends**. Two copies would drift, and the measurement
 * in research/05 would quietly stop describing what ships.
 *
 * Deliberately NOT in the prompt: which outcomes are actually reachable. Two
 * of the physics primitives answer the same at every setting, so telling the
 * model that would hand it the answer for half the items and inflate exactly
 * the number this exists to measure (P-50).
 *
 * Nothing here transmits. It builds a string and parses one — the only module
 * that may call out is lab/model/client.mjs, and privacy.test.mjs says so.
 */
import { PRIMITIVES } from "../primitives/index.mjs";

const TAGS = [
  "motion-implies-force", "heavier-falls-faster", "bigger-pushes-harder",
  "outward-in-circles", "things-naturally-stop", "force-is-stored",
  "special-case-reasoning", "sign-or-direction", "boundary-ignored",
];

export function buildPrompt(count = 20, only = null, topic = null) {
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
    // The learner's topic, when there is one (ADR 0023). Appended rather than
    // woven in, so that a prompt built without a topic is byte-identical to
    // the one research/05 measured — the spike must keep describing what ships.
    ...(topic ? [
      "",
      "## What the learner asked for",
      "",
      `They typed: ${JSON.stringify(String(topic))}`,
      "",
      "Compose items about that, using whichever primitives above can genuinely serve it.",
      "A primitive simulates what it simulates: do not relabel a falling ball as something else,",
      "and do not invent a primitive. If none of them can honestly serve that topic, return",
      '{ "scenarios": [] } and nothing else. An empty answer is correct and useful; a stretched',
      "one is not.",
    ] : []),
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
