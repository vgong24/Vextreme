'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const read = (relative) => fs.readFileSync(path.join(ROOT, relative), 'utf8');
const page = read('pages/what-about-buddhism.html');
const transcript = JSON.parse(read('data/strings/source/pages/what-about-buddhism.json'));
const presentation = JSON.parse(read('data/strings/source/lineages/what-about-buddhism-presentation.json'));
const viewmodels = JSON.parse(read('data/viewmodels.json'));
const nodes = JSON.parse(read('data/nodes.json'));
const arcs = JSON.parse(read('data/arcs-v2.json'));

function sourceKeys(value) {
  return Object.keys(value).filter((key) => key !== '_meta');
}

test('CONTENT FORGE BUDDHISM: every destination localization key resolves through collision-free provenance-distinct page sources', () => {
  const transcriptKeys = sourceKeys(transcript);
  const presentationKeys = sourceKeys(presentation);
  const transcriptSet = new Set(transcriptKeys);
  const collisions = presentationKeys.filter((key) => transcriptSet.has(key));
  const merged = {
    ...Object.fromEntries(transcriptKeys.map((key) => [key, transcript[key]])),
    ...Object.fromEntries(presentationKeys.map((key) => [key, presentation[key]])),
  };
  const keys = [...page.matchAll(/data-i18n="([^"]+)"/g)].map((match) => match[1]);

  assert.equal(transcriptKeys.length, 65);
  assert.equal(presentationKeys.length, 79);
  assert.equal(transcript._meta.scope, 'pages.what-about-buddhism');
  assert.equal(presentation._meta.scope, transcript._meta.scope);
  assert.deepEqual(collisions, [], 'provenance-distinct same-scope source files must keep disjoint key identity');

  for (const key of keys) {
    assert.ok(key.startsWith('pages.what-about-buddhism.'), `unexpected destination key: ${key}`);
    assert.ok(merged[key], `missing same-scope string source for ${key}`);
    assert.ok(merged[key].strings?.en?.text !== undefined, `missing EN text for ${key}`);
  }

  assert.equal(transcript._meta.sourceProvenance.preservedPath,
    'docs/ingestion/source-pages/part-028/convos-with-god-now-what-about-buddhism.html');
  assert.equal(transcript._meta.sourceProvenance.preservedGitBlob,
    '9531b4b0eb4b8d159363d8bd6d1bba3ba3b36e55');
  assert.equal(presentation._meta.sourceProvenance.preservedPath,
    'docs/ingestion/source-pages/part-022/what-about-buddhism.html');
  assert.equal(presentation._meta.sourceProvenance.preservedGitBlob,
    'c92f07587867ff17818d7fc00d00b3ca7534d939');
});

test('CONTENT FORGE BUDDHISM: provider shell is excluded while the repository-native runtime stays wired', () => {
  for (const forbidden of ['window.__RESCUE_SOURCE', '/__rescue/', 'data-sqsp-', 'sqsp-', 'pages.convos-with-god-now-what-about-buddhism.']) {
    assert.equal(page.includes(forbidden), false, `destination page must not inherit source shell marker: ${forbidden}`);
  }

  assert.ok(page.includes('id="arcNavMount"'), 'v2 arc-nav mount must exist');
  assert.ok(page.includes('../styles/arc-nav.css'), 'arc-nav stylesheet must be linked');
  assert.ok(page.includes('../dist/vextreme-what-about-buddhism.js'), 'page must load its generated God Script');
});

test('CONTENT FORGE BUDDHISM: viewmodel, node identity, and arc placement stay unchanged', () => {
  assert.deepEqual(viewmodels['what-about-buddhism'], {
    title: 'Now what about Buddhism?',
    category: 'production',
    template: 'page',
    scopes: ['pages.what-about-buddhism'],
    features: ['lang', 'spiral-fab', 'theme', 'map', 'analysis', 'arc-nav'],
  });

  assert.deepEqual(nodes.find((item) => item.slug === 'what-about-buddhism'), {
    id: 5,
    slug: 'what-about-buddhism',
    title: 'Now what about Buddhism?',
    date: 'October 8, 2025',
    arcKeys: ['convos_with_god', 'full_timeline'],
    vexData: {},
  });

  assert.ok(arcs.convos_with_god.sections.some((section) => (section.slugs || []).includes('what-about-buddhism')));
  assert.equal(arcs.full_timeline.renderMode, 'position');
});

// [VXG RealForever]
