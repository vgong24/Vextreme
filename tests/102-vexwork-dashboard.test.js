'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const page = fs.readFileSync(path.join(ROOT, 'vexwork', 'index.html'), 'utf8');
const nav = fs.readFileSync(path.join(ROOT, 'lib', 'vextreme.js'), 'utf8');

test('VEXWORK-DASHBOARD: lives in its own standalone UI home, outside pages inventory', () => {
  assert.equal(fs.existsSync(path.join(ROOT, 'vexwork', 'index.html')), true);
  assert.equal(fs.existsSync(path.join(ROOT, 'pages', 'vex-work.html')), false);
  assert.match(page, /<h1>VexWork<\/h1>/);
});

test('VEXWORK-DASHBOARD: shared product family links VexWork beside VexLife', () => {
  assert.match(nav, /aria-label="Vextreme, VexLife, and VexWork homes"/);
  assert.match(nav, /href="https:\/\/vgong24\.github\.io\/VexLife\/">VexLife<\/a>/);
  assert.match(nav, /href="\/Vextreme\/vexwork\/">VexWork<\/a>/);
});

test('VEXWORK-DASHBOARD: consumes only the stable public VexWork projection', () => {
  assert.match(page, /https:\/\/raw\.githubusercontent\.com\/VexGPT\/VexWork\/main\/public\/work-dashboard\.json/);
  assert.doesNotMatch(page, /projects\/vexwork-foundation\/workgraph\.json/);
  assert.doesNotMatch(page, /blueprint\/work-registry\.json/);
  assert.match(page, /schemaVersion !== 'vexwork\.public-work-dashboard\/v1'/);
});

test('VEXWORK-DASHBOARD: keeps the Vextreme consumer read-only', () => {
  assert.match(page, /data\.effects !== false \|\| data\.executionAuthority !== 'NONE'/);
  assert.match(page, /This page cannot mutate Workgraph truth/);
  assert.doesNotMatch(page, /method:\s*['"](?:POST|PUT|PATCH|DELETE)['"]/i);
});

test('VEXWORK-DASHBOARD: renders Board lanes and Parking Lot as sibling views', () => {
  assert.match(page, /function renderLane\(/);
  assert.match(page, /function renderCard\(/);
  assert.match(page, /id="vw-board"/);
  assert.match(page, /id="vw-parking"/);
  assert.match(page, /Visible without forcing deferred work into Project membership/);
});

test('VEXWORK-DASHBOARD: dynamic VexWork strings enter through textContent, not raw HTML', () => {
  assert.match(page, /node\.textContent = text == null \? '' : String\(text\)/);
  assert.doesNotMatch(page, /\.innerHTML\s*=\s*card\./);
});

// [VXG RealForever]
