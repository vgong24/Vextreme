'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const read = (relative) => fs.readFileSync(path.join(ROOT, relative), 'utf8');
const page = read('pages/scopes-of-god.html');
const transcript = JSON.parse(read('data/strings/source/pages/scopes-of-god.json'));
const presentation = JSON.parse(read('data/strings/source/lineages/scopes-of-god-presentation.json'));
const viewmodels = JSON.parse(read('data/viewmodels.json'));
const nodes = JSON.parse(read('data/nodes.json'));
const arcs = JSON.parse(read('data/arcs-v2.json'));

function sourceKeys(value) {
  return Object.keys(value).filter((key) => key !== '_meta');
}

test('CONTENT FORGE SCOPES OF GOD: every destination localization key resolves through collision-free provenance-distinct page sources', () => {
  const transcriptKeys = sourceKeys(transcript);
  const presentationKeys = sourceKeys(presentation);
  const transcriptSet = new Set(transcriptKeys);
  const collisions = presentationKeys.filter((key) => transcriptSet.has(key));
  const merged = {
    ...Object.fromEntries(transcriptKeys.map((key) => [key, transcript[key]])),
    ...Object.fromEntries(presentationKeys.map((key) => [key, presentation[key]])),
  };
  const keys = [...page.matchAll(/data-i18n="([^"]+)"/g)].map((match) => match[1]);

  assert.equal(transcriptKeys.length, 143);
  assert.equal(presentationKeys.length, 83);
  assert.equal(transcript._meta.scope, 'pages.scopes-of-god');
  assert.equal(presentation._meta.scope, transcript._meta.scope);
  assert.deepEqual(collisions, [], 'provenance-distinct same-scope source files must keep disjoint key identity');

  for (const key of keys) {
    assert.ok(key.startsWith('pages.scopes-of-god.'), `unexpected destination key: ${key}`);
    assert.ok(merged[key], `missing same-scope string source for ${key}`);
    assert.ok(merged[key].strings?.en?.text !== undefined, `missing EN text for ${key}`);
  }

  assert.equal(transcript._meta.sourceProvenance.preservedPath,
    'docs/ingestion/source-pages/part-026/convos-with-god-scopes-of-god.html');
  assert.equal(transcript._meta.sourceProvenance.preservedGitBlob,
    '6518d2ca81fa42c4e556b018a78bd44b3ea2afc1');
  assert.equal(presentation._meta.sourceProvenance.preservedPath,
    'docs/ingestion/source-pages/part-022/scopes-of-god.html');
  assert.equal(presentation._meta.sourceProvenance.preservedGitBlob,
    '3213beb49603a0ce0f7a979679aa0f34f898be78');
});

test('CONTENT FORGE SCOPES OF GOD: provider shell is excluded while repository-native runtime stays wired', () => {
  for (const forbidden of ['window.__RESCUE_SOURCE', '/__rescue/', 'data-sqsp-', 'sqsp-', 'pages.convos-with-god-scopes-of-god.']) {
    assert.equal(page.includes(forbidden), false, `destination page must not inherit source shell marker: ${forbidden}`);
  }
  assert.ok(page.includes('id="arcNavMount"'));
  assert.ok(page.includes('../styles/arc-nav.css'));
  assert.ok(page.includes('../dist/vextreme-scopes-of-god.js'));
});

test('CONTENT FORGE SCOPES OF GOD: viewmodel, node identity, and arc placement stay unchanged', () => {
  assert.deepEqual(viewmodels['scopes-of-god'], {
    title: 'Scopes of God',
    category: 'production',
    template: 'page',
    scopes: ['pages.scopes-of-god'],
    features: ['lang', 'spiral-fab', 'theme', 'map', 'analysis', 'arc-nav'],
  });
  assert.deepEqual(nodes.find((item) => item.slug === 'scopes-of-god'), {
    id: 21,
    slug: 'scopes-of-god',
    title: 'Scopes of God',
    date: 'December 23, 2025',
    arcKeys: ['convos_with_god', 'full_timeline'],
    vexData: {},
  });
  assert.ok(arcs.convos_with_god.sections.some((section) => (section.slugs || []).includes('scopes-of-god')));
  assert.equal(arcs.full_timeline.renderMode, 'position');
});

// [VXG RealForever]
