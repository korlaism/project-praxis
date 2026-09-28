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
/**
 * Blank out everything in a JavaScript source that is not code, keeping every
 * offset. P-81.
 *
 * The scanner this replaces matched patterns against the raw file with
 * comments crudely stripped, and it was wrong twice in a week: it read
 * `label: "drop from"` inside an exported array as an import (P-77), and its
 * comment stripper only removed comments that STARTED a line, so anything
 * after code on the same line was still scanned.
 *
 * This is not a parser and does not pretend to be one. It is a single pass
 * that knows where a comment, a string, a template and a regex literal begin
 * and end — which is all that separates "code that imports something" from
 * "text that mentions importing something".
 *
 * Comments, templates and regexes become spaces entirely. A string keeps its
 * two quote characters and loses its interior, so `from "./x.mjs"` still looks
 * like an import while `"import ./x.mjs"` no longer does. The specifier itself
 * is then read out of the ORIGINAL source by offset.
 *
 * Known limit, stated rather than discovered later: an `import()` written
 * inside a template expression is invisible here. Nothing in this repository
 * does that, and a static import cannot be written that way at all.
 */
export function maskNonCode(src) {
  const out = src.split("");
  const blank = (from, to) => { for (let i = from; i < to && i < out.length; i++) if (out[i] !== "\n") out[i] = " "; };
  // A slash starts a regex only where a value may begin. Standard heuristic,
  // and enough for the plain modules this bundles.
  const REGEX_OK = new Set(["(", ",", "=", ":", "[", "!", "&", "|", "?", "{", "}", ";", "+", "-", "*", "%", "<", ">", "~", "^"]);

  let i = 0, lastSignificant = "";
  while (i < src.length) {
    const c = src[i], next = src[i + 1];

    if (c === "/" && next === "/") {
      let j = src.indexOf("\n", i); if (j === -1) j = src.length;
      blank(i, j); i = j; continue;
    }
    if (c === "/" && next === "*") {
      let j = src.indexOf("*/", i + 2); j = j === -1 ? src.length : j + 2;
      blank(i, j); i = j; continue;
    }
    if (c === '"' || c === "'") {
      let j = i + 1;
      while (j < src.length && src[j] !== c) { if (src[j] === "\\") j++; j++; }
      blank(i + 1, j);                       // interior only: the quotes stay
      i = Math.min(j + 1, src.length); lastSignificant = c; continue;
    }
    if (c === "`") {
      let j = i + 1;
      while (j < src.length && src[j] !== "`") { if (src[j] === "\\") j++; j++; }
      blank(i, Math.min(j + 1, src.length));  // the whole template, delimiters too
      i = Math.min(j + 1, src.length); lastSignificant = "`"; continue;
    }
    if (c === "/" && (lastSignificant === "" || REGEX_OK.has(lastSignificant))) {
      let j = i + 1, klass = false;
      while (j < src.length) {
        const d = src[j];
        if (d === "\\") { j += 2; continue; }
        if (d === "[") klass = true;
        else if (d === "]") klass = false;
        else if (d === "/" && !klass) break;
        else if (d === "\n") break;          // not a regex after all
        j++;
      }
      if (src[j] === "/") { blank(i, j + 1); i = j + 1; lastSignificant = "/"; continue; }
    }
    if (!/\s/.test(c)) lastSignificant = c;
    i++;
  }
  return out.join("");
}

/** Every module specifier a source imports or re-exports from. */
export function specifiersIn(src) {
  const masked = maskNonCode(src);
  const found = new Set();
  const patterns = [
    /\b(?:import|export)\s[^;"'`]*?\bfrom\s*(["'])([^"']*)\1/dg,   // import x from "…", export {…} from "…"
    /\bimport\s*(["'])([^"']*)\1/dg,                                 // import "…"
    /\bimport\(\s*(["'])([^"']*)\1\s*\)/dg,                          // import("…")
  ];
  for (const re of patterns) {
    for (const m of masked.matchAll(re)) {
      // Matched against the masked copy; read the specifier out of the real one.
      const [start, end] = m.indices[2];
      const spec = src.slice(start, end);
      if (spec) found.add(spec);
    }
  }
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

/**
 * Entries a page loads with <script src>. P-56.
 *
 * The bundler followed imports and stylesheets and had no notion of <script>,
 * so a page loading its code this way bundled without it — and checkBundle did
 * not look either, so the bundle passed its own check and shipped broken. Our
 * own pages use an inline `import "./x.js"`, which is the only reason this
 * never bit.
 */
export function scriptsIn(html) {
  const out = [];
  for (const tag of html.match(/<script\b[^>]*>/gi) ?? []) {
    const src = tag.match(/\bsrc\s*=\s*["']([^"']+)["']/i)?.[1];
    if (src) out.push(src);
  }
  return out;
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
    const refs = isHtml(file) ? [...stylesheetsIn(src), ...scriptsIn(src), ...specifiersIn(src)]
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
  //
  // The VIEWPORT and the CHARSET stay. Everything else here is dropped because
  // an artifact's publish skeleton provides it — but this bundle also ships to
  // GitHub Pages, to the dev server, and (ADR 0008) to anyone who self-hosts
  // it, and a bundle other people will host has to describe itself.
  //
  // Viewport (P-86): without it a phone renders the lab at desktop width and
  // scales it down to unreadable.
  //
  // Charset (P-85): Pages sends `text/html; charset=utf-8` and our own nginx
  // sent a bare `text/html`, so the same file rendered correctly in one place
  // and as mojibake in the other. It stayed hidden for weeks because the lab's
  // non-ASCII text lives in .mjs modules, which are always decoded as UTF-8 by
  // spec; the landing put an em-dash in its <title> and the page went wrong.
  //
  // Keeping both is safe: the source tags are byte-identical to the skeleton's,
  // so an artifact simply carries each declaration twice.
  const keepMeta = (l) => /^\s*<meta\s+(name="viewport"|charset)/i.test(l);
  let html = readFileSync(entryAbs, "utf8")
    .split("\n")
    .filter((l) => !/^\s*<!doctype/i.test(l) && (keepMeta(l) || !/^\s*<meta\b/i.test(l)))
    .join("\n");
  for (const ref of [...stylesheetsIn(html), ...scriptsIn(html), ...specifiersIn(html)]) {
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
      ...(isHtml(file) ? scriptsIn(src).map((r) => ["script", r]) : []),
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
