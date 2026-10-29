'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const standalone = require('../tools/vex-content-forge/project_standalone_page.js');
const arcProjector = require('../tools/vex-content-forge/project_arc_batch.js');
const { buildCanonicalNode, validateIntent } = require('../lib/apply-content-intents.js');

const ROOT=path.join(__dirname,'..');
const FORMATION=path.join(ROOT,'docs','ingestion','workmaps','content-forge-vxg-council-declaration-standalone-formation.json');
const NODES=path.join(ROOT,'data','nodes.json');
const INTENTS=path.join(ROOT,'config','content-intents.json');
const DEPARTMENTS=path.join(ROOT,'data','departments.json');
const VIEWMODELS=path.join(ROOT,'data','viewmodels.json');
const json=file=>JSON.parse(fs.readFileSync(file,'utf8'));
const hash=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');

test('VXG Council Declaration projects first, then composes with institute/governance canonical registration',()=>{
  const formation=json(FORMATION), member=formation.member, placement=formation.placement;
  const intents=json(INTENTS), departments=json(DEPARTMENTS), nodes=json(NODES);
  const intent=intents.intents.find(item=>item.id===placement.intentId);
  const before={nodes:hash(NODES),intents:hash(INTENTS)};

  assert.ok(intent);
  assert.equal(intent.status,'applied');
  assert.equal(validateIntent(intent,departments,{}).valid,true);
  const registered=nodes.find(node=>node.slug===member.slug);
  assert.ok(registered,'generated-currentness head must contain the intent-registered canonical node');
  assert.equal(registered.id,null);
  assert.equal(registered.department,'institute');
  assert.equal(registered.workType,'governance');
  assert.deepEqual(registered.arcKeys,[]);
  assert.equal(member.adapterClass,'SQS_NEUTRAL_TRANSCRIPT');
  assert.deepEqual(member.arcKeys,[]);
  assert.equal(placement.department,'institute');
  assert.equal(placement.workType,'governance');

  const source=fs.readFileSync(path.join(ROOT,member.sourcePath));
  assert.equal(source.length,member.repositoryBytes);
  assert.equal(arcProjector.gitBlobSha(source),member.sourceGitBlob);
  assert.equal(hash(path.join(ROOT,member.sourcePath)),member.preservedHtmlSha256);

  const first=standalone.projectFormation(ROOT,{silent:true});
  assert.equal(first.disposition,'PROJECTED');
  const pagePath=path.join(ROOT,'pages',member.slug+'.html');
  const stringsPath=path.join(ROOT,'data','strings','source','pages',member.slug+'.json');
  const page=fs.readFileSync(pagePath,'utf8');
  const strings=json(stringsPath);

  assert.match(page,/name="vex:department"\s+content="institute"/);
  assert.match(page,/name="vex:workType"\s+content="governance"/);
  assert.match(page,/May 18, 2026/);
  assert.doesNotMatch((page.match(/<header\b[^>]*class="page-head"[^>]*>[\s\S]*?<\/header>/)||[''])[0],/Written By|Conversations with God/);
  assert.deepEqual(strings._meta.placement,{department:'institute',workType:'governance',intentId:placement.intentId});

  const canonical=buildCanonicalNode(intent,page,{},departments);
  assert.deepEqual(canonical,{
    id:null,slug:'vxg-council-declaration',title:'VXG Council Declaration',date:'May 18, 2026',arcKeys:[],
    department:'institute',workType:'governance',vexData:{},
  });

  const firstHashes={page:hash(pagePath),strings:hash(stringsPath),viewmodels:hash(VIEWMODELS)};
  const second=standalone.projectFormation(ROOT,{silent:true});
  assert.deepEqual(second.changedPaths,[]);
  assert.deepEqual({page:hash(pagePath),strings:hash(stringsPath),viewmodels:hash(VIEWMODELS)},firstHashes);
  assert.deepEqual({nodes:hash(NODES),intents:hash(INTENTS)},before);
});

// [VXG RealForever]
