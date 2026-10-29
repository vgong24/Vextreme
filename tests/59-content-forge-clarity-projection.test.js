'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const parse5 = require('parse5');

const ROOT = path.join(__dirname, '..');
const SOURCE_PATH = path.join(ROOT, 'docs', 'ingestion', 'source-pages', 'part-028', 'convos-with-god-clarity-on-christianity.html');
const PAGE_PATH = path.join(ROOT, 'pages', 'clarity-on-christianity.html');
const STRINGS_PATH = path.join(ROOT, 'data', 'strings', 'source', 'pages', 'clarity-on-christianity.json');
const PRESENTATION_STRINGS_PATH = path.join(ROOT, 'data', 'strings', 'source', 'lineages', 'clarity-on-christianity-presentation.json');
const VIEWMODELS_PATH = path.join(ROOT, 'data', 'viewmodels.json');
const NODES_PATH = path.join(ROOT, 'data', 'nodes.json');
const ARCS_PATH = path.join(ROOT, 'data', 'arcs-v2.json');
const WIP_PATH = path.join(ROOT, 'wip', 'clarity-on-christianity.json');

function attrs(node) {
  return Object.fromEntries((node.attrs || []).map(a => [a.name, a.value]));
}

function walk(node, fn) {
  if (!node) return null;
  if (fn(node)) return node;
  for (const child of node.childNodes || []) {
    const found = walk(child, fn);
    if (found) return found;
  }
  return null;
}

function findAll(node, fn, out = []) {
  if (!node) return out;
  if (fn(node)) out.push(node);
  for (const child of node.childNodes || []) findAll(child, fn, out);
  return out;
}

function textOf(node) {
  if (!node) return '';
  if (node.nodeName === '#text') return node.value || '';
  return (node.childNodes || []).map(textOf).join('');
}

function orderedTextLeaves(node) {
  return findAll(node, n => n.nodeName === '#text')
    .map(n => (n.value || '').replace(/\s+/g, ' ').trim())
    .filter(Boolean);
}

function countTag(node, tagName) {
  return findAll(node, n => n.tagName === tagName).length;
}

function sourceBody(doc) {
  return walk(doc, node => {
    if (node.tagName !== 'div') return false;
    const a = attrs(node);
    const classes = (a.class || '').split(/\s+/);
    return classes.includes('sqs-html-content') && Object.prototype.hasOwnProperty.call(a, 'data-sqsp-text-block-content');
  });
}

function targetBody(doc) {
  return walk(doc, node => node.tagName === 'article' && attrs(node).id === 'clarity-transcript');
}

test('CONTENT FORGE CLARITY: destination projection preserves the complete Part-028 article text and semantic list/emphasis structure', () => {
  const sourceDoc = parse5.parse(fs.readFileSync(SOURCE_PATH, 'utf8'));
  const targetDoc = parse5.parse(fs.readFileSync(PAGE_PATH, 'utf8'));
  const src = sourceBody(sourceDoc);
  const dst = targetBody(targetDoc);

  assert.ok(src, 'Part-028 source article body must be discoverable');
  assert.ok(dst, 'destination transcript article must exist');
  assert.deepEqual(orderedTextLeaves(dst), orderedTextLeaves(src),
    'projected authored text leaves and order must match Part-028 independently of inter-tag whitespace');

  for (const tag of ['ul', 'ol', 'li', 'strong', 'em']) {
    assert.equal(countTag(dst, tag), countTag(src, tag), `${tag} structure count must be preserved`);
  }
});

test('CONTENT FORGE CLARITY: rescue/provider shell is projected away and v2 God Script + arc-nav are wired', () => {
  const html = fs.readFileSync(PAGE_PATH, 'utf8');

  for (const forbidden of ['window.__RESCUE_SOURCE', '/__rescue/', 'data-sqsp-', 'sqsp-', 'pages.convos-with-god-clarity-on-christianity.']) {
    assert.equal(html.includes(forbidden), false, `destination page must not inherit source shell marker: ${forbidden}`);
  }

  assert.ok(html.includes('id="arcNavMount"'), 'v2 arc-nav mount must exist');
  assert.ok(html.includes('../styles/arc-nav.css'), 'arc-nav stylesheet must be linked');
  assert.ok(html.includes('../dist/vextreme-clarity-on-christianity.js'), 'page must load its generated God Script');
});

test('CONTENT FORGE CLARITY: every destination localization key resolves through collision-free provenance-distinct page sources', () => {
  const html = fs.readFileSync(PAGE_PATH, 'utf8');
  const transcript = JSON.parse(fs.readFileSync(STRINGS_PATH, 'utf8'));
  const presentation = JSON.parse(fs.readFileSync(PRESENTATION_STRINGS_PATH, 'utf8'));
  const transcriptKeys = Object.keys(transcript).filter(key => key !== '_meta');
  const presentationKeys = Object.keys(presentation).filter(key => key !== '_meta');
  const transcriptSet = new Set(transcriptKeys);
  const collisions = presentationKeys.filter(key => transcriptSet.has(key));
  const merged = {
    ...Object.fromEntries(transcriptKeys.map(key => [key, transcript[key]])),
    ...Object.fromEntries(presentationKeys.map(key => [key, presentation[key]])),
  };
  const keys = [...html.matchAll(/data-i18n="([^"]+)"/g)].map(m => m[1]);

  assert.ok(keys.length > 200, 'Clarity should expose transcript + presentation localization surfaces');
  assert.equal(transcript._meta.scope, 'pages.clarity-on-christianity');
  assert.equal(presentation._meta.scope, transcript._meta.scope);
  assert.deepEqual(collisions, [], 'provenance-distinct same-scope source files must keep disjoint key identity');

  for (const key of keys) {
    assert.ok(key.startsWith('pages.clarity-on-christianity.'), `unexpected destination key: ${key}`);
    assert.ok(merged[key], `missing same-scope string source for ${key}`);
    assert.ok(merged[key].strings?.en?.text !== undefined, `missing EN text for ${key}`);
  }

  assert.equal(transcript._meta.sourceProvenance.preservedHtmlSha256,
    '6075d5a3ac043b35b817ad1f3d9efa023b91d439cb18b58660e07ce097f26607');
  assert.equal(transcript._meta.sourceProvenance.preservedGitBlob,
    'dc5a8a3502b70b9b62bec7f3494571d584b16e2e');
  assert.equal(presentation._meta.sourceProvenance.preservedGitBlob,
    '00c06b4033077b9247033941b1362af7fad22e3f');
  assert.equal(presentation._meta.sourceProvenance.preservedPath,
    'docs/ingestion/source-pages/part-022/clarity-on-christianity.html');
});

test('CONTENT FORGE CLARITY: viewmodel preserves production defaults, v2 arc-nav, and intentional Terrain cover', () => {
  const viewmodels = JSON.parse(fs.readFileSync(VIEWMODELS_PATH, 'utf8'));
  assert.deepEqual(viewmodels['clarity-on-christianity'], {
    title: 'Clarity on Christianity',
    category: 'production',
    template: 'page',
    scopes: ['pages.clarity-on-christianity'],
    features: ['lang', 'spiral-fab', 'theme', 'map', 'analysis', 'arc-nav'],
    preview: {
      kind: 'cover',
      src: 'https://vgong24.github.io/Vextreme-Assets/__assets/93e8f45a1cf67b8a40a8f09e7143e21956987f9a0e3f14234c048fdc0e162e82.webp',
      alt: 'Clarity on Christianity — layered source, interpretation, and recognition cover art',
    },
  });
});

test('CONTENT FORGE CLARITY: existing node and arc placement are consumed without registry rewrite', () => {
  const nodes = JSON.parse(fs.readFileSync(NODES_PATH, 'utf8'));
  const arcs = JSON.parse(fs.readFileSync(ARCS_PATH, 'utf8'));
  const node = nodes.find(item => item.slug === 'clarity-on-christianity');

  assert.deepEqual(node, {
    id: 4,
    slug: 'clarity-on-christianity',
    title: 'Clarity on Christianity',
    date: 'October 8, 2025',
    arcKeys: ['convos_with_god', 'full_timeline'],
    vexData: {},
  });
  assert.ok(arcs.convos_with_god.sections.some(section => (section.slugs || []).includes('clarity-on-christianity')));
  assert.equal(arcs.full_timeline.renderMode, 'position');
});

test('CONTENT FORGE CLARITY: promoted page consumes the predecessor WIP intent instead of colliding with pages/', () => {
  assert.equal(fs.existsSync(WIP_PATH), false, 'promoted Clarity page must not retain a colliding WIP intent record');
});
