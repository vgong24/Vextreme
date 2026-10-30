'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const {
  validateRegistry,
  buildReverseEdges,
  buildQuestionIndex,
  buildPathIndex,
  buildWorkers,
  buildProjection,
  serializeProjection,
} = require('../lib/build-orientation-map');

const ROOT = path.join(__dirname, '..');
const registry = require('../config/orientation-maps.json');
const coordination = require('../config/work-coordination.json');

function map(id, overrides = {}) {
  return {
    id,
    type: 'routing',
    scope: 'test',
    visibility: 'public',
    authority: ['accepted'],
    sourcePaths: [],
    projectionPaths: [],
    questions: [{ id: `q-${id}`, text: `Question ${id}?` }],
    exclusions: [],
    triggers: ['test'],
    forwardEdges: [],
    health: { state: 'checked', checker: null },
    freshness: 'test',
    lastVerified: { date: '2026-07-12', evidence: 'test' },
    supersededBy: null,
    ...overrides,
  };
}

test('ORIENTATION-MAP: real source registry is valid and every declared path exists', () => {
  assert.deepEqual(validateRegistry(registry, ROOT), []);
});

test('ORIENTATION-MAP: duplicate ids, dangling edges, unsafe paths, and unknown supersession fail closed', () => {
  const broken = {
    schemaVersion: 'orientation-maps.registry/v1',
    maps: [
      map('same', { sourcePaths: ['../private'], forwardEdges: [{ to: 'missing', relation: 'routes' }] }),
      map('same', { supersededBy: 'missing' }),
    ],
  };
  const issues = validateRegistry(broken);
  assert.ok(issues.some(issue => /duplicated/.test(issue)));
  assert.ok(issues.some(issue => /unsafe path/.test(issue)));
  assert.ok(issues.some(issue => /unknown map/.test(issue)));
  assert.ok(issues.some(issue => /superseded by unknown/.test(issue)));
});

test('ORIENTATION-MAP: reverse edges are generated from the single forward-edge authoring point', () => {
  const maps = [
    map('a', { forwardEdges: [{ to: 'b', relation: 'routes' }] }),
    map('b'),
  ];
  assert.deepEqual(buildReverseEdges(maps), {
    a: [],
    b: [{ from: 'a', relation: 'routes' }],
  });
});

test('ORIENTATION-MAP: question and path indexes route back to map ids', () => {
  const maps = [
    map('a', { sourcePaths: ['source.md'], projectionPaths: ['projection.json'] }),
  ];
  assert.deepEqual(buildQuestionIndex(maps)['q-a'], { mapId: 'a', text: 'Question a?' });
  assert.deepEqual(buildPathIndex(maps), {
    'projection.json': { sourceFor: [], projectionFor: ['a'] },
    'source.md': { sourceFor: ['a'], projectionFor: [] },
  });
});

test('ORIENTATION-MAP: claims never promote a registered worker from unknown availability', () => {
  const workers = buildWorkers([
    { actorRef: 'worker-a', agentType: 'codex', environmentRef: 'device-a' },
  ], [{
    actorRef: 'worker-a', workRef: 'work.a', status: 'active', paths: ['z', 'a'], epic: { name: 'E', item: '1/2' },
  }], true);
  assert.equal(workers[0].availability, 'unknown');
  assert.equal(workers[0].claimObservation, 'observed');
  assert.deepEqual(workers[0].claims[0].paths, ['a', 'z']);
});

test('ORIENTATION-MAP: projection is deterministic and carries public-safety boundaries', () => {
  const a = serializeProjection(buildProjection(registry, coordination));
  const b = serializeProjection(buildProjection(registry, coordination));
  assert.equal(a, b);
  assert.match(a, /Claims never prove availability/);
  assert.doesNotMatch(a, /generatedAt|timestamp/i);
});

test('ORIENTATION-MAP integration: committed projection equals a fresh source build', () => {
  const expected = serializeProjection(buildProjection(registry, coordination));
  const actual = fs.readFileSync(path.join(ROOT, 'data', 'orientation-map.json'), 'utf8');
  assert.equal(actual, expected);
});

// [VXG RealForever]
