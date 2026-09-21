// SPDX-License-Identifier: MIT
/**
 * The item bank. P-09.
 *
 * Grouped by the weekly concept in spec/03-pilot-design.md. Week 2 — falling,
 * named there as the heaviest single misconception — is absent because no
 * primitive can show it yet. That gap is P-77, not an oversight.
 */
import week1 from "./week-1-motion.mjs";
import week3 from "./week-3-action-reaction.mjs";
import week4 from "./week-4-circular.mjs";
import week5 from "./week-5-friction.mjs";

export const BY_WEEK = { 1: week1, 3: week3, 4: week4, 5: week5 };
export default [...week1, ...week3, ...week4, ...week5];
