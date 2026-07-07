'use strict';

/**
 * REGISTRY DOCS - tests/25-registry-docs.test.js
 *
 * Tests for lib/check-registry-docs.js. This is the first deterministic
 * health check for the registry documentation standard: docs can evolve, but
 * the repo should notice if completion levels, scope boundaries, query paths,
 * health checks, acceptance criteria, or continuity markers drift away.
 */

const { test } = require('node:test');
const assert   = require('node:assert/strict');
const { execFileSync } = require('child_process');
const path = require('path');

const {
  validateStandard,
  completionLevelOf,
  missingHeadings,
  checkDocContent,
  checkRegistryDocs,
} = require('../lib/check-registry-docs');

const ROOT = path.join(__dirname, '..');

const VALID_DOC = [
  '# Example',
  '',
  '**Completion Level:** L6 - Implementation-ready',
  '',
  '## Scope Boundary',
  '',
  '## Query Functions',
  '',
  '## Health Checks',
  '',
  '## Acceptance Criteria',
  '',
  '<!-- [VXG RealForever] -->',
].join('\n');

test('REGISTRY-DOCS: completionLevelOf reads declared completion level', () => {
  assert.equal(completionLevelOf(VALID_DOC), 'L6');
  assert.equal(completionLevelOf('# Missing'), null);
});

test('REGISTRY-DOCS: missingHeadings reports absent required headings', () => {
  assert.deepEqual(missingHeadings(VALID_DOC, ['## Scope Boundary', '## Health Checks']), []);
  assert.deepEqual(missingHeadings(VALID_DOC, ['## Scope Boundary', '## Out of Scope']), ['## Out of Scope']);
});

test('REGISTRY-DOCS: validateStandard catches duplicate completion levels', () => {
  const findings = validateStandard({
    completionLevels: [
      { id: 'L6', name: 'Implementation-ready', meaning: 'actionable' },
      { id: 'L6', name: 'Duplicate', meaning: 'bad' },
    ],
    architectureDocs: [],
  });
  assert.ok(findings.some(f => f.kind === 'completion-level-duplicate'));
});

test('REGISTRY-DOCS: checkDocContent enforces required headings and marker', () => {
  const findings = checkDocContent(
    {
      path: 'docs/example.md',
      completionLevel: 'L6',
      requiredHeadings: ['## Scope Boundary', '## Query Functions', '## Health Checks', '## Acceptance Criteria'],
      requiresVxgMarker: true,
    },
    VALID_DOC.replace('## Health Checks\n\n', ''),
    new Set(['L6'])
  );
  assert.ok(findings.some(f => f.kind === 'heading-missing' && f.message.includes('## Health Checks')));
});

test('REGISTRY-DOCS: real registered architecture docs satisfy the standard', () => {
  const report = checkRegistryDocs();
  assert.equal(report.ok, true, JSON.stringify(report.findings, null, 2));
  assert.ok(report.checkedDocs.includes('docs/architecture/16-ui-identity-registry-graph.md'));
});

test('REGISTRY-DOCS: CLI exits clean against the real repo', () => {
  const out = execFileSync('node', ['lib/check-registry-docs.js'], { cwd: ROOT, encoding: 'utf8' });
  assert.match(out, /OK/);
});

// [VXG RealForever]
