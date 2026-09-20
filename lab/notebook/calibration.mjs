// SPDX-License-Identifier: AGPL-3.0-or-later
/**
 * Calibration: when you say you are sure, how often are you right?
 *
 * The four-point scale (R-011) is mapped to probabilities here, never shown to
 * the learner as numbers. The anchors are a design choice, not a finding —
 * "guessing" sits near chance for a three- or four-way choice, "certain" just
 * short of 1 because nobody is entitled to 1.
 *
 * Deliberately conservative (K-06). A level with fewer than MIN_PER_LEVEL cards
 * is reported as too few to say, and cards where the outcome was none of the
 * options are left out entirely — nobody could have been right.
 */
export const LEVELS = ["guessing", "leaning", "fairly-sure", "certain"];
export const STATED = { guessing: 0.3, leaning: 0.55, "fairly-sure": 0.75, certain: 0.95 };
export const MIN_PER_LEVEL = 3;
const TREND_MIN = 8;

/** Cards that can speak to calibration: a stated confidence, and a fair question. */
function scorable(cards) {
  return cards.filter((c) =>
    Object.hasOwn(STATED, c.confidence) && c.unlisted !== true && typeof c.correct === "boolean");
}

const hit = (c) => (c.correct ? 1 : 0);
const mean = (xs) => (xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : null);

export function calibration(cards) {
  const usable = scorable(cards);
  return LEVELS.map((level) => {
    const at = usable.filter((c) => c.confidence === level);
    const hits = at.filter((c) => c.correct).length;
    return {
      level,
      stated: STATED[level],
      n: at.length,
      hits,
      accuracy: at.length ? hits / at.length : null,
      enough: at.length >= MIN_PER_LEVEL,
    };
  });
}

/** Mean squared gap between how sure you said you were and what happened. Lower is better. */
export function brier(cards) {
  return mean(scorable(cards).map((c) => (STATED[c.confidence] - hit(c)) ** 2));
}

/** Positive: you claim more than you deliver. Negative: you know more than you admit. */
export function overconfidence(cards) {
  return mean(scorable(cards).map((c) => STATED[c.confidence] - hit(c)));
}

/** Earlier half against recent half, by when they were recorded. Silent until there is enough. */
export function trend(cards) {
  const usable = scorable(cards).slice().sort((a, b) => (a.recordedAt ?? 0) - (b.recordedAt ?? 0));
  if (usable.length < TREND_MIN) return null;
  const mid = Math.floor(usable.length / 2);
  const earlier = brier(usable.slice(0, mid));
  const recent = brier(usable.slice(mid));
  return { earlier, recent, improving: recent < earlier, n: usable.length };
}

export function summary(cards) {
  return {
    total: cards.length,
    scorable: scorable(cards).length,
    correct: cards.filter((c) => c.correct === true).length,
    unlisted: cards.filter((c) => c.unlisted === true).length,
    noConfidence: cards.filter((c) => !Object.hasOwn(STATED, c.confidence)).length,
  };
}
