// SPDX-License-Identifier: AGPL-3.0-or-later
/**
 * What a session page and the home list show, as plain data (P-95).
 *
 * Separated from the DOM for the reason every model here is: the interesting
 * decisions — which simulations belong to this topic, and what to say when
 * none do — are testable without a browser.
 */
import { conceptsFor } from "./topics.mjs";
import { CONCEPT_ORDER } from "../hub/home.mjs";

const TITLE = new Map(CONCEPT_ORDER);

/** Predictions filed from inside one session. */
function predictionsIn(notebook, sessionId) {
  let n = 0;
  for (const subject of notebook.subjects())
    for (const card of notebook.cards(subject))
      if (card.session === sessionId) n++;
  return n;
}

/** Every concept we can actually simulate, for when a topic matches nothing. */
function everything(scenarios) {
  const seen = new Map();
  for (const spec of Object.values(scenarios)) {
    if (!spec.concept || seen.has(spec.concept)) continue;
    seen.set(spec.concept, {
      concept: spec.concept,
      subject: spec.subject,
      title: TITLE.get(spec.concept) ?? spec.concept,
    });
  }
  return [...seen.values()];
}

export function sessionModel(session, { scenarios, notebook }) {
  const concepts = conceptsFor(session.topic, scenarios).map((c) => ({
    ...c,
    // The session travels in the address, so leaving a simulation returns to
    // the session it was opened from and the card knows where it was made.
    scenarios: c.scenarios.map((s) => ({ ...s, path: `/session/${session.id}${s.path}` })),
  }));

  // Composed for this session and already past the answer check. Shown in
  // their own group so a learner can tell what a model made from what ships.
  const made = (session.scenarios ?? []).map((spec) => ({
    id: spec.id,
    question: spec.question,
    difficulty: spec.difficulty ?? null,
    path: `/session/${session.id}/s/${encodeURIComponent(spec.id)}`,
  }));
  if (made.length)
    concepts.push({ concept: "composed", subject: "made for this session",
                    title: "Composed by your AI", scenarios: made });

  return {
    id: session.id,
    topic: session.topic,
    // Newest first: the last thing you thought is the thing you are still
    // thinking. The store keeps them in the order written, and nothing edits
    // them — what someone believed on Tuesday is worth as much as today.
    notes: session.notes.slice().reverse(),
    concepts,
    hasSimulations: concepts.length > 0,
    composed: made.length,
    predictions: predictionsIn(notebook, session.id),
    // Told "nothing here", a learner deserves to be told what IS here. This
    // list is the honest size of the thing, and it is meant to look small.
    available: concepts.length ? [] : everything(scenarios),
  };
}

/** The resumable sessions under the prompt box. */
export function homeSessions(sessions, notebook) {
  return sessions.list().map((s) => ({
    id: s.id,
    topic: s.topic,
    notes: s.notes.length,
    predictions: predictionsIn(notebook, s.id),
    touchedAt: s.touchedAt,
    path: `/session/${s.id}`,
  }));
}
