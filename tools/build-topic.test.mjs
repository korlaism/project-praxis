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
import { mkdirSync, writeFileSync, readFileSync, rmSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { buildBundle, checkBundle, specifiersIn } from "./build-topic.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SCRATCH = join(ROOT, "dist", ".test");
const TOPICS = ["which-way-does-it-fly", "truck-and-fly", "what-keeps-it-moving"];

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

test("the entry page is artifact-ready: no doctype or meta, title kept", () => {
  const out = fresh("entry-shape");
  buildBundle(join(ROOT, "lab/topics/which-way-does-it-fly.html"), out);
  const html = readFileSync(join(out, "index.html"), "utf8");
  assert.doesNotMatch(html, /<!doctype/i, "the publish skeleton supplies the doctype");
  assert.doesNotMatch(html, /<meta\b/i, "the publish skeleton supplies the meta tags");
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
