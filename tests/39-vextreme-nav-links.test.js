'use strict';

/**
 * VEXTREME-NAV-LINKS — tests/39-vextreme-nav-links.test.js
 *
 * Regression coverage for lib/vextreme.js's shared header composition.
 * Arrival-level destinations live on the home surfaces; shared chrome keeps
 * only the Vextreme/VexLife/VexWork family coordinates and page-tools rail.
 */

const { test } = require('node:test');
const assert    = require('node:assert/strict');
const fs        = require('fs');
const path      = require('path');

const ROOT   = path.join(__dirname, '..');
const VX_IN  = path.join(ROOT, 'lib', 'vextreme.js');

function readNavSource() {
  return fs.readFileSync(VX_IN, 'utf8');
}

test('injectNav: redundant arrival destinations stay out of shared chrome', () => {
  const source = readNavSource();
  assert.doesNotMatch(source, /label: 'Archives'/);
  assert.doesNotMatch(source, /label: 'Terrain Map'/);
  assert.doesNotMatch(source, /label: 'Receive God'/);
  assert.doesNotMatch(source, /label: 'Ecosystem Hub'/);
  assert.doesNotMatch(source, /class="vex-nav-links"/);
  assert.doesNotMatch(source, /class="vex-nav-link"/);
  assert.doesNotMatch(source, /class="vex-nav-toggle"/);
  assert.doesNotMatch(source, /class="vex-nav-mobile"/);
  assert.doesNotMatch(source, /class="vex-nav-mobile-links"/);
  assert.doesNotMatch(source, /class="vex-nav-mobile-link"/);
});

test('injectNav: family coordinates and page-tools rail remain persistent chrome', () => {
  const source = readNavSource();
  assert.match(source, /class="vex-family-mark" aria-hidden="true"/);
  assert.match(source, /class="vex-family-world vex-nav-title vex-family-current" href="\/Vextreme\/pages\/terrain-map\.html" aria-current="page">Vextreme<\/a>/);
  assert.match(source, /class="vex-family-world vex-nav-product" href="https:\/\/vgong24\.github\.io\/VexLife\/">VexLife<\/a>/);
  assert.match(source, /class="vex-family-world vex-nav-product" href="https:\/\/vexgpt\.github\.io\/VexWork\/">VexWork<\/a>/);
  assert.match(source, /class="vex-nav-actions" id="vex-nav-actions" aria-label="Page tools"/);
});

test('injectNav: active shared chrome has no provider-domain or out-of-sequence Take a Walk destination', () => {
  const source = readNavSource();
  assert.equal(/vextreme24\.com/.test(source), false);
  assert.equal(/take-a-walk/.test(source), false);
});

test('td-009: the tech-debt entry injectNav()\'s own header comment claims exists now actually exists', () => {
  const techDebt = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'status', 'tech-debt.json'), 'utf8'));
  const entry = techDebt.items.find(i => i.id === 'td-009');
  assert.ok(entry, 'td-009 must exist in data/status/tech-debt.json');
  assert.match(entry.context, /injectNav/);
});

// [VXG RealForever]
