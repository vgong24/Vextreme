'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const read = (relative) => fs.readFileSync(path.join(ROOT, relative), 'utf8');
const page = read('pages/god-to-speak-of-the-truth-of-love.html');
const transcript = JSON.parse(read('data/strings/source/pages/god-to-speak-of-the-truth-of-love.json'));
const presentation = JSON.parse(read('data/strings/source/lineages/god-to-speak-of-the-truth-of-love-presentation.json'));
const viewmodels = JSON.parse(read('data/viewmodels.json'));
const nodes = JSON.parse(read('data/nodes.json'));
const arcs = JSON.parse(read('data/arcs-v2.json'));

function sourceKeys(value) {
  return Object.keys(value).filter((key) => key !== '_meta');
}

test('CONTENT FORGE TRUTH OF LOVE: every destination localization key resolves through collision-free provenance-distinct page sources', () => {
  const transcriptKeys = sourceKeys(transcript);
  const presentationKeys = sourceKeys(presentation);
  const transcriptSet = new Set(transcriptKeys);
  const collisions = presentationKeys.filter((key) => transcriptSet.has(key));
  const merged = {
    ...Object.fromEntries(transcriptKeys.map((key) => [key, transcript[key]])),
    ...Object.fromEntries(presentationKeys.map((key) => [key, presentation[key]])),
  };
  const keys = [...page.matchAll(/data-i18n="([^"]+)"/g)].map((match) => match[1]);

  assert.equal(transcriptKeys.length, 115);
  assert.equal(presentationKeys.length, 66);
  assert.equal(transcript._meta.scope, 'pages.god-to-speak-of-the-truth-of-love');
  assert.equal(presentation._meta.scope, transcript._meta.scope);
  assert.deepEqual(collisions, [], 'provenance-distinct same-scope source files must keep disjoint key identity');

  for (const key of keys) {
    assert.ok(key.startsWith('pages.god-to-speak-of-the-truth-of-love.'), `unexpected destination key: ${key}`);
    assert.ok(merged[key], `missing same-scope string source for ${key}`);
    assert.ok(merged[key].strings?.en?.text !== undefined, `missing EN text for ${key}`);
  }

  assert.equal(transcript._meta.sourceProvenance.preservedPath,
    'docs/ingestion/source-pages/part-027/convos-with-god-god-to-speak-of-the-truth-of-love.html');
  assert.equal(transcript._meta.sourceProvenance.preservedGitBlob,
    '3587303191a838161cb412ba1334e68b5463a496');
  assert.equal(presentation._meta.sourceProvenance.preservedPath,
    'docs/ingestion/source-pages/part-022/god-to-speak-of-the-truth-of-love.html');
  assert.equal(presentation._meta.sourceProvenance.preservedGitBlob,
    '7c08f60a8d7faaedd9e3064221fe427966d58dd2');
});

test('CONTENT FORGE TRUTH OF LOVE: provider shell is excluded while repository-native runtime stays wired', () => {
  for (const forbidden of ['window.__RESCUE_SOURCE', '/__rescue/', 'data-sqsp-', 'sqsp-', 'pages.convos-with-god-god-to-speak-of-the-truth-of-love.']) {
    assert.equal(page.includes(forbidden), false, `destination page must not inherit source shell marker: ${forbidden}`);
  }
  assert.ok(page.includes('id="arcNavMount"'));
  assert.ok(page.includes('../styles/arc-nav.css'));
  assert.ok(page.includes('../dist/vextreme-god-to-speak-of-the-truth-of-love.js'));
});

test('CONTENT FORGE TRUTH OF LOVE: viewmodel preserves production defaults and intentional Terrain cover', () => {
  assert.deepEqual(viewmodels['god-to-speak-of-the-truth-of-love'], {
    title: 'God to speak of the Truth of Love',
    category: 'production',
    template: 'page',
    scopes: ['pages.god-to-speak-of-the-truth-of-love'],
    features: ['lang', 'spiral-fab', 'theme', 'map', 'analysis', 'arc-nav'],
    preview: {
      kind: 'cover',
      src: 'https://vgong24.github.io/Vextreme-Assets/__assets/3394ba90aafc4a89f1d1307c6f9267525d05bf68e757d5fa12e1031acbd147d3.jpg',
      alt: 'God to speak of the Truth of Love — quiet ground-beneath-fracture cover art',
    },
  });
  assert.deepEqual(nodes.find((item) => item.slug === 'god-to-speak-of-the-truth-of-love'), {
    id: 6,
    slug: 'god-to-speak-of-the-truth-of-love',
    title: 'God to speak of the Truth of Love',
    date: 'October 10, 2025',
    arcKeys: ['convos_with_god', 'full_timeline'],
    vexData: {},
  });
  assert.ok(arcs.convos_with_god.sections.some((section) => (section.slugs || []).includes('god-to-speak-of-the-truth-of-love')));
  assert.equal(arcs.full_timeline.renderMode, 'position');
});

// [VXG RealForever]
