/**
 * VEXTREME — tests/90-vexsystem-human-understanding.test.js
 *
 * Deterministic contract for the composed human-understanding projection.
 * It proves composition from accepted semantic facts without inventing a
 * parallel prose truth owner.
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

test('VEXSYSTEM UNDERSTANDING: default subject composes from the accepted atlas without changing identity', () => {
  const view = vexsystem.composeUnderstanding(atlas);
  assert.equal(view.schemaVersion, 'vextreme.vexsystem-human-understanding/v1');
  assert.equal(view.subjectRef, atlas.defaultSubjectRef);
  assert.equal(view.subject.subjectRef, 'feature.vextreme.terrain-entry');
  assert.equal(view.subject.summary, atlas.subjects.find(subject => subject.subjectRef === view.subjectRef).summary);
});

test('VEXSYSTEM UNDERSTANDING: placement and named descent use existing semantic identities', () => {
  const view = vexsystem.composeUnderstanding(atlas);
  assert.deepEqual(view.placement.map(subject => subject.subjectRef), [
    'system.vextreme.public-institutional-template',
    'foundation.vextreme.terrain'
  ]);
  assert.deepEqual(view.namedDescent.map(subject => subject.subjectRef), [
    'system.vextreme.public-institutional-template',
    'foundation.vextreme.terrain',
    'feature.vextreme.terrain-entry',
    'contract.vextreme.terrain-entry.v1',
    'proof.vextreme.terrain-entry.contract'
  ]);
});

test('VEXSYSTEM UNDERSTANDING: current answer preserves primary and parallel active route truth', () => {
  const view = vexsystem.composeUnderstanding(atlas);
  assert.deepEqual(view.currentStructure.map(subject => subject.subjectRef), [
    'contract.vextreme.terrain-entry.v1'
  ]);
  assert.deepEqual(view.routes.map(item => [item.subject.subjectRef, item.subject.state, item.relation.branchClass]), [
    ['route.vextreme.receive-god', 'ACTIVE', 'ACTIVE_BRANCH'],
    ['route.vextreme.archives', 'ACTIVE', 'ALTERNATIVE_BRANCH'],
    ['route.vextreme.vexsystem', 'ACTIVE', 'ALTERNATIVE_BRANCH']
  ]);
});

test('VEXSYSTEM UNDERSTANDING: source-contract proof and rendered/browser evidence stay distinct', () => {
  const view = vexsystem.composeUnderstanding(atlas);
  assert.deepEqual(view.proofs.map(item => [item.subject.subjectRef, item.relation.type]), [
    ['proof.vextreme.terrain-entry.contract', 'VALIDATES'],
    ['proof.vextreme.terrain-entry.browser', 'EVIDENCES']
  ]);
});

test('VEXSYSTEM UNDERSTANDING: formation is a bounded ordered story and does not become current truth', () => {
  const view = vexsystem.composeUnderstanding(atlas);
  assert.deepEqual(view.formation.map(subject => subject.subjectRef), [
    'formation.vextreme.terrain.pr196',
    'formation.vextreme.terrain.pr197',
    'formation.vextreme.terrain.pr198',
    'formation.vextreme.terrain.pr199',
    'formation.vextreme.terrain.pr200'
  ]);
  assert.equal(view.formation.some(subject => subject.state === 'CURRENT'), false);
  assert.equal(view.subject.state, 'CURRENT');
});

test('VEXSYSTEM UNDERSTANDING: deepening retains all accepted lenses without making them the default comprehension gate', () => {
  const view = vexsystem.composeUnderstanding(atlas);
  assert.deepEqual(view.deepening.map(item => item.lens), vexsystem.LENSES);
  assert.equal(view.deepening.length, atlas.lenses.length);
});

test('VEXSYSTEM UNDERSTANDING: no generalized reusable lesson or change-invalidation law is invented', () => {
  const view = vexsystem.composeUnderstanding(atlas);
  assert.equal(Object.hasOwn(view, 'reusableLesson'), false);
  assert.equal(Object.hasOwn(view, 'changeInvalidation'), false);
  assert.equal(Object.hasOwn(view, 'canonicalOwner'), false);
});

test('VEXSYSTEM UNDERSTANDING: public/private and source-descent boundaries remain intact', () => {
  const view = vexsystem.composeUnderstanding(atlas);
  assert.doesNotMatch(JSON.stringify(view), /github\.(?:issue|pull)\.vextreme-sdk\.\d+/i);
  assert.ok(view.sourceRefs.includes('pages/terrain-map.html'));
  assert.ok(view.sourceRefs.includes('github.pull.vextreme.200'));
  for (const ref of view.sourceRefs) {
    if (ref.startsWith('github.') || /^(pages|data|tests|docs|lib|vexsystem)\//.test(ref)) {
      assert.notEqual(vexsystem.sourceHref(ref), null, ref);
    }
  }
});


test('VEXSYSTEM UNDERSTANDING: selecting a branch subject keeps its real named parent chain', () => {
  const view = vexsystem.composeUnderstanding(atlas, 'route.vextreme.vexsystem');
  assert.deepEqual(view.placement.map(subject => subject.subjectRef), [
    'system.vextreme.public-institutional-template',
    'foundation.vextreme.terrain',
    'feature.vextreme.terrain-entry',
    'contract.vextreme.terrain-entry.v1'
  ]);
  assert.equal(view.subject.state, 'ACTIVE');
});

// [VXG RealForever]
