'use strict';

/**
 * STRINGS PIPELINE — tests/02-strings-pipeline.test.js
 *
 * Pipeline: data/strings/source/*.json → data/strings/compiled/strings.{lang}.json
 *
 * This file tests the full input-to-output contract of the localization pipeline.
 * Failures here mean users see raw string keys instead of display text, or translators
 * receive false "STALE" alerts, or the wrong language bundle gets shipped.
 *
 * Test order:
 *   1. Full pipeline integration — source → merged → bundle → manifest in one pass
 *   2. Invariants — properties that must hold regardless of string content
 *   3. Edge cases / regression guards — specific failure modes with known consequences
 *
 * The contentHash function is not tested in isolation. It is tested through buildManifest
 * (stale detection depends on hash stability and collision resistance). If buildManifest
 * produces correct output, contentHash is working. The one property tested directly is
 * hash format (12-char hex), because that format is stored in manifest.json and read by
 * strings-check.js — a format change there would be a silent schema break.
 */

const { test } = require('node:test');
const assert   = require('node:assert/strict');
const { mergeSourceFiles, buildBundles, buildManifest, contentHash } = require('../lib/strings-compile');

// ── 1. Full pipeline integration ──────────────────────────────────────────────

test('PIPELINE: given valid source files, the compiled EN bundle contains all keys with correct text, and the manifest has matching hashes', () => {
  // This verifies the whole strings pipeline in one pass.
  // If mergeSourceFiles, buildBundles, or buildManifest breaks, some part fails.
  const sources = [
    {
      _meta: { scope: 'common' },
      'common.nav.prev': { strings: { en: { text: '← prev', 'aria-label': 'Previous page' }, ja: { text: '← 前へ' } } },
      'common.nav.next': { strings: { en: { text: 'next →' }, ja: { text: '次へ →' } } }
    },
    {
      _meta: { scope: 'arc' },
      'liberation.heading.title': { strings: { en: { text: 'Liberation' }, ja: { text: '解放' } } }
    }
  ];

  const merged   = mergeSourceFiles(sources);
  const bundles  = buildBundles(merged);
  const manifest = buildManifest(merged);

  // EN bundle: all keys present with correct text
  assert.equal(bundles['en']['common.nav.prev'].text, '← prev');
  assert.equal(bundles['en']['common.nav.next'].text, 'next →');
  assert.equal(bundles['en']['liberation.heading.title'].text, 'Liberation');

  // JA bundle: keys with JA translation present; keys without JA are absent (expected gap)
  assert.ok(bundles['ja']['common.nav.prev']);
  assert.equal(bundles['ja']['liberation.heading.title'].text, '解放');

  // Manifest: stable hashes, correct lang coverage
  assert.match(manifest['common.nav.prev'].enHash, /^[0-9a-f]{12}$/);
  assert.deepEqual(manifest['common.nav.prev'].langs, ['en', 'ja']);
  assert.deepEqual(manifest['common.nav.next'].langs, ['en', 'ja']);
});

// ── 2. Invariants ─────────────────────────────────────────────────────────────

test('INVARIANT: keys from separate scope files merge into one flat bundle — the browser fetches one file, not one per scope', () => {
  const raw1 = { 'scope-a.key': { strings: { en: { text: 'A' } } } };
  const raw2 = { 'scope-b.key': { strings: { en: { text: 'B' } } } };
  const bundles = buildBundles(mergeSourceFiles([raw1, raw2]));
  assert.ok(bundles['en']['scope-a.key'] && bundles['en']['scope-b.key'],
    'keys from both scope files must appear in the single EN bundle');
});

test('INVARIANT: first definition of a duplicate key wins — a later scope file must not silently override a shared common string', () => {
  // common.json defines common.nav.prev. If a page scope file redefines it,
  // the second definition would ship wrong text to all users of that key.
  const raw1 = { 'shared.key': { strings: { en: { text: 'canonical' } } } };
  const raw2 = { 'shared.key': { strings: { en: { text: 'override attempt' } } } };
  const merged = mergeSourceFiles([raw1, raw2]);
  assert.equal(merged['shared.key'].strings.en.text, 'canonical');
});

test('INVARIANT: enHash is stable across compiles — non-deterministic hashing would mark every translation STALE on every run', () => {
  const merged = { 'k': { strings: { en: { text: 'hello' } } } };
  assert.equal(buildManifest(merged)['k'].enHash, buildManifest(merged)['k'].enHash);
});

test('INVARIANT: changing EN text produces a different enHash — this is the signal that triggers the STALE flag for translators', () => {
  // If hashes collided, a translator would never know the EN source changed.
  const mA = buildManifest({ 'k': { strings: { en: { text: 'version A' } } } });
  const mB = buildManifest({ 'k': { strings: { en: { text: 'version B' } } } });
  assert.notEqual(mA['k'].enHash, mB['k'].enHash);
});

test('INVARIANT: keys absent from a language bundle are simply missing, not null — the browser\'s getString() falls back to EN on undefined, not on null', () => {
  // getString(key) returns (bundle[key] && bundle[key].text) || key.
  // undefined correctly falls through to the fallback; null would produce null, not the fallback.
  const merged  = { 'en-only': { strings: { en: { text: 'English only' } } } };
  const bundles = buildBundles(merged);
  assert.equal(bundles['ja'], undefined, 'no JA bundle should exist when no keys have JA translations');
  // OR if a JA bundle does exist from other keys, the en-only key is absent (not null)
});

test('INVARIANT: enHash format is 12-char hex — manifest.json stores this and strings-check.js reads it; a format change would be a silent schema break', () => {
  const manifest = buildManifest({ 'k': { strings: { en: { text: 'x' } } } });
  assert.match(manifest['k'].enHash, /^[0-9a-f]{12}$/);
});

// ── 3. Edge cases / regression guards ────────────────────────────────────────

test('EDGE: _meta key is schema documentation, not a string key — including it in the bundle would ship internal comments to the browser', () => {
  const raw    = { _meta: { scope: 'common', description: 'schema' }, 'real.key': { strings: { en: { text: 'hi' } } } };
  const merged = mergeSourceFiles([raw]);
  assert.equal(merged['_meta'], undefined, '_meta must be excluded from the merged map');
});

test('EDGE: entry missing the "strings" namespace is skipped — old flat-format keys from before the restructure must not corrupt the bundle', () => {
  // Before the element object restructure, keys had { en: { text } } directly.
  // A migrated-but-not-updated source file would have this shape.
  // Silently including it would produce a malformed bundle entry that crashes getString().
  const raw    = { 'old.format': { en: { text: 'old' } } };
  const merged = mergeSourceFiles([raw]);
  assert.equal(merged['old.format'], undefined, 'old flat-format key must be skipped, not included');
});

test('EDGE: key with no EN translation gets null enHash — strings-check.js treats null as BLOCK (needs EN first), distinct from STALE (EN changed)', () => {
  // The two failure modes must be distinguishable: null = "no EN at all", hash mismatch = "EN changed".
  const manifest = buildManifest({ 'ja-only': { strings: { ja: { text: '日本語のみ' } } } });
  assert.equal(manifest['ja-only'].enHash, null);
});

// [VXG RealForever]
