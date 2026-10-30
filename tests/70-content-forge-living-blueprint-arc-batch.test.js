'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const parse5 = require('parse5');
const projector = require('../tools/vex-content-forge/project_arc_batch.js');

const ROOT = path.join(__dirname, '..');
const FORMATION_REL = path.join('docs','ingestion','workmaps','content-forge-living-blueprint-arc-batch-formation.json');
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
function findFirst(node,predicate){ return findAll(node,predicate)[0]||null; }
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
  const main=findFirst(document,node=>node.tagName==='main'&&attrs(node)['data-content-forge-body']===slug);
  if(!main)return null;
  for(const node of [...findAll(main,current=>Boolean(current.tagName))]){ const a=attrs(node); const tokens=classes(node); if(a.id==='arcNavMount'||tokens.some(token=>/^(?:arc-wrap|arc-nav)/.test(token))) remove(node); }
  return main;
}

test('Content Forge Living Blueprint completes the exact canonical arc from unique preserved authored sources',()=>{
  const formation=json(FORMATION); const nodes=json(NODES); const nodesBySlug=new Map(nodes.map(node=>[node.slug,node])); const arcs=json(ARCS); const proposal=json(PROPOSAL);
  const protectedBefore={nodes:hash(NODES),arcs:hash(ARCS),intents:hash(INTENTS),projector:hash(path.join(ROOT,'tools','vex-content-forge','project_arc_batch.js'))};
  assert.equal(formation.ownerRef,'github.issue.vextreme.159');
  assert.equal(formation.arc.arcKey,'living_blueprint');
  assert.deepEqual({canonical:formation.arc.canonicalMemberCount,already:formation.arc.alreadyCompleteCount,remaining:formation.arc.remainingCount},{canonical:5,already:0,remaining:5});
  assert.deepEqual(formation.destinationMutationBoundary,{createPages:5,createStringSources:5,modifyViewmodels:true,nodeRegistryMutation:false,arcRegistryMutation:false,contentIntentMutation:false,aliasMutation:false});
  const canonical=arcs.living_blueprint.sections.flatMap(section=>section.slugs||[]);
  assert.deepEqual(canonical,['the-grimoire','covenant-access','life-pattern-mapping','grief-resolution','discernment-mapping']);
  assert.deepEqual(formation.members.map(item=>item.slug),canonical);
  assert.deepEqual(formation.alreadyComplete,[]);
  assert.ok(formation.members.every(item=>item.adapterClass==='AUTHORED_MAIN_FRAGMENT'));
  assert.ok(formation.members.every(item=>item.preclassifiedHoldReason===undefined));

  const proposalByRef=new Map(proposal.records.map(record=>[record.recordRef,record]));
  const lineageById=new Map((proposal.lineages?.canonicalIdentity||[]).map(family=>[family.canonicalIdentity,family]));
  for(const member of formation.members){
    const node=nodesBySlug.get(member.slug); assert.ok(node,member.slug+': canonical slot'); assert.equal(node.id,member.canonicalNodeId); assert.equal(node.title,member.title); assert.deepEqual(node.arcKeys,member.arcKeys);
    const record=proposalByRef.get(member.proposalRecordRef); assert.ok(record,member.slug+': proposal record'); assert.equal(record.destination.exactCanonicalNodeMatchOnCurrentMain,true); assert.equal(record.classification.requiresJudgment,false); assert.equal(record.source.route,member.sourceRoute); assert.equal(record.source.pageId,member.pageId);
    if(member.canonicalNodeId!==null){ const family=lineageById.get('id:'+member.canonicalNodeId); assert.ok(!family || family.reviewRequired!==true,member.slug+': no unresolved canonical lineage family'); }
    const source=fs.readFileSync(path.join(ROOT,member.sourcePath)); assert.equal(source.length,member.repositoryBytes,member.slug+': exact source bytes'); assert.equal(projector.gitBlobSha(source),member.sourceGitBlob,member.slug+': exact Git blob'); assert.equal(projector.sha256(source),member.preservedHtmlSha256,member.slug+': exact SHA-256');
    assert.ok(textLeaves(expectedAuthoredMain(parse5.parse(source.toString('utf8')))).length>0,member.slug+': authored text present');
  }

  const first=projector.main({root:ROOT,silent:true,formationRel:FORMATION_REL});
  assert.deepEqual(first.accounting,{canonicalMembers:5,alreadyComplete:0,projected:5,held:0,complete:true});
  assert.deepEqual(first.members.map(item=>item.slug),canonical);
  assert.deepEqual(first.members.map(item=>item.disposition),canonical.map(()=> 'PROJECTED'));

  const generated=formation.members.flatMap(member=>[path.join(ROOT,'pages',member.slug+'.html'),path.join(ROOT,'data','strings','source','pages',member.slug+'.json')]);
  const firstHashes=Object.fromEntries([...generated,VIEWMODELS].map(file=>[file,hash(file)]));
  const second=projector.main({root:ROOT,silent:true,formationRel:FORMATION_REL}); const secondHashes=Object.fromEntries([...generated,VIEWMODELS].map(file=>[file,hash(file)]));
  assert.deepEqual(second.accounting,first.accounting); assert.deepEqual(second.members.map(item=>item.slug),canonical); assert.deepEqual(second.changedPaths,[]); assert.deepEqual(secondHashes,firstHashes);

  const viewmodels=json(VIEWMODELS);
  for(const member of formation.members){
    const node=nodesBySlug.get(member.slug); const source=fs.readFileSync(path.join(ROOT,member.sourcePath)); const page=fs.readFileSync(path.join(ROOT,'pages',member.slug+'.html'),'utf8'); const strings=json(path.join(ROOT,'data','strings','source','pages',member.slug+'.json'));
    assert.ok(page.includes('data-content-forge-generator="'+projector.GENERATOR_REF+'"')); assert.ok(page.includes('data-content-forge-body="'+member.slug+'"')); assert.ok(page.includes('id="arcNavMount"')); assert.ok(page.includes('../dist/vextreme-'+member.slug+'.js')); assert.equal((page.match(/<h1(?:\s|>)/g)||[]).length,1,member.slug+': one H1');
    for(const marker of ['window.__RESCUE_SOURCE','/__rescue/','data-sqsp-','data-vex-id=','vex-generated:','vexsite-provider-shell','common.nav.']) assert.equal(page.includes(marker),false,member.slug+': forbidden '+marker);
    const scope='pages.'+member.slug; assert.equal(strings._meta.scope,scope); assert.equal(strings._meta.sourceProvenance.adapterClass,'AUTHORED_MAIN_FRAGMENT'); assert.equal(strings._meta.sourceProvenance.route,member.sourceRoute); assert.equal(strings._meta.sourceProvenance.preservedPath,member.sourcePath); assert.equal(strings._meta.sourceProvenance.preservedGitBlob,member.sourceGitBlob); assert.equal(strings._meta.sourceProvenance.preservedHtmlSha256,member.preservedHtmlSha256); assert.equal(strings._meta.sourceProvenance.pageId,member.pageId); assert.equal(strings._meta.sourceProvenance.proposalRecordRef,member.proposalRecordRef);
    assert.deepEqual(viewmodels[member.slug],{title:node.title,category:'production',template:'page',scopes:[scope],features:['lang','spiral-fab','theme','map','analysis','arc-nav']});
    const expected=expectedAuthoredMain(parse5.parse(source.toString('utf8'))); const actual=outputMain(parse5.parse(page),member.slug); assert.ok(actual); assert.deepEqual(textLeaves(actual),textLeaves(expected),member.slug+': authored text order'); assert.deepEqual(semanticShape(actual),semanticShape(expected),member.slug+': semantic shape'); assert.equal(strings._meta.projectionStats.authoredTextLeafCount,textLeaves(expected).length);
  }
  assert.deepEqual({nodes:hash(NODES),arcs:hash(ARCS),intents:hash(INTENTS),projector:hash(path.join(ROOT,'tools','vex-content-forge','project_arc_batch.js'))},protectedBefore);
});
