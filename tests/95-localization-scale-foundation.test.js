#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const test = require('node:test');
const path = require('path');
const os = require('os');
const { execFileSync } = require('child_process');

const exporter = require('../lib/strings-export');
const importer = require('../lib/strings-import');
const screenshots = require('../scripts/screenshot-localization');
const { buildSupportedLangs } = require('../lib/build-index');

test('LOCALIZATION-SCALE: explicit new target locale exports even when source has no target entry', () => {
  const raw = {
    _meta: { description: 'Pilot strings.' },
    'pages.pilot.qa.01.question': { strings: { en: { text: '"Why?"' } } },
    'pages.pilot.qa.01.answer': { strings: { en: { text: 'Because.' } } },
  };
  assert.deepEqual(exporter.targetLanguages(raw, 'fr'), ['fr']);
  const csv = exporter.renderScopeCsv(raw, 'fr');
  assert.match(csv, /source_en_hash/);
  assert.match(csv, /source_context_hash/);
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
  const raw = { [key]: { strings: { en } } };
  const source = {
    [key]: { value: raw[key], file: '/tmp/common.json', raw },
  };
  const hash = importer.contentHash(en);
  const context = exporter.buildContext({}, key, raw[key], raw);
  const ctxHash = exporter.contextHash(context);
  const csv = [
    'key,source_en_hash,source_context_hash,context,en_text,en_aria_label,fr_text,fr_aria_label,notes',
    `${key},${hash},${ctxHash},${context},Open,Open menu,Ouvrir,Ouvrir le menu,`,
  ].join('\n');

  const operations = importer.planCsvImport({ csvFile: 'common.fr.csv', csvText: csv, source });
  assert.equal(operations.length, 1);
  assert.deepEqual(operations[0].translation, { text: 'Ouvrir', 'aria-label': 'Ouvrir le menu' });

  const staleSource = {
    [key]: {
      value: { strings: { en: { text: 'Open now', 'aria-label': 'Open menu' } } },
      file: '/tmp/common.json',
      raw,
    },
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
  const raw = { [key]: { strings: { en } } };
  const source = { [key]: { value: raw[key], file: '/tmp/common.json', raw } };
  const context = exporter.buildContext({}, key, raw[key], raw);
  const ctxHash = exporter.contextHash(context);
  const csv = [
    'key,source_en_hash,source_context_hash,context,en_text,en_aria_label,fr_text,fr_aria_label,notes',
    `${key},${hash},${ctxHash},${context},Open,,Ouvrir,,,`,
    `${key},${hash},${ctxHash},${context},Open,,Ouvrir encore,,,`,
  ].join('\n');
  assert.throws(
    () => importer.planCsvImport({ csvFile: 'common.fr.csv', csvText: csv, source }),
    /duplicate translated key/
  );
});


test('LOCALIZATION-SCALE: CSV parser preserves quoted multi-line translator fields', () => {
  const parsed = importer.parseCSV(
    'key,source_en_hash,source_context_hash,fr_text,fr_aria_label\n' +
    'k,aaaaaaaaaaaa,bbbbbbbbbbbb,"ligne 1\nligne 2","ouvrir, menu"\n'
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

test('LOCALIZATION-SCALE: import rejects return when translation context changed but EN did not', () => {
  const key = 'pages.test.qa.01.answer';
  const raw = {
    _meta: { description: 'Test Q/A.' },
    'pages.test.qa.01.question': { strings: { en: { text: 'Old question?' } } },
    [key]: { strings: { en: { text: 'Same answer.' } } },
  };
  const source = { [key]: { value: raw[key], file: '/tmp/test.json', raw } };
  const enHash = exporter.contentHash(raw[key].strings.en);
  const oldContext = exporter.buildContext(raw._meta, key, raw[key], raw);
  const oldContextHash = exporter.contextHash(oldContext);
  const csv = [
    'key,source_en_hash,source_context_hash,context,en_text,en_aria_label,fr_text,fr_aria_label,notes',
    `${key},${enHash},${oldContextHash},${JSON.stringify(oldContext)},Same answer.,,Même réponse.,,`,
  ].join('\n');
  raw['pages.test.qa.01.question'].strings.en.text = 'New question?';
  assert.throws(
    () => importer.planCsvImport({ csvFile: 'test.fr.csv', csvText: csv, source }),
    /stale translation context/
  );
});

test('LOCALIZATION-SCALE: compiled locale stays hidden until runtime Language release', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'vextreme-supported-langs-'));
  try {
    fs.writeFileSync(path.join(dir, 'strings.en.json'), '{}');
    fs.writeFileSync(path.join(dir, 'strings.ja.json'), '{}');
    fs.writeFileSync(path.join(dir, 'strings.fr.json'), '{}');
    fs.writeFileSync(path.join(dir, 'strings.pt-br.json'), '{}');

    assert.deepEqual(buildSupportedLangs(dir, ['en', 'ja']), ['en', 'ja']);
    assert.deepEqual(buildSupportedLangs(dir, ['en', 'fr']), ['en', 'fr']);
    assert.deepEqual(buildSupportedLangs(dir, ['en', 'pt-br']), ['en', 'pt-br']);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
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

test('LOCALIZATION-SCALE: Assets batch capture uses temporary local carrier files', () => {
  assert.deepEqual(
    screenshots.screenshotArgs({ slug: 'alpha', locale: 'fr' }, '/tmp/Vextreme-Assets'),
    [
      require('path').join(__dirname, '..', 'scripts', 'screenshot-page.js'),
      'alpha', 'fr', '--assets-root', '/tmp/Vextreme-Assets', '--assets-only',
    ]
  );
});

test('LOCALIZATION-SCALE: general screenshot writer remains syntactically valid', () => {
  execFileSync(process.execPath, ['--check', path.join(__dirname, '..', 'scripts', 'screenshot-page.js')], {
    stdio: 'pipe',
  });
});

test('LOCALIZATION-SCALE: Assets-bound screenshot evidence binds clean source before render', () => {
  const src = fs.readFileSync(path.join(__dirname, '..', 'scripts', 'screenshot-page.js'), 'utf8');
  const bind = src.indexOf('evidenceSourceCommit = bindCleanSourceCommitForAssets()');
  const render = src.indexOf('const { server, port } = await startServer();');
  assert.ok(bind >= 0, 'clean source binding must exist');
  assert.ok(render > bind, 'clean source binding must happen before browser/server render begins');
  assert.match(src, /git', \['status', '--porcelain', '--untracked-files=all'\]/);
  assert.match(src, /requires clean render source so sourceCommit matches rendered bytes/);
  assert.match(src, /data\/strings\/batches\//);
  assert.match(src, /line\.startsWith\('\?\? '\)/);
});
