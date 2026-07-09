'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');

const {
  parseStatusPorcelain,
  parseAheadBehind,
  classifyReport,
  recommendedAction,
  renderReport,
} = require('../lib/branch-triage');

function baseReport(overrides = {}) {
  return {
    branch: 'feature/example',
    upstream: { name: 'origin/feature/example', status: 'gone' },
    workingTree: 'clean',
    dirtyFiles: [],
    aheadBehind: { ahead: 0, behind: 3 },
    aheadCommits: [],
    openPr: { status: 'none found', detail: '' },
    ...overrides,
  };
}

test('BRANCH-TRIAGE: parseStatusPorcelain extracts status code and path', () => {
  assert.deepEqual(parseStatusPorcelain(' M data/lessons.json\n?? scratch.txt\n'), [
    { code: ' M', path: 'data/lessons.json' },
    { code: '??', path: 'scratch.txt' },
  ]);
});

test('BRANCH-TRIAGE: parseAheadBehind maps git left/right count to behind/ahead', () => {
  assert.deepEqual(parseAheadBehind('42\t1'), { ahead: 1, behind: 42 });
});

test('BRANCH-TRIAGE: represented ahead commits with no real dirty files are stale-safe-to-clean-later', () => {
  const report = baseReport({
    dirtyFiles: [{ path: 'data/lessons.json', classification: 'line-ending-or-no-op' }],
    aheadCommits: [{ represented: 'yes' }],
  });
  assert.equal(classifyReport(report), 'stale-safe-to-clean-later');
});

test('BRANCH-TRIAGE: unique ahead content is stale-preserve-patch', () => {
  const report = baseReport({
    aheadCommits: [{ represented: 'no' }],
  });
  assert.equal(classifyReport(report), 'stale-preserve-patch');
});

test('BRANCH-TRIAGE: real dirty files are active-work-unknown', () => {
  const report = baseReport({
    dirtyFiles: [{ path: 'data/lessons.json', classification: 'real-content-change' }],
  });
  assert.equal(classifyReport(report), 'active-work-unknown');
});

test('BRANCH-TRIAGE: untracked files are parsed as dirty paths', () => {
  const [entry] = parseStatusPorcelain('?? scratch.txt\n');
  assert.deepEqual(entry, { code: '??', path: 'scratch.txt' });
});

test('BRANCH-TRIAGE: unclear evidence asks for human review', () => {
  const report = baseReport({
    dirtyFiles: [{ path: 'data/lessons.json', classification: 'unclear' }],
  });
  assert.equal(classifyReport(report), 'needs-human-review');
});

test('BRANCH-TRIAGE: rendered report states no mutation', () => {
  const report = baseReport({
    classification: 'stale-safe-to-clean-later',
    recommendedAction: recommendedAction('stale-safe-to-clean-later'),
  });
  assert.match(renderReport(report), /Mutation performed:\n  no/);
});

// [VXG RealForever]
