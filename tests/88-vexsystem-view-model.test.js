/**
 * VEXTREME — tests/88-vexsystem-view-model.test.js
 *
 * Exemplar and multi-vantage semantics for the first VexSystem public learning
 * world slice.
 *
 * [VXG RealForever]
 */
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const atlas = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'vexsystem', 'atlas.json'), 'utf8'));
const vexsystem = require('../lib/vexsystem/projection');

function relation(ref) {
  return atlas.relations.find(item => item.relationRef === ref);
}

test('VEXSYSTEM VIEW: relation vocabulary stays typed and rejects generic RELATED_TO semantics', () => {
  assert.equal(atlas.relations.some(item => item.type === 'RELATED_TO'), false);
  for (const item of atlas.relations) {
    assert.ok(vexsystem.ALLOWED_RELATION_TYPES.includes(item.type), item.relationRef);
  }
});

test('VEXSYSTEM VIEW: Terrain entry exposes three executable choices while preserving one primary ordered-entry branch', () => {
  const process = vexsystem.projectAtlas(
    atlas,
    vexsystem.setLens(atlas, vexsystem.createState(atlas), 'PROCESS')
  );

  const branchClasses = new Map(process.relations.map(item => [item.relationRef, item.branchClass]));
  assert.equal(branchClasses.get('rel.vexsystem.contract-to-receive-god'), 'ACTIVE_BRANCH');
  assert.equal(branchClasses.get('rel.vexsystem.contract-to-archives'), 'ALTERNATIVE_BRANCH');
  assert.equal(branchClasses.get('rel.vexsystem.contract-to-vexsystem'), 'ALTERNATIVE_BRANCH');
});

test('VEXSYSTEM VIEW: consequence lens can distinguish contract proof from browser/visual proof', () => {
  let state = vexsystem.createState(atlas, { level: 5 });
  state = vexsystem.setLens(atlas, state, 'CONSEQUENCE');
  const view = vexsystem.projectAtlas(atlas, state);

  const refs = new Set(view.subjects.map(item => item.subjectRef));
  assert.ok(refs.has('proof.vextreme.terrain-entry.contract'));
  assert.ok(refs.has('proof.vextreme.terrain-entry.browser'));

  assert.equal(relation('rel.vexsystem.contract-proof').type, 'VALIDATES');
  assert.equal(relation('rel.vexsystem.browser-proof').type, 'EVIDENCES');
});

test('VEXSYSTEM VIEW: Formation keeps failed directions historical and returns through accepted convergence', () => {
  const formationSubjects = atlas.subjects.filter(item => item.formationOnly);
  const stateByRef = new Map(formationSubjects.map(item => [item.subjectRef, item.state]));

  assert.equal(stateByRef.get('formation.vextreme.terrain.pr197'), 'HISTORICAL_NEGATIVE_EVIDENCE');
  assert.equal(stateByRef.get('formation.vextreme.terrain.pr198'), 'HISTORICAL_NEGATIVE_EVIDENCE');
  assert.equal(stateByRef.get('formation.vextreme.terrain.pr199'), 'HISTORICAL_CORRECTION');
  assert.equal(stateByRef.get('formation.vextreme.terrain.pr200'), 'CURRENT_ACCEPTED_CONVERGENCE');

  assert.equal(relation('rel.vexsystem.formation-199-from-196').type, 'RETURNS_TO');
  assert.equal(relation('rel.vexsystem.formation-200').type, 'CONTINUES');
  assert.equal(relation('rel.vexsystem.formation-to-current').branchClass, 'RETURN_TO_CURRENT');
});

test('VEXSYSTEM VIEW: public-safe formation story is bounded to exact public Vextreme source refs', () => {
  for (const subject of atlas.subjects) {
    for (const ref of [...(subject.sourceRefs || []), ...(subject.proofRefs || [])]) {
      assert.doesNotMatch(ref, /vextreme-sdk\.\d+/i);
      if (ref.startsWith('github.pull.')) assert.match(ref, /^github\.pull\.vextreme\.\d+$/);
      if (ref.startsWith('github.commit.')) assert.match(ref, /^github\.commit\.vextreme\.[0-9a-f]{7,64}$/i);
    }
  }
});

test('VEXSYSTEM VIEW: each lens preserves the selected feature even when no relation is visible at a depth', () => {
  let state = vexsystem.createState(atlas, { level: 0 });
  const selected = state.selectedSubjectRef;

  for (const lens of vexsystem.LENSES) {
    state = vexsystem.setLens(atlas, state, lens);
    const view = vexsystem.projectAtlas(atlas, state);
    assert.equal(view.selectedSubject.subjectRef, selected);
    assert.ok(view.subjects.some(item => item.subjectRef === selected));
  }
});
