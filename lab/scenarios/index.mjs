// SPDX-License-Identifier: MIT
/**
 * Every shipped scenario, by id. The lab hub lists these; the record looks
 * labels up here.
 *
 * The bank belongs in here rather than beside it (P-80). It existed for a day
 * with nothing linking to it, which from a learner's point of view is the same
 * as not existing — and the record could not have resolved a bank item's
 * question either.
 */
import whichWay from "./which-way-does-it-fly.mjs";
import truckFly from "./truck-and-fly.mjs";
import pucks from "./what-keeps-it-moving.mjs";
import BANK from "./bank/index.mjs";

const ALL = [whichWay, truckFly, pucks, ...BANK];

const seen = new Set();
for (const s of ALL) {
  if (seen.has(s.id)) throw new Error(`two scenarios share the id "${s.id}"`);
  seen.add(s.id);
}

export const SCENARIOS = Object.fromEntries(ALL.map((s) => [s.id, s]));
