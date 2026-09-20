// SPDX-License-Identifier: AGPL-3.0-or-later
/**
 * What the record page shows, as plain data — so it can be tested without a DOM.
 *
 * Rows read in words ("you said… what happened…"), never in ids, because the
 * learner never saw an id. A card from a scenario that has since been removed
 * still appears, just less readably: a record is not ours to drop.
 */
import { PRIMITIVES } from "../primitives/index.mjs";
import { calibration, trend, summary, brier } from "../notebook/calibration.mjs";

function describe(card, spec) {
  const label = (id) => spec?.options?.find((o) => o.id === id)?.label;
  const outcomeText = spec ? PRIMITIVES[spec.primitive]?.outcomeText?.[card.observed] : undefined;
  return {
    id: card.id,
    scenario: card.scenario,
    question: spec?.question ?? null,
    said: label(card.choice) ?? card.choice,
    // Prefer the option's own wording; fall back to the primitive's description
    // when what happened was none of the options offered.
    happened: label(card.observed) ?? outcomeText ?? card.observed ?? "—",
    sure: card.confidence ?? null,
    verdict: card.unlisted ? "unlisted" : card.correct ? "right" : "wrong",
    recordedAt: card.recordedAt ?? null,
    params: card.params ?? null,
  };
}

export function recordModel(notebook, scenarios) {
  const subjects = notebook.subjects().sort().map((subject) => {
    const cards = notebook.cards(subject);
    return {
      subject,
      rows: cards.slice().reverse().map((c) => describe(c, scenarios[c.scenario])),
      calibration: calibration(cards),
      trend: trend(cards),
      brier: brier(cards),
      summary: summary(cards),
    };
  });
  return { empty: subjects.length === 0, subjects, persistent: notebook.persistent };
}
