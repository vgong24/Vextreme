'use strict';

/**
 * VIEWMODEL — tests/07-viewmodel.test.js
 *
 * Tests for buildViewmodel() and the viewmodels.json override system.
 *
 * Test order:
 *   1. buildViewmodel defaults — slug with no override uses production defaults
 *   2. buildViewmodel overrides — viewmodels.json entries fully override defaults
 *   3. buildViewmodel partial override — only specified fields are overridden
 *   4. buildSlugMap viewmodel field — every slug in slugMap has a viewmodel
 *   5. viewmodels.json integrity — all slug overrides are well-formed
 */

const { test } = require('node:test');
const assert   = require('node:assert/strict');
const fs       = require('fs');
const path     = require('path');

const { buildViewmodel, buildSlugMap } = require('../lib/build-index');
const { DEFAULT_CATEGORY, Feature }    = require('../lib/vex-config');

const ROOT       = path.join(__dirname, '..');
const NODES_IN   = path.join(ROOT, 'data', 'nodes.json');
const ARCS_IN    = path.join(ROOT, 'data', 'arcs-v2.json');
const VMS_IN     = path.join(ROOT, 'data', 'viewmodels.json');

// ── 1. buildViewmodel defaults ────────────────────────────────────────────────

test('VIEWMODEL: slug with no override returns production defaults', () => {
  const vm = buildViewmodel('some-content-slug', {});
  assert.equal(vm.category, DEFAULT_CATEGORY, 'category defaults to production');
  assert.equal(vm.template, 'page',           'template defaults to page');
  assert.deepEqual(vm.scopes, ['pages.some-content-slug'], 'scope defaults to pages.{slug}');
  assert.ok(vm.features.includes(Feature.LANG),       'defaults include lang feature');
  assert.ok(vm.features.includes(Feature.SPIRAL_FAB), 'defaults include spiral-fab feature');
  assert.ok(vm.features.includes(Feature.THEME),      'defaults include theme feature (Session 025 FAB unification)');
  assert.ok(vm.features.includes(Feature.MAP),        'defaults include map feature (Session 025 FAB unification)');
  assert.equal(vm.features.length, 4, 'exactly four default features');
});

test('VIEWMODEL: null/undefined viewmodels map treated as empty', () => {
  const vmNull      = buildViewmodel('any-slug', null);
  const vmUndefined = buildViewmodel('any-slug', undefined);
  assert.equal(vmNull.category,      DEFAULT_CATEGORY);
  assert.equal(vmUndefined.category, DEFAULT_CATEGORY);
});

// ── 2. buildViewmodel overrides ───────────────────────────────────────────────

test('VIEWMODEL: override fully replaces all fields', () => {
  const overrides = {
    'vextreme-demo': {
      category: 'demo',
      template: 'page',
      scopes:   ['demo'],
      features: ['lang', 'demo', 'spiral-fab'],
    }
  };
  const vm = buildViewmodel('vextreme-demo', overrides);
  assert.equal(vm.category, 'demo');
  assert.equal(vm.template, 'page');
  assert.deepEqual(vm.scopes,   ['demo']);
  assert.deepEqual(vm.features, ['lang', 'demo', 'spiral-fab']);
});

test('VIEWMODEL: specimens-dashboard template override', () => {
  const overrides = {
    'specimens': {
      category: 'demo',
      template: 'specimens-dashboard',
      scopes:   ['specimens'],
      features: ['lang', 'demo', 'spiral-fab'],
    }
  };
  const vm = buildViewmodel('specimens', overrides);
  assert.equal(vm.template, 'specimens-dashboard');
  assert.deepEqual(vm.scopes, ['specimens']);
});

// ── 3. buildViewmodel partial override ───────────────────────────────────────

test('VIEWMODEL: partial override — only category specified', () => {
  const vm = buildViewmodel('my-slug', { 'my-slug': { category: 'staging' } });
  assert.equal(vm.category, 'staging', 'overridden category');
  assert.equal(vm.template, 'page',    'template still defaults');
  assert.deepEqual(vm.scopes, ['pages.my-slug'], 'scope still defaults');
  assert.ok(vm.features.includes(Feature.LANG), 'features still default');
});

test('VIEWMODEL: partial override — only scopes specified', () => {
  const vm = buildViewmodel('my-slug', { 'my-slug': { scopes: ['common', 'pages.my-slug'] } });
  assert.equal(vm.category,  DEFAULT_CATEGORY);
  assert.deepEqual(vm.scopes, ['common', 'pages.my-slug']);
  assert.equal(vm.template,  'page');
});

// ── 4. buildSlugMap viewmodel field ──────────────────────────────────────────

test('VIEWMODEL: buildSlugMap attaches viewmodel to every slug entry', () => {
  const nodes   = JSON.parse(fs.readFileSync(NODES_IN, 'utf8'));
  const arcsDef = JSON.parse(fs.readFileSync(ARCS_IN,  'utf8'));
  const slugMap = buildSlugMap(nodes, arcsDef, {});

  for (const [slug, entry] of Object.entries(slugMap)) {
    assert.ok(entry.viewmodel,                     `${slug}: missing viewmodel field`);
    assert.ok(entry.viewmodel.category,            `${slug}: viewmodel.category missing`);
    assert.ok(entry.viewmodel.template,            `${slug}: viewmodel.template missing`);
    assert.ok(Array.isArray(entry.viewmodel.scopes),   `${slug}: viewmodel.scopes must be array`);
    assert.ok(Array.isArray(entry.viewmodel.features), `${slug}: viewmodel.features must be array`);
  }
});

test('VIEWMODEL: buildSlugMap — content nodes default to production/page', () => {
  const nodes   = JSON.parse(fs.readFileSync(NODES_IN, 'utf8'));
  const arcsDef = JSON.parse(fs.readFileSync(ARCS_IN,  'utf8'));
  const slugMap = buildSlugMap(nodes, arcsDef, {});

  for (const [slug, entry] of Object.entries(slugMap)) {
    assert.equal(entry.viewmodel.category, DEFAULT_CATEGORY, `${slug}: expected production`);
    assert.equal(entry.viewmodel.template, 'page',           `${slug}: expected page template`);
    assert.deepEqual(entry.viewmodel.scopes, [`pages.${slug}`], `${slug}: expected default scope`);
  }
});

test('VIEWMODEL: buildSlugMap with real viewmodels.json applies overrides', () => {
  if (!fs.existsSync(VMS_IN)) return; // optional file — skip if absent
  const nodes      = JSON.parse(fs.readFileSync(NODES_IN, 'utf8'));
  const arcsDef    = JSON.parse(fs.readFileSync(ARCS_IN,  'utf8'));
  const viewmodels = JSON.parse(fs.readFileSync(VMS_IN,   'utf8'));

  const slugMap = buildSlugMap(nodes, arcsDef, viewmodels);

  // Content nodes should still use their defaults (overrides are for demo slugs not in nodes.json)
  for (const [slug, entry] of Object.entries(slugMap)) {
    if (viewmodels[slug]) {
      assert.equal(entry.viewmodel.category, viewmodels[slug].category,
        `${slug}: override category not applied`);
    } else {
      assert.equal(entry.viewmodel.category, DEFAULT_CATEGORY,
        `${slug}: non-overridden slug should use default category`);
    }
  }
});

// ── 5. viewmodels.json integrity ──────────────────────────────────────────────

test('VIEWMODEL: viewmodels.json entries have valid shape', () => {
  if (!fs.existsSync(VMS_IN)) return;
  const vms = JSON.parse(fs.readFileSync(VMS_IN, 'utf8'));

  for (const [slug, vm] of Object.entries(vms)) {
    if (slug.startsWith('_')) continue; // skip comment keys
    assert.ok(vm.category,            `viewmodels.json[${slug}]: missing category`);
    assert.ok(vm.template,            `viewmodels.json[${slug}]: missing template`);
    assert.ok(Array.isArray(vm.scopes),   `viewmodels.json[${slug}]: scopes must be array`);
    assert.ok(Array.isArray(vm.features), `viewmodels.json[${slug}]: features must be array`);
    assert.ok(vm.scopes.length > 0,   `viewmodels.json[${slug}]: scopes must not be empty`);
    assert.ok(vm.features.length > 0, `viewmodels.json[${slug}]: features must not be empty`);
  }
});

// [VXG RealForever]
