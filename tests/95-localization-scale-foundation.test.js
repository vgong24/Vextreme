#!/usr/bin/env node
'use strict';

const assert = require('assert');
const test = require('node:test');

const exporter = require('../lib/strings-export');
const importer = require('../lib/strings-import');
const screenshots = require('../scripts/screenshot-localization');

test('LOCALIZATION-SCALE: explicit new target locale exports even when source has no target entry', () => {
  const raw = {
    _meta: { description: 'Pilot strings.' },
    'pages.pilot.qa.01.question': { strings: { en: { text: '"Why?"' } } },
    'pages.pilot.qa.01.answer': { strings: { en: { text: 'Because.' } } },
  };
  assert.deepEqual(exporter.targetLanguages(raw, 'fr'), ['fr']);
  const csv = exporter.renderScopeCsv(raw, 'fr');
  assert.match(csv, /source_en_hash/);
  assert.match(csv, /fr_text/);
  assert.match(csv, /Paired question: ""Why\?""/);
  assert.equal(csv.includes(',ja_text,'), false);
});

test('LOCALIZATION-SCALE: EN hash binds text plus aria-label', () => {
  const a = exporter.contentHash({ text: 'Open', 'aria-label': 'Open menu' });
  const b = exporter.contentHash({ text: 'Open', 'aria-label': 'Open navigation' });
  assert.notEqual(a, b);
  assert.match(a, /^[0-9a-f]{12}$/);
});

test('LOCALIZATION-SCALE: import accepts exact EN preimage and rejects stale return', () => {
  const key = 'common.nav.open';
  const en = { text: 'Open', 'aria-label': 'Open menu' };
  const source = {
    [key]: { value: { strings: { en } }, file: '/tmp/common.json' },
  };
  const hash = importer.contentHash(en);
  const csv = [
    'key,source_en_hash,context,en_text,en_aria_label,fr_text,fr_aria_label,notes',
    `${key},${hash},nav,Open,Open menu,Ouvrir,Ouvrir le menu,`,
  ].join('\n');

  const operations = importer.planCsvImport({ csvFile: 'common.fr.csv', csvText: csv, source });
  assert.equal(operations.length, 1);
  assert.deepEqual(operations[0].translation, { text: 'Ouvrir', 'aria-label': 'Ouvrir le menu' });

  const staleSource = {
    [key]: { value: { strings: { en: { text: 'Open now', 'aria-label': 'Open menu' } } }, file: '/tmp/common.json' },
  };
  assert.throws(
    () => importer.planCsvImport({ csvFile: 'common.fr.csv', csvText: csv, source: staleSource }),
    /stale translation row/
  );
});

test('LOCALIZATION-SCALE: import rejects duplicate translated locale/key rows', () => {
  const key = 'common.nav.open';
  const en = { text: 'Open' };
  const hash = importer.contentHash(en);
  const source = { [key]: { value: { strings: { en } }, file: '/tmp/common.json' } };
  const csv = [
    'key,source_en_hash,context,en_text,en_aria_label,fr_text,fr_aria_label,notes',
    `${key},${hash},nav,Open,,Ouvrir,,,`,
    `${key},${hash},nav,Open,,Ouvrir encore,,,`,
  ].join('\n');
  assert.throws(
    () => importer.planCsvImport({ csvFile: 'common.fr.csv', csvText: csv, source }),
    /duplicate translated key/
  );
});


test('LOCALIZATION-SCALE: CSV parser preserves quoted multi-line translator fields', () => {
  const parsed = importer.parseCSV(
    'key,source_en_hash,fr_text,fr_aria_label\n' +
    'k,aaaaaaaaaaaa,"ligne 1\nligne 2","ouvrir, menu"\n'
  );
  assert.equal(parsed.rows.length, 1);
  assert.equal(parsed.rows[0].fr_text, 'ligne 1\nligne 2');
  assert.equal(parsed.rows[0].fr_aria_label, 'ouvrir, menu');
});

test('LOCALIZATION-SCALE: derived nearby structural label can carry explicit speaker context', () => {
  const raw = {
    'pages.test.body.div024.div001.text001': { strings: { en: { text: 'Vex Speaks' } } },
    'pages.test.body.div024.div002.p001.text001': { strings: { en: { text: 'I remember.' } } },
  };
  const label = exporter.nearbyStructuralLabel(raw, 'pages.test.body.div024.div002.p001.text001');
  assert.equal(label.text, 'Vex Speaks');
  assert.match(
    exporter.buildContext({}, 'pages.test.body.div024.div002.p001.text001',
      raw['pages.test.body.div024.div002.p001.text001'], raw),
    /Vex Speaks/
  );
});

test('LOCALIZATION-SCALE: screenshot plan emits only live, complete, non-stale page-locale cells', () => {
  const indexJson = {
    supportedLangs: ['en', 'ja', 'fr'],
    slugMap: {
      alpha: { viewmodel: { scopes: ['pages.alpha'], features: ['lang'] } },
      beta: { viewmodel: { scopes: ['pages.beta'], features: ['lang'] } },
      gamma: { viewmodel: { scopes: ['pages.gamma'], features: [] } },
    },
  };
  const scopeIndex = {
    common: { path: 'system/common', en: 2, ja: 2, fr: 2 },
    'pages.alpha': { path: 'production/pages/alpha', en: 3, ja: 2, fr: 3 },
    'pages.beta': { path: 'production/pages/beta', en: 1, ja: 1, fr: 1 },
    'pages.gamma': { path: 'production/pages/gamma', en: 1, ja: 1, fr: 1 },
  };
  const stale = new Set(['pages.beta/fr']);
  const plan = screenshots.buildCapturePlan({
    indexJson,
    viewmodels: {},
    scopeIndex,
    requestedLangs: ['ja', 'fr', 'de'],
    requestedSlug: null,
    staleProbe: (scope, locale) => stale.has(`${scope}/${locale}`),
  });

  assert.deepEqual(plan.cells, [
    { slug: 'alpha', locale: 'fr', requiredScopes: ['common', 'pages.alpha'] },
    { slug: 'beta', locale: 'ja', requiredScopes: ['common', 'pages.beta'] },
  ]);
  assert.ok(plan.skipped.some(x => x.slug === 'alpha' && x.locale === 'ja' && x.reason === 'coverage-incomplete'));
  assert.ok(plan.skipped.some(x => x.slug === 'beta' && x.locale === 'fr' && x.stale.includes('pages.beta')));
  assert.ok(plan.skipped.some(x => x.locale === 'de' && x.reason === 'locale-not-live-in-index'));
  assert.ok(plan.skipped.some(x => x.slug === 'gamma' && x.reason === 'lang-feature-not-active'));
});
