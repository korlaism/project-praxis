# lab/

The simulated lab. Tools, not documentation — **not synced to Outline**, same as `tools/`.

```
harness/gate.mjs        the commit-before-reveal state machine (pure, tested)
harness/lab.js          canvas loop, transport, sliders, layout
harness/lab.css         screen-recordable styling
harness/dom-stub.mjs    the smallest DOM the harness touches, for tests
components/             pure physics — exact, tested, with analytic solutions
primitives/             composable scenario types: setup/step/draw/classify
scenario/               the spec schema, the headless runner, the mount
scenarios/              scenario specifications — data, not code
topics/                 a page per scenario, three lines each
reference.html          fixture exercising every harness feature
```

## Writing a scenario

A scenario is **data**, not code (ADR 0007). It names a primitive, sets its
parameters, and supplies the question:

```js
export default {
  schema: 1,
  primitive: "circular-release",
  params: { r: 1.2, omega: 2.4 },
  question: "…",                       // the provocation, not the subject
  options: [{ id, label }, …],         // what a confident person would say
  correct: "tangent",
  errorTags: { outward: "outward-in-circles" },   // why each wrong answer is chosen
  explain: "…",                        // shown only after the reveal
};
```

The page is then three lines: `mountScenario(spec)`.

## Writing a primitive

```js
export const id, outcomes, controls, actions?
export function setup(params)
export function step(state, dt, params)        // set state.done when settled
export function draw(ctx, state, params, view, ui)
export function classify(state, params)        // what ACTUALLY happened
```

`classify` is the important one. It measures the outcome from the finished run
rather than asserting it, which is what lets a scenario's stated answer be
checked by machine — see the answer check below.

An action may carry `autoAt` in seconds, so a scenario needing an interaction
is still deterministic when run headlessly.

## Rules the harness enforces

**The simulation cannot run before a commit.** `tick()` returns early while the gate is `awaiting`, and the verdict is unreadable — `isCorrect` returns `null` until `reveal()`. This is not politeness, it is the absence of a code path.

**The first answer is the one that counts.** A second `commit()` throws; changing your mind requires an explicit reset.

**Nothing is stored about anybody.** No account, no persistence, no network. Per-person records are a Phase 1 concern.

## Publishing

Never flatten a page by hand — that once shipped a blank page. Build it:

```bash
node tools/build-topic.mjs lab/topics/which-way-does-it-fly.html
```

It follows the whole import graph, writes an artifact-ready bundle to
`dist/<slug>/`, checks it, and refuses to succeed if anything is bare, missing,
or reaches outside the bundle. On success it prints the `files` map the
Artifact tool takes. `dist/` is build output and is never committed.

## Running

Any static server, because ES modules will not load over `file://`:

```bash
python3 -m http.server -d lab 8000   # then open http://localhost:8000/reference.html
node --test lab/harness/*.test.mjs lab/components/*.test.mjs lab/scenario/*.test.mjs lab/primitives/*.test.mjs tools/*.test.mjs
```

## Tests

`gate.test.mjs` covers the state machine. `lab.smoke.test.mjs` mounts the whole
harness against `dom-stub.mjs` and covers what the gate tests cannot: that
mounting does not throw, that the canvas gets a real size, that nothing steps
before a commit, and that a topic whose `draw()` throws does not take the
transport and the gate down with it.

That last set exists because the gate tests once passed while the harness was
completely dead. Reintroduce the bug — `pause()` before `state` is assigned in
`softReset()` — and all nine smoke tests go red.

**The answer check.** `scenario/scenarios.test.mjs` runs every shipped scenario
to completion with no DOM and asserts that `classify()` returns the option the
scenario claims is correct — and that a scenario claiming the wrong thing, or
carrying parameters that contradict its answer, is caught. It is the check that
makes generated scenarios trustworthy, and the one no amount of model quality
substitutes for.
