const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(
  path.join(__dirname, '..', 'components', 'vex-spiral-features.js'),
  'utf8'
);
const hostSource = fs.readFileSync(
  path.join(__dirname, '..', 'widgets', 'vex-fab.js'),
  'utf8'
);

test('ECOSYSTEM-SPIRAL: registration adapter stays consumer-owned and feature-agnostic', () => {
  assert.match(source, /window\.VEX_SPIRAL_FEATURES|global\[MANIFEST\]/);
  assert.match(source, /data-vex-spiral-feature-id/);
  assert.match(source, /data-vex-spiral-axis/);
  assert.match(source, /document\.querySelector\(target\)/);
  assert.match(source, /new URL\(value\.trim\(\), document\.baseURI\)/);
  assert.match(source, /item\.enabled === false/);

  // Shared composition must not become a central registry of consumer semantics.
  assert.doesNotMatch(source, /\bVision\b/);
  assert.doesNotMatch(source, /\bSpeech\b/);
  assert.doesNotMatch(source, /\bSupport\b/);
  assert.doesNotMatch(source, /\bTerrain\b/);
  assert.doesNotMatch(source, /\bLanguage\b/);
});

test('ECOSYSTEM-SPIRAL: one feature resolves to exactly one behavior boundary', () => {
  assert.match(source, /\(href && target\) \|\| \(!href && !target\)/);
  assert.match(source, /data-vex-spiral-feature-kind', 'link'/);
  assert.match(source, /data-vex-spiral-feature-kind', 'control'/);
});

test('ECOSYSTEM-SPIRAL: open close and reopen share one state transition circuit', () => {
  assert.match(hostSource, /function setOpen\(open, reason\)/);
  assert.match(hostSource, /setOpen\(!group\.classList\.contains\('open'\), 'trigger'\)/);
  assert.match(hostSource, /setOpen\(false, 'outside'\)/);
  assert.match(hostSource, /setOpen\(false, 'escape'\)/);
  assert.match(hostSource, /data-vex-spiral-state/);
  assert.match(hostSource, /vex:spiral-change/);
  assert.match(hostSource, /aria-expanded/);
});

test('ECOSYSTEM-SPIRAL: delegated local controls do not collapse the open Spiral', () => {
  assert.match(source, /control\.click\(\)/);
  assert.match(hostSource, /if \(!e\.isTrusted\) return/);
});

// [VXG RealForever]
