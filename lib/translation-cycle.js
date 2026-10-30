#!/usr/bin/env node
/**
 * VEXTREME — lib/translation-cycle.js
 *
 * One control surface for page-complete multi-language translation placement.
 *
 * The expensive/semantic work stays human/AI translation. Deterministic machinery owns:
 *   translation:program -> exact current page/key/locale selection
 *   strings-export      -> context + EN preimage hash + placeholder evidence
 *   strings-import      -> stale-safe canonical write planning
 *   translation:cycle   -> matrix formation, structural preflight, placement, readback,
 *                          and scheduler resume reporting
 *
 * This file creates no second arc, page, language, or translation registry.
 *
 * Usage:
 *   npm run translation:cycle -- prepare --arc liberation --tier global-core --limit 20 --out /tmp/cycle.json
 *   # fill only rows[].translations.<lang>.text / aria-label
 *   npm run translation:cycle -- apply --input /tmp/cycle.json --dry-run
 *   npm run translation:cycle -- apply --input /tmp/cycle.json
 *   npm run translation:cycle -- verify --input /tmp/cycle.json
 *
 * [VXG RealForever]
 */

'use strict';

const fs = require('fs');
const path = require('path');

const {
  formProgram,
} = require('./translation-program');
const {
  parseCSV,
  loadAllSource,
  currentEnHash,
  buildImportPlan,
  applyImportOperations,
} = require('./strings-import');
const {
  placeholderEvidence,
} = require('./strings-export');

const SCHEMA_VERSION = 'vextreme.translation-cycle/v1';
const DEFAULT_LIMIT = 20;

function fail(message) {
  throw new Error(message);
}

function arraysEqual(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function normalizeTokens(text) {
  const evidence = placeholderEvidence(text);
  return evidence ? [...evidence.tokens].sort() : [];
}

function whitespaceEdges(value) {
  const text = String(value || '');
  return {
    leading: (text.match(/^\s+/) || [''])[0],
    trailing: (text.match(/\s+$/) || [''])[0],
  };
}

function quoteBoundaryErrors(sourceText, targetText) {
  const source = String(sourceText || '');
  const target = String(targetText || '');
  const errors = [];
  const quoteCount = (source.match(/"/g) || []).length;

  if (source === '"' && target !== '"') {
    errors.push('source is a quote-only structural fragment; target must be literal \""');
    return errors;
  }
  if (quoteCount === 1 && source.startsWith('"') && !target.startsWith('"')) {
    errors.push('source opens a cross-node quote fragment; target must begin with literal \""');
  }
  if (quoteCount === 1 && source.endsWith('"') && !target.endsWith('"')) {
    errors.push('source closes a cross-node quote fragment; target must end with literal \""');
  }
  return errors;
}

function structuralTranslationErrors(source, target, coordinate) {
  const errors = [];
  const sourceText = String(source.text || '');
  const targetText = String(target.text || '');

  if (!targetText.trim()) {
    errors.push(`${coordinate}: target text is blank`);
    return errors;
  }

  const allowed = new Set(['text', 'aria-label']);
  for (const key of Object.keys(target)) {
    if (!allowed.has(key)) errors.push(`${coordinate}: unsupported target field "${key}"`);
  }

  const sourceTokens = normalizeTokens(sourceText);
  const targetTokens = normalizeTokens(targetText);
  if (!arraysEqual(sourceTokens, targetTokens)) {
    errors.push(
      `${coordinate}: placeholder tokens differ; source=${JSON.stringify(sourceTokens)} target=${JSON.stringify(targetTokens)}`
    );
  }

  const sourceWhitespace = whitespaceEdges(sourceText);
  const targetWhitespace = whitespaceEdges(targetText);
  if (sourceWhitespace.leading !== targetWhitespace.leading) {
    errors.push(
      `${coordinate}: leading whitespace boundary differs; source=${JSON.stringify(sourceWhitespace.leading)} target=${JSON.stringify(targetWhitespace.leading)}`
    );
  }
  if (sourceWhitespace.trailing !== targetWhitespace.trailing) {
    errors.push(
      `${coordinate}: trailing whitespace boundary differs; source=${JSON.stringify(sourceWhitespace.trailing)} target=${JSON.stringify(targetWhitespace.trailing)}`
    );
  }

  for (const error of quoteBoundaryErrors(sourceText, targetText)) {
    errors.push(`${coordinate}: ${error}`);
  }

  const sourceAria = source['aria-label'];
  const targetAria = target['aria-label'];
  if (sourceAria != null && String(sourceAria).trim() !== '') {
    if (targetAria == null || String(targetAria).trim() === '') {
      errors.push(`${coordinate}: source has aria-label; target aria-label is required`);
    } else {
      const sourceAriaTokens = normalizeTokens(sourceAria);
      const targetAriaTokens = normalizeTokens(targetAria);
      if (!arraysEqual(sourceAriaTokens, targetAriaTokens)) {
        errors.push(
          `${coordinate}: aria-label placeholder tokens differ; source=${JSON.stringify(sourceAriaTokens)} target=${JSON.stringify(targetAriaTokens)}`
        );
      }
      const sourceAriaWhitespace = whitespaceEdges(sourceAria);
      const targetAriaWhitespace = whitespaceEdges(targetAria);
      if (
        sourceAriaWhitespace.leading !== targetAriaWhitespace.leading ||
        sourceAriaWhitespace.trailing !== targetAriaWhitespace.trailing
      ) {
        errors.push(`${coordinate}: aria-label whitespace boundary differs`);
      }
    }
  }

  return errors;
}

function parsePrepareArgs(args) {
  const options = {
    arc: null,
    page: null,
    tier: 'global-core',
    langs: null,
    limit: DEFAULT_LIMIT,
    out: null,
  };
  let tierExplicit = false;

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (!['--arc', '--page', '--tier', '--langs', '--limit', '--out'].includes(arg)) {
      fail(`unknown prepare argument: ${arg}`);
    }
    const value = args[++i];
    if (value == null || String(value).startsWith('--')) fail(`${arg} requires a value`);

    if (arg === '--arc') options.arc = value;
    else if (arg === '--page') options.page = value;
    else if (arg === '--tier') {
      options.tier = value;
      tierExplicit = true;
    } else if (arg === '--langs') options.langs = value;
    else if (arg === '--limit') options.limit = Number(value);
    else if (arg === '--out') options.out = path.resolve(value);
  }

  if (!!options.arc === !!options.page) fail('prepare requires exactly one of --arc or --page');
  if (!Number.isInteger(options.limit) || options.limit <= 0) fail('--limit must be an integer > 0');
  if (options.langs && tierExplicit) fail('prepare accepts either --tier or --langs, not both');
  if (options.langs) options.tier = null;
  return options;
}

function parseInputArgs(args) {
  const options = { input: null, dryRun: false };
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === '--dry-run') {
      options.dryRun = true;
      continue;
    }
    if (arg === '--input') {
      const value = args[++i];
      if (value == null || String(value).startsWith('--')) fail('--input requires a value');
      options.input = path.resolve(value);
      continue;
    }
    fail(`unknown argument: ${arg}`);
  }
  if (!options.input) fail('--input is required');
  return options;
}

function selectionFromPrepare(options) {
  return {
    arc: options.arc || null,
    page: options.page || null,
    tier: options.tier || null,
    langs: options.langs
      ? String(options.langs).split(',').map(value => value.trim()).filter(Boolean)
      : null,
    limit: options.limit,
  };
}

function programOptionsFromSelection(selection) {
  if (!selection || typeof selection !== 'object') fail('payload selection is missing');
  if (!!selection.arc === !!selection.page) fail('payload selection must contain exactly one of arc/page');
  if (!Number.isInteger(selection.limit) || selection.limit <= 0) fail('payload selection limit is invalid');
  if (selection.tier && selection.langs) fail('payload selection cannot contain both tier and langs');

  return {
    arc: selection.arc || null,
    page: selection.page || null,
    tier: selection.tier || null,
    langs: Array.isArray(selection.langs) && selection.langs.length
      ? selection.langs.join(',')
      : null,
    limit: selection.limit,
    outDir: null,
    dryRun: true,
  };
}

function packetRows(programResult) {
  const result = {};
  for (const lang of programResult.manifest.targetLangs || []) {
    result[lang] = programResult.packets[lang]
      ? parseCSV(programResult.packets[lang])
      : [];
  }
  return result;
}

function rowForKey(rows, key) {
  return rows.find(row => String(row.key || '') === key) || null;
}

function preparePayloadFromProgram(programResult, selection) {
  const manifest = programResult.manifest;
  const state = manifest.selectedPage
    ? 'READY'
    : (manifest.completeAtFormation ? 'COMPLETE' : 'BLOCKED');

  const payload = {
    schemaVersion: SCHEMA_VERSION,
    state,
    batchId: programResult.batchId,
    sourceLang: 'en',
    page: manifest.selectedPage || null,
    targetLangs: [...(manifest.targetLangs || [])],
    selectedKeys: [...(manifest.selectedKeys || [])],
    selection: {
      arc: selection.arc || null,
      page: selection.page || null,
      tier: selection.tier || null,
      langs: Array.isArray(selection.langs) ? [...selection.langs] : null,
      limit: selection.limit,
    },
    rows: [],
    plannerProgress: JSON.parse(JSON.stringify(manifest.progress || {})),
  };

  if (!manifest.selectedPage) return payload;

  const byLang = packetRows(programResult);

  for (const key of manifest.selectedKeys) {
    const targetRows = [];
    for (const lang of manifest.targetLangs) {
      const row = rowForKey(byLang[lang] || [], key);
      if (row) targetRows.push([lang, row]);
    }
    if (!targetRows.length) fail(`planner selected key without any target packet row: ${key}`);

    const hashes = [...new Set(targetRows.map(([, row]) => String(row.source_en_hash12 || '')))];
    if (hashes.length !== 1 || !hashes[0]) {
      fail(`planner packet rows disagree on EN hash for ${key}`);
    }

    const contexts = [...new Set(targetRows.map(([, row]) => String(row.context || '')))];
    const enTexts = [...new Set(targetRows.map(([, row]) => String(row.en_text || '')))];
    const enAria = [...new Set(targetRows.map(([, row]) => String(row.en_aria_label || '')))];
    if (contexts.length !== 1 || enTexts.length !== 1 || enAria.length !== 1) {
      fail(`planner packet rows disagree on source/context for ${key}`);
    }

    const targets = targetRows.map(([lang]) => lang);
    const notes = [...new Set(targetRows.map(([, row]) => String(row.notes || '')).filter(Boolean))];

    const translations = {};
    for (const lang of targets) {
      translations[lang] = { text: '' };
      if (enAria[0]) translations[lang]['aria-label'] = '';
    }

    const source = { text: enTexts[0] };
    if (enAria[0]) source['aria-label'] = enAria[0];

    payload.rows.push({
      key,
      source_en_hash12: hashes[0],
      context: contexts[0],
      notes,
      source,
      targets,
      translations,
    });
  }

  return payload;
}

function prepareCycle(options, index = null, sources = null) {
  const selection = selectionFromPrepare(options);
  const programResult = formProgram(programOptionsFromSelection(selection), index, sources);
  return preparePayloadFromProgram(programResult, selection);
}

function immutablePayloadView(payload) {
  return {
    schemaVersion: payload.schemaVersion,
    state: payload.state,
    batchId: payload.batchId,
    sourceLang: payload.sourceLang,
    page: payload.page,
    targetLangs: payload.targetLangs,
    selectedKeys: payload.selectedKeys,
    selection: payload.selection,
    rows: (payload.rows || []).map(row => ({
      key: row.key,
      source_en_hash12: row.source_en_hash12,
      context: row.context,
      notes: row.notes,
      source: row.source,
      targets: row.targets,
      translationShape: Object.fromEntries(
        Object.entries(row.translations || {}).map(([lang, value]) => [
          lang,
          Object.keys(value || {}).sort(),
        ])
      ),
    })),
  };
}

function validatePayloadAgainstProgram(payload, currentProgram) {
  const errors = [];
  if (!payload || payload.schemaVersion !== SCHEMA_VERSION) {
    return [`unsupported cycle payload schema: ${payload && payload.schemaVersion}`];
  }
  if (payload.state !== 'READY') errors.push(`payload is not READY: ${payload.state}`);

  const currentTemplate = preparePayloadFromProgram(currentProgram, payload.selection);
  if (currentTemplate.state !== 'READY') {
    errors.push(`current planner no longer selects this batch; current state=${currentTemplate.state}`);
    return errors;
  }

  if (JSON.stringify(immutablePayloadView(payload)) !== JSON.stringify(immutablePayloadView(currentTemplate))) {
    errors.push('payload immutable planner/source envelope no longer matches current canonical planner');
  }
  return errors;
}

function validateTranslationContent(payload) {
  const errors = [];
  if (!payload || !Array.isArray(payload.rows)) return ['payload rows must be an array'];

  const seenKeys = new Set();
  for (const row of payload.rows) {
    const key = String(row.key || '');
    if (!key) {
      errors.push('payload row has blank key');
      continue;
    }
    if (seenKeys.has(key)) errors.push(`payload contains duplicate key: ${key}`);
    seenKeys.add(key);

    const targets = Array.isArray(row.targets) ? row.targets : [];
    const translationLangs = Object.keys(row.translations || {});
    if (!arraysEqual([...targets].sort(), [...translationLangs].sort())) {
      errors.push(`${key}: translation locales differ from owed target locales`);
      continue;
    }

    for (const lang of targets) {
      if (lang === 'en') {
        errors.push(`${key}: EN cannot be a target locale`);
        continue;
      }
      const target = row.translations[lang];
      if (!target || typeof target !== 'object') {
        errors.push(`${key}[${lang}]: target object missing`);
        continue;
      }
      errors.push(...structuralTranslationErrors(row.source || {}, target, `${key}[${lang}]`));
    }
  }
  return errors;
}

function importRowsByLanguage(payload) {
  const rows = Object.fromEntries((payload.targetLangs || []).map(lang => [lang, []]));

  for (const row of payload.rows || []) {
    for (const lang of row.targets || []) {
      if (!rows[lang]) fail(`${row.key}: target locale ${lang} is outside payload targetLangs`);
      const target = row.translations[lang] || {};
      rows[lang].push({
        key: row.key,
        source_en_hash12: row.source_en_hash12,
        [`${lang}_text`]: target.text || '',
        [`${lang}_aria_label`]: target['aria-label'] || '',
      });
    }
  }
  return rows;
}

function buildCycleImportPlan(payload, source) {
  const errors = [];
  const operations = [];
  const rows = importRowsByLanguage(payload);
  const expectedCount = (payload.rows || []).reduce(
    (sum, row) => sum + (Array.isArray(row.targets) ? row.targets.length : 0),
    0
  );

  for (const lang of payload.targetLangs || []) {
    const langRows = rows[lang] || [];
    const plan = buildImportPlan(langRows, lang, source, `cycle.${payload.batchId}.${lang}.csv`);
    errors.push(...plan.errors);
    operations.push(...plan.operations);
  }

  if (!errors.length && operations.length !== expectedCount) {
    errors.push(
      `import plan operation count mismatch: expected ${expectedCount}, planned ${operations.length}`
    );
  }

  const seenTargets = new Set();
  for (const operation of operations) {
    const id = `${operation.key}\u0000${operation.lang}`;
    if (seenTargets.has(id)) errors.push(`duplicate import target in cycle plan: ${operation.key}[${operation.lang}]`);
    seenTargets.add(id);
  }

  return { errors, operations, expectedCount };
}

function expectedTranslation(target) {
  const output = { text: target.text };
  if (target['aria-label'] != null && String(target['aria-label']).trim() !== '') {
    output['aria-label'] = target['aria-label'];
  }
  return output;
}

function verifyPayloadAgainstSource(payload, source) {
  const errors = [];
  let verifiedCells = 0;

  for (const row of payload.rows || []) {
    const entry = source[row.key];
    if (!entry) {
      errors.push(`${row.key}: canonical source key missing during verification`);
      continue;
    }
    const actualHash = currentEnHash(entry.value);
    if (actualHash !== row.source_en_hash12) {
      errors.push(
        `${row.key}: EN preimage changed after formation; payload=${row.source_en_hash12} current=${actualHash}`
      );
      continue;
    }

    for (const lang of row.targets || []) {
      const actual = entry.value?.strings?.[lang];
      const expected = expectedTranslation(row.translations[lang] || {});
      if (!actual) {
        errors.push(`${row.key}[${lang}]: translation missing after placement`);
        continue;
      }
      if (actual._stale === true) {
        errors.push(`${row.key}[${lang}]: translation is marked stale after placement`);
        continue;
      }
      if (JSON.stringify(actual) !== JSON.stringify(expected)) {
        errors.push(
          `${row.key}[${lang}]: readback differs; expected=${JSON.stringify(expected)} actual=${JSON.stringify(actual)}`
        );
        continue;
      }
      verifiedCells += 1;
    }
  }

  return { errors, verifiedCells };
}

function progressReport(payload, programResult, verifiedCells) {
  const manifest = programResult.manifest;
  const completePages = manifest.progress?.completePages || [];
  return {
    schemaVersion: 'vextreme.translation-cycle.report/v1',
    batchId: payload.batchId,
    page: payload.page,
    verifiedCells,
    pageComplete: completePages.includes(payload.page),
    currentSelectedPage: manifest.selectedPage || null,
    pageAdvanced: manifest.selectedPage !== payload.page,
    completeAtFormation: Boolean(manifest.completeAtFormation),
    completePages,
    sourceOnlyPages: manifest.progress?.sourceOnlyPages || [],
    blockedPages: manifest.progress?.blockedPages || [],
    remainingPages: manifest.progress?.remainingPages || [],
    selectedKeys: manifest.selectedKeys || [],
    resumeCommand: manifest.resumeCommand || null,
  };
}

function readPayload(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function writeTouchedFiles(touchedFiles, fileCache) {
  for (const filePath of [...touchedFiles].sort()) {
    fs.writeFileSync(filePath, JSON.stringify(fileCache[filePath], null, 2) + '\n');
  }
}

function currentProgramForPayload(payload) {
  return formProgram(programOptionsFromSelection(payload.selection));
}

function verifyCycle(payload) {
  const fileCache = {};
  const source = loadAllSource(fileCache);
  const readback = verifyPayloadAgainstSource(payload, source);
  if (readback.errors.length) fail(readback.errors.join('\n'));

  const programResult = currentProgramForPayload(payload);
  return progressReport(payload, programResult, readback.verifiedCells);
}

function applyCycle(payload, dryRun = false) {
  const programResult = currentProgramForPayload(payload);
  const envelopeErrors = validatePayloadAgainstProgram(payload, programResult);
  const contentErrors = validateTranslationContent(payload);
  const errors = [...envelopeErrors, ...contentErrors];
  if (errors.length) fail(errors.join('\n'));

  const fileCache = {};
  const source = loadAllSource(fileCache);
  const plan = buildCycleImportPlan(payload, source);
  if (plan.errors.length) fail(plan.errors.join('\n'));

  if (dryRun) {
    return {
      schemaVersion: 'vextreme.translation-cycle.dry-run/v1',
      batchId: payload.batchId,
      page: payload.page,
      plannedCells: plan.operations.length,
      touchedFiles: [...new Set(plan.operations.map(operation => operation.file))].sort(),
    };
  }

  const touchedFiles = applyImportOperations(plan.operations, fileCache);
  writeTouchedFiles(touchedFiles, fileCache);
  return verifyCycle(payload);
}

function main(args = process.argv.slice(2)) {
  const command = args[0];
  if (!['prepare', 'apply', 'verify'].includes(command)) {
    fail('usage: translation:cycle <prepare|apply|verify> [options]');
  }

  if (command === 'prepare') {
    const options = parsePrepareArgs(args.slice(1));
    const payload = prepareCycle(options);
    const text = JSON.stringify(payload, null, 2) + '\n';
    if (options.out) {
      fs.mkdirSync(path.dirname(options.out), { recursive: true });
      fs.writeFileSync(options.out, text);
      process.stdout.write(JSON.stringify({
        schemaVersion: 'vextreme.translation-cycle.prepared/v1',
        state: payload.state,
        batchId: payload.batchId,
        page: payload.page,
        selectedKeys: payload.selectedKeys.length,
        targetCells: payload.rows.reduce((sum, row) => sum + row.targets.length, 0),
        output: options.out,
      }, null, 2) + '\n');
    } else {
      process.stdout.write(text);
    }
    return 0;
  }

  const options = parseInputArgs(args.slice(1));
  const payload = readPayload(options.input);

  if (command === 'apply') {
    process.stdout.write(JSON.stringify(applyCycle(payload, options.dryRun), null, 2) + '\n');
    return 0;
  }

  if (options.dryRun) fail('--dry-run is only valid with apply');
  process.stdout.write(JSON.stringify(verifyCycle(payload), null, 2) + '\n');
  return 0;
}

if (require.main === module) {
  try {
    process.exitCode = main();
  } catch (error) {
    console.error(`[translation-cycle] BLOCKED — ${error.message}`);
    process.exitCode = 1;
  }
}

module.exports = {
  SCHEMA_VERSION,
  DEFAULT_LIMIT,
  quoteBoundaryErrors,
  structuralTranslationErrors,
  parsePrepareArgs,
  selectionFromPrepare,
  programOptionsFromSelection,
  preparePayloadFromProgram,
  prepareCycle,
  immutablePayloadView,
  validatePayloadAgainstProgram,
  validateTranslationContent,
  importRowsByLanguage,
  buildCycleImportPlan,
  expectedTranslation,
  verifyPayloadAgainstSource,
  progressReport,
  applyCycle,
  verifyCycle,
  main,
};

// [VXG RealForever]
