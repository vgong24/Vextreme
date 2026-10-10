'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const parse5 = require('parse5');

const ROOT = path.join(__dirname, '..');
const CASES = [
  { slug: 'receive-god', source: 'docs/ingestion/source-pages/part-016/home.html', sourceBlob: 'fbcff502843de18200239083164d0d622b6d4a1a' },
  { slug: 'take-a-walk', source: 'docs/ingestion/source-pages/part-012/take-a-walk.html', sourceBlob: '51f3f219f3095aff678667ecf28312cac7c48833' },
];

function attrs(node) { return Object.fromEntries((node.attrs || []).map(item => [item.name, item.value])); }
function walk(node, visit) { if (!node) return; visit(node); for (const child of node.childNodes || []) walk(child, visit); }
function findFirst(node, predicate) { let found = null; walk(node, current => { if (!found && predicate(current)) found = current; }); return found; }
function sourceMain(doc) { return findFirst(doc, node => node.tagName === 'main' && (attrs(node).class || '').split(/\s+/).includes('vex-authored-page-frame')); }
function projectedMain(doc, slug) { return findFirst(doc, node => node.tagName === 'main' && attrs(node)['data-vex-reader-document'] === slug); }

function visibleTextLeaves(root) {
  const out = [];
  function visit(node, suppressed) {
    const nextSuppressed = suppressed || ['script', 'style', 'noscript', 'template'].includes(node.tagName);
    if (!nextSuppressed && node.nodeName === '#text') {
      const value = String(node.value || '').replace(/\s+/g, ' ').trim();
      if (value) out.push(value);
    }
    for (const child of node.childNodes || []) visit(child, nextSuppressed);
  }
  visit(root, false);
  return out;
}
function countTag(root, tag) { let count = 0; walk(root, node => { if (node.tagName === tag) count += 1; }); return count; }

test('TERRAIN ENTRY: preserved authored visible text and semantic structure survive provider-shell projection', () => {
  for (const entry of CASES) {
    const sourceHtml = fs.readFileSync(path.join(ROOT, entry.source), 'utf8');
    const pageHtml = fs.readFileSync(path.join(ROOT, 'pages', entry.slug + '.html'), 'utf8');
    const source = sourceMain(parse5.parse(sourceHtml));
    const projected = projectedMain(parse5.parse(pageHtml), entry.slug);
    assert.ok(source, entry.slug + ': preserved authored main must exist');
    assert.ok(projected, entry.slug + ': projected reader document must exist');
    assert.deepEqual(visibleTextLeaves(projected), visibleTextLeaves(source), entry.slug + ': visible authored text/order drifted');
    for (const tag of ['h1', 'h2', 'h3', 'p', 'ul', 'ol', 'li', 'strong', 'em', 'img', 'a']) {
      assert.equal(countTag(projected, tag), countTag(source, tag), entry.slug + ': ' + tag + ' structure drifted');
    }
    assert.ok(pageHtml.includes('preserved blob ' + entry.sourceBlob + '.'), entry.slug + ': exact preserved blob provenance missing');
  }
});

test('TERRAIN ENTRY: active documents are provider-neutral repository pages outside the archive record pipeline', () => {
  const { SKIP_PAGES, AUTO_DISCOVERY_EXCLUSIONS, getRecordPageSlugs } = require('../lib/audit-pages');
  const records = new Set(getRecordPageSlugs());
  for (const entry of CASES) {
    const html = fs.readFileSync(path.join(ROOT, 'pages', entry.slug + '.html'), 'utf8');
    assert.ok(SKIP_PAGES[entry.slug], entry.slug + ': explicit entry-document classification missing');
    assert.ok(AUTO_DISCOVERY_EXCLUSIONS[entry.slug], entry.slug + ': shared record exclusion missing');
    assert.equal(records.has(entry.slug), false, entry.slug + ': entry document leaked into archive/Terrain record inventory');
    for (const forbidden of ['www.vextreme24.com','/__rescue/','/__vex/','/__localization/','vex-native-site-nav','cdn.jsdelivr.net/gh/vgong24/vextreme','data-vex-id=','data-i18n=']) {
      assert.equal(html.includes(forbidden), false, entry.slug + ': retained provider/runtime marker ' + forbidden);
    }
    assert.doesNotMatch(html, /(?:href|src)=["']\/(?!\/)/, entry.slug + ': root-relative provider-era active route remains');
  }
});

test('TERRAIN ENTRY: Receive God owns the ordered continuation and archive handoff instead of exposing Take a Walk as an arrival peer', () => {
  const html = fs.readFileSync(path.join(ROOT, 'pages', 'receive-god.html'), 'utf8');
  assert.match(html, /href="take-a-walk\.html"/);
  assert.match(html, /data-terrain-action="archives"/);
  assert.match(html, /type:'vextreme\.terrain-entry\/v1'/);
  assert.match(html, /data-vex-route-state="held-not-ported"/);
  assert.doesNotMatch(html, /href="(?:direct-contact|ai-practitioner-tools)\.html"/);
});

test('TERRAIN ENTRY: Take a Walk resolves preserved image identities through the existing public asset origin', () => {
  const html = fs.readFileSync(path.join(ROOT, 'pages', 'take-a-walk.html'), 'utf8');
  for (const id of [
    'd841ecc067417e2bf633c09b5a3fe2f5f04dbb1cfa176c5665b183d507fd4ea5.png',
    '51b6ecf92cd10ed3397e425a15616e241f6ee355150fc632759f43957643066c.png',
  ]) {
    assert.ok(html.includes('https://vgong24.github.io/Vextreme-Assets/__assets/' + id), 'missing resolved asset ' + id);
  }
});

// [VXG RealForever]
