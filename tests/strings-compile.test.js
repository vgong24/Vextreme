'use strict';

const { test } = require('node:test');
const assert   = require('node:assert/strict');

const { mergeSourceFiles, buildBundles, buildManifest, contentHash } = require('../lib/strings-compile');

// ── contentHash ───────────────────────────────────────────────────────────────

test('contentHash: must be a 12-char hex string — manifest.json stores these and strings-check.js compares them to detect stale translations', () => {
  // If the format changes (e.g. full 64-char SHA), strings-check.js comparisons still work,
  // but manifest.json grows significantly and diffs become noisy. 12 chars is the agreed format.
  const h = contentHash('hello');
  assert.match(h, /^[0-9a-f]{12}$/);
});

test('contentHash: same input always produces the same hash — stale detection would fire false positives on every compile if hashing were non-deterministic', () => {
  // strings-check.js flags a translation as STALE when the stored enHash no longer matches
  // a fresh hash of the EN text. A non-stable hash would mark every key stale every run.
  assert.equal(contentHash('test input'), contentHash('test input'));
});

test('contentHash: different EN text must produce a different hash — otherwise a changed source string would not trigger the STALE warning for translators', () => {
  // This is the core purpose of enHash: detecting when an EN string changed after translation.
  // A collision here means a translator never knows their translation is out of date.
  assert.notEqual(contentHash('hello'), contentHash('world'));
});

// ── mergeSourceFiles ──────────────────────────────────────────────────────────

test('mergeSourceFiles: keys from separate scope files must merge into one map — the compiled bundle is a single flat file, not one per scope', () => {
  // The browser loads strings.en.json as a single file. If scope files stayed separate,
  // the browser would need to fetch multiple files and merge them at runtime.
  const raw1 = { 'common.nav.prev': { strings: { en: { text: '← prev' }, ja: { text: '← 前へ' } } } };
  const raw2 = { 'common.nav.next': { strings: { en: { text: 'next →' } } } };
  const merged = mergeSourceFiles([raw1, raw2]);
  assert.ok(merged['common.nav.prev']);
  assert.ok(merged['common.nav.next']);
});

test('mergeSourceFiles: _meta is schema documentation, not a string key — including it in the bundle would ship internal comments to the browser', () => {
  const raw = {
    _meta: { description: 'should be skipped' },
    'some.key': { strings: { en: { text: 'hello' } } }
  };
  const merged = mergeSourceFiles([raw]);
  assert.equal(merged['_meta'], undefined);
  assert.ok(merged['some.key']);
});

test('mergeSourceFiles: entries missing the "strings" namespace are skipped — old flat-format keys from before the restructure must not silently corrupt the bundle', () => {
  // The element object shape is { strings: { en, ja } }. A key with { en: { text } } (old format)
  // is a migration error. Silently including it would produce a malformed bundle entry that
  // crashes getString() when accessed in the browser.
  const raw = { 'bad.key': { en: { text: 'old format' } } };
  const merged = mergeSourceFiles([raw]);
  assert.equal(merged['bad.key'], undefined);
});

test('mergeSourceFiles: first definition wins on duplicate keys — prevents a later scope file from silently overriding a shared common string', () => {
  // common.json defines 'common.nav.prev'. If a page-scope file also defined it,
  // the second definition would override the first — wrong text shipped to users.
  // First-wins makes the conflict visible (a warning is logged) without corrupting the output.
  const raw1 = { 'dupe.key': { strings: { en: { text: 'first' } } } };
  const raw2 = { 'dupe.key': { strings: { en: { text: 'second' } } } };
  const merged = mergeSourceFiles([raw1, raw2]);
  assert.equal(merged['dupe.key'].strings.en.text, 'first');
});

// ── buildBundles ──────────────────────────────────────────────────────────────

test('buildBundles: one bundle file per language — the browser fetches strings.en.json; a separate strings.ja.json avoids shipping all languages to every user', () => {
  const merged = {
    'common.nav.prev': { strings: { en: { text: '← prev' }, ja: { text: '← 前へ' } } },
    'common.nav.next': { strings: { en: { text: 'next →' } } }
  };
  const bundles = buildBundles(merged);
  assert.ok(bundles['en']);
  assert.ok(bundles['ja']);
});

test('buildBundles: EN bundle must contain every key that has an EN translation — a missing key causes getString() to fall back to the raw key string, which is visible to users', () => {
  const merged = {
    'a': { strings: { en: { text: 'A' } } },
    'b': { strings: { en: { text: 'B' }, ja: { text: 'B-ja' } } }
  };
  const bundles = buildBundles(merged);
  assert.equal(bundles['en']['a'].text, 'A');
  assert.equal(bundles['en']['b'].text, 'B');
});

test('buildBundles: keys with no translation for a given language are absent from that bundle — partial coverage is expected and the browser falls back to EN', () => {
  // Not every key has a Japanese translation yet. Missing keys are intentional gaps,
  // not build errors. The browser handles them by falling back to EN text.
  const merged = {
    'en-only': { strings: { en: { text: 'English only' } } },
    'both':    { strings: { en: { text: 'English' }, ja: { text: '日本語' } } }
  };
  const bundles = buildBundles(merged);
  assert.equal(bundles['ja']['en-only'], undefined);
  assert.ok(bundles['ja']['both']);
});

// ── buildManifest ─────────────────────────────────────────────────────────────

test('buildManifest: every key needs enHash and langs so strings-check.js can determine which translations are stale without re-reading all source files', () => {
  // strings-check.js reads manifest.json, re-hashes the current EN text, and compares.
  // If enHash or langs were missing, the check script would need to re-parse all source files
  // on every run — O(n files) instead of O(1) manifest lookup.
  const merged = {
    'nav.prev': { strings: { en: { text: '← prev' }, ja: { text: '← 前へ' } } }
  };
  const manifest = buildManifest(merged);
  assert.ok(manifest['nav.prev'].enHash);
  assert.deepEqual(manifest['nav.prev'].langs, ['en', 'ja']);
});

test('buildManifest: enHash must be stable across compiles — an unstable hash would mark every translation STALE on every run, spamming translators with false alerts', () => {
  const merged = { 'key': { strings: { en: { text: 'hello' } } } };
  const m1 = buildManifest(merged);
  const m2 = buildManifest(merged);
  assert.equal(m1['key'].enHash, m2['key'].enHash);
  assert.match(m1['key'].enHash, /^[0-9a-f]{12}$/);
});

test('buildManifest: changing EN text must produce a different enHash — this is the signal that triggers the STALE flag in strings-check.js', () => {
  // If hashes collided on different EN text, a translator would never be notified that
  // the source changed and their translation needs updating.
  const mergedA = { 'key': { strings: { en: { text: 'version A' } } } };
  const mergedB = { 'key': { strings: { en: { text: 'version B' } } } };
  assert.notEqual(buildManifest(mergedA)['key'].enHash, buildManifest(mergedB)['key'].enHash);
});

test('buildManifest: key with no EN text gets null enHash — strings-check.js treats null as BLOCK (missing required translation), not a stale check', () => {
  // A missing EN translation is a blocking error (constraint 7: no hardcoded strings,
  // which implies EN is the required baseline). null enHash signals "needs EN first"
  // rather than "compare this hash" — the two failure modes need to be distinguishable.
  const merged = { 'ja-only': { strings: { ja: { text: '日本語のみ' } } } };
  assert.equal(buildManifest(merged)['ja-only'].enHash, null);
});

// [VXG RealForever]
