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
const VIEWMODELS_PATH = path.join(ROOT, 'data', 'viewmodels.json');
const NODES_PATH = path.join(ROOT, 'data', 'nodes.json');
const ARCS_PATH = path.join(ROOT, 'data', 'arcs-v2.json');

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

function normalizedText(node) {
  return textOf(node).replace(/\s+/g, ' ').trim();
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
  assert.equal(normalizedText(dst), normalizedText(src), 'projected authored text/order must match Part-028');

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

test('CONTENT FORGE CLARITY: canonical string source owns every destination data-i18n key with EN text', () => {
  const html = fs.readFileSync(PAGE_PATH, 'utf8');
  const source = JSON.parse(fs.readFileSync(STRINGS_PATH, 'utf8'));
  const keys = [...html.matchAll(/data-i18n="([^"]+)"/g)].map(m => m[1]);
  assert.ok(keys.length > 20, 'projected article should expose substantial page-owned localization surface');

  for (const key of keys) {
    assert.ok(key.startsWith('pages.clarity-on-christianity.'), `unexpected page string key: ${key}`);
    assert.ok(source[key], `missing canonical string source for ${key}`);
    assert.ok(source[key].strings && source[key].strings.en && source[key].strings.en.text,
      `missing EN text for ${key}`);
  }

  assert.equal(source._meta.scope, 'pages.clarity-on-christianity');
  assert.equal(source._meta.category, 'production');
  assert.equal(source._meta.sourceProvenance.preservedHtmlSha256,
    '6075d5a3ac043b35b817ad1f3d9efa023b91d439cb18b58660e07ce097f26607');
});

test('CONTENT FORGE CLARITY: viewmodel preserves production defaults and adds v2 arc-nav only', () => {
  const viewmodels = JSON.parse(fs.readFileSync(VIEWMODELS_PATH, 'utf8'));
  assert.deepEqual(viewmodels['clarity-on-christianity'], {
    title: 'Clarity on Christianity',
    category: 'production',
    template: 'page',
    scopes: ['pages.clarity-on-christianity'],
    features: ['lang', 'spiral-fab', 'theme', 'map', 'analysis', 'arc-nav'],
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
