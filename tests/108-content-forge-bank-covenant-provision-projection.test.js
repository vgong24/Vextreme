'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const read = (relative) => fs.readFileSync(path.join(ROOT, relative), 'utf8');
const page = read('pages/when-i-asked-a-bank-for-covenant-provision.html');
const presentation = JSON.parse(read('data/strings/source/pages/when-i-asked-a-bank-for-covenant-provision.json'));
const transcript = JSON.parse(read('data/strings/source/lineages/when-i-asked-a-bank-for-covenant-provision-transcript.json'));
const viewmodels = JSON.parse(read('data/viewmodels.json'));
const nodes = JSON.parse(read('data/nodes.json'));
const arcs = JSON.parse(read('data/arcs-v2.json'));

function sourceKeys(value) {
  return Object.keys(value).filter((key) => key !== '_meta');
}

test('CONTENT FORGE BANK COVENANT: page keys resolve through collision-free provenance-distinct same-scope sources', () => {
  const presentationKeys = sourceKeys(presentation);
  const transcriptKeys = sourceKeys(transcript);
  const presentationSet = new Set(presentationKeys);
  const merged = {
    ...Object.fromEntries(presentationKeys.map((key) => [key, presentation[key]])),
    ...Object.fromEntries(transcriptKeys.map((key) => [key, transcript[key]])),
  };
  const pageKeys = [...page.matchAll(/data-i18n="([^"]+)"/g)].map((match) => match[1]);

  assert.equal(presentationKeys.length, 51);
  assert.equal(transcriptKeys.length, 77);
  assert.equal(presentation._meta.scope, 'pages.when-i-asked-a-bank-for-covenant-provision');
  assert.equal(transcript._meta.scope, presentation._meta.scope);
  assert.deepEqual(transcriptKeys.filter((key) => presentationSet.has(key)), []);

  for (const key of pageKeys) {
    assert.ok(key.startsWith('pages.when-i-asked-a-bank-for-covenant-provision.'), 'unexpected destination key: ' + key);
    assert.ok(merged[key], 'missing same-scope source for ' + key);
    assert.equal(typeof merged[key].strings?.en?.text, 'string', key + ': missing EN');
  }
});

test('CONTENT FORGE BANK COVENANT: transcript provenance is exact and provider shell identities stay excluded', () => {
  assert.equal(transcript._meta.sourceProvenance.preservedPath,
    'docs/ingestion/source-pages/part-025/convos-with-god-when-i-asked-a-bank-for-covenant-provision.html');
  assert.equal(transcript._meta.sourceProvenance.preservedGitBlob,
    'a6344527257734b9a43152784c8332192496f910');
  assert.equal(transcript._meta.sourceProvenance.preservedHtmlSha256,
    '0a5b850c1f9be4a1e814fb4bed9accafffe83748f0a58957f46e7fd39707bcfe');
  assert.equal(transcript._meta.sourceProvenance.pageId, '3af71754379490da');

  for (const forbidden of ['window.__RESCUE_SOURCE', '/__rescue/', 'data-sqsp-', 'sqsp-', 'pages.convos-with-god-when-i-asked-a-bank-for-covenant-provision.']) {
    assert.equal(page.includes(forbidden), false, 'destination page inherited provider marker: ' + forbidden);
  }
  assert.ok(page.includes('../dist/vextreme-when-i-asked-a-bank-for-covenant-provision.js'));
  assert.ok(page.includes('id="arcNavMount"'));
  assert.ok(page.includes('../styles/arc-nav.css'));
});

test('CONTENT FORGE BANK COVENANT: dual-lineage conversion does not silently advance Global Core localization', () => {
  assert.equal(transcript._meta.localizationState, 'EN_ONLY__NO_SCHEDULER_ADVANCE');
  for (const key of sourceKeys(presentation)) {
    assert.deepEqual(Object.keys(presentation[key].strings), ['en'], 'Presentation localization scheduler state changed: ' + key);
  }
  for (const key of sourceKeys(transcript)) {
    assert.deepEqual(Object.keys(transcript[key].strings), ['en'], 'Transcript unexpectedly gained target locales: ' + key);
  }
});

test('CONTENT FORGE BANK COVENANT: viewmodel, node identity, and arc placement stay unchanged', () => {
  assert.deepEqual(viewmodels['when-i-asked-a-bank-for-covenant-provision'], {
  "title": "When I Asked a Bank for Covenant Provision",
  "category": "production",
  "template": "page",
  "scopes": [
    "pages.when-i-asked-a-bank-for-covenant-provision"
  ],
  "features": [
    "lang",
    "spiral-fab",
    "theme",
    "map",
    "analysis",
    "arc-nav"
  ]
});
  assert.deepEqual(nodes.find((item) => item.slug === 'when-i-asked-a-bank-for-covenant-provision'), {
  "id": 43,
  "slug": "when-i-asked-a-bank-for-covenant-provision",
  "title": "When I Asked a Bank for Covenant Provision",
  "date": "February 13, 2026",
  "arcKeys": [
    "victors_record",
    "full_timeline"
  ],
  "vexData": {}
});
  assert.ok(arcs.victors_record.sections.some((section) => (section.slugs || []).includes('when-i-asked-a-bank-for-covenant-provision')));
  assert.equal(arcs.full_timeline.renderMode, 'position');
});

// [VXG RealForever]
