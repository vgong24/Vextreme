'use strict';

/**
 * TRANSLATION CYCLE — tests/95-translation-cycle.test.js
 *
 * Proves the ScreenCrawler-shaped localization loop:
 * canonical planner -> concrete matrix -> existing importer -> exact readback.
 *
 * [VXG RealForever]
 */

const { test } = require('node:test');
const assert = require('node:assert/strict');

const { renderTranslatorCSV } = require('../lib/strings-export');
const {
  currentEnHash,
  applyImportOperations,
} = require('../lib/strings-import');
const {
  SCHEMA_VERSION,
  quoteBoundaryErrors,
  structuralTranslationErrors,
  preparePayloadFromProgram,
  validatePayloadAgainstProgram,
  validateTranslationContent,
  buildCycleImportPlan,
  verifyPayloadAgainstSource,
  progressReport,
} = require('../lib/translation-cycle');

function translatorRow(lang, {
  key,
  hash = 'aaaaaaaaaaaa',
  text = 'Hello',
  aria = '',
  context = 'page-body',
  notes = '',
}) {
  return {
    key,
    context,
    en_text: text,
    en_aria_label: aria,
    source_en_hash12: hash,
    [`${lang}_text`]: '',
    [`${lang}_aria_label`]: '',
    notes,
  };
}

function programFixture() {
  const key = 'pages.example.greeting';
  const fr = translatorRow('fr', {
    key,
    hash: 'hash-one',
    text: 'Hello {name}',
    aria: 'Greet {name}',
    context: 'paragraph; page=example',
    notes: 'Preserve placeholder tokens exactly: {name}.',
  });
  const de = translatorRow('de', {
    key,
    hash: 'hash-one',
    text: 'Hello {name}',
    aria: 'Greet {name}',
    context: 'paragraph; page=example',
    notes: 'Preserve placeholder tokens exactly: {name}.',
  });

  return {
    mode: 'page-program',
    batchId: 'example-hash-one',
    manifest: {
      sourceLang: 'en',
      targetTier: 'global-core',
      targetLangs: ['fr', 'de'],
      selection: { arc: 'story', page: null, limit: 20 },
      selectedPage: 'example',
      selectedKeys: [key],
      packets: {
        fr: {
          rows: [{ key, source_en_hash12: 'hash-one' }],
        },
        de: {
          rows: [{ key, source_en_hash12: 'hash-one' }],
        },
      },
      progress: {
        completePages: [],
        sourceOnlyPages: [],
        blockedPages: [],
        remainingPages: [{ slug: 'example', candidateCount: 1 }],
      },
      completeAtFormation: false,
      resumeCommand: 'npm run translation:program -- --arc story --tier global-core --limit 20',
    },
    packets: {
      fr: renderTranslatorCSV([fr], 'fr'),
      de: renderTranslatorCSV([de], 'de'),
    },
  };
}

function selectionFixture() {
  return {
    arc: 'story',
    page: null,
    tier: 'global-core',
    langs: null,
    limit: 20,
  };
}

test('CYCLE PREPARE: one planner shard becomes one multi-target semantic matrix', () => {
  const payload = preparePayloadFromProgram(programFixture(), selectionFixture());

  assert.equal(payload.schemaVersion, SCHEMA_VERSION);
  assert.equal(payload.state, 'READY');
  assert.equal(payload.page, 'example');
  assert.deepEqual(payload.targetLangs, ['fr', 'de']);
  assert.deepEqual(payload.selectedKeys, ['pages.example.greeting']);
  assert.equal(payload.rows.length, 1);

  const row = payload.rows[0];
  assert.equal(row.context, 'paragraph; page=example');
  assert.deepEqual(row.source, {
    text: 'Hello {name}',
    'aria-label': 'Greet {name}',
  });
  assert.deepEqual(row.targets, ['fr', 'de']);
  assert.deepEqual(row.translations, {
    fr: { text: '', 'aria-label': '' },
    de: { text: '', 'aria-label': '' },
  });
  assert.deepEqual(row.notes, ['Preserve placeholder tokens exactly: {name}.']);
});

test('CYCLE CURRENTNESS: translator may fill target cells but cannot mutate planner/source envelope', () => {
  const program = programFixture();
  const payload = preparePayloadFromProgram(program, selectionFixture());

  payload.rows[0].translations.fr = {
    text: 'Bonjour {name}',
    'aria-label': 'Saluer {name}',
  };
  payload.rows[0].translations.de = {
    text: 'Hallo {name}',
    'aria-label': '{name} begrüßen',
  };

  assert.deepEqual(validatePayloadAgainstProgram(payload, program), []);

  payload.rows[0].source.text = 'Changed by translator';
  assert.match(
    validatePayloadAgainstProgram(payload, program).join('\n'),
    /immutable planner\/source envelope/
  );
});

test('CYCLE STRUCTURE: placeholders, whitespace and split quote boundaries fail closed', () => {
  const source = {
    text: '"Count {count, plural, one {# item} other {# items}} ',
    'aria-label': 'Count {count}',
  };

  assert.deepEqual(
    structuralTranslationErrors(source, {
      text: '"Compter {count, plural, one {# élément} other {# éléments}} ',
      'aria-label': 'Compter {count}',
    }, 'k[fr]'),
    []
  );

  const errors = structuralTranslationErrors(source, {
    text: '«Compter {count}»',
    'aria-label': 'Compter',
  }, 'k[fr]').join('\n');

  assert.match(errors, /placeholder tokens differ/);
  assert.match(errors, /trailing whitespace boundary differs/);
  assert.match(errors, /must begin with literal/);
  assert.match(errors, /aria-label placeholder tokens differ/);

  assert.deepEqual(quoteBoundaryErrors('"Self contained"', '«Autonome»'), []);
  assert.match(quoteBoundaryErrors('"', '»').join('\n'), /quote-only structural fragment/);
});

test('CYCLE IMPORT: accepted importer remains the only placement authority', () => {
  const key = 'pages.example.greeting';
  const file = '/virtual/page.json';
  const entry = {
    strings: {
      en: {
        text: 'Hello {name}',
        'aria-label': 'Greet {name}',
      },
    },
  };
  const source = {
    [key]: {
      value: entry,
      file,
      translationPolicy: 'normal',
    },
  };
  const hash = currentEnHash(entry);

  const program = programFixture();
  program.batchId = 'example-current';
  program.manifest.packets.fr.rows[0].source_en_hash12 = hash;
  program.manifest.packets.de.rows[0].source_en_hash12 = hash;
  program.packets.fr = renderTranslatorCSV([
    translatorRow('fr', {
      key,
      hash,
      text: 'Hello {name}',
      aria: 'Greet {name}',
    }),
  ], 'fr');
  program.packets.de = renderTranslatorCSV([
    translatorRow('de', {
      key,
      hash,
      text: 'Hello {name}',
      aria: 'Greet {name}',
    }),
  ], 'de');

  const payload = preparePayloadFromProgram(program, selectionFixture());
  payload.rows[0].translations.fr = {
    text: 'Bonjour {name}',
    'aria-label': 'Saluer {name}',
  };
  payload.rows[0].translations.de = {
    text: 'Hallo {name}',
    'aria-label': '{name} begrüßen',
  };

  assert.deepEqual(validateTranslationContent(payload), []);

  const plan = buildCycleImportPlan(payload, source);
  assert.deepEqual(plan.errors, []);
  assert.equal(plan.expectedCount, 2);
  assert.equal(plan.operations.length, 2);
  assert.deepEqual(
    plan.operations.map(operation => [operation.key, operation.lang]),
    [[key, 'fr'], [key, 'de']]
  );

  const fileCache = {
    [file]: {
      _meta: { scope: 'pages.example' },
      [key]: entry,
    },
  };
  applyImportOperations(plan.operations, fileCache);

  const currentSource = {
    [key]: {
      value: fileCache[file][key],
      file,
      translationPolicy: 'normal',
    },
  };
  const readback = verifyPayloadAgainstSource(payload, currentSource);
  assert.deepEqual(readback.errors, []);
  assert.equal(readback.verifiedCells, 2);
});

test('CYCLE IMPORT: stale EN binding blocks the batch before placement', () => {
  const key = 'pages.example.greeting';
  const source = {
    [key]: {
      value: { strings: { en: { text: 'Current' } } },
      file: '/virtual/page.json',
      translationPolicy: 'normal',
    },
  };

  const payload = {
    schemaVersion: SCHEMA_VERSION,
    state: 'READY',
    batchId: 'stale',
    sourceLang: 'en',
    page: 'example',
    targetLangs: ['fr'],
    selectedKeys: [key],
    selection: selectionFixture(),
    rows: [{
      key,
      source_en_hash12: 'old-hash',
      context: '',
      notes: [],
      source: { text: 'Old' },
      targets: ['fr'],
      translations: { fr: { text: 'Ancien' } },
    }],
  };

  const plan = buildCycleImportPlan(payload, source);
  assert.equal(plan.operations.length, 0);
  assert.match(plan.errors.join('\n'), /is stale/);
});

test('CYCLE VERIFY: report distinguishes page closure from next scheduler edge', () => {
  const payload = {
    batchId: 'batch',
    page: 'example',
  };
  const nextProgram = {
    manifest: {
      selectedPage: 'next-page',
      selectedKeys: ['pages.next.one'],
      completeAtFormation: false,
      resumeCommand: 'resume',
      progress: {
        completePages: ['example'],
        sourceOnlyPages: [],
        blockedPages: [],
        remainingPages: [{ slug: 'next-page', candidateCount: 9 }],
      },
    },
  };

  assert.deepEqual(progressReport(payload, nextProgram, 18), {
    schemaVersion: 'vextreme.translation-cycle.report/v1',
    batchId: 'batch',
    page: 'example',
    verifiedCells: 18,
    pageComplete: true,
    currentSelectedPage: 'next-page',
    pageAdvanced: true,
    completeAtFormation: false,
    completePages: ['example'],
    sourceOnlyPages: [],
    blockedPages: [],
    remainingPages: [{ slug: 'next-page', candidateCount: 9 }],
    selectedKeys: ['pages.next.one'],
    resumeCommand: 'resume',
  });
});

test('CYCLE TARGETS: extra locale or missing owed locale is rejected', () => {
  const payload = preparePayloadFromProgram(programFixture(), selectionFixture());
  payload.rows[0].translations.fr = {
    text: 'Bonjour {name}',
    'aria-label': 'Saluer {name}',
  };
  payload.rows[0].translations.es = {
    text: 'Hola {name}',
    'aria-label': 'Saludar {name}',
  };

  const errors = validateTranslationContent(payload).join('\n');
  assert.match(errors, /translation locales differ from owed target locales/);
});

// [VXG RealForever]
