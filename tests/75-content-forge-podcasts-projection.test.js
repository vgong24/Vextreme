
'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const parse5 = require('parse5');
const projector = require('../tools/vex-content-forge/project_arc_batch.js');
const ROOT=path.join(__dirname,'..');
const FORM=path.join(ROOT,'docs','ingestion','workmaps','content-forge-podcasts-projection-formation.json');
const SOURCE=path.join(ROOT,'docs','ingestion','source-pages','part-020','podcasts.html');
const PAGE=path.join(ROOT,'pages','podcasts.html');
const STRINGS=path.join(ROOT,'data','strings','source','pages','podcasts.json');
const VIEWMODELS=path.join(ROOT,'data','viewmodels.json');
const NODES=path.join(ROOT,'data','nodes.json');
const PROPOSAL=path.join(ROOT,'docs','ingestion','workmaps','content-forge-consolidation-proposal.json');
const attrs=n=>Object.fromEntries((n.attrs||[]).map(a=>[a.name,a.value]));
const classes=n=>(attrs(n).class||'').split(/\s+/).filter(Boolean);
function walk(n,fn){if(!n)return;fn(n);for(const c of n.childNodes||[])walk(c,fn)}
function all(n,fn){const o=[];walk(n,x=>{if(fn(x))o.push(x)});return o}
function remove(n){const p=n.parentNode;if(!p?.childNodes)return;const i=p.childNodes.indexOf(n);if(i>=0)p.childNodes.splice(i,1)}
function leaves(n){return all(n,x=>x.nodeName==='#text').map(x=>(x.value||'').replace(/\s+/g,' ').trim()).filter(Boolean)}
function shape(n){const tags=['p','h1','h2','h3','h4','h5','h6','ul','ol','li','strong','em','blockquote','a','img','figure','figcaption','pre','code','hr','br'];return Object.fromEntries(tags.map(t=>[t,all(n,x=>x.tagName===t).length]))}
function expectedMain(doc){const main=projector.selectAuthoredMain(doc);let h1=false;for(const n of [...all(main,x=>Boolean(x.tagName))]){const a=attrs(n),cs=classes(n);const back=n.tagName==='a'&&a.href==='/archives'&&/^←?\s*Archives$/i.test(projector.rawText(n).trim());const chrome=['script','noscript','template'].includes(n.tagName)||a.id==='arcNavMount'||cs.some(t=>/^(?:arc-wrap|arc-nav|entry-nav|back-nav|page-back|vex-back|f-back)/.test(t))||back||n.tagName==='nav';if(chrome){remove(n);continue;}if(n.tagName==='h1'){if(h1)n.nodeName=n.tagName='h2';else h1=true;}n.attrs=(n.attrs||[]).filter(it=>{const name=it.name.toLowerCase(),v=String(it.value||'');if(name==='data-i18n'||name==='data-i18n-attrs'||name.startsWith('data-vex')||name.startsWith('data-sqsp')||name.startsWith('on'))return false;if((name==='href'||name==='src')&&(/^javascript:/i.test(v)||v.includes('/__rescue/')))return false;if(name==='id'&&(v==='arcNavMount'||v.startsWith('vex-generated:')))return false;return true;});}return main;}
function outputMain(doc){const main=all(doc,n=>n.tagName==='main'&&attrs(n)['data-content-forge-body']==='podcasts')[0]||null;if(!main)return null;for(const n of [...all(main,x=>Boolean(x.tagName))]){const a=attrs(n),cs=classes(n);if(a.id==='arcNavMount'||cs.some(t=>/^(?:arc-wrap|arc-nav)/.test(t)))remove(n);}return main;}
test('Content Forge Podcasts singleton projection remains exact and source-linked while later frontier work advances independently',()=>{
 const f=JSON.parse(fs.readFileSync(FORM,'utf8')),nodes=JSON.parse(fs.readFileSync(NODES,'utf8')),proposal=JSON.parse(fs.readFileSync(PROPOSAL,'utf8'));
 assert.equal(f.ownerRef,'github.issue.vextreme.159');assert.equal(f.destination.slug,'podcasts');assert.equal(f.destination.requiresJudgment,false);assert.equal(f.projectionMechanism.persistedProjectorMutation,false);
 const node=nodes.find(n=>n.slug==='podcasts');assert.deepEqual(node,{id:18,slug:'podcasts',title:'Marquis Masters Podcast',date:'November 14, 2025',arcKeys:['full_timeline'],vexData:{}});
 const rec=proposal.records.find(r=>r.recordRef==='content-forge.source-record.0da47fb472b1b29c53e1');assert.ok(rec);assert.equal(rec.destination.canonicalIdentity,'id:18');assert.equal(rec.destination.exactCanonicalNodeMatchOnCurrentMain,true);assert.equal(rec.classification.requiresJudgment,false);assert.equal(rec.source.route,'/podcasts');assert.equal(rec.source.pageId,'92aec3608298f7d7');
 const lin=(proposal.lineages?.canonicalIdentity||[]).find(x=>x.canonicalIdentity==='id:18');assert.ok(!lin||lin.reviewRequired!==true);
 const source=fs.readFileSync(SOURCE);assert.equal(source.length,43237);assert.equal(projector.gitBlobSha(source),'94fa252b75f3350d6703699cd1f10ebf43511c42');assert.equal(projector.sha256(source),'0ca99b655ff77726aecf402698045df7c6d3d113514b7ed2933d9bcc8022ff32');
 const page=fs.readFileSync(PAGE,'utf8'),strings=JSON.parse(fs.readFileSync(STRINGS,'utf8')),vm=JSON.parse(fs.readFileSync(VIEWMODELS,'utf8'));
 assert.ok(page.includes('data-content-forge-generator="'+projector.GENERATOR_REF+'"'));assert.ok(page.includes('data-content-forge-body="podcasts"'));assert.ok(page.includes('id="arcNavMount"'));assert.ok(page.includes('../dist/vextreme-podcasts.js'));assert.equal((page.match(/<h1(?:\s|>)/g)||[]).length,1);
 for(const mark of ['window.__RESCUE_SOURCE','/__rescue/','data-sqsp-','data-vex-id=','vex-generated:','vexsite-provider-shell','common.nav.'])assert.equal(page.includes(mark),false,'forbidden '+mark);
 assert.equal(strings._meta.scope,'pages.podcasts');assert.equal(strings._meta.sourceProvenance.adapterClass,'AUTHORED_MAIN_FRAGMENT');assert.equal(strings._meta.sourceProvenance.route,'/podcasts');assert.equal(strings._meta.sourceProvenance.preservedPath,'docs/ingestion/source-pages/part-020/podcasts.html');assert.equal(strings._meta.sourceProvenance.preservedGitBlob,'94fa252b75f3350d6703699cd1f10ebf43511c42');assert.equal(strings._meta.sourceProvenance.preservedHtmlSha256,'0ca99b655ff77726aecf402698045df7c6d3d113514b7ed2933d9bcc8022ff32');assert.equal(strings._meta.sourceProvenance.pageId,'92aec3608298f7d7');assert.equal(strings._meta.sourceProvenance.proposalRecordRef,'content-forge.source-record.0da47fb472b1b29c53e1');
 assert.deepEqual(vm.podcasts,{title:'Marquis Masters Podcast',category:'production',template:'page',scopes:['pages.podcasts'],features:['lang','spiral-fab','theme','map','analysis','arc-nav']});
 const exp=expectedMain(parse5.parse(source.toString('utf8'))),act=outputMain(parse5.parse(page));assert.ok(act);assert.deepEqual(leaves(act),leaves(exp));assert.deepEqual(shape(act),shape(exp));assert.equal(strings._meta.projectionStats.authoredTextLeafCount,leaves(exp).length);
 const health=JSON.parse(fs.readFileSync(path.join(ROOT,'data','page-health.json'),'utf8')).pages.podcasts;assert.ok(health);assert.equal(health.placement.state,'sorted');assert.deepEqual(health.placement.arcKeys,['full_timeline']);assert.equal(health.runtime.godScript,true);assert.equal(health.runtime.shell,false);assert.equal(health.navigation.navigable,true);assert.equal(health.identity.languages.en.state,'full');
 const sm=fs.readFileSync(path.join(ROOT,'sitemap.xml'),'utf8'),ix=fs.readFileSync(path.join(ROOT,'index.html'),'utf8');assert.ok(sm.includes('podcasts.html'));const live=/(\d+) of 76 pages live/.exec(ix);assert.ok(live);assert.ok(Number(live[1])>=60);
});
