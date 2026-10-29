'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const parse5 = require('parse5');
const groupHomes = require('../tools/vex-content-forge/project_group_homes');

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
    assert.ok(pageHtml.includes('<script src="../widgets/fab-read-aloud.js"></script>'), entry.slug + ': standalone/embedded reader must carry site Read Aloud through a provider-neutral local asset');
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
    for (const forbidden of ['www.vextreme24.com','/__rescue/','/__vex/','/__localization/','vex-native-site-nav','cdn.jsdelivr.net/gh/vgong24/vextreme','data-vex-id=']) {
      assert.equal(html.includes(forbidden), false, entry.slug + ': retained provider/runtime marker ' + forbidden);
    }
    if (['receive-god', 'take-a-walk'].includes(entry.slug)) {
      assert.match(html, /data-i18n=/, entry.slug + ': Global Core source identities must stay bound');
    } else {
      assert.equal(html.includes('data-i18n='), false, entry.slug + ': localization identity adopted before its own source row');
    }
    assert.doesNotMatch(html, /(?:href|src)=["']\/(?!\/)/, entry.slug + ': root-relative provider-era active route remains');
  }
});

test('TERRAIN ENTRY: Receive God Global Core source is complete and exactly bound to preserved English', () => {
  const requiredLocales = ['en','ja','zh','ko','fr','de','es','pt','ar','hi'];
  const source = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'strings', 'source', 'pages', 'receive-god.json'), 'utf8'));
  const html = fs.readFileSync(path.join(ROOT, 'pages', 'receive-god.html'), 'utf8');
  const doc = parse5.parse(html);
  const bindings = [];

  walk(doc, node => {
    const key = attrs(node)['data-i18n'];
    if (!key) return;
    bindings.push(key);
    assert.ok(source[key], key + ': bound identity missing from source');
    assert.equal(
      visibleTextLeaves(node).join(' '),
      source[key].strings.en.text,
      key + ': bound English text drifted from preserved page copy',
    );
  });

  const sourceKeys = Object.keys(source).filter(key => key !== '_meta');
  assert.equal(source._meta.scope, 'pages.receive-god');
  assert.equal(source._meta.sourceProvenance.preservedGitBlob, 'fbcff502843de18200239083164d0d622b6d4a1a');
  assert.equal(source._meta.projectionStats.authoredTextLeafCount, 59);
  assert.equal(source._meta.projectionStats.boundIdentityCount, 60);
  assert.equal(bindings.length, 60, 'Receive God binding count drifted');
  assert.equal(new Set(bindings).size, 60, 'Receive God binding identities must be unique');
  assert.deepEqual([...bindings].sort(), [...sourceKeys].sort(), 'page/source identity set drifted');

  for (const key of sourceKeys) {
    const strings = source[key].strings;
    assert.deepEqual(Object.keys(strings).sort(), [...requiredLocales].sort(), key + ': Global Core locale set drifted');
    for (const locale of requiredLocales) {
      assert.equal(typeof strings[locale].text, 'string', key + ': ' + locale + ' text missing');
      assert.ok(strings[locale].text.trim(), key + ': ' + locale + ' text empty');
    }
  }
});

test('TERRAIN ENTRY: Take a Walk Global Core source is complete and exactly bound to preserved English', () => {
  const requiredLocales = ['en','ja','zh','ko','fr','de','es','pt','ar','hi'];
  const source = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'strings', 'source', 'pages', 'take-a-walk.json'), 'utf8'));
  const html = fs.readFileSync(path.join(ROOT, 'pages', 'take-a-walk.html'), 'utf8');
  const doc = parse5.parse(html);
  const bindings = [];

  walk(doc, node => {
    const key = attrs(node)['data-i18n'];
    if (!key) return;
    bindings.push(key);
    assert.ok(source[key], key + ': bound identity missing from source');
    assert.equal(
      visibleTextLeaves(node).join(' '),
      source[key].strings.en.text,
      key + ': bound English text drifted from preserved page copy',
    );
  });

  const sourceKeys = Object.keys(source).filter(key => key !== '_meta');
  assert.equal(source._meta.scope, 'pages.take-a-walk');
  assert.equal(source._meta.sourceProvenance.preservedGitBlob, '51f3f219f3095aff678667ecf28312cac7c48833');
  assert.equal(source._meta.projectionStats.authoredTextLeafCount, 84);
  assert.equal(source._meta.projectionStats.boundIdentityCount, 85);
  assert.equal(bindings.length, 85, 'Take a Walk binding count drifted');
  assert.equal(new Set(bindings).size, 85, 'Take a Walk binding identities must be unique');
  assert.deepEqual([...bindings].sort(), [...sourceKeys].sort(), 'Take a Walk page/source identity set drifted');

  for (const key of sourceKeys) {
    const strings = source[key].strings;
    assert.deepEqual(Object.keys(strings).sort(), [...requiredLocales].sort(), key + ': Global Core locale set drifted');
    for (const locale of requiredLocales) {
      assert.equal(typeof strings[locale].text, 'string', key + ': ' + locale + ' text missing');
      assert.ok(strings[locale].text.trim(), key + ': ' + locale + ' text empty');
    }
  }
});

test('TERRAIN ENTRY: Receive God owns the ordered continuation, archive handoff, and live group-home primary paths', () => {
  const html = fs.readFileSync(path.join(ROOT, 'pages', 'receive-god.html'), 'utf8');
  assert.match(html, /href="take-a-walk\.html"/);
  assert.match(html, /data-terrain-action="archives"/);
  assert.match(html, /type:'vextreme\.terrain-entry\/v1'/);
  assert.ok(html.includes('href="terrain-map.html?view=content&amp;profile=evolution-v1&amp;group=direct_contact&amp;page=direct-contact" target="_parent" data-terrain-action="group-home" data-terrain-group="direct_contact"'));
  assert.ok(html.includes('href="terrain-map.html?view=content&amp;profile=evolution-v1&amp;group=ai_practitioner_tools&amp;page=ai-practitioner-tools" target="_parent" data-terrain-action="group-home" data-terrain-group="ai_practitioner_tools"'));
  assert.ok(html.includes("group:link.getAttribute('data-terrain-group') || null"));
  assert.doesNotMatch(html, /held-not-ported/);
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

test('TERRAIN GROUP HOME: Direct Contact and AI Practitioner Tools are deterministic provider-neutral parent documents outside record membership', () => {
  const formation = JSON.parse(fs.readFileSync(path.join(ROOT, groupHomes.FORMATION_REL), 'utf8'));
  const projected = groupHomes.projectFormation(ROOT, { write:false });
  const { SKIP_PAGES, getRecordPageSlugs } = require('../lib/audit-pages');
  const records = new Set(getRecordPageSlugs());
  const arcs = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'arcs-v2.json'), 'utf8'));

  assert.deepEqual(projected.map(item => item.member.slug), ['direct-contact','ai-practitioner-tools']);
  for (const output of projected) {
    const member = output.member;
    const committed = fs.readFileSync(path.join(ROOT, 'pages', member.slug + '.html'), 'utf8');
    assert.equal(committed, output.page, member.slug + ': committed group home must equal source-managed projection');
    assert.ok(SKIP_PAGES[member.slug], member.slug + ': group home classification missing');
    assert.equal(records.has(member.slug), false, member.slug + ': group home leaked into ordinary record discovery');
    assert.equal(arcs[member.groupKey].parent.pageSlug, member.slug);
    assert.equal(arcs[member.groupKey].parent.url, '/Vextreme/pages/' + member.slug + '.html');
    assert.match(committed, /data-vex-surface="group-home"/);
    assert.ok(committed.includes('<script src="../widgets/fab-read-aloud.js"></script>'), member.slug + ': group-home projection must carry site Read Aloud without adopting the archive runtime');
    assert.doesNotMatch(committed, /www\.vextreme24\.com|\/__rescue\/|\/__vex\/|data-vex-id=|data-i18n=/);
    assert.doesNotMatch(committed, /(?:href|src)=["']\/(?!\/)/);
  }
});


// [VXG RealForever]
