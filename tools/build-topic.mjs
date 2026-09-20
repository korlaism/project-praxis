#!/usr/bin/env node
/**
 * Build a publishable bundle from a lab page, and check it.
 *
 *   node tools/build-topic.mjs lab/topics/which-way-does-it-fly.html [outDir]
 *
 * Follows the whole import graph from the page, copies every file it reaches
 * into outDir at its path relative to the graph's common root, and writes the
 * page itself as index.html with every reference rewritten relative to the
 * bundle root. Then it checks the result and refuses to succeed if anything is
 * bare, missing, or reaches outside the bundle.
 *
 * Exists because doing this by hand once produced a blank page (P-35).
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, statSync, copyFileSync } from "node:fs";
import { dirname, join, relative, resolve, sep, basename, extname } from "node:path";

const isExternal = (s) => /^(https?:|data:|blob:)/i.test(s);
const isRelative = (s) => s.startsWith("./") || s.startsWith("../") || s.startsWith("/");
const isBare = (s) => !isExternal(s) && !isRelative(s);

/** Remove comments without touching "//" inside strings such as URLs. */
function stripComments(src) {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^[ \t]*\/\/.*$/gm, "");
}

/** Every module specifier a source imports or re-exports from. */
export function specifiersIn(src) {
  const code = stripComments(src);
  const found = new Set();
  const patterns = [
    /\b(?:import|export)\s[^;]*?\bfrom\s*["']([^"']+)["']/g,   // import x from "…", export {…} from "…"
    /\bimport\s*["']([^"']+)["']/g,                            // import "…"
    /\bimport\(\s*["']([^"']+)["']\s*\)/g,                     // import("…")
  ];
  for (const re of patterns) for (const m of code.matchAll(re)) found.add(m[1]);
  return [...found];
}

/**
 * Files a stylesheet points at with url(...) — fonts, images. P-76.
 *
 * Skips data: URIs, which are already inline, and anything absolute, which is
 * someone else's server and refused elsewhere.
 */
export function urlsIn(css) {
  return [...css.matchAll(/url\(\s*(["']?)([^"')]+)\1\s*\)/g)]
    .map((m) => m[2].trim())
    .filter((u) => u && !/^data:/i.test(u));
}

function stylesheetsIn(html) {
  const out = [];
  for (const tag of html.match(/<link\b[^>]*>/gi) ?? []) {
    if (!/\brel\s*=\s*["']stylesheet["']/i.test(tag)) continue;
    const href = tag.match(/\bhref\s*=\s*["']([^"']+)["']/i)?.[1];
    if (href) out.push(href);
  }
  return out;
}

const isHtml = (f) => /\.html?$/i.test(f);
const isModule = (f) => /\.m?js$/i.test(f);

function commonRoot(paths) {
  const parts = paths.map((p) => dirname(p).split(sep));
  const first = parts[0];
  let n = first.length;
  for (const p of parts) {
    let i = 0;
    while (i < n && i < p.length && p[i] === first[i]) i++;
    n = i;
  }
  return first.slice(0, n).join(sep) || sep;
}

/** Walk the graph from a page. Throws on anything the source itself gets wrong. */
function collect(entry) {
  const seen = new Set();
  const queue = [resolve(entry)];
  // Files a stylesheet points at with url(). They are carried into the bundle
  // but never read as source: a woff2 parsed as UTF-8 is noise, and noise that
  // looks like an import throws (P-76).
  const assets = new Set();
  while (queue.length) {
    const file = queue.shift();
    if (seen.has(file)) continue;
    if (!existsSync(file)) throw new Error(`referenced file does not exist: ${file}`);
    seen.add(file);
    const src = readFileSync(file, "utf8");
    const refs = isHtml(file) ? [...stylesheetsIn(src), ...specifiersIn(src)]
               : /\.css$/i.test(file) ? urlsIn(src)
               : specifiersIn(src);
    for (const ref of refs) {
      if (isExternal(ref)) continue;
      if (isBare(ref)) throw new Error(`bare specifier "${ref}" in ${file} — use "./" or "../"`);
      const target = resolve(dirname(file), ref);
      if (isModule(target) || /\.css$/i.test(target)) queue.push(target);
      else assets.add(target);     // a font, an image: carried, never parsed
    }
  }
  for (const a of assets) {
    if (!existsSync(a)) throw new Error(`referenced file does not exist: ${a}`);
    seen.add(a);
    // The OFL permits redistribution and requires its text to accompany the
    // fonts. A bundle IS a redistribution, so the licence sitting beside an
    // asset is carried whether or not anything references it (P-76).
    const dir = dirname(a);
    for (const name of readdirSync(dir))
      if (/^(OFL|LICEN[SC]E)/i.test(name)) seen.add(join(dir, name));
  }
  return [...seen];
}

export function buildBundle(entry, outDir) {
  const entryAbs = resolve(entry);
  const all = collect(entryAbs);
  const root = commonRoot(all);
  mkdirSync(outDir, { recursive: true });

  const files = [];
  for (const abs of all) {
    if (abs === entryAbs) continue;
    const rel = relative(root, abs).split(sep).join("/");
    mkdirSync(dirname(join(outDir, rel)), { recursive: true });
    copyFileSync(abs, join(outDir, rel));
    files.push(rel);
  }

  // The page: strip what the publish skeleton supplies, and point every local
  // reference at the bundle root — "./x", never "x", never "../x".
  let html = readFileSync(entryAbs, "utf8")
    .split("\n")
    .filter((l) => !/^\s*<!doctype/i.test(l) && !/^\s*<meta\b/i.test(l))
    .join("\n");
  for (const ref of [...stylesheetsIn(html), ...specifiersIn(html)]) {
    if (isExternal(ref)) continue;
    const rel = "./" + relative(root, resolve(dirname(entryAbs), ref)).split(sep).join("/");
    for (const q of ['"', "'"]) html = html.split(q + ref + q).join(q + rel + q);
  }
  writeFileSync(join(outDir, "index.html"), html);
  files.push("index.html");

  return { files: files.sort(), root };
}

function walk(dir, base = dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, base, out);
    else out.push(p);
  }
  return out;
}

/** Everything wrong with a bundle, as a list. Empty means publishable. */
export function checkBundle(dir) {
  const errors = [];
  const top = resolve(dir);
  if (!existsSync(join(top, "index.html"))) errors.push("no index.html at the bundle root");

  for (const file of walk(top)) {
    if (!isHtml(file) && !isModule(file)) continue;
    const src = readFileSync(file, "utf8");
    const where = relative(top, file);
    const refs = [
      ...(isHtml(file) ? stylesheetsIn(src).map((r) => ["stylesheet", r]) : []),
      ...specifiersIn(src).map((r) => ["import", r]),
    ];
    for (const [kind, ref] of refs) {
      if (isExternal(ref)) continue;
      if (isBare(ref)) { errors.push(`${where}: bare specifier "${ref}" — resolves to nothing without an import map`); continue; }
      const target = resolve(dirname(file), ref);
      if (!target.startsWith(top + sep)) { errors.push(`${where}: ${kind} "${ref}" reaches outside the bundle`); continue; }
      if (!existsSync(target)) errors.push(`${where}: ${kind} "${ref}" is not in the bundle`);
    }
  }
  return errors;
}

// ---- CLI ----------------------------------------------------------------
if (import.meta.url === `file://${process.argv[1]}`) {
  const entry = process.argv[2];
  if (!entry) { console.error("usage: node tools/build-topic.mjs <page.html> [outDir]"); process.exit(2); }
  const out = process.argv[3] ?? join("dist", basename(entry, extname(entry)));
  const { files } = buildBundle(entry, out);
  const errors = checkBundle(out);
  if (errors.length) { console.error("bundle is NOT publishable:\n  " + errors.join("\n  ")); process.exit(1); }
  // The map the Artifact tool's `files` parameter takes: published path -> source.
  const map = Object.fromEntries(files.filter((f) => f !== "index.html").map((f) => [f, join(out, f)]));
  console.log(JSON.stringify({ entry: join(out, "index.html"), files: map }, null, 2));
}
