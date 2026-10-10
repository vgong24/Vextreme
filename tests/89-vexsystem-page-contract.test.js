/**
 * VEXTREME — tests/89-vexsystem-page-contract.test.js
 *
 * Static contract for the standalone public VexSystem renderer.
 *
 * [VXG RealForever]
 */
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(ROOT, 'vexsystem', 'index.html'), 'utf8');
const app = fs.readFileSync(path.join(ROOT, 'vexsystem', 'app.js'), 'utf8');
const css = fs.readFileSync(path.join(ROOT, 'vexsystem', 'styles.css'), 'utf8');

test('VEXSYSTEM PAGE: standalone surface consumes the canonical public projection core and atlas', () => {
  assert.match(html, /src="\.\.\/lib\/vexsystem\/projection\.js"/);
  assert.match(html, /src="\.\/app\.js"/);
  assert.match(app, /fetch\('\.\.\/data\/vexsystem\/atlas\.json'/);
  assert.match(app, /projectionApi\.assertAtlas\(value\)/);
});

test('VEXSYSTEM PAGE: graph has an explicit equivalent text/keyboard surface', () => {
  assert.match(html, /id="vexsystem-map"[^>]*role="img"/);
  assert.match(html, /id="text-node-list"/);
  assert.match(html, /Every graph node below is keyboard-selectable/);
  assert.match(app, /tabindex: '0'/);
  assert.match(app, /event\.key === 'Enter' \|\| event\.key === ' '/);
  assert.match(app, /renderTextView\(view\)/);
});

test('VEXSYSTEM PAGE: lenses and semantic depth are model-driven, not separate hard-coded pages', () => {
  assert.match(html, /id="lens-controls"/);
  assert.match(html, /id="level-out"/);
  assert.match(html, /id="level-in"/);
  assert.match(app, /for \(const lensRecord of atlas\.lenses\)/);
  assert.match(app, /projectionApi\.setLens/);
  assert.match(app, /projectionApi\.setLevel/);
});

test('VEXSYSTEM PAGE: selected semantic coordinate is URL-addressable and returnable', () => {
  assert.match(app, /url\.searchParams\.set\('subject', state\.selectedSubjectRef\)/);
  assert.match(app, /url\.searchParams\.set\('lens', state\.lens\)/);
  assert.match(app, /url\.searchParams\.set\('level', String\(state\.level\)\)/);
  assert.match(app, /projectionApi\.returnFocus/);
});

test('VEXSYSTEM PAGE: renderer fails closed when the projection cannot be loaded', () => {
  assert.match(app, /VexSystem source could not be loaded/);
  assert.match(app, /fails closed rather than inventing architecture/);
});

test('VEXSYSTEM PAGE: visual branch classes include held, proof, and historical distinctions', () => {
  assert.match(css, /\.vs-edge\.HELD_BRANCH/);
  assert.match(css, /\.vs-edge\.PROOF/);
  assert.match(css, /\.vs-edge\.HISTORICAL_BRANCH/);
  assert.match(css, /\.vs-edge\.CONVERGENCE/);
});

test('VEXSYSTEM PAGE: Terrain remains an external host route rather than copied shared chrome', () => {
  assert.match(html, /href="\.\.\/pages\/terrain-map\.html"/);
  assert.doesNotMatch(html, /vex-spiral-trigger|vex-nav-actions|terrain-entry-contract/);
  assert.doesNotMatch(app, /vex-spiral-trigger|vex-nav-actions/);
});
