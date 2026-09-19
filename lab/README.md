# lab/

The simulated lab. Tools, not documentation — **not synced to Outline**, same as `tools/`.

```
harness/gate.mjs        the commit-before-reveal state machine (pure, tested)
harness/gate.test.mjs   node --test lab/harness/gate.test.mjs
harness/lab.js          canvas loop, transport, sliders, layout
harness/lab.css         screen-recordable styling
reference.html          fixture exercising every harness feature
```

## Writing a topic

```js
import { mountLab } from "./harness/lab.js";
let lab;
lab = mountLab({
  question: "…",                       // the provocation, not the subject
  options: [{ id, label }, …],         // what a confident person would say
  correct: "id",
  explain: "…",                        // shown only after the reveal
  params: [{ key, label, min, max, step, value, unit }],
  setup()               { return state },
  step(state, dt, p)    { /* …; lab.reveal() when the outcome is undeniable */ },
  draw(ctx, state, p, view) { },
});
```

## Rules the harness enforces

**The simulation cannot run before a commit.** `tick()` returns early while the gate is `awaiting`, and the verdict is unreadable — `isCorrect` returns `null` until `reveal()`. This is not politeness, it is the absence of a code path.

**The first answer is the one that counts.** A second `commit()` throws; changing your mind requires an explicit reset.

**Nothing is stored about anybody.** No account, no persistence, no network. Per-person records are a Phase 1 concern.

## Running

Any static server, because ES modules will not load over `file://`:

```bash
python3 -m http.server -d lab 8000   # then open http://localhost:8000/reference.html
node --test lab/harness/gate.test.mjs
```
