#!/usr/bin/env node
// Imports completed translator CSVs from data/strings/batches/import/ back into source files.
// Matches rows by key; skips rows with empty translation columns.
// After import, move the CSV to batches/import/done/ so it isn't re-processed.
//
// Usage:
//   node lib/strings-import.js [--dry-run]

const fs = require('fs');
const path = require('path');
const { Language } = require('./vex-config');
const { contentHash } = require('./strings-compile');

const SOURCE_DIR = path.join(__dirname, '../data/strings/source');
const IMPORT_DIR = path.join(__dirname, '../data/strings/batches/import');
const DONE_DIR = path.join(IMPORT_DIR, 'done');

// ---- CSV parser (handles quoted commas, quotes, and embedded newlines) ----
function parseCSV(text) {
  const matrix = [];
  let row = [];
  let cur = '';
  let inQuote = false;

  function endRow() {
    row.push(cur);
    matrix.push(row);
    row = [];
    cur = '';
  }

  for (let i = 0; i < text.length; i++) {
    const c = text[i];

    if (inQuote) {
      if (c === '"' && text[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (c === '"') {
        inQuote = false;
      } else {
        cur += c;
      }
      continue;
    }

    if (c === '"') {
      inQuote = true;
    } else if (c === ',') {
      row.push(cur);
      cur = '';
    } else if (c === '\n') {
      endRow();
    } else if (c === '\r') {
      if (text[i + 1] === '\n') i++;
      endRow();
    } else {
      cur += c;
    }
  }

  if (inQuote) throw new Error('malformed CSV — unterminated quoted field');
  if (cur.length > 0 || row.length > 0) endRow();
  if (matrix.length === 0) return [];

  const headers = matrix.shift().map(header => header.trim());
  return matrix
    .filter(cols => cols.some(col => col !== ''))
    .map(cols => {
      const obj = {};
      headers.forEach((header, index) => {
        obj[header] = cols[index] == null ? '' : cols[index];
      });
      return obj;
    });
}

// ---- source file cache ----

function loadAllSource(fileCache = {}) {
  // key → { value, file }
  const map = {};

  function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
        continue;
      }
      if (!entry.name.endsWith('.json')) continue;

      const raw = JSON.parse(fs.readFileSync(full, 'utf8'));
      fileCache[full] = raw;
      for (const [key, value] of Object.entries(raw)) {
        if (key === '_meta') continue;
        map[key] = { value, file: full };
      }
    }
  }

  walk(SOURCE_DIR);
  return map;
}

function currentEnHash(value) {
  const en = value && value.strings && value.strings[Language.EN];
  return en ? contentHash(JSON.stringify(en)) : null;
}

function buildImportPlan(rows, lang, source, csvFile = 'translator.csv') {
  const errors = [];
  const operations = [];
  const seenKeys = new Set();
  const textCol = `${lang}_text`;
  const ariaCol = `${lang}_aria_label`;

  if (!lang || lang === Language.EN) {
    return { errors: [`${csvFile}: target locale must be non-EN`], operations };
  }

  if (rows.length > 0) {
    if (!Object.prototype.hasOwnProperty.call(rows[0], textCol)) {
      errors.push(`${csvFile}: missing target column "${textCol}"`);
    }
    if (!Object.prototype.hasOwnProperty.call(rows[0], 'source_en_hash12')) {
      errors.push(`${csvFile}: missing required source_en_hash12 column`);
    }
  }

  rows.forEach((row, index) => {
    const rowNumber = index + 2; // header is row 1
    const key = String(row.key || '').trim();
    const textVal = row[textCol];

    if (textVal == null || textVal.trim() === '') return;

    if (!key) {
      errors.push(`${csvFile}:${rowNumber}: translation-bearing row has no key`);
      return;
    }

    if (seenKeys.has(key)) {
      errors.push(`${csvFile}:${rowNumber}: duplicate key "${key}"`);
      return;
    }
    seenKeys.add(key);

    const entry = source[key];
    if (!entry) {
      errors.push(`${csvFile}:${rowNumber}: key "${key}" is not present in canonical source`);
      return;
    }

    const suppliedHash = String(row.source_en_hash12 || '').trim();
    const actualHash = currentEnHash(entry.value);

    if (!suppliedHash) {
      errors.push(`${csvFile}:${rowNumber}: key "${key}" has no source_en_hash12 binding`);
      return;
    }
    if (!actualHash) {
      errors.push(`${csvFile}:${rowNumber}: key "${key}" has no current EN source object`);
      return;
    }
    if (suppliedHash !== actualHash) {
      errors.push(
        `${csvFile}:${rowNumber}: key "${key}" is stale — translator source hash ${suppliedHash} != current EN hash ${actualHash}`
      );
      return;
    }

    const translation = { text: textVal };
    const ariaVal = row[ariaCol];
    if (ariaVal != null && ariaVal.trim() !== '') translation['aria-label'] = ariaVal;

    operations.push({
      key,
      lang,
      file: entry.file,
      translation,
    });
  });

  return { errors, operations };
}

function applyImportOperations(operations, fileCache) {
  const touchedFiles = new Set();

  for (const operation of operations) {
    const fileData = fileCache[operation.file];
    if (!fileData || !fileData[operation.key]) {
      throw new Error(`preflight/apply drift for key "${operation.key}"`);
    }
    if (!fileData[operation.key].strings) fileData[operation.key].strings = {};
    fileData[operation.key].strings[operation.lang] = operation.translation;
    touchedFiles.add(operation.file);
  }

  return touchedFiles;
}

function main(args = process.argv.slice(2)) {
  const dryRun = args.includes('--dry-run');

  if (!fs.existsSync(IMPORT_DIR)) {
    console.log('[strings-import] No import directory found — nothing to import.');
    return 0;
  }

  const csvFiles = fs.readdirSync(IMPORT_DIR).filter(file => file.endsWith('.csv')).sort();
  if (csvFiles.length === 0) {
    console.log('[strings-import] No CSV files in import directory.');
    return 0;
  }

  const fileCache = {};
  const source = loadAllSource(fileCache);
  const allOperations = [];
  const blockingErrors = [];
  const processedCsvFiles = [];
  const claimedTargets = new Map();

  for (const csvFile of csvFiles) {
    const csvPath = path.join(IMPORT_DIR, csvFile);
    const parts = csvFile.replace('.csv', '').split('.');
    const lang = parts[parts.length - 1];

    if (!lang || lang === Language.EN) {
      console.warn(`[strings-import] Skipping ${csvFile} — cannot import EN (it is the source language)`);
      continue;
    }

    let rows;
    try {
      rows = parseCSV(fs.readFileSync(csvPath, 'utf8'));
    } catch (error) {
      blockingErrors.push(`${csvFile}: ${error.message}`);
      continue;
    }

    const plan = buildImportPlan(rows, lang, source, csvFile);
    blockingErrors.push(...plan.errors);

    for (const operation of plan.operations) {
      const target = `${operation.lang}:${operation.key}`;
      if (claimedTargets.has(target)) {
        blockingErrors.push(
          `${csvFile}: duplicate import target ${target}; already supplied by ${claimedTargets.get(target)}`
        );
      } else {
        claimedTargets.set(target, csvFile);
        allOperations.push(operation);
      }
    }

    processedCsvFiles.push(csvFile);
  }

  if (blockingErrors.length > 0) {
    for (const error of blockingErrors) console.error(`[strings-import] BLOCKED ${error}`);
    console.error('[strings-import] No source files changed and no translator CSVs were archived.');
    return 1;
  }

  if (dryRun) {
    for (const operation of allOperations) {
      console.log(
        `[strings-import] DRY  Would set "${operation.key}"[${operation.lang}] = ${JSON.stringify(operation.translation)}`
      );
    }
    console.log(`[strings-import] Dry run complete. ${allOperations.length} translation(s) would be imported.`);
    return 0;
  }

  const touchedFiles = applyImportOperations(allOperations, fileCache);
  for (const filePath of touchedFiles) {
    fs.writeFileSync(filePath, JSON.stringify(fileCache[filePath], null, 2) + '\n');
  }

  fs.mkdirSync(DONE_DIR, { recursive: true });
  for (const csvFile of processedCsvFiles) {
    const csvPath = path.join(IMPORT_DIR, csvFile);
    fs.renameSync(csvPath, path.join(DONE_DIR, csvFile));
    console.log(`[strings-import] Archived ${csvFile} → batches/import/done/`);
  }

  console.log(`[strings-import] Done. ${allOperations.length} translation(s) imported across ${touchedFiles.size} source file(s).`);
  return 0;
}

if (require.main === module) {
  try {
    process.exitCode = main();
  } catch (error) {
    console.error(`[strings-import] BLOCKED — ${error.message}`);
    process.exitCode = 1;
  }
}

module.exports = {
  parseCSV,
  loadAllSource,
  currentEnHash,
  buildImportPlan,
  applyImportOperations,
  main,
};

// [VXG RealForever]
