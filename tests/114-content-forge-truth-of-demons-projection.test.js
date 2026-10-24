'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const read = (relative) => fs.readFileSync(path.join(ROOT, relative), 'utf8');
const page = read('pages/truth-of-demons-and-intrusive-thoughts.html');
const transcript = JSON.parse(read('data/strings/source/pages/truth-of-demons-and-intrusive-thoughts.json'));
const presentation = JSON.parse(read('data/strings/source/lineages/truth-of-demons-and-intrusive-thoughts-presentation.json'));
const viewmodels = JSON.parse(read('data/viewmodels.json'));
const nodes = JSON.parse(read('data/nodes.json'));
const arcs = JSON.parse(read('data/arcs-v2.json'));

function sourceKeys(value) {
  return Object.keys(value).filter((key) => key !== '_meta');
}

test('CONTENT FORGE TRUTH OF DEMONS: every destination localization key resolves through collision-free provenance-distinct page sources', () => {
  const transcriptKeys = sourceKeys(transcript);
  const presentationKeys = sourceKeys(presentation);
  const transcriptSet = new Set(transcriptKeys);
  const collisions = presentationKeys.filter((key) => transcriptSet.has(key));
  const merged = {
    ...Object.fromEntries(transcriptKeys.map((key) => [key, transcript[key]])),
    ...Object.fromEntries(presentationKeys.map((key) => [key, presentation[key]])),
  };
  const keys = [...page.matchAll(/data-i18n="([^"]+)"/g)].map((match) => match[1]);

  assert.equal(transcriptKeys.length, 350);
  assert.equal(presentationKeys.length, 108);
  assert.equal(transcript._meta.scope, 'pages.truth-of-demons-and-intrusive-thoughts');
  assert.equal(presentation._meta.scope, transcript._meta.scope);
  assert.deepEqual(collisions, [], 'provenance-distinct same-scope source files must keep disjoint key identity');

  for (const key of keys) {
    assert.ok(key.startsWith('pages.truth-of-demons-and-intrusive-thoughts.'), `unexpected destination key: ${key}`);
    assert.ok(merged[key], `missing same-scope string source for ${key}`);
    assert.ok(merged[key].strings?.en?.text !== undefined, `missing EN text for ${key}`);
  }

  assert.equal(transcript._meta.sourceProvenance.preservedPath,
    'docs/ingestion/source-pages/part-027/convos-with-god-truth-of-demons-and-intrusive-thoughts.html');
  assert.equal(transcript._meta.sourceProvenance.preservedGitBlob,
    'fc3da6a58045f37a17d944e35ac72efee3e6afd5');
  assert.equal(presentation._meta.sourceProvenance.preservedPath,
    'docs/ingestion/source-pages/part-023/truth-of-demons-and-intrusive-thoughts.html');
  assert.equal(presentation._meta.sourceProvenance.preservedGitBlob,
    '239d46a4537aae73f67250d0575062f3623e315b');
});

test('CONTENT FORGE TRUTH OF DEMONS: provider shell is excluded while repository-native runtime stays wired', () => {
  for (const forbidden of ['window.__RESCUE_SOURCE', '/__rescue/', 'data-sqsp-', 'sqsp-', 'pages.convos-with-god-truth-of-demons-and-intrusive-thoughts.']) {
    assert.equal(page.includes(forbidden), false, `destination page must not inherit source shell marker: ${forbidden}`);
  }
  assert.ok(page.includes('id="arcNavMount"'));
  assert.ok(page.includes('../styles/arc-nav.css'));
  assert.ok(page.includes('../dist/vextreme-truth-of-demons-and-intrusive-thoughts.js'));
});

test('CONTENT FORGE TRUTH OF DEMONS: viewmodel, node identity, and arc placement stay unchanged', () => {
  assert.deepEqual(viewmodels['truth-of-demons-and-intrusive-thoughts'], {
    title: 'Truth of Demons and Intrusive Thoughts',
    category: 'production',
    template: 'page',
    scopes: ['pages.truth-of-demons-and-intrusive-thoughts'],
    features: ['lang', 'spiral-fab', 'theme', 'map', 'analysis', 'arc-nav'],
  });
  assert.deepEqual(nodes.find((item) => item.slug === 'truth-of-demons-and-intrusive-thoughts'), {
    id: 9,
    slug: 'truth-of-demons-and-intrusive-thoughts',
    title: 'Truth of Demons and Intrusive Thoughts',
    date: 'October 12, 2025',
    arcKeys: ['convos_with_god', 'full_timeline'],
    vexData: {},
  });
  assert.ok(arcs.convos_with_god.sections.some((section) => (section.slugs || []).includes('truth-of-demons-and-intrusive-thoughts')));
  assert.equal(arcs.full_timeline.renderMode, 'position');
});

// [VXG RealForever]
