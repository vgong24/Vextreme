'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const projection = require('../data/orientation-map.json');
const {
  BASELINE_MAPS,
  DEFAULT_MAX_MAPS,
  normalizeRepoPath,
  selectOrientationContext,
  parseArgs,
} = require('../lib/select-orientation-context');

function ids(packet) {
  return packet.maps.map(map => map.id);
}

test('ORIENTATION-PACKET: page/navigation task selects page health plus the safety baseline', () => {
  const packet = selectOrientationContext(projection, {
    task: 'Fix a public page whose navigation and FAB are missing',
    paths: ['pages/example.html'],
  });
  assert.deepEqual(ids(packet).slice(0, 2), BASELINE_MAPS);
  assert.ok(ids(packet).includes('page-health'));
  assert.equal(packet.status, 'routed');
});

test('ORIENTATION-PACKET: exact question id outranks trigger matches', () => {
  const packet = selectOrientationContext(projection, {
    task: 'architecture dependency',
    questionIds: ['change-impact'],
  });
  const lattice = packet.maps.find(map => map.id === 'lattice');
  assert.ok(lattice);
  assert.ok(lattice.score >= 100);
  assert.ok(lattice.reasons.some(reason => /explicit question/.test(reason)));
});

test('ORIENTATION-PACKET: registered directory contains a changed child path', () => {
  const packet = selectOrientationContext(projection, {
    paths: ['docs/architecture/05-browser.md'],
  });
  assert.ok(ids(packet).includes('architecture'));
  assert.ok(packet.maps.find(map => map.id === 'architecture').reasons.some(reason => /path route/.test(reason)));
});

test('ORIENTATION-PACKET: selection is deterministic, tie-broken, and capped at five maps', () => {
  const request = {
    task: 'cold start onboarding ambiguity generated artifact session current work claim ownership architecture design constraint change impact terrain status page navigation lesson environment private SDK v1 legacy',
    maxMaps: 99,
  };
  const first = selectOrientationContext(projection, request);
  const second = selectOrientationContext(projection, request);
  assert.deepEqual(first, second);
  assert.equal(first.maps.length, DEFAULT_MAX_MAPS);
});

test('ORIENTATION-PACKET: unmatched task remains partial instead of widening', () => {
  const packet = selectOrientationContext(projection, { task: 'flibbertigibbet' });
  assert.deepEqual(ids(packet), BASELINE_MAPS);
  assert.equal(packet.status, 'partial');
  assert.ok(packet.gaps.some(gap => /No task-specific trigger/.test(gap)));
});

test('ORIENTATION-PACKET: an explicit cold-start trigger is routed by the baseline itself', () => {
  const packet = selectOrientationContext(projection, { task: 'onboarding a new instance at cold start' });
  assert.deepEqual(ids(packet), BASELINE_MAPS);
  assert.equal(packet.status, 'routed');
  assert.ok(packet.maps.find(map => map.id === 'cold-start').score > 0);
});

test('ORIENTATION-PACKET: unsafe absolute and parent-traversal paths fail closed', () => {
  assert.throws(() => normalizeRepoPath('/Users/example/private'), /unsafe/);
  assert.throws(() => normalizeRepoPath('C:\\Users\\example\\private'), /unsafe/);
  assert.throws(() => normalizeRepoPath('../Vextreme-SDK/secret'), /unsafe/);
});

test('ORIENTATION-PACKET: private or SDK task selects only the public boundary map', () => {
  const packet = selectOrientationContext(projection, { task: 'inspect private SDK roadmap' });
  assert.ok(ids(packet).includes('public-private-boundary'));
  assert.ok(packet.readOrder.every(read => !/Vextreme-SDK|secret|credential/i.test(read.path)));
  assert.match(packet.boundaries.privateState, /excluded/);
});

test('ORIENTATION-PACKET: unknown question and unregistered safe path remain explicit gaps', () => {
  const packet = selectOrientationContext(projection, {
    questionIds: ['not-a-real-question'],
    paths: ['some/new/file.js'],
  });
  assert.ok(packet.gaps.some(gap => /Unknown question id/.test(gap)));
  assert.ok(packet.gaps.some(gap => /No registered map path/.test(gap)));
});

test('ORIENTATION-PACKET: CLI arguments preserve repeated questions and paths', () => {
  assert.deepEqual(parseArgs([
    '--task', 'fix nav', '--question', 'page-health', '--question', 'change-impact',
    '--path', 'pages/a.html', '--path', 'lib/a.js', '--max-maps', '4', '--json',
  ]), {
    task: 'fix nav',
    questionIds: ['page-health', 'change-impact'],
    paths: ['pages/a.html', 'lib/a.js'],
    maxMaps: 4,
  });
});

// [VXG RealForever]
