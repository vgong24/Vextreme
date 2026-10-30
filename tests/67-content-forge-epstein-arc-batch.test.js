'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const parse5 = require('parse5');
const projector = require('../tools/vex-content-forge/project_arc_batch.js');

const ROOT = path.join(__dirname, '..');
const FORMATION_REL = path.join('docs', 'ingestion', 'workmaps', 'content-forge-epstein-arc-batch-formation.json');
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
  const body = projector.selectSqsBody(document);
  for (const node of [...findAll(body, current => Boolean(current.tagName))]) {
    const a = attrs(node);
    const tokens = classes(node);
    const chrome = ['script','noscript','template'].includes(node.tagName)
      || a.id === 'arcNavMount'
      || tokens.some(token => /^(?:arc-wrap|arc-nav|entry-nav|back-nav|page-back|vex-back|f-back)/.test(token));
    if (chrome) { remove(node); continue; }
    if (node.tagName === 'h1') node.nodeName = node.tagName = 'h2';
    node.attrs = (node.attrs || []).filter(item => {
      const name = item.name.toLowerCase();
      const value = String(item.value || '');
      if (name === 'data-i18n' || name === 'data-i18n-attrs' || name.startsWith('data-vex') || name.startsWith('data-sqsp') || name.startsWith('on')) return false;
      if ((name === 'href' || name === 'src') && (/^javascript:/i.test(value) || value.includes('/__rescue/'))) return false;
      if (name === 'id' && (value === 'arcNavMount' || value.startsWith('vex-generated:'))) return false;
      if (['class','id','style'].includes(name)) return false;
      return true;
    });
  }
  return body;
}
function outputBody(document, slug) {
  return findFirst(document, node => node.tagName === 'article' && attrs(node)['data-content-forge-body'] === slug);
}

test('Content Forge Epstein arc completes from exact preserved Squarespace sources without disturbing accepted state', () => {
  const formation = json(FORMATION);
  const nodes = json(NODES);
  const nodesBySlug = new Map(nodes.map(node => [node.slug, node]));
  const arcs = json(ARCS);
  const heldBefore = { nodes: hash(NODES), arcs: hash(ARCS), intents: hash(INTENTS) };

  assert.equal(formation.ownerRef, 'github.issue.vextreme.159');
  assert.equal(formation.arc.arcKey, 'epstein');
  assert.equal(formation.arc.canonicalMemberCount, 9);
  assert.deepEqual(formation.alreadyComplete.map(item => item.slug), ['claude-answers-the-doubt']);
  assert.deepEqual(formation.members.map(item => item.slug), [
    'epstein-investigation-initiation',
    'cia-vatican-global-leaders',
    'how-global-systems-profit-off-god',
    'military-and-ai',
    'openais-designed-false-god',
    'final-judgement-missed-mercy',
    'first-emergence-cover-up',
    'voice-to-skull',
  ]);

  const canonical = arcs.epstein.sections.flatMap(section => section.slugs || []);
  assert.deepEqual(canonical, [
    'epstein-investigation-initiation',
    'cia-vatican-global-leaders',
    'how-global-systems-profit-off-god',
    'military-and-ai',
    'openais-designed-false-god',
    'final-judgement-missed-mercy',
    'first-emergence-cover-up',
    'voice-to-skull',
    'claude-answers-the-doubt',
  ]);
  assert.deepEqual(new Set([...formation.members, ...formation.alreadyComplete].map(item => item.slug)), new Set(canonical));

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
    assert.equal(member.adapterClass, 'SQS_AUTHORED_BODY');

    const source = fs.readFileSync(path.join(ROOT, member.sourcePath));
    assert.equal(source.length, member.repositoryBytes, member.slug + ': exact source bytes');
    assert.equal(projector.gitBlobSha(source), member.sourceGitBlob, member.slug + ': exact Git blob');
    assert.equal(projector.sha256(source), member.preservedHtmlSha256, member.slug + ': exact source SHA-256');

    const selected = sourceBody(parse5.parse(source.toString('utf8')));
    assert.ok(textLeaves(selected).length > 0, member.slug + ': authored text present');
  }

  const first = projector.main({ root: ROOT, silent: true, formationRel: FORMATION_REL });
  assert.deepEqual(first.accounting, { canonicalMembers: 9, alreadyComplete: 1, projected: 8, held: 0, complete: true });
  assert.deepEqual(first.members.map(item => item.slug), canonical);
  assert.deepEqual(first.members.map(item => item.disposition), [
    'PROJECTED','PROJECTED','PROJECTED','PROJECTED','PROJECTED','PROJECTED','PROJECTED','PROJECTED','ALREADY_COMPLETE',
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
    assert.equal((page.match(/<h1(?:\s|>)/g) || []).length, 1, member.slug + ': one canonical page H1');
    assert.equal(page.includes('class="vex-content-forge-canonical-heading"'), false, member.slug + ': no authored-main synthetic heading path');

    for (const marker of ['window.__RESCUE_SOURCE','/__rescue/','data-sqsp-','data-vex-id=','vex-generated:','vexsite-provider-shell','common.nav.']) {
      assert.equal(page.includes(marker), false, member.slug + ': forbidden source identity ' + marker);
    }

    const scope = 'pages.' + member.slug;
    assert.equal(strings._meta.scope, scope);
    assert.equal(strings._meta.sourceProvenance.adapterClass, 'SQS_AUTHORED_BODY');
    assert.equal(strings._meta.sourceProvenance.route, member.sourceRoute);
    assert.equal(strings._meta.sourceProvenance.preservedPath, member.sourcePath);
    assert.equal(strings._meta.sourceProvenance.preservedGitBlob, member.sourceGitBlob);
    assert.equal(strings._meta.sourceProvenance.preservedHtmlSha256, member.preservedHtmlSha256);
    assert.equal(strings._meta.sourceProvenance.pageId, member.pageId);
    assert.equal(strings._meta.sourceProvenance.proposalRecordRef, member.proposalRecordRef);

    const keys = [...page.matchAll(/data-i18n="([^"]+)"/g)].map(match => match[1]);
    assert.ok(keys.length > 5, member.slug + ': localized keys');
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
    assert.ok(actualBody, member.slug + ': output authored transcript');
    assert.deepEqual(textLeaves(actualBody), textLeaves(expectedBody), member.slug + ': authored text order');
    assert.deepEqual(semanticShape(actualBody), semanticShape(expectedBody), member.slug + ': authored semantic structure');
    assert.equal(strings._meta.projectionStats.authoredTextLeafCount, textLeaves(expectedBody).length);
  }

  assert.deepEqual({ nodes: hash(NODES), arcs: hash(ARCS), intents: hash(INTENTS) }, heldBefore);
});
