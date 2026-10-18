// SPDX-License-Identifier: MIT
/**
 * The item bank. P-09.
 *
 * Grouped by the weekly concept in spec/03-pilot-design.md. Week 2 — falling,
 * named there as the heaviest single misconception — arrived with the
 * free-fall primitive in P-77.
 *
 * Falling carries more items than the others because its air control genuinely
 * changes the answer. Action-and-reaction and circular motion sit at three
 * each and will stay there: their outcome is the same at every setting, which
 * is the lesson, so further items would vary the wording and not the
 * phenomenon. R-020's "five per week" assumed borrowed instruments with
 * varied surface, which ADR 0011 gave up for a reason.
 */
import week1 from "./week-1-motion.mjs";
import week2 from "./week-2-falling.mjs";
import week3 from "./week-3-action-reaction.mjs";
import week4 from "./week-4-circular.mjs";
import week5 from "./week-5-friction.mjs";
import mathsLines from "./maths-lines.mjs";
import mathsQuadratics from "./maths-quadratics.mjs";
import chemLimiting from "./chem-limiting.mjs";
import chemMass from "./chem-mass.mjs";
import csSearching from "./cs-searching.mjs";
import csMemory from "./cs-memory.mjs";

export const BY_WEEK = { 1: week1, 2: week2, 3: week3, 4: week4, 5: week5 };
/**
 * Subjects outside the weekly pilot structure. Maths arrived in P-91 and
 * chemistry in P-97 — the first one that is neither a thing moving nor a line
 * on a grid, which is what ADR 0007 said would be the hard part.
 */
export const BY_SUBJECT = {
  maths: [...mathsLines, ...mathsQuadratics],
  chemistry: [...chemLimiting, ...chemMass],
  computing: [...csSearching, ...csMemory],
};
export default [...week1, ...week2, ...week3, ...week4, ...week5,
                ...mathsLines, ...mathsQuadratics, ...chemLimiting, ...chemMass,
                ...csSearching, ...csMemory];
