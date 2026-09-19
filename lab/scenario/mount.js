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

  const primitive = getPrimitive(spec.primitive);
  const params = resolveParams(primitive, spec.params);

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
    // Every reveal becomes a card in the scenario's subject notebook (ADR 0006).
    onReveal: (record) => {
      if (!spec.id || !spec.subject) return;          // a draft scenario has nowhere to file
      const r = notebook.record({ ...record, scenario: spec.id, subject: spec.subject });
      if (r.warning) console.warn(r.warning);
    },
  });
  return lab;
}
