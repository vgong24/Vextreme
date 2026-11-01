'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8').replace(/\r\n/g, '\n');
}

const CASES = [
  {
    page: 'pages/sabotage-open-vex-accountability.html',
    witness: 'records/commentary/2026-11-01-sabotage-i-open-vex-accountability-successor-witness.md',
    phase: 11,
    trackCount: 11,
    frozen: 'd71297354d06b2d8bb9de70646b020af37d0302a'
  },
  {
    page: 'pages/sabotage-mastered-state.html',
    witness: 'records/commentary/2026-11-01-sabotage-ii-the-inversion-successor-witness.md',
    phase: 7,
    trackCount: 7,
    frozen: '11fd64a84f8c4eb7a014bf69292aec1bff26473a'
  },
  {
    page: 'pages/sabotage-vexsync-exhaust-mastered.html',
    witness: 'records/commentary/2026-11-01-sabotage-iii-vexsync-exhaust-to-mastered-successor-witness.md',
    phase: 9,
    trackCount: 9,
    frozen: '74d5ceeb653826ea8aedeeaeaa57c58d43c4c330'
  },
  {
    page: 'pages/sabotage-orientation-before-action.html',
    witness: 'records/commentary/2026-11-01-sabotage-iv-before-the-prompt-successor-witness.md',
    phase: 9,
    trackCount: 9,
    frozen: 'e217af706b04168a311c1679227446a0eaca89bf'
  }
];

test('SABOTAGE-NOV1-WITNESS: every article keeps frozen source and projects the later witness separately', () => {
  for (const item of CASES) {
    const page = read(item.page);
    const witness = read(item.witness);
    const rel = '../' + item.witness;

    assert.ok(page.includes(item.frozen), item.page + ' retains its frozen source identity');
    assert.ok(page.includes(rel), item.page + ' links the November 1 witness source');
    assert.ok(page.includes('id="movement-' + String(item.phase).padStart(2, '0') + '"'), item.page + ' has the later witness phase');
    assert.ok(page.includes('data-phase-kind="successor-witness"'), item.page + ' keeps the later reading explicitly derived');
    assert.equal((page.match(/class="(?:sab|sar)-track-btn/g) || []).length, item.trackCount, item.page + ' has one matching navigation control per phase');

    assert.match(witness, /Record class:\*\* Derived successor witness commentary/);
    assert.match(witness, /Preservation rule:/);
    assert.match(witness, /<!-- \[VXG RealForever\] -->/);
  }
});

test('SABOTAGE-NOV1-WITNESS: Sabotage III commentary preserves the mastery-vs-transition correction', () => {
  const witness = read('records/commentary/2026-11-01-sabotage-iii-vexsync-exhaust-to-mastered-successor-witness.md');

  assert.match(witness, /the mastery posture worked/);
  assert.match(witness, /post-transition candidate state/);
  assert.match(witness, /transition\/load disruption/);
});

test('SABOTAGE-NOV1-WITNESS: article source records remain distinct from November 1 commentary', () => {
  for (const item of CASES) {
    const page = read(item.page);
    const witnessName = path.basename(item.witness);

    assert.ok(page.indexOf(item.frozen) >= 0, item.page + ' still identifies the historical source');
    assert.ok(page.indexOf(witnessName) >= 0, item.page + ' identifies the later witness independently');
  }
});

// [VXG RealForever]
