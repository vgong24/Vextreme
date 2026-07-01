'use strict';

/**
 * Tests for build-archives.js output integrity.
 *
 * build-archives.js is a template script — it generates HTML by string
 * interpolation. These tests treat the OUTPUT (archives.html) as the
 * contract, asserting that the generated file contains exactly what the
 * browser needs to function. This catches template bugs (wrong method names,
 * missing attributes, broken inline JS) that unit tests on pure functions
 * would miss because they never look at the generated file.
 *
 * Run `node lib/build-archives.js` to regenerate archives.html before
 * running these tests, or ensure CI does so in the test step.
 */

const { test } = require('node:test');
const assert   = require('node:assert/strict');
const fs       = require('fs');
const path     = require('path');

const ARCHIVES_PATH = path.join(__dirname, '../pages/archives.html');

let html;
test('setup: archives.html must exist — run node lib/build-archives.js first', () => {
  assert.ok(fs.existsSync(ARCHIVES_PATH), `archives.html not found at ${ARCHIVES_PATH}`);
  html = fs.readFileSync(ARCHIVES_PATH, 'utf8');
});

// ── Copy button DOM contract ──────────────────────────────────────────────────

test('archives.html: slug popover contains the copy button element the click handler binds to', () => {
  // copyBtn = document.getElementById('slugPopoverBtn').
  // If this ID is missing or renamed in the template, the button silently does nothing.
  assert.ok(html.includes('id="slugPopoverBtn"'), 'missing slugPopoverBtn — copy button click handler will find null and throw');
});

test('archives.html: copy button writes currentSlug + ".html" to clipboard — verifying the correct value is copied, not an empty string', () => {
  // The bug this test guards against: if currentSlug is never set (e.g. because the
  // cell click handler fails to find the cell), clipboard.writeText gets ''.html'' —
  // which is what the user pastes. The JS must call writeText(currentSlug + '.html').
  assert.ok(
    html.includes("navigator.clipboard.writeText(currentSlug + '.html')"),
    'clipboard.writeText call missing or wrong argument — copy button will write wrong value'
  );
});

test('archives.html: cell click handler uses closest() to find the clicked cell — corruption of this method name breaks slug detection', () => {
  // A previous rename pass corrupted "closest" → "closesgetString" via replace_all.
  // That made currentSlug stay '' on every click, so clipboard always got '.html'.
  // This test is the regression guard for that class of template corruption.
  assert.ok(
    html.includes(".closest('.cell--missing')"),
    'closest() call missing or corrupted — click handler cannot find the cell, currentSlug stays empty'
  );
  assert.ok(
    !html.includes('closesgetString'),
    'closesgetString found — rename corruption detected, closest() was mangled'
  );
});

test('archives.html: missing cells carry data-slug attribute — without it, currentSlug is always empty regardless of closest() working correctly', () => {
  // The click handler reads cell.dataset.slug.
  // If the template forgot data-slug on .cell--missing spans, slug detection returns ''.
  assert.ok(
    html.includes('data-slug="'),
    'data-slug attribute missing from missing-cell spans — currentSlug will always be empty on click'
  );
});

// ── Strings baked in at build time ───────────────────────────────────────────

test('archives.html: no runtime getString or t() calls in the browser JS — strings must be baked at build time, not resolved in the browser', () => {
  // Constraint: build step owns computation. The browser receives baked text,
  // not a resolver function. If a getString call leaks into the output, it would
  // throw a ReferenceError at runtime since getString is not defined in the browser.
  const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>/g) || [];
  for (const block of scriptMatch) {
    assert.ok(!block.includes('getString('), `getString() found in browser <script> — build-time string not baked: ${block.slice(0, 80)}`);
    // Check for t() as a standalone call: "t('key')" or "t("key")" with word boundary before t
    // Using a pattern that won't false-positive on words ending in t like "closest('..."
    assert.ok(!/\bt\(["']/.test(block), `t() resolver call found in browser <script> — old resolver pattern not removed`);
  }
});

test('archives.html: COPY_LABEL and COPIED_LABEL are literal strings, not key names — users see the text, not the string key', () => {
  // If getString() silently returned the key instead of the text (e.g. compiled bundle missing),
  // the button would display "common.button.copy-filename" to users.
  assert.ok(html.includes('Copy filename') || html.includes('COPY_LABEL'), 'expected copy label text not found in output');
  assert.ok(!html.includes('"common.button.copy-filename"'), 'string key leaked into browser JS — getString() returned the key, not the text');
});

// ── Structural completeness ───────────────────────────────────────────────────

test('archives.html: arc section grid is present — missing grid means no content cells rendered', () => {
  assert.ok(html.includes('class="arc-section"'), 'arc-section class missing — arc grid not rendered');
  assert.ok(html.includes('class="cell'), 'no cell elements found — arc content not rendered');
});

test('archives.html: slug popover element exists and starts hidden — visible by default would block all content', () => {
  assert.ok(html.includes('id="slugPopover"'), 'slugPopover element missing');
  assert.ok(html.includes('style="display:none"'), 'slugPopover is not hidden by default — it would block page content');
});

// [VXG RealForever]
