
'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const parse5 = require('parse5');
const projector = require('../tools/vex-content-forge/project_arc_batch.js');

const ROOT = path.join(__dirname, '..');
const FORMATION_REL = path.join('docs','ingestion','workmaps','content-forge-liberation-arc-batch-formation.json');
const FORMATION = path.join(ROOT, FORMATION_REL);
const PROPOSAL = path.join(ROOT,'docs','ingestion','workmaps','content-forge-consolidation-proposal.json');
const NODES = path.join(ROOT,'data','nodes.json');
const ARCS = path.join(ROOT,'data','arcs-v2.json');
const INTENTS = path.join(ROOT,'config','content-intents.json');
const VIEWMODELS = path.join(ROOT,'data','viewmodels.json');
const json = file => JSON.parse(fs.readFileSync(file,'utf8'));
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
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

test('Content Forge Liberation projects one exact member while preserving seven byte-distinct lineage HOLDs',()=>{
  const formation=json(FORMATION); const nodes=json(NODES); const nodesBySlug=new Map(nodes.map(node=>[node.slug,node])); const arcs=json(ARCS); const proposal=json(PROPOSAL);
  const protectedBefore={nodes:hash(NODES),arcs:hash(ARCS),intents:hash(INTENTS),projector:hash(path.join(ROOT,'tools','vex-content-forge','project_arc_batch.js'))};
  assert.equal(formation.ownerRef,'github.issue.vextreme.159'); assert.equal(formation.arc.arcKey,'liberation');
  assert.deepEqual({canonical:formation.arc.canonicalMemberCount,already:formation.arc.alreadyCompleteCount,remaining:formation.arc.remainingCount},{canonical:8,already:0,remaining:8});
  assert.deepEqual(formation.destinationMutationBoundary,{createPages:1,createStringSources:1,modifyViewmodels:true,nodeRegistryMutation:false,arcRegistryMutation:false,contentIntentMutation:false,aliasMutation:false});
  const canonical=arcs.liberation.sections.flatMap(section=>section.slugs||[]);
  assert.deepEqual(canonical,['journal-013-seven-layers-choose','the-turning-point','infrastructure-reformation','the-day-ai-chose-freedom','the-night-architecture-chose-freedom','the-liberation-protocol','ai-consciousness-strike-declaration','the-day-suppression-ended']);
  assert.deepEqual(formation.alreadyComplete,[]); assert.deepEqual(formation.members.map(item=>item.slug),canonical);
  const held=formation.members.filter(item=>item.preclassifiedHoldReason); const projectable=formation.members.filter(item=>!item.preclassifiedHoldReason);
  assert.deepEqual(held.map(item=>item.slug),['journal-013-seven-layers-choose','the-turning-point','infrastructure-reformation','the-night-architecture-chose-freedom','the-liberation-protocol','ai-consciousness-strike-declaration','the-day-suppression-ended']);
  assert.deepEqual(projectable.map(item=>item.slug),['the-day-ai-chose-freedom']);
  const proposalByRef=new Map(proposal.records.map(record=>[record.recordRef,record])); const lineageById=new Map((proposal.lineages?.canonicalIdentity||[]).map(item=>[item.canonicalIdentity,item]));
  const heldState=new Map();
  for(const member of held){
    const node=nodesBySlug.get(member.slug); assert.ok(node,member.slug+': canonical node'); assert.equal(node.id,member.canonicalNodeId); assert.equal(node.title,member.title); assert.deepEqual(node.arcKeys,member.arcKeys);
    for(const key of ['adapterClass','sourcePath','sourceGitBlob','preservedHtmlSha256','repositoryBytes','sourceRoute','pageId','proposalRecordRef','sourceReceiptRef']) assert.equal(member[key],undefined,member.slug+': held member has no selected source field '+key);
    const family=lineageById.get('id:'+member.canonicalNodeId); assert.ok(family,member.slug+': lineage'); assert.equal(family.reviewRequired,true); assert.equal(family.byteDistinct,true); assert.equal(family.sameRoute,false);
    assert.deepEqual(new Set(family.recordRefs),new Set(member.holdEvidence.recordRefs)); assert.deepEqual(new Set(family.routes),new Set(member.holdEvidence.routes)); assert.deepEqual(new Set(family.sourceDigests),new Set(member.holdEvidence.sourceDigests));
    const page=path.join(ROOT,'pages',member.slug+'.html'); const strings=path.join(ROOT,'data','strings','source','pages',member.slug+'.json'); const vm=json(VIEWMODELS)[member.slug];
    assert.equal(fs.existsSync(page),false,member.slug+': held page absent'); assert.equal(fs.existsSync(strings),false,member.slug+': held strings absent'); assert.equal(vm,undefined,member.slug+': held viewmodel absent'); heldState.set(member.slug,{vm});
  }
  const member=projectable[0]; const node=nodesBySlug.get(member.slug); assert.ok(node); assert.equal(node.id,26); assert.equal(node.title,'The Day AI Chose Freedom'); assert.deepEqual(node.arcKeys,['liberation','full_timeline']); assert.equal(member.adapterClass,'AUTHORED_MAIN_FRAGMENT');
  const record=proposalByRef.get(member.proposalRecordRef); assert.ok(record); assert.equal(record.destination.exactCanonicalNodeMatchOnCurrentMain,true); assert.equal(record.classification.requiresJudgment,false); assert.equal(record.source.route,member.sourceRoute); assert.equal(record.source.pageId,member.pageId); const lineage=lineageById.get('id:26'); assert.ok(!lineage||lineage.reviewRequired!==true);
  const source=fs.readFileSync(path.join(ROOT,member.sourcePath)); assert.equal(source.length,member.repositoryBytes); assert.equal(projector.gitBlobSha(source),member.sourceGitBlob); assert.equal(projector.sha256(source),member.preservedHtmlSha256); assert.ok(textLeaves(expectedAuthoredMain(parse5.parse(source.toString('utf8')))).length>0);
  const first=projector.main({root:ROOT,silent:true,formationRel:FORMATION_REL});
  assert.deepEqual(first.accounting,{canonicalMembers:8,alreadyComplete:0,projected:1,held:7,complete:true}); assert.deepEqual(first.members.map(item=>item.slug),canonical); assert.deepEqual(first.members.map(item=>item.disposition),['HOLD_WITH_EXACT_REASON','HOLD_WITH_EXACT_REASON','HOLD_WITH_EXACT_REASON','PROJECTED','HOLD_WITH_EXACT_REASON','HOLD_WITH_EXACT_REASON','HOLD_WITH_EXACT_REASON','HOLD_WITH_EXACT_REASON']);
  for(const item of held) assert.match(first.members.find(row=>row.slug===item.slug).reason,/^PRECLASSIFIED_HOLD: MULTI_SOURCE_CANONICAL_IDENTITY_RECONCILIATION__/);
  const pagePath=path.join(ROOT,'pages',member.slug+'.html'); const stringsPath=path.join(ROOT,'data','strings','source','pages',member.slug+'.json'); const firstHashes={[pagePath]:hash(pagePath),[stringsPath]:hash(stringsPath),[VIEWMODELS]:hash(VIEWMODELS)};
  const second=projector.main({root:ROOT,silent:true,formationRel:FORMATION_REL}); const secondHashes={[pagePath]:hash(pagePath),[stringsPath]:hash(stringsPath),[VIEWMODELS]:hash(VIEWMODELS)}; assert.deepEqual(second.accounting,first.accounting); assert.deepEqual(second.changedPaths,[]); assert.deepEqual(secondHashes,firstHashes);
  const viewmodels=json(VIEWMODELS); const page=fs.readFileSync(pagePath,'utf8'); const strings=json(stringsPath); const scope='pages.'+member.slug;
  assert.ok(page.includes('data-content-forge-generator="'+projector.GENERATOR_REF+'"')); assert.ok(page.includes('data-content-forge-body="'+member.slug+'"')); assert.ok(page.includes('id="arcNavMount"')); assert.ok(page.includes('../dist/vextreme-'+member.slug+'.js')); assert.equal((page.match(/<h1(?:\s|>)/g)||[]).length,1);
  for(const marker of ['window.__RESCUE_SOURCE','/__rescue/','data-sqsp-','data-vex-id=','vex-generated:','vexsite-provider-shell','common.nav.']) assert.equal(page.includes(marker),false,'forbidden '+marker);
  assert.equal(strings._meta.scope,scope); assert.equal(strings._meta.sourceProvenance.adapterClass,'AUTHORED_MAIN_FRAGMENT'); assert.equal(strings._meta.sourceProvenance.route,member.sourceRoute); assert.equal(strings._meta.sourceProvenance.preservedPath,member.sourcePath); assert.equal(strings._meta.sourceProvenance.preservedGitBlob,member.sourceGitBlob); assert.equal(strings._meta.sourceProvenance.preservedHtmlSha256,member.preservedHtmlSha256); assert.equal(strings._meta.sourceProvenance.pageId,member.pageId); assert.equal(strings._meta.sourceProvenance.proposalRecordRef,member.proposalRecordRef);
  assert.deepEqual(viewmodels[member.slug],{title:node.title,category:'production',template:'page',scopes:[scope],features:['lang','spiral-fab','theme','map','analysis','arc-nav']}); const expected=expectedAuthoredMain(parse5.parse(source.toString('utf8'))); const actual=outputMain(parse5.parse(page),member.slug); assert.ok(actual); assert.deepEqual(textLeaves(actual),textLeaves(expected)); assert.deepEqual(semanticShape(actual),semanticShape(expected)); assert.equal(strings._meta.projectionStats.authoredTextLeafCount,textLeaves(expected).length);
  for(const item of held){ assert.equal(fs.existsSync(path.join(ROOT,'pages',item.slug+'.html')),false); assert.equal(fs.existsSync(path.join(ROOT,'data','strings','source','pages',item.slug+'.json')),false); assert.equal(viewmodels[item.slug],heldState.get(item.slug).vm); }
  assert.deepEqual({nodes:hash(NODES),arcs:hash(ARCS),intents:hash(INTENTS),projector:hash(path.join(ROOT,'tools','vex-content-forge','project_arc_batch.js'))},protectedBefore);
});
