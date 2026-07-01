#!/usr/bin/env node
// Merges data/strings/source/**/*.json into per-language compiled bundles
// and writes manifest.json with content hashes per key for stale detection.
//
// Pure functions exported for testing:
//   mergeSourceFiles(rawFiles) → merged object
//   buildBundles(merged) → { [lang]: bundle }
//   buildManifest(merged) → manifest object
//   contentHash(text) → 12-char hex string

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

// ── I/O — only runs when executed directly ────────────────────────────────────

if (require.main === module) {
  const files  = collectSourceFiles(SOURCE_DIR);
  const rawFiles = files.map(f => JSON.parse(fs.readFileSync(f, 'utf8')));

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
}

module.exports = { mergeSourceFiles, buildBundles, buildManifest, contentHash };

// [VXG RealForever]
