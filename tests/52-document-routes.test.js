'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const registry = require('../config/document-routing.json');
const {
  matchingRoutes,
  checkCoverage,
  safeRepoPath,
  validateRegistry,
  run,
} = require('../lib/check-document-routes');

const ROOT = path.join(__dirname, '..');

test('DOCUMENT-ROUTES: the real registry and every route owner are valid', () => {
  assert.deepEqual(validateRegistry(registry, ROOT), []);
});

test('DOCUMENT-ROUTES: an arbitrary root or nested docs file is stray', () => {
  const issues = checkCoverage([
    { path: 'docs/random-note.md', symlink: false },
    { path: 'docs/random/bundle/README.md', symlink: false },
  ], registry);
  assert.equal(issues.length, 2);
  assert.ok(issues.every(issue => issue.check === 'stray-document'));
});

test('DOCUMENT-ROUTES: a direct registered-shape context note is valid but nested bundle contents are stray', () => {
  const direct = 'docs/continuity/context-notes/vextreme-design-foundation-2026-07-12.md';
  assert.equal(matchingRoutes(direct, registry).length, 1);
  const nested = [
    'docs/continuity/context-notes/vextreme-design-foundation-2026-07-12/SKILL.md',
    'docs/continuity/context-notes/vextreme-design-foundation-2026-07-12/components/core/Button.prompt.md',
    'docs/continuity/context-notes/vextreme-design-foundation-2026-07-12/components/core/Button.jsx',
    'docs/continuity/context-notes/vextreme-design-foundation-2026-07-12/styles.css',
    'docs/continuity/context-notes/vextreme-design-foundation-2026-07-12/uploads/screenshot.png',
  ].map(filePath => ({ path: filePath, symlink: false }));
  const issues = checkCoverage(nested, registry);
  assert.equal(issues.length, nested.length);
  assert.ok(issues.every(issue => issue.check === 'stray-document'));
});

test('DOCUMENT-ROUTES: a path matching exact and collection ownership is ambiguous', () => {
  const fixture = {
    exactDocuments: [{ path: 'docs/a.md' }],
    collections: [{ id: 'all-a', pattern: '^docs/a\\.md$' }],
  };
  const issues = checkCoverage([{ path: 'docs/a.md', symlink: false }], fixture);
  assert.equal(issues[0].check, 'ambiguous-document');
});

test('DOCUMENT-ROUTES: symlinks fail closed rather than escaping route ownership', () => {
  const issues = checkCoverage([{ path: 'docs/culture.md', symlink: true }], registry);
  assert.equal(issues[0].check, 'document-symlink');
});

test('DOCUMENT-ROUTES: repository paths reject absolute and parent traversal', () => {
  assert.equal(safeRepoPath('docs/good.md'), true);
  assert.equal(safeRepoPath('/tmp/outside.md'), false);
  assert.equal(safeRepoPath('C:/outside.md'), false);
  assert.equal(safeRepoPath('../outside.md'), false);
});

test('DOCUMENT-ROUTES: collection catch-all wildcards are invalid', () => {
  const broken = JSON.parse(JSON.stringify(registry));
  broken.collections[0].pattern = '^docs/.*$';
  const issues = validateRegistry(broken, ROOT);
  assert.ok(issues.some(issue => /catch-all wildcard/.test(issue)));
});

test('DOCUMENT-ROUTES integration: every current docs file has exactly one route', () => {
  const report = run(ROOT);
  assert.deepEqual(report.issues, []);
  assert.ok(report.files.length > 50);
});

// [VXG RealForever]
