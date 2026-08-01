'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const registry = require('../config/institutional-surfaces.json');
const {
  SCHEMA_VERSION,
  validateRegistry,
  surfacesByState,
  run,
} = require('../lib/check-institutional-surfaces');

const ROOT = path.join(__dirname, '..');

function entry(overrides = {}) {
  return {
    state: 'reserved',
    kind: 'institutional',
    purpose: 'test-surface',
    archive: { indexed: false, arcMembership: false },
    runtime: { mode: 'standalone', godScript: false, shell: false },
    strings: { scope: 'institution', requiredLocales: ['en'], plannedLocales: ['ja'] },
    theme: { family: 'foundation', variants: ['dark', 'light'] },
    evidence: { viewports: [320, 768, 1440], themes: ['dark', 'light'] },
    origin: { sourcePr: 135 },
    ...overrides,
  };
}

function makeRoot() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'vxg-institutional-'));
  for (const dir of ['config', 'pages', 'data', 'dist']) fs.mkdirSync(path.join(root, dir), { recursive: true });
  fs.writeFileSync(path.join(root, 'data', 'nodes.json'), '[]\n');
  fs.writeFileSync(path.join(root, 'data', 'arcs-v2.json'), '{}\n');
  return root;
}

test('INSTITUTIONAL-SURFACES: real reservations are valid and deterministic', () => {
  assert.deepEqual(validateRegistry(registry, ROOT), []);
  assert.deepEqual(surfacesByState(registry, 'reserved').map(surface => surface.slug), [
    'vex-support',
    'vextreme-home',
  ]);
});

test('INSTITUTIONAL-SURFACES: unsafe identity and permissive runtime fail closed', () => {
  const broken = {
    schemaVersion: SCHEMA_VERSION,
    surfaces: {
      home: entry({
        runtime: { mode: 'standalone', godScript: true, shell: false },
        archive: { indexed: true, arcMembership: false },
      }),
    },
  };
  const checks = new Set(validateRegistry(broken, makeRoot()).map(issue => issue.check));
  assert.ok(checks.has('slug'));
  assert.ok(checks.has('runtime-boundary'));
  assert.ok(checks.has('archive-boundary'));
});

test('INSTITUTIONAL-SURFACES: a reservation cannot silently acquire a page', () => {
  const root = makeRoot();
  fs.writeFileSync(path.join(root, 'pages', 'vex-test.html'), '<html></html>\n');
  const broken = { schemaVersion: SCHEMA_VERSION, surfaces: { 'vex-test': entry() } };
  assert.ok(validateRegistry(broken, root).some(issue => issue.check === 'reservation-stale'));
});

test('INSTITUTIONAL-SURFACES: malformed active entries report shape errors instead of throwing', () => {
  const malformed = {
    schemaVersion: SCHEMA_VERSION,
    surfaces: {
      'vex-test': { state: 'active', kind: 'institutional', purpose: 'test-surface' },
    },
  };
  const issues = validateRegistry(malformed, makeRoot());
  assert.ok(issues.some(issue => issue.check === 'missing-field'));
  assert.ok(issues.some(issue => issue.check === 'shape'));
});

test('INSTITUTIONAL-SURFACES: active page projections are checked together', () => {
  const root = makeRoot();
  fs.writeFileSync(path.join(root, 'pages', 'vex-test.html'), '<html><script src="../lib/shell.js"></script></html>\n');
  fs.writeFileSync(path.join(root, 'dist', 'vextreme-vex-test.js'), '// unexpected\n');
  fs.writeFileSync(path.join(root, 'data', 'nodes.json'), '[{"slug":"vex-test"}]\n');
  fs.writeFileSync(path.join(root, 'data', 'arcs-v2.json'), '{"a":{"sections":[{"slugs":["vex-test"]}]}}\n');
  const broken = { schemaVersion: SCHEMA_VERSION, surfaces: { 'vex-test': entry({ state: 'active' }) } };
  const checks = new Set(validateRegistry(broken, root).map(issue => issue.check));
  for (const expected of [
    'surface-marker', 'scope-marker', 'theme-marker', 'runtime-boundary',
    'god-script-output', 'archive-index', 'arc-membership',
  ]) assert.ok(checks.has(expected), `expected ${expected}`);
});

test('INSTITUTIONAL-SURFACES: a bounded standalone active fixture passes', () => {
  const root = makeRoot();
  fs.writeFileSync(path.join(root, 'pages', 'vex-test.html'), [
    '<!doctype html>',
    '<html data-vex-surface="institutional" data-vex-string-scope="institution" data-theme="foundation">',
    '<body></body>',
    '</html>',
    '',
  ].join('\n'));
  const active = { schemaVersion: SCHEMA_VERSION, surfaces: { 'vex-test': entry({ state: 'active' }) } };
  assert.deepEqual(validateRegistry(active, root), []);
});

test('INSTITUTIONAL-SURFACES integration: committed registry and current main projections agree', () => {
  assert.deepEqual(run(ROOT).issues, []);
});

// [VXG RealForever]
