// SPDX-License-Identifier: AGPL-3.0-or-later
/**
 * What a typed topic has to do with what we can actually simulate.
 *
 * P-95. Deliberately dumb word matching, and deliberately not a model: this
 * runs in the page, and the page calls nobody (ADR 0022 leaves the runtime
 * model seam to its own decision).
 *
 * The point of it is the NO. A learner who types "photosynthesis" must be
 * told we have nothing for it, because that is the honest state of the
 * product — six primitives across mechanics and two bits of algebra. Handing
 * them an unrelated list instead would be the shell lying about the thing it
 * is a shell for.
 */
import { CONCEPT_ORDER } from "../hub/home.mjs";

const TITLE = new Map(CONCEPT_ORDER);
const RANK = new Map(CONCEPT_ORDER.map(([id], i) => [id, i]));

/**
 * Words worth matching on. Four characters is the floor: it keeps "why", "do"
 * and "the" from matching everything, and it is the shortest word in the
 * vocabulary we actually have ("line", "fall", "push").
 */
function content(text) {
  return String(text ?? "")
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length >= 4);
}

/** "fall" and "falling" are the same word for this purpose; "fall" and "far" are not. */
const akin = (a, b) => a === b || (a.length >= 4 && b.startsWith(a)) || (b.length >= 4 && a.startsWith(b));

export function conceptsFor(topic, scenarios) {
  const asked = content(topic);
  if (!asked.length) return [];

  const byConcept = new Map();
  for (const spec of Object.values(scenarios)) {
    if (!spec.concept) continue;
    const entry = byConcept.get(spec.concept) ??
      { concept: spec.concept, subject: spec.subject,
        title: TITLE.get(spec.concept) ?? spec.concept, scenarios: [] };
    entry.scenarios.push({
      id: spec.id,
      question: spec.question,
      difficulty: spec.difficulty ?? null,
      path: `/s/${encodeURIComponent(spec.id)}`,
    });
    byConcept.set(spec.concept, entry);
  }

  const hit = [...byConcept.values()].filter((c) => {
    const vocabulary = [...content(c.title), ...content(c.concept), ...content(c.subject)];
    return asked.some((word) => vocabulary.some((known) => akin(word, known)));
  });

  return hit.sort((a, b) => (RANK.get(a.concept) ?? 99) - (RANK.get(b.concept) ?? 99));
}
