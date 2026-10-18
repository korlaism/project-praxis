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

export function sessionModel(session, { scenarios, notebook, sessions = null }) {
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

  // What this topic is linked to, and what it could be (P-100). Symmetric,
  // so a link made from either end shows on both.
  const linkedIds = sessions ? sessions.linksOf(session.id) : [];
  const row = (s) => ({ id: s.id, topic: s.topic, path: `/session/${s.id}` });
  const all = sessions ? sessions.list() : [];
  const linked = all.filter((s) => linkedIds.includes(s.id)).map(row);
  const linkable = all
    .filter((s) => s.id !== session.id && !linkedIds.includes(s.id))
    .map(row);

  return {
    id: session.id,
    topic: session.topic,
    linked,
    linkable,
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

/**
 * The resumable work under the prompt box, grouped (P-100).
 *
 * A group is a connected component of the link graph, so linked topics sit
 * together instead of scattering down a flat list. A session nobody linked is
 * a group of one, which keeps the page one shape rather than two.
 */
export function homeSessions(sessions, notebook) {
  const byId = new Map(sessions.list().map((s) => [s.id, s]));
  const rows = (sessions.groups ? sessions.groups() : sessions.list().map((s) => [s.id]))
    .map((ids) => {
      const members = ids
        .map((id) => byId.get(id))
        .filter(Boolean)
        .map((s) => ({
          id: s.id,
          topic: s.topic,
          notes: s.notes.length,
          predictions: predictionsIn(notebook, s.id),
          touchedAt: s.touchedAt,
          path: `/session/${s.id}`,
        }))
        .sort((a, b) => b.touchedAt - a.touchedAt);
      return {
        sessions: members,
        linked: members.length > 1,
        // A group rises when ANY of it is worked in: coming back to one topic
        // brings what it belongs with back up the page too.
        touchedAt: Math.max(...members.map((m) => m.touchedAt)),
      };
    })
    .filter((g) => g.sessions.length);
  return rows.sort((a, b) => b.touchedAt - a.touchedAt);
}
