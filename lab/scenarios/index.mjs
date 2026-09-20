// SPDX-License-Identifier: MIT
/** Every shipped scenario, by id. The lab hub lists these; the record looks labels up here. */
import whichWay from "./which-way-does-it-fly.mjs";
import truckFly from "./truck-and-fly.mjs";
import pucks from "./what-keeps-it-moving.mjs";

export const SCENARIOS = Object.fromEntries([whichWay, truckFly, pucks].map((s) => [s.id, s]));
