'use strict';

/**
 * TRANSLATION PROGRAM — tests/62-translation-program.test.js
 *
 * Proves page-complete, arc-ordered multi-language scheduling while preserving
 * the existing locale + canonical-key translation ownership contract.
 *
 * [VXG RealForever]
 */

const { test } = require('node:test');
const assert = require('node:assert/strict');

const { parseCSV } = require('../lib/strings-import');
const {
  LANGUAGE_TIERS,
  parseArgs,
  targetLanguages,
  orderedArcSlugs,
  sourceScopeSet,
  pageScopeState,
  collectTierCandidates,
  pageCandidates,
  buildProgress,
  formProgram,
} = require('../lib/translation-program');

function entry(text, targets = {}) {
  return {
    strings: {
      en: { text },
      ...targets,
    },
  };
}

function fixtureSources() {
  return [
    {
      rel: 'common.json',
      scope: 'common',
      htmlContextMap: {},
      raw: {
        _meta: { scope: 'common', description: 'Common UI' },
        'common.nav.next': entry('Next', {
          fr: { text: 'Suivant' },
        }),
      },
    },
    {
      rel: 'pages/a.json',
      scope: 'a',
      htmlContextMap: {},
      raw: {
        _meta: { scope: 'pages.a', description: 'Page A' },
        'pages.a.alpha': entry('Alpha', {
          fr: { text: 'Alpha FR' },
        }),
        'pages.a.beta': entry('Beta'),
      },
    },
    {
      rel: 'pages/huge.json',
      scope: 'huge',
      htmlContextMap: {},
      raw: {
        _meta: {
          scope: 'pages.huge',
          translationPolicy: 'source-only',
        },
        'pages.huge.body': entry('English only'),
      },
    },
    {
      rel: 'pages/b.json',
      scope: 'b',
      htmlContextMap: {},
      raw: {
        _meta: { scope: 'pages.b', description: 'Page B' },
        'pages.b.alpha': entry('Page B Alpha'),
      },
    },
  ];
}

function fixtureIndex() {
  return {
    sourceOnlyScopes: ['pages.huge'],
    arcMap: {
      story: [
        { label: 'Part I', slugs: ['a', 'huge'] },
        { label: 'Part II', slugs: ['a', 'b'] },
      ],
    },
    slugMap: {
      a: {
        slug: 'a',
        viewmodel: { scopes: ['pages.a'] },
      },
      huge: {
        slug: 'huge',
        viewmodel: { scopes: ['pages.huge'] },
      },
      b: {
        slug: 'b',
        viewmodel: { scopes: ['pages.b'] },
      },
      missing: {
        slug: 'missing',
        viewmodel: { scopes: ['pages.missing'] },
      },
    },
  };
}

test('PROGRAM TIER: global-core matches the current first-class browser language presentation set', () => {
  assert.deepEqual(
    LANGUAGE_TIERS['global-core'],
    ['zh', 'ja', 'ko', 'fr', 'de', 'es', 'pt', 'ar', 'hi']
  );
  assert.equal(LANGUAGE_TIERS['global-core'].includes('en'), false);
});

test('PROGRAM TIER CONTRACT: every global-core target is first-class in the browser language wheel', () => {
  const fs = require('node:fs');
  const path = require('node:path');
  const fab = fs.readFileSync(path.join(__dirname, '..', 'widgets', 'fab-lang.js'), 'utf8');
  const flagsStart = fab.indexOf('var LANG_FLAGS = {');
  const namesStart = fab.indexOf('var LANG_NAMES = {');
  const sortStart = fab.indexOf('function sortLangs', namesStart);

  assert.ok(flagsStart >= 0, 'LANG_FLAGS block must remain discoverable');
  assert.ok(namesStart > flagsStart, 'LANG_NAMES block must remain discoverable');
  assert.ok(sortStart > namesStart, 'sortLangs boundary must remain discoverable');

  const flags = fab.slice(flagsStart, namesStart);
  const names = fab.slice(namesStart, sortStart);

  for (const lang of LANGUAGE_TIERS['global-core']) {
    const pattern = new RegExp('\\\\n\\\\s*' + lang + ':');
    assert.match(flags, pattern, `${lang} must have a first-class flag`);
    assert.match(names, pattern, `${lang} must have a first-class display name`);
  }
});

test('PROGRAM ARGS: one page/arc unit is required and explicit langs may replace the tier', () => {
  const arc = parseArgs(['--arc', 'story']);
  assert.equal(arc.arc, 'story');
  assert.equal(arc.tier, 'global-core');
  assert.deepEqual(targetLanguages(arc), LANGUAGE_TIERS['global-core']);

  const page = parseArgs([
    '--page', 'a',
    '--langs', 'fr,de,es,fr',
    '--limit', '12',
    '--dry-run',
  ]);
  assert.equal(page.page, 'a');
  assert.equal(page.tier, null);
  assert.deepEqual(targetLanguages(page), ['fr', 'de', 'es']);
  assert.equal(page.limit, 12);
  assert.equal(page.dryRun, true);

  assert.throws(() => parseArgs([]), /exactly one of --arc or --page/);
  assert.throws(() => parseArgs(['--arc', 'story', '--page', 'a']), /exactly one/);
  assert.throws(
    () => parseArgs(['--page', 'a', '--tier', 'global-core', '--langs', 'fr']),
    /either --tier or --langs/
  );
  assert.throws(
    () => parseArgs(['--page', 'a', '--langs', 'en,fr']),
    /EN is the canonical source/
  );
  assert.throws(
    () => parseArgs(['--page', 'a', '--tier', 'does-not-exist']),
    /unknown translation tier/
  );
});

test('PROGRAM ARC: canonical arc order is preserved and duplicate membership is deduped', () => {
  assert.deepEqual(orderedArcSlugs(fixtureIndex(), 'story'), ['a', 'huge', 'b']);
  assert.throws(() => orderedArcSlugs(fixtureIndex(), 'missing'), /unknown arc/);
});

test('PROGRAM PAGE SCOPES: common is shared, source-only pages are exempt, and missing source is explicit', () => {
  const sources = fixtureSources();
  const scopes = sourceScopeSet(sources);

  assert.deepEqual(pageScopeState(fixtureIndex(), 'a', scopes), {
    slug: 'a',
    sourceOnly: false,
    declaredScopes: ['pages.a'],
    scopes: ['common', 'pages.a'],
    missingSourceScopes: [],
  });

  assert.deepEqual(pageScopeState(fixtureIndex(), 'huge', scopes), {
    slug: 'huge',
    sourceOnly: true,
    declaredScopes: ['pages.huge'],
    scopes: [],
    missingSourceScopes: [],
  });

  assert.deepEqual(pageScopeState(fixtureIndex(), 'missing', scopes).missingSourceScopes, [
    'pages.missing',
  ]);
});

test('PROGRAM PAGE: one semantic page shard emits separate independently target-bound CSVs', () => {
  const sources = fixtureSources();
  const index = fixtureIndex();

  const result = formProgram({
    arc: 'story',
    page: null,
    tier: null,
    langs: 'fr,de',
    limit: 20,
    outDir: '/virtual',
    dryRun: true,
  }, index, sources);

  assert.equal(result.manifest.selectedPage, 'a');
  assert.deepEqual(result.manifest.pageScopes, ['common', 'pages.a']);
  assert.deepEqual(result.manifest.targetLangs, ['fr', 'de']);

  // FR already owns common.next + pages.a.alpha, so only page beta is owed.
  assert.equal(result.manifest.packets.fr.selectedCount, 1);
  // DE is missing both page keys plus the shared common key.
  assert.equal(result.manifest.packets.de.selectedCount, 3);

  const frRows = parseCSV(result.packets.fr);
  const deRows = parseCSV(result.packets.de);

  assert.deepEqual(frRows.map(row => row.key), ['pages.a.beta']);
  assert.deepEqual(
    deRows.map(row => row.key),
    ['common.nav.next', 'pages.a.alpha', 'pages.a.beta']
  );

  assert.ok(frRows.every(row => Object.prototype.hasOwnProperty.call(row, 'fr_text')));
  assert.ok(frRows.every(row => !Object.prototype.hasOwnProperty.call(row, 'de_text')));
  assert.ok(deRows.every(row => Object.prototype.hasOwnProperty.call(row, 'de_text')));
  assert.ok(deRows.every(row => !Object.prototype.hasOwnProperty.call(row, 'fr_text')));
});

test('PROGRAM ARC: source-only pages are skipped and the first incomplete page remains selected until complete', () => {
  const sources = fixtureSources();
  const index = fixtureIndex();
  const langs = ['fr'];
  const byLang = collectTierCandidates(sources, langs);
  const progress = buildProgress(index, sources, byLang, langs, ['a', 'huge', 'b']);

  assert.deepEqual(
    progress.map(page => [page.slug, page.sourceOnly, page.candidateCount]),
    [
      ['a', false, 1],
      ['huge', true, 0],
      ['b', false, 1],
    ]
  );

  const first = formProgram({
    arc: 'story',
    page: null,
    tier: null,
    langs: 'fr',
    limit: 1,
    outDir: '/virtual',
    dryRun: true,
  }, index, sources);
  assert.equal(first.manifest.selectedPage, 'a');

  // Simulate accepting the remaining FR row on page A.
  sources[1].raw['pages.a.beta'].strings.fr = { text: 'Bêta' };

  const second = formProgram({
    arc: 'story',
    page: null,
    tier: null,
    langs: 'fr',
    limit: 1,
    outDir: '/virtual',
    dryRun: true,
  }, index, sources);
  assert.equal(second.manifest.selectedPage, 'b');
  assert.deepEqual(second.manifest.progress.sourceOnlyPages, ['huge']);
});

test('PROGRAM SHARDING: bounded keys are shared across languages and resume re-runs current source instead of a cross-language cursor', () => {
  const result = formProgram({
    arc: 'story',
    page: null,
    tier: null,
    langs: 'fr,de',
    limit: 1,
    outDir: '/virtual',
    dryRun: true,
  }, fixtureIndex(), fixtureSources());

  assert.equal(result.manifest.selectedPage, 'a');
  assert.equal(result.manifest.selectedKeys.length, 1);
  assert.equal(result.manifest.hasMoreInPage, true);
  assert.equal(result.manifest.resumeCommand.includes('--after-key'), false);
  assert.match(
    result.manifest.resumeCommand,
    /^npm run translation:program -- --arc story --langs fr,de --limit 1$/
  );
});

test('PROGRAM BLOCKING: an arc cannot claim complete when a required page string scope is missing', () => {
  const index = fixtureIndex();
  index.arcMap.missing_arc = [{ label: 'Only', slugs: ['missing'] }];

  const result = formProgram({
    arc: 'missing_arc',
    page: null,
    tier: null,
    langs: 'fr',
    limit: 20,
    outDir: '/virtual',
    dryRun: true,
  }, index, fixtureSources());

  assert.equal(result.manifest.selectedPage, null);
  assert.equal(result.manifest.completeAtFormation, false);
  assert.deepEqual(result.manifest.progress.blockedPages, [{
    slug: 'missing',
    missingSourceScopes: ['pages.missing'],
  }]);
});

test('PROGRAM COMPLETION: an arc is complete only when every translatable page has zero target debt', () => {
  const sources = fixtureSources();

  for (const source of sources) {
    for (const [key, value] of Object.entries(source.raw)) {
      if (key === '_meta' || !value || !value.strings || !value.strings.en) continue;
      if (source.raw._meta && source.raw._meta.translationPolicy === 'source-only') continue;
      value.strings.fr = value.strings.fr || { text: value.strings.en.text + ' FR' };
    }
  }

  const result = formProgram({
    arc: 'story',
    page: null,
    tier: null,
    langs: 'fr',
    limit: 20,
    outDir: '/virtual',
    dryRun: true,
  }, fixtureIndex(), sources);

  assert.equal(result.manifest.selectedPage, null);
  assert.equal(result.manifest.completeAtFormation, true);
  assert.deepEqual(result.manifest.progress.remainingPages, []);
  assert.deepEqual(result.manifest.progress.sourceOnlyPages, ['huge']);
});
