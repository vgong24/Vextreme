#!/usr/bin/env node
// Exports strings source files to per-scope CSV batches for translators.
// Output: data/strings/batches/export/{scope}/{scope}.{lang}.csv
//
// CSV columns:
//   key, source_en_hash, context, en_text, en_aria_label,
//   {lang}_text, {lang}_aria_label, notes
//
// An explicit --lang may name a NEW target locale that is not present in the
// source file yet. That is the bootstrap path for adding a language without
// seeding fake translations into canonical source first.
//
// Usage:
//   node lib/strings-export.js --lang fr
//   node lib/strings-export.js --lang fr --scope common
//   node lib/strings-export.js
//     (no --lang = export each non-EN language already present per source file)

'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { Language } = require('./vex-config');

const SOURCE_DIR = path.join(__dirname, '../data/strings/source');
const EXPORT_DIR = path.join(__dirname, '../data/strings/batches/export');

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
  if (s.includes(',') || s.includes('"') || s.includes('\n') || s.includes('\r')) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

function csvRow(...cols) {
  return cols.map(escapeCSV).join(',');
}

function contentHash(en) {
  return crypto.createHash('sha256').update(JSON.stringify(en || {})).digest('hex').slice(0, 12);
}

function contextHash(context) {
  return crypto.createHash('sha256').update(String(context || '')).digest('hex').slice(0, 12);
}

function assertTargetLang(lang) {
  if (typeof lang !== 'string' || !/^[a-z][a-z0-9-]*$/.test(lang)) {
    throw new Error('invalid target language: ' + JSON.stringify(lang));
  }
  if (lang === Language.EN) throw new Error('cannot export EN as a translation target');
  return lang;
}

function targetLanguages(raw, explicitLang) {
  if (explicitLang) return [assertTargetLang(explicitLang)];
  const langs = new Set();
  for (const [key, value] of Object.entries(raw)) {
    if (key === '_meta' || !value || !value.strings) continue;
    for (const lang of Object.keys(value.strings)) {
      if (lang !== Language.EN) langs.add(lang);
    }
  }
  return [...langs].sort();
}

function pairedQuestion(raw, key) {
  if (!key.endsWith('.answer')) return null;
  const questionKey = key.slice(0, -'.answer'.length) + '.question';
  const question = raw[questionKey] && raw[questionKey].strings && raw[questionKey].strings.en;
  if (!question || !question.text) return null;
  return { key: questionKey, text: question.text };
}


function nearbyStructuralLabel(raw, key) {
  const parts = key.split('.');
  for (let ancestorLength = parts.length - 2; ancestorLength >= 3; ancestorLength -= 1) {
    const prefix = parts.slice(0, ancestorLength).join('.') + '.';
    const candidates = [];
    for (const [candidateKey, candidate] of Object.entries(raw)) {
      if (candidateKey === '_meta' || candidateKey === key || !candidateKey.startsWith(prefix)) continue;
      const tail = candidateKey.slice(prefix.length).split('.');
      if (tail.length > 2) continue;
      const en = candidate && candidate.strings && candidate.strings.en;
      const text = en && en.text;
      if (typeof text !== 'string' || !text.trim() || text.length > 80) continue;
      if (!/(?:div|span|h[1-6]|label|title)\d*|text001/i.test(tail.join('.'))) continue;
      candidates.push({ key: candidateKey, text: text.trim(), depth: tail.length });
    }
    candidates.sort((a, b) => a.depth - b.depth || a.key.localeCompare(b.key));
    if (candidates.length) return candidates[0];
  }
  return null;
}

function buildContext(meta, key, value, raw) {
  const parts = [];
  if (meta && meta.description) parts.push(meta.description);
  if (value && typeof value.translationContext === 'string' && value.translationContext.trim()) {
    parts.push('Translator context: ' + value.translationContext.trim());
  }

  const identity = value && value.identity;
  if (identity && typeof identity === 'object') {
    const identityParts = [];
    if (identity.contentNodeKey) identityParts.push('node=' + identity.contentNodeKey);
    if (identity.fieldKey) identityParts.push('field=' + identity.fieldKey);
    if (identity.canonicalElementId) identityParts.push('canonical=' + identity.canonicalElementId);
    if (identityParts.length) parts.push('Identity: ' + identityParts.join(', '));
  }

  const question = pairdQuestion(raw, key);
  if (question) parts.push('Paired question: ' + question.text);

  const nearby = nearbyStructuralLabel(raw, key);
  if (nearby) parts.push('Nearby structural label (derived): ' + nearby.text);

  const en = value && value.strings && value.strings.en;
  if (en && typeof en.text === 'string' && /\{[^{}]+\}/.test(en.text)) {
    parts.push('Preserve source placeholder syntax exactly.');
  }

  return parts.join(' | ');
}

function renderScopeCsv(raw, lang) {
  assertTargetLang(lang);
  const meta = raw._meta || {};
  const header = csvRow(
    'key',
    'source_en_hash',
    'source_context_hash',
    'context',
    'en_text',
    'en_aria_label',
    `${lang}_text`,
    `${lang}_aria_label`,
    'notes'
  );
  const lines = [header];

  for (const [key, value] of Object.entries(raw)) {
    if (key === '_meta' || !value || !value.strings) continue;
    const en = value.strings.en || {};
    const translation = value.strings[lang] || {};
    const context = buildContext(meta, key, value, raw);
    lines.push(csvRow(
      key,
      contentHash(en),
      contextHash(context),
      context,
      en.text || '',
      en['aria-label'] || '',
      translation.text || '',
      translation['aria-label'] || '',
      translation._stale ? 'STALE — EN source changed, please retranslate' : ''
    ));
  }

  return lines.join('\n') + '\n';
}

function parseArgs(argv) {
  const readValue = flag => {
    const i = argv.indexOf(flag);
    if (i < 0) return null;
    const value = argv[i + 1];
    if (!value || value.startsWith('--')) throw new Error(flag + ' requires a value');
    return value;
  };
  const filterLang = readValue('--lang');
  const filterScope = readValue('--scope');
  if (filterLang) assertTargetLang(filterLang);
  const known = new Set(['--lang', '--scope']);
  for (let i = 0; i < argv.length; i += 1) {
    if (!argv[i].startsWith('--')) continue;
    if (!known.has(argv[i])) throw new Error('unknown argument: ' + argv[i]);
    i += 1;
  }
  return { filterLang, filterScope };
}

function main(argv = process.argv.slice(2)) {
  const { filterLang, filterScope } = parseArgs(argv);
  const files = collectSourceFiles(SOURCE_DIR, SOURCE_DIR);
  let written = 0;

  for (const { full, scope } of files) {
    if (filterScope && scope !== filterScope) continue;
    const raw = JSON.parse(fs.readFileSync(full, 'utf8'));

    for (const lang of targetLanguages(raw, filterLang)) {
      const outDir = path.join(EXPORT_DIR, scope);
      fs.mkdirSync(outDir, { recursive: true });
      const outPath = path.join(outDir, `${scope}.${lang}.csv`);
      const csv = renderScopeCsv(raw, lang);
      fs.writeFileSync(outPath, csv);
      const rowCount = Object.entries(raw).filter(([key, value]) => key !== '_meta' && value && value.strings).length;
      console.log(`[strings-export] Wrote ${outPath} (${rowCount} strings, target=${lang})`);
      written += 1;
    }
  }

  if (!written) {
    console.log('[strings-export] No matching translation batches to export.');
  }
  return written;
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error('[strings-export] ' + error.message);
    process.exitCode = 1;
  }
}

module.exports = {
  collectSourceFiles,
  escapeCSV,
  csvRow,
  contentHash,
  contextHash,
  assertTargetLang,
  targetLanguages,
  pairedQuestion,
  nearbyStructuralLabel,
  buildContext,
  renderScopeCsv,
  parseArgs,
  main,
};

// [VXG RealForever]
