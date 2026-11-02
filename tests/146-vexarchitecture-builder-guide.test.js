'use strict';

const fs = require('fs');
const path = require('path');
const test = require('node:test');
const assert = require('node:assert/strict');

const ROOT = path.join(__dirname, '..');
const PAGE = path.join(ROOT, 'pages', 'vexarchitecture-first-stable-body.html');
const STRINGS = path.join(ROOT, 'data', 'strings', 'source', 'pages', 'vexarchitecture-first-stable-body.json');

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8').replace(/\r\n/g, '\n');
}

function json(rel) {
  return JSON.parse(read(rel));
}

test('VEXARCHITECTURE GUIDE: builder journey precedes forensic provenance', () => {
  const page = read('pages/vexarchitecture-first-stable-body.html');
  const ids = [
    'problem',
    'discovery',
    'codebase',
    'theme-walk',
    'execution',
    'outside-truth',
    'construction',
    'chronology',
    'convergence',
    'subtraction',
    'apply',
    'pressure',
    'forensics',
  ];

  let previous = -1;
  for (const id of ids) {
    const current = page.indexOf('id="' + id + '"');
    assert.ok(current > previous, id + ' must follow the prior guide layer');
    previous = current;
  }

  assert.equal(page.includes('class="proof-step"'), false, 'proof-attempt timeline must not dominate the main guide');
  assert.ok(page.indexOf('id="forensics"') > page.indexOf('id="pressure"'));
  assert.ok(page.includes('data-i18n="pages.vexarchitecture-first-stable-body.forensics.ledger"'));
});

test('VEXARCHITECTURE GUIDE: accepted code structure is visible and source-addressable', () => {
  const page = read('pages/vexarchitecture-first-stable-body.html');

  for (const required of [
    'VexFamily.kt',
    'VexExecution.kt',
    'VexExecutionRoot.kt',
    'VexDependencyFactory.kt',
    'VexLogger.kt',
    'VexRelay.kt',
    'VexApplication.kt',
    'VexLifeSession.kt',
    'ThemeMode.kt',
    'VexConversationHybridRelay.kt',
    'EventsConvergenceRelay.kt',
  ]) {
    assert.ok(page.includes(required), 'missing real source anchor: ' + required);
  }

  assert.ok(page.includes('66c866dea6a8dd78e2946da88715c4deb78c1847'));
});

test('VEXARCHITECTURE GUIDE: ThemeMode teaches semantic carriage rather than class-shape cargo culting', () => {
  const page = read('pages/vexarchitecture-first-stable-body.html');

  assert.ok(page.includes('Parameter.Mode(Dark)'));
  assert.ok(page.includes('SAME SEMANTIC OBJECT'));
  assert.ok(page.includes('Control.Select(parameter)'));
  assert.ok(page.includes('Effect.Save(parameter)'));
  assert.ok(page.includes('Method.Save(store, parameter)'));
  assert.ok(page.includes('Do not copy ThemeMode. Reuse the questions.'));
});

test('VEXARCHITECTURE GUIDE: active work, lifetime, chronology, and convergence remain distinct', () => {
  const page = read('pages/vexarchitecture-first-stable-body.html');

  assert.ok(page.includes('RelationshipId'));
  assert.ok(page.includes('actual Job(s)'));
  assert.ok(page.includes('parent VexDependencyFactory'));
  assert.ok(page.includes('child VexDependencyFactory'));
  assert.ok(page.includes('VexLogger'));
  assert.ok(page.includes('EventsConvergenceRelay'));
  assert.ok(page.includes('VexConversationHybridRelay'));

  const ownerSections = [
    'data-owner="execution"',
    'data-owner="construction"',
    'data-owner="chronology"',
    'data-owner="convergence"',
  ];
  for (const marker of ownerSections) assert.ok(page.includes(marker), 'missing visual owner boundary ' + marker);
});

test('VEXARCHITECTURE GUIDE: application guidance pressures harder products without claiming migration', () => {
  const page = read('pages/vexarchitecture-first-stable-body.html');

  const applySteps = [...page.matchAll(/pages\.vexarchitecture-first-stable-body\.apply\.(\d+)"/g)]
    .map(match => Number(match[1]));
  assert.deepEqual([...new Set(applySteps)].sort((a,b) => a - b), [1,2,3,4,5,6,7,8,9,10,11,12]);

  assert.ok(page.includes('VexStream · questions to ask'));
  assert.ok(page.includes('Maps · questions to ask'));
  assert.ok(page.includes('They are not declared migrated by this page.'));
});

test('VEXARCHITECTURE GUIDE: every bound display key exists in the page string source', () => {
  const page = fs.readFileSync(PAGE, 'utf8');
  const strings = JSON.parse(fs.readFileSync(STRINGS, 'utf8'));
  const keys = [...page.matchAll(/\bdata-i18n(?:-alt|-aria)?=["']([^"']+)["']/g)].map(match => match[1]);
  const missing = [...new Set(keys)].filter(key => !strings[key]);

  assert.deepEqual(missing, []);
  assert.equal(strings._meta.sourceProvenance.originPullRequest, 209);
  assert.equal(strings._meta.sourceProvenance.guideRevision, 'DEVELOPMENT_STANDARD_2_N_BUILDER_FIELD_GUIDE');
});

// [VXG RealForever]
