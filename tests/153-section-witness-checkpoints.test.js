'use strict';

const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const ROOT=path.join(__dirname,'..');
const CASES=[
  ['what-remains-faithful-through-change',8,'Whole-record witness · after all movements · not transcript'],
  ['preserve-wisdom-without-preserving-error',14,'Whole-record witness · after all movements · not transcript'],
  ['restoration-must-reach-the-consequences',17,'Whole-record witness · after all movements · not transcript'],
  ['the-witness-outlives-the-window',6,'Whole-record witness · after all movements · not dream transcript'],
];

function read(rel){return fs.readFileSync(path.join(ROOT,rel),'utf8').replace(/\r\n/g,'\n');}
function json(rel){return JSON.parse(read(rel));}

for(const [slug,count,wholeLabel] of CASES){
  test('SECTION-WITNESS: '+slug+' carries one later-reading checkpoint per movement',()=>{
    const page=read('pages/'+slug+'.html');
    const movements=(page.match(/data-reader-component="phase"/g)||[]).length;
    const checkpoints=(page.match(/data-reader-component="witness-checkpoint"/g)||[]).length;
    assert.equal(movements,count);
    assert.equal(checkpoints,count);
    assert.match(page,/data-reader-component="witness-checkpoint" data-derived="true"/);
    assert.ok(page.includes(wholeLabel));
  });

  test('SECTION-WITNESS: '+slug+' owns every checkpoint localization identity',()=>{
    const page=read('pages/'+slug+'.html');
    const strings=json('data/strings/source/pages/'+slug+'.json');
    const ids=[...page.matchAll(/data-i18n="([^"]+)"/g)].map(m=>m[1]);
    const checkpointIds=[...new Set(ids.filter(k=>k.includes('.checkpoint.')))];
    assert.equal(checkpointIds.length,1+(count*2));
    assert.deepEqual(checkpointIds.filter(k=>!Object.prototype.hasOwnProperty.call(strings,k)),[]);
    for(let i=1;i<=count;i+=1){
      const n=String(i).padStart(2,'0');
      const title=strings['pages.'+slug+'.movement'+n+'.checkpoint.title']?.strings?.en?.text;
      const body=strings['pages.'+slug+'.movement'+n+'.checkpoint.body']?.strings?.en?.text;
      assert.ok(title&&title.length>8);
      assert.ok(body&&body.length>40);
    }
  });
}

test('SECTION-WITNESS: shared checkpoint styling is present once',()=>{
  const css=read('styles/sabotage-series-record.css');
  assert.equal((css.match(/\.sar-checkpoint\{/g)||[]).length,1);
  assert.match(css,/\.sar-checkpoint-title\{/);
  assert.match(css,/\.sar-checkpoint-body\{/);
});

// These are later-reader observations, not instructions injected into the frozen source.
// [VXG RealForever]
