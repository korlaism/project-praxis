/**
 * Your record — the page a learner comes back for (P-41).
 *
 * Its centrepiece is calibration: when you said you were sure, were you right?
 * Nothing else shows a learner the shape of their own confidence.
 *
 * K-06 is live here — a persistent record of a child's mistakes is hazardous —
 * so the page is written as a record of growth, not a report card: it counts
 * "2 of 4" rather than percentages, says "not this time" rather than "wrong",
 * refuses to conclude anything from too few cards, and has no totals, ranks or
 * streaks anywhere.
 */
import { recordModel } from "./model.mjs";
import { LEVELS } from "../notebook/calibration.mjs";

const SVG = "http://www.w3.org/2000/svg";
const LEVEL_WORDS = { guessing: "guessing", leaning: "leaning", "fairly-sure": "fairly sure", certain: "certain" };
const CHIP = { right: "You had it", wrong: "Not this time", unlisted: "None of the choices" };

function h(tag, cls, ...kids) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  for (const k of kids) if (k !== null && k !== undefined && k !== false) n.append(k);
  return n;
}
function s(tag, attrs = {}, text) {
  const n = document.createElementNS(SVG, tag);
  for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, String(v));
  if (text !== undefined) n.textContent = text;
  return n;
}

export function renderRecord(container, { notebook, scenarios, subject: initial = null }) {
  const root = h("div", "rec");
  container.appendChild(root);
  let current = initial;
  let confirming = false;
  let exporting = false;

  function render() {
    const model = recordModel(notebook, scenarios);
    root.replaceChildren();

    root.append(h("header", "rec-head",
      h("h1", "rec-title", "Your record"),
      h("p", "rec-sub", "Every prediction you have made, what actually happened, and whether how sure you felt matched how often you were right.")));

    if (!model.persistent)
      root.append(h("p", "rec-warn",
        "This browser won't let the lab keep your notebook — your predictions will be gone when you close the tab."));

    if (model.empty) {
      root.append(h("p", "rec-empty",
        "No predictions yet. Commit to one in any scenario and it will appear here."));
      return;
    }

    if (!model.subjects.some((x) => x.subject === current)) current = model.subjects[0].subject;
    const sub = model.subjects.find((x) => x.subject === current);

    if (model.subjects.length > 1) {
      const tabs = h("nav", "rec-tabs");
      for (const x of model.subjects) {
        const b = h("button", x.subject === current ? "rec-tab is-on" : "rec-tab", x.subject);
        b.type = "button";
        b.onclick = () => { current = x.subject; confirming = exporting = false; render(); };
        tabs.append(b);
      }
      root.append(tabs);
    }

    root.append(calibrationSection(sub));
    root.append(rowsSection(sub));
    root.append(toolsSection(sub));
  }

  function calibrationSection(sub) {
    const sec = h("section", "rec-cal", h("h2", "rec-h2", "How sure you felt, against how often you were right"));
    sec.append(chart(sub.calibration));

    const lines = h("ul", "rec-cal-lines");
    const used = sub.calibration.filter((r) => r.n > 0);
    if (!used.length) {
      lines.append(h("li", null, "Say how sure you are when you commit, and this fills in."));
    }
    for (const r of used) {
      lines.append(h("li", r.enough ? null : "is-thin",
        `When you said ${LEVEL_WORDS[r.level]}, you were right ${r.hits} of ${r.n} ${r.n === 1 ? "time" : "times"}`,
        r.enough ? "." : " — too few to say yet."));
    }
    sec.append(lines);

    const tr = sub.trend;
    sec.append(h("p", "rec-trend", !tr
      ? "After a few more predictions this will show whether you are getting better at knowing what you know."
      : Math.abs(tr.recent - tr.earlier) < 0.02
        ? "Your earlier and recent predictions are about equally well matched to how sure you felt."
        : tr.improving
          ? "Your recent predictions match how sure you felt better than your earlier ones did."
          : "Lately, how sure you felt and how often you were right have drifted apart a little."));
    return sec;
  }

  /** A reliability diagram: the diagonal is "exactly as sure as you should have been". */
  function chart(rows) {
    const W = 360, H = 236, L = 58, R = 18, T = 18, B = 48;
    const X = (p) => L + p * (W - L - R);
    const Y = (p) => H - B - p * (H - T - B);
    const svg = s("svg", { viewBox: `0 0 ${W} ${H}`, class: "rec-chart", role: "img",
      "aria-label": "How often you were right at each level of confidence" });

    for (const p of [0, 0.5, 1]) {
      svg.append(s("line", { x1: L, x2: W - R, y1: Y(p), y2: Y(p), class: "rec-grid" }));
      svg.append(s("text", { x: L - 8, y: Y(p) + 4, "text-anchor": "end", class: "rec-axis" },
        p === 0 ? "never" : p === 1 ? "always" : "half"));
    }
    svg.append(s("line", { x1: X(0), y1: Y(0), x2: X(1), y2: Y(1), class: "rec-diag" }));
    svg.append(s("text", { x: X(0.62), y: Y(0.62) - 10, "text-anchor": "end", class: "rec-diag-label" },
      "perfectly matched"));

    rows.forEach((r, i) => {
      // The upper three levels sit close together, so their labels alternate
      // between two rows rather than running into one another.
      svg.append(s("line", { x1: X(r.stated), x2: X(r.stated), y1: Y(0), y2: Y(0) + 4, class: "rec-grid" }));
      svg.append(s("text", { x: X(r.stated), y: H - (i % 2 ? 10 : 25), "text-anchor": "middle", class: "rec-axis" },
        LEVEL_WORDS[r.level]));
      if (!r.n) return;
      const rad = Math.min(12, 4 + r.n * 1.5);
      svg.append(s("circle", { cx: X(r.stated), cy: Y(r.accuracy), r: rad,
        class: r.enough ? "rec-dot" : "rec-dot is-thin" }));
    });
    return h("div", "rec-chart-wrap", svg);
  }

  function rowsSection(sub) {
    const sec = h("section", "rec-list", h("h2", "rec-h2", "Every prediction, newest first"));
    for (const r of sub.rows) {
      sec.append(h("article", `rec-row is-${r.verdict}`,
        r.question ? h("p", "rec-q", r.question) : null,
        h("p", "rec-said", h("span", "rec-k", "You said"), " ", r.said,
          r.sure ? h("span", "rec-sure", ` · ${LEVEL_WORDS[r.sure] ?? r.sure}`) : null),
        h("p", "rec-happened", h("span", "rec-k", "What happened"), " ", r.happened),
        h("span", "rec-chip", CHIP[r.verdict])));
    }
    return sec;
  }

  function toolsSection(sub) {
    const sec = h("footer", "rec-tools");

    const exp = h("button", "rec-btn rec-export", exporting ? "Hide export" : "Export my notebook");
    exp.type = "button";
    exp.onclick = () => { exporting = !exporting; render(); };
    sec.append(exp);

    if (!confirming) {
      const f = h("button", "rec-btn rec-forget", `Forget my ${sub.subject} predictions`);
      f.type = "button";
      f.onclick = () => { confirming = true; render(); };
      sec.append(f);
    } else {
      const yes = h("button", "rec-btn rec-danger rec-forget-yes", "Yes, forget them");
      yes.type = "button";
      yes.onclick = () => { notebook.forget(sub.subject); confirming = false; render(); };
      const no = h("button", "rec-btn rec-forget-no", "Keep them");
      no.type = "button";
      no.onclick = () => { confirming = false; render(); };
      sec.append(h("div", "rec-confirm",
        h("p", null, `Forget all ${sub.subject} predictions? This cannot be undone.`), yes, no));
    }

    if (exporting) {
      const box = h("textarea", "rec-export-text");
      box.readOnly = true;
      box.value = JSON.stringify(notebook.export(), null, 2);
      sec.append(h("div", "rec-export-wrap",
        h("p", "rec-hint", "Select all and copy it somewhere safe. This page can't start a download."), box));
    }
    return sec;
  }

  render();
  // Another tab may add or forget predictions while this page is open (P-55).
  const unsubscribe = notebook.subscribe?.(render) ?? (() => {});
  return {
    destroy: () => { unsubscribe(); root.remove(); },
    refresh: render,
  };
}
