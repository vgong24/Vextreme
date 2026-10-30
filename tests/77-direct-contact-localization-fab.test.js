// [VXG RealForever]
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { LANGUAGE_TIERS } = require('../lib/translation-program');
const {
  buildPageLanguageCoverage,
  declaredShellStringScopes,
  extendPageLanguageMapWithShellPages,
} = require('../lib/build-index');
const groupHomes = require('../tools/vex-content-forge/project_group_homes');

const ROOT = path.join(__dirname, '..');
const GLOBAL_CORE = ['en', ...LANGUAGE_TIERS['global-core']];
const sorted = values => [...values].sort();

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

function readJson(rel) {
  return JSON.parse(read(rel));
}

test('DIRECT CONTACT LOCALIZATION: shell pages derive locale availability from canonical scope identity instead of page-owned language lists', () => {
  const scopeIndex = readJson('data/strings/compiled/scopes/index.json');
  const index = readJson('data/index.json');
  const cases = [
    ['terrain-map', 'terrain'],
    ['direct-contact', 'pages.direct-contact'],
    ['restoration-protocol', 'pages.restoration-protocol'],
  ];

  for (const [slug, scope] of cases) {
    const html = read('pages/' + slug + '.html');
    assert.deepEqual(declaredShellStringScopes(html), [scope], slug + ': shell scope declaration drifted');
    assert.match(html, /<script src="\.\.\/lib\/shell\.js(?:\?v=[^"]+)?"><\/script>/, slug + ': shared shell bootstrap missing');
    assert.doesNotMatch(html, /window\.VEX_SUPPORTED_LANGS\s*=/, slug + ': shell page must not own its supported-language list');
    assert.ok(index.pageLanguageMap && index.pageLanguageMap[slug], slug + ': canonical pageLanguageMap projection missing');
    assert.deepEqual(sorted(index.pageLanguageMap[slug].completeLangs), sorted(GLOBAL_CORE), slug + ': canonical complete-language projection drifted');
    assert.deepEqual(sorted(buildPageLanguageCoverage([scope], scopeIndex).completeLangs), sorted(GLOBAL_CORE), slug + ': scope-index completeness drifted');
  }
});

test('DIRECT CONTACT LOCALIZATION: shell-page extension preserves existing map entries and discovers excluded entry surfaces without a second registry', () => {
  const scopeIndex = readJson('data/strings/compiled/scopes/index.json');
  const existing = { known: { availableLangs: ['en'], completeLangs: ['en'] } };
  const htmlBySlug = {
    known: '<script>window.VEX_STRING_SCOPES = ["pages.known"];</script><script src="../lib/shell.js"></script>',
    shell: '<script>window.VEX_STRING_SCOPES = ["pages.receive-god"];</script><script src="../lib/shell.js"></script>',
    plain: '<script>window.VEX_STRING_SCOPES = ["pages.receive-god"];</script>',
  };
  const projected = extendPageLanguageMapWithShellPages(existing, Object.keys(htmlBySlug), scopeIndex, slug => htmlBySlug[slug]);
  assert.deepEqual(projected.known, existing.known, 'existing canonical map entries must remain authoritative');
  assert.ok(projected.shell, 'shell surface with canonical scope declaration must be projected');
  assert.equal(projected.plain, undefined, 'scope declaration without shared shell runtime must not create a shell-page projection');

  const index = readJson('data/index.json');
  for (const slug of ['receive-god', 'take-a-walk']) {
    assert.ok(index.pageLanguageMap[slug], slug + ': excluded Terrain entry surface must now be discoverable through canonical pageLanguageMap');
    assert.deepEqual(sorted(index.pageLanguageMap[slug].completeLangs), sorted(GLOBAL_CORE), slug + ': entry-page complete language coverage drifted');
  }
});

test('DIRECT CONTACT LOCALIZATION: source-managed Direct Contact projector uses canonical index fallback and never reintroduces a page-owned locale list', () => {
  const projected = groupHomes.projectFormation(ROOT, { write:false });
  const direct = projected.find(item => item.member.slug === 'direct-contact');
  assert.ok(direct, 'Direct Contact projection missing');
  assert.match(direct.page, /window\.VEX_STRING_SCOPES = \["pages\.direct-contact"\];/);
  assert.match(direct.page, /window\.VEX_STRING_CATEGORY = "production";/);
  assert.doesNotMatch(direct.page, /window\.VEX_SUPPORTED_LANGS\s*=/);
  assert.match(direct.page, /<script src="\.\.\/lib\/shell\.js"><\/script>/);
});
