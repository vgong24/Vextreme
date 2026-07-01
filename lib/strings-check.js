#!/usr/bin/env node
// Integrity check for the strings pipeline.
// Run before compile to catch issues early. Four severity levels:
//   BLOCK  — missing EN text; compile cannot proceed
//   REMAP  — orphaned key found in migrations.json; auto-remaps in source
//   WARN   — stale translation (EN changed since last compile); tags _stale
//   INFO   — orphaned key with no migration but EN text matches another key (suggest migration)
// Orphaned keys with no migration and no EN match → quarantined to data/strings/orphans.json

const fs = require('fs');
const path = require('path');
const { logger } = require('./logger');
const { CODES }  = require('./logger-codes');

const SOURCE_DIR = path.join(__dirname, '../data/strings/source');
const MIGRATIONS_PATH = path.join(__dirname, '../data/strings/migrations.json');
const MANIFEST_PATH = path.join(__dirname, '../data/strings/compiled/manifest.json');
const ORPHANS_PATH = path.join(__dirname, '../data/strings/orphans.json');

// ---- helpers ----

function collectSourceFiles(dir) {
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) results.push(...collectSourceFiles(full));
    else if (entry.name.endsWith('.json')) results.push(full);
  }
  return results;
}

function loadAllSource() {
  // Returns { key: { value, file } }
  const map = {};
  for (const file of collectSourceFiles(SOURCE_DIR)) {
    const raw = JSON.parse(fs.readFileSync(file, 'utf8'));
    for (const [key, value] of Object.entries(raw)) {
      if (key === '_meta') continue;
      map[key] = { value, file };
    }
  }
  return map;
}

function loadMigrations() {
  const { migrations } = JSON.parse(fs.readFileSync(MIGRATIONS_PATH, 'utf8'));
  // old key → migration entry
  const byFrom = {};
  for (const m of migrations) byFrom[m.from] = m;
  // new key → migration entry (for reverse lookup)
  const byTo = {};
  for (const m of migrations) if (m.to) byTo[m.to] = m;
  return { byFrom, byTo };
}

function loadManifest() {
  if (!fs.existsSync(MANIFEST_PATH)) return {};
  return JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
}

function contentHash(text) {
  const crypto = require('crypto');
  return crypto.createHash('sha256').update(text).digest('hex').slice(0, 12);
}

function writeSourceFile(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n');
}

function loadSourceFile(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

// ---- main ----

const source = loadAllSource();
const { byFrom, byTo } = loadMigrations();
const manifest = loadManifest();

let blocked = false;
const orphans = fs.existsSync(ORPHANS_PATH) ? JSON.parse(fs.readFileSync(ORPHANS_PATH, 'utf8')) : {};

// Group source keys by file for mutations
const fileCache = {};
function cachedSourceFile(filePath) {
  if (!fileCache[filePath]) fileCache[filePath] = loadSourceFile(filePath);
  return fileCache[filePath];
}

for (const [key, { value, file }] of Object.entries(source)) {

  // BLOCK: missing strings namespace or EN text
  if (!value.strings || !value.strings.en || !value.strings.en.text) {
    logger.error({ code: CODES.STRINGS_MISSING_EN, message: `missing EN text — compile blocked`, key, file });
    blocked = true;
    continue;
  }

  // REMAP: key is listed as an old key in migrations
  if (byFrom[key]) {
    const migration = byFrom[key];
    const newKey = migration.to;
    if (newKey) {
      logger.warn({ code: CODES.STRINGS_REMAP, message: `key remapped`, key, newKey, reason: migration.reason });
      const fileData = cachedSourceFile(file);
      if (fileData[key]) {
        fileData[newKey] = fileData[newKey] || fileData[key];
        delete fileData[key];
      }
    } else {
      // Migration says deleted
      logger.warn({ code: CODES.STRINGS_DELETED, message: `key deleted per migrations.json`, key });
      const fileData = cachedSourceFile(file);
      delete fileData[key];
    }
    continue;
  }

  // WARN: stale (EN changed since last manifest)
  if (manifest[key]) {
    const currentHash = contentHash(JSON.stringify(value.strings.en));
    if (manifest[key].enHash && manifest[key].enHash !== currentHash) {
      const langs = Object.keys(value.strings).filter(l => l !== 'en');
      logger.warn({ code: CODES.STRINGS_STALE_TRANSLATION, message: `EN changed — translations stale`, key, langs });
      const fileData = cachedSourceFile(file);
      for (const lang of langs) {
        if (fileData[key] && fileData[key].strings && fileData[key].strings[lang] && !fileData[key].strings[lang]._stale) {
          fileData[key].strings[lang]._stale = true;
        }
      }
    }
  }
}

// Keys in manifest but not in source → orphaned
for (const key of Object.keys(manifest)) {
  if (source[key]) continue;

  if (byFrom[key]) {
    // Already handled above via REMAP — skip
    continue;
  }

  // Check if EN text matches any current key (suggests a rename without a migration entry)
  const manifestEntry = manifest[key];
  if (manifestEntry.enHash) {
    const matchingKey = Object.entries(source).find(([k, { value }]) => {
      if (!value.en) return false;
      return contentHash(JSON.stringify(value.en)) === manifestEntry.enHash;
    });
    if (matchingKey) {
      console.info(`[strings-check] INFO   Orphaned "${key}" — EN text matches "${matchingKey[0]}". Consider adding a migration entry.`);
      continue;
    }
  }

  // Unknown orphan — quarantine
  logger.warn({ code: CODES.STRINGS_QUARANTINE, message: `key in manifest but not in source — quarantined`, key });
  orphans[key] = { ...(manifest[key] || {}), quarantinedAt: new Date().toISOString() };
}

// Flush mutated source files
for (const [filePath, data] of Object.entries(fileCache)) {
  writeSourceFile(filePath, data);
  console.log(`[strings-check] Updated ${filePath}`);
}

// Write orphans
if (Object.keys(orphans).length > 0) {
  fs.writeFileSync(ORPHANS_PATH, JSON.stringify(orphans, null, 2) + '\n');
}

if (blocked) {
  logger.error({ code: CODES.STRINGS_MISSING_EN, message: 'BLOCKED — fix missing EN strings before compiling' });
  process.exit(1);
} else {
  console.log('[strings-check] OK — no blocking issues found.');
}

// [VXG RealForever]
