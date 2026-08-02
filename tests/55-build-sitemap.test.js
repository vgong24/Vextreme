'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { collectLiveUrls, renderSitemap } = require('../lib/build-sitemap');

const ROOT = path.join(__dirname, '..');

test('BUILD-SITEMAP: output is content-deterministic and carries no build-clock lastmod', () => {
  const urls = ['https://vgong24.github.io/Vextreme/pages/example.html'];
  const first = renderSitemap(urls);
  const second = renderSitemap(urls);
  assert.equal(first, second);
  assert.doesNotMatch(first, /lastmod|generatedAt|builtAt/);
});

test('BUILD-SITEMAP: only existing content and utility pages are collected', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'vxg-sitemap-'));
  fs.mkdirSync(path.join(root, 'data'), { recursive: true });
  fs.mkdirSync(path.join(root, 'pages'), { recursive: true });
  fs.writeFileSync(path.join(root, 'data', 'nodes.json'), JSON.stringify([
    { id: 2, slug: 'missing' },
    { id: 1, slug: 'present' },
    { id: null, slug: 'undated' },
  ]));
  fs.writeFileSync(path.join(root, 'pages', 'present.html'), '<html></html>');
  fs.writeFileSync(path.join(root, 'pages', 'archives.html'), '<html></html>');
  assert.deepEqual(collectLiveUrls(root), [
    'https://vgong24.github.io/Vextreme/pages/present.html',
    'https://vgong24.github.io/Vextreme/pages/archives.html',
  ]);
});

test('BUILD-SITEMAP integration: committed sitemap equals a fresh source projection', () => {
  const committed = fs.readFileSync(path.join(ROOT, 'sitemap.xml'), 'utf8');
  assert.equal(committed, renderSitemap(collectLiveUrls(ROOT)));
});

// [VXG RealForever]
