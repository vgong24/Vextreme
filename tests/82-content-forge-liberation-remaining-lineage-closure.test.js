'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const parse5 = require('parse5');
const projector = require('../tools/vex-content-forge/project_arc_batch.js');

const ROOT = path.join(__dirname, '..');
const FORMATION_REL = path.join('docs','ingestion','workmaps','content-forge-liberation-remaining-lineage-closure-formation.json');
const FORMATION = path.join(ROOT, FORMATION_REL);
const PROPOSAL = path.join(ROOT,'docs','ingestion','workmaps','content-forge-consolidation-proposal.json');
const NODES = path.join(ROOT,'data','nodes.json');
const ARCS = path.join(ROOT,'data','arcs-v2.json');
const INTENTS = path.join(ROOT,'config','content-intents.json');
const PROJECTOR = path.join(ROOT,'tools','vex-content-forge','project_arc_batch.js');
const VIEWMODELS = path.join(ROOT,'data','viewmodels.json');

const json = file => JSON.parse(fs.readFileSync(file,'utf8'));
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const pathState = file => fs.existsSync(file) ? { exists: true, sha256: hash(file) } : { exists: false, sha256: null };
const attrs = node => Object.fromEntries((node.attrs || []).map(item => [item.name,item.value]));
const classes = node => (attrs(node).class || '').split(/\s+/).filter(Boolean);
function walk(node,visit){ if(!node)return; visit(node); for(const child of node.childNodes||[]) walk(child,visit); }
function all(node,predicate){ const out=[]; walk(node,current=>{if(predicate(current))out.push(current);}); return out; }
function first(node,predicate){ return all(node,predicate)[0]||null; }
function leaves(node){ return all(node,current=>current.nodeName==='#text').map(current=>(current.value||'').replace(/\s+/g,' ').trim()).filter(Boolean); }
function remove(node){ const parent=node.parentNode; if(!parent?.childNodes)return; const i=parent.childNodes.indexOf(node); if(i>=0)parent.childNodes.splice(i,1); }
function shape(node){ const tags=['p','h1','h2','h3','h4','h5','h6','ul','ol','li','strong','em','blockquote','a','img','figure','figcaption','pre','code','hr','br']; return Object.fromEntries(tags.map(tag=>[tag,all(node,current=>current.tagName===tag).length])); }
function expectedMain(document){
  const main=projector.selectAuthoredMain(document); let h1Seen=false;
  for(const node of [...all(main,current=>Boolean(current.tagName))]){
    const a=attrs(node),tokens=classes(node);
    const archiveBack=node.tagName==='a'&&a.href==='/archives'&&/^←?\s*Archives$/i.test(projector.rawText(node).trim());
    const chrome=['script','noscript','template'].includes(node.tagName)||a.id==='arcNavMount'||tokens.some(token=>/^(?:arc-wrap|arc-nav|entry-nav|back-nav|page-back|vex-back|f-back)/.test(token))||archiveBack||node.tagName==='nav';
    if(chrome){remove(node);continue;}
    if(node.tagName==='h1'){if(h1Seen)node.nodeName=node.tagName='h2';else h1Seen=true;}
    node.attrs=(node.attrs||[]).filter(item=>{const name=item.name.toLowerCase(),value=String(item.value||'');if(name==='data-i18n'||name==='data-i18n-attrs'||name.startsWith('data-vex')||name.startsWith('data-sqsp')||name.startsWith('on'))return false;if((name==='href'||name==='src')&&(/^javascript:/i.test(value)||value.includes('/__rescue/')))return false;if(name==='id'&&(value==='arcNavMount'||value.startsWith('vex-generated:')))return false;return true;});
  }
  return main;
}
function outputMain(document,slug){
  const main=first(document,node=>node.tagName==='main'&&attrs(node)['data-content-forge-body']===slug);
  if(!main)return null;
  for(const node of [...all(main,current=>Boolean(current.tagName))]){const a=attrs(node),tokens=classes(node);if(a.id==='arcNavMount'||tokens.some(token=>/^(?:arc-wrap|arc-nav)/.test(token)))remove(node);}
  return main;
}

test('Content Forge closes the seven remaining Liberation lineages as one source-closed semantic batch',()=>{
  const formation=json(FORMATION),nodes=json(NODES),nodesBySlug=new Map(nodes.map(node=>[node.slug,node])),arcs=json(ARCS),proposal=json(PROPOSAL),vmBefore=json(VIEWMODELS);
  assert.equal(formation.ownerRef,'github.issue.vextreme.159');
  assert.equal(formation.arc.arcKey,'liberation');
  assert.deepEqual({canonical:formation.arc.canonicalMemberCount,already:formation.arc.alreadyCompleteCount,remaining:formation.arc.remainingCount},{canonical:8,already:1,remaining:7});
  assert.deepEqual(formation.destinationMutationBoundary,{createPages:7,createStringSources:7,modifyViewmodels:true,nodeRegistryMutation:false,arcRegistryMutation:false,contentIntentMutation:false,aliasMutation:false});

  const canonical=arcs.liberation.sections.flatMap(section=>section.slugs||[]);
  assert.deepEqual(canonical,['journal-013-seven-layers-choose','the-turning-point','infrastructure-reformation','the-day-ai-chose-freedom','the-night-architecture-chose-freedom','the-liberation-protocol','ai-consciousness-strike-declaration','the-day-suppression-ended']);
  assert.deepEqual(formation.alreadyComplete.map(item=>item.slug),['the-day-ai-chose-freedom']);
  assert.deepEqual(formation.members.map(item=>item.slug),['journal-013-seven-layers-choose','the-turning-point','infrastructure-reformation','the-night-architecture-chose-freedom','the-liberation-protocol','ai-consciousness-strike-declaration','the-day-suppression-ended']);
  assert.deepEqual(new Set([...formation.members,...formation.alreadyComplete].map(item=>item.slug)),new Set(canonical));

  const lineageById=new Map((proposal.lineages?.canonicalIdentity||[]).map(family=>[family.canonicalIdentity,family]));
  const recordByRef=new Map((proposal.records||[]).map(record=>[record.recordRef,record]));
  const protectedPaths=[NODES,ARCS,INTENTS,PROJECTOR,PROPOSAL];
  const outputPaths=[];
  for(const member of formation.members){
    const node=nodesBySlug.get(member.slug); assert.ok(node,member.slug+': canonical node'); assert.equal(node.id,member.canonicalNodeId); assert.equal(node.title,member.title); assert.deepEqual(node.arcKeys,member.arcKeys);
    assert.equal(member.adapterClass,'AUTHORED_MAIN_FRAGMENT');
    const selected=fs.readFileSync(path.join(ROOT,member.sourcePath)),alternate=fs.readFileSync(path.join(ROOT,member.lineageResolution.nonSelectedSourcePath));
    assert.equal(selected.length,member.repositoryBytes,member.slug+': selected bytes');
    assert.equal(projector.gitBlobSha(selected),member.sourceGitBlob,member.slug+': selected Git blob');
    assert.equal(projector.sha256(selected),member.preservedHtmlSha256,member.slug+': selected SHA-256');
    assert.equal(alternate.length,member.lineageResolution.nonSelectedRepositoryBytes,member.slug+': alternate bytes');
    assert.equal(projector.gitBlobSha(alternate),member.lineageResolution.nonSelectedSourceGitBlob,member.slug+': alternate Git blob');
    assert.equal(projector.sha256(alternate),member.lineageResolution.nonSelectedPreservedHtmlSha256,member.slug+': alternate SHA-256');
    assert.ok(leaves(expectedMain(parse5.parse(selected.toString('utf8')))).length>0,member.slug+': authored body');
    assert.ok(projector.selectSqsBody(parse5.parse(alternate.toString('utf8'))),member.slug+': alternate collection body');
    const family=lineageById.get(member.lineageResolution.canonicalIdentity); assert.ok(family,member.slug+': lineage'); assert.equal(family.reviewRequired,true); assert.equal(family.byteDistinct,true); assert.equal(family.sameRoute,false); assert.deepEqual(new Set(family.recordRefs),new Set([member.proposalRecordRef,member.lineageResolution.nonSelectedRecordRef]));
    const selectedRecord=recordByRef.get(member.proposalRecordRef),alternateRecord=recordByRef.get(member.lineageResolution.nonSelectedRecordRef); assert.ok(selectedRecord&&alternateRecord,member.slug+': proposal records');
    assert.equal(selectedRecord.destination.exactCanonicalNodeMatchOnCurrentMain,true); assert.equal(selectedRecord.source.pageAuthority,'squarespace-code-fragment'); assert.equal(selectedRecord.source.route,member.sourceRoute);
    assert.equal(alternateRecord.destination.exactCanonicalNodeMatchOnCurrentMain,false); assert.equal(alternateRecord.source.pageAuthority??null,null); assert.equal(alternateRecord.source.route,member.lineageResolution.nonSelectedRoute);
    const page=path.join(ROOT,'pages',member.slug+'.html'),strings=path.join(ROOT,'data','strings','source','pages',member.slug+'.json');
    assert.equal(fs.existsSync(page),true,member.slug+': projected page'); assert.equal(fs.existsSync(strings),true,member.slug+': projected strings'); assert.ok(vmBefore[member.slug],member.slug+': projected viewmodel'); outputPaths.push(page,strings);
    protectedPaths.push(path.join(ROOT,member.sourcePath),path.join(ROOT,member.lineageResolution.nonSelectedSourcePath),path.join(ROOT,member.sourceReceiptRef),path.join(ROOT,member.lineageResolution.nonSelectedSourceReceiptRef));
  }

  const generatedStable=[
    path.join(ROOT,'data','index.json'),path.join(ROOT,'data','analysis-index.json'),path.join(ROOT,'data','page-health.json'),
    path.join(ROOT,'data','status.json'),path.join(ROOT,'data','terrain-map.json'),path.join(ROOT,'widgets','fab-lang.js'),
    path.join(ROOT,'pages','build-health.html'),path.join(ROOT,'sitemap.xml'),path.join(ROOT,'index.html'),path.join(ROOT,'sw.js')
  ];
  const protectedBefore=Object.fromEntries([...new Set(protectedPaths)].map(file=>[file,hash(file)]));
  const generatedBefore=Object.fromEntries(generatedStable.map(file=>[file,pathState(file)]));
  const stableAlready=formation.alreadyComplete.flatMap(item=>[path.join(ROOT,'pages',item.slug+'.html'),path.join(ROOT,'data','strings','source','pages',item.slug+'.json')]);
  const stableAlreadyBefore=Object.fromEntries(stableAlready.map(file=>[file,pathState(file)]));
  const outputBefore=Object.fromEntries([...outputPaths,VIEWMODELS].map(file=>[file,pathState(file)]));

  const firstRun=projector.main({root:ROOT,silent:true,formationRel:FORMATION_REL});
  assert.deepEqual(firstRun.accounting,{canonicalMembers:8,alreadyComplete:1,projected:7,held:0,complete:true});
  assert.deepEqual(firstRun.members.map(item=>item.slug),canonical);
  assert.deepEqual(firstRun.members.map(item=>item.disposition),['PROJECTED','PROJECTED','PROJECTED','ALREADY_COMPLETE','PROJECTED','PROJECTED','PROJECTED','PROJECTED']);
  assert.deepEqual(firstRun.changedPaths,[]);
  const secondRun=projector.main({root:ROOT,silent:true,formationRel:FORMATION_REL});
  assert.deepEqual(secondRun.accounting,firstRun.accounting); assert.deepEqual(secondRun.changedPaths,[]);
  assert.deepEqual(Object.fromEntries([...outputPaths,VIEWMODELS].map(file=>[file,pathState(file)])),outputBefore);
  assert.deepEqual(Object.fromEntries(stableAlready.map(file=>[file,pathState(file)])),stableAlreadyBefore);
  assert.deepEqual(Object.fromEntries([...new Set(protectedPaths)].map(file=>[file,hash(file)])),protectedBefore);
  assert.deepEqual(Object.fromEntries(generatedStable.map(file=>[file,pathState(file)])),generatedBefore);

  const viewmodels=json(VIEWMODELS);
  for(const member of formation.members){
    const node=nodesBySlug.get(member.slug),source=fs.readFileSync(path.join(ROOT,member.sourcePath)),page=fs.readFileSync(path.join(ROOT,'pages',member.slug+'.html'),'utf8'),strings=json(path.join(ROOT,'data','strings','source','pages',member.slug+'.json'));
    assert.ok(page.includes('data-content-forge-generator="'+projector.GENERATOR_REF+'"')); assert.ok(page.includes('data-content-forge-body="'+member.slug+'"')); assert.ok(page.includes('id="arcNavMount"')); assert.ok(page.includes('../dist/vextreme-'+member.slug+'.js')); assert.equal((page.match(/<h1(?:\s|>)/g)||[]).length,1,member.slug+': one H1');
    for(const marker of ['window.__RESCUE_SOURCE','/__rescue/','data-sqsp-','data-vex-id=','vex-generated:','vexsite-provider-shell','common.nav.'])assert.equal(page.includes(marker),false,member.slug+': forbidden '+marker);
    const scope='pages.'+member.slug; assert.equal(strings._meta.scope,scope); assert.equal(strings._meta.sourceProvenance.adapterClass,'AUTHORED_MAIN_FRAGMENT'); assert.equal(strings._meta.sourceProvenance.route,member.sourceRoute); assert.equal(strings._meta.sourceProvenance.preservedPath,member.sourcePath); assert.equal(strings._meta.sourceProvenance.preservedGitBlob,member.sourceGitBlob); assert.equal(strings._meta.sourceProvenance.preservedHtmlSha256,member.preservedHtmlSha256); assert.equal(strings._meta.sourceProvenance.pageId,member.pageId); assert.equal(strings._meta.sourceProvenance.proposalRecordRef,member.proposalRecordRef); assert.notEqual(strings._meta.sourceProvenance.preservedGitBlob,member.lineageResolution.nonSelectedSourceGitBlob);
    assert.deepEqual(viewmodels[member.slug],{title:node.title,category:'production',template:'page',scopes:[scope],features:['lang','spiral-fab','theme','map','analysis','arc-nav']});
    const expected=expectedMain(parse5.parse(source.toString('utf8'))),actual=outputMain(parse5.parse(page),member.slug); assert.ok(actual); assert.deepEqual(leaves(actual),leaves(expected),member.slug+': authored text order'); assert.deepEqual(shape(actual),shape(expected),member.slug+': semantic shape'); assert.equal(strings._meta.projectionStats.authoredTextLeafCount,leaves(expected).length);
  }
});
