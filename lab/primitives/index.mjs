// SPDX-License-Identifier: MIT
/** The primitive registry — the vocabulary a scenario may compose from. */
import * as circularRelease from "./circular-release.mjs";
import * as contactCollision from "./contact-collision.mjs";
import * as twoPucks from "./two-pucks.mjs";
import * as freeFall from "./free-fall.mjs";
import * as linePair from "./line-pair.mjs";
import * as quadraticRoots from "./quadratic-roots.mjs";
import * as limitingReagent from "./limiting-reagent.mjs";
import * as sealedJar from "./sealed-jar.mjs";
import * as searchRace from "./search-race.mjs";
import * as cacheWalk from "./cache-walk.mjs";

export const PRIMITIVES = Object.fromEntries(
  [circularRelease, contactCollision, twoPucks, freeFall, linePair, quadraticRoots,
   limitingReagent, sealedJar, searchRace, cacheWalk].map((p) => [p.id, p]),
);

export function getPrimitive(id) {
  const p = PRIMITIVES[id];
  if (!p) throw new Error(`unknown primitive "${id}" — known: ${Object.keys(PRIMITIVES).join(", ")}`);
  return p;
}

/** Defaults from the primitive's controls, overridden by the scenario's params. */
export function resolveParams(primitive, params = {}) {
  const out = {};
  for (const c of primitive.controls) out[c.key] = c.default;
  return { ...out, ...params };
}
