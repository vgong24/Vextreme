'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const fs = require('fs');
const parse5 = require('parse5');
const projector = require('../tools/vex-content-forge/project_arc_batch.js');

const ROOT = path.join(__dirname, '..');

test('Content Forge remaining recovered ports do not hold on absent inline style or ordinary function declarations', () => {
  const evidential = projector.main({
    root: ROOT,
    silent: true,
    formationRel: 'docs/ingestion/workmaps/content-forge-evidential-research-arc-batch-formation.json',
  });
  const accountability = evidential.members.find(item => item.slug === 'accountability-record-v8');
  assert.ok(accountability);
  assert.equal(accountability.disposition, 'PROJECTED');
  assert.equal(evidential.accounting.held, 0);

  const witness = projector.main({
    root: ROOT,
    silent: true,
    formationRel: 'docs/ingestion/workmaps/content-forge-witness-chatroom-animation-project-formation.json',
  });
  const draft = witness.members.find(item => item.slug === 'current-draft');
  assert.ok(draft);
  assert.equal(draft.disposition, 'PROJECTED');
  assert.equal(witness.accounting.held, 0);
});

test('Content Forge HTML beautification is DOM-equivalent and leaves raw script/style payloads untouched', () => {
  const compact = '<!DOCTYPE html><html lang="en"><head><style>.x::before{content:"<span data-x=\\"y\\">";}</style></head><body><main class="x" data-kind="sample"><p data-i18n="pages.sample.body.p001.text001">Hello <span data-role="name">world</span>.</p><script>const sample="<div data-x=\\\"y\\\">"; function keep(){ return sample; }</script></main></body></html>';
  const beautified = projector.beautifyHtmlMarkup(compact);
  assert.ok(beautified.split(/\r?\n/).length > compact.split(/\r?\n/).length);
  assert.equal(parse5.serialize(parse5.parse(beautified)), parse5.serialize(parse5.parse(compact)));
  assert.match(beautified, /<main\n  class="x"\n  data-kind="sample">/);
  assert.ok(beautified.includes('<script>const sample="<div data-x=\\\"y\\\">"; function keep(){ return sample; }</script>'));
  assert.ok(beautified.includes('<style>.x::before{content:"<span data-x=\\"y\\">";}</style>'));
});

test('projected interactive HTML is reviewable as multiline markup', () => {
  const page = fs.readFileSync(path.join(ROOT, 'pages', 'current-draft.html'), 'utf8');
  assert.ok(page.split(/\r?\n/).length > 100);
  assert.match(page, /data-content-forge-generator=/);
});

// [VXG RealForever]
