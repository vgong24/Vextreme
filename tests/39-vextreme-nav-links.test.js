'use strict';

/**
 * VEXTREME-NAV-LINKS — tests/39-vextreme-nav-links.test.js
 *
 * Tests for lib/vextreme.js's injectNav() destination link list
 * (docs/architecture/16-nav-coverage.md Step 2). Same regex-extraction
 * technique tests/08-build-vextreme.test.js already uses for fab-lang.js's
 * pure logic: pull the real `links` array literal out of the source and
 * evaluate it directly, rather than simulating a full DOM to execute
 * injectNav() itself (this is v1 code with no module.exports, and the
 * array contents are what changed here, not the DOM-mounting logic).
 */

const { test } = require('node:test');
const assert    = require('node:assert/strict');
const fs        = require('fs');
const path      = require('path');

const ROOT   = path.join(__dirname, '..');
const VX_IN  = path.join(ROOT, 'lib', 'vextreme.js');

function loadNavLinks() {
  const source = fs.readFileSync(VX_IN, 'utf8');
  const match = source.match(/var links = (\[[\s\S]*?\]);/);
  assert.ok(match, 'injectNav()\'s links array must exist in lib/vextreme.js');
  const fn = new Function('return ' + match[1] + ';');
  return fn();
}

test('injectNav links: includes the real Archives destination (unchanged)', () => {
  const links = loadNavLinks();
  const archives = links.find(l => l.label === 'Archives');
  assert.ok(archives, 'Archives link must exist');
  assert.equal(archives.href, '/Vextreme/index.html');
});

test('injectNav links: includes real Terrain Map and Ecosystem Hub destinations (new)', () => {
  const links = loadNavLinks();
  const terrainMap = links.find(l => l.label === 'Terrain Map');
  const ecosystemHub = links.find(l => l.label === 'Ecosystem Hub');
  assert.ok(terrainMap, 'Terrain Map link must exist');
  assert.equal(terrainMap.href, '/Vextreme/pages/terrain-map.html');
  assert.ok(ecosystemHub, 'Ecosystem Hub link must exist');
  assert.equal(ecosystemHub.href, '/Vextreme/pages/ecosystem-hub.html');
});

test('injectNav links: original vextreme24.com links are preserved, not removed', () => {
  const links = loadNavLinks();
  const labels = links.map(l => l.label);
  assert.ok(labels.includes('Direct Contact'), 'Direct Contact must still be present');
  assert.ok(labels.includes('AI Tools'), 'AI Tools must still be present');
  assert.ok(labels.includes('vextreme24.com'), 'vextreme24.com must still be present');
});

test('injectNav links: every href is a non-empty string, every label is unique', () => {
  const links = loadNavLinks();
  const labels = new Set();
  for (const l of links) {
    assert.ok(typeof l.href === 'string' && l.href.length > 0, `${l.label}: href must be a non-empty string`);
    assert.ok(!labels.has(l.label), `duplicate label: ${l.label}`);
    labels.add(l.label);
  }
});

test('td-009: the tech-debt entry injectNav()\'s own header comment claims exists now actually exists', () => {
  const techDebt = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'status', 'tech-debt.json'), 'utf8'));
  const entry = techDebt.items.find(i => i.id === 'td-009');
  assert.ok(entry, 'td-009 must exist in data/status/tech-debt.json');
  assert.match(entry.context, /injectNav/);
});
