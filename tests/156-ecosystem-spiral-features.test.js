const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(
  path.join(__dirname, '..', 'components', 'vex-spiral-features.js'),
  'utf8'
);

test('ECOSYSTEM-SPIRAL: registration adapter stays consumer-owned and feature-agnostic', () => {
  assert.match(source, /window\.VEX_SPIRAL_FEATURES|global\[MANIFEST\]/);
  assert.match(source, /data-vex-spiral-feature-id/);
  assert.match(source, /data-vex-spiral-axis/);
  assert.match(source, /document\.querySelector\(target\)/);
  assert.match(source, /group\.appendChild\(control\)/);
  assert.match(source, /control\.hidden = false/);
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

test('ECOSYSTEM-SPIRAL: local controls are recycled rather than proxied', () => {
  assert.match(source, /Recycle the consumer's real Control/);
  assert.match(source, /group\.appendChild\(control\)/);
  assert.doesNotMatch(source, /control\.click\(\)/);
  assert.doesNotMatch(source, /dispatchEvent\(new MouseEvent/);
  assert.doesNotMatch(source, /MutationObserver/);
  assert.doesNotMatch(source, /vex:spiral-change/);
  assert.doesNotMatch(source, /#vex-spiral-primary/);
});

// [VXG RealForever]
