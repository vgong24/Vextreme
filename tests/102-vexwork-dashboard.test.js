'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const legacy = fs.readFileSync(path.join(ROOT, 'vexwork', 'index.html'), 'utf8');
const nav = fs.readFileSync(path.join(ROOT, 'lib', 'vextreme.js'), 'utf8');

test('VEXWORK-LEGACY: retired Vextreme-local route forwards to first-party VexWork', () => {
  assert.match(legacy, /https:\/\/vexgpt\.github\.io\/VexWork\//);
  assert.match(legacy, /window\.location\.replace\('https:\/\/vexgpt\.github\.io\/VexWork\/'\)/);
  assert.match(legacy, /http-equiv="refresh"/i);
  assert.doesNotMatch(legacy, /public\/work-dashboard\.json/);
});

test('VEXWORK-LEGACY: shared product family links first-party VexWork beside VexLife', () => {
  assert.match(nav, /aria-label="Vextreme, VexLife, and VexWork homes"/);
  assert.match(nav, /href="https:\/\/vgong24\.github\.io\/VexLife\/">VexLife<\/a>/);
  assert.match(nav, /href="https:\/\/vexgpt\.github\.io\/VexWork\/">VexWork<\/a>/);
  assert.doesNotMatch(nav, /href="\/Vextreme\/vexwork\/">VexWork<\/a>/);
});

// [VXG RealForever]
