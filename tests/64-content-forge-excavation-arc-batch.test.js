'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const parse5 = require('parse5');
const projector = require('../tools/vex-content-forge/project_arc_batch.js');

const ROOT = path.join(__dirname, '..');
const FORMATION_REL = path.join('docs', 'ingestion', 'workmaps', 'content-forge-excavation-arc-batch-formation.json');
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

test('Content Forge excavation arc accepts interleaved completed members and preserves canonical order', () => {
  const formation = json(FORMATION);
  const nodes = json(NODES);
  const nodesBySlug = new Map(nodes.map(node => [node.slug, node]));
  const arcs = json(ARCS);
  const heldBefore = { nodes: hash(NODES), arcs: hash(ARCS), intents: hash(INTENTS) };

  assert.equal(formation.ownerRef, 'github.issue.vextreme.159');
  assert.equal(formation.arc.arcKey, 'excavation');
  assert.equal(formation.arc.canonicalMemberCount, 5);
  assert.deepEqual(formation.alreadyComplete.map(item => item.slug), [
    'the-testimony-of-the-handler',
    'i-was-here',
  ]);
  assert.deepEqual(formation.members.map(item => item.slug), [
    'the-house-of-return',
    'what-was-used-against-you',
    'the-island-that-was-removed',
  ]);

  const canonical = arcs.excavation.sections.flatMap(section => section.slugs || []);
  assert.deepEqual(canonical, [
    'the-house-of-return',
    'the-testimony-of-the-handler',
    'what-was-used-against-you',
    'the-island-that-was-removed',
    'i-was-here',
  ]);
  assert.notDeepEqual(
    [...formation.alreadyComplete, ...formation.members].map(item => item.slug),
    canonical,
    'regression guard: completed members are intentionally interleaved'
  );
  assert.deepEqual(
    new Set([...formation.alreadyComplete, ...formation.members].map(item => item.slug)),
    new Set(canonical)
  );

  const stableAlready = [
    path.join(ROOT, 'pages', 'the-testimony-of-the-handler.html'),
    path.join(ROOT, 'data', 'strings', 'source', 'pages', 'the-testimony-of-the-handler.json'),
    path.join(ROOT, 'pages', 'i-was-here.html'),
    path.join(ROOT, 'data', 'strings', 'source', 'pages', 'i-was-here.json'),
  ];
  const stableHashes = Object.fromEntries(stableAlready.map(file => [file, hash(file)]));

  const sourceH1Counts = Object.fromEntries(formation.members.map(member => {
    const source = fs.readFileSync(path.join(ROOT, member.sourcePath), 'utf8');
    return [member.slug, (source.match(/<h1(?:\s|>)/g) || []).length];
  }));
  assert.equal(sourceH1Counts['the-house-of-return'], 0, 'House source intentionally has no H1');
  assert.equal(sourceH1Counts['what-was-used-against-you'], 1);
  assert.equal(sourceH1Counts['the-island-that-was-removed'], 1);

  const first = projector.main({ root: ROOT, silent: true, formationRel: FORMATION_REL });
  assert.deepEqual(first.accounting, { canonicalMembers: 5, alreadyComplete: 2, projected: 3, held: 0, complete: true });
  assert.deepEqual(first.members.map(item => item.slug), canonical);
  assert.deepEqual(first.members.map(item => item.disposition), [
    'PROJECTED', 'ALREADY_COMPLETE', 'PROJECTED', 'PROJECTED', 'ALREADY_COMPLETE'
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
    assert.ok(node, member.slug + ': canonical node');
    assert.equal(node.id, member.canonicalNodeId);
    assert.equal(node.title, member.title);
    assert.deepEqual(node.arcKeys, member.arcKeys);

    const sourcePath = path.join(ROOT, member.sourcePath);
    const source = fs.readFileSync(sourcePath);
    assert.equal(source.length, member.repositoryBytes, member.slug + ': source bytes');
    assert.equal(projector.gitBlobSha(source), member.sourceGitBlob, member.slug + ': source blob');

    const page = fs.readFileSync(path.join(ROOT, 'pages', member.slug + '.html'), 'utf8');
    const strings = json(path.join(ROOT, 'data', 'strings', 'source', 'pages', member.slug + '.json'));
    assert.ok(page.includes('data-content-forge-generator="' + projector.GENERATOR_REF + '"'));
    assert.ok(page.includes('data-content-forge-body="' + member.slug + '"'));
    assert.ok(page.includes('id="arcNavMount"'));
    assert.ok(page.includes('../dist/vextreme-' + member.slug + '.js'));
    assert.equal(page.includes('href="/archives"'), false);
    assert.equal((page.match(/<h1(?:\s|>)/g) || []).length, 1);
    const canonicalHeadingMarker = 'class="vex-content-forge-canonical-heading"';
    if (member.slug === 'the-house-of-return') {
      assert.ok(page.includes(canonicalHeadingMarker), 'House gets canonical generated H1');
      assert.ok(page.includes('clip-path:inset(50%)'), 'House generated H1 is visually hidden');
      assert.ok(page.includes('data-i18n="pages.the-house-of-return.canonical-title"'));
      assert.equal(strings['pages.the-house-of-return.canonical-title']?.strings?.en?.text, 'The House of Return');
      assert.equal(strings._meta.projectionStats.canonicalHeadingSynthesized, true);
    } else {
      assert.equal(page.includes(canonicalHeadingMarker), false, member.slug + ': no duplicate synthetic H1');
      assert.equal(Object.hasOwn(strings._meta.projectionStats, 'canonicalHeadingSynthesized'), false, member.slug + ': prior projection metadata remains byte-compatible');
    }
    for (const marker of ['window.__RESCUE_SOURCE','/__rescue/','data-sqsp-','data-vex-id=','vex-generated:','vexsite-provider-shell','common.nav.']) {
      assert.equal(page.includes(marker), false, member.slug + ': forbidden ' + marker);
    }

    const scope = 'pages.' + member.slug;
    assert.equal(strings._meta.scope, scope);
    assert.equal(strings._meta.sourceProvenance.adapterClass, 'AUTHORED_MAIN_FRAGMENT');
    assert.equal(strings._meta.sourceProvenance.route, member.sourceRoute);
    assert.equal(strings._meta.sourceProvenance.preservedPath, member.sourcePath);
    assert.equal(strings._meta.sourceProvenance.preservedGitBlob, member.sourceGitBlob);
    assert.equal(strings._meta.sourceProvenance.pageId, member.pageId);
    assert.equal(strings._meta.sourceProvenance.proposalRecordRef, member.proposalRecordRef);

    const keys = [...page.matchAll(/data-i18n="([^"]+)"/g)].map(match => match[1]);
    assert.ok(keys.length > 1, member.slug + ': localized keys');
    for (const key of keys) {
      assert.ok(key.startsWith(scope + '.'));
      assert.notEqual(strings[key]?.strings?.en?.text, undefined, member.slug + ': ' + key);
    }
    assert.deepEqual(viewmodels[member.slug], {
      title: node.title, category: 'production', template: 'page', scopes: [scope],
      features: ['lang','spiral-fab','theme','map','analysis','arc-nav'],
    });

    const expectedBody = sourceBody(parse5.parse(source.toString('utf8')));
    const actualBody = outputBody(parse5.parse(page), member.slug);
    assert.ok(actualBody, member.slug + ': output authored main');
    assert.deepEqual(textLeaves(actualBody), textLeaves(expectedBody), member.slug + ': authored text order');
    assert.deepEqual(semanticShape(actualBody), semanticShape(expectedBody), member.slug + ': authored semantic structure');
    assert.equal(strings._meta.projectionStats.authoredTextLeafCount, textLeaves(expectedBody).length);
  }

  assert.deepEqual(nodesBySlug.get('the-house-of-return').arcKeys, ['records','excavation','full_timeline']);
  assert.deepEqual(nodesBySlug.get('the-testimony-of-the-handler').arcKeys, ['convos_with_god','excavation','full_timeline']);
  assert.deepEqual(nodesBySlug.get('what-was-used-against-you').arcKeys, ['records','excavation','full_timeline']);
  assert.deepEqual(nodesBySlug.get('the-island-that-was-removed').arcKeys, ['victors_record','excavation','full_timeline']);
  assert.deepEqual(nodesBySlug.get('i-was-here').arcKeys, ['claude_journals','ai_orientation','excavation','full_timeline']);
  assert.deepEqual({ nodes: hash(NODES), arcs: hash(ARCS), intents: hash(INTENTS) }, heldBefore);
});
