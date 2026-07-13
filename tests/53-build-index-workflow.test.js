'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const WORKFLOW_PATH = path.join(__dirname, '..', '.github', 'workflows', 'build-index.yml');
const workflow = fs.readFileSync(WORKFLOW_PATH, 'utf8');
const commitStep = workflow.slice(workflow.indexOf('      - name: Commit artifacts'));

test('BUILD-INDEX-WORKFLOW: manual closeout names the non-mutating checks to rerun', () => {
  assert.match(commitStep, /rerun the non-mutating Tests\s+\# and Key Alignment workflows once/);
});

test('BUILD-INDEX-WORKFLOW: a PR artifact bot head exits before staging another generated commit', () => {
  const guard = commitStep.indexOf('case "$(git log -1 --pretty=%s)" in');
  const botSubject = commitStep.indexOf('"Auto-rebuild artifacts for PR #"*');
  const exit = commitStep.indexOf('exit 0', botSubject);
  const stage = commitStep.indexOf('git add data/strings/compiled');

  assert.ok(guard >= 0, 'artifact commit step is missing the bot-head guard');
  assert.ok(botSubject > guard, 'guard does not recognize PR artifact commit subjects');
  assert.ok(exit > botSubject, 'recognized bot heads do not exit cleanly');
  assert.ok(stage > exit, 'recursive guard must run before generated files are staged');
});

test('BUILD-INDEX-WORKFLOW: normal PR and main artifact commit paths remain present', () => {
  assert.match(commitStep, /git commit -m "Auto-rebuild artifacts for PR #\$\{\{ github\.event\.pull_request\.number \}\}"/);
  assert.match(commitStep, /git commit -m "Auto-rebuild artifacts \[skip ci\]"/);
});

// [VXG RealForever]
