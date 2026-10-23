'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const { mergeSourceFiles, buildBundles } = require('../lib/strings-compile');

const ROOT = path.join(__dirname, '..');
const TARGETS = ['zh','ja','ko','fr','de','es','pt','ar','hi'];
const ALL_LANGS = ['en', ...TARGETS].sort();

const CASES = [
  {
    slug: 'returning-scorpions-to-god',
    expectedKeys: 126,
    expectedPageBindings: 124,
  },
  {
    slug: 'recognizing-life-receiving-abundance',
    expectedKeys: 74,
    expectedPageBindings: 72,
  },
];

function readJson(rel) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8'));
}

function readText(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8').replace(/\r\n/g, '\n');
}

for (const fixture of CASES) {
  test(`RECORD-READER-LOCALIZATION: ${fixture.slug} is Global Core source-complete`, () => {
    const sourcePath = `data/strings/source/pages/${fixture.slug}.json`;
    const pagePath = `pages/${fixture.slug}.html`;
    const raw = readJson(sourcePath);
    const page = readText(pagePath);
    const keys = Object.keys(raw).filter(key => key !== '_meta').sort();

    assert.equal(keys.length, fixture.expectedKeys);
    assert.equal(raw._meta.translationPolicy, undefined, 'reader presentation source must not compile as source-only');

    for (const key of keys) {
      const entry = raw[key];
      assert.ok(entry?.strings?.en?.text?.trim(), `missing EN text: ${key}`);
      assert.deepEqual(Object.keys(entry.strings).sort(), ALL_LANGS, `locale set drift: ${key}`);
      for (const lang of TARGETS) {
        assert.ok(entry.strings[lang]?.text?.trim(), `missing ${lang}: ${key}`);
        assert.equal(entry.strings[lang]._stale, undefined, `stale ${lang}: ${key}`);
      }
    }

    const pageKeys = [...new Set([...page.matchAll(/data-i18n="([^"]+)"/g)].map(match => match[1]))].sort();
    assert.equal(pageKeys.length, fixture.expectedPageBindings);
    for (const key of pageKeys) {
      assert.ok(raw[key]?.strings?.en?.text, `page binding missing source key: ${key}`);
    }

    const merged = mergeSourceFiles([raw]);
    const bundles = buildBundles(merged);
    assert.deepEqual(Object.keys(bundles).sort(), ALL_LANGS);
    for (const lang of ALL_LANGS) {
      assert.equal(Object.keys(bundles[lang]).length, fixture.expectedKeys, `compiler dropped ${lang} keys`);
      for (const key of keys) {
        assert.ok(bundles[lang][key]?.text?.trim(), `compiled ${lang} missing ${key}`);
      }
    }
  });
}

test('RECORD-READER-LOCALIZATION: source completeness is carried by locale cells, not a second status ledger', () => {
  for (const fixture of CASES) {
    const raw = readJson(`data/strings/source/pages/${fixture.slug}.json`);
    assert.equal(raw._meta.localization, undefined);
  }
});

// [VXG RealForever]
