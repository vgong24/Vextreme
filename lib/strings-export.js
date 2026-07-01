#!/usr/bin/env node
// Exports strings source files to per-scope CSV batches for translators.
// Output: data/strings/batches/export/{scope}/{scope}.{lang}.csv
//
// CSV columns: key, context, en_text, en_aria_label, {lang}_text, {lang}_aria_label, notes
// The translator fills in the {lang}_* columns and returns the CSV for import.
//
// Usage:
//   node lib/strings-export.js [--lang ja] [--scope archives]
//   (no args = export all scopes for all non-EN languages)

const fs = require('fs');
const path = require('path');

const SOURCE_DIR = path.join(__dirname, '../data/strings/source');
const EXPORT_DIR = path.join(__dirname, '../data/strings/batches/export');

const args = process.argv.slice(2);
const filterLang = args.includes('--lang') ? args[args.indexOf('--lang') + 1] : null;
const filterScope = args.includes('--scope') ? args[args.indexOf('--scope') + 1] : null;

function collectSourceFiles(dir, baseDir) {
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    const rel = path.relative(baseDir, full);
    if (entry.isDirectory()) {
      results.push(...collectSourceFiles(full, baseDir));
    } else if (entry.name.endsWith('.json')) {
      results.push({ full, rel, scope: entry.name.replace('.json', '') });
    }
  }
  return results;
}

function escapeCSV(val) {
  if (val == null) return '';
  const s = String(val);
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

function row(...cols) {
  return cols.map(escapeCSV).join(',');
}

const files = collectSourceFiles(SOURCE_DIR, SOURCE_DIR);

for (const { full, scope } of files) {
  if (filterScope && scope !== filterScope) continue;

  const raw = JSON.parse(fs.readFileSync(full, 'utf8'));
  const meta = raw._meta || {};

  // Gather all non-EN languages in this file (read from .strings namespace)
  const langs = new Set();
  for (const [key, value] of Object.entries(raw)) {
    if (key === '_meta') continue;
    if (!value.strings) continue;
    for (const lang of Object.keys(value.strings)) {
      if (lang !== 'en') langs.add(lang);
    }
  }

  for (const lang of langs) {
    if (filterLang && lang !== filterLang) continue;

    const outDir = path.join(EXPORT_DIR, scope);
    fs.mkdirSync(outDir, { recursive: true });
    const outPath = path.join(outDir, `${scope}.${lang}.csv`);

    const lines = [
      row('key', 'context', 'en_text', 'en_aria_label', `${lang}_text`, `${lang}_aria_label`, 'notes'),
    ];

    for (const [key, value] of Object.entries(raw)) {
      if (key === '_meta') continue;
      if (!value.strings) continue;
      const en = value.strings.en || {};
      const translation = value.strings[lang] || {};
      const context = meta.description || '';
      lines.push(row(
        key,
        context,
        en.text || '',
        en['aria-label'] || '',
        translation.text || '',
        translation['aria-label'] || '',
        translation._stale ? 'STALE — EN source changed, please retranslate' : '',
      ));
    }

    fs.writeFileSync(outPath, lines.join('\n') + '\n');
    console.log(`[strings-export] Wrote ${outPath} (${lines.length - 1} strings)`);
  }
}

// [VXG RealForever]
