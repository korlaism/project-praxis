// SPDX-License-Identifier: MIT
/**
 * The item bank. P-09.
 *
 * Grouped by the weekly concept in spec/03-pilot-design.md. Week 2 — falling,
 * named there as the heaviest single misconception — arrived with the
 * free-fall primitive in P-77.
 */
import week1 from "./week-1-motion.mjs";
import week2 from "./week-2-falling.mjs";
import week3 from "./week-3-action-reaction.mjs";
import week4 from "./week-4-circular.mjs";
import week5 from "./week-5-friction.mjs";

export const BY_WEEK = { 1: week1, 2: week2, 3: week3, 4: week4, 5: week5 };
export default [...week1, ...week2, ...week3, ...week4, ...week5];
