// SPDX-License-Identifier: MIT
/** The primitive registry — the vocabulary a scenario may compose from. */
import * as circularRelease from "./circular-release.mjs";
import * as contactCollision from "./contact-collision.mjs";
import * as twoPucks from "./two-pucks.mjs";

export const PRIMITIVES = Object.fromEntries(
  [circularRelease, contactCollision, twoPucks].map((p) => [p.id, p]),
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
