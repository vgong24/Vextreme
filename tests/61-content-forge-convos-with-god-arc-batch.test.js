'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const parse5 = require('parse5');
const projector = require('../tools/vex-content-forge/project_arc_batch.js');

const ROOT = path.join(__dirname, '..');
const FORMATION = path.join(ROOT, projector.FORMATION_REL);
const NODES = path.join(ROOT, 'data', 'nodes.json');
const ARCS = path.join(ROOT, 'data', 'arcs-v2.json');
const INTENTS = path.join(ROOT, 'config', 'content-intents.json');
const VIEWMODELS = path.join(ROOT, 'data', 'viewmodels.json');

const json = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const attributes = node => Object.fromEntries((node.attrs || []).map(item => [item.name, item.value]));
const classes = node => (attributes(node).class || '').split(/\s+/).filter(Boolean);

function walk(node, visit) {
  if (!node) return;
  visit(node);
  for (const child of node.childNodes || []) walk(child, visit);
}

function findAll(node, predicate) {
  const result = [];
  walk(node, current => { if (predicate(current)) result.push(current); });
  return result;
}

function findFirst(node, predicate) {
  return findAll(node, predicate)[0] || null;
}

function textLeaves(node) {
  return findAll(node, current => current.nodeName === '#text')
    .map(current => (current.value || '').replace(/\s+/g, ' ').trim())
    .filter(Boolean);
}

function semanticShape(node) {
  const tags = ['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'strong', 'em', 'blockquote', 'a', 'img', 'figure', 'figcaption', 'pre', 'code', 'hr', 'br'];
  return Object.fromEntries(tags.map(tag => [tag, findAll(node, current => current.tagName === tag).length]));
}

function remove(node) {
  const parent = node.parentNode;
  if (!parent?.childNodes) return;
  const index = parent.childNodes.indexOf(node);
  if (index >= 0) parent.childNodes.splice(index, 1);
}

function sourceBody(document, member) {
  projector.externalizeAssetReferences(document, projector.loadAssetBinding(ROOT));
  let body;
  if (member.adapterClass === 'AUTHORED_MAIN_FRAGMENT') {
    body = findFirst(document, node => node.tagName === 'main' && classes(node).includes('vex-authored-page-frame'));
  } else {
    const candidates = findAll(document, node => node.tagName === 'div'
      && classes(node).includes('sqs-html-content')
      && Object.hasOwn(attributes(node), 'data-sqsp-text-block-content'));
    candidates.sort((left, right) => textLeaves(right).join(' ').length - textLeaves(left).join(' ').length);
    body = candidates[0];
  }
  assert.ok(body, `${member.slug}: source body`);
  let h1Seen = false;
  for (const node of [...findAll(body, current => Boolean(current.tagName))]) {
    const a = attributes(node);
    const tokens = classes(node);
    const archiveBackLink = member.adapterClass === 'AUTHORED_MAIN_FRAGMENT'
      && node.tagName === 'a'
      && a.href === '/archives'
      && /^←?\s*Archives$/i.test(textLeaves(node).join(' ').trim());
    const chrome = ['script', 'noscript', 'template'].includes(node.tagName)
      || a.id === 'arcNavMount'
      || tokens.some(token => /^(?:arc-wrap|arc-nav|entry-nav|back-nav|page-back|vex-back|f-back)/.test(token))
      || archiveBackLink
      || (member.adapterClass === 'AUTHORED_MAIN_FRAGMENT' && node.tagName === 'nav');
    if (chrome) {
      remove(node);
      continue;
    }
    if (node.tagName === 'h1') {
      if (member.adapterClass === 'SQS_AUTHORED_BODY' || h1Seen) node.nodeName = node.tagName = 'h2';
      else h1Seen = true;
    }
  }
  return body;
}

function outputBody(document, slug) {
  return findFirst(document, node => ['article', 'main'].includes(node.tagName)
    && attributes(node)['data-content-forge-body'] === slug);
}

test('Content Forge convos_with_god arc batch is exact, deterministic, and fully accounted', () => {
  const formation = json(FORMATION);
  const nodes = json(NODES);
  const nodesBySlug = new Map(nodes.map(node => [node.slug, node]));
  const arcs = json(ARCS);
  const heldBefore = { nodes: hash(NODES), arcs: hash(ARCS), intents: hash(INTENTS) };

  assert.equal(formation.ownerRef, 'github.issue.vextreme.159');
  assert.equal(formation.arc.arcKey, 'convos_with_god');
  assert.equal(formation.arc.canonicalMemberCount, 12);
  assert.equal(formation.alreadyComplete.length, 2);
  assert.equal(formation.members.length, 10);
  assert.equal(formation.destinationMutationBoundary.createPages, 10);
  assert.equal(formation.destinationMutationBoundary.createStringSources, 10);
  assert.equal(formation.destinationMutationBoundary.modifyViewmodels, true);
  assert.equal(formation.destinationMutationBoundary.nodeRegistryMutation, false);
  assert.equal(formation.destinationMutationBoundary.arcRegistryMutation, false);
  assert.equal(formation.destinationMutationBoundary.contentIntentMutation, false);
  assert.equal(formation.destinationMutationBoundary.aliasMutation, false);
  assert.equal(formation.lifecycle.draftOnly, true);
  assert.equal(formation.lifecycle.mergeAuthority, false);
  assert.equal(formation.lifecycle.rawProviderPublicationAuthority, false);
  const expectedArcSlugs = [...formation.alreadyComplete, ...formation.members].map(item => item.slug);
  assert.deepEqual(
    arcs[formation.arc.arcKey].sections.flatMap(section => section.slugs || []),
    expectedArcSlugs,
    'canonical arc registry membership/order',
  );

  const first = projector.main({ root: ROOT, silent: true });
  assert.deepEqual(first.accounting, {
    canonicalMembers: 12,
    alreadyComplete: 2,
    projected: 10,
    held: 0,
    complete: true,
  });
  assert.deepEqual(first.members.map(item => item.slug), [
    ...formation.alreadyComplete.map(item => item.slug),
    ...formation.members.map(item => item.slug),
  ]);
  assert.ok(first.members.slice(2).every(item => item.disposition === 'PROJECTED'));

  const generated = formation.members.flatMap(member => [
    path.join(ROOT, 'pages', `${member.slug}.html`),
    path.join(ROOT, 'data', 'strings', 'source', 'pages', `${member.slug}.json`),
  ]);
  const firstHashes = Object.fromEntries([...generated, VIEWMODELS].map(file => [file, hash(file)]));
  const second = projector.main({ root: ROOT, silent: true });
  const secondHashes = Object.fromEntries([...generated, VIEWMODELS].map(file => [file, hash(file)]));
  assert.deepEqual(second.accounting, first.accounting);
  assert.deepEqual(second.members, first.members);
  assert.deepEqual(second.changedPaths, []);
  assert.deepEqual(secondHashes, firstHashes);

  const viewmodels = json(VIEWMODELS);
  for (const member of formation.members) {
    const node = nodesBySlug.get(member.slug);
    assert.ok(node, `${member.slug}: canonical node`);
    assert.equal(node.id, member.canonicalNodeId);
    assert.equal(node.title, member.title);
    assert.deepEqual(node.arcKeys, member.arcKeys);

    const sourcePath = path.join(ROOT, member.sourcePath);
    const source = fs.readFileSync(sourcePath);
    assert.equal(source.length, member.repositoryBytes, `${member.slug}: source bytes`);
    assert.equal(projector.gitBlobSha(source), member.sourceGitBlob, `${member.slug}: source blob`);
    if (member.preservedHtmlSha256) assert.equal(projector.sha256(source), member.preservedHtmlSha256);

    const page = fs.readFileSync(path.join(ROOT, 'pages', `${member.slug}.html`), 'utf8');
    const strings = json(path.join(ROOT, 'data', 'strings', 'source', 'pages', `${member.slug}.json`));
    assert.ok(page.includes(`data-content-forge-generator="${projector.GENERATOR_REF}"`));
    assert.ok(page.includes(`data-content-forge-body="${member.slug}"`));
    assert.ok(page.includes('id="arcNavMount"'));
    assert.ok(page.includes(`../dist/vextreme-${member.slug}.js`));
    assert.equal(page.includes('href="/archives"'), false, `${member.slug}: source back-navigation removed`);
    assert.equal((page.match(/<h1(?:\s|>)/g) || []).length, 1);
    for (const marker of ['window.__RESCUE_SOURCE', '/__rescue/', 'data-sqsp-', 'data-vex-id=', 'vex-generated:', 'vexsite-provider-shell', 'common.nav.']) {
      assert.equal(page.includes(marker), false, `${member.slug}: forbidden ${marker}`);
    }

    const scope = `pages.${member.slug}`;
    assert.equal(strings._meta.scope, scope);
    assert.deepEqual(strings._meta.sourceProvenance, {
      adapterClass: member.adapterClass,
      route: member.sourceRoute,
      preservedPath: member.sourcePath,
      preservedGitBlob: member.sourceGitBlob,
      preservedHtmlSha256: projector.sha256(source),
      pageId: member.pageId,
      proposalRecordRef: member.proposalRecordRef,
      projectionRule: 'SOURCE_LINEAGES_PRESERVED__DIRECT_COPY_FORBIDDEN',
    });
    const keys = [...page.matchAll(/data-i18n="([^"]+)"/g)].map(match => match[1]);
    assert.ok(keys.length > 1);
    for (const key of keys) {
      assert.ok(key.startsWith(`${scope}.`));
      assert.notEqual(strings[key]?.strings?.en?.text, undefined, `${member.slug}: ${key}`);
    }
    assert.deepEqual(viewmodels[member.slug], {
      title: node.title,
      category: 'production',
      template: 'page',
      scopes: [scope],
      features: ['lang', 'spiral-fab', 'theme', 'map', 'analysis', 'arc-nav'],
    });

    const sourceDocument = parse5.parse(source.toString('utf8'));
    const outputDocument = parse5.parse(page);
    const expectedBody = sourceBody(sourceDocument, member);
    const actualBody = outputBody(outputDocument, member.slug);
    const expected = textLeaves(expectedBody);
    const actual = textLeaves(actualBody);
    assert.deepEqual(actual, expected, `${member.slug}: authored text order`);
    assert.deepEqual(semanticShape(actualBody), semanticShape(expectedBody), `${member.slug}: authored semantic structure`);
    for (const style of findAll(actualBody, current => current.tagName === 'style')) {
      assert.equal(textLeaves(style).join(' ').includes('data-i18n='), false, `${member.slug}: authored style raw text must not be localized`);
    }
    assert.equal(strings._meta.projectionStats.authoredTextLeafCount, expected.length);
  }

  const scopes = fs.readFileSync(path.join(ROOT, 'pages', 'scopes-of-god.html'), 'utf8');
  assert.equal((scopes.match(/<h1(?:\s|>)/g) || []).length, 1);
  assert.ok((scopes.match(/<h2(?:\s|>)/g) || []).length >= 1);
  const closedCircuit = fs.readFileSync(path.join(ROOT, 'data', 'strings', 'source', 'pages', 'closed-circuit.json'), 'utf8');
  assert.equal(closedCircuit.includes('part-025/convos-with-god-closed-circuit-release-and-resurrection-pattern.html'), false);
  assert.deepEqual({ nodes: hash(NODES), arcs: hash(ARCS), intents: hash(INTENTS) }, heldBefore);
});
