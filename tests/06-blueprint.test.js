'use strict';

/**
 * BLUEPRINT — tests/06-blueprint.test.js
 *
 * Tests for blueprint.json + config/ directory integrity.
 *
 * Test order:
 *   1. Blueprint structure — required top-level keys
 *   2. Config file existence — all blueprint IDs have corresponding files
 *   3. Config file shape — required fields per _meta.json type definitions
 *   4. vex-config.js constant coverage — Category, Feature, AssetType align with blueprint
 *   5. validate-blueprint.js integration — no errors on full validation run
 */

const { test } = require('node:test');
const assert   = require('node:assert/strict');
const fs       = require('fs');
const path     = require('path');

const { Category, Feature, AssetType } = require('../lib/vex-config');
const { validateBlueprint }            = require('../lib/validate-blueprint');

const ROOT      = path.join(__dirname, '..');
const BLUEPRINT = JSON.parse(fs.readFileSync(path.join(ROOT, 'blueprint.json'), 'utf8'));

// ── 1. Blueprint structure ────────────────────────────────────────────────────

test('BLUEPRINT: is valid JSON with required top-level keys', () => {
  assert.ok(Array.isArray(BLUEPRINT.categories), 'categories must be an array');
  assert.ok(Array.isArray(BLUEPRINT.features),   'features must be an array');
  assert.ok(Array.isArray(BLUEPRINT.assetTypes), 'assetTypes must be an array');
  assert.ok(Array.isArray(BLUEPRINT.templates),  'templates must be an array');
  assert.ok(BLUEPRINT.languages,                 'languages must be present');
  assert.ok(BLUEPRINT.build,                     'build must be present');
  assert.ok(BLUEPRINT.performance,               'performance must be present');
});

test('BLUEPRINT: languages has inline and lazy arrays', () => {
  assert.ok(Array.isArray(BLUEPRINT.languages.inline), 'languages.inline must be an array');
  assert.ok(Array.isArray(BLUEPRINT.languages.lazy),   'languages.lazy must be an array');
  assert.ok(BLUEPRINT.languages.inline.length > 0,    'at least one inline language required');
});

test('BLUEPRINT: build.assembly has core and output', () => {
  const a = BLUEPRINT.build.assembly;
  assert.ok(Array.isArray(a.core), 'build.assembly.core must be an array');
  assert.ok(a.output,              'build.assembly.output must be present');
  assert.ok(a.output.dir,         'build.assembly.output.dir must be present');
  assert.ok(a.output.pattern,     'build.assembly.output.pattern must be present');
});

// ── 2. Config file existence ──────────────────────────────────────────────────

test('BLUEPRINT: all category IDs have config files', () => {
  for (const id of BLUEPRINT.categories) {
    const p = path.join(ROOT, 'config', 'categories', `${id}.json`);
    assert.ok(fs.existsSync(p), `Missing config/categories/${id}.json`);
  }
});

test('BLUEPRINT: all feature IDs have config files', () => {
  for (const id of BLUEPRINT.features) {
    const p = path.join(ROOT, 'config', 'features', `${id}.json`);
    assert.ok(fs.existsSync(p), `Missing config/features/${id}.json`);
  }
});

test('BLUEPRINT: all asset-type IDs have config files', () => {
  for (const id of BLUEPRINT.assetTypes) {
    const p = path.join(ROOT, 'config', 'asset-types', `${id}.json`);
    assert.ok(fs.existsSync(p), `Missing config/asset-types/${id}.json`);
  }
});

test('BLUEPRINT: all template IDs have config files', () => {
  for (const id of BLUEPRINT.templates) {
    const p = path.join(ROOT, 'config', 'templates', `${id}.json`);
    assert.ok(fs.existsSync(p), `Missing config/templates/${id}.json`);
  }
});

// ── 3. Config file shape ──────────────────────────────────────────────────────

test('BLUEPRINT: category config files have _meta.type and required fields', () => {
  const required = ['id', 'directory', 'default', 'description', 'navVisibility'];
  for (const id of BLUEPRINT.categories) {
    const data = JSON.parse(fs.readFileSync(path.join(ROOT, 'config', 'categories', `${id}.json`), 'utf8'));
    assert.equal(data._meta.type, 'category', `categories/${id}.json: _meta.type must be "category"`);
    for (const field of required) {
      assert.ok(field in data, `categories/${id}.json: missing required field "${field}"`);
    }
    assert.equal(data.id, id, `categories/${id}.json: id field must match filename`);
  }
});

test('BLUEPRINT: feature config files have _meta.type and required fields', () => {
  const required = ['id', 'label', 'icon', 'asset'];
  for (const id of BLUEPRINT.features) {
    const data = JSON.parse(fs.readFileSync(path.join(ROOT, 'config', 'features', `${id}.json`), 'utf8'));
    assert.equal(data._meta.type, 'feature', `features/${id}.json: _meta.type must be "feature"`);
    for (const field of required) {
      assert.ok(field in data, `features/${id}.json: missing required field "${field}"`);
    }
    assert.equal(data.id, id, `features/${id}.json: id field must match filename`);
  }
});

test('BLUEPRINT: asset-type config files have _meta.type and required fields', () => {
  const required = ['id', 'extension', 'loadMethod', 'directory'];
  for (const id of BLUEPRINT.assetTypes) {
    const data = JSON.parse(fs.readFileSync(path.join(ROOT, 'config', 'asset-types', `${id}.json`), 'utf8'));
    assert.equal(data._meta.type, 'asset-type', `asset-types/${id}.json: _meta.type must be "asset-type"`);
    for (const field of required) {
      assert.ok(field in data, `asset-types/${id}.json: missing required field "${field}"`);
    }
    assert.equal(data.id, id, `asset-types/${id}.json: id field must match filename`);
  }
});

// ── 4. vex-config.js constant coverage ───────────────────────────────────────

test('BLUEPRINT: Category constants cover all blueprint categories', () => {
  const values = new Set(Object.values(Category));
  for (const id of BLUEPRINT.categories) {
    assert.ok(values.has(id), `Blueprint category "${id}" has no matching Category constant in vex-config`);
  }
});

test('BLUEPRINT: Feature constants cover all blueprint features', () => {
  const values = new Set(Object.values(Feature));
  for (const id of BLUEPRINT.features) {
    assert.ok(values.has(id), `Blueprint feature "${id}" has no matching Feature constant in vex-config`);
  }
});

test('BLUEPRINT: AssetType constants cover all blueprint assetTypes', () => {
  const values = new Set(Object.values(AssetType));
  for (const id of BLUEPRINT.assetTypes) {
    assert.ok(values.has(id), `Blueprint assetType "${id}" has no matching AssetType constant in vex-config`);
  }
});

// ── 5. validate-blueprint.js integration ─────────────────────────────────────

test('BLUEPRINT: validate-blueprint.js reports no errors', () => {
  const errors = validateBlueprint();
  assert.deepEqual(errors, [],
    `Blueprint validation failed:\n${errors.map(e => '  ' + e).join('\n')}`);
});
