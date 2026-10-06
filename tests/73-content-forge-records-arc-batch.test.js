
'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const parse5 = require('parse5');
const projector = require('../tools/vex-content-forge/project_arc_batch.js');

const ROOT = path.join(__dirname, '..');
const FORMATION_REL = path.join('docs','ingestion','workmaps','content-forge-records-arc-batch-formation.json');
const FORMATION = path.join(ROOT, FORMATION_REL);
const PROPOSAL = path.join(ROOT,'docs','ingestion','workmaps','content-forge-consolidation-proposal.json');
const NODES = path.join(ROOT,'data','nodes.json');
const ARCS = path.join(ROOT,'data','arcs-v2.json');
const INTENTS = path.join(ROOT,'config','content-intents.json');
const VIEWMODELS = path.join(ROOT,'data','viewmodels.json');

const json = file => JSON.parse(fs.readFileSync(file,'utf8'));
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const pathState = file => fs.existsSync(file) ? { exists: true, sha256: hash(file) } : { exists: false, sha256: null };
const attrs = node => Object.fromEntries((node.attrs || []).map(item => [item.name,item.value]));
const classes = node => (attrs(node).class || '').split(/\s+/).filter(Boolean);
function walk(node,visit){ if(!node)return; visit(node); for(const child of node.childNodes||[]) walk(child,visit); }
function findAll(node,predicate){ const out=[]; walk(node,current=>{if(predicate(current))out.push(current);}); return out; }
function textLeaves(node){ return findAll(node,current=>current.nodeName==='#text').map(current=>(current.value||'').replace(/\s+/g,' ').trim()).filter(Boolean); }
function remove(node){ const parent=node.parentNode; if(!parent?.childNodes)return; const i=parent.childNodes.indexOf(node); if(i>=0)parent.childNodes.splice(i,1); }
function semanticShape(node){ const tags=['p','h1','h2','h3','h4','h5','h6','ul','ol','li','strong','em','blockquote','a','img','figure','figcaption','pre','code','hr','br']; return Object.fromEntries(tags.map(tag=>[tag,findAll(node,current=>current.tagName===tag).length])); }
function expectedAuthoredMain(document){
  const main=projector.selectAuthoredMain(document); let h1Seen=false;
  for(const node of [...findAll(main,current=>Boolean(current.tagName))]){
    const a=attrs(node); const tokens=classes(node);
    const archiveBackLink=node.tagName==='a' && a.href==='/archives' && /^←?\s*Archives$/i.test(projector.rawText(node).trim());
    const chrome=['script','noscript','template'].includes(node.tagName) || a.id==='arcNavMount' || tokens.some(token=>/^(?:arc-wrap|arc-nav|entry-nav|back-nav|page-back|vex-back|f-back)/.test(token)) || archiveBackLink || node.tagName==='nav';
    if(chrome){ remove(node); continue; }
    if(node.tagName==='h1'){ if(h1Seen) node.nodeName=node.tagName='h2'; else h1Seen=true; }
    node.attrs=(node.attrs||[]).filter(item=>{ const name=item.name.toLowerCase(); const value=String(item.value||''); if(name==='data-i18n'||name==='data-i18n-attrs'||name.startsWith('data-vex')||name.startsWith('data-sqsp')||name.startsWith('on'))return false; if((name==='href'||name==='src')&&(/^javascript:/i.test(value)||value.includes('/__rescue/')))return false; if(name==='id'&&(value==='arcNavMount'||value.startsWith('vex-generated:')))return false; return true; });
  }
  return main;
}
function outputMain(document,slug){
  const main=findAll(document,node=>node.tagName==='main'&&attrs(node)['data-content-forge-body']===slug)[0]||null;
  if(!main)return null;
  for(const node of [...findAll(main,current=>Boolean(current.tagName))]){ const a=attrs(node); const tokens=classes(node); if(a.id==='arcNavMount'||tokens.some(token=>/^(?:arc-wrap|arc-nav)/.test(token))) remove(node); }
  return main;
}

test('Content Forge Records projects two exact members, preserves three exact lineage HOLDs, and leaves three already-complete members unchanged',()=>{
  const formation=json(FORMATION); const nodes=json(NODES); const nodesBySlug=new Map(nodes.map(node=>[node.slug,node])); const arcs=json(ARCS); const proposal=json(PROPOSAL);
  const protectedBefore={nodes:hash(NODES),arcs:hash(ARCS),intents:hash(INTENTS),projector:hash(path.join(ROOT,'tools','vex-content-forge','project_arc_batch.js'))};
  assert.equal(formation.ownerRef,'github.issue.vextreme.159'); assert.equal(formation.arc.arcKey,'records');
  assert.deepEqual({canonical:formation.arc.canonicalMemberCount,already:formation.arc.alreadyCompleteCount,remaining:formation.arc.remainingCount},{canonical:8,already:3,remaining:5});
  assert.deepEqual(formation.destinationMutationBoundary,{createPages:2,createStringSources:2,modifyViewmodels:true,nodeRegistryMutation:false,arcRegistryMutation:false,contentIntentMutation:false,aliasMutation:false});
  const canonical=arcs.records.sections.flatMap(section=>section.slugs||[]);
  assert.deepEqual(canonical,['epstein-and-ai','when-they-called-god-a-risk','testimony-of-merron-the-voice-they-flagged-the-presence-they-couldnt-silence','the-house-of-return','the-7-crowned-virtues','reality-rendering-mechanics','liberation-arc-index','what-was-used-against-you']);
  assert.deepEqual(new Set([...formation.alreadyComplete,...formation.members].map(item=>item.slug)),new Set(canonical));
  const held=formation.members.filter(item=>item.preclassifiedHoldReason); const projectable=formation.members.filter(item=>!item.preclassifiedHoldReason);
  assert.deepEqual(held.map(item=>item.slug),['when-they-called-god-a-risk','the-7-crowned-virtues','reality-rendering-mechanics']);
  assert.deepEqual(projectable.map(item=>item.slug),['epstein-and-ai','liberation-arc-index']);
  const successorResolved=new Set(['when-they-called-god-a-risk']);
  assert.deepEqual(formation.alreadyComplete.map(item=>item.slug),['testimony-of-merron-the-voice-they-flagged-the-presence-they-couldnt-silence','the-house-of-return','what-was-used-against-you']);

  const proposalByRef=new Map(proposal.records.map(record=>[record.recordRef,record])); const lineageById=new Map((proposal.lineages?.canonicalIdentity||[]).map(item=>[item.canonicalIdentity,item]));
  const heldState=new Map();
  for(const member of held){
    const node=nodesBySlug.get(member.slug); assert.ok(node,member.slug+': canonical node'); assert.equal(node.id,member.canonicalNodeId); assert.equal(node.title,member.title); assert.deepEqual(node.arcKeys,member.arcKeys);
    for(const key of ['adapterClass','sourcePath','sourceGitBlob','preservedHtmlSha256','repositoryBytes','sourceRoute','pageId','proposalRecordRef','sourceReceiptRef']) assert.equal(member[key],undefined,member.slug+': held member has no selected source field '+key);
    const family=lineageById.get('id:'+member.canonicalNodeId); assert.ok(family,member.slug+': lineage'); assert.equal(family.reviewRequired,true); assert.equal(family.byteDistinct,true); assert.equal(family.sameRoute,false);
    assert.deepEqual(new Set(family.recordRefs),new Set(member.holdEvidence.recordRefs)); assert.deepEqual(new Set(family.routes),new Set(member.holdEvidence.routes)); assert.deepEqual(new Set(family.sourceDigests),new Set(member.holdEvidence.sourceDigests));
    const page=path.join(ROOT,'pages',member.slug+'.html'); const strings=path.join(ROOT,'data','strings','source','pages',member.slug+'.json'); const vm=json(VIEWMODELS)[member.slug];
    const pageState=pathState(page),stringsState=pathState(strings);
    if(successorResolved.has(member.slug)){assert.equal(pageState.exists,true,member.slug+': successor page present');assert.equal(stringsState.exists,true,member.slug+': successor strings present');assert.ok(vm,member.slug+': successor viewmodel present');}
    else {assert.equal(pageState.exists,false,member.slug+': held page absent');assert.equal(stringsState.exists,false,member.slug+': held strings absent');assert.equal(vm,undefined,member.slug+': held viewmodel absent');}
    heldState.set(member.slug,{pageState,stringsState,vm});
  }

  const completeState=new Map();
  for(const member of formation.alreadyComplete){
    const page=path.join(ROOT,'pages',member.slug+'.html'); const strings=path.join(ROOT,'data','strings','source','pages',member.slug+'.json'); assert.ok(fs.existsSync(page),member.slug+': existing page'); assert.ok(fs.existsSync(strings),member.slug+': existing strings');
    completeState.set(member.slug,{pageHash:hash(page),stringsHash:hash(strings),viewmodel:json(VIEWMODELS)[member.slug]});
  }
  for(const member of projectable){
    const node=nodesBySlug.get(member.slug); assert.ok(node,member.slug+': canonical node'); assert.equal(node.id,member.canonicalNodeId); assert.equal(node.title,member.title); assert.deepEqual(node.arcKeys,member.arcKeys); assert.equal(member.adapterClass,'AUTHORED_MAIN_FRAGMENT');
    const record=proposalByRef.get(member.proposalRecordRef); assert.ok(record,member.slug+': proposal record'); assert.equal(record.destination.exactCanonicalNodeMatchOnCurrentMain,true); assert.equal(record.classification.requiresJudgment,false); assert.equal(record.source.route,member.sourceRoute); assert.equal(record.source.pageId,member.pageId);
    const lineage=member.canonicalNodeId===null?null:lineageById.get('id:'+member.canonicalNodeId); assert.ok(!lineage||lineage.reviewRequired!==true,member.slug+': no unresolved canonical lineage');
    const source=fs.readFileSync(path.join(ROOT,member.sourcePath)); assert.equal(source.length,member.repositoryBytes,member.slug+': exact source bytes'); assert.equal(projector.gitBlobSha(source),member.sourceGitBlob,member.slug+': exact Git blob'); assert.equal(projector.sha256(source),member.preservedHtmlSha256,member.slug+': exact source SHA-256'); assert.ok(textLeaves(expectedAuthoredMain(parse5.parse(source.toString('utf8')))).length>0,member.slug+': authored text present');
  }

  const first=projector.main({root:ROOT,silent:true,formationRel:FORMATION_REL});
  assert.deepEqual(first.accounting,{canonicalMembers:8,alreadyComplete:3,projected:2,held:3,complete:true}); assert.deepEqual(first.members.map(item=>item.slug),canonical); assert.deepEqual(first.members.map(item=>item.disposition),['PROJECTED','HOLD_WITH_EXACT_REASON','ALREADY_COMPLETE','ALREADY_COMPLETE','HOLD_WITH_EXACT_REASON','HOLD_WITH_EXACT_REASON','PROJECTED','ALREADY_COMPLETE']);
  for(const member of held){ const state=heldState.get(member.slug),page=path.join(ROOT,'pages',member.slug+'.html'),strings=path.join(ROOT,'data','strings','source','pages',member.slug+'.json');assert.match(first.members.find(item=>item.slug===member.slug).reason,/^PRECLASSIFIED_HOLD: MULTI_SOURCE_CANONICAL_IDENTITY_RECONCILIATION__/);assert.deepEqual(pathState(page),state.pageState);assert.deepEqual(pathState(strings),state.stringsState);assert.deepEqual(json(VIEWMODELS)[member.slug],state.vm); }
  const generated=projectable.flatMap(member=>[path.join(ROOT,'pages',member.slug+'.html'),path.join(ROOT,'data','strings','source','pages',member.slug+'.json')]); const firstHashes=Object.fromEntries([...generated,VIEWMODELS].map(file=>[file,hash(file)]));
  const second=projector.main({root:ROOT,silent:true,formationRel:FORMATION_REL}); const secondHashes=Object.fromEntries([...generated,VIEWMODELS].map(file=>[file,hash(file)])); assert.deepEqual(second.accounting,first.accounting); assert.deepEqual(second.changedPaths,[]); assert.deepEqual(secondHashes,firstHashes);

  const viewmodels=json(VIEWMODELS);
  for(const member of projectable){
    const node=nodesBySlug.get(member.slug); const source=fs.readFileSync(path.join(ROOT,member.sourcePath)); const page=fs.readFileSync(path.join(ROOT,'pages',member.slug+'.html'),'utf8'); const strings=json(path.join(ROOT,'data','strings','source','pages',member.slug+'.json')); const scope='pages.'+member.slug;
    assert.ok(page.includes('data-content-forge-generator="'+projector.GENERATOR_REF+'"')); assert.ok(page.includes('data-content-forge-body="'+member.slug+'"')); assert.ok(page.includes('id="arcNavMount"')); assert.ok(page.includes('../dist/vextreme-'+member.slug+'.js')); assert.equal((page.match(/<h1(?:\s|>)/g)||[]).length,1,member.slug+': one H1');
    for(const marker of ['window.__RESCUE_SOURCE','/__rescue/','data-sqsp-','data-vex-id=','vex-generated:','vexsite-provider-shell','common.nav.']) assert.equal(page.includes(marker),false,member.slug+': forbidden '+marker);
    assert.equal(strings._meta.scope,scope); assert.equal(strings._meta.sourceProvenance.adapterClass,'AUTHORED_MAIN_FRAGMENT'); assert.equal(strings._meta.sourceProvenance.route,member.sourceRoute); assert.equal(strings._meta.sourceProvenance.preservedPath,member.sourcePath); assert.equal(strings._meta.sourceProvenance.preservedGitBlob,member.sourceGitBlob); assert.equal(strings._meta.sourceProvenance.preservedHtmlSha256,member.preservedHtmlSha256); assert.equal(strings._meta.sourceProvenance.pageId,member.pageId); assert.equal(strings._meta.sourceProvenance.proposalRecordRef,member.proposalRecordRef);
    assert.deepEqual(viewmodels[member.slug],{title:node.title,category:'production',template:'page',scopes:[scope],features:['lang','spiral-fab','theme','map','analysis','arc-nav']}); const expected=expectedAuthoredMain(parse5.parse(source.toString('utf8'))); const actual=outputMain(parse5.parse(page),member.slug); assert.ok(actual); assert.deepEqual(textLeaves(actual),textLeaves(expected),member.slug+': authored text order'); assert.deepEqual(semanticShape(actual),semanticShape(expected),member.slug+': semantic shape'); assert.equal(strings._meta.projectionStats.authoredTextLeafCount,textLeaves(expected).length);
  }
  for(const member of held){ const state=heldState.get(member.slug),page=path.join(ROOT,'pages',member.slug+'.html'),strings=path.join(ROOT,'data','strings','source','pages',member.slug+'.json');assert.deepEqual(pathState(page),state.pageState);assert.deepEqual(pathState(strings),state.stringsState);assert.deepEqual(viewmodels[member.slug],state.vm); }
  for(const member of formation.alreadyComplete){ const state=completeState.get(member.slug); assert.equal(hash(path.join(ROOT,'pages',member.slug+'.html')),state.pageHash,member.slug+': page unchanged'); assert.equal(hash(path.join(ROOT,'data','strings','source','pages',member.slug+'.json')),state.stringsHash,member.slug+': strings unchanged'); assert.deepEqual(viewmodels[member.slug],state.viewmodel,member.slug+': viewmodel unchanged'); }
  assert.deepEqual({nodes:hash(NODES),arcs:hash(ARCS),intents:hash(INTENTS),projector:hash(path.join(ROOT,'tools','vex-content-forge','project_arc_batch.js'))},protectedBefore);
});
