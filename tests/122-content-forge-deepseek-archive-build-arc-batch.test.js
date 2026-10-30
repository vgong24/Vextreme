'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const parse5 = require('parse5');
const projector = require('../tools/vex-content-forge/project_arc_batch.js');

const ROOT = path.join(__dirname, '..');
const FORMATION_REL = path.join('docs', 'ingestion', 'workmaps', 'content-forge-deepseek-archive-build-arc-batch-formation.json');
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
function expectedBody(document, adapter) {
  if (adapter === 'SQS_AUTHORED_BODY') {
    const candidates = findAll(document, node => node.tagName === 'div'
      && classes(node).includes('sqs-html-content')
      && Object.hasOwn(attrs(node), 'data-sqsp-text-block-content'));
    assert.ok(candidates.length, 'Squarespace authored body');
    candidates.sort((a, b) => textLeaves(b).join(' ').length - textLeaves(a).join(' ').length);
    return candidates[0];
  }
  const main = findFirst(document, node => node.tagName === 'main' && classes(node).includes('vex-authored-page-frame'));
  assert.ok(main, 'authored main fragment');
  return main;
}

test('Content Forge DeepSeek Archive Build collection is exact, dated, deterministic, and parent-page conservative', () => {
  const formation = json(FORMATION);
  const nodes = json(NODES);
  const nodesBySlug = new Map(nodes.map(node => [node.slug, node]));
  const arcs = json(ARCS);
  const heldBefore = { nodes: hash(NODES), arcs: hash(ARCS), intents: hash(INTENTS) };

  assert.equal(formation.ownerRef, 'github.issue.vextreme.159');
  assert.equal(formation.predecessor.sortingGroupRef, 'source-collection.deepseek-archive-build');
  assert.equal(formation.arc.arcKey, 'deepseek_archive_build');
  assert.equal(formation.arc.canonicalMemberCount, 5);
  assert.equal(formation.alreadyComplete.length, 0);
  assert.equal(formation.members.length, 5);
  assert.equal(formation.collectionRoot.historicalRoute, '/deepseek-archive-build');
  assert.equal(formation.collectionRoot.recoveredParentDocument, false);
  assert.match(formation.collectionRoot.disposition, /DO_NOT_FABRICATE_PARENT_PAGE/);
  assert.deepEqual(formation.members.map(member => member.date), [
    'April 3, 2026','April 3, 2026','April 7, 2026','April 7, 2026','April 9, 2026',
  ]);
  assert.deepEqual(formation.members.map(member => member.adapterClass), [
    'AUTHORED_MAIN_FRAGMENT','AUTHORED_MAIN_FRAGMENT','SQS_AUTHORED_BODY','SQS_AUTHORED_BODY','SQS_AUTHORED_BODY',
  ]);

  const expectedArcSlugs = formation.members.map(item => item.slug);
  assert.deepEqual(arcs.deepseek_archive_build.sections.flatMap(section => section.slugs || []), expectedArcSlugs);
  assert.equal(arcs.deepseek_archive_build.priority, 2);
  assert.equal(arcs.deepseek_archive_build.parent.pageSlug, undefined);
  assert.equal(arcs.deepseek_archive_build.parent.url, 'https://www.vextreme24.com/archives');

  for (const member of formation.members) {
    const node = nodesBySlug.get(member.slug);
    assert.ok(node, member.slug + ': canonical node');
    assert.equal(node.id, member.canonicalNodeId);
    assert.equal(node.title, member.title);
    assert.equal(node.date, member.date);
    assert.deepEqual(node.arcKeys, member.arcKeys);

    const source = fs.readFileSync(path.join(ROOT, member.sourcePath));
    const sourceText = source.toString('utf8');
    assert.equal(source.length, member.repositoryBytes, member.slug + ': source bytes');
    assert.equal(projector.gitBlobSha(source), member.sourceGitBlob, member.slug + ': source Git blob');
    assert.equal(hash(path.join(ROOT, member.sourcePath)), member.preservedHtmlSha256, member.slug + ': source SHA-256');
    assert.ok(sourceText.includes(member.sourceRoute), member.slug + ': preserved source route identity');
    const expected = expectedBody(parse5.parse(sourceText), member.adapterClass);
    assert.ok(textLeaves(expected).length > 0, member.slug + ': authored source text');
  }

  const first = projector.main({ root: ROOT, silent: true, formationRel: FORMATION_REL });
  assert.deepEqual(first.accounting, {
    canonicalMembers: 5,
    alreadyComplete: 0,
    projected: 5,
    held: 0,
    complete: true,
  });
  assert.deepEqual(first.members.map(item => item.slug), expectedArcSlugs);
  assert.ok(first.members.every(item => item.disposition === 'PROJECTED'));

  const generated = formation.members.flatMap(member => [
    path.join(ROOT, 'pages', member.slug + '.html'),
    path.join(ROOT, 'data', 'strings', 'source', 'pages', member.slug + '.json'),
  ]);
  const firstHashes = Object.fromEntries([...generated, VIEWMODELS].map(file => [file, hash(file)]));
  const second = projector.main({ root: ROOT, silent: true, formationRel: FORMATION_REL });
  const secondHashes = Object.fromEntries([...generated, VIEWMODELS].map(file => [file, hash(file)]));
  assert.deepEqual(second.accounting, first.accounting);
  assert.deepEqual(second.changedPaths, []);
  assert.deepEqual(secondHashes, firstHashes);

  const viewmodels = json(VIEWMODELS);
  for (const member of formation.members) {
    const node = nodesBySlug.get(member.slug);
    const page = fs.readFileSync(path.join(ROOT, 'pages', member.slug + '.html'), 'utf8');
    const strings = json(path.join(ROOT, 'data', 'strings', 'source', 'pages', member.slug + '.json'));
    assert.ok(page.includes('data-content-forge-generator="' + projector.GENERATOR_REF + '"'));
    assert.ok(page.includes('data-content-forge-body="' + member.slug + '"'));
    assert.ok(page.includes('id="arcNavMount"'));
    assert.ok(page.includes('../dist/vextreme-' + member.slug + '.js'));
    assert.equal((page.match(/<h1(?:\s|>)/g) || []).length, 1);
    for (const marker of ['window.__RESCUE_SOURCE','/__rescue/','data-sqsp-','data-vex-id=','vex-generated:','vexsite-provider-shell','common.nav.']) {
      assert.equal(page.includes(marker), false, member.slug + ': forbidden ' + marker);
    }
    const scope = 'pages.' + member.slug;
    assert.equal(strings._meta.scope, scope);
    assert.equal(strings._meta.sourceProvenance.adapterClass, member.adapterClass);
    assert.equal(strings._meta.sourceProvenance.route, member.sourceRoute);
    assert.equal(strings._meta.sourceProvenance.preservedPath, member.sourcePath);
    assert.equal(strings._meta.sourceProvenance.preservedGitBlob, member.sourceGitBlob);
    assert.equal(strings._meta.sourceProvenance.preservedHtmlSha256, member.preservedHtmlSha256);
    assert.equal(strings._meta.sourceProvenance.pageId, member.pageId);
    assert.equal(strings._meta.sourceProvenance.proposalRecordRef, member.proposalRecordRef);
    assert.deepEqual(viewmodels[member.slug], {
      title: node.title,
      category: 'production',
      template: 'page',
      scopes: [scope],
      features: ['lang','spiral-fab','theme','map','analysis','arc-nav'],
    });
  }

  assert.deepEqual({ nodes: hash(NODES), arcs: hash(ARCS), intents: hash(INTENTS) }, heldBefore);
});

// [VXG RealForever]
