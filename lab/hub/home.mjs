/** What the lab's front page lists, as plain data. */
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
    (bySubject[spec.subject] ??= []).push({
      id: spec.id,
      question: spec.question,
      answered: answered[spec.id] ?? 0,
      // Everything stays inside one page: one origin, so one notebook (P-54).
      path: `/s/${encodeURIComponent(spec.id)}`,
    });
  }
  return {
    subjects: Object.keys(bySubject).sort().map((subject) => ({ subject, scenarios: bySubject[subject] })),
    totalCards,
    recordPath: "/record",
  };
}
