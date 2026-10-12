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
const { Language } = require('./vex-config');
const { contentHash } = require('./strings-compile');

const SOURCE_DIR = path.join(__dirname, '../data/strings/source');
const EXPORT_DIR = path.join(__dirname, '../data/strings/batches/export');

function parseArgs(args) {
  let filterLang = null;
  let filterScope = null;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--lang' || arg === '--scope') {
      const value = args[++i];
      if (!value || value.startsWith('--')) throw new Error(`${arg} requires a value`);
      if (arg === '--lang') filterLang = value;
      else filterScope = value;
      continue;
    }
    throw new Error(`unknown argument: ${arg}`);
  }

  if (filterLang === Language.EN) throw new Error('EN is the source language and cannot be exported as a translation target');
  return { filterLang, filterScope };
}

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

function csvRow(...cols) {
  return cols.map(escapeCSV).join(',');
}

function targetLanguages(raw, filterLang) {
  if (filterLang) return [filterLang];

  const langs = new Set();
  for (const [key, value] of Object.entries(raw)) {
    if (key === '_meta' || !value.strings) continue;
    for (const lang of Object.keys(value.strings)) {
      if (lang !== Language.EN) langs.add(lang);
    }
  }
  return Array.from(langs).sort();
}

function buildTranslatorCSV(raw, lang) {
  if (!lang || lang === Language.EN) throw new Error('a non-EN target locale is required');

  const meta = raw._meta || {};
  const lines = [
    csvRow(
      'key',
      'context',
      'en_text',
      'en_aria_label',
      'source_en_hash12',
      `${lang}_text`,
      `${lang}_aria_label`,
      'notes',
    ),
  ];

  for (const [key, value] of Object.entries(raw)) {
    if (key === '_meta' || !value.strings) continue;

    const en = value.strings[Language.EN] || {};
    const translation = value.strings[lang] || {};
    const sourceEnHash12 = Object.keys(en).length > 0
      ? contentHash(JSON.stringify(en))
      : '';

    lines.push(csvRow(
      key,
      meta.description || '',
      en.text || '',
      en['aria-label'] || '',
      sourceEnHash12,
      translation.text || '',
      translation['aria-label'] || '',
      translation._stale ? 'STALE — EN source changed, please retranslate' : '',
    ));
  }

  return lines.join('\n') + '\n';
}

function main(args = process.argv.slice(2)) {
  const { filterLang, filterScope } = parseArgs(args);
  const files = collectSourceFiles(SOURCE_DIR, SOURCE_DIR);

  for (const { full, scope } of files) {
    if (filterScope && scope !== filterScope) continue;

    const raw = JSON.parse(fs.readFileSync(full, 'utf8'));
    const langs = targetLanguages(raw, filterLang);

    for (const lang of langs) {
      const outDir = path.join(EXPORT_DIR, scope);
      fs.mkdirSync(outDir, { recursive: true });
      const outPath = path.join(outDir, `${scope}.${lang}.csv`);
      const csv = buildTranslatorCSV(raw, lang);

      fs.writeFileSync(outPath, csv);
      const stringCount = Object.entries(raw)
        .filter(([key, value]) => key !== '_meta' && value.strings)
        .length;
      console.log(`[strings-export] Wrote ${outPath} (${stringCount} strings)`);
    }
  }
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error(`[strings-export] BLOCKED — ${error.message}`);
    process.exitCode = 1;
  }
}

module.exports = {
  parseArgs,
  collectSourceFiles,
  escapeCSV,
  csvRow,
  targetLanguages,
  buildTranslatorCSV,
  main,
};

// [VXG RealForever]
