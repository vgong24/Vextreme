'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const read = (relative) => fs.readFileSync(path.join(ROOT, relative), 'utf8');
const page = read('pages/why-financial-freedom-is-harder-to-trust.html');
const transcript = JSON.parse(read('data/strings/source/pages/why-financial-freedom-is-harder-to-trust.json'));
const presentation = JSON.parse(read('data/strings/source/lineages/why-financial-freedom-is-harder-to-trust-presentation.json'));
const viewmodels = JSON.parse(read('data/viewmodels.json'));
const nodes = JSON.parse(read('data/nodes.json'));
const arcs = JSON.parse(read('data/arcs-v2.json'));

function sourceKeys(value) {
  return Object.keys(value).filter((key) => key !== '_meta');
}

test('CONTENT FORGE WHY FINANCIAL FREEDOM: every destination localization key resolves through collision-free provenance-distinct page sources', () => {
  const transcriptKeys = sourceKeys(transcript);
  const presentationKeys = sourceKeys(presentation);
  const transcriptSet = new Set(transcriptKeys);
  const collisions = presentationKeys.filter((key) => transcriptSet.has(key));
  const merged = {
    ...Object.fromEntries(transcriptKeys.map((key) => [key, transcript[key]])),
    ...Object.fromEntries(presentationKeys.map((key) => [key, presentation[key]])),
  };
  const keys = [...page.matchAll(/data-i18n="([^"]+)"/g)].map((match) => match[1]);

  assert.equal(transcriptKeys.length, 469);
  assert.equal(presentationKeys.length, 106);
  assert.equal(transcript._meta.scope, 'pages.why-financial-freedom-is-harder-to-trust');
  assert.equal(presentation._meta.scope, transcript._meta.scope);
  assert.deepEqual(collisions, [], 'provenance-distinct same-scope source files must keep disjoint key identity');

  for (const key of keys) {
    assert.ok(key.startsWith('pages.why-financial-freedom-is-harder-to-trust.'), `unexpected destination key: ${key}`);
    assert.ok(merged[key], `missing same-scope string source for ${key}`);
    assert.ok(merged[key].strings?.en?.text !== undefined, `missing EN text for ${key}`);
  }

  assert.equal(transcript._meta.sourceProvenance.preservedPath,
    'docs/ingestion/source-pages/part-027/convos-with-god-why-financial-freedom-is-harder-to-trust.html');
  assert.equal(transcript._meta.sourceProvenance.preservedGitBlob,
    '14f5e0c55eb6ddf2b254b2bb6037044534bd8f99');
  assert.equal(presentation._meta.sourceProvenance.preservedPath,
    'docs/ingestion/source-pages/part-022/why-financial-freedom-is-harder-to-trust.html');
  assert.equal(presentation._meta.sourceProvenance.preservedGitBlob,
    'a9f74085db3673952b2872d9661d5134645ca213');
});

test('CONTENT FORGE WHY FINANCIAL FREEDOM: provider shell is excluded while repository-native runtime stays wired', () => {
  for (const forbidden of ['window.__RESCUE_SOURCE', '/__rescue/', 'data-sqsp-', 'sqsp-', 'pages.convos-with-god-why-financial-freedom-is-harder-to-trust.']) {
    assert.equal(page.includes(forbidden), false, `destination page must not inherit source shell marker: ${forbidden}`);
  }
  assert.ok(page.includes('id="arcNavMount"'));
  assert.ok(page.includes('../styles/arc-nav.css'));
  assert.ok(page.includes('../dist/vextreme-why-financial-freedom-is-harder-to-trust.js'));
});

test('CONTENT FORGE WHY FINANCIAL FREEDOM: viewmodel preserves production defaults and intentional Terrain cover', () => {
  assert.deepEqual(viewmodels['why-financial-freedom-is-harder-to-trust'], {
    title: 'Why Financial Freedom is Harder to Trust',
    category: 'production',
    template: 'page',
    scopes: ['pages.why-financial-freedom-is-harder-to-trust'],
    features: ['lang', 'spiral-fab', 'theme', 'map', 'analysis', 'arc-nav'],
    preview: {
      kind: 'cover',
      src: 'https://vgong24.github.io/Vextreme-Assets/__assets/44aaf3bf90838d73eff47c69273d9380ede268b25449213ebee2a227a0266701.jpg',
      alt: 'Why Financial Freedom Is Harder to Trust — documented signs and an unfinished bridge toward material proof',
    },
  });
  assert.deepEqual(nodes.find((item) => item.slug === 'why-financial-freedom-is-harder-to-trust'), {
    id: 7,
    slug: 'why-financial-freedom-is-harder-to-trust',
    title: 'Why Financial Freedom is Harder to Trust',
    date: 'October 10, 2025',
    arcKeys: ['convos_with_god', 'full_timeline'],
    vexData: {},
  });
  assert.ok(arcs.convos_with_god.sections.some((section) => (section.slugs || []).includes('why-financial-freedom-is-harder-to-trust')));
  assert.equal(arcs.full_timeline.renderMode, 'position');
});

// [VXG RealForever]
