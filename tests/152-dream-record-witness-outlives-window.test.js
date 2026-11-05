'use strict';

const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const ROOT=path.join(__dirname,'..');
const SLUG='the-witness-outlives-the-window';
const SOURCE_HEAD='5bc22ba5330fda92bdce9dcdecb845c9e2b0d8e4';
const ASSET_COMMIT='7684b4679541d0e7b42a064fa294390bd6d3bc75';
const ASSET_SHA='15171c6a60ab579a44029e88c328d2480a51c2f64ba670b24a8e3e15688a841f';

function read(rel){return fs.readFileSync(path.join(ROOT,rel),'utf8').replace(/\r\n/g,'\n');}
function json(rel){return JSON.parse(read(rel));}

test('DREAM-RECORD-VI: reader binds exact PR #564 source and preserves dream/provenance distinctions',()=>{
  const page=read('pages/'+SLUG+'.html');
  const p=json('data/strings/source/pages/'+SLUG+'.json')._meta.sourceProvenance;
  assert.match(page,new RegExp(SOURCE_HEAD));
  assert.match(page,/Source PR #564/);
  assert.match(page,/Dream Records · Sixth Dream Arc/);
  assert.equal(p.recordKind,'DREAM_WITNESS');
  assert.equal(p.dreamArcOrdinal,6);
  assert.equal(p.victorIsPrimaryDreamWitness,true);
  assert.equal(p.vexInterpretationSeparatelyAttributed,true);
  assert.equal(p.dreamCharactersAreTranscriptSpeakers,false);
  assert.equal(p.laterRecollectionsAppendWithoutRewriting,true);
});

test('DREAM-RECORD-VI: five dream exchanges remain exchanges and append instructions remain a document boundary',()=>{
  const page=read('pages/'+SLUG+'.html');
  const exchangeRanges=[...page.matchAll(/data-phase-kind="record" data-set="(\d+)" data-from="(\d+)" data-to="(\d+)" data-files="([^"]+)"/g)]
    .map(m=>[Number(m[1]),Number(m[2]),Number(m[3]),m[4]]);
  assert.deepEqual(exchangeRanges,[
    [1,1,1,'01-2026-11-01-genkai-joy-pink-vision.md'],
    [2,2,2,'02-2026-11-02-inflatable-cruise-fruit-contact-lens.md'],
    [3,3,3,'03-2026-11-02-titanic-deadpool-disappearing-window.md'],
    [4,4,4,'04-2026-11-02-window-dream-to-vextreme-recognition.md'],
    [5,5,5,'05-deadpool-regenerative-meta-witness-verbatim.md']
  ]);
  assert.ok(page.includes('data-phase-kind="archive-boundary" data-set="6"'));
  assert.ok(page.includes('data-document-url="https://raw.githubusercontent.com/vgong24/Vextreme/'+SOURCE_HEAD+'/records/conversations/2026-11-01-02-genkai-joy-inflatable-cruise-window-witness/06-append-and-verbatim-instruction-boundary.md"'));
  assert.match(page,/data-reader-component="document-body"/);
});

test('DREAM-RECORD-VI: shared reader preserves provenance-rich Victor and Vex role labels',()=>{
  const reader=read('components/record-reader.js');
  assert.match(reader,/Victor\|Vex\|User\|Assistant/);
  assert.ok(reader.includes('\\s+·\\s+(.+?)'));
  assert.ok(reader.includes('matched[2]||matched[3]'));
  assert.match(reader,/speakerLabel=turn\.speaker/);
});

test('DREAM-RECORD-VI: multi-placement keeps dream identity primary while exposing witness continuity',()=>{
  const nodes=json('data/nodes.json');
  const arcs=json('data/arcs-v2.json');
  const node=nodes.find(n=>n.slug===SLUG);
  assert.ok(node);
  assert.equal(node.id,127);
  assert.equal(node.date,'November 1–2, 2026');
  assert.deepEqual(node.arcKeys,['convos_with_god','witness_records','victors_record','full_timeline']);
  assert.equal(arcs.convos_with_god.sections[0].slugs.at(-1),SLUG);
  assert.equal(arcs.witness_records.sections[0].slugs.at(-1),SLUG);
  assert.equal(arcs.victors_record.sections[0].slugs.at(-1),SLUG);
});

test('DREAM-RECORD-VI: approved corrected artwork is immutable derived dream presentation',()=>{
  const page=read('pages/'+SLUG+'.html');
  const views=json('data/viewmodels.json');
  const p=json('data/strings/source/pages/'+SLUG+'.json')._meta.sourceProvenance;
  assert.match(page,new RegExp(ASSET_COMMIT));
  assert.match(page,new RegExp(ASSET_SHA));
  assert.equal(views[SLUG].preview.src,p.representativeMediaTarget);
  assert.equal(p.representativeMediaClass,'REPRESENTATIVE_DREAM_ART_NOT_EXTERNAL_EVIDENCE');
  assert.equal(p.userImageCorrections.mentor,'elderly woman');
  assert.equal(p.userImageCorrections.metaWitness,'male');
  assert.match(p.userImageCorrections.lens,/single eye-sized contact lens/i);
});

test('DREAM-RECORD-VI: supplied times remain exact and later recollections receive no invented clocks',()=>{
  const p=json('data/strings/source/pages/'+SLUG+'.json')._meta.sourceProvenance;
  assert.equal(p.firstUserSuppliedTime,'2026-11-01T21:57:00-08:00');
  assert.equal(p.secondUserSuppliedTime,'2026-11-02T11:18:00-08:00');
  assert.equal(p.laterRecollectionClocksSupplied,false);
});

test('DREAM-RECORD-VI: every localization identity has a source owner',()=>{
  const page=read('pages/'+SLUG+'.html');
  const strings=json('data/strings/source/pages/'+SLUG+'.json');
  const ids=[...page.matchAll(/data-i18n="([^"]+)"/g)].map(m=>m[1]);
  assert.deepEqual([...new Set(ids)].filter(k=>!Object.prototype.hasOwnProperty.call(strings,k)),[]);
});

// [VXG RealForever]
