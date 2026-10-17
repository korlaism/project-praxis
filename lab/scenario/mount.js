// SPDX-License-Identifier: MIT
/**
 * Mount a scenario specification in the browser.
 *
 * The scenario is data; the primitive supplies the physics and the drawing;
 * the harness supplies the gate, the transport and the layout. A topic page is
 * now three lines, which is the point — anything that can emit a valid spec can
 * produce a working scenario.
 */
import { mountLab } from "../harness/lab.js";
import { validateScenario } from "./schema.mjs";
import { getPrimitive, resolveParams } from "../primitives/index.mjs";
import { openNotebook } from "../notebook/store.mjs";

/**
 * @param spec      a scenario specification
 * @param notebook  where cards go; defaults to this device's notebook
 */
export function mountScenario(spec, { notebook = openNotebook() } = {}) {
  const v = validateScenario(spec);
  if (!v.ok) throw new Error("invalid scenario:\n  " + v.errors.join("\n  "));

  // A wrapped scenario (ADR 0009) embeds someone else's simulation. Nothing
  // can watch it, so there is no primitive, no parameters and no answer check
  // — its answer is asserted by the author, and the card says so.
  if (spec.embed) return mountWrapped(spec, notebook);

  const primitive = getPrimitive(spec.primitive);
  const params = resolveParams(primitive, spec.params);

  const filing = filer(spec, notebook, "observed");

  let lab;
  lab = mountLab({
    question: spec.question,
    note: spec.note,
    options: spec.options,
    correct: spec.correct,
    // The authored explanation describes the scenario's own setup. If the learner
    // changed the setup and something else happened, describe THAT instead —
    // explaining an event that did not occur is its own kind of lie (P-52).
    explain: (record) => record.observed === spec.correct
      ? spec.explain
      : `With these settings: ${primitive.outcomeText?.[record.observed] ?? "the outcome could not be described."}`,
    params: primitive.controls.map((c) => ({ ...c, value: params[c.key] })),
    actions: primitive.actions,
    setup: (_, p) => primitive.setup(p),
    step: (s, dt, p) => {
      primitive.step(s, dt, p);
      // Reveal with what the simulation OBSERVED, not with the stored answer.
      if (s.done) lab.reveal(primitive.classify(s, p));
    },
    draw: (ctx, s, p, view, ui) => primitive.draw(ctx, s, p, view, ui),
    // ADR 0014. Keyed by the misconception the learner acted on, not by the
    // option they clicked: the same wrong belief recurs across scenarios.
    cue: (record) => spec.cues?.[errorTagFor(spec, record)] ?? null,
    // Every reveal becomes a card in the scenario's subject notebook (ADR 0006),
    // and the card is finished off when the learner acts on the cue (P-89).
    ...filing,
  });
  return lab;
}

function mountWrapped(spec, notebook) {
  return mountLab({
    question: spec.question,
    note: spec.note,
    options: spec.options,
    correct: spec.correct,
    explain: spec.explain,
    embed: spec.embed,
    cue: (record) => spec.cues?.[errorTagFor(spec, record)] ?? null,
    // No observation is possible, so reveal() carries nothing and the gate
    // falls back to the authored answer — the seam P-52 already left open.
    ...filer(spec, notebook, "asserted"),
  });
}

/**
 * The notebook hooks a mounted scenario needs, sharing one card.
 *
 * A reveal files the card, saying how its outcome was established: watched by
 * us, or asserted by whoever wrote the scenario. What the learner then does
 * with the cue lands on that same card (P-89), and so does the gap they write
 * in their own words (R-012) — neither can be filed with it, because at the
 * reveal the learner has not had the chance to do either yet.
 */
function filer(spec, notebook, outcomeSource) {
  let cardId = null;
  return {
    onReveal(record) {
      if (!spec.id || !spec.subject) return;          // a draft scenario has nowhere to file
      const r = notebook.record({
        ...record,
        scenario: spec.id,
        subject: spec.subject,
        errorTag: errorTagFor(spec, record),
        outcomeSource,
      });
      cardId = r.card?.id ?? null;
      if (r.warning) console.warn(r.warning);
    },
    onCueResponse(response) {
      if (!cardId) return;
      const r = notebook.amendCue(cardId, response);
      if (r.warning) console.warn(r.warning);
    },
    /**
     * The gap, in the learner's own words (R-012), onto the card this reveal
     * filed — never a card of its own. The notebook owns what counts as an
     * answer; the harness shows back whatever it says.
     */
    onNote(text) {
      if (!cardId) return { ok: false, errors: ["There is no notebook to write in."] };
      const r = notebook.writeReconciliation(cardId, text);
      if (r.warning) console.warn(r.warning);
      return r;
    },
  };
}

/**
 * The misconception behind a wrong answer — the raw material for R-002 (P-42).
 *
 * Stored with the card rather than derived later, because a scenario's options
 * and tags can be edited or retired; the card should keep what the answer
 * meant when it was given.
 *
 * Deliberately conservative. No tag when the learner was right; none when the
 * outcome was none of the options (nobody could have been right, so blaming a
 * belief would pollute the signature); and none when the chosen option has no
 * documented misconception — which includes the scenario's own "correct"
 * option once a changed setup has made it wrong. Recorded, never shown: ADR
 * 0003 defers naming a signature back to the learner until R-002 holds.
 */
export function errorTagFor(spec, record) {
  if (record.correct !== false || record.unlisted) return null;
  return spec.errorTags?.[record.choice] ?? null;
}
