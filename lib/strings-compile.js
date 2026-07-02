#!/usr/bin/env node
// Merges data/strings/source/**/*.json into per-language compiled bundles
// and writes manifest.json with content hashes per key for stale detection.
//
// Also writes per-scope bundles under data/strings/compiled/scopes/ — one
// file per source file's declared _meta.scope, per language, organized by
// _meta.category:
//
//   category "system"     → scopes/system/{scope}.{lang}.json        (common strings)
//   category "production" → scopes/production/{scope...}.{lang}.json  (default for content pages)
//   category "demo"       → scopes/demo/{scope...}.{lang}.json        (architecture reference pages)
//   category "staging"    → scopes/staging/{scope...}.{lang}.json     (in-progress, not indexed)
//
// Dots in scope names become path segments: "pages.foo" → "pages/foo.{lang}.json"
// within the category directory. This keeps the root of scopes/ clean as page
// count grows (all production pages land in scopes/production/pages/) and makes
// paths inspectable without any runtime lookup table.
//
// The flat strings.{lang}.json bundle is unchanged and still the default for
// pages that haven't declared window.VEX_STRING_SCOPES. See
// docs/architecture/06-i18n.md, "Scaling past one bundle."
//
// Pure functions exported for testing:
//   mergeSourceFiles(rawFiles) → merged object
//   buildBundles(merged) → { [lang]: bundle }
//   buildManifest(merged) → manifest object
//   contentHash(text) → 12-char hex string
//   groupSourceFilesByScope(filesWithMeta) → { [scopeKey]: rawFiles[] }
//   buildScopedBundles(groups) → { [scopeKey]: { [lang]: bundle } }
//
// LATTICE
//   role      : strings pipeline compiler — reads source JSON, writes compiled bundles
//               and manifest; the build-side write of the i18n data flow
//   reads     : data/strings/source/**/*.json (keyed string source files)
//               lib/vex-config.js (Category, Scope, scopeRelPath, DEFAULT_CATEGORY)
//   writes    : data/strings/compiled/strings.{lang}.json (flat bundle, legacy)
//               data/strings/compiled/scopes/{category}/{scope}.{lang}.json (per-scope)
//               data/strings/compiled/manifest.json (content hashes for stale detection)
//   loaded-by : lib/build-vextreme.js (reads scope bundles for God Script assembly),
//               widgets/fab-lang.js (fetches scope bundles at runtime for JA),
//               lib/strings-check.js (reads manifest for stale detection),
//               tests/02-strings-pipeline.test.js
//   tested-by : tests/02-strings-pipeline.test.js
//
// CHANGE MAP — if you touch X here, also check:
//   scopeRelPath() path rule  → lib/vex-config.js (canonical impl lives there) and
//                                widgets/fab-lang.js (applies the same rule at runtime) —
//                                all three must agree or fetches will 404
//   manifest schema           → lib/strings-check.js (reads enHash, _stale),
//                                tests/02
//   scope bundle schema       → lib/build-vextreme.js readScopeBundle() + mergeScopes(),
//                                tests/08
//   category routing logic    → lib/vex-config.js Category.* constants,
//                                data/strings/source/_meta.category values

const fs     = require('fs');
const path   = require('path');
const crypto = require('crypto');
const { logger } = require('./logger');
const { CODES }  = require('./logger-codes');
const { Category, DEFAULT_CATEGORY, Scope, scopeRelPath } = require('./vex-config');

const SOURCE_DIR    = path.join(__dirname, '../data/strings/source');
const OUT_DIR       = path.join(__dirname, '../data/strings/compiled');
const MANIFEST_PATH = path.join(OUT_DIR, 'manifest.json');

function collectSourceFiles(dir) {
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...collectSourceFiles(full));
    } else if (entry.name.endsWith('.json') && entry.name !== '_meta.json') {
      results.push(full);
    }
  }
  return results;
}

function contentHash(text) {
  return crypto.createHash('sha256').update(text).digest('hex').slice(0, 12);
}

// mergeSourceFiles — takes an array of parsed source file objects,
// merges all string keys into one map, warns on duplicates and bad shape.
function mergeSourceFiles(rawFiles) {
  const merged = {};
  for (const raw of rawFiles) {
    for (const [key, value] of Object.entries(raw)) {
      if (key === '_meta') continue;
      if (!value.strings) {
        logger.warn({ code: CODES.STRINGS_MISSING_NAMESPACE, message: `missing 'strings' namespace — skipped`, key });
        continue;
      }
      if (merged[key]) {
        logger.warn({ code: CODES.STRINGS_DUPLICATE_KEY, message: `duplicate key — skipping`, key });
        continue;
      }
      merged[key] = value;
    }
  }
  return merged;
}

// buildBundles — produces per-language flat bundles from merged source.
// Each bundle: { "key": { "text": "...", "aria-label": "..." } }
function buildBundles(merged) {
  const langs = new Set();
  for (const value of Object.values(merged)) {
    for (const lang of Object.keys(value.strings)) langs.add(lang);
  }

  const bundles = {};
  for (const lang of langs) {
    const bundle = {};
    for (const [key, value] of Object.entries(merged)) {
      if (value.strings[lang]) bundle[key] = value.strings[lang];
    }
    bundles[lang] = bundle;
  }
  return bundles;
}

// buildManifest — produces { key → { enHash, langs } } for stale detection.
function buildManifest(merged) {
  const manifest = {};
  for (const [key, value] of Object.entries(merged)) {
    const enText = value.strings.en ? JSON.stringify(value.strings.en) : null;
    manifest[key] = {
      enHash: enText ? contentHash(enText) : null,
      langs:  Object.keys(value.strings),
    };
  }
  return manifest;
}

// groupSourceFilesByScope — buckets raw source file objects by their declared
// _meta.scope, so each scope can be compiled into its own bundle instead of
// only the flat one. A file missing _meta.scope is grouped under 'common'
// with a warning — every source file is expected to declare a scope.
//
// A file may also declare _meta.variant (e.g. "b" for an A/B copy test, or
// "staging" for an in-progress translation draft not yet promoted). Variant
// files compile to their own sibling bundle (scope::variant) rather than
// merging into the canonical scope bundle, so a variant can be authored,
// reviewed, and even shipped to a test cohort without touching production
// strings for that scope.
//
// filesWithMeta: [{ raw: <parsed JSON>, file: <path, for warnings> }]
function groupSourceFilesByScope(filesWithMeta) {
  const groups = {};
  for (const { raw, file } of filesWithMeta) {
    const meta  = raw._meta || {};
    const scope = meta.scope || Scope.COMMON;
    if (!meta.scope) {
      logger.warn({ code: CODES.STRINGS_MISSING_SCOPE, message: `source file has no _meta.scope — grouped under 'common'`, file });
    }
    // "." not "::" — the group key becomes part of a filename below, and
    // ":" is invalid there on some filesystems (notably Windows).
    const groupKey = meta.variant ? `${scope}.variant-${meta.variant}` : scope;
    groups[groupKey] = groups[groupKey] || [];
    groups[groupKey].push(raw);
  }
  return groups;
}

// buildScopedBundles — compiles each scope group into its own per-language
// bundle, same shape as buildBundles() output. This is what lets a page fetch
// "common + my own scope" instead of every string in the project.
function buildScopedBundles(groups) {
  const scoped = {};
  for (const [groupKey, rawFiles] of Object.entries(groups)) {
    scoped[groupKey] = buildBundles(mergeSourceFiles(rawFiles));
  }
  return scoped;
}

// ── I/O — only runs when executed directly ────────────────────────────────────

if (require.main === module) {
  const files = collectSourceFiles(SOURCE_DIR);
  const filesWithMeta = files.map(f => ({ raw: JSON.parse(fs.readFileSync(f, 'utf8')), file: path.relative(SOURCE_DIR, f) }));
  const rawFiles = filesWithMeta.map(f => f.raw);

  const merged   = mergeSourceFiles(rawFiles);
  const bundles  = buildBundles(merged);
  const manifest = buildManifest(merged);

  fs.mkdirSync(OUT_DIR, { recursive: true });

  for (const [lang, bundle] of Object.entries(bundles)) {
    const outPath = path.join(OUT_DIR, `strings.${lang}.json`);
    fs.writeFileSync(outPath, JSON.stringify(bundle, null, 2) + '\n');
    console.log(`[strings-compile] Wrote ${outPath} (${Object.keys(bundle).length} keys)`);
  }

  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2) + '\n');
  console.log(`[strings-compile] Wrote manifest.json (${Object.keys(manifest).length} keys)`);

  // Per-scope bundles — additive, does not replace the flat bundle above.
  // Paths are derived deterministically from _meta.category + _meta.scope:
  //   scopes/{category}/{scope_segment0}/{scope_segment1}/{...}/{last}.{lang}.json
  // No runtime lookup table needed — lang-fab applies the same rule when
  // constructing fetch URLs. See top-of-file comment for category definitions.
  const SCOPES_OUT_DIR = path.join(OUT_DIR, 'scopes');
  fs.mkdirSync(SCOPES_OUT_DIR, { recursive: true });

  // Build a category map before grouping (one category per source file).
  const scopeCategories = {};
  for (const { raw } of filesWithMeta) {
    const meta     = raw._meta || {};
    const scope    = meta.scope || Scope.COMMON;
    const category = meta.category || DEFAULT_CATEGORY;
    const groupKey = meta.variant ? `${scope}.variant-${meta.variant}` : scope;
    if (!scopeCategories[groupKey]) scopeCategories[groupKey] = category;
  }

  const groups = groupSourceFilesByScope(filesWithMeta);
  const scopedBundles = buildScopedBundles(groups);
  const scopeIndex = {}; // groupKey → { category, path, [lang]: keyCount }

  for (const [groupKey, langBundles] of Object.entries(scopedBundles)) {
    const variantIdx  = groupKey.indexOf('.variant-');
    const scopePart   = variantIdx >= 0 ? groupKey.slice(0, variantIdx) : groupKey;
    const variantTag  = variantIdx >= 0 ? groupKey.slice(variantIdx) : ''; // e.g. '.variant-b'
    const category    = scopeCategories[groupKey] || DEFAULT_CATEGORY;
    const segments    = scopePart.split('.');
    const dirSegments = segments.slice(0, -1);
    const baseName    = segments[segments.length - 1] + variantTag;

    const scopeDir = path.join(SCOPES_OUT_DIR, category, ...dirSegments);
    fs.mkdirSync(scopeDir, { recursive: true });

    // relative path within scopes/ (no lang suffix) — stored in index for tooling
    const relPath = scopeRelPath(scopePart, category) + variantTag;
    scopeIndex[groupKey] = { category, path: relPath };

    for (const [lang, bundle] of Object.entries(langBundles)) {
      const outPath = path.join(scopeDir, `${baseName}.${lang}.json`);
      fs.writeFileSync(outPath, JSON.stringify(bundle, null, 2) + '\n');
      scopeIndex[groupKey][lang] = Object.keys(bundle).length;
    }
  }
  fs.writeFileSync(path.join(SCOPES_OUT_DIR, 'index.json'), JSON.stringify(scopeIndex, null, 2) + '\n');
  console.log(`[strings-compile] Wrote ${Object.keys(scopedBundles).length} scope bundles → ${path.relative(process.cwd(), SCOPES_OUT_DIR)}/`);
}

module.exports = { mergeSourceFiles, buildBundles, buildManifest, contentHash, groupSourceFilesByScope, buildScopedBundles };

// [VXG RealForever]
