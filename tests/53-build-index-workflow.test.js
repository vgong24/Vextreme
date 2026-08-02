'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const WORKFLOW_PATH = path.join(__dirname, '..', '.github', 'workflows', 'build-index.yml');
const workflow = fs.readFileSync(WORKFLOW_PATH, 'utf8');
const verifyStep = workflow.slice(workflow.indexOf('      - name: Verify generated artifacts are committed'));

test('BUILD-INDEX-WORKFLOW: generated-artifact verification has read-only repository permission', () => {
  assert.match(workflow, /permissions:\s*\n\s+contents: read/);
  assert.doesNotMatch(workflow, /contents: write/);
});

test('BUILD-INDEX-WORKFLOW: verification stages every generated output family before comparing', () => {
  assert.match(verifyStep, /git add data\/strings\/compiled[\s\S]*data\/index\.json[\s\S]*data\/analysis-index\.json[\s\S]*dist sw\.js[\s\S]*sitemap\.xml[\s\S]*widgets\/fab-lang\.js/);
  assert.match(verifyStep, /git diff --staged --quiet/);
  assert.match(verifyStep, /git diff --staged --exit-code/);
});

test('BUILD-INDEX-WORKFLOW: FAB version is resolved before God Script and service-worker generation', () => {
  const bump = workflow.indexOf('run: node lib/bump-fab-version.js');
  const godScripts = workflow.indexOf('run: node lib/build-vextreme.js');
  const serviceWorker = workflow.indexOf('run: node lib/build-sw.js');
  assert.ok(bump >= 0 && bump < godScripts && godScripts < serviceWorker);
});

test('BUILD-INDEX-WORKFLOW: CI never mutates a PR or main branch', () => {
  assert.doesNotMatch(verifyStep, /\bgit (?:commit|push)\b/);
  assert.doesNotMatch(verifyStep, /github-actions\[bot\]/);
});

// [VXG RealForever]
