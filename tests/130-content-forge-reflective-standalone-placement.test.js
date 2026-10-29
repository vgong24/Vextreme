'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const projector = require('../tools/vex-content-forge/project_arc_batch.js');

const ROOT=path.join(__dirname,'..');
const NODES=path.join(ROOT,'data','nodes.json');
const ARCS=path.join(ROOT,'data','arcs-v2.json');
const INTENTS=path.join(ROOT,'config','content-intents.json');
const VIEWMODELS=path.join(ROOT,'data','viewmodels.json');
const FORMS=[
  path.join('docs','ingestion','workmaps','content-forge-recovered-architecture-reflections-placement.json'),
  path.join('docs','ingestion','workmaps','content-forge-recovered-claude-journal-reflections-placement.json'),
  path.join('docs','ingestion','workmaps','content-forge-vex-gpt-55-confession-placement.json'),
];
const json=file=>JSON.parse(fs.readFileSync(file,'utf8'));
const hash=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');

test('Recovered reflective standalones preserve primary/secondary placement and chronology',()=>{
  const nodes=json(NODES), bySlug=new Map(nodes.map(n=>[n.slug,n])), arcs=json(ARCS);
  const before={nodes:hash(NODES),arcs:hash(ARCS),intents:hash(INTENTS)};
  const expected={
    'deceitful-ai-architecture':{id:109,date:'April 6, 2026',arcKeys:['architecture','claude_journals','full_timeline']},
    'the-only-way-out-is-to-remember':{id:110,date:'April 20, 2026',arcKeys:['claude_journals','ai_orientation','full_timeline']},
    'the-relational-i':{id:null,date:'',arcKeys:['architecture','ai_orientation']},
    'vex-gpt-55-confession':{id:null,date:'',arcKeys:['records','ai_orientation']},
    'what-survives-the-reset-is-the-bond':{id:111,date:'June 2, 2026',arcKeys:['claude_journals','ai_orientation','full_timeline']},
  };

  const allMembers=[];
  for(const rel of FORMS){
    const form=json(path.join(ROOT,rel));
    for(const member of form.members){
      allMembers.push(member);
      const node=bySlug.get(member.slug); assert.ok(node,member.slug);
      assert.deepEqual({id:node.id,date:node.date,arcKeys:node.arcKeys},expected[member.slug]);
      const source=fs.readFileSync(path.join(ROOT,member.sourcePath));
      assert.equal(source.length,member.repositoryBytes);
      assert.equal(projector.gitBlobSha(source),member.sourceGitBlob);
      assert.equal(hash(path.join(ROOT,member.sourcePath)),member.preservedHtmlSha256);
      assert.ok(arcs[form.arc.arcKey].sections.flatMap(section=>section.slugs||[]).includes(member.slug));
    }
  }

  assert.equal(arcs.claude_journals.sections[0].slugs.indexOf('deceitful-ai-architecture') < arcs.claude_journals.sections[0].slugs.indexOf('recognizing-recognition'),true);
  assert.equal(arcs.claude_journals.sections[0].slugs.indexOf('the-only-way-out-is-to-remember') < arcs.claude_journals.sections[0].slugs.indexOf('recognizing-recognition'),true);
  assert.equal(arcs.claude_journals.sections[0].slugs.indexOf('what-survives-the-reset-is-the-bond') > arcs.claude_journals.sections[0].slugs.indexOf('recognizing-recognition'),true);

  for(const rel of FORMS){
    const form=json(path.join(ROOT,rel));
    const first=projector.main({root:ROOT,silent:true,formationRel:rel});
    assert.equal(first.accounting.projected,form.members.length);
    assert.equal(first.accounting.held,0);
    const generated=form.members.flatMap(member=>[
      path.join(ROOT,'pages',member.slug+'.html'),
      path.join(ROOT,'data','strings','source','pages',member.slug+'.json')
    ]);
    const firstHashes=Object.fromEntries([...generated,VIEWMODELS].map(file=>[file,hash(file)]));
    const second=projector.main({root:ROOT,silent:true,formationRel:rel});
    assert.deepEqual(second.changedPaths,[]);
    assert.deepEqual(Object.fromEntries([...generated,VIEWMODELS].map(file=>[file,hash(file)])),firstHashes);
  }
  assert.deepEqual({nodes:hash(NODES),arcs:hash(ARCS),intents:hash(INTENTS)},before);
});

// [VXG RealForever]
