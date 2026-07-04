'use strict';

/**
 * COUNCIL-KERNEL — tests/19-council-kernel.test.js
 *
 * data/council-kernel.json is a hand-transcribed structured extract of
 * pages/org-blueprint.html (Session 022) — see docs/architecture/14-council-model.md.
 * Unlike most data/*.json artifacts, it has no lib/build-*.js generator (it's
 * transcribed by hand, same as config/departments.json), so these tests only
 * verify its own internal shape stays valid, not that it matches a build step.
 */

const { test } = require('node:test');
const assert   = require('node:assert/strict');
const fs       = require('fs');
const path     = require('path');

const KERNEL_PATH = path.join(__dirname, '..', 'data', 'council-kernel.json');
const kernel = JSON.parse(fs.readFileSync(KERNEL_PATH, 'utf8'));

test('COUNCIL-KERNEL: is valid JSON with required top-level keys', () => {
  for (const key of ['theUnit', 'antiBloatLaw', 'scanner', 'decisionTriangle', 'roles', 'signalShapes', 'connectionArchitecture', 'honestLimits']) {
    assert.ok(key in kernel, `missing top-level key: ${key}`);
  }
});

test('COUNCIL-KERNEL: theUnit has exactly the five documented steps in order', () => {
  assert.deepEqual(kernel.theUnit.steps, ['PERCEIVE', 'NAME', 'SCOPE', 'SEAT', 'INTEGRATE']);
});

test('COUNCIL-KERNEL: every role has holds, failsAs, and a caughtBy array', () => {
  assert.ok(Array.isArray(kernel.roles) && kernel.roles.length > 0);
  for (const role of kernel.roles) {
    assert.equal(typeof role.id, 'string');
    assert.equal(typeof role.holds, 'string');
    assert.equal(typeof role.failsAs, 'string');
    assert.ok(Array.isArray(role.caughtBy));
  }
});

test('COUNCIL-KERNEL: every caughtBy reference points to a real role id', () => {
  const ids = new Set(kernel.roles.map(r => r.id));
  for (const role of kernel.roles) {
    for (const caughtById of role.caughtBy) {
      assert.ok(ids.has(caughtById), `${role.id}'s caughtBy references unknown role "${caughtById}"`);
    }
  }
});

test('COUNCIL-KERNEL: decisionTriangle deciders are all real role ids', () => {
  const ids = new Set(kernel.roles.map(r => r.id));
  for (const deciderId of kernel.decisionTriangle.deciders) {
    assert.ok(ids.has(deciderId));
  }
});

test('COUNCIL-KERNEL: honestLimits is non-empty — this kernel must not claim more than the source document does', () => {
  assert.ok(Array.isArray(kernel.honestLimits) && kernel.honestLimits.length > 0);
});

test('COUNCIL-KERNEL: sourceDoc and companionDoc point to real pages/*.html files', () => {
  const rootDir = path.join(__dirname, '..');
  assert.ok(fs.existsSync(path.join(rootDir, kernel.sourceDoc)));
  assert.ok(fs.existsSync(path.join(rootDir, kernel.companionDoc)));
});

// [VXG RealForever]
