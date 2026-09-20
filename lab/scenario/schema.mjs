// SPDX-License-Identifier: MIT
/**
 * The scenario specification — the contract a generator must satisfy.
 *
 * A scenario is DATA, never code: which primitive, what parameters, the
 * question, the options, which one is correct, why. The physics belongs to the
 * primitive library, written once and tested once (ADR 0007).
 *
 * Validation accumulates every problem rather than throwing on the first, so a
 * generator gets one complete list to repair instead of a dozen round trips.
 */

export const SCHEMA_VERSION = 1;

export function validateScenario(spec) {
  const errors = [];
  const bad = (msg) => errors.push(msg);

  if (!spec || typeof spec !== "object") return { ok: false, errors: ["scenario must be an object"] };

  if (spec.schema !== SCHEMA_VERSION)
    bad(`unknown schema version ${JSON.stringify(spec.schema)} — this build understands ${SCHEMA_VERSION}`);

  // A scenario is either ours or wrapped. Ours runs a primitive we own and its
  // answer is checked against the simulation; a wrapped one embeds someone
  // else's simulation and its answer is only asserted (ADR 0009). A spec
  // claiming both would leave that difference ambiguous.
  const wrapped = spec.embed !== undefined;
  const mine = spec.primitive !== undefined;
  if (wrapped && mine) bad("a scenario is either ours (primitive) or wrapped (embed), never both");
  if (!wrapped && (typeof spec.primitive !== "string" || !spec.primitive))
    bad("primitive must name a primitive in the registry, or use embed for a wrapped simulation");

  if (wrapped) {
    const e = spec.embed;
    if (!e || typeof e !== "object") {
      bad("embed must be an object");
    } else {
      if (typeof e.src !== "string" || !e.src) bad("embed.src is required");
      else if (/^(https?:)?\/\//i.test(e.src))
        bad(`embed.src "${e.src}" is remote — self-host the simulation and use a relative path (ADR 0009)`);
      if (typeof e.title !== "string" || !e.title) bad("embed.title is required");
      const a = e.attribution;
      if (!a || typeof a !== "object") {
        bad("embed.attribution is required — the licence obliges visible credit");
      } else {
        for (const field of ["work", "author", "licence"])
          if (typeof a[field] !== "string" || !a[field]) bad(`embed.attribution.${field} is required`);
      }
    }
    if (spec.params !== undefined)
      bad("a wrapped scenario cannot carry params — the verdict cannot score a setup we do not own");
  }

  for (const field of ["question", "explain"]) {
    if (typeof spec[field] !== "string" || !spec[field].trim())
      bad(`${field} is required and must not be empty`);
  }
  if (spec.note !== undefined && typeof spec.note !== "string")
    bad("note must be a string when present");

  // Optional so a generator's first draft still validates. The notebook needs
  // both to file a card, so shipped scenarios are held to having them.
  for (const field of ["id", "subject"]) {
    if (spec[field] !== undefined && (typeof spec[field] !== "string" || !spec[field].trim()))
      bad(`${field} must be a non-empty string when present`);
  }

  // params
  if (spec.params === undefined && wrapped) {
    // a wrapped scenario has none, and is refused above if it tries
  } else if (!spec.params || typeof spec.params !== "object") {
    bad("params must be an object");
  } else {
    for (const [k, v] of Object.entries(spec.params)) {
      if (typeof v !== "number" || !Number.isFinite(v))
        bad(`param ${k} must be a finite number, got ${JSON.stringify(v)}`);
    }
  }

  // options
  const options = Array.isArray(spec.options) ? spec.options : null;
  let ids = [];
  if (!options) {
    bad("options must be an array");
  } else {
    if (options.length < 2) bad("a choice needs at least two options");
    if (options.length > 6) bad("more than six options is a menu, not a prediction");
    for (const [i, o] of options.entries()) {
      if (!o || typeof o.id !== "string" || !o.id) bad(`options[${i}].id is required`);
      else if (typeof o.label !== "string" || !o.label.trim()) bad(`options[${i}].label is required`);
      else ids.push(o.id);
    }
    if (new Set(ids).size !== ids.length) bad("option ids must be unique");
  }

  // correct
  if (typeof spec.correct !== "string" || !ids.includes(spec.correct))
    bad(`correct must name one of the options (${ids.join(", ") || "none valid"})`);

  // error tags
  if (spec.errorTags !== undefined) {
    if (typeof spec.errorTags !== "object" || spec.errorTags === null) {
      bad("errorTags must be an object mapping option id to a misconception tag");
    } else {
      for (const [id, tag] of Object.entries(spec.errorTags)) {
        if (!ids.includes(id)) bad(`errorTags names option "${id}", which does not exist`);
        else if (id === spec.correct)
          bad(`errorTags tags "${id}", which is the correct answer — a tag names the wrong belief behind a WRONG option`);
        if (typeof tag !== "string" || !tag.trim()) bad(`errorTags["${id}"] must be a non-empty tag`);
      }
    }
  }

  return { ok: errors.length === 0, errors };
}
