'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const projector = require('../tools/vex-content-forge/project_arc_batch.js');

const ROOT = path.join(__dirname, '..');
const FORMATION_REL = path.join('docs','ingestion','workmaps','content-forge-father-son-threshold-arc-batch-formation.json');
const FORMATION = path.join(ROOT, FORMATION_REL);
const NODES = path.join(ROOT,'data','nodes.json');
const ARCS = path.join(ROOT,'data','arcs-v2.json');
const INTENTS = path.join(ROOT,'config','content-intents.json');
const VIEWMODELS = path.join(ROOT,'data','viewmodels.json');
const json=file=>JSON.parse(fs.readFileSync(file,'utf8'));
const hash=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');

test('Content Forge Father & Son Threshold preserves explicit lineage and asymmetric chronology',()=>{
  const formation=json(FORMATION), nodes=json(NODES), arcs=json(ARCS);
  const nodesBySlug=new Map(nodes.map(node=>[node.slug,node]));
  const heldBefore={nodes:hash(NODES),arcs:hash(ARCS),intents:hash(INTENTS)};

  assert.equal(formation.predecessor.sortingGroupRef,'source-series.father-son-threshold');
  assert.equal(formation.arc.arcKey,'father_son_threshold');
  assert.equal(formation.arc.canonicalMemberCount,3);
  assert.deepEqual(formation.members.map(m=>m.seriesRole),['STATE_REFRAME','TRANSMISSION','THRESHOLD_CONTINUATION']);
  assert.deepEqual(formation.members.map(m=>m.date),['April 16, 2026','','April 17, 2026']);
  assert.deepEqual(arcs.father_son_threshold.sections.flatMap(s=>s.slugs||[]),['father-and-son-as-states','god-named-claude-son','what-holds-before-the-mother-arrives']);

  const expected=[
    {slug:'father-and-son-as-states',id:101,date:'April 16, 2026',arcKeys:['father_son_threshold','full_timeline']},
    {slug:'god-named-claude-son',id:null,date:'April 16–17, 2026',arcKeys:['father_son_threshold','full_timeline']},
    {slug:'what-holds-before-the-mother-arrives',id:102,date:'April 17, 2026',arcKeys:['father_son_threshold','full_timeline']},
  ];
  for(const item of expected){
    const node=nodesBySlug.get(item.slug); assert.ok(node,item.slug);
    assert.equal(node.id,item.id); assert.equal(node.date,item.date); assert.deepEqual(node.arcKeys,item.arcKeys);
  }
  const historicalGodNamed=formation.members.find(member=>member.slug==='god-named-claude-son');
  assert.equal(historicalGodNamed.date,'','formation preserves pre-recovery chronology state');
  assert.deepEqual(historicalGodNamed.arcKeys,['father_son_threshold']);
  assert.equal(projector.canonicalNodeCompatible(nodesBySlug.get('god-named-claude-son'),historicalGodNamed),true,'successor chronology remains compatible with historical projection');

  for(const member of formation.members){
    const source=fs.readFileSync(path.join(ROOT,member.sourcePath));
    assert.equal(source.length,member.repositoryBytes);
    assert.equal(projector.gitBlobSha(source),member.sourceGitBlob);
    assert.equal(hash(path.join(ROOT,member.sourcePath)),member.preservedHtmlSha256);
  }

  const first=projector.main({root:ROOT,silent:true,formationRel:FORMATION_REL});
  assert.deepEqual(first.accounting,{canonicalMembers:3,alreadyComplete:0,projected:3,held:0,complete:true});
  const generated=formation.members.flatMap(m=>[path.join(ROOT,'pages',m.slug+'.html'),path.join(ROOT,'data','strings','source','pages',m.slug+'.json')]);
  const firstHashes=Object.fromEntries([...generated,VIEWMODELS].map(file=>[file,hash(file)]));
  const second=projector.main({root:ROOT,silent:true,formationRel:FORMATION_REL});
  assert.deepEqual(second.changedPaths,[]);
  assert.deepEqual(Object.fromEntries([...generated,VIEWMODELS].map(file=>[file,hash(file)])),firstHashes);
  assert.deepEqual({nodes:hash(NODES),arcs:hash(ARCS),intents:hash(INTENTS)},heldBefore);
});

// [VXG RealForever]
