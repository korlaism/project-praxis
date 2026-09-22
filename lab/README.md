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
notebook/               the learner's record, kept on their own device
record/                 the page a learner comes back for
hub/                    every scenario and the record in one page — index.html
topics/                 a page per scenario, three lines each
embeds/                 self-hosted third-party sims, and a preview fixture
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

## Wrapping someone else's simulation

A scenario is either **ours** or **wrapped** (ADR 0009), never both:

```js
export default {
  schema: 1, id, subject,
  embed: {
    src: "embeds/<name>/index.html",        // self-hosted, never a remote URL
    title: "…",
    attribution: { work, author, licence, url },
  },
  question, options, correct, errorTags, explain,   // no params
};
```

Nothing can watch what happens inside an embedded simulation, so **the answer
check cannot run on it**. Its answer is asserted by whoever wrote the scenario,
the learner reveals it themselves, and the card records
`outcomeSource: "asserted"` so analysis never mixes asserted evidence with
observed. A wrapped scenario carries no parameters, because the verdict cannot
score a setup we do not own.

`embeds/preview.html` is the reference implementation, the way
`reference.html` is for the harness.

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

Publish the hub, not individual topics: one page means one origin, and one
origin means one notebook (P-54). Never flatten a page by hand — build it:

```bash
node tools/build-topic.mjs lab/index.html
```

To check a published page, drive it with Tab and Enter: the browser
extension's synthetic mouse clicks do not reach inside its cross-origin frame.

It follows the whole import graph, writes an artifact-ready bundle to
`dist/<slug>/`, checks it, and refuses to succeed if anything is bare, missing,
or reaches outside the bundle. On success it prints the `files` map the
Artifact tool takes. `dist/` is build output and is never committed.

## Deployed

## Verifying it in a browser

A browser throttles a hidden or unfocused tab to roughly half a frame per second, and
`dt` is clamped to `1/30`s per frame, so a run advances at about a two-hundredth of real
time. Watching a reveal arrive takes minutes. Four tickets in a row were therefore
verified against the DOM stub rather than the real page, and said so.

Add `?verify=1` and the page exposes `window.praxisVerify`:

```js
document.getElementById("opt-together").click();   // commit, as a learner would
window.praxisVerify.advance(2.1);                  // fixed steps, no animation frames
window.praxisVerify.record();                      // { choice, observed, correct, attempt, retryOf }
window.praxisVerify.attempts();                    // every earlier attempt, frozen
```

`advance()` is a clock, not a bypass: the gate is still asked, so nothing moves before a
commitment exists — and that is worth checking first, because it is the guarantee
everything else rests on. The hook is absent without the flag and is removed when the
scenario is left.

Switching tabs **pauses** rather than falling behind, and does not resume by itself: the
transport button says which state it is in.

**Public:** <https://korlaism.github.io/project-praxis/> — built and deployed from
`main` by `.github/workflows/pages.yml`, tests first. This is the URL the channel
links to.

Deployed to the dev server with `./deploy/deploy-lab.sh`, which **asserts what it got
back** — a title in the page, and the Content-Type of a module, a stylesheet and a font —
rather than just a 200. A 200 is not evidence: when the container's bind mount goes stale
nginx answers every path with `index.html`, so a JavaScript module returns 200 and the old
check called it success. It did that three times while the site was broken (`P-75`).

It prints the URL it
verified. The host comes from `PRAXIS_HOST` (an ssh alias, default `ai`); the address
to check over is resolved from your ssh config, or set `PRAXIS_WEB_HOST` directly.
No address is hardcoded here — `tools/repo-hygiene.test.mjs` keeps it that way.

```bash
./deploy/deploy-lab.sh          # build, ship, serve, and check it answers
```

Static files only — the lab is a folder and the notebook lives in the
browser, so nothing runs server-side and nothing is stored there. The
previous build stays as `site.prev` on the server, so a bad deploy rolls back
with one `mv`.

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
