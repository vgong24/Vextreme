'use strict';

/**
 * BUILD-VEXTREME — tests/08-build-vextreme.test.js
 *
 * Tests for the God Script assembler (lib/build-vextreme.js) and the
 * key alignment check (lib/check-key-alignment.js).
 *
 * Test order:
 *   1. readScopeBundle — reads compiled EN scope files
 *   2. mergeScopes — merges multiple scopes into one flat map
 *   3. assembleGodScript — produces valid God Script string
 *   4. resolveAllSlugs — union of slugMap + viewmodels.json overrides
 *   5. checkKeyAlignment — confirms nodes/arcs are in sync with index.json
 */

const { test } = require('node:test');
const assert   = require('node:assert/strict');
const fs       = require('fs');
const path     = require('path');

const { resolveAllSlugs, readScopeBundle, mergeScopes, assembleGodScript } = require('../lib/build-vextreme');
const { checkKeyAlignment } = require('../lib/check-key-alignment');

const ROOT     = path.join(__dirname, '..');
const INDEX_IN = path.join(ROOT, 'data', 'index.json');
const VMS_IN   = path.join(ROOT, 'data', 'viewmodels.json');

const DEMO_VIEWMODEL = {
  category: 'demo',
  template: 'specimen-page',
  scopes:   ['pages.specimen-full-translation', 'specimens'],
  features: ['lang', 'demo'],
};

// ── 1. readScopeBundle ────────────────────────────────────────────────────────

test('ASSEMBLER: readScopeBundle returns object for existing scope', () => {
  const data = readScopeBundle('specimens', 'demo', 'en');
  assert.ok(data !== null, 'specimens.en.json should exist');
  assert.equal(typeof data, 'object');
  assert.ok(Object.keys(data).length > 0, 'should have at least one key');
});

test('ASSEMBLER: readScopeBundle returns null for missing scope', () => {
  const data = readScopeBundle('pages.nonexistent-page', 'demo', 'en');
  assert.equal(data, null, 'should return null for missing scope');
});

test('ASSEMBLER: readScopeBundle reads common scope from system category', () => {
  const data = readScopeBundle('common', 'system', 'en');
  assert.ok(data !== null, 'common.en.json should exist in system/');
  assert.ok(Object.keys(data).length > 0);
});

// ── 2. mergeScopes ───────────────────────────────────────────────────────────

test('ASSEMBLER: mergeScopes returns merged object from multiple scopes', () => {
  const merged = mergeScopes(['pages.specimen-full-translation', 'specimens'], 'demo', 'en');
  assert.equal(typeof merged, 'object');
  assert.ok(Object.keys(merged).length > 0, 'merged should have keys');
});

test('ASSEMBLER: mergeScopes automatically includes common scope', () => {
  const merged = mergeScopes(['specimens'], 'demo', 'en');
  const hasCommonKey = Object.keys(merged).some(k => k.startsWith('common.'));
  assert.ok(hasCommonKey, 'should include common scope keys');
});

test('ASSEMBLER: mergeScopes handles missing scope gracefully (no throw)', () => {
  assert.doesNotThrow(() => {
    mergeScopes(['pages.totally-does-not-exist', 'specimens'], 'demo', 'en');
  });
});

// ── 3. assembleGodScript ─────────────────────────────────────────────────────

test('ASSEMBLER: assembleGodScript returns a non-empty string', () => {
  const script = assembleGodScript('test-slug', DEMO_VIEWMODEL, { includeSourceComment: false });
  assert.equal(typeof script, 'string');
  assert.ok(script.length > 0);
});

test('ASSEMBLER: output contains VEX_VIEWMODEL assignment', () => {
  const script = assembleGodScript('test-slug', DEMO_VIEWMODEL, { includeSourceComment: false });
  assert.ok(script.includes('window.VEX_VIEWMODEL'), 'must set VEX_VIEWMODEL global');
  assert.ok(script.includes('"demo"'), 'category must appear in viewmodel JSON');
});

test('ASSEMBLER: output contains VEX_STRINGS_EN assignment', () => {
  const script = assembleGodScript('test-slug', DEMO_VIEWMODEL, { includeSourceComment: false });
  assert.ok(script.includes('window.VEX_STRINGS_EN'), 'must set VEX_STRINGS_EN global');
});

test('ASSEMBLER: output contains VEX_STRING_SCOPES and VEX_STRING_CATEGORY', () => {
  const script = assembleGodScript('test-slug', DEMO_VIEWMODEL, { includeSourceComment: false });
  assert.ok(script.includes('window.VEX_STRING_SCOPES'),   'must set VEX_STRING_SCOPES');
  assert.ok(script.includes('window.VEX_STRING_CATEGORY'), 'must set VEX_STRING_CATEGORY');
});

test('ASSEMBLER: output is wrapped in an IIFE', () => {
  const script = assembleGodScript('test-slug', DEMO_VIEWMODEL, { includeSourceComment: false });
  assert.ok(script.includes('(function ()'), 'must be wrapped in an IIFE');
  assert.ok(script.includes('}());'), 'IIFE must be closed');
});

test('ASSEMBLER: output includes feature modules when widgets exist', () => {
  const script = assembleGodScript('test-slug', DEMO_VIEWMODEL, { includeSourceComment: false });
  assert.ok(script.includes('feature: lang') || script.includes('fab-lang.js'),
    'should include lang feature content or label');
});

test('ASSEMBLER: source comment header includes slug', () => {
  const script = assembleGodScript('my-slug', DEMO_VIEWMODEL);
  assert.ok(script.includes('my-slug'), 'header comment must reference the slug');
  assert.ok(script.includes('DO NOT EDIT'), 'must include regeneration notice');
});

test('ASSEMBLER: handles empty features array without throwing', () => {
  const vm = { category: 'demo', template: 'page', scopes: ['specimens'], features: [] };
  assert.doesNotThrow(() => assembleGodScript('test', vm, { includeSourceComment: false }));
});

// ── 4. resolveAllSlugs ───────────────────────────────────────────────────────

test('ASSEMBLER: resolveAllSlugs returns array with at least slugMap entries', () => {
  const index = JSON.parse(fs.readFileSync(INDEX_IN, 'utf8'));
  const vms   = JSON.parse(fs.readFileSync(VMS_IN,   'utf8'));
  const result = resolveAllSlugs(index, vms);
  assert.ok(Array.isArray(result), 'must return array');
  assert.ok(result.length >= Object.keys(index.slugMap).length, 'must include all slugMap entries');
});

test('ASSEMBLER: resolveAllSlugs includes demo overrides not in slugMap', () => {
  const index = JSON.parse(fs.readFileSync(INDEX_IN, 'utf8'));
  const vms   = JSON.parse(fs.readFileSync(VMS_IN,   'utf8'));
  const result = resolveAllSlugs(index, vms);
  const slugs  = new Set(result.map(r => r.slug));

  for (const [slug] of Object.entries(vms)) {
    if (slug.startsWith('_')) continue;
    assert.ok(slugs.has(slug), `viewmodels.json slug "${slug}" must appear in resolved list`);
  }
});

test('ASSEMBLER: resolveAllSlugs has no duplicate slugs', () => {
  const index = JSON.parse(fs.readFileSync(INDEX_IN, 'utf8'));
  const vms   = JSON.parse(fs.readFileSync(VMS_IN,   'utf8'));
  const result = resolveAllSlugs(index, vms);
  const slugs  = result.map(r => r.slug);
  const unique = new Set(slugs);
  assert.equal(slugs.length, unique.size, 'no duplicate slugs in resolved list');
});

test('ASSEMBLER: every resolved entry has a viewmodel', () => {
  const index = JSON.parse(fs.readFileSync(INDEX_IN, 'utf8'));
  const vms   = JSON.parse(fs.readFileSync(VMS_IN,   'utf8'));
  const result = resolveAllSlugs(index, vms);
  for (const { slug, viewmodel } of result) {
    assert.ok(viewmodel, `slug "${slug}" must have a viewmodel`);
  }
});

// ── 5. checkKeyAlignment ─────────────────────────────────────────────────────

test('KEY-ALIGNMENT: returns nodes and arcs report', () => {
  const report = checkKeyAlignment();
  assert.ok(report.nodes, 'report must have nodes');
  assert.ok(report.arcs,  'report must have arcs');
  assert.equal(typeof report.nodes.total,   'number');
  assert.equal(typeof report.nodes.inIndex, 'number');
  assert.ok(Array.isArray(report.nodes.missingFromIndex));
  assert.ok(Array.isArray(report.nodes.extraInIndex));
});

test('KEY-ALIGNMENT: all nodes.json slugs appear in index.json', () => {
  const report = checkKeyAlignment();
  assert.deepEqual(report.nodes.missingFromIndex, [],
    `Slugs in nodes.json missing from index.json: ${report.nodes.missingFromIndex.join(', ')}`);
});

test('KEY-ALIGNMENT: no extra slugs in index.json beyond nodes.json', () => {
  const report = checkKeyAlignment();
  assert.deepEqual(report.nodes.extraInIndex, [],
    `Extra slugs in index.json not in nodes.json: ${report.nodes.extraInIndex.join(', ')}`);
});

test('KEY-ALIGNMENT: all arcs-v2.json keys appear in index.json', () => {
  const report = checkKeyAlignment();
  assert.deepEqual(report.arcs.missingFromIndex, [],
    `Arc IDs missing from index.json: ${report.arcs.missingFromIndex.join(', ')}`);
});

// [VXG RealForever]
