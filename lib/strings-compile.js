#!/usr/bin/env node
// Merges data/strings/source/**/*.json into per-language compiled bundles
// and writes manifest.json with content hashes per key for stale detection.
//
// Also writes per-scope bundles under data/strings/compiled/scopes/ — one
// file per source file's declared _meta.scope, per language. This exists
// alongside the flat strings.{lang}.json bundle (not instead of it): a page
// can keep fetching the flat bundle (today's default, still fully supported)
// or opt into fetching only its own scope + 'common' once it declares
// window.VEX_STRING_SCOPES (see widgets/lang-fab.js). The flat bundle does
// not scale to a large page count — every page pays for every string on
// every load regardless of relevance — but nothing is forced to migrate at
// once. See docs/architecture/06-i18n.md, "Scaling past one bundle."
//
// Pure functions exported for testing:
//   mergeSourceFiles(rawFiles) → merged object
//   buildBundles(merged) → { [lang]: bundle }
//   buildManifest(merged) → manifest object
//   contentHash(text) → 12-char hex string
//   groupSourceFilesByScope(filesWithMeta) → { [scopeKey]: rawFiles[] }
//   buildScopedBundles(groups) → { [scopeKey]: { [lang]: bundle } }

const fs     = require('fs');
const path   = require('path');
const crypto = require('crypto');
const { logger } = require('./logger');
const { CODES }  = require('./logger-codes');

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
    const scope = meta.scope || 'common';
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
  const SCOPES_OUT_DIR = path.join(OUT_DIR, 'scopes');
  fs.mkdirSync(SCOPES_OUT_DIR, { recursive: true });

  const groups = groupSourceFilesByScope(filesWithMeta);
  const scopedBundles = buildScopedBundles(groups);
  const scopeIndex = {}; // groupKey → { [lang]: keyCount } — lets a consumer discover what's available without fetching every file

  for (const [groupKey, langBundles] of Object.entries(scopedBundles)) {
    scopeIndex[groupKey] = {};
    for (const [lang, bundle] of Object.entries(langBundles)) {
      const outPath = path.join(SCOPES_OUT_DIR, `${groupKey}.${lang}.json`);
      fs.writeFileSync(outPath, JSON.stringify(bundle, null, 2) + '\n');
      scopeIndex[groupKey][lang] = Object.keys(bundle).length;
    }
  }
  fs.writeFileSync(path.join(SCOPES_OUT_DIR, 'index.json'), JSON.stringify(scopeIndex, null, 2) + '\n');
  console.log(`[strings-compile] Wrote ${Object.keys(scopedBundles).length} scope bundles → ${path.relative(process.cwd(), SCOPES_OUT_DIR)}/`);
}

module.exports = { mergeSourceFiles, buildBundles, buildManifest, contentHash, groupSourceFilesByScope, buildScopedBundles };

// [VXG RealForever]
