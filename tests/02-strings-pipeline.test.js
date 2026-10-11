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
const { targetLanguages, buildTranslatorCSV } = require('../lib/strings-export');
const { parseCSV, buildImportPlan, applyImportOperations } = require('../lib/strings-import');

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


test('TRANSLATOR EXPORT: an explicit new target locale bootstraps from EN without leaking existing non-EN text', () => {
  const en = { text: '← prev', 'aria-label': 'Previous page' };
  const raw = {
    _meta: { scope: 'common', description: 'Globally reusable UI string' },
    'common.nav.prev': {
      strings: {
        en,
        ja: { text: '← 前へ', 'aria-label': '前のページ' },
      },
    },
  };

  assert.deepEqual(targetLanguages(raw, 'fr'), ['fr']);

  const csv = buildTranslatorCSV(raw, 'fr');
  const rows = parseCSV(csv);

  assert.equal(rows.length, 1);
  assert.equal(rows[0].key, 'common.nav.prev');
  assert.equal(rows[0].en_text, '← prev');
  assert.equal(rows[0].en_aria_label, 'Previous page');
  assert.equal(rows[0].source_en_hash12, contentHash(JSON.stringify(en)));
  assert.equal(rows[0].fr_text, '');
  assert.equal(rows[0].fr_aria_label, '');
  assert.equal(rows[0].ja_text, undefined);
  assert.doesNotMatch(csv, /前へ|前のページ/, 'translator view must remain source language + one target only');
});

test('TRANSLATOR CSV: parser preserves quoted commas and embedded newlines in translated text', () => {
  const rows = parseCSV([
    'key,source_en_hash12,fr_text,fr_aria_label',
    'example.key,abc123def456,"Bonjour, monde\\nDeuxième ligne","Action, suivante"',
    '',
  ].join('\n').replace('\\n', '\n'));

  assert.equal(rows.length, 1);
  assert.equal(rows[0].fr_text, 'Bonjour, monde\nDeuxième ligne');
  assert.equal(rows[0].fr_aria_label, 'Action, suivante');
});

test('TRANSLATOR IMPORT: a matching EN preimage can add a brand-new target locale', () => {
  const file = '/virtual/common.json';
  const raw = {
    _meta: { scope: 'common' },
    'common.nav.prev': {
      strings: {
        en: { text: '← prev', 'aria-label': 'Previous page' },
        ja: { text: '← 前へ' },
      },
    },
  };
  const source = {
    'common.nav.prev': {
      value: raw['common.nav.prev'],
      file,
    },
  };
  const hash = contentHash(JSON.stringify(raw['common.nav.prev'].strings.en));
  const plan = buildImportPlan([{
    key: 'common.nav.prev',
    source_en_hash12: hash,
    fr_text: '← précédent',
    fr_aria_label: 'Page précédente',
  }], 'fr', source, 'common.fr.csv');

  assert.deepEqual(plan.errors, []);
  assert.equal(plan.operations.length, 1);
  assert.equal(raw['common.nav.prev'].strings.fr, undefined, 'preflight must be side-effect free');

  const fileCache = { [file]: raw };
  const touched = applyImportOperations(plan.operations, fileCache);
  assert.deepEqual(Array.from(touched), [file]);
  assert.deepEqual(raw['common.nav.prev'].strings.fr, {
    text: '← précédent',
    'aria-label': 'Page précédente',
  });
});

test('TRANSLATOR IMPORT: any stale or unbound row blocks preflight without mutating canonical source', () => {
  const file = '/virtual/page.json';
  const raw = {
    _meta: { scope: 'pages.example' },
    'pages.example.first': { strings: { en: { text: 'First' } } },
    'pages.example.second': { strings: { en: { text: 'Second', 'aria-label': 'Second action' } } },
    'pages.example.third': { strings: { en: { text: 'Third' } } },
  };
  const source = Object.fromEntries(
    Object.entries(raw)
      .filter(([key]) => key !== '_meta')
      .map(([key, value]) => [key, { value, file }])
  );
  const before = JSON.stringify(raw);
  const plan = buildImportPlan([
    {
      key: 'pages.example.first',
      source_en_hash12: contentHash(JSON.stringify(raw['pages.example.first'].strings.en)),
      fr_text: 'Premier',
      fr_aria_label: '',
    },
    {
      key: 'pages.example.second',
      source_en_hash12: '000000000000',
      fr_text: 'Deuxième',
      fr_aria_label: 'Deuxième action',
    },
    {
      key: 'pages.example.third',
      source_en_hash12: '',
      fr_text: 'Troisième',
      fr_aria_label: '',
    },
  ], 'fr', source, 'pages.example.fr.csv');

  assert.ok(plan.errors.some(error => error.includes('is stale')));
  assert.ok(plan.errors.some(error => error.includes('has no source_en_hash12 binding')));
  assert.equal(JSON.stringify(raw), before, 'planning a rejected return must not mutate canonical strings');
});

// [VXG RealForever]
