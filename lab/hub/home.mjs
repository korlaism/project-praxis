// SPDX-License-Identifier: AGPL-3.0-or-later
/** What the lab's front page lists, as plain data. */

/**
 * The pilot's weekly order (spec/03-pilot-design.md), which is also the order
 * these build on each other: motion first, because everything else assumes it.
 * Alphabetical would put circular motion second, in front of the idea it needs.
 */
const CONCEPT_ORDER = [
  ["motion-without-force", "Motion without force"],
  ["falling",              "Falling"],
  ["action-and-reaction",  "Action and reaction"],
  ["circular-motion",      "Circular motion"],
  ["friction-and-inertia", "Friction and inertia"],
];
const TITLE = new Map(CONCEPT_ORDER);
const RANK = new Map(CONCEPT_ORDER.map(([id], i) => [id, i]));

export function homeModel(notebook, scenarios) {
  const answered = {};
  let totalCards = 0;
  for (const subject of notebook.subjects()) {
    for (const c of notebook.cards(subject)) {
      answered[c.scenario] = (answered[c.scenario] ?? 0) + 1;
      totalCards++;
    }
  }

  const bySubject = {};
  for (const spec of Object.values(scenarios)) {
    // An untagged scenario would simply not appear, so it is refused loudly
    // rather than quietly dropped from the only page that links to it.
    if (!spec.concept) throw new Error(`scenario "${spec.id}" has no concept and could not be listed`);
    ((bySubject[spec.subject] ??= {})[spec.concept] ??= []).push({
      id: spec.id,
      question: spec.question,
      difficulty: spec.difficulty ?? null,
      answered: answered[spec.id] ?? 0,
      // Everything stays inside one page: one origin, so one notebook (P-54).
      path: `/s/${encodeURIComponent(spec.id)}`,
    });
  }

  const subjects = Object.keys(bySubject).sort().map((subject) => {
    const concepts = Object.entries(bySubject[subject])
      .sort(([a], [b]) => (RANK.get(a) ?? 99) - (RANK.get(b) ?? 99))
      .map(([concept, list]) => ({
        concept,
        title: TITLE.get(concept) ?? concept,
        scenarios: list,
        total: list.length,
        // How many of this concept's items have been tried at all — not how
        // many were right. The record page is where being right is discussed.
        answered: list.filter((s) => s.answered > 0).length,
      }));
    return { subject, concepts, scenarios: concepts.flatMap((c) => c.scenarios) };
  });

  return { subjects, totalCards, recordPath: "/record" };
}
