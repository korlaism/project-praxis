// SPDX-License-Identifier: MIT
/**
 * The commit-before-reveal gate.
 *
 * The one load-bearing mechanic in the whole project, reduced to something a
 * stranger meets in ten seconds: you say what you think will happen, and only
 * then does the simulation run.
 *
 * The withholding lives here rather than in the interface on purpose. A gate
 * that merely *asks* politely for a prediction gets skipped; this one cannot
 * disclose the verdict before a commit exists, because there is no code path
 * that reads it.
 */

/** Confidence scale a twelve-year-old uses honestly. Not a percentage. */
export const CONFIDENCE = ["guessing", "leaning", "fairly-sure", "certain"];

export function createGate({ options, correct }) {
  if (!Array.isArray(options) || options.length < 2)
    throw new Error("a gate needs at least two options to be a real choice");
  const ids = options.map((o) => o.id);
  if (new Set(ids).size !== ids.length)
    throw new Error("option ids must be unique");
  if (!ids.includes(correct))
    throw new Error(`the correct answer "${correct}" is not one of the options`);

  let state = "awaiting";
  // Append-only. ADR 0014 lets a learner predict again after a cue, and the
  // only way that does real damage is if the second prediction can replace the
  // first — R-010 would be measuring post-hoc confidence and every Brier score
  // would be quietly flattering. So attempts accumulate and nothing is edited.
  const attempts = [];
  let attempt = 0;
  let retryOf = null;
  let choice = null;
  let confidence = null;
  let committedAt = null;
  let revealedAt = null;
  let observed = null;

  /** Freeze the current attempt into the history. Nothing here is ever edited. */
  function archive() {
    attempts.push(Object.freeze({
      attempt, retryOf, choice, confidence, committedAt, revealedAt, observed,
      correct: state === "revealed" ? choice === observed : null,
      unlisted: state === "revealed" ? !ids.includes(observed) : null,
    }));
  }

  function begin(previous) {
    attempt = attempts.length;
    retryOf = previous;
    state = "awaiting";
    choice = confidence = committedAt = revealedAt = observed = null;
  }

  return {
    get state() {
      return state;
    },
    get choice() {
      return choice;
    },
    get confidence() {
      return confidence;
    },

    /** The simulation stays locked until something has been committed. */
    get canRun() {
      return state !== "awaiting";
    },

    /**
     * Null until revealed — committing must not disclose the verdict.
     *
     * Scored against what was OBSERVED, not against the configured answer. The
     * configured answer describes the default setup; if the learner changed the
     * setup before running it, what happened can differ, and a product about
     * honesty cannot tell someone they were right about something that did not
     * occur (P-52).
     */
    get isCorrect() {
      return state === "revealed" ? choice === observed : null;
    },

    get options() {
      return options.slice();
    },

    get record() {
      return {
        attempt, retryOf,
        choice, confidence, committedAt, revealedAt, observed,
        correct: this.isCorrect,
        // What happened was none of the choices offered — nobody could have been right.
        unlisted: state === "revealed" ? !ids.includes(observed) : null,
      };
    },

    /** Every completed attempt, oldest first. Frozen: not a convention, a guarantee. */
    get attempts() {
      return attempts.slice();
    },

    commit(id, level = null) {
      if (state !== "awaiting") throw new Error("already committed — reset to change it");
      if (!ids.includes(id)) throw new Error(`unknown option: ${id}`);
      if (level !== null && !CONFIDENCE.includes(level))
        throw new Error(`confidence must be one of ${CONFIDENCE.join(", ")}`);
      choice = id;
      confidence = level;
      committedAt = Date.now();
      state = "committed";
      return this;
    },

    /** @param {string} [outcome] what actually happened; defaults to the configured answer */
    reveal(outcome = correct) {
      if (state === "awaiting") throw new Error("not committed — nothing to reveal");
      observed = outcome;
      revealedAt = Date.now();
      state = "revealed";
      return this;
    },

    /**
     * Predict again, having been shown a cue (ADR 0014). The attempt just
     * finished is archived and the gate locks: a retry that could be watched
     * before it is committed is not a gate.
     */
    retry() {
      if (state !== "revealed") throw new Error("nothing to retry — no attempt has been revealed");
      const previous = attempt;
      archive();
      begin(previous);
      return this;
    },

    /**
     * Start over — what the Reset button and a changed parameter do. Like a
     * retry it archives rather than erases, but it starts a new line rather
     * than continuing one, so it is not recorded as a second try at the same
     * question. An untouched attempt archives nothing: parameter changes call
     * this constantly and must not fill the record with blanks.
     */
    reset() {
      if (choice !== null) archive();
      begin(null);
      return this;
    },
  };
}
