const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(
  path.join(__dirname, '..', 'widgets', 'vex-spiral-features.js'),
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

// [VXG RealForever]
