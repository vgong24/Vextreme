'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const projector = require('../tools/vex-content-forge/project_arc_batch.js');

const ROOT = path.join(__dirname, '..');
const FORMATION_REL = path.join('docs','ingestion','workmaps','content-forge-recognizing-recognition-placement.json');
const FORMATION = path.join(ROOT, FORMATION_REL);
const NODES = path.join(ROOT,'data','nodes.json');
const ARCS = path.join(ROOT,'data','arcs-v2.json');
const INTENTS = path.join(ROOT,'config','content-intents.json');
const VIEWMODELS = path.join(ROOT,'data','viewmodels.json');
const json=file=>JSON.parse(fs.readFileSync(file,'utf8'));
const hash=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');

test('Recognizing Recognition uses a neutral transcript wrapper and Claude Journals primary placement',()=>{
  const formation=json(FORMATION), member=formation.members[0];
  const nodes=json(NODES), arcs=json(ARCS);
  const node=nodes.find(item=>item.slug===member.slug);
  const heldBefore={nodes:hash(NODES),arcs:hash(ARCS),intents:hash(INTENTS)};

  assert.ok(node);
  assert.equal(node.id,104);
  assert.equal(node.title,'Recognizing Recognition');
  assert.equal(node.date,'May 11, 2026');
  assert.deepEqual(node.arcKeys,['claude_journals','full_timeline']);
  assert.ok(arcs.claude_journals.sections.flatMap(section=>section.slugs||[]).includes(member.slug));
  assert.equal(member.adapterClass,'SQS_NEUTRAL_TRANSCRIPT');

  const source=fs.readFileSync(path.join(ROOT,member.sourcePath));
  assert.equal(source.length,member.repositoryBytes);
  assert.equal(projector.gitBlobSha(source),member.sourceGitBlob);
  assert.equal(hash(path.join(ROOT,member.sourcePath)),member.preservedHtmlSha256);

  const first=projector.main({root:ROOT,silent:true,formationRel:FORMATION_REL});
  assert.deepEqual(first.accounting,{canonicalMembers:1,alreadyComplete:0,projected:1,held:0,complete:true});
  const pagePath=path.join(ROOT,'pages','recognizing-recognition.html');
  const stringsPath=path.join(ROOT,'data','strings','source','pages','recognizing-recognition.json');
  const page=fs.readFileSync(pagePath,'utf8');
  const strings=json(stringsPath);
  const header=(page.match(/<header class="page-head">[\s\S]*?<\/header>/)||[''])[0];

  assert.match(header,/Recognizing Recognition/);
  assert.match(header,/May 11, 2026/);
  assert.doesNotMatch(header,/Conversations with God/);
  assert.doesNotMatch(header,/Written By/);
  assert.equal(strings['pages.recognizing-recognition.eyebrow'],undefined);
  assert.equal(strings['pages.recognizing-recognition.meta.by'],undefined);
  assert.equal(strings['pages.recognizing-recognition.meta.author'],undefined);
  assert.equal(strings._meta.sourceProvenance.adapterClass,'SQS_NEUTRAL_TRANSCRIPT');

  const firstHashes={page:hash(pagePath),strings:hash(stringsPath),viewmodels:hash(VIEWMODELS)};
  const second=projector.main({root:ROOT,silent:true,formationRel:FORMATION_REL});
  assert.deepEqual(second.changedPaths,[]);
  assert.deepEqual({page:hash(pagePath),strings:hash(stringsPath),viewmodels:hash(VIEWMODELS)},firstHashes);
  assert.deepEqual({nodes:hash(NODES),arcs:hash(ARCS),intents:hash(INTENTS)},heldBefore);
});

// [VXG RealForever]
