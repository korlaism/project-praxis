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
export function mountScenario(spec, { notebook = openNotebook(), session = null,
                                      snapshots = null, params: startAt = null } = {}) {
  const v = validateScenario(spec);
  if (!v.ok) throw new Error("invalid scenario:\n  " + v.errors.join("\n  "));

  // A wrapped scenario (ADR 0009) embeds someone else's simulation. Nothing
  // can watch it, so there is no primitive, no parameters and no answer check
  // — its answer is asserted by the author, and the card says so.
  if (spec.embed) return mountWrapped(spec, notebook, session, snapshots);

  const primitive = getPrimitive(spec.primitive);
  // A snapshot re-opens at the setup the learner had, not the author's (P-43).
  const params = resolveParams(primitive, startAt ?? spec.params);

  const filing = filer(spec, notebook, "observed", session);

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
    // Keep this scenario exactly as it stands (P-43). The whole spec goes in,
    // so a snapshot of a generated scenario survives its session being closed.
    ...(snapshots ? { onKeep: (at) => snapshots.take({ spec, params: at, session }) } : {}),
    // Every reveal becomes a card in the scenario's subject notebook (ADR 0006),
    // and the card is finished off when the learner acts on the cue (P-89).
    ...filing,
  });
  return lab;
}

function mountWrapped(spec, notebook, session = null, snapshots = null) {
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
    ...filer(spec, notebook, "asserted", session),
    // It has no parameters, so a snapshot of it is the question itself — which
    // is still a thing a learner may want to come back to (P-43).
    ...(snapshots ? { onKeep: () => snapshots.take({ spec, params: {}, session }) } : {}),
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
function filer(spec, notebook, outcomeSource, session = null) {
  let cardId = null;
  // R-013. Opened at mount from what the notebook already holds: come back to
  // the thing that stumped you last week and the lab should know it did.
  let openId = spec.id ? notebook.openConfusion(spec.id)?.id ?? null : null;
  return {
    /**
     * One tap, at any point, blocking nothing (R-013). The card in view goes
     * on the entry when there is one — spec/04 wants whatever was in front of
     * the learner, and after a reveal that is the card, not just the item.
     */
    confusion: {
      isOpen: () => openId !== null,
      log() {
        const r = notebook.logConfusion({
          subject: spec.subject, scenario: spec.id, card: cardId,
        });
        if (r.warning) console.warn(r.warning);
        openId = r.entry.id;
        return r;
      },
      words(text) {
        if (!openId) return { ok: false, errors: ["nothing is open to say that about"] };
        const r = notebook.addConfusionWords(openId, text);
        if (r.warning) console.warn(r.warning);
        return r;
      },
      resolve() {
        if (!openId) return { ok: false, errors: ["nothing is open to settle"] };
        const r = notebook.resolveConfusion(openId);
        if (r.ok) openId = null;
        if (r.warning) console.warn(r.warning);
        return r;
      },
    },
    onReveal(record) {
      if (!spec.id || !spec.subject) return;          // a draft scenario has nowhere to file
      const r = notebook.record({
        ...record,
        scenario: spec.id,
        subject: spec.subject,
        errorTag: errorTagFor(spec, record),
        outcomeSource,
        // Which session this was predicted in, when it was predicted in one
        // (P-95). Lets the record be read a topic at a time.
        ...(session ? { session } : {}),
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
