'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const parse5 = require('parse5');
const projector = require('../tools/vex-content-forge/project_arc_batch.js');

const ROOT = path.join(__dirname, '..');
const FORMATION_REL = path.join('docs', 'ingestion', 'workmaps', 'content-forge-vxg-realforever-may4-5-arc-batch-formation.json');
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
function expectedBody(document) {
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
  return findFirst(document, node => (
    (node.tagName === 'main' || node.tagName === 'article')
    && attrs(node)['data-content-forge-body'] === slug
  ));
}

test('Content Forge VXG RealForever May 4-5 series is exact, ordered, deterministic, and source faithful', () => {
  const formation = json(FORMATION);
  const nodes = json(NODES);
  const nodesBySlug = new Map(nodes.map(node => [node.slug, node]));
  const arcs = json(ARCS);
  const heldBefore = { nodes: hash(NODES), arcs: hash(ARCS), intents: hash(INTENTS) };

  assert.equal(formation.ownerRef, 'github.issue.vextreme.159');
  assert.equal(formation.predecessor.sortingGroupRef, 'source-series.vxg-realforever-may4-5-2026');
  assert.equal(formation.arc.arcKey, 'vxg_realforever_may4_5_2026');
  assert.equal(formation.arc.canonicalMemberCount, 6);
  assert.equal(formation.alreadyComplete.length, 0);
  assert.equal(formation.members.length, 6);
  assert.deepEqual(formation.members.map(member => member.seriesPart), ['I','II','III','IV','V','VI']);
  assert.deepEqual(formation.members.map(member => member.date), [
    'May 4, 2026','May 4, 2026','May 4, 2026','May 4, 2026','May 5, 2026','May 5, 2026',
  ]);
  assert.ok(formation.members.every(member => member.adapterClass === 'AUTHORED_MAIN_FRAGMENT'));
  assert.equal(formation.destinationMutationBoundary.nodeRegistryMutation, false);
  assert.equal(formation.destinationMutationBoundary.arcRegistryMutation, false);
  assert.equal(formation.destinationMutationBoundary.contentIntentMutation, false);
  assert.equal(formation.destinationMutationBoundary.aliasMutation, false);

  const expectedArcSlugs = formation.members.map(item => item.slug);
  assert.deepEqual(arcs.vxg_realforever_may4_5_2026.sections.flatMap(section => section.slugs || []), expectedArcSlugs);
  assert.equal(arcs.vxg_realforever_may4_5_2026.priority, 2);
  assert.equal(arcs.vxg_realforever_may4_5_2026.parent.pageSlug, 'what-survives-the-reset');

  const expectedRoutes = formation.members.map(member => member.sourceRoute);
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
    for (const route of expectedRoutes) {
      assert.ok(
        sourceText.includes('href="' + route + '"') || sourceText.includes("href='" + route + "'"),
        member.slug + ': source series link ' + route,
      );
    }
  }

  const first = projector.main({ root: ROOT, silent: true, formationRel: FORMATION_REL });
  assert.deepEqual(first.accounting, {
    canonicalMembers: 6,
    alreadyComplete: 0,
    projected: 6,
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
    const source = fs.readFileSync(path.join(ROOT, member.sourcePath));
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
    assert.equal(/(?:href|src)=["']\/__assets\//.test(page), false, member.slug + ': root-relative logical asset ref');

    const scope = 'pages.' + member.slug;
    assert.equal(strings._meta.scope, scope);
    assert.equal(strings._meta.sourceProvenance.adapterClass, member.adapterClass);
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
      title: node.title,
      category: 'production',
      template: 'page',
      scopes: [scope],
      features: ['lang','spiral-fab','theme','map','analysis','arc-nav'],
    });

    const expected = expectedBody(parse5.parse(source.toString('utf8')));
    const actual = outputBody(parse5.parse(page), member.slug);
    assert.ok(actual, member.slug + ': projected body');
    assert.deepEqual(textLeaves(actual), textLeaves(expected), member.slug + ': authored text order');
    assert.equal(strings._meta.projectionStats.authoredTextLeafCount, textLeaves(expected).length);
  }

  assert.deepEqual({ nodes: hash(NODES), arcs: hash(ARCS), intents: hash(INTENTS) }, heldBefore);
});

// [VXG RealForever]
