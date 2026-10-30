'use strict';

/**
 * BUILD-ARC-BUNDLES — tests/26-build-arc-bundles.test.js
 *
 * Tests for lib/build-arc-bundles.js — the od-001/td-006 arc-chunked
 * bundling pilot. Verifies the mechanism generalizes (any arc that opts in
 * gets bundled the same way) while confirming today's real scope is exactly
 * one arc, per the "scoped pilot, not a full migration" decision.
 *
 * Test order:
 *   1. arcChunkedArcs — filters arcs by bundlingStrategy
 *   2. memberSlugs — dedupes and flattens an arc's section slugs
 *   3. scopesForSlugs — unions scopes, always includes 'common'
 *   4. mergeScopeBundlesForLang — merges real compiled scope bundles
 *   5. Integration — the real repo's pilot arc bundles are internally consistent
 */

const { test } = require('node:test');
const assert    = require('node:assert/strict');
const fs        = require('fs');
const path      = require('path');

const {
  arcChunkedArcs,
  memberSlugs,
  scopesForSlugs,
  mergeScopeBundlesForLang,
} = require('../lib/build-arc-bundles');

const ROOT       = path.join(__dirname, '..');
const SCOPES_DIR = path.join(ROOT, 'data', 'strings', 'compiled', 'scopes');

// ── 1. arcChunkedArcs ─────────────────────────────────────────────────────────

test('BUILD-ARC-BUNDLES: arcChunkedArcs finds only arcs declaring bundlingStrategy', () => {
  const arcsDef = {
    a: { bundlingStrategy: 'arc-chunked' },
    b: {},
    c: { bundlingStrategy: 'arc-chunked' },
    _meta: { bundlingStrategy: 'arc-chunked' }, // must be excluded — not a real arc
  };
  assert.deepEqual(arcChunkedArcs(arcsDef), ['a', 'c']);
});

test('BUILD-ARC-BUNDLES: arcChunkedArcs returns empty array when nothing opts in', () => {
  assert.deepEqual(arcChunkedArcs({ a: {}, b: {} }), []);
});

// ── 2. memberSlugs ────────────────────────────────────────────────────────────

test('BUILD-ARC-BUNDLES: memberSlugs flattens and dedupes across sections', () => {
  const arcDef = {
    sections: [
      { slugs: ['a', 'b'] },
      { slugs: ['b', 'c'] },
    ],
  };
  assert.deepEqual(memberSlugs(arcDef), ['a', 'b', 'c']);
});

test('BUILD-ARC-BUNDLES: memberSlugs handles no sections', () => {
  assert.deepEqual(memberSlugs({}), []);
});

// ── 3. scopesForSlugs ─────────────────────────────────────────────────────────

test('BUILD-ARC-BUNDLES: scopesForSlugs defaults to pages.{slug} and always includes common', () => {
  const scopes = scopesForSlugs(['foo', 'bar'], {});
  assert.deepEqual(scopes.sort(), ['bar', 'common', 'foo'].map(s => s === 'bar' || s === 'foo' ? `pages.${s}` : s).sort());
});

test('BUILD-ARC-BUNDLES: scopesForSlugs honors a viewmodels.json scope override', () => {
  const scopes = scopesForSlugs(['foo'], { foo: { scopes: ['custom-scope'] } });
  assert.deepEqual(scopes.sort(), ['common', 'custom-scope']);
});

test('BUILD-ARC-BUNDLES: scopesForSlugs dedupes shared scopes across slugs', () => {
  const scopes = scopesForSlugs(['a', 'b'], { a: { scopes: ['shared'] }, b: { scopes: ['shared'] } });
  assert.deepEqual(scopes.sort(), ['common', 'shared']);
});

// ── 4. mergeScopeBundlesForLang ───────────────────────────────────────────────

test('BUILD-ARC-BUNDLES: mergeScopeBundlesForLang merges the real common + dossier scope bundles', () => {
  const merged = mergeScopeBundlesForLang(
    ['common', 'pages.victor-methodology-presentation'],
    'production',
    'zh',
    SCOPES_DIR,
  );
  assert.ok(Object.keys(merged).length > 0, 'expected at least the dossier zh keys to merge in');
  assert.ok('pages.victor-methodology-presentation.header.eyebrow' in merged);
});

test('BUILD-ARC-BUNDLES: mergeScopeBundlesForLang skips a scope with no bundle for that language silently', () => {
  const merged = mergeScopeBundlesForLang(['pages.victor-methodology-presentation'], 'production', 'xx', SCOPES_DIR);
  assert.deepEqual(merged, {});
});

// ── 5. Integration ───────────────────────────────────────────────────────────

test('BUILD-ARC-BUNDLES integration: the real pilot arc bundle is internally consistent', () => {
  const indexPath = path.join(ROOT, 'data', 'strings', 'compiled', 'arcs', 'index.json');
  if (!fs.existsSync(indexPath)) return; // no arc has opted in yet
  const arcsIndex = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
  for (const [arcId, entry] of Object.entries(arcsIndex)) {
    for (const [lang, keyCount] of Object.entries(entry.langs)) {
      const bundlePath = path.join(ROOT, 'data', 'strings', 'compiled', 'arcs', `${arcId}.${lang}.json`);
      assert.ok(fs.existsSync(bundlePath), `expected bundle file for ${arcId}.${lang}`);
      const bundle = JSON.parse(fs.readFileSync(bundlePath, 'utf8'));
      assert.equal(Object.keys(bundle).length, keyCount, `${arcId}.${lang} key count must match its index.json entry`);
    }
  }
});

// [VXG RealForever]
