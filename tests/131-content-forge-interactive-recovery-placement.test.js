'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const parse5 = require('parse5');
const projector = require('../tools/vex-content-forge/project_arc_batch.js');
const standalone = require('../tools/vex-content-forge/project_standalone_page.js');
const { buildCanonicalNode, validateIntent } = require('../lib/apply-content-intents.js');

const ROOT=path.join(__dirname,'..');
const NODES=path.join(ROOT,'data','nodes.json');
const ARCS=path.join(ROOT,'data','arcs-v2.json');
const INTENTS=path.join(ROOT,'config','content-intents.json');
const DEPARTMENTS=path.join(ROOT,'data','departments.json');
const VIEWMODELS=path.join(ROOT,'data','viewmodels.json');
const DAUGHTERS_REL=path.join('docs','ingestion','workmaps','content-forge-daughters-shaped-by-home-standalone-formation.json');
const PAINT_REL=path.join('docs','ingestion','workmaps','content-forge-paint-editor-tool-standalone-formation.json');
const WITNESS_REL=path.join('docs','ingestion','workmaps','content-forge-witness-chatroom-animation-project-formation.json');
const json=file=>JSON.parse(fs.readFileSync(file,'utf8'));
const hash=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');

function inlineScriptCount(page) {
  return [...page.matchAll(/<script([^>]*)>[\s\S]*?<\/script>/g)]
    .filter(match => !/\bsrc=/.test(match[1])).length;
}

test('AUTHORED_INTERACTIVE_MAIN rejects external/network/eval/storage code and keeps ordinary static adapters unchanged',()=>{
  const safe=parse5.parse('<main class="vex-authored-page-frame"><button onclick="go()">Go</button><script>function go(){ document.querySelector(\'button\').textContent=\'Done\'; }</script></main>');
  const safeMain=projector.selectAuthoredMain(safe);
  assert.doesNotThrow(()=>projector.validateInteractiveCode(safeMain));

  for(const html of [
    '<main class="vex-authored-page-frame"><script src="https://example.com/x.js"></script></main>',
    '<main class="vex-authored-page-frame"><script>fetch("/x")</script></main>',
    '<main class="vex-authored-page-frame"><script>eval("1")</script></main>',
    '<main class="vex-authored-page-frame"><script>localStorage.setItem("x","y")</script></main>',
  ]){
    const doc=parse5.parse(html), main=projector.selectAuthoredMain(doc);
    assert.throws(()=>projector.validateInteractiveCode(main),/INTERACTIVE_/);
  }
});

test('Final recovery placement preserves interactive tools and project semantics without inventing arcs',()=>{
  const before={nodes:hash(NODES),intents:hash(INTENTS)};
  const intents=json(INTENTS), departments=json(DEPARTMENTS), nodes=json(NODES), arcs=json(ARCS);

  for(const rel of [DAUGHTERS_REL,PAINT_REL]){
    const formation=json(path.join(ROOT,rel)), member=formation.member, placement=formation.placement;
    const intent=intents.intents.find(item=>item.id===placement.intentId);
    assert.ok(intent,member.slug+': intent');
    assert.equal(validateIntent(intent,departments,arcs).valid,true);
    assert.equal(nodes.some(node=>node.slug===member.slug),false,member.slug+': intent must own later registration');
    const source=fs.readFileSync(path.join(ROOT,member.sourcePath));
    assert.equal(source.length,member.repositoryBytes);
    assert.equal(projector.gitBlobSha(source),member.sourceGitBlob);
    assert.equal(hash(path.join(ROOT,member.sourcePath)),member.preservedHtmlSha256);

    const first=standalone.projectFormation(ROOT,{formationRel:rel,silent:true});
    assert.equal(first.disposition,'PROJECTED');
    const pagePath=path.join(ROOT,'pages',member.slug+'.html');
    const page=fs.readFileSync(pagePath,'utf8');
    assert.ok(inlineScriptCount(page)>=1,member.slug+': inline script preserved');
    assert.match(page,/name="vex:department" content="rd"/);
    assert.match(page,/name="vex:workType" content="default"/);
    assert.doesNotMatch(page,/\bfetch\s*\(|\bXMLHttpRequest\b|\bWebSocket\b|\beval\s*\(/i);
    const canonical=buildCanonicalNode(intent,page,arcs,departments);
    assert.equal(canonical.id,null);
    assert.deepEqual(canonical.arcKeys,[]);
    assert.equal(canonical.department,'rd');
    assert.equal(canonical.workType,'default');
    const pageHash=hash(pagePath), vmHash=hash(VIEWMODELS);
    const second=standalone.projectFormation(ROOT,{formationRel:rel,silent:true});
    assert.deepEqual(second.changedPaths,[]);
    assert.equal(hash(pagePath),pageHash);
    assert.equal(hash(VIEWMODELS),vmHash);
  }

  const daughtersPage=fs.readFileSync(path.join(ROOT,'pages','daughters-shaped-by-home.html'),'utf8');
  const paintPage=fs.readFileSync(path.join(ROOT,'pages','paint-editor-tool.html'),'utf8');
  assert.match(daughtersPage,/\bonchange=/i);
  assert.match(paintPage,/\bonclick=|\boninput=/i);

  const witness=json(path.join(ROOT,WITNESS_REL));
  const bySlug=new Map(nodes.map(node=>[node.slug,node]));
  assert.equal(bySlug.get('animation-hand-off').id,112);
  assert.equal(bySlug.get('animation-hand-off').date,'June 3, 2026');
  assert.deepEqual(bySlug.get('animation-hand-off').arcKeys,['witness_chatroom_animation_project','full_timeline']);
  assert.equal(bySlug.get('current-draft').id,null);
  assert.deepEqual(bySlug.get('current-draft').arcKeys,['witness_chatroom_animation_project']);
  assert.equal(arcs.witness_chatroom_animation_project.parent.pageSlug,'animation-hand-off');
  assert.deepEqual(arcs.witness_chatroom_animation_project.sections.flatMap(section=>section.slugs||[]),['animation-hand-off','current-draft']);

  for(const member of witness.members){
    const source=fs.readFileSync(path.join(ROOT,member.sourcePath));
    assert.equal(source.length,member.repositoryBytes);
    assert.equal(projector.gitBlobSha(source),member.sourceGitBlob);
    assert.equal(hash(path.join(ROOT,member.sourcePath)),member.preservedHtmlSha256);
  }
  const projected=projector.main({root:ROOT,silent:true,formationRel:WITNESS_REL});
  assert.deepEqual(projected.accounting,{canonicalMembers:2,alreadyComplete:0,projected:2,held:0,complete:true});
  const currentPage=fs.readFileSync(path.join(ROOT,'pages','current-draft.html'),'utf8');
  assert.ok(inlineScriptCount(currentPage)>=1,'Witness working-draft inline behavior preserved');
  assert.doesNotMatch(currentPage,/\bfetch\s*\(|\bXMLHttpRequest\b|\bWebSocket\b|\beval\s*\(/i);
  const generated=witness.members.flatMap(member=>[
    path.join(ROOT,'pages',member.slug+'.html'),
    path.join(ROOT,'data','strings','source','pages',member.slug+'.json')
  ]);
  const firstHashes=Object.fromEntries([...generated,VIEWMODELS].map(file=>[file,hash(file)]));
  const projectedAgain=projector.main({root:ROOT,silent:true,formationRel:WITNESS_REL});
  assert.deepEqual(projectedAgain.changedPaths,[]);
  assert.deepEqual(Object.fromEntries([...generated,VIEWMODELS].map(file=>[file,hash(file)])),firstHashes);

  assert.deepEqual({nodes:hash(NODES),intents:hash(INTENTS)},before);
});

// [VXG RealForever]
