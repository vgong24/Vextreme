#!/usr/bin/env node
// Imports completed translator CSVs from data/strings/batches/import/ back into source files.
// Matches rows by key; skips rows with empty translation columns.
// After import, move the CSV to batches/import/done/ so it isn't re-processed.
//
// Usage:
//   node lib/strings-import.js [--dry-run]

const fs = require('fs');
const path = require('path');

const SOURCE_DIR = path.join(__dirname, '../data/strings/source');
const IMPORT_DIR = path.join(__dirname, '../data/strings/batches/import');
const DONE_DIR = path.join(IMPORT_DIR, 'done');

const dryRun = process.argv.includes('--dry-run');

// ---- CSV parser (minimal, handles quoted fields) ----
function parseCSV(text) {
  const lines = text.trim().split('\n');
  const headers = splitRow(lines[0]);
  return lines.slice(1).map(line => {
    const cols = splitRow(line);
    const obj = {};
    headers.forEach((h, i) => { obj[h.trim()] = (cols[i] || '').trim(); });
    return obj;
  });
}

function splitRow(line) {
  const cols = [];
  let cur = '';
  let inQuote = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inQuote) {
      if (c === '"' && line[i + 1] === '"') { cur += '"'; i++; }
      else if (c === '"') { inQuote = false; }
      else { cur += c; }
    } else {
      if (c === '"') { inQuote = true; }
      else if (c === ',') { cols.push(cur); cur = ''; }
      else { cur += c; }
    }
  }
  cols.push(cur);
  return cols;
}

// ---- source file cache ----
const fileCache = {};

function loadAllSource() {
  // key → { value, file }
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
        map[key] = { value, file: full };
      }
    }
  }
  walk(SOURCE_DIR);
  return map;
}

const source = loadAllSource();

// ---- process import CSVs ----
if (!fs.existsSync(IMPORT_DIR)) {
  console.log('[strings-import] No import directory found — nothing to import.');
  process.exit(0);
}

const csvFiles = fs.readdirSync(IMPORT_DIR).filter(f => f.endsWith('.csv'));
if (csvFiles.length === 0) {
  console.log('[strings-import] No CSV files in import directory.');
  process.exit(0);
}

let importCount = 0;

for (const csvFile of csvFiles) {
  const csvPath = path.join(IMPORT_DIR, csvFile);
  // Derive lang from filename: scope.lang.csv
  const parts = csvFile.replace('.csv', '').split('.');
  const lang = parts[parts.length - 1];

  if (!lang || lang === 'en') {
    console.warn(`[strings-import] Skipping ${csvFile} — cannot import EN (it is the source language)`);
    continue;
  }

  const rows = parseCSV(fs.readFileSync(csvPath, 'utf8'));
  const textCol = `${lang}_text`;
  const ariaCol = `${lang}_aria_label`;

  for (const row of rows) {
    const key = row.key;
    if (!key) continue;

    const textVal = row[textCol];
    const ariaVal = row[ariaCol];

    if (!textVal) continue; // translator left it blank

    const entry = source[key];
    if (!entry) {
      console.warn(`[strings-import] Key "${key}" from ${csvFile} not found in source — skipping`);
      continue;
    }

    const fileData = fileCache[entry.file];
    if (!fileData[key]) continue;

    const translation = { text: textVal };
    if (ariaVal) translation['aria-label'] = ariaVal;
    // Clear stale flag on import
    fileData[key][lang] = translation;
    importCount++;
    if (dryRun) console.log(`[strings-import] DRY  Would set "${key}"[${lang}] = ${JSON.stringify(translation)}`);
  }

  if (!dryRun) {
    // Archive the processed CSV
    fs.mkdirSync(DONE_DIR, { recursive: true });
    fs.renameSync(csvPath, path.join(DONE_DIR, csvFile));
    console.log(`[strings-import] Archived ${csvFile} → batches/import/done/`);
  }
}

if (!dryRun) {
  for (const [filePath, data] of Object.entries(fileCache)) {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n');
  }
  console.log(`[strings-import] Done. ${importCount} translation(s) imported.`);
} else {
  console.log(`[strings-import] Dry run complete. ${importCount} translation(s) would be imported.`);
}

// [VXG RealForever]
