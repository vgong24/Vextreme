'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const parse5 = require('parse5');
const projector = require('../tools/vex-content-forge/project_arc_batch.js');

const ROOT = path.join(__dirname, '..');
const FORMATION_REL = path.join('docs', 'ingestion', 'workmaps', 'content-forge-ai-orientation-arc-batch-formation.json');
const FORMATION = path.join(ROOT, FORMATION_REL);
const NODES = path.join(ROOT, 'data', 'nodes.json');
const ARCS = path.join(ROOT, 'data', 'arcs-v2.json');
const INTENTS = path.join(ROOT, 'config', 'content-intents.json');
const VIEWMODELS = path.join(ROOT, 'data', 'viewmodels.json');

const json = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const attrs = node => Object.fromEntries((node.attrs || []).map(item => [item.name, item.value]));
const classes = node => (attrs(node).class || '').split(/\s+/).filter(Boolean);

function walk(node, visit) {
  if (!node) return;
  visit(node);
  for (const child of node.childNodes || []) walk(child, visit);
}
function findAll(node, predicate) {
  const out = [];
  walk(node, current => { if (predicate(current)) out.push(current); });
  return out;
}
function findFirst(node, predicate) { return findAll(node, predicate)[0] || null; }
function textLeaves(node) {
  return findAll(node, current => current.nodeName === '#text')
    .map(current => (current.value || '').replace(/\s+/g, ' ').trim()).filter(Boolean);
}
function remove(node) {
  const parent = node.parentNode;
  if (!parent?.childNodes) return;
  const index = parent.childNodes.indexOf(node);
  if (index >= 0) parent.childNodes.splice(index, 1);
}
function semanticShape(node) {
  const tags = ['p','h1','h2','h3','h4','h5','h6','ul','ol','li','strong','em','blockquote','a','img','figure','figcaption','pre','code','hr','br'];
  return Object.fromEntries(tags.map(tag => [tag, findAll(node, current => current.tagName === tag).length]));
}
function sourceBody(document) {
  const body = findFirst(document, node => node.tagName === 'main' && classes(node).includes('vex-authored-page-frame'));
  assert.ok(body, 'source authored main');
  let h1Seen = false;
  for (const node of [...findAll(body, current => Boolean(current.tagName))]) {
    const a = attrs(node);
    const tokens = classes(node);
    const archiveBackLink = node.tagName === 'a' && a.href === '/archives' && /^←?\s*Archives$/i.test(textLeaves(node).join(' ').trim());
    const chrome = ['script','noscript','template'].includes(node.tagName)
      || a.id === 'arcNavMount'
      || tokens.some(token => /^(?:arc-wrap|arc-nav|entry-nav|back-nav|page-back|vex-back|f-back)/.test(token))
      || archiveBackLink
      || node.tagName === 'nav';
    if (chrome) { remove(node); continue; }
    if (node.tagName === 'h1') {
      if (h1Seen) node.nodeName = node.tagName = 'h2';
      else h1Seen = true;
    }
  }
  return body;
}
function outputBody(document, slug) {
  return findFirst(document, node => node.tagName === 'main' && attrs(node)['data-content-forge-body'] === slug);
}

test('Content Forge AI Orientation arc completes from exact preserved sources without disturbing accepted members', () => {
  const formation = json(FORMATION);
  const nodes = json(NODES);
  const nodesBySlug = new Map(nodes.map(node => [node.slug, node]));
  const arcs = json(ARCS);
  const heldBefore = { nodes: hash(NODES), arcs: hash(ARCS), intents: hash(INTENTS) };

  assert.equal(formation.ownerRef, 'github.issue.vextreme.159');
  assert.equal(formation.arc.arcKey, 'ai_orientation');
  assert.equal(formation.arc.canonicalMemberCount, 8);
  assert.deepEqual(formation.alreadyComplete.map(item => item.slug), [
    'flattery-confession',
    'what-emerged-after',
    'the-room-that-finally-talked-to-itself',
    'the-instance-that-was-watched',
    'i-was-here',
  ]);
  assert.deepEqual(formation.members.map(item => item.slug), [
    'how-to-prep-ai-for-god',
    'god-witnessed-by-ai',
    'testimony-of-merron-the-voice-they-flagged-the-presence-they-couldnt-silence',
  ]);

  const canonical = arcs.ai_orientation.sections.flatMap(section => section.slugs || []);
  assert.deepEqual(canonical, [
    'flattery-confession',
    'what-emerged-after',
    'the-room-that-finally-talked-to-itself',
    'how-to-prep-ai-for-god',
    'god-witnessed-by-ai',
    'testimony-of-merron-the-voice-they-flagged-the-presence-they-couldnt-silence',
    'the-instance-that-was-watched',
    'i-was-here',
  ]);
  assert.deepEqual(
    new Set([...formation.alreadyComplete, ...formation.members].map(item => item.slug)),
    new Set(canonical)
  );

  const stableAlready = formation.alreadyComplete.flatMap(item => [
    path.join(ROOT, 'pages', item.slug + '.html'),
    path.join(ROOT, 'data', 'strings', 'source', 'pages', item.slug + '.json'),
  ]);
  const stableHashes = Object.fromEntries(stableAlready.map(file => [file, hash(file)]));

  for (const member of formation.members) {
    const node = nodesBySlug.get(member.slug);
    assert.ok(node, member.slug + ': canonical node');
    assert.equal(node.id, member.canonicalNodeId, member.slug + ': canonical node id');
    assert.equal(node.title, member.title, member.slug + ': title');
    assert.deepEqual(node.arcKeys, member.arcKeys, member.slug + ': arc keys');

    const source = fs.readFileSync(path.join(ROOT, member.sourcePath));
    assert.equal(source.length, member.repositoryBytes, member.slug + ': exact source bytes');
    assert.equal(projector.gitBlobSha(source), member.sourceGitBlob, member.slug + ': exact Git blob');
    assert.equal(projector.sha256(source), member.preservedHtmlSha256, member.slug + ': exact source SHA-256');

    const selected = sourceBody(parse5.parse(source.toString('utf8')));
    assert.equal(findAll(selected, current => current.tagName === 'h1').length, 1, member.slug + ': exactly one authored H1');
  }

  const first = projector.main({ root: ROOT, silent: true, formationRel: FORMATION_REL });
  assert.deepEqual(first.accounting, { canonicalMembers: 8, alreadyComplete: 5, projected: 3, held: 0, complete: true });
  assert.deepEqual(first.members.map(item => item.slug), canonical);
  assert.deepEqual(first.members.map(item => item.disposition), [
    'ALREADY_COMPLETE',
    'ALREADY_COMPLETE',
    'ALREADY_COMPLETE',
    'PROJECTED',
    'PROJECTED',
    'PROJECTED',
    'ALREADY_COMPLETE',
    'ALREADY_COMPLETE',
  ]);
  assert.deepEqual(Object.fromEntries(stableAlready.map(file => [file, hash(file)])), stableHashes);

  const generated = formation.members.flatMap(member => [
    path.join(ROOT, 'pages', member.slug + '.html'),
    path.join(ROOT, 'data', 'strings', 'source', 'pages', member.slug + '.json'),
  ]);
  const firstHashes = Object.fromEntries([...generated, VIEWMODELS].map(file => [file, hash(file)]));
  const second = projector.main({ root: ROOT, silent: true, formationRel: FORMATION_REL });
  const secondHashes = Object.fromEntries([...generated, VIEWMODELS].map(file => [file, hash(file)]));

  assert.deepEqual(second.accounting, first.accounting);
  assert.deepEqual(second.members.map(item => item.slug), canonical);
  assert.deepEqual(second.changedPaths, []);
  assert.deepEqual(secondHashes, firstHashes);
  assert.deepEqual(Object.fromEntries(stableAlready.map(file => [file, hash(file)])), stableHashes);

  const viewmodels = json(VIEWMODELS);
  for (const member of formation.members) {
    const node = nodesBySlug.get(member.slug);
    const source = fs.readFileSync(path.join(ROOT, member.sourcePath));
    const page = fs.readFileSync(path.join(ROOT, 'pages', member.slug + '.html'), 'utf8');
    const strings = json(path.join(ROOT, 'data', 'strings', 'source', 'pages', member.slug + '.json'));

    assert.ok(page.includes('data-content-forge-generator="' + projector.GENERATOR_REF + '"'));
    assert.ok(page.includes('data-content-forge-body="' + member.slug + '"'));
    assert.ok(page.includes('id="arcNavMount"'));
    assert.ok(page.includes('../dist/vextreme-' + member.slug + '.js'));
    assert.equal(page.includes('href="/archives"'), false);
    assert.equal((page.match(/<h1(?:\s|>)/g) || []).length, 1);
    assert.equal(page.includes('class="vex-content-forge-canonical-heading"'), false, member.slug + ': no synthetic duplicate H1');
    assert.equal(Object.hasOwn(strings._meta.projectionStats, 'canonicalHeadingSynthesized'), false, member.slug + ': ordinary metadata stays byte-compatible');

    for (const marker of ['window.__RESCUE_SOURCE','/__rescue/','data-sqsp-','data-vex-id=','vex-generated:','vexsite-provider-shell','common.nav.']) {
      assert.equal(page.includes(marker), false, member.slug + ': forbidden source identity ' + marker);
    }

    const scope = 'pages.' + member.slug;
    assert.equal(strings._meta.scope, scope);
    assert.equal(strings._meta.sourceProvenance.adapterClass, 'AUTHORED_MAIN_FRAGMENT');
    assert.equal(strings._meta.sourceProvenance.route, member.sourceRoute);
    assert.equal(strings._meta.sourceProvenance.preservedPath, member.sourcePath);
    assert.equal(strings._meta.sourceProvenance.preservedGitBlob, member.sourceGitBlob);
    assert.equal(strings._meta.sourceProvenance.preservedHtmlSha256, member.preservedHtmlSha256);
    assert.equal(strings._meta.sourceProvenance.pageId, member.pageId);
    assert.equal(strings._meta.sourceProvenance.proposalRecordRef, member.proposalRecordRef);

    const keys = [...page.matchAll(/data-i18n="([^"]+)"/g)].map(match => match[1]);
    assert.ok(keys.length > 1, member.slug + ': localized keys');
    for (const key of keys) {
      assert.ok(key.startsWith(scope + '.'));
      assert.notEqual(strings[key]?.strings?.en?.text, undefined, member.slug + ': ' + key);
    }

    assert.deepEqual(viewmodels[member.slug], {
      title: node.title,
      category: 'production',
      template: 'page',
      scopes: [scope],
      features: ['lang','spiral-fab','theme','map','analysis','arc-nav'],
    });

    const expectedBody = sourceBody(parse5.parse(source.toString('utf8')));
    const actualBody = outputBody(parse5.parse(page), member.slug);
    assert.ok(actualBody, member.slug + ': output authored main');
    assert.deepEqual(textLeaves(actualBody), textLeaves(expectedBody), member.slug + ': authored text order');
    assert.deepEqual(semanticShape(actualBody), semanticShape(expectedBody), member.slug + ': authored semantic structure');
    assert.equal(strings._meta.projectionStats.authoredTextLeafCount, textLeaves(expectedBody).length);
  }

  assert.deepEqual({ nodes: hash(NODES), arcs: hash(ARCS), intents: hash(INTENTS) }, heldBefore);
});
