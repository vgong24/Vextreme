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

test('ECOSYSTEM-SPIRAL: open close and reopen project from the host accessibility state', () => {
  assert.match(source, /function setPresentationOpen\(open, reason\)/);
  assert.match(source, /trigger\.getAttribute\('aria-expanded'\) === 'true'/);
  assert.match(source, /MutationObserver/);
  assert.match(source, /attributeFilter: \['aria-expanded'\]/);
  assert.match(source, /data-vex-spiral-state/);
  assert.match(source, /vex:spiral-change/);
  assert.match(source, /#vex-spiral-group\{display:contents!important;\}/);
  assert.match(source, /#vex-spiral-group\.open #vex-spiral-primary/);
  assert.match(source, /max-width:0!important/);
  assert.match(source, /translateX\(22px\) scale\(\.82\)/);
  assert.match(source, /event\.key !== 'Escape'/);

  // Cross-repo enhancement must not rewrite Vextreme's established host lifecycle.
  assert.doesNotMatch(hostSource, /vex:spiral-change/);
  assert.match(hostSource, /#vex-spiral-group \{ display: none; \}/);
});

test('ECOSYSTEM-SPIRAL: delegated local controls preserve the open host state', () => {
  assert.match(source, /control\.dispatchEvent\(new MouseEvent\('click'/);
  assert.match(source, /bubbles: false/);
  assert.doesNotMatch(source, /control\.click\(\)/);
});

// [VXG RealForever]
