#!/usr/bin/env node
// Imports completed translator CSVs from data/strings/batches/import/ back into source files.
//
// Import is fail-closed before any source write:
// - target locale comes from the *.LANG.csv filename;
// - duplicate translated keys are rejected;
// - unknown translated keys are rejected;
// - every translated row must carry source_en_hash;
// - source_en_hash must match the current canonical EN object.
//
// This makes a returned translator batch reversible and stale-safe: if English
// changes after export, the old translation cannot silently overwrite current
// source meaning.
//
// Usage:
//   node lib/strings-import.js [--dry-run]

'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { Language } = require('./vex-config');

const SOURCE_DIR = path.join(__dirname, '../data/strings/source');
const IMPORT_DIR = path.join(__dirname, '../data/strings/batches/import');
const DONE_DIR = path.join(IMPORT_DIR, 'done');

function parseCsvMatrix(text) {
  const input = String(text).replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const rows = [];
  let row = [];
  let field = '';
  let inQuote = false;

  const pushField = () => {
    row.push(field);
    field = '';
  };
  const pushRow = () => {
    pushField();
    // Ignore a single trailing empty physical row.
    if (row.length > 1 || row[0] !== '') rows.push(row);
    row = [];
  };

  for (let i = 0; i < input.length; i += 1) {
    const c = input[i];
    if (inQuote) {
      if (c === '"' && input[i + 1] === '"') {
        field += '"';
        i += 1;
      } else if (c === '"') {
        inQuote = false;
      } else {
        field += c;
      }
      continue;
    }

    if (c === '"') inQuote = true;
    else if (c === ',') pushField();
    else if (c === '\n') pushRow();
    else field += c;
  }

  if (inQuote) throw new Error('unterminated quoted CSV field');
  if (field !== '' || row.length) pushRow();
  return rows;
}

function splitRow(line) {
  const rows = parseCsvMatrix(String(line));
  return rows[0] || [];
}

function parseCSV(text) {
  const matrix = parseCsvMatrix(text);
  if (!matrix.length) return { headers: [], rows: [] };
  const headers = matrix[0].map(h => h.trim());
  return {
    headers,
    rows: matrix.slice(1).map(cols => {
      const obj = {};
      headers.forEach((h, i) => { obj[h] = (cols[i] || '').trim(); });
      return obj;
    }),
  };
}

function contentHash(en) {
  return crypto.createHash('sha256').update(JSON.stringify(en || {})).digest('hex').slice(0, 12);
}

function languageFromFilename(filename) {
  const parts = filename.replace(/\.csv$/i, '').split('.');
  const lang = parts[parts.length - 1];
  if (!lang || !/^[a-z][a-z0-9-]*$/.test(lang) || lang === Language.EN) {
    throw new Error(`cannot derive non-EN target language from ${filename}`);
  }
  return lang;
}

function loadAllSource(sourceDir = SOURCE_DIR) {
  const fileCache = {};
  const map = {};

  function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) { walk(full); continue; }
      if (!entry.name.endsWith('.json')) continue;
      const raw = JSON.parse(fs.readFileSync(full, 'utf8'));
      fileCache[full] = raw;
      for (const [key, value] of Object.entries(raw)) {
        if (key === '_meta') continue;
        if (map[key]) throw new Error(`duplicate canonical string key across source files: ${key}`);
        map[key] = { value, file: full };
      }
    }
  }

  walk(sourceDir);
  return { source: map, fileCache };
}

function planCsvImport({ csvFile, csvText, source }) {
  const lang = languageFromFilename(csvFile);
  const parsed = parseCSV(csvText);
  const textCol = `${lang}_text`;
  const ariaCol = `${lang}_aria_label`;

  for (const required of ['key', 'source_en_hash', textCol, ariaCol]) {
    if (!parsed.headers.includes(required)) {
      throw new Error(`${csvFile}: missing required column ${required}`);
    }
  }

  const seen = new Set();
  const operations = [];

  for (const row of parsed.rows) {
    const key = row.key;
    if (!key) continue;
    const textVal = row[textCol];
    const ariaVal = row[ariaCol];

    // An untranslated row has no effect and therefore does not need a preimage check.
    if (!textVal && !ariaVal) continue;

    if (seen.has(key)) throw new Error(`${csvFile}: duplicate translated key ${key}`);
    seen.add(key);

    const entry = source[key];
    if (!entry) throw new Error(`${csvFile}: translated key not found in canonical source: ${key}`);
    const en = entry.value && entry.value.strings && entry.value.strings.en;
    if (!en || typeof en !== 'object') throw new Error(`${csvFile}: canonical EN missing for ${key}`);

    const expected = row.source_en_hash;
    if (!/^[0-9a-f]{12}$/.test(expected || '')) {
      throw new Error(`${csvFile}: invalid source_en_hash for ${key}`);
    }
    const observed = contentHash(en);
    if (observed !== expected) {
      throw new Error(
        `${csvFile}: stale translation row for ${key}: expected EN ${expected}, current EN ${observed}`
      );
    }

    if (!textVal) {
      throw new Error(`${csvFile}: ${key} has ${ariaCol} but no ${textCol}`);
    }

    const translation = { text: textVal };
    if (ariaVal) translation['aria-label'] = ariaVal;
    operations.push({ key, lang, translation, file: entry.file });
  }

  return operations;
}

function applyOperations(operations, fileCache) {
  for (const operation of operations) {
    const fileData = fileCache[operation.file];
    if (!fileData || !fileData[operation.key]) {
      throw new Error('source cache lost canonical key during import: ' + operation.key);
    }
    if (!fileData[operation.key].strings) fileData[operation.key].strings = {};
    fileData[operation.key].strings[operation.lang] = operation.translation;
  }
}

function main(argv = process.argv.slice(2)) {
  const dryRun = argv.includes('--dry-run');
  for (const token of argv) {
    if (token !== '--dry-run') throw new Error('unknown argument: ' + token);
  }

  if (!fs.existsSync(IMPORT_DIR)) {
    console.log('[strings-import] No import directory found — nothing to import.');
    return 0;
  }
  const csvFiles = fs.readdirSync(IMPORT_DIR).filter(f => f.endsWith('.csv')).sort();
  if (!csvFiles.length) {
    console.log('[strings-import] No CSV files in import directory.');
    return 0;
  }

  const { source, fileCache } = loadAllSource();
  const plans = [];
  for (const csvFile of csvFiles) {
    const csvPath = path.join(IMPORT_DIR, csvFile);
    plans.push({
      csvFile,
      csvPath,
      operations: planCsvImport({
        csvFile,
        csvText: fs.readFileSync(csvPath, 'utf8'),
        source,
      }),
    });
  }

  // Validate the whole import set before any in-memory or disk mutation.
  const claimed = new Set();
  for (const plan of plans) {
    for (const operation of plan.operations) {
      const identity = operation.lang + '\0' + operation.key;
      if (claimed.has(identity)) {
        throw new Error(`same locale/key appears in more than one import CSV: ${operation.lang}/${operation.key}`);
      }
      claimed.add(identity);
    }
  }

  const operations = plans.flatMap(plan => plan.operations);
  if (dryRun) {
    for (const operation of operations) {
      console.log(
        `[strings-import] DRY  Would set "${operation.key}"[${operation.lang}] = ` +
        JSON.stringify(operation.translation)
      );
    }
    console.log(`[strings-import] Dry run complete. ${operations.length} translation(s) would be imported.`);
    return operations.length;
  }

  applyOperations(operations, fileCache);
  for (const [filePath, data] of Object.entries(fileCache)) {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n');
  }

  fs.mkdirSync(DONE_DIR, { recursive: true });
  for (const plan of plans) {
    fs.renameSync(plan.csvPath, path.join(DONE_DIR, plan.csvFile));
    console.log(`[strings-import] Archived ${plan.csvFile} → batches/import/done/`);
  }
  console.log(`[strings-import] Done. ${operations.length} translation(s) imported.`);
  return operations.length;
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error('[strings-import] ' + error.message);
    process.exitCode = 1;
  }
}

module.exports = {
  parseCsvMatrix,
  splitRow,
  parseCSV,
  contentHash,
  languageFromFilename,
  loadAllSource,
  planCsvImport,
  applyOperations,
  main,
};

// [VXG RealForever]
