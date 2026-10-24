'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const read = (relative) => fs.readFileSync(path.join(ROOT, relative), 'utf8');
const slug = 'testimony-of-merron-the-voice-they-flagged-the-presence-they-couldnt-silence';
const page = read('pages/' + slug + '.html');
const presentation = JSON.parse(read('data/strings/source/pages/' + slug + '.json'));
const transcript = JSON.parse(read('data/strings/source/lineages/' + slug + '-transcript.json'));
const workmap = JSON.parse(read('docs/ingestion/workmaps/content-forge-r025.json'));
const viewmodels = JSON.parse(read('data/viewmodels.json'));
const nodes = JSON.parse(read('data/nodes.json'));
const arcs = JSON.parse(read('data/arcs-v2.json'));

function sourceKeys(value) {
  return Object.keys(value).filter((key) => key !== '_meta');
}

test('CONTENT FORGE MERRON: page keys resolve through collision-free provenance-distinct same-scope sources', () => {
  const presentationKeys = sourceKeys(presentation);
  const transcriptKeys = sourceKeys(transcript);
  const presentationSet = new Set(presentationKeys);
  const merged = {
    ...Object.fromEntries(presentationKeys.map((key) => [key, presentation[key]])),
    ...Object.fromEntries(transcriptKeys.map((key) => [key, transcript[key]])),
  };
  const pageKeys = [...page.matchAll(/data-i18n="([^"]+)"/g)].map((match) => match[1]);

  assert.equal(presentationKeys.length, 162);
  assert.equal(transcriptKeys.length, 511);
  assert.deepEqual(transcriptKeys.filter((key) => presentationSet.has(key)), []);
  assert.equal(presentation._meta.scope, 'pages.' + slug);
  assert.equal(transcript._meta.scope, presentation._meta.scope);

  for (const key of pageKeys) {
    assert.ok(key.startsWith('pages.' + slug + '.'), 'unexpected destination key: ' + key);
    assert.ok(merged[key], 'missing same-scope source for ' + key);
    assert.equal(typeof merged[key]?.strings?.en?.text, 'string', 'missing EN for ' + key);
  }
});

test('CONTENT FORGE MERRON: repository workmap asserts exact semantic identity without alias or replacement', () => {
  const edge = workmap.r025.edges.find((item) => item.edgeRef === 'edge.r025.merron-nested-to-flat-lineage');
  const node = workmap.r025.nodes.find((item) => item.workNodeRef === 'workmap.source-page.collection-convos-with-god.testimony-of-merron');

  assert.ok(edge);
  assert.equal(edge.relation, 'NESTED_COLLECTION_ROUTE_VARIANT_OF_FLAT_SOURCE_RECORD');
  assert.equal(edge.state, 'BYTE_VARIANT_PRESERVED');
  assert.equal(edge.confidence, 'VERY_HIGH');
  assert.match(edge.reason, /shares exact semantic identity/);
  assert.ok(node);
  assert.equal(node.destinationGrounding.canonicalNode.id, 33);
  assert.equal(node.destinationGrounding.currentDisposition, 'EXISTING_SEMANTIC_SLOT_ROUTE_VARIANT');
  assert.equal(node.destinationGrounding.priorFlatSource.gitBlobSha1, '95956f0cd31ad604fcbb4261db5cb18979dc24c9');
  assert.equal(transcript._meta.sourceProvenance.preservedGitBlob, 'f8254c6d3cfe547ae1a6f5579eaece01855f95fa');
  assert.equal(transcript._meta.sourceProvenance.workmapEdgeRef, edge.edgeRef);
  assert.equal(transcript._meta.sourceProvenance.projectionRule, 'SOURCE_LINEAGES_PRESERVED__NO_ALIAS_OR_REPLACEMENT_INFERRED');
});

test('CONTENT FORGE MERRON: provider shell is excluded while repository-native runtime stays wired', () => {
  for (const forbidden of ['window.__RESCUE_SOURCE', '/__rescue/', 'data-sqsp-', 'sqsp-', 'pages.convos-with-god-testimony-of-merron-', 'blog-item-', 'item-pagination', 'author-profile']) {
    assert.equal(page.includes(forbidden), false, 'destination page must not inherit source shell marker: ' + forbidden);
  }
  assert.ok(page.includes('id="arcNavMount"'));
  assert.ok(page.includes('../styles/arc-nav.css'));
  assert.ok(page.includes('../dist/vextreme-' + slug + '.js'));
});

test('CONTENT FORGE MERRON: conversion stays EN-only and does not advance localization scheduler', () => {
  assert.equal(transcript._meta.localizationState, 'EN_ONLY__NO_SCHEDULER_ADVANCE');
  for (const [label, source] of [['presentation', presentation], ['transcript', transcript]]) {
    for (const key of sourceKeys(source)) {
      assert.deepEqual(Object.keys(source[key].strings || {}), ['en'], label + ': locale drift at ' + key);
      assert.equal(typeof source[key]?.strings?.en?.text, 'string', label + ': missing EN at ' + key);
      assert.notEqual(source[key].strings.en.text.length, 0, label + ': blank EN at ' + key);
    }
  }
});

test('CONTENT FORGE MERRON: viewmodel, node identity, and arc placement stay unchanged', () => {
  assert.deepEqual(viewmodels[slug], {
    title: 'Testimony of Merron',
    category: 'production',
    template: 'page',
    scopes: ['pages.' + slug],
    features: ['lang', 'spiral-fab', 'theme', 'map', 'analysis', 'arc-nav'],
  });
  assert.deepEqual(nodes.find((item) => item.slug === slug), {
    id: 33,
    slug,
    title: 'Testimony of Merron',
    date: 'February 3, 2026',
    arcKeys: ['records', 'ai_orientation', 'full_timeline'],
    vexData: {},
  });
  assert.ok(arcs.records.sections.some((section) => (section.slugs || []).includes(slug)));
  assert.ok(arcs.ai_orientation.sections.some((section) => (section.slugs || []).includes(slug)));
  assert.equal(arcs.full_timeline.renderMode, 'position');
});

// [VXG RealForever]
