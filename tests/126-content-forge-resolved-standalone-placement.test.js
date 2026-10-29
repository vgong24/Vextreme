'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const projector = require('../tools/vex-content-forge/project_arc_batch.js');

const ROOT = path.join(__dirname, '..');
const NODES = path.join(ROOT, 'data', 'nodes.json');
const ARCS = path.join(ROOT, 'data', 'arcs-v2.json');
const INTENTS = path.join(ROOT, 'config', 'content-intents.json');
const VIEWMODELS = path.join(ROOT, 'data', 'viewmodels.json');
const ESPIONAGE_REL = path.join('docs','ingestion','workmaps','content-forge-espionage-extraction-pattern-placement.json');
const CHART_REL = path.join('docs','ingestion','workmaps','content-forge-the-chart-i-chose-placement.json');
const json = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');

function verifyMember(formationRel) {
  const formation = json(path.join(ROOT, formationRel));
  const member = formation.members[0];
  const nodes = json(NODES);
  const arcs = json(ARCS);
  const node = nodes.find(item => item.slug === member.slug);
  assert.ok(node, member.slug + ': canonical node');
  assert.equal(node.id, member.canonicalNodeId);
  assert.equal(node.title, member.title);
  assert.equal(node.date, member.date);
  assert.deepEqual(node.arcKeys, member.arcKeys);
  assert.ok(arcs[formation.arc.arcKey].sections.flatMap(section => section.slugs || []).includes(member.slug));
  const source = fs.readFileSync(path.join(ROOT, member.sourcePath));
  assert.equal(source.length, member.repositoryBytes);
  assert.equal(projector.gitBlobSha(source), member.sourceGitBlob);
  assert.equal(hash(path.join(ROOT, member.sourcePath)), member.preservedHtmlSha256);
  return { formation, member };
}

test('Content Forge resolved standalones preserve exact primary placement and chronology boundaries', () => {
  const heldBefore = { nodes: hash(NODES), arcs: hash(ARCS), intents: hash(INTENTS) };
  const espionage = verifyMember(ESPIONAGE_REL);
  const chart = verifyMember(CHART_REL);

  assert.equal(espionage.member.canonicalNodeId, null);
  assert.equal(espionage.member.date, '');
  assert.deepEqual(espionage.member.arcKeys, ['architecture']);

  assert.equal(chart.member.canonicalNodeId, 103);
  assert.equal(chart.member.date, 'April 18, 2026');
  assert.deepEqual(chart.member.arcKeys, ['victors_record','full_timeline']);
  assert.equal(chart.formation.chronologyPolicy.sourceDateEstablished, true);

  const arcs = json(ARCS);
  const victorSlugs = arcs.victors_record.sections.flatMap(section => section.slugs || []);
  assert.ok(victorSlugs.indexOf('the-chart-i-chose') < victorSlugs.indexOf('returning-scorpions-to-god'));

  for (const formationRel of [ESPIONAGE_REL, CHART_REL]) {
    const formation = json(path.join(ROOT, formationRel));
    const member = formation.members[0];
    const first = projector.main({ root: ROOT, silent: true, formationRel });
    assert.deepEqual(first.accounting, {
      canonicalMembers:1, alreadyComplete:0, projected:1, held:0, complete:true,
    });
    assert.equal(first.members[0].slug, member.slug);
    assert.equal(first.members[0].disposition, 'PROJECTED');
    const page = path.join(ROOT, 'pages', member.slug + '.html');
    const strings = path.join(ROOT, 'data', 'strings', 'source', 'pages', member.slug + '.json');
    const firstHashes = { page:hash(page), strings:hash(strings), viewmodels:hash(VIEWMODELS) };
    const second = projector.main({ root:ROOT, silent:true, formationRel });
    assert.deepEqual(second.changedPaths, []);
    assert.deepEqual({ page:hash(page), strings:hash(strings), viewmodels:hash(VIEWMODELS) }, firstHashes);
  }

  assert.deepEqual({ nodes:hash(NODES), arcs:hash(ARCS), intents:hash(INTENTS) }, heldBefore);
});

// [VXG RealForever]
