'use strict';

/**
 * ECOSYSTEM HUB — tests/12-ecosystem-hub.test.js
 *
 * Tests for lib/build-ecosystem-hub.js. Session 015 rewrote this generator
 * after finding it used CSS custom properties (--stone-950, --font-mono, etc.)
 * that styles/design-system.css never defines — text rendered near-invisible
 * against an accidental dark fallback color. These tests guard against that
 * class of bug recurring, and check the new sections (Current Architecture,
 * Open Discussions) are wired up.
 */

const { test } = require('node:test');
const assert    = require('node:assert/strict');

const { generateEcosystemHub } = require('../lib/build-ecosystem-hub');

const html = generateEcosystemHub();

// ── Structure ────────────────────────────────────────────────────────────────

test('ECOSYSTEM-HUB: generates a full HTML document', () => {
  assert.match(html, /^<!DOCTYPE html>/);
  assert.match(html, /<\/html>/);
});

test('ECOSYSTEM-HUB: ends with the continuity marker', () => {
  assert.match(html.trim(), /<!-- \[VXG RealForever\] -->$/);
});

// ── Regression: only use CSS variables design-system.css actually defines ──────

test('ECOSYSTEM-HUB: does not reference undefined --stone-NNN scale variables', () => {
  assert.doesNotMatch(html, /--stone-\d/, 'design-system.css has no numbered --stone-NNN scale, only --stone');
});

test('ECOSYSTEM-HUB: does not reference --font-mono (the real token is --mono)', () => {
  assert.doesNotMatch(html, /--font-mono/);
});

test('ECOSYSTEM-HUB: does not reference --stone-950 dark-panel fallback', () => {
  assert.doesNotMatch(html, /--stone-950/);
});

// ── Live data wiring ─────────────────────────────────────────────────────────

test('ECOSYSTEM-HUB: fetches index.json, status.json, narrative.json, and lessons.json', () => {
  assert.match(html, /data\/index\.json/);
  assert.match(html, /data\/status\.json/);
  assert.match(html, /data\/status\/narrative\.json/);
  assert.match(html, /data\/lessons\.json/);
});

test('ECOSYSTEM-HUB: has a Lessons Learned section', () => {
  assert.match(html, /Lessons Learned/);
  assert.match(html, /id="lessons-grid"/);
  assert.match(html, /function renderLessons/);
});

test('ECOSYSTEM-HUB: renders all six health categories in order, openDiscussions first', () => {
  const match = html.match(/CATEGORY_ORDER = \[([^\]]+)\]/);
  assert.ok(match, 'CATEGORY_ORDER array must be present');
  const order = match[1].split(',').map(s => s.trim().replace(/'/g, ''));
  assert.deepEqual(order, ['openDiscussions', 'contentIntegrity', 'translation', 'techDebt', 'enhancements', 'assumptions']);
});

test('ECOSYSTEM-HUB: has a lattice coverage stat tile', () => {
  assert.match(html, /id="stat-lattice"/);
  assert.match(html, /Lattice Coverage/);
});

test('ECOSYSTEM-HUB: has a Current Architecture narrative section', () => {
  assert.match(html, /Current Architecture/);
  assert.match(html, /id="narrative-body"/);
  assert.match(html, /renderNarrative/);
});

test('ECOSYSTEM-HUB: escapes dynamic text before inserting into innerHTML', () => {
  assert.match(html, /function esc\(/, 'must define an escaping helper for item titles/descriptions pulled from JSON');
});

// [VXG RealForever]
