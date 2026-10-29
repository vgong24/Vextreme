'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const projector = require('../tools/vex-content-forge/project_arc_batch.js');

const ROOT=path.join(__dirname,'..');
const FORMATION_REL=path.join('docs','ingestion','workmaps','content-forge-april27-29-bridge-recognition-arc-batch-formation.json');
const FORMATION=path.join(ROOT,FORMATION_REL);
const NODES=path.join(ROOT,'data','nodes.json');
const ARCS=path.join(ROOT,'data','arcs-v2.json');
const INTENTS=path.join(ROOT,'config','content-intents.json');
const VIEWMODELS=path.join(ROOT,'data','viewmodels.json');
const json=file=>JSON.parse(fs.readFileSync(file,'utf8'));
const hash=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');

test('April 27-29 Bridge & Recognition is one exact cross-linked chronological collection',()=>{
  const formation=json(FORMATION), nodes=json(NODES), arcs=json(ARCS);
  const bySlug=new Map(nodes.map(node=>[node.slug,node]));
  const heldBefore={nodes:hash(NODES),arcs:hash(ARCS),intents:hash(INTENTS)};
  const expectedRoutes=formation.members.map(member=>member.sourceRoute);

  assert.equal(formation.predecessor.sortingGroupRef,'source-cluster.april27-29-bridge-and-recognition');
  assert.equal(formation.curatorialDecision.disposition,'PROMOTE_RELATIONSHIP_CLUSTER_TO_PRIORITY_2_CHRONOLOGICAL_COLLECTION');
  assert.equal(formation.arc.arcKey,'april_27_29_bridge_recognition');
  assert.deepEqual(formation.members.map(m=>m.date),[
    'April 27, 2026','April 27, 2026','April 27–28, 2026','April 29, 2026'
  ]);
  assert.equal(arcs.april_27_29_bridge_recognition.parent.pageSlug,'the-day-that-crossed-the-bridge');
  assert.deepEqual(
    arcs.april_27_29_bridge_recognition.sections.flatMap(section=>section.slugs||[]),
    formation.members.map(member=>member.slug)
  );

  for(const member of formation.members){
    const node=bySlug.get(member.slug); assert.ok(node,member.slug);
    assert.equal(node.id,member.canonicalNodeId);
    assert.equal(node.date,member.date);
    assert.deepEqual(node.arcKeys,['april_27_29_bridge_recognition','full_timeline']);
    const source=fs.readFileSync(path.join(ROOT,member.sourcePath));
    const sourceText=source.toString('utf8');
    assert.equal(source.length,member.repositoryBytes);
    assert.equal(projector.gitBlobSha(source),member.sourceGitBlob);
    assert.equal(hash(path.join(ROOT,member.sourcePath)),member.preservedHtmlSha256);
    for(const route of expectedRoutes){
      assert.ok(sourceText.includes('href="'+route+'"') || sourceText.includes("href='"+route+"'"),member.slug+': '+route);
    }
  }

  const first=projector.main({root:ROOT,silent:true,formationRel:FORMATION_REL});
  assert.deepEqual(first.accounting,{canonicalMembers:4,alreadyComplete:0,projected:4,held:0,complete:true});
  const generated=formation.members.flatMap(member=>[
    path.join(ROOT,'pages',member.slug+'.html'),
    path.join(ROOT,'data','strings','source','pages',member.slug+'.json')
  ]);
  const firstHashes=Object.fromEntries([...generated,VIEWMODELS].map(file=>[file,hash(file)]));
  const second=projector.main({root:ROOT,silent:true,formationRel:FORMATION_REL});
  assert.deepEqual(second.changedPaths,[]);
  assert.deepEqual(Object.fromEntries([...generated,VIEWMODELS].map(file=>[file,hash(file)])),firstHashes);
  assert.deepEqual({nodes:hash(NODES),arcs:hash(ARCS),intents:hash(INTENTS)},heldBefore);
});

// [VXG RealForever]
