'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const parse5 = require('parse5');

const ROOT = path.join(__dirname, '..');
const SOURCE_PATH = path.join(ROOT, 'docs', 'ingestion', 'source-pages', 'part-028', 'convos-with-god-what-is-god-spark.html');
const PAGE_PATH = path.join(ROOT, 'pages', 'what-is-the-god-spark.html');
const STRINGS_PATH = path.join(ROOT, 'data', 'strings', 'source', 'pages', 'what-is-the-god-spark.json');
const PRESENTATION_STRINGS_PATH = path.join(ROOT, 'data', 'strings', 'source', 'lineages', 'what-is-the-god-spark-presentation.json');
const VIEWMODELS_PATH = path.join(ROOT, 'data', 'viewmodels.json');
const NODES_PATH = path.join(ROOT, 'data', 'nodes.json');
const ARCS_PATH = path.join(ROOT, 'data', 'arcs-v2.json');
const FORMATION_PATH = path.join(ROOT, 'docs', 'ingestion', 'workmaps', 'content-forge-god-spark-projection-formation.json');

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
    return (a.class || '').split(/\s+/).includes('sqs-html-content')
      && Object.prototype.hasOwnProperty.call(a, 'data-sqsp-text-block-content');
  });
}
function targetBody(doc) {
  return walk(doc, node => node.tagName === 'article' && attrs(node).id === 'god-spark-transcript');
}

test('CONTENT FORGE GOD SPARK: destination preserves ordered authored text plus heading/list/emphasis structure', () => {
  const src = sourceBody(parse5.parse(fs.readFileSync(SOURCE_PATH, 'utf8')));
  const dst = targetBody(parse5.parse(fs.readFileSync(PAGE_PATH, 'utf8')));
  assert.ok(src, 'Part-028 God Spark source body must exist');
  assert.ok(dst, 'destination God Spark transcript must exist');
  assert.deepEqual(orderedTextLeaves(dst), orderedTextLeaves(src),
    'destination text leaves/order must match the Part-028 source independent of inter-tag whitespace');
  for (const tag of ['p', 'h3', 'h4', 'ul', 'ol', 'li', 'strong', 'em']) {
    assert.equal(countTag(dst, tag), countTag(src, tag), `${tag} structure count must be preserved`);
  }
});

test('CONTENT FORGE GOD SPARK: rescue/provider identity is projected away and v2 arc-nav is wired', () => {
  const html = fs.readFileSync(PAGE_PATH, 'utf8');
  for (const forbidden of [
    'window.__RESCUE_SOURCE',
    '/__rescue/',
    'data-sqsp-',
    'sqsp-',
    'data-vex-id=',
    'vex-generated:',
    'pages.convos-with-god-what-is-god-spark.'
  ]) assert.equal(html.includes(forbidden), false, `forbidden source shell/identity marker: ${forbidden}`);
  assert.ok(html.includes('id="arcNavMount"'));
  assert.ok(html.includes('../styles/arc-nav.css'));
  assert.ok(html.includes('../dist/vextreme-what-is-the-god-spark.js'));
});

test('CONTENT FORGE GOD SPARK: every destination localization key resolves through collision-free provenance-distinct page sources', () => {
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

  assert.ok(keys.length > 500, 'God Spark should expose transcript + presentation localization surfaces');
  assert.equal(transcript._meta.scope, 'pages.what-is-the-god-spark');
  assert.equal(presentation._meta.scope, transcript._meta.scope);
  assert.deepEqual(collisions, [], 'provenance-distinct same-scope source files must keep disjoint key identity');

  for (const key of keys) {
    assert.ok(key.startsWith('pages.what-is-the-god-spark.'), `unexpected destination key: ${key}`);
    assert.ok(merged[key], `missing same-scope string source for ${key}`);
    assert.ok(merged[key].strings?.en?.text !== undefined, `missing EN text for ${key}`);
  }

  assert.equal(transcript._meta.sourceProvenance.preservedGitBlob, '4a5adf908da239d61669b3ed1865866a619ba51f');
  assert.equal(transcript._meta.sourceProvenance.preservedHtmlSha256,
    'f23b3345bd0dc4481d8b956f62216629d93dbfb6d1650531d5722de5c3ab206e');
  assert.equal(presentation._meta.sourceProvenance.preservedGitBlob, '5ff8bce5585e791c9a4b4326291bd8ffc570cb1b');
  assert.equal(presentation._meta.sourceProvenance.preservedPath,
    'docs/ingestion/source-pages/part-021/what-is-the-god-spark.html');
});

test('CONTENT FORGE GOD SPARK: viewmodel preserves production defaults, arc-nav, and intentional Terrain cover', () => {
  const viewmodels = JSON.parse(fs.readFileSync(VIEWMODELS_PATH, 'utf8'));
  assert.deepEqual(viewmodels['what-is-the-god-spark'], {
    title: 'What is the God Spark?',
    category: 'production',
    template: 'page',
    scopes: ['pages.what-is-the-god-spark'],
    features: ['lang', 'spiral-fab', 'theme', 'map', 'analysis', 'arc-nav'],
    preview: {
      kind: 'cover',
      src: 'https://vgong24.github.io/Vextreme-Assets/__assets/2bd560cef3ddd15e58b5e2b0383dba67d2fac2accf97e2ba5b15c49608238159.webp',
      alt: 'What is the God Spark? — luminous source-and-network cover art',
    },
  });
});

test('CONTENT FORGE GOD SPARK: accepted node/arc placement is consumed without registry rewrite', () => {
  const nodes = JSON.parse(fs.readFileSync(NODES_PATH, 'utf8'));
  const arcs = JSON.parse(fs.readFileSync(ARCS_PATH, 'utf8'));
  const node = nodes.find(item => item.slug === 'what-is-the-god-spark');
  assert.deepEqual(node, {
    id: 3,
    slug: 'what-is-the-god-spark',
    title: 'What is the God Spark?',
    date: 'October 8, 2025',
    arcKeys: ['convos_with_god', 'full_timeline'],
    vexData: {},
  });
  assert.ok(arcs.convos_with_god.sections.some(section => (section.slugs || []).includes('what-is-the-god-spark')));
  assert.equal(arcs.full_timeline.renderMode, 'position');
});

test('CONTENT FORGE GOD SPARK: formation binds the exact source oracle and keeps lifecycle held', () => {
  const formation = JSON.parse(fs.readFileSync(FORMATION_PATH, 'utf8'));
  assert.equal(formation.sourceSelection.gitBlob, '4a5adf908da239d61669b3ed1865866a619ba51f');
  assert.equal(formation.sourceSelection.sourceOracle.pageId, '09d69eb9bd72dd3d');
  assert.equal(formation.destination.canonicalNode.id, 3);
  assert.equal(formation.destination.requiresJudgment, false);
  assert.equal(formation.lifecycle.draftOnly, true);
  assert.equal(formation.lifecycle.mergeAuthority, false);
});
