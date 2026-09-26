/**
 * The bundler that turns a topic page into something publishable.
 *
 * Doing this by hand once produced a blank page: "../harness/lab.js" became
 * "harness/lab.js", which is a BARE specifier in ES modules and resolves to
 * nothing without an import map. The stylesheet still loaded, so the page was
 * blank rather than broken and nothing on screen pointed at the cause. These
 * tests exist so that class of mistake cannot ship again.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, writeFileSync, readFileSync, rmSync, existsSync, statSync, readdirSync } from "node:fs";
import { join, dirname, relative } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { buildBundle, checkBundle, specifiersIn } from "./build-topic.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SCRATCH = join(ROOT, "dist", ".test");
const TOPICS = ["which-way-does-it-fly", "truck-and-fly", "what-keeps-it-moving"];

/** Every file in a built bundle, recursively. */
function walkAll(dir) {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? walkAll(p) : [p];
  });
}

function fresh(name) {
  const dir = join(SCRATCH, name);
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  return dir;
}

for (const slug of TOPICS) {
  test(`${slug}: bundles, and the bundle passes its own check`, () => {
    const out = fresh(slug);
    const { files } = buildBundle(join(ROOT, "lab/topics", `${slug}.html`), out);
    assert.ok(files.includes("index.html"));
    assert.deepEqual(checkBundle(out), []);
  });

  test(`${slug}: the bundle carries the whole import graph, not just the first level`, () => {
    const out = fresh(`${slug}-graph`);
    const { files } = buildBundle(join(ROOT, "lab/topics", `${slug}.html`), out);
    for (const f of ["scenario/mount.js", "harness/lab.js", "harness/gate.mjs", "harness/lab.css",
                     "primitives/index.mjs", "scenario/schema.mjs", `scenarios/${slug}.mjs`])
      assert.ok(files.includes(f), `missing ${f}`);
    assert.ok(files.some((f) => f.startsWith("components/")), "components never reached");
  });

  test(`${slug}: node can import every module in the bundle`, async () => {
    // The ground truth. If Node's resolver can load every file, a browser's can:
    // no bare specifiers, nothing missing, nothing escaping the bundle root.
    const out = fresh(`${slug}-import`);
    const { files } = buildBundle(join(ROOT, "lab/topics", `${slug}.html`), out);
    for (const f of files.filter((x) => /\.m?js$/.test(x)))
      await import(pathToFileURL(join(out, f)).href);
    // And the entry page's own imports — through REAL module resolution. Joining
    // paths would treat "harness/lab.js" and "./harness/lab.js" identically, which
    // is exactly the difference that blanked topic 1. So write the page's imports
    // into a probe module at the bundle root and let Node resolve them properly.
    const html = readFileSync(join(out, "index.html"), "utf8");
    const probe = join(out, "__entry-probe.mjs");
    writeFileSync(probe, specifiersIn(html).map((s) => `import ${JSON.stringify(s)};`).join("\n") + "\n");
    await import(pathToFileURL(probe).href);
  });
}

test("the entry page is artifact-ready: no doctype, no charset, title kept", () => {
  // Narrowed by P-86. This used to assert that NO meta survived, which was
  // right while the only destination was an artifact. The bundle now also
  // ships to Pages, so the viewport is kept deliberately and is asserted by
  // its own test above; charset and the doctype are still the skeleton's.
  const out = fresh("entry-shape");
  buildBundle(join(ROOT, "lab/topics/which-way-does-it-fly.html"), out);
  const html = readFileSync(join(out, "index.html"), "utf8");
  assert.doesNotMatch(html, /<!doctype/i, "the publish skeleton supplies the doctype");
  assert.doesNotMatch(html, /<meta\s+charset/i, "the publish skeleton supplies the charset");
  assert.match(html, /<title>Which way does it fly\?<\/title>/);
});

test("the entry page never reaches above the bundle root", () => {
  const out = fresh("no-escape");
  buildBundle(join(ROOT, "lab/topics/truck-and-fly.html"), out);
  const html = readFileSync(join(out, "index.html"), "utf8");
  assert.doesNotMatch(html, /["']\.\.\//, "a ../ in the entry points outside what was published");
});

test("building twice gives the same bundle", () => {
  const a = fresh("det-a"), b = fresh("det-b");
  const ra = buildBundle(join(ROOT, "lab/topics/what-keeps-it-moving.html"), a);
  const rb = buildBundle(join(ROOT, "lab/topics/what-keeps-it-moving.html"), b);
  assert.deepEqual(ra.files, rb.files);
  for (const f of ra.files)
    assert.equal(readFileSync(join(a, f), "utf8"), readFileSync(join(b, f), "utf8"), f);
});

test("the check catches a bare specifier — the exact mistake that blanked topic 1", () => {
  const dir = fresh("bad-bare");
  mkdirSync(join(dir, "harness"), { recursive: true });
  writeFileSync(join(dir, "harness/lab.js"), "export const x = 1;\n");
  writeFileSync(join(dir, "index.html"),
    '<title>t</title>\n<script type="module">\nimport { x } from "harness/lab.js";\n</script>\n');
  const errors = checkBundle(dir);
  assert.ok(errors.some((e) => /bare specifier/i.test(e)), errors.join("\n"));
});

test("the check catches an import whose file is not in the bundle", () => {
  const dir = fresh("bad-missing");
  writeFileSync(join(dir, "index.html"),
    '<title>t</title>\n<script type="module">\nimport { x } from "./gone.js";\n</script>\n');
  const errors = checkBundle(dir);
  assert.ok(errors.some((e) => /not in the bundle/i.test(e)), errors.join("\n"));
});

test("the check catches a missing stylesheet", () => {
  const dir = fresh("bad-css");
  writeFileSync(join(dir, "index.html"), '<title>t</title>\n<link rel="stylesheet" href="./nope.css">\n');
  const errors = checkBundle(dir);
  assert.ok(errors.some((e) => /nope\.css/.test(e)), errors.join("\n"));
});

test("specifiers are found across multi-line imports and ignored in comments", () => {
  const src = `
    // import nothing from "./commented-out.js";
    /* import { also } from "./block-commented.js"; */
    import {
      a,
      b,
    } from "./multi.js";
    import "./side-effect.js";
    export { c } from "./reexport.js";
    const u = "https://fonts.example/not-an-import";
  `;
  assert.deepEqual(specifiersIn(src).sort(), ["./multi.js", "./reexport.js", "./side-effect.js"]);
});

test("the hub bundles as one page carrying every scenario, the record and the notebook", async () => {
  const out = fresh("hub");
  const { files } = buildBundle(join(ROOT, "lab/index.html"), out);
  assert.deepEqual(checkBundle(out), []);
  for (const f of ["hub/app.js", "record/view.js", "notebook/store.mjs", "scenario/mount.js",
                   "scenarios/which-way-does-it-fly.mjs", "scenarios/truck-and-fly.mjs",
                   "scenarios/what-keeps-it-moving.mjs", "harness/lab.css", "record/record.css"])
    assert.ok(files.includes(f), `hub bundle is missing ${f}`);
  const html = readFileSync(join(out, "index.html"), "utf8");
  const probe = join(out, "__entry-probe.mjs");
  writeFileSync(probe, specifiersIn(html).map((s) => `import ${JSON.stringify(s)};`).join("\n") + "\n");
  await import(pathToFileURL(probe).href);
});

/* ── Assets referenced from CSS (P-76) ────────────────────────────────────
 *
 * The bundler followed stylesheets and import graphs but never looked inside
 * a stylesheet, so a self-hosted font would have been referenced by CSS that
 * shipped and a file that did not. The page would have fallen back silently
 * to a system font — the worst kind of broken, because it still looks fine.
 */

test("a file referenced by url() in CSS is copied into the bundle", () => {
  const out = fresh("css-assets");
  const { files } = buildBundle(join(ROOT, "lab/index.html"), out);
  const fonts = files.filter((f) => f.endsWith(".woff2"));
  assert.ok(fonts.length > 0, "the bundle carries no fonts at all");
  for (const f of fonts)
    assert.ok(statSync(join(out, f)).size > 1000, `${f} is present but empty`);
});

test("the bundle asks no third party for anything", () => {
  // P-44's invariant, the half that was left for this ticket. Fonts were the
  // only offender; this stops the next one arriving unnoticed.
  const out = fresh("third-party");
  buildBundle(join(ROOT, "lab/index.html"), out);
  const offenders = [];
  for (const f of walkAll(out)) {
    if (!/\.(html|css|m?js)$/i.test(f)) continue;
    for (const [n, line] of readFileSync(f, "utf8").split("\n").entries()) {
      const m = line.match(/https?:\/\/[^\s"')]+/);
      // The SVG namespace is an identifier, not a fetch — nothing is requested.
      if (m && !m[0].startsWith("http://www.w3.org/")) 
        offenders.push(`${relative(out, f)}:${n + 1}  ${m[0]}`);
    }
  }
  assert.deepEqual(offenders, [], `the lab must ask no third party for anything:\n  ${offenders.join("\n  ")}`);
});

test("a font's licence travels with it", () => {
  // The OFL permits redistribution and requires the licence to accompany the
  // fonts. A bundle is a redistribution, so a bundle without OFL.txt is not
  // one we are allowed to publish. P-76.
  const out = fresh("font-licence");
  const { files } = buildBundle(join(ROOT, "lab/index.html"), out);
  const fontDirs = new Set(files.filter((f) => f.endsWith(".woff2")).map((f) => dirname(f)));
  assert.ok(fontDirs.size > 0, "no fonts to check");
  for (const dir of fontDirs) {
    const licences = files.filter((f) => dirname(f) === dir && /^(OFL|LICEN[SC]E)/i.test(f.split("/").pop()));
    assert.ok(licences.length > 0, `${dir} ships fonts with no licence text beside them`);
  }
});

test("a string containing the word from is not an import", () => {
  // P-77. `label: "drop from"` in an exported array made the scanner read
  // everything up to the next quote as a module specifier, and the build
  // failed with a bare-specifier error pointing at nothing recognisable.
  const src = 'export const controls = [\n' +
              '  { key: "height", label: "drop from", min: 5, unit: " m" },\n' +
              '];\n' +
              'import { stepFall } from "../components/falling.mjs";\n';
  assert.deepEqual(specifiersIn(src), ["../components/falling.mjs"]);
});

test("real imports and re-exports are still found", () => {
  const src = [
    'import a from "./a.mjs";',
    'import { b, c } from "../b/c.mjs";',
    'export { d } from "./d.mjs";',
    'import "./side-effect.mjs";',
    'const lazy = await import("./lazy.mjs");',
  ].join("\n");
  assert.deepEqual(specifiersIn(src).sort(),
    ["../b/c.mjs", "./a.mjs", "./d.mjs", "./lazy.mjs", "./side-effect.mjs"]);
});

test("the built page declares a viewport, because Pages supplies nothing", () => {
  // P-86. The build stripped every meta tag, which is right for an artifact:
  // its publish skeleton supplies charset and viewport itself. The same bundle
  // also ships to GitHub Pages and the dev server, which supply nothing — so
  // the public lab had no viewport at all and a phone rendered it at desktop
  // width, scaled down to unreadable.
  //
  // The source pages all carried the tag, which is exactly why nobody saw it:
  // this asserts on the BUILT output.
  const out = fresh("viewport");
  buildBundle(join(ROOT, "lab/index.html"), out);
  const html = readFileSync(join(out, "index.html"), "utf8");
  assert.match(html, /<meta\s+name="viewport"[^>]*width=device-width/i,
    "the built page must declare a viewport");
  assert.match(html, /viewport-fit=cover/i,
    "matching the artifact skeleton exactly, so a duplicate tag there is harmless");
});

test("every built topic page declares a viewport, not just the hub", () => {
  for (const slug of TOPICS) {
    const out = fresh(`viewport-${slug}`);
    buildBundle(join(ROOT, "lab/topics", `${slug}.html`), out);
    assert.match(readFileSync(join(out, "index.html"), "utf8"), /<meta\s+name="viewport"/i,
      `${slug} has no viewport`);
  }
});
