'use strict';

/**
 * COMPUTE-FAB-VERSION — tests/30-compute-fab-version.test.js
 *
 * Tests for lib/compute-fab-version.js — the pure semver classification
 * logic behind widgets/fab-lang.js's auto-incrementing VERSION constant
 * (Session 025 continued: VERSION had never been bumped since it was
 * introduced, a real bug that silently broke CDN cache invalidation).
 *
 * Test order:
 *   1. parseVersion / formatVersion / bumpVersion — the semver cascade
 *   2. classifyChanges — the major/minor/patch decision table
 *   3. diffNodeIdentity — slug rename vs id reassignment
 *   4. diffStrings — new vs modified string keys
 *   5. diffKeyedCollection / diffLocales — additive-only detectors
 */

const { test } = require('node:test');
const assert   = require('node:assert/strict');

const {
  parseVersion,
  formatVersion,
  bumpVersion,
  classifyChanges,
  diffNodeIdentity,
  diffStrings,
  diffKeyedCollection,
  diffLocales,
} = require('../lib/compute-fab-version');

// ── 1. parseVersion / formatVersion / bumpVersion ─────────────────────────────

test('FAB-VERSION: parseVersion parses MAJOR.MINOR.PATCH', () => {
  assert.deepEqual(parseVersion('2.3.4'), { major: 2, minor: 3, patch: 4 });
});

test('FAB-VERSION: parseVersion rejects a malformed version string', () => {
  assert.throws(() => parseVersion('2.3'));
  assert.throws(() => parseVersion('v2.3.4'));
});

test('FAB-VERSION: formatVersion round-trips parseVersion', () => {
  assert.equal(formatVersion(parseVersion('10.0.7')), '10.0.7');
});

test('FAB-VERSION: bumpVersion with tier=null returns the version unchanged', () => {
  assert.equal(bumpVersion('1.2.3', null), '1.2.3');
});

test('FAB-VERSION: bumpVersion patch tier increments patch only', () => {
  assert.equal(bumpVersion('1.2.3', 'patch'), '1.2.4');
});

test('FAB-VERSION: bumpVersion minor tier increments minor and resets patch to 0', () => {
  assert.equal(bumpVersion('1.2.3', 'minor'), '1.3.0');
});

test('FAB-VERSION: bumpVersion major tier increments major and resets minor+patch to 0 (semver cascade)', () => {
  assert.equal(bumpVersion('1.2.3', 'major'), '2.0.0');
});

test('FAB-VERSION: bumpVersion rejects an unknown tier', () => {
  assert.throws(() => bumpVersion('1.2.3', 'epic'));
});

// ── 2. classifyChanges ─────────────────────────────────────────────────────────

test('FAB-VERSION: classifyChanges returns null when nothing changed', () => {
  assert.equal(classifyChanges({}), null);
});

test('FAB-VERSION: classifyChanges — slug renamed is MAJOR', () => {
  assert.equal(classifyChanges({ slugsRenamed: true }), 'major');
});

test('FAB-VERSION: classifyChanges — id reassigned is MAJOR', () => {
  assert.equal(classifyChanges({ idsChanged: true }), 'major');
});

test('FAB-VERSION: classifyChanges — new strings / new locale / new arc / new department are all MINOR', () => {
  assert.equal(classifyChanges({ newStrings: true }), 'minor');
  assert.equal(classifyChanges({ newLocale: true }), 'minor');
  assert.equal(classifyChanges({ newArc: true }), 'minor');
  assert.equal(classifyChanges({ newDepartment: true }), 'minor');
});

test('FAB-VERSION: classifyChanges — modified strings / checks-alignment touch are both PATCH', () => {
  assert.equal(classifyChanges({ modifiedStrings: true }), 'patch');
  assert.equal(classifyChanges({ checksAlignment: true }), 'patch');
});

test('FAB-VERSION: classifyChanges — MAJOR wins over MINOR and PATCH when multiple signals fire at once', () => {
  assert.equal(classifyChanges({ slugsRenamed: true, newStrings: true, modifiedStrings: true }), 'major');
});

test('FAB-VERSION: classifyChanges — MINOR wins over PATCH when both fire', () => {
  assert.equal(classifyChanges({ newArc: true, modifiedStrings: true }), 'minor');
});

// ── 3. diffNodeIdentity ────────────────────────────────────────────────────────

test('FAB-VERSION: diffNodeIdentity detects a slug rename for the same id', () => {
  const oldNodes = [{ id: 1, slug: 'old-slug' }];
  const newNodes = [{ id: 1, slug: 'new-slug' }];
  assert.deepEqual(diffNodeIdentity(oldNodes, newNodes), { idsChanged: false, slugsRenamed: true });
});

test('FAB-VERSION: diffNodeIdentity detects an id reassigned to an existing slug', () => {
  const oldNodes = [{ id: 1, slug: 'stable-slug' }];
  const newNodes = [{ id: 2, slug: 'stable-slug' }];
  assert.deepEqual(diffNodeIdentity(oldNodes, newNodes), { idsChanged: true, slugsRenamed: false });
});

test('FAB-VERSION: diffNodeIdentity reports nothing for a purely new node (no matching old id or slug)', () => {
  const oldNodes = [{ id: 1, slug: 'a' }];
  const newNodes = [{ id: 1, slug: 'a' }, { id: 2, slug: 'b' }];
  assert.deepEqual(diffNodeIdentity(oldNodes, newNodes), { idsChanged: false, slugsRenamed: false });
});

// ── 4. diffStrings ─────────────────────────────────────────────────────────────

test('FAB-VERSION: diffStrings detects a new key', () => {
  const result = diffStrings({ 'a.b': 'hello' }, { 'a.b': 'hello', 'a.c': 'new' });
  assert.equal(result.newStrings, true);
  assert.equal(result.modifiedStrings, false);
});

test('FAB-VERSION: diffStrings detects a modified value on a shared key (string form)', () => {
  const result = diffStrings({ 'a.b': 'hello' }, { 'a.b': 'goodbye' });
  assert.equal(result.newStrings, false);
  assert.equal(result.modifiedStrings, true);
});

test('FAB-VERSION: diffStrings detects a modified value on a shared key ({text} object form)', () => {
  const result = diffStrings({ 'a.b': { text: 'hello' } }, { 'a.b': { text: 'goodbye' } });
  assert.equal(result.modifiedStrings, true);
});

test('FAB-VERSION: diffStrings reports nothing when strings are unchanged', () => {
  const result = diffStrings({ 'a.b': 'hello' }, { 'a.b': 'hello' });
  assert.equal(result.newStrings, false);
  assert.equal(result.modifiedStrings, false);
});

// ── 5. diffKeyedCollection / diffLocales ────────────────────────────────────────

test('FAB-VERSION: diffKeyedCollection detects a new top-level key', () => {
  assert.equal(diffKeyedCollection({ a: {} }, { a: {}, b: {} }), true);
});

test('FAB-VERSION: diffKeyedCollection ignores underscore-prefixed keys (e.g. _meta)', () => {
  assert.equal(diffKeyedCollection({ a: {} }, { a: {}, _meta: {} }), false);
});

test('FAB-VERSION: diffKeyedCollection reports false when no new key appears', () => {
  assert.equal(diffKeyedCollection({ a: {} }, { a: {} }), false);
});

test('FAB-VERSION: diffLocales detects a new language code', () => {
  assert.equal(diffLocales(['en', 'ja'], ['en', 'ja', 'zh']), true);
});

test('FAB-VERSION: diffLocales reports false when the locale set is unchanged or shrank', () => {
  assert.equal(diffLocales(['en', 'ja'], ['en', 'ja']), false);
  assert.equal(diffLocales(['en', 'ja'], ['en']), false);
});

// [VXG RealForever]
