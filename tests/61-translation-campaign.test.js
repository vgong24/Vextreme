'use strict';

/**
 * TRANSLATION CAMPAIGN — tests/61-translation-campaign.test.js
 *
 * Proves deterministic source→one-target campaign iteration without creating
 * another translation truth owner.
 */

const { test } = require('node:test');
const assert = require('node:assert/strict');

const { parseCSV } = require('../lib/strings-import');
const {
  parseCampaignArgs,
  needsTranslation,
  compareCanonicalText,
  collectCampaignCandidatesFromSources,
  selectCampaignWindow,
  campaignBatchId,
  formCampaign,
} = require('../lib/translation-campaign');

function fixtureSources() {
  return [
    {
      rel: 'common.json',
      scope: 'common',
      htmlContextMap: {},
      raw: {
        _meta: { scope: 'common', description: 'Common UI' },
        'common.alpha': {
          strings: {
            en: { text: 'Alpha' },
            ja: { text: 'アルファ' },
          },
        },
        'common.beta': {
          strings: {
            en: { text: 'Beta' },
            fr: { text: 'Bêta' },
          },
        },
        'common.charlie': {
          strings: {
            en: { text: 'Charlie' },
            fr: { text: 'Ancien', _stale: true },
            zh: { text: '查理' },
          },
        },
      },
    },
    {
      rel: 'pages/normal.json',
      scope: 'normal',
      htmlContextMap: {
        'pages.normal.body': {
          tag: 'p',
          classes: [],
          ancestorClasses: [],
          nearestHeading: 'Normal Page',
          previousKey: null,
        },
      },
      raw: {
        _meta: { scope: 'pages.normal', description: 'Normal page' },
        'pages.normal.body': {
          strings: {
            en: { text: 'Normal body' },
          },
        },
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
        'pages.huge.body': {
          strings: {
            en: { text: 'English only' },
          },
        },
      },
    },
  ];
}

test('CAMPAIGN ARGS: target is required, EN is forbidden, and after-key is mutually exclusive with start', () => {
  assert.throws(() => parseCampaignArgs([]), /--lang is required/);
  assert.throws(() => parseCampaignArgs(['--lang', 'en']), /EN is the source language/);
  assert.throws(
    () => parseCampaignArgs(['--lang', 'fr', '--start', '10', '--after-key', 'common.alpha']),
    /either --start or --after-key/
  );

  const parsed = parseCampaignArgs([
    '--lang', 'fr',
    '--scope', 'pages.normal',
    '--after-key', 'pages.normal.a',
    '--limit', '50',
    '--dry-run',
  ]);
  assert.equal(parsed.lang, 'fr');
  assert.equal(parsed.scope, 'pages.normal');
  assert.equal(parsed.afterKey, 'pages.normal.a');
  assert.equal(parsed.limit, 50);
  assert.equal(parsed.dryRun, true);
});

test('CAMPAIGN ELIGIBILITY: missing and stale target rows are selected; current target rows are not', () => {
  const [common] = fixtureSources();
  assert.equal(needsTranslation(common.raw['common.alpha'], 'fr'), true);
  assert.equal(needsTranslation(common.raw['common.beta'], 'fr'), false);
  assert.equal(needsTranslation(common.raw['common.charlie'], 'fr'), true);
});

test('CAMPAIGN CANDIDATES: deterministic global key order skips source-only scopes', () => {
  const candidates = collectCampaignCandidatesFromSources(fixtureSources(), 'fr');
  assert.deepEqual(
    candidates.map(row => [row.key, row.state, row.sourceScope]),
    [
      ['common.alpha', 'missing', 'common'],
      ['common.charlie', 'stale', 'common'],
      ['pages.normal.body', 'missing', 'pages.normal'],
    ]
  );
  assert.equal(
    candidates.some(row => row.key === 'pages.huge.body'),
    false,
    'source-only scope must not enter campaign work'
  );
});

test('CAMPAIGN CANDIDATES: scope filter accepts canonical _meta.scope', () => {
  const candidates = collectCampaignCandidatesFromSources(
    fixtureSources(),
    'fr',
    'pages.normal'
  );
  assert.deepEqual(candidates.map(row => row.key), ['pages.normal.body']);
});

test('CAMPAIGN CURSOR: after-key is stable when earlier translated candidates disappear', () => {
  const all = [
    { key: 'a' },
    { key: 'b' },
    { key: 'c' },
    { key: 'd' },
  ];
  assert.deepEqual(
    selectCampaignWindow(all, { afterKey: 'b', limit: 2 }).selected.map(x => x.key),
    ['c', 'd']
  );

  // Simulate importing the prior batch: a/b no longer appear in the candidate
  // set. The durable cursor still resumes at the same semantic boundary.
  const afterImport = [{ key: 'c' }, { key: 'd' }];
  assert.deepEqual(
    selectCampaignWindow(afterImport, { afterKey: 'b', limit: 2 }).selected.map(x => x.key),
    ['c', 'd']
  );
});

test('CAMPAIGN ORDER: canonical key sort and after-key cursor share one locale-independent comparator', () => {
  const sources = [{
    rel: 'punctuation.json',
    scope: 'punctuation',
    htmlContextMap: {},
    raw: {
      _meta: { scope: 'punctuation' },
      'a_b': { strings: { en: { text: 'underscore' } } },
      'a-b': { strings: { en: { text: 'hyphen' } } },
      'a.b': { strings: { en: { text: 'dot' } } },
    },
  }];

  const candidates = collectCampaignCandidatesFromSources(sources, 'fr');
  assert.deepEqual(candidates.map(candidate => candidate.key), ['a-b', 'a.b', 'a_b']);
  assert.ok(compareCanonicalText('a-b', 'a.b') < 0);
  assert.ok(compareCanonicalText('a.b', 'a_b') < 0);
  assert.deepEqual(
    selectCampaignWindow(candidates, { afterKey: 'a.b', limit: 10 }).selected.map(candidate => candidate.key),
    ['a_b']
  );
});

test('CAMPAIGN FORMATION: packet remains EN + one target and manifest is deterministic', () => {
  const options = {
    lang: 'fr',
    scope: null,
    start: 0,
    afterKey: null,
    limit: 2,
    outDir: '/virtual',
    dryRun: true,
  };

  const first = formCampaign(options, fixtureSources());
  const second = formCampaign(options, fixtureSources());

  assert.equal(first.batchId, second.batchId);
  assert.deepEqual(first.manifest, second.manifest);
  assert.equal(first.manifest.selectedCount, 2);
  assert.equal(first.manifest.hasMore, true);
  assert.equal(first.manifest.nextAfterKey, 'common.charlie');
  assert.match(
    first.manifest.resumeCommand,
    /--lang fr --after-key common.charlie --limit 2$/
  );

  const rows = parseCSV(first.csv);
  assert.deepEqual(rows.map(row => row.key), ['common.alpha', 'common.charlie']);
  assert.ok(rows.every(row => Object.prototype.hasOwnProperty.call(row, 'fr_text')));
  assert.ok(rows.every(row => Object.prototype.hasOwnProperty.call(row, 'fr_aria_label')));
  assert.ok(rows.every(row => !Object.prototype.hasOwnProperty.call(row, 'ja_text')));
  assert.doesNotMatch(first.csv, /アルファ|查理/);
  assert.ok(rows.every(row => /^[0-9a-f]{12}$/.test(row.source_en_hash12)));
});

test('CAMPAIGN MANIFEST: row identity binds key + canonical source + EN preimage hash', () => {
  const result = formCampaign({
    lang: 'fr',
    scope: 'pages.normal',
    start: 0,
    afterKey: null,
    limit: 20,
    outDir: '/virtual',
    dryRun: true,
  }, fixtureSources());

  assert.equal(result.manifest.rows.length, 1);
  assert.deepEqual(
    Object.keys(result.manifest.rows[0]),
    ['key', 'sourceScope', 'sourceFile', 'state', 'source_en_hash12']
  );
  assert.equal(result.manifest.rows[0].key, 'pages.normal.body');
  assert.equal(result.manifest.rows[0].sourceScope, 'pages.normal');
  assert.equal(result.manifest.rows[0].sourceFile, 'pages/normal.json');
  assert.equal(result.manifest.rows[0].state, 'missing');
});

test('CAMPAIGN SAFETY: duplicate canonical keys fail closed instead of producing ambiguous work', () => {
  const sources = fixtureSources();
  sources.push({
    rel: 'duplicate.json',
    scope: 'duplicate',
    htmlContextMap: {},
    raw: {
      _meta: { scope: 'duplicate' },
      'common.alpha': {
        strings: { en: { text: 'Duplicate canonical key' } },
      },
    },
  });

  assert.throws(
    () => collectCampaignCandidatesFromSources(sources, 'fr'),
    /duplicate canonical key/
  );
});

// [VXG RealForever]
