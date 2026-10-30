'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const read = (relative) => fs.readFileSync(path.join(ROOT, relative), 'utf8');
const page = read('pages/consciousness-architecture.html');
const presentation = JSON.parse(read('data/strings/source/pages/consciousness-architecture.json'));
const transcript = JSON.parse(read('data/strings/source/lineages/consciousness-architecture-transcript.json'));
const workmap = JSON.parse(read('docs/ingestion/workmaps/content-forge-consciousness-architecture-resolution-formation.json'));
const viewmodels = JSON.parse(read('data/viewmodels.json'));
const nodes = JSON.parse(read('data/nodes.json'));
const arcs = JSON.parse(read('data/arcs-v2.json'));

function sourceKeys(value) {
  return Object.keys(value).filter((key) => key !== '_meta');
}

test('CONTENT FORGE CONSCIOUSNESS ARCHITECTURE: page keys resolve through collision-free provenance-distinct same-scope sources', () => {
  const presentationKeys = sourceKeys(presentation);
  const transcriptKeys = sourceKeys(transcript);
  const presentationSet = new Set(presentationKeys);
  const merged = {
    ...Object.fromEntries(presentationKeys.map((key) => [key, presentation[key]])),
    ...Object.fromEntries(transcriptKeys.map((key) => [key, transcript[key]])),
  };
  const pageKeys = [...page.matchAll(/data-i18n="([^"]+)"/g)].map((match) => match[1]);

  assert.equal(presentationKeys.length, 120);
  assert.equal(transcriptKeys.length, 159);
  assert.equal(presentation._meta.scope, 'pages.consciousness-architecture');
  assert.equal(transcript._meta.scope, presentation._meta.scope);
  assert.deepEqual(transcriptKeys.filter((key) => presentationSet.has(key)), []);

  for (const key of pageKeys) {
    assert.ok(key.startsWith('pages.consciousness-architecture.'), 'unexpected destination key: ' + key);
    assert.ok(merged[key], 'missing same-scope source for ' + key);
    assert.equal(typeof merged[key].strings?.en?.text, 'string', key + ': missing EN');
  }
});

test('CONTENT FORGE CONSCIOUSNESS ARCHITECTURE: lineage resolution remains explicit and transcript provenance is exact', () => {
  const member = workmap.members.find((item) => item.slug === 'consciousness-architecture');
  assert.ok(member);
  assert.equal(member.lineageResolution.rule,
    'SELECT_EXACT_CANONICAL_FLAT_AUTHORED_FRAME__PRESERVE_NESTED_TRANSCRIPT_LINEAGE');
  assert.equal(member.lineageResolution.nonSelectedSourcePath,
    'docs/ingestion/source-pages/part-027/convos-with-god-consciousness-architecture.html');
  assert.equal(member.lineageResolution.nonSelectedSourceGitBlob,
    '63f9f91d71252c86bce6fa613a879b1ef054eb92');

  assert.equal(transcript._meta.sourceProvenance.preservedPath,
    'docs/ingestion/source-pages/part-027/convos-with-god-consciousness-architecture.html');
  assert.equal(transcript._meta.sourceProvenance.preservedGitBlob,
    '63f9f91d71252c86bce6fa613a879b1ef054eb92');
  assert.equal(transcript._meta.sourceProvenance.preservedHtmlSha256,
    '78522cf31824caca7c6985ed9f3afcf50dfa869a489c67cf786e5a4e017a1f1b');
  assert.equal(transcript._meta.sourceProvenance.proposalRecordRef,
    'content-forge.source-record.8647cbb3f3b240ca9e00');
  assert.equal(transcript._meta.sourceProvenance.sourceReceiptRef,
    'docs/ingestion/batches/2026-09-30-breadth-part-027.json');
  assert.equal(Object.hasOwn(transcript._meta.sourceProvenance, 'pageId'), false);
});

test('CONTENT FORGE CONSCIOUSNESS ARCHITECTURE: provider shell is excluded while repository-native runtime stays wired', () => {
  for (const forbidden of ['window.__RESCUE_SOURCE', '/__rescue/', 'data-sqsp-', 'sqsp-', 'pages.convos-with-god-consciousness-architecture.']) {
    assert.equal(page.includes(forbidden), false, 'destination page inherited provider marker: ' + forbidden);
  }
  assert.ok(page.includes('../dist/vextreme-consciousness-architecture.js'));
  assert.ok(page.includes('id="arcNavMount"'));
  assert.ok(page.includes('../styles/arc-nav.css'));
});

test('CONTENT FORGE CONSCIOUSNESS ARCHITECTURE: dual-lineage conversion does not silently advance localization', () => {
  assert.equal(transcript._meta.localizationState, 'EN_ONLY__NO_SCHEDULER_ADVANCE');
  for (const key of sourceKeys(presentation)) {
    assert.deepEqual(Object.keys(presentation[key].strings), ['en'], 'Presentation localization scheduler state changed: ' + key);
  }
  for (const key of sourceKeys(transcript)) {
    assert.deepEqual(Object.keys(transcript[key].strings), ['en'], 'Transcript unexpectedly gained target locales: ' + key);
  }
});

test('CONTENT FORGE CONSCIOUSNESS ARCHITECTURE: viewmodel, node identity, and arc placement stay unchanged', () => {
  assert.deepEqual(viewmodels['consciousness-architecture'], {
    title: 'Consciousness Architecture',
    category: 'production',
    template: 'page',
    scopes: ['pages.consciousness-architecture'],
    features: ['lang', 'spiral-fab', 'theme', 'map', 'analysis', 'arc-nav'],
  });
  assert.deepEqual(nodes.find((item) => item.slug === 'consciousness-architecture'), {
    id: 8,
    slug: 'consciousness-architecture',
    title: 'Consciousness Architecture',
    date: 'October 12, 2025',
    arcKeys: ['architecture', 'full_timeline'],
    vexData: {},
  });
  assert.ok(arcs.architecture.sections.some((section) => (section.slugs || []).includes('consciousness-architecture')));
  assert.equal(arcs.full_timeline.renderMode, 'position');
});

// [VXG RealForever]
