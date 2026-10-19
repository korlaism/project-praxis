// SPDX-License-Identifier: MIT
/**
 * Every primitive's simulation, against its closed form. P-47.
 *
 * ADR 0007 made the analytic oracle part of the verification strategy: "Each
 * primitive now owes an analytic solution as well as an implementation." The
 * oracles were written and nothing ever compared them to a run.
 *
 * That gap is not academic. Six of the ten primitives classify straight from
 * the parameters and never read the state the learner watches evolve — for
 * those, THE ANSWER CHECK is comparing a scenario's claim against a formula,
 * not against what happens on screen. If the stepper and the formula drift
 * apart, the learner sees one thing, is told another, and every existing test
 * stays green.
 *
 * So each primitive gets an entry here, and the first test refuses to let a
 * new one be added without one. An entry either checks the run against the
 * closed form, or says in words why there is nothing to check — but it has to
 * say something.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { PRIMITIVES, resolveParams } from "./index.mjs";
import { runHeadless } from "../scenario/run.mjs";
// G from the component rather than retyped: a test that carries its own
// copy of a constant stops testing the moment the real one changes.
import { freeFallTime, G } from "../components/falling.mjs";
import { stoppingDistance } from "../components/motion.mjs";
import { positionOnCircle, tangentVelocity } from "../components/circular.mjs";
import { react, massAfter } from "../components/reactions.mjs";
import { linearCost, binaryCost, cacheWalk } from "../components/algorithms.mjs";

const DT = 1 / 60;
/** A simulation stops on the first frame PAST the event, so it may overshoot by one. */
const aFrameOf = (closed) => Math.abs(closed) * 0 + 1.5 * DT;

const play = (id, params) => {
  const p = PRIMITIVES[id];
  const resolved = resolveParams(p, params);
  return { ...runHeadless(p, resolved), params: resolved, primitive: p };
};

/**
 * One entry per primitive. `check` runs the simulation and compares it with
 * the closed form; `nothingToCheck` is the escape hatch, and it costs a
 * sentence explaining why.
 */
const AGREEMENT = {
  "free-fall": {
    check() {
      // Air off, so the closed form applies exactly.
      const { seconds, params } = play("free-fall", { air: 0, heavy: 5, light: 1, height: 20 });
      const closed = freeFallTime(params.height);
      assert.ok(Math.abs(seconds - closed) <= aFrameOf(closed),
        `fell in ${seconds.toFixed(3)}s, closed form says ${closed.toFixed(3)}s`);
    },
  },

  "two-pucks": {
    check() {
      // The pushed puck runs away exactly when the push beats friction, and
      // the unpushed one travels its stopping distance and no further.
      const { state, params } = play("two-pucks", { push: 0, friction: 0.2, u: 4 });
      const closed = stoppingDistance(params.friction, G, params.u);
      const travelled = state.a.x - 1;
      // Euler integration undershoots by about half a frame's worth of the
      // starting speed, accumulated: u·dt/2. Stated as the physics rather
      // than as a number, so it stays right if the timestep changes.
      assert.ok(Math.abs(travelled - closed) <= (params.u * DT) / 2 + 1e-6,
        `unpushed puck travelled ${travelled.toFixed(3)}, closed form says ${closed.toFixed(3)}`);
    },
  },

  "contact-collision": {
    check() {
      // Newton's third law is the closed form, and it is the whole item: the
      // peak force on each body must be the same number, not merely close
      // enough for classify's tolerance to call it equal.
      const { state } = play("contact-collision", { mt: 2, mf: 200, u: 20 });
      assert.ok(state.touched, "they never met");
      const rel = Math.abs(state.peakOnTruck - state.peakOnFly) / Math.max(state.peakOnTruck, 1e-9);
      assert.ok(rel < 1e-9, `peaks differ by ${rel}: ${state.peakOnTruck} vs ${state.peakOnFly}`);
    },
  },

  "circular-release": {
    check() {
      // Once cut it flies along the tangent. The closed form is the tangent
      // line at the cut: the released position must stay on it.
      const { state, params } = play("circular-release", { r: 2, omega: 2 });
      assert.ok(state.cut && state.cutAt, "it never released");
      const at = positionOnCircle({ x: 0, y: 0 }, params.r, state.cutTheta);
      const v = tangentVelocity(params.r, params.omega, state.cutTheta);
      // Distance from the point to the tangent ray through `at` in direction v.
      const dx = state.pos.x - (state.cutAt.x - at.x) - at.x, dy = state.pos.y - (state.cutAt.y - at.y) - at.y;
      const len = Math.hypot(v.x, v.y);
      const off = Math.abs(dx * (-v.y / len) + dy * (v.x / len));
      assert.ok(off < 0.05, `drifted ${off.toFixed(4)} off the tangent`);
    },
  },

  "limiting-reagent": {
    check() {
      const { state, params } = play("limiting-reagent", { a: 4, b: 10, needA: 1, needB: 2 });
      assert.equal(state.paired, react(params).reactions,
        "the reactions drawn are not the reactions the arithmetic says happened");
    },
  },

  "sealed-jar": {
    check() {
      // classify() works from the parameters; the learner watches s.escaped.
      // The balance must read the same whichever you ask.
      for (const sealed of [0, 1]) {
        const { state, params } = play("sealed-jar", { start: 50, gas: 6, sealed });
        const byState = massAfter({ start: params.start, gas: state.escaped, sealed: false });
        const byParams = massAfter({ start: params.start, gas: params.gas, sealed: sealed >= 0.5 });
        assert.equal(byState, byParams,
          `lid ${sealed}: the simulation lost ${state.escaped}g, the arithmetic says ${params.gas}g`);
        assert.equal(state.escaped + state.held, params.gas, "gas was created or destroyed");
      }
    },
  },

  "search-race": {
    check() {
      // target 1 on a long list: the scan stops at one comparison and the
      // halving search is still going. Chosen so the two counts DIFFER —
      // with a target where they happen to match, an animation that stopped
      // at the wrong one would look correct.
      const { state, params } = play("search-race", { n: 62, target: 1 });
      assert.equal(state.shown,
        Math.max(linearCost(params.n, params.target), binaryCost(params.n, params.target)),
        "the comparisons animated are not the comparisons counted");
    },
  },

  "cache-walk": {
    check() {
      const { state, params } = play("cache-walk", { rows: 4, cols: 8, line: 4, held: 2 });
      assert.equal(state.visited, params.rows * params.cols,
        "the cells walked are not the cells in the grid");
      const w = cacheWalk({ rows: params.rows, cols: params.cols,
                            lineSize: params.line, cacheLines: params.held });
      assert.ok(w.rowMajor <= w.colMajor, "the row walk cannot cost more than the column walk");
    },
  },

  "line-pair": {
    nothingToCheck:
      "Nothing evolves. The state is a drawing progress fraction, and the answer is a property " +
      "of the parameters — intersect() in algebra.mjs is the whole truth. What CAN go wrong is " +
      "the picture, and maths-draw.test.mjs checks that.",
  },

  "quadratic-roots": {
    nothingToCheck:
      "As line-pair: the curve is drawn, not integrated, and realRoots() is the whole truth. " +
      "The drawing is where this one went wrong before — it clamped flat at the view edge — and " +
      "maths-draw.test.mjs is what catches that.",
  },
};

test("every primitive says how its simulation is cross-checked", () => {
  // The rule P-47 asked for, made enforceable. A primitive added without an
  // entry fails here rather than quietly joining the six whose answer check
  // never looks at the simulation.
  const missing = Object.keys(PRIMITIVES).filter((id) => !AGREEMENT[id]);
  assert.deepEqual(missing, [],
    `these primitives have no analytic cross-check: ${missing.join(", ")}`);

  const extra = Object.keys(AGREEMENT).filter((id) => !PRIMITIVES[id]);
  assert.deepEqual(extra, [], `these entries name no primitive: ${extra.join(", ")}`);

  for (const [id, entry] of Object.entries(AGREEMENT)) {
    const said = entry.check || entry.nothingToCheck;
    assert.ok(said, `${id}: an entry must either check something or say why it cannot`);
    if (entry.nothingToCheck)
      assert.ok(entry.nothingToCheck.length > 60,
        `${id}: "nothing to check" needs a reason someone can disagree with`);
  }
});

for (const [id, entry] of Object.entries(AGREEMENT)) {
  if (!entry.check) continue;
  test(`${id}: the simulation agrees with the closed form`, entry.check);
}
