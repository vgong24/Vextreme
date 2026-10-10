/**
 * VEXTREME — tests/87-vexsystem-projection.test.js
 *
 * Deterministic contract tests for the public-safe VexSystem atlas and pure
 * semantic projection core.
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

test('VEXSYSTEM: public atlas validates and exposes no private SDK issue/PR coordinate', () => {
  const result = vexsystem.validateAtlas(atlas);
  assert.deepEqual(result, { ok: true, errors: [] });
  assert.equal(atlas.canonicalWholeRef, 'PRIVATE_VEXTREME_SDK_CANONICAL_SOURCE_WITHHELD');
  assert.doesNotMatch(JSON.stringify(atlas), /github\.(?:issue|pull)\.vextreme-sdk\.\d+/i);
});

test('VEXSYSTEM: Blueprint is current-first and hides formation-only history', () => {
  const state = vexsystem.createState(atlas);
  const projection = vexsystem.projectAtlas(atlas, state);

  assert.equal(state.lens, 'BLUEPRINT');
  assert.equal(state.selectedSubjectRef, 'feature.vextreme.terrain-entry');
  assert.ok(projection.subjects.some(subject => subject.subjectRef === 'contract.vextreme.terrain-entry.v1'));
  assert.ok(projection.subjects.some(subject => subject.subjectRef === 'route.vextreme.vexsystem'));
  assert.equal(projection.subjects.some(subject => subject.formationOnly === true), false);
});

test('VEXSYSTEM: changing vantage preserves semantic focus', () => {
  const initial = vexsystem.createState(atlas);
  for (const lens of vexsystem.LENSES) {
    const next = vexsystem.setLens(atlas, initial, lens);
    assert.equal(next.selectedSubjectRef, initial.selectedSubjectRef);
    assert.equal(next.trail[next.trail.length - 1], initial.selectedSubjectRef);
  }
});

test('VEXSYSTEM: Formation lens exposes bounded history and returns to current feature', () => {
  const initial = vexsystem.createState(atlas);
  const formationState = vexsystem.setLens(atlas, initial, 'FORMATION');
  const formation = vexsystem.projectAtlas(atlas, vexsystem.setLevel(atlas, formationState, 4));

  const refs = new Set(formation.subjects.map(subject => subject.subjectRef));
  assert.ok(refs.has('feature.vextreme.terrain-entry'));
  assert.ok(refs.has('formation.vextreme.terrain.pr196'));
  assert.ok(refs.has('formation.vextreme.terrain.pr197'));
  assert.ok(refs.has('formation.vextreme.terrain.pr198'));
  assert.ok(refs.has('formation.vextreme.terrain.pr199'));
  assert.ok(refs.has('formation.vextreme.terrain.pr200'));

  const returnEdge = formation.relations.find(relation =>
    relation.relationRef === 'rel.vexsystem.formation-to-current'
  );
  assert.ok(returnEdge);
  assert.equal(returnEdge.to, 'feature.vextreme.terrain-entry');
});

test('VEXSYSTEM: semantic zoom changes visible neighborhood, not selected subject', () => {
  const initial = vexsystem.createState(atlas);
  const atWhole = vexsystem.setLevel(atlas, initial, 0);
  const atSource = vexsystem.setLevel(atlas, initial, 5);

  assert.equal(atWhole.selectedSubjectRef, initial.selectedSubjectRef);
  assert.equal(atSource.selectedSubjectRef, initial.selectedSubjectRef);

  const wholeProjection = vexsystem.projectAtlas(atlas, atWhole);
  const sourceProjection = vexsystem.projectAtlas(atlas, atSource);

  assert.deepEqual(wholeProjection.semanticWindow, { min: 1, max: 1 });
  assert.deepEqual(sourceProjection.semanticWindow, { min: 4, max: 5 });
  assert.ok(sourceProjection.subjects.some(subject => subject.kind === 'PROOF'));
});

test('VEXSYSTEM: activated VexSystem route is current and remains a parallel branch rather than the primary ordered entry', () => {
  const route = atlas.subjects.find(subject => subject.subjectRef === 'route.vextreme.vexsystem');
  assert.ok(route);
  assert.equal(route.state, 'ACTIVE');
  assert.ok(route.sourceRefs.includes('vexsystem/index.html'));

  const relation = atlas.relations.find(item =>
    item.relationRef === 'rel.vexsystem.contract-to-vexsystem'
  );
  assert.ok(relation);
  assert.equal(relation.branchClass, 'ALTERNATIVE_BRANCH');
});

test('VEXSYSTEM: focus trail supports forward exploration and semantic return', () => {
  const initial = vexsystem.createState(atlas);
  const contract = vexsystem.focusSubject(atlas, initial, 'contract.vextreme.terrain-entry.v1');
  const archives = vexsystem.focusSubject(atlas, contract, 'route.vextreme.archives');

  assert.deepEqual(archives.trail, [
    'feature.vextreme.terrain-entry',
    'contract.vextreme.terrain-entry.v1',
    'route.vextreme.archives'
  ]);

  const returned = vexsystem.returnFocus(atlas, archives);
  assert.equal(returned.selectedSubjectRef, 'contract.vextreme.terrain-entry.v1');
});

test('VEXSYSTEM: layout is deterministic for one projection', () => {
  const state = vexsystem.createState(atlas);
  const projection = vexsystem.projectAtlas(atlas, state);
  const first = vexsystem.layoutProjection(projection, 1000, 600);
  const second = vexsystem.layoutProjection(projection, 1000, 600);

  assert.deepEqual(first, second);
  assert.equal(first['feature.vextreme.terrain-entry'].selected, true);
  for (const point of Object.values(first)) {
    assert.ok(point.x >= 0 && point.x <= 1000);
    assert.ok(point.y >= 0 && point.y <= 600);
  }
});

test('VEXSYSTEM: public source routing is bounded to known public Vextreme refs', () => {
  assert.equal(
    vexsystem.sourceHref('github.pull.vextreme.200'),
    'https://github.com/vgong24/Vextreme/pull/200'
  );
  assert.equal(
    vexsystem.sourceHref('pages/terrain-map.html#terrain-entry-contract'),
    'https://github.com/vgong24/Vextreme/blob/main/pages/terrain-map.html'
  );
  assert.equal(vexsystem.sourceHref('PRIVATE_VEXTREME_SDK_CANONICAL_SOURCE_WITHHELD'), null);
});
