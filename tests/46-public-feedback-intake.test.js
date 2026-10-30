'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const FORM_PATH = path.join(ROOT, '.github', 'ISSUE_TEMPLATE', 'public-feedback.yml');
const CONFIG_PATH = path.join(ROOT, '.github', 'ISSUE_TEMPLATE', 'config.yml');

function read(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

test('PUBLIC FEEDBACK: form and chooser configuration are committed', () => {
  assert.equal(fs.existsSync(FORM_PATH), true);
  assert.equal(fs.existsSync(CONFIG_PATH), true);
});

test('PUBLIC FEEDBACK: blank issues are disabled and private routes leave GitHub', () => {
  const config = read(CONFIG_PATH);
  assert.match(config, /^blank_issues_enabled: false$/m);
  assert.match(config, /https:\/\/www\.vextreme24\.com\/direct-contact/);
  assert.match(config, /security, privacy, or business contact/);
});

test('PUBLIC FEEDBACK: form is public-safe and uses an existing repository label', () => {
  const form = read(FORM_PATH);
  assert.match(form, /^title: "\[Public feedback\] "$/m);
  assert.match(form, /^labels: \["enhancement"\]$/m);
  assert.match(form, /This issue and every attachment are public/);
  assert.match(form, /Use \[Direct Contact\]\(https:\/\/www\.vextreme24\.com\/direct-contact\)/);
  assert.doesNotMatch(form, /^\s*- type: input$/m);
});

test('PUBLIC FEEDBACK: category choices exclude private and security intake', () => {
  const form = read(FORM_PATH);
  const categoryBlock = form.match(/id: feedback-area([\s\S]*?)\n\s*- type: textarea/);
  assert.ok(categoryBlock, 'feedback-area dropdown must remain present');
  for (const expected of [
    'Page usability or navigation',
    'Accessibility',
    'Localization or language',
    'Documentation',
    'Public collaboration idea',
    'Other public feedback',
  ]) assert.ok(categoryBlock[1].includes(expected));
  for (const forbidden of ['Business inquiry', 'Security report', 'Private support']) {
    assert.equal(categoryBlock[1].includes(forbidden), false);
  }
});

test('PUBLIC FEEDBACK: observation and outcome are required while context is optional', () => {
  const form = read(FORM_PATH);
  const observation = form.match(/id: observation([\s\S]*?)\n\s*- type: textarea/);
  const outcome = form.match(/id: expected-outcome([\s\S]*?)\n\s*- type: textarea/);
  const context = form.match(/id: public-context([\s\S]*?)\n\s*- type: checkboxes/);
  assert.match(observation[1], /required: true/);
  assert.match(outcome[1], /required: true/);
  assert.match(context[1], /required: false/);
});

test('PUBLIC FEEDBACK: all three safety acknowledgements are mandatory', () => {
  const form = read(FORM_PATH);
  const safety = form.match(/id: public-safety([\s\S]*?)# \[VXG RealForever\]/);
  assert.ok(safety, 'public-safety acknowledgements must remain present');
  assert.equal((safety[1].match(/required: true/g) || []).length, 3);
  assert.match(safety[1], /GitHub identity, and any uploads are public/);
  assert.match(safety[1], /security or privacy reports/);
  assert.match(safety[1], /does not create a commitment/);
});

// [VXG RealForever]
