'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
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

// [VXG RealForever]
