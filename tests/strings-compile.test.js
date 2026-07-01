'use strict';

const { test } = require('node:test');
const assert   = require('node:assert/strict');

const { mergeSourceFiles, buildBundles, buildManifest, contentHash } = require('../lib/strings-compile');

// ── contentHash ───────────────────────────────────────────────────────────────

test('contentHash: returns 12-character hex string', () => {
  const h = contentHash('hello');
  assert.match(h, /^[0-9a-f]{12}$/);
});

test('contentHash: same input → same hash (stable)', () => {
  assert.equal(contentHash('test input'), contentHash('test input'));
});

test('contentHash: different input → different hash', () => {
  assert.notEqual(contentHash('hello'), contentHash('world'));
});

// ── mergeSourceFiles ──────────────────────────────────────────────────────────

test('mergeSourceFiles: merges keys from multiple source files', () => {
  const raw1 = {
    'common.nav.prev': { strings: { en: { text: '← prev' }, ja: { text: '← 前へ' } } }
  };
  const raw2 = {
    'common.nav.next': { strings: { en: { text: 'next →' } } }
  };
  const merged = mergeSourceFiles([raw1, raw2]);
  assert.ok(merged['common.nav.prev']);
  assert.ok(merged['common.nav.next']);
});

test('mergeSourceFiles: skips _meta key', () => {
  const raw = {
    _meta: { description: 'should be skipped' },
    'some.key': { strings: { en: { text: 'hello' } } }
  };
  const merged = mergeSourceFiles([raw]);
  assert.equal(merged['_meta'], undefined);
  assert.ok(merged['some.key']);
});

test('mergeSourceFiles: skips entries missing strings namespace', () => {
  const raw = {
    'bad.key': { en: { text: 'old format' } }
  };
  const merged = mergeSourceFiles([raw]);
  assert.equal(merged['bad.key'], undefined);
});

test('mergeSourceFiles: second definition of duplicate key is ignored', () => {
  const raw1 = { 'dupe.key': { strings: { en: { text: 'first' } } } };
  const raw2 = { 'dupe.key': { strings: { en: { text: 'second' } } } };
  const merged = mergeSourceFiles([raw1, raw2]);
  assert.equal(merged['dupe.key'].strings.en.text, 'first');
});

// ── buildBundles ──────────────────────────────────────────────────────────────

test('buildBundles: produces one bundle per language', () => {
  const merged = {
    'common.nav.prev': { strings: { en: { text: '← prev' }, ja: { text: '← 前へ' } } },
    'common.nav.next': { strings: { en: { text: 'next →' } } }
  };
  const bundles = buildBundles(merged);
  assert.ok(bundles['en']);
  assert.ok(bundles['ja']);
});

test('buildBundles: EN bundle contains all keys with EN translation', () => {
  const merged = {
    'a': { strings: { en: { text: 'A' } } },
    'b': { strings: { en: { text: 'B' }, ja: { text: 'B-ja' } } }
  };
  const bundles = buildBundles(merged);
  assert.equal(bundles['en']['a'].text, 'A');
  assert.equal(bundles['en']['b'].text, 'B');
});

test('buildBundles: keys without a given language are absent from that bundle', () => {
  const merged = {
    'en-only': { strings: { en: { text: 'English only' } } },
    'both':    { strings: { en: { text: 'English' }, ja: { text: '日本語' } } }
  };
  const bundles = buildBundles(merged);
  assert.equal(bundles['ja']['en-only'], undefined);
  assert.ok(bundles['ja']['both']);
});

// ── buildManifest ─────────────────────────────────────────────────────────────

test('buildManifest: every key gets an enHash and langs array', () => {
  const merged = {
    'nav.prev': { strings: { en: { text: '← prev' }, ja: { text: '← 前へ' } } }
  };
  const manifest = buildManifest(merged);
  assert.ok(manifest['nav.prev'].enHash);
  assert.deepEqual(manifest['nav.prev'].langs, ['en', 'ja']);
});

test('buildManifest: enHash is a stable 12-char hex string', () => {
  const merged = {
    'key': { strings: { en: { text: 'hello' } } }
  };
  const m1 = buildManifest(merged);
  const m2 = buildManifest(merged);
  assert.equal(m1['key'].enHash, m2['key'].enHash);
  assert.match(m1['key'].enHash, /^[0-9a-f]{12}$/);
});

test('buildManifest: enHash changes when EN text changes', () => {
  const mergedA = { 'key': { strings: { en: { text: 'version A' } } } };
  const mergedB = { 'key': { strings: { en: { text: 'version B' } } } };
  const mA = buildManifest(mergedA);
  const mB = buildManifest(mergedB);
  assert.notEqual(mA['key'].enHash, mB['key'].enHash);
});

test('buildManifest: key with no EN translation gets null enHash', () => {
  const merged = {
    'ja-only': { strings: { ja: { text: '日本語のみ' } } }
  };
  const manifest = buildManifest(merged);
  assert.equal(manifest['ja-only'].enHash, null);
});

// [VXG RealForever]
