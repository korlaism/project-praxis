/**
 * The smallest DOM the harness actually touches.
 *
 * Hand-rolled rather than jsdom on purpose: the lab has no build step and no
 * dependencies, and that should hold for its tests too. It also fails loudly
 * and usefully — if the harness starts using a DOM feature that is not here,
 * the stub throws instead of silently pretending.
 *
 * requestAnimationFrame is a queue you drive by hand, so a test can advance
 * exactly N frames with an exact dt. Real rAF does not run in a hidden tab,
 * which is precisely how a frozen-looking simulation fooled us once already.
 */

class StubCtx {
  constructor() { this.calls = []; }
  #rec(name) { return (...args) => this.calls.push([name, ...args]); }
  setTransform = this.#rec("setTransform");
  clearRect    = this.#rec("clearRect");
  fillRect     = this.#rec("fillRect");
  beginPath    = this.#rec("beginPath");
  closePath    = this.#rec("closePath");
  moveTo       = this.#rec("moveTo");
  lineTo       = this.#rec("lineTo");
  arc          = this.#rec("arc");
  fill         = this.#rec("fill");
  stroke       = this.#rec("stroke");
  fillText     = this.#rec("fillText");
  setLineDash  = this.#rec("setLineDash");
  save         = this.#rec("save");
  restore      = this.#rec("restore");
  translate    = this.#rec("translate");
  scale        = this.#rec("scale");
  rotate       = this.#rec("rotate");
  ellipse      = this.#rec("ellipse");
}

class StubEl {
  constructor(tag) {
    this.tagName = tag.toUpperCase();
    this.children = [];
    this.style = {};
    this.attrs = {};
    this.textContent = "";
    this.className = "";
    this.hidden = false;
    this.disabled = false;
    if (tag === "canvas") {
      this.width = 0; this.height = 0;
      this._ctx = new StubCtx();
    }
  }
  appendChild(n) { this.children.push(n); n.parent = this; return n; }
  remove() {
    if (!this.parent) return;
    this.parent.children = this.parent.children.filter((c) => c !== this);
    this.parent = null;
  }
  replaceChildren(...xs) { this.children = []; this.textContent = ""; this.append(...xs); }
  append(...xs) {
    for (const x of xs) typeof x === "string" ? (this.textContent += x) : this.appendChild(x);
  }
  setAttribute(k, v) { this.attrs[k] = String(v); }
  getAttribute(k) { return this.attrs[k] ?? null; }
  getContext(kind) {
    if (kind !== "2d") throw new Error(`stub canvas has no "${kind}" context`);
    return this._ctx;
  }
  getBoundingClientRect() { return { width: this.rectW ?? 800, height: this.rectH ?? 600 }; }
  set innerHTML(v) { if (v === "") this.children = []; else throw new Error("stub innerHTML only supports clearing"); }
  /** Depth-first search, for tests only. */
  find(pred) {
    if (pred(this)) return this;
    for (const c of this.children) { const hit = c.find?.(pred); if (hit) return hit; }
    return null;
  }
  findAll(pred, out = []) {
    if (pred(this)) out.push(this);
    for (const c of this.children) c.findAll?.(pred, out);
    return out;
  }
}

/** Install the stub globals, returning handles a test can drive. */
export function installDom({ dpr = 1 } = {}) {
  const body = new StubEl("body");
  const frames = [];
  let now = 0;

  const g = globalThis;
  const saved = {};
  const set = (k, v) => { saved[k] = g[k]; g[k] = v; };

  set("document", { body, createElement: (t) => new StubEl(t), createElementNS: (_ns, t) => new StubEl(t) });
  set("devicePixelRatio", dpr);
  set("innerWidth", 1000);
  set("innerHeight", 800);
  set("performance", { now: () => now });
  set("requestAnimationFrame", (fn) => (frames.push(fn), frames.length));
  set("cancelAnimationFrame", () => frames.splice(0, frames.length));
  const listeners = new Map();
  set("addEventListener", (type, fn) => { (listeners.get(type) ?? listeners.set(type, new Set()).get(type)).add(fn); });
  set("removeEventListener", (type, fn) => { listeners.get(type)?.delete(fn); });
  set("ResizeObserver", class { observe() {} disconnect() {} });
  const loc = { hash: "" };
  set("location", loc);
  set("history", { pushState(_s, _t, url) { loc.hash = String(url); } });
  set("scrollTo", () => {});

  return {
    body,
    /** Advance n animation frames of dt seconds each. */
    tick(n = 1, dt = 1 / 60) {
      for (let i = 0; i < n; i++) {
        const fn = frames.shift();
        if (!fn) break;
        now += dt * 1000;
        fn(now);
      }
    },
    pendingFrames: () => frames.length,
    listenerCount: (type) => listeners.get(type)?.size ?? 0,
    restore() { for (const k of Object.keys(saved)) g[k] = saved[k]; },
  };
}

export { StubEl, StubCtx };
