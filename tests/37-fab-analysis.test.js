'use strict';

/**
 * FAB-ANALYSIS — tests/37-fab-analysis.test.js
 *
 * Tests for widgets/fab-analysis.js (docs/architecture/15-analysis-mode.md,
 * Phase B). Same technique tests/08-build-vextreme.test.js's LANG-FAB tests
 * already use for fab-lang.js: pull a pure function's real source text out
 * of the browser IIFE with a regex and evaluate it directly via `new
 * Function`, rather than requiring the whole file (which would execute
 * `document`/`window`-touching mount code that doesn't exist in Node) or
 * duplicating the logic here as a second, driftable copy.
 *
 * Test order:
 *   1. filterElements — key/page substring search
 *   2. screenshotsForKey — reverse lookup through usedIn -> pages.screenshots
 *   3. toCSV — coverage/mapping export shape
 *   4. Structural — orb mounts into #vex-spiral-group, standalone fallback exists,
 *      data/analysis-index.json is fetched lazily (not on page load)
 */

const { test } = require('node:test');
const assert    = require('node:assert/strict');
const fs        = require('fs');
const path      = require('path');

const ROOT      = path.join(__dirname, '..');
const WIDGET_IN = path.join(ROOT, 'widgets', 'fab-analysis.js');

function loadFn(name) {
  const source = fs.readFileSync(WIDGET_IN, 'utf8');
  const fnMatch = source.match(new RegExp('function ' + name + '\\([\\s\\S]*?\\n  \\}'));
  assert.ok(fnMatch, name + '() must exist in widgets/fab-analysis.js');
  const fn = new Function(fnMatch[0] + '\nreturn ' + name + ';');
  return fn();
}

function loadFnWithDep(name, depNames) {
  const source = fs.readFileSync(WIDGET_IN, 'utf8');
  let body = '';
  depNames.forEach((dep) => {
    const depMatch = source.match(new RegExp('function ' + dep + '\\([\\s\\S]*?\\n  \\}'));
    assert.ok(depMatch, dep + '() must exist in widgets/fab-analysis.js');
    body += depMatch[0] + '\n';
  });
  const fnMatch = source.match(new RegExp('function ' + name + '\\([\\s\\S]*?\\n  \\}'));
  assert.ok(fnMatch, name + '() must exist in widgets/fab-analysis.js');
  body += fnMatch[0] + '\nreturn ' + name + ';';
  const fn = new Function(body);
  return fn();
}

// ── 1. filterElements ─────────────────────────────────────────────────────────

test('filterElements: empty query returns every key, sorted', () => {
  const filterElements = loadFn('filterElements');
  const elements = { b: { usedIn: [] }, a: { usedIn: [] } };
  assert.deepEqual(filterElements(elements, ''), ['a', 'b']);
});

test('filterElements: matches by key substring, case-insensitive', () => {
  const filterElements = loadFn('filterElements');
  const elements = { 'pages.hero.title': { usedIn: [] }, 'pages.footer.text': { usedIn: [] } };
  assert.deepEqual(filterElements(elements, 'HERO'), ['pages.hero.title']);
});

test('filterElements: matches by referencing page slug even when the key itself does not match', () => {
  const filterElements = loadFn('filterElements');
  const elements = { 'common.label.foo': { usedIn: ['pages/archives.html'] } };
  assert.deepEqual(filterElements(elements, 'archives'), ['common.label.foo']);
});

test('filterElements: no match returns empty array, not all keys', () => {
  const filterElements = loadFn('filterElements');
  const elements = { 'common.label.foo': { usedIn: [] } };
  assert.deepEqual(filterElements(elements, 'zzz-does-not-exist'), []);
});

// ── 2. screenshotsForKey ──────────────────────────────────────────────────────

test('screenshotsForKey: collects every language screenshot from every page a key is used on', () => {
  const screenshotsForKey = loadFn('screenshotsForKey');
  const elements = { 'pages.foo.title': { usedIn: ['pages/foo.html'] } };
  const pages = { foo: { screenshots: { en: 'docs/screenshots/foo-en.png', ja: 'docs/screenshots/foo-ja.png' } } };
  const shots = screenshotsForKey('pages.foo.title', elements, pages);
  assert.equal(shots.length, 2);
  assert.ok(shots.some((s) => s.slug === 'foo' && s.lang === 'en' && s.path === 'docs/screenshots/foo-en.png'));
  assert.ok(shots.some((s) => s.slug === 'foo' && s.lang === 'ja'));
});

test('screenshotsForKey: a page with no screenshots contributes nothing, no throw', () => {
  const screenshotsForKey = loadFn('screenshotsForKey');
  const elements = { 'pages.bar.title': { usedIn: ['pages/bar.html'] } };
  const pages = { bar: { screenshots: {} } };
  assert.deepEqual(screenshotsForKey('pages.bar.title', elements, pages), []);
});

test('screenshotsForKey: a key with no usedIn returns empty, not an error', () => {
  const screenshotsForKey = loadFn('screenshotsForKey');
  assert.deepEqual(screenshotsForKey('missing.key', {}, {}), []);
});

// ── 3. toCSV ───────────────────────────────────────────────────────────────────

test('toCSV: header row plus one row per key, in the given order', () => {
  const toCSV = loadFn('toCSV');
  const elements = {
    'a.key': { inManifest: true, langs: ['en'], missingLangs: ['ja'], usedIn: ['pages/a.html'] },
  };
  const csv = toCSV(['a.key'], elements);
  const lines = csv.split('\n');
  assert.equal(lines[0], 'key,inManifest,langs,missingLangs,usedIn');
  assert.equal(lines[1], 'a.key,true,en,ja,pages/a.html');
});

test('toCSV: pipe-joins multi-value fields within a single CSV cell', () => {
  const toCSV = loadFn('toCSV');
  const elements = {
    'a.key': { inManifest: true, langs: ['en', 'ja'], missingLangs: ['zh'], usedIn: ['pages/a.html', 'pages/b.html'] },
  };
  const csv = toCSV(['a.key'], elements);
  assert.ok(csv.includes('en|ja'));
  assert.ok(csv.includes('pages/a.html|pages/b.html'));
});

test('toCSV: quotes and escapes a value containing a comma', () => {
  const toCSV = loadFn('toCSV');
  // usedIn values don't naturally contain commas, but the escaper must be
  // correct for any future field that could — verified directly here.
  const elements = { 'a,key': { inManifest: false, langs: [], missingLangs: [], usedIn: [] } };
  const csv = toCSV(['a,key'], elements);
  assert.ok(csv.includes('"a,key"'));
});

// ── 4. Structural ──────────────────────────────────────────────────────────────

test('STRUCTURAL: mounts into #vex-spiral-group when present, with a standalone fallback', () => {
  const source = fs.readFileSync(WIDGET_IN, 'utf8');
  assert.ok(source.includes("getElementById('vex-spiral-group')"), 'must check for the shared spiral group, same contract as every other orb widget');
  assert.ok(source.includes('vex-standalone'), 'must have a standalone fallback class for pages without spiral-fab');
});

test('STRUCTURAL: data/analysis-index.json is fetched lazily on first open, not unconditionally at mount time', () => {
  const source = fs.readFileSync(WIDGET_IN, 'utf8');
  const mountMatch = source.match(/function mount\(\)[\s\S]*?\n  \}\n\n  if \(document\.readyState/);
  assert.ok(mountMatch, 'mount() function must exist');
  assert.equal(/loadIndex\(/.test(mountMatch[0].replace(/btn\.addEventListener[\s\S]*/, '')), false,
    'loadIndex() must not be called from the unconditional part of mount() — only from the click handler, so page load never pays this fetch cost before Phase C decides default-on vs. opt-in');
  assert.ok(source.includes("btn.addEventListener('click'"), 'the click handler must exist and be where loadIndex() is actually called');
});

test('STRUCTURAL: CSV export column header documents coverage/mapping only, not translated text', () => {
  const source = fs.readFileSync(WIDGET_IN, 'utf8');
  assert.ok(source.includes("'key,inManifest,langs,missingLangs,usedIn'"),
    'CSV header must stay explicit about what it exports — do not silently add text columns without updating the file header\'s documented scope');
});
