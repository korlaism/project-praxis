// SPDX-License-Identifier: AGPL-3.0-or-later
/**
 * Compose scenarios for a topic, and let the simulation decide which survive.
 *
 * ADR 0023. This is ADR 0007's Tier 1 arriving in the product: the model is
 * given the primitive contract and the learner's topic, it returns scenario
 * SPECIFICATIONS, and every one of them is run headlessly in this browser
 * before anything reaches the page. The model proposes; the simulation
 * decides.
 *
 * That ordering is the whole safety argument. research/05 measured a local
 * 7B at 0 of 7 on the half of the corpus where the answer must be derived, so
 * the expected case is a model that is often wrong — and the right failure
 * for a wrong model is nothing on screen, not something plausible and false.
 *
 * Nothing here transmits. It is handed an `ask` function, which in the product
 * is lab/model/client.mjs and in tests is a stub.
 */
import { buildPrompt, extractScenarios } from "../scenario/prompt.mjs";
import { verify } from "../scenario/verify.mjs";
import { SCENARIOS } from "../scenarios/index.mjs";
import { ask as askModel } from "./client.mjs";

/** Generated ids are namespaced: one must never shadow a shipped scenario. */
function uniqueId(raw, taken) {
  // Strip any gen- the model already put there, then add exactly one, so an
  // id is namespaced once however it arrives.
  const stem = String(raw ?? "item").replace(/^gen-/i, "").replace(/[^a-z0-9-]/gi, "-").slice(0, 40);
  const base = `gen-${stem || "item"}`;
  let id = base;
  for (let n = 2; taken.has(id) || SCENARIOS[id]; n++) id = `${base}-${n}`;
  return id;
}

/**
 * @param topic     what the learner typed
 * @param settings  their endpoint, key and model name
 * @param ask       (prompt, settings) => reply text; the one thing that calls out
 * @param want      how many to ask for
 */
export async function composeFor(topic, { settings, ask = askModel, want = 3, notes = [] } = {}) {
  // Only the notes the learner picked for THIS request (ADR 0024). Nothing is
  // remembered between composes and nothing is selected by default, so with
  // no choice made the prompt is byte-identical to one built before any of
  // this existed.
  const prompt = buildPrompt(want, null, topic, notes);

  let reply;
  try {
    reply = await ask(prompt, settings);
  } catch (err) {
    return { ok: false, error: err.message, scenarios: [], rejected: [], asked: 0 };
  }

  let proposed;
  try {
    proposed = extractScenarios(reply);
  } catch (err) {
    // An empty answer is a correct answer — the prompt asks for one when no
    // primitive can honestly serve the topic — and extractScenarios cannot
    // tell an empty list from prose, because there is nothing in either.
    if (/"scenarios"\s*:\s*\[\s*\]/.test(reply)) 
      return { ok: true, scenarios: [], rejected: [], asked: 0 };
    return { ok: false, error: `the reply could not be read: ${err.message}`, scenarios: [], rejected: [], asked: 0 };
  }

  const taken = new Set();
  const scenarios = [];
  const rejected = [];
  for (const spec of proposed) {
    const candidate = { ...spec, id: uniqueId(spec.id, taken), generated: true };
    const { fail } = verify(candidate);
    if (Object.keys(fail).length) { rejected.push({ spec: candidate, fail }); continue; }
    taken.add(candidate.id);
    scenarios.push(candidate);
  }
  return { ok: true, scenarios, rejected, asked: proposed.length };
}
