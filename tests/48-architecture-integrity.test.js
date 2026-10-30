'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const {
  parseGuideRoutes,
  checkGuideRoutes,
  checkProjection,
  run,
} = require('../lib/check-architecture-integrity');
const { assembleArchitecture } = require('../lib/build-architecture');

const ROOT = path.join(__dirname, '..');

test('ARCHITECTURE-INTEGRITY: reading-guide routes retain question and trigger fields', () => {
  const routes = parseGuideRoutes('| `docs/architecture/01-a.md` | What is A? | Before changing A. |');
  assert.deepEqual(routes, [{
    path: 'docs/architecture/01-a.md',
    question: 'What is A?',
    trigger: 'Before changing A.',
  }]);
});

test('ARCHITECTURE-INTEGRITY: missing, duplicate, unknown, and empty routes are drift', () => {
  const issues = checkGuideRoutes(['00-guide.md', '01-a.md'], [
    { path: 'docs/architecture/00-guide.md', question: 'Where?', trigger: 'Start.' },
    { path: 'docs/architecture/00-guide.md', question: 'Where again?', trigger: 'Repeat.' },
    { path: 'docs/architecture/99-ghost.md', question: 'Ghost?', trigger: 'Never.' },
    { path: 'docs/architecture/02-empty.md', question: '—', trigger: '—' },
  ]);
  assert.deepEqual(new Set(issues.map(issue => issue.check)), new Set([
    'guide-unknown', 'guide-question', 'guide-trigger', 'guide-duplicate', 'guide-missing',
  ]));
});

test('ARCHITECTURE-INTEGRITY: assembly is ordered and contains no clock-derived footer', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'vxg-architecture-'));
  fs.writeFileSync(path.join(dir, '02-b.md'), '# B\n\n<!-- [VXG RealForever] -->\n');
  fs.writeFileSync(path.join(dir, '01-a.md'), '# A\n\n<!-- [VXG RealForever] -->\n');
  const output = assembleArchitecture(dir);
  assert.ok(output.indexOf('# A') < output.indexOf('# B'));
  assert.doesNotMatch(output, /Last updated:/);
  assert.equal((output.match(/\[VXG RealForever\]/g) || []).length, 1);
});

test('ARCHITECTURE-INTEGRITY: projection mismatch is reported', () => {
  assert.deepEqual(checkProjection('same', 'same'), []);
  assert.match(checkProjection('old', 'new')[0].message, /does not match/);
});

test('ARCHITECTURE-INTEGRITY integration: all sources are routed and the projection is current', () => {
  assert.deepEqual(run(ROOT), []);
});

// [VXG RealForever]
