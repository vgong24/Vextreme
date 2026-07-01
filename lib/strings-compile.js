#!/usr/bin/env node
// Merges data/strings/source/**/*.json into per-language compiled bundles
// and writes manifest.json with content hashes per key for stale detection.

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const SOURCE_DIR = path.join(__dirname, '../data/strings/source');
const OUT_DIR = path.join(__dirname, '../data/strings/compiled');
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

function hash(text) {
  return crypto.createHash('sha256').update(text).digest('hex').slice(0, 12);
}

const files = collectSourceFiles(SOURCE_DIR);

// keyed by string ID → { en: { text, ... }, ja: { text, ... }, ... }
const merged = {};

for (const file of files) {
  const raw = JSON.parse(fs.readFileSync(file, 'utf8'));
  for (const [key, value] of Object.entries(raw)) {
    if (key === '_meta') continue;
    if (!value.strings) {
      console.warn(`[strings-compile] SKIP "${key}" in ${file} — missing 'strings' namespace`);
      continue;
    }
    if (merged[key]) {
      console.warn(`[strings-compile] DUPLICATE KEY: "${key}" in ${file} — skipping`);
      continue;
    }
    merged[key] = value;
  }
}

// Detect languages present across all keys (read from .strings namespace)
const langs = new Set();
for (const value of Object.values(merged)) {
  for (const lang of Object.keys(value.strings)) {
    langs.add(lang);
  }
}

// Write per-language bundle: { "key": { "text": "...", "aria-label": "..." } }
fs.mkdirSync(OUT_DIR, { recursive: true });

for (const lang of langs) {
  const bundle = {};
  for (const [key, value] of Object.entries(merged)) {
    if (value.strings[lang]) {
      bundle[key] = value.strings[lang];
    }
  }
  const outPath = path.join(OUT_DIR, `strings.${lang}.json`);
  fs.writeFileSync(outPath, JSON.stringify(bundle, null, 2) + '\n');
  console.log(`[strings-compile] Wrote ${outPath} (${Object.keys(bundle).length} keys)`);
}

// Write manifest: { "key": { "enHash": "...", "langs": ["en", "ja"] } }
const manifest = {};
for (const [key, value] of Object.entries(merged)) {
  const enText = value.strings.en ? JSON.stringify(value.strings.en) : null;
  manifest[key] = {
    enHash: enText ? hash(enText) : null,
    langs: Object.keys(value.strings),
  };
}
fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2) + '\n');
console.log(`[strings-compile] Wrote manifest.json (${Object.keys(manifest).length} keys)`);

// [VXG RealForever]
