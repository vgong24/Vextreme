#!/usr/bin/env node
/**
 * VEXTREME — lib/translation-campaign.js
 *
 * Deterministic campaign iterator over canonical translatable strings.
 *
 * It does not own translation identity or row formatting:
 *   - data/strings/source/** owns canonical locale + string-key source truth;
 *   - lib/strings-export.js owns translator row/context/hash formation;
 *   - lib/strings-import.js owns returned-row preflight and canonical writes.
 *
 * This layer only decides WHICH eligible rows form the next bounded packet.
 *
 * Usage:
 *   node lib/translation-campaign.js --lang fr --limit 200
 *   node lib/translation-campaign.js --lang fr --after-key pages.foo.body.019 --limit 200
 *   node lib/translation-campaign.js --lang fr --scope pages.some-page --limit 100
 *   node lib/translation-campaign.js --lang fr --start 200 --limit 200 --dry-run
 *
 * Durable resume:
 *   Prefer --after-key. Numeric --start is reproducible against one unchanged
 *   candidate set, but importing a prior batch removes rows from that set.
 *
 * Output:
 *   data/strings/batches/export/campaign/{lang}/{batchId}.csv
 *   data/strings/batches/export/campaign/{lang}/{batchId}.manifest.json
 *
 * The manifest is content-deterministic: no timestamps, no random IDs.
 */

'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const { Language, isSourceOnlyTranslation } = require('./vex-config');
const {
  collectSourceFiles,
  htmlContextForRaw,
  buildTranslatorRow,
  renderTranslatorCSV,
} = require('./strings-export');

const ROOT = path.join(__dirname, '..');
const SOURCE_DIR = path.join(ROOT, 'data', 'strings', 'source');
const DEFAULT_OUT_DIR = path.join(ROOT, 'data', 'strings', 'batches', 'export', 'campaign');
const DEFAULT_LIMIT = 200;

function parseCampaignArgs(args) {
  const options = {
    lang: null,
    scope: null,
    start: 0,
    afterKey: null,
    limit: DEFAULT_LIMIT,
    outDir: DEFAULT_OUT_DIR,
    dryRun: false,
  };
  let startProvided = false;

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === '--dry-run') {
      options.dryRun = true;
      continue;
    }

    if (['--lang', '--scope', '--start', '--after-key', '--limit', '--out-dir'].includes(arg)) {
      const value = args[++i];
      if (value == null || String(value).startsWith('--')) {
        throw new Error(`${arg} requires a value`);
      }

      if (arg === '--lang') options.lang = value;
      else if (arg === '--scope') options.scope = value;
      else if (arg === '--after-key') options.afterKey = value;
      else if (arg === '--out-dir') options.outDir = path.resolve(value);
      else if (arg === '--start') {
        startProvided = true;
        options.start = Number(value);
      } else if (arg === '--limit') {
        options.limit = Number(value);
      }
      continue;
    }

    throw new Error(`unknown argument: ${arg}`);
  }

  if (!options.lang) throw new Error('--lang is required');
  if (options.lang === Language.EN) throw new Error('EN is the source language and cannot be a campaign target');
  if (!Number.isInteger(options.start) || options.start < 0) throw new Error('--start must be an integer >= 0');
  if (!Number.isInteger(options.limit) || options.limit <= 0) throw new Error('--limit must be an integer > 0');
  if (startProvided && options.afterKey) throw new Error('use either --start or --after-key, not both');

  return options;
}

function canonicalScope(raw, fallbackScope) {
  const metaScope = raw && raw._meta && raw._meta.scope;
  return typeof metaScope === 'string' && metaScope.trim()
    ? metaScope.trim()
    : fallbackScope;
}

const SCHEDULER_HOLD_LOCALIZATION_STATE = 'EN_ONLY__NO_SCHEDULER_ADVANCE';

function isSchedulerHeldSource(meta) {
  return Boolean(meta && meta.localizationState === SCHEDULER_HOLD_LOCALIZATION_STATE);
}

function needsTranslation(entry, lang) {
  const strings = entry && entry.strings;
  if (!strings || !strings[Language.EN]) return false;
  const target = strings[lang];
  return !target || target._stale === true;
}

function compareCanonicalText(left, right) {
  if (left === right) return 0;
  return left < right ? -1 : 1;
}

function collectCampaignCandidatesFromSources(sources, lang, scopeFilter = null) {
  if (!lang || lang === Language.EN) throw new Error('a non-EN target locale is required');

  const candidates = [];
  const keyOwners = new Map();

  for (const source of sources || []) {
    const raw = source.raw || {};
    const scope = canonicalScope(raw, source.scope || '');
    const sourceFile = String(source.rel || '').replace(/\\/g, '/');
    const htmlContextMap = source.htmlContextMap || {};
    const entries = Object.entries(raw)
      .filter(([key, value]) => key !== '_meta' && value && value.strings)
      .sort(([left], [right]) => left.localeCompare(right));

    for (const [key] of entries) {
      if (keyOwners.has(key)) {
        throw new Error(
          `duplicate canonical key across campaign sources: ${key} (${keyOwners.get(key)} / ${sourceFile})`
        );
      }
      keyOwners.set(key, sourceFile);
    }

    if (isSourceOnlyTranslation(raw._meta) || isSchedulerHeldSource(raw._meta)) continue;
    if (scopeFilter && scopeFilter !== scope && scopeFilter !== source.scope) continue;

    for (const [key, entry] of entries) {
      if (!needsTranslation(entry, lang)) continue;
      const row = buildTranslatorRow(raw, key, entry, lang, { htmlContextMap });
      if (!row || !row.source_en_hash12) continue;

      candidates.push({
        key,
        sourceScope: scope,
        sourceFile,
        state: entry.strings[lang] && entry.strings[lang]._stale ? 'stale' : 'missing',
        row,
      });
    }
  }

  candidates.sort((left, right) =>
    compareCanonicalText(left.key, right.key)
      || compareCanonicalText(left.sourceScope, right.sourceScope)
      || compareCanonicalText(left.sourceFile, right.sourceFile)
  );

  return candidates;
}

function loadCampaignSources(sourceDir = SOURCE_DIR) {
  return collectSourceFiles(sourceDir, sourceDir)
    .sort((left, right) => left.rel.localeCompare(right.rel))
    .map(file => {
      const raw = JSON.parse(fs.readFileSync(file.full, 'utf8'));
      return {
        ...file,
        raw,
        htmlContextMap: htmlContextForRaw(raw),
      };
    });
}

function selectCampaignWindow(candidates, options = {}) {
  const list = candidates || [];
  const limit = options.limit == null ? DEFAULT_LIMIT : options.limit;
  let offset = options.start || 0;

  if (options.afterKey) {
    const found = list.findIndex(
      candidate => compareCanonicalText(candidate.key, options.afterKey) > 0
    );
    offset = found === -1 ? list.length : found;
  }

  const selected = list.slice(offset, offset + limit);
  const lastKey = selected.length ? selected[selected.length - 1].key : (options.afterKey || null);
  const hasMore = offset + selected.length < list.length;

  return {
    offset,
    selected,
    hasMore,
    firstKey: selected.length ? selected[0].key : null,
    lastKey,
    nextAfterKey: hasMore ? lastKey : null,
  };
}

function campaignBatchId(lang, scope, selected, selection = {}) {
  const identity = {
    sourceLang: Language.EN,
    targetLang: lang,
    scope: scope || null,
    rows: (selected || []).map(candidate => [
      candidate.key,
      candidate.row.source_en_hash12,
    ]),
    emptyCursor: (selected || []).length
      ? null
      : {
          afterKey: selection.afterKey || null,
          start: selection.start || 0,
        },
  };
  return `${lang}-${crypto.createHash('sha256').update(JSON.stringify(identity)).digest('hex').slice(0, 12)}`;
}

function resumeCommand(options, nextAfterKey) {
  if (!nextAfterKey) return null;
  const parts = [
    'npm run translation:campaign -- --lang',
    options.lang,
  ];
  if (options.scope) parts.push('--scope', options.scope);
  parts.push('--after-key', nextAfterKey, '--limit', String(options.limit));
  return parts.join(' ');
}

function buildCampaignManifest(candidates, window, options, batchId, csvFile) {
  return {
    schemaVersion: 'vextreme.translation-campaign/v1',
    batchId,
    sourceLang: Language.EN,
    targetLang: options.lang,
    selection: {
      scope: options.scope || null,
      requestedStart: options.afterKey ? null : options.start,
      afterKey: options.afterKey || null,
      resolvedOffset: window.offset,
      limit: options.limit,
    },
    candidateCountAtFormation: candidates.length,
    selectedCount: window.selected.length,
    firstKey: window.firstKey,
    lastKey: window.lastKey,
    hasMore: window.hasMore,
    nextAfterKey: window.nextAfterKey,
    resumeCommand: resumeCommand(options, window.nextAfterKey),
    csvFile,
    rows: window.selected.map(candidate => ({
      key: candidate.key,
      sourceScope: candidate.sourceScope,
      sourceFile: candidate.sourceFile,
      state: candidate.state,
      source_en_hash12: candidate.row.source_en_hash12,
    })),
  };
}

function formCampaign(options, sources = null) {
  const campaignSources = sources || loadCampaignSources();
  const candidates = collectCampaignCandidatesFromSources(
    campaignSources,
    options.lang,
    options.scope
  );
  const window = selectCampaignWindow(candidates, options);
  const batchId = campaignBatchId(options.lang, options.scope, window.selected, options);
  const csvFile = `${batchId}.csv`;
  const manifestFile = `${batchId}.manifest.json`;
  const csv = renderTranslatorCSV(window.selected.map(candidate => candidate.row), options.lang);
  const manifest = buildCampaignManifest(candidates, window, options, batchId, csvFile);

  return {
    candidates,
    window,
    batchId,
    csvFile,
    manifestFile,
    csv,
    manifest,
  };
}

function writeCampaign(result, options) {
  const targetDir = path.join(options.outDir, options.lang);
  fs.mkdirSync(targetDir, { recursive: true });

  const csvPath = path.join(targetDir, result.csvFile);
  const manifestPath = path.join(targetDir, result.manifestFile);
  fs.writeFileSync(csvPath, result.csv);
  fs.writeFileSync(manifestPath, JSON.stringify(result.manifest, null, 2) + '\n');

  return { csvPath, manifestPath };
}

function main(args = process.argv.slice(2)) {
  const options = parseCampaignArgs(args);
  const result = formCampaign(options);

  if (options.dryRun) {
    process.stdout.write(JSON.stringify(result.manifest, null, 2) + '\n');
    return result;
  }

  const paths = writeCampaign(result, options);
  console.log(`[translation-campaign] ${result.manifest.selectedCount} row(s) → ${paths.csvPath}`);
  console.log(`[translation-campaign] manifest → ${paths.manifestPath}`);
  if (result.manifest.resumeCommand) {
    console.log(`[translation-campaign] next → ${result.manifest.resumeCommand}`);
  } else {
    console.log('[translation-campaign] campaign window complete for current candidate set');
  }
  return result;
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error(`[translation-campaign] BLOCKED — ${error.message}`);
    process.exitCode = 1;
  }
}

module.exports = {
  DEFAULT_LIMIT,
  DEFAULT_OUT_DIR,
  SOURCE_DIR,
  parseCampaignArgs,
  canonicalScope,
  SCHEDULER_HOLD_LOCALIZATION_STATE,
  isSchedulerHeldSource,
  needsTranslation,
  compareCanonicalText,
  collectCampaignCandidatesFromSources,
  loadCampaignSources,
  selectCampaignWindow,
  campaignBatchId,
  resumeCommand,
  buildCampaignManifest,
  formCampaign,
  writeCampaign,
  main,
};

// [VXG RealForever]
