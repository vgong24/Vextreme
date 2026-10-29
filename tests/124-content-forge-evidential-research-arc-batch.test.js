'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const projector = require('../tools/vex-content-forge/project_arc_batch.js');

const ROOT = path.join(__dirname, '..');
const FORMATION_REL = path.join('docs', 'ingestion', 'workmaps', 'content-forge-evidential-research-arc-batch-formation.json');
const FORMATION = path.join(ROOT, FORMATION_REL);
const NODES = path.join(ROOT, 'data', 'nodes.json');
const ARCS = path.join(ROOT, 'data', 'arcs-v2.json');
const INTENTS = path.join(ROOT, 'config', 'content-intents.json');
const VIEWMODELS = path.join(ROOT, 'data', 'viewmodels.json');
const CHRONOLOGY = path.join(ROOT, 'docs', 'ingestion', 'workmaps', 'vextreme-alignment-chronology-recovery-a001.json');

const json = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');

test('Content Forge Evidential Research preserves its historical collection while successor chronology remains evidence-scoped', () => {
  const formation = json(FORMATION);
  const nodes = json(NODES);
  const nodesBySlug = new Map(nodes.map(node => [node.slug, node]));
  const arcs = json(ARCS);
  const heldBefore = { nodes: hash(NODES), arcs: hash(ARCS), intents: hash(INTENTS) };
  const chronology = json(CHRONOLOGY);
  assert.equal(
    chronology.application?.replayCompatibility?.rule,
    'HISTORICAL_FORMATION_PLUS_SUCCESSOR_CHRONOLOGY',
    'current chronology recovery must explicitly own historical replay compatibility'
  );
  const admissionsBySlug = new Map(chronology.admissions.map(item => [item.slug, item]));

  assert.equal(formation.ownerRef, 'github.issue.vextreme.159');
  assert.equal(formation.predecessor.sortingGroupRef, 'source-collection.evidential-research');
  assert.equal(formation.arc.arcKey, 'evidential_research');
  assert.equal(formation.arc.canonicalMemberCount, 15);
  assert.equal(formation.members.length, 15);
  assert.equal(formation.chronologyPolicy.collectionFirst, true);
  assert.equal(formation.chronologyPolicy.fullTimelineDeferred, true);
  assert.equal(formation.projectorExtension.newAdapter, 'EMBEDDED_CODE_CONTAINER');

  const expectedSlugs = formation.members.map(member => member.slug);
  assert.deepEqual(arcs.evidential_research.sections.flatMap(section => section.slugs || []), expectedSlugs);
  assert.equal(arcs.evidential_research.priority, 2);
  assert.equal(arcs.evidential_research.parent.pageSlug, undefined);

  for (const member of formation.members) {
    const node = nodesBySlug.get(member.slug);
    assert.ok(node, member.slug + ': canonical node');
    assert.equal(node.id, null, member.slug + ': collection-first id');
    const admission = admissionsBySlug.get(member.slug);
    if (admission) {
      assert.equal(node.date, admission.proposedDateText, member.slug + ': successor chronology uses reviewed source evidence');
      assert.deepEqual(node.arcKeys, [...member.arcKeys, 'full_timeline'], member.slug + ': successor chronology adds only the cross-cutting timeline');
    } else {
      assert.equal(node.date, '', member.slug + ': chronology remains held without trustworthy evidence');
      assert.deepEqual(node.arcKeys, member.arcKeys);
    }
    assert.equal(projector.canonicalNodeCompatible(node, member), true, member.slug + ': historical formation remains replay-compatible');

    const source = fs.readFileSync(path.join(ROOT, member.sourcePath));
    assert.equal(source.length, member.repositoryBytes, member.slug + ': source bytes');
    assert.equal(projector.gitBlobSha(source), member.sourceGitBlob, member.slug + ': source Git blob');
    assert.equal(hash(path.join(ROOT, member.sourcePath)), member.preservedHtmlSha256, member.slug + ': source SHA-256');
  }

  assert.equal(formation.members.filter(member => admissionsBySlug.has(member.slug)).length, 9, 'only nine Evidential Research members have successor chronology evidence');

  const embedded = formation.members.find(member => member.slug === 'from-cost-to-control');
  assert.equal(embedded.adapterClass, 'EMBEDDED_CODE_CONTAINER');
  assert.equal(embedded.embeddedRootClass, 'pdgm');

  const first = projector.main({ root: ROOT, silent: true, formationRel: FORMATION_REL });
  assert.deepEqual(first.accounting, {
    canonicalMembers: 15,
    alreadyComplete: 0,
    projected: 15,
    held: 0,
    complete: true,
  });
  assert.deepEqual(first.members.map(item => item.slug), expectedSlugs);
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

  const embeddedPage = fs.readFileSync(path.join(ROOT, 'pages', 'from-cost-to-control.html'), 'utf8');
  assert.match(embeddedPage, /class="[^"]*pdgm[^"]*"/);
  assert.equal(embeddedPage.includes('sqs-block-code'), false);
  assert.equal(embeddedPage.includes('header-nav-folder-content'), false);

  assert.deepEqual({ nodes: hash(NODES), arcs: hash(ARCS), intents: hash(INTENTS) }, heldBefore);
});

// [VXG RealForever]
