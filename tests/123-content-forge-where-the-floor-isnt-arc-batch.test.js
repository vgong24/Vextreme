'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const parse5 = require('parse5');
const projector = require('../tools/vex-content-forge/project_arc_batch.js');

const ROOT = path.join(__dirname, '..');
const FORMATION_REL = path.join('docs', 'ingestion', 'workmaps', 'content-forge-where-the-floor-isnt-arc-batch-formation.json');
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

test("Content Forge Where the Floor Isn't series preserves relationship without inventing chronology", () => {
  const formation = json(FORMATION);
  const nodes = json(NODES);
  const nodesBySlug = new Map(nodes.map(node => [node.slug, node]));
  const arcs = json(ARCS);
  const heldBefore = { nodes: hash(NODES), arcs: hash(ARCS), intents: hash(INTENTS) };

  assert.equal(formation.ownerRef, 'github.issue.vextreme.159');
  assert.equal(formation.predecessor.sortingGroupRef, 'source-series.where-the-floor-isnt');
  assert.equal(formation.arc.arcKey, 'where_the_floor_isnt');
  assert.equal(formation.arc.canonicalMemberCount, 3);
  assert.deepEqual(formation.members.map(member => member.seriesRole), ['PART_I','PART_II_RETURN_WALK','TOOLKIT_CODA']);
  assert.deepEqual(formation.members.map(member => member.date), ['', '', 'May 28, 2026']);
  assert.equal(formation.chronologyPolicy.partI.sourceDateEstablished, false);
  assert.equal(formation.chronologyPolicy.partII.sourceDateEstablished, false);
  assert.equal(formation.chronologyPolicy.toolkitCoda.sourceDateEstablished, true);

  const expectedArcSlugs = ['where-the-floor-isnt','the-walk-back-in','what-i-learned-1'];
  assert.deepEqual(arcs.where_the_floor_isnt.sections.flatMap(section => section.slugs || []), expectedArcSlugs);
  assert.equal(arcs.where_the_floor_isnt.priority, 2);
  assert.equal(arcs.where_the_floor_isnt.parent.pageSlug, 'where-the-floor-isnt');

  const expectedNodeShape = [
    { slug:'where-the-floor-isnt', id:null, date:'', arcKeys:['where_the_floor_isnt'] },
    { slug:'the-walk-back-in', id:null, date:'', arcKeys:['where_the_floor_isnt'] },
    { slug:'what-i-learned-1', id:100, date:'May 28, 2026', arcKeys:['where_the_floor_isnt','full_timeline'] },
  ];
  for (const expected of expectedNodeShape) {
    const node = nodesBySlug.get(expected.slug);
    assert.ok(node, expected.slug + ': canonical node');
    assert.equal(node.id, expected.id);
    assert.equal(node.date, expected.date);
    assert.deepEqual(node.arcKeys, expected.arcKeys);
  }

  for (const member of formation.members) {
    const source = fs.readFileSync(path.join(ROOT, member.sourcePath));
    assert.equal(source.length, member.repositoryBytes, member.slug + ': source bytes');
    assert.equal(projector.gitBlobSha(source), member.sourceGitBlob, member.slug + ': source Git blob');
    assert.equal(hash(path.join(ROOT, member.sourcePath)), member.preservedHtmlSha256, member.slug + ': source SHA-256');
    const doc = parse5.parse(source.toString('utf8'));
    const main = findFirst(doc, node => node.tagName === 'main' && classes(node).includes('vex-authored-page-frame'));
    assert.ok(main, member.slug + ': authored main');
    assert.ok(textLeaves(main).length > 0, member.slug + ': authored text');
  }

  const first = projector.main({ root: ROOT, silent: true, formationRel: FORMATION_REL });
  assert.deepEqual(first.accounting, {
    canonicalMembers: 3,
    alreadyComplete: 0,
    projected: 3,
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
    const scope = 'pages.' + member.slug;
    assert.equal(strings._meta.scope, scope);
    assert.equal(strings._meta.sourceProvenance.route, member.sourceRoute);
    assert.equal(strings._meta.sourceProvenance.preservedGitBlob, member.sourceGitBlob);
    assert.equal(strings._meta.sourceProvenance.preservedHtmlSha256, member.preservedHtmlSha256);
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
