'use strict';

/**
 * BUILD OUTPUT INTEGRITY — tests/04-build-output.test.js
 *
 * Tests generated files (pages/archives.html) as the contract surface.
 *
 * Why this file exists separately from the pipeline tests:
 * build-archives.js uses string interpolation to produce HTML. A bug in
 * the template — wrong method name, missing attribute, broken inline JS —
 * is invisible to tests that only examine pure functions. These tests read
 * the GENERATED FILE and assert that the browser has what it needs.
 *
 * This catches a class of bug that pure unit tests cannot:
 *   - Rename pass corruption (e.g. closest → closesgetString via replace_all)
 *   - Build-time resolver calls leaking into browser JS (getString in output)
 *   - Missing DOM element IDs that the JS binds to
 *   - Incorrect clipboard value (slug missing, wrong suffix)
 *
 * PREREQUISITE: run `node lib/strings-compile.js && node lib/build-archives.js`
 * before this test suite. CI does this in the "Build test prerequisites" step.
 */

const { test } = require('node:test');
const assert   = require('node:assert/strict');
const fs       = require('fs');
const path     = require('path');

const ARCHIVES_PATH = path.join(__dirname, '../pages/archives.html');

let html = '';

test('SETUP: archives.html exists and is readable — run node lib/build-archives.js first', () => {
  assert.ok(fs.existsSync(ARCHIVES_PATH), `archives.html not found at ${ARCHIVES_PATH}`);
  html = fs.readFileSync(ARCHIVES_PATH, 'utf8');
  assert.ok(html.length > 1000, 'archives.html appears empty or truncated');
});

// ── Copy button correctness ───────────────────────────────────────────────────
// This group guards the copy-to-clipboard feature. Each test targets one
// link in the chain: cell → currentSlug → clipboard.writeText(slug + '.html').

test('COPY BUTTON: cell click handler uses .closest() to find the clicked cell — method name corruption breaks slug detection silently', () => {
  // Regression guard: a replace_all rename pass corrupted "closest" → "closesgetString",
  // which made currentSlug stay '' on every click so clipboard always received '.html'.
  // This test would have caught that in CI before it shipped.
  assert.ok(
    html.includes(".closest('.cell--missing')"),
    '.closest() call missing or corrupted in generated HTML'
  );
  assert.ok(
    !html.includes('closesgetString'),
    'closesgetString found — rename pass corrupted closest(), copy button is broken'
  );
});

test('COPY BUTTON: missing cells carry data-slug attribute — without it, currentSlug is always empty regardless of closest() working', () => {
  // The click handler reads cell.dataset.slug. No attribute = no slug = broken copy.
  assert.ok(html.includes('data-slug="'), 'data-slug attribute missing from .cell--missing spans');
});

test('COPY BUTTON: clipboard.writeText receives currentSlug + ".html" — the user gets the filename, not an empty string or just ".html"', () => {
  assert.ok(
    html.includes("navigator.clipboard.writeText(currentSlug + '.html')"),
    'clipboard.writeText call missing or receives wrong argument'
  );
});

test('COPY BUTTON: slugPopoverBtn element exists — the click handler getElementById("slugPopoverBtn") returns null if the ID is missing', () => {
  assert.ok(html.includes('id="slugPopoverBtn"'), 'slugPopoverBtn element missing from generated HTML');
});

// ── String baking ─────────────────────────────────────────────────────────────

test('STRING BAKING: no getString() calls in browser <script> — build-time resolver must not leak into browser JS where it would throw ReferenceError', () => {
  const scriptBlocks = html.match(/<script>([\s\S]*?)<\/script>/g) || [];
  for (const block of scriptBlocks) {
    assert.ok(!block.includes('getString('),
      `getString() found in browser <script> — string not baked at build time`);
    // \bt\( matches t( as a standalone call (not inside words like "closest(")
    assert.ok(!/\bt\(["']/.test(block),
      `t() resolver call found in browser <script> — old resolver pattern not removed`);
  }
});

test('STRING BAKING: copy button label text is a literal string in the output — if getString() returned the key, users would see "common.button.copy-filename"', () => {
  assert.ok(!html.includes('"common.button.copy-filename"'),
    'string key leaked into browser JS — getString() returned the key, not the resolved text');
  assert.ok(!html.includes('"common.button.copied"'),
    'string key leaked into browser JS — Copied! label not resolved at build time');
});

// ── Structural completeness ───────────────────────────────────────────────────

test('STRUCTURE: arc section grid is present — missing grid means no content cells rendered for any arc', () => {
  assert.ok(html.includes('class="arc-section"'), 'arc-section container missing — arc grid not rendered');
  assert.ok(html.includes('class="cell'),         'no cell elements found — arc content not rendered');
});

test('STRUCTURE: slug popover starts hidden — visible by default would overlay page content on load', () => {
  assert.ok(html.includes('id="slugPopover"'),    'slugPopover element missing');
  assert.ok(html.includes('style="display:none"'),'slugPopover is not hidden by default');
});

test('STRUCTURE: system pages skipped by the God Script audit are still visible in Archives', () => {
  assert.ok(html.includes('id="arc-system-pages"'), 'system pages section missing');
  assert.ok(html.includes('terrain-map.html'), 'terrain-map.html missing from system pages section');
  assert.ok(html.includes('Terrain Map'), 'Terrain Map title missing from Archives');
});

test('STRUCTURE: every real arc in data/arcs-v2.json has a rendered section — a new arc left out of build-archives.js\'s hardcoded ARC_ORDER silently orphans every page in it (real regression: victor_dossier shipped in Session 025 but never added to ARC_ORDER)', () => {
  const arcs = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/arcs-v2.json'), 'utf8'));
  for (const key of Object.keys(arcs)) {
    if (key.startsWith('_')) continue; // e.g. "_meta" — not a real arc
    const sectionId = 'id="arc-' + key.replace(/_/g, '-') + '"';
    assert.ok(html.includes(sectionId), `arc "${key}" has no rendered section in archives.html (${sectionId} missing) — add it to ARC_ORDER in lib/build-archives.js`);
  }
});

// [VXG RealForever]
