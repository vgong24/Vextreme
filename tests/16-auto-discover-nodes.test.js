'use strict';

/**
 * AUTO-DISCOVER-NODES — tests/16-auto-discover-nodes.test.js
 *
 * Tests for lib/auto-discover-nodes.js — synthesizes a node-shaped object
 * for any pages/*.html file with no data/nodes.json entry, so adding a page
 * alone (no manual nodes.json edit) is enough to make it show up in
 * data/index.json / archives.html the next time the build runs.
 *
 * Test order:
 *   1. titleCaseFromSlug — the no-<title>-tag fallback
 *   2. parsePageTitle — <title> extraction + entity decoding + fallback
 *   3. parsePageMeta — optional vex:department / vex:workType tags
 *   4. discoverOrphanNodes — the integration of all of the above
 */

const { test } = require('node:test');
const assert   = require('node:assert/strict');

const {
  titleCaseFromSlug,
  parsePageTitle,
  parsePageMeta,
  discoverOrphanNodes,
} = require('../lib/auto-discover-nodes');

const DEPARTMENTS = {
  rd:    { label: 'R&D', default: true,  workTypes: { default: { label: 'Default' } } },
  media: { label: 'Media', default: false, workTypes: { reviews: { label: 'Reviews' } } },
};

// ── 1. titleCaseFromSlug ───────────────────────────────────────────────────────

test('AUTO-DISCOVER: titleCaseFromSlug turns a hyphenated slug into a readable title', () => {
  assert.equal(titleCaseFromSlug('accountability-test-01'), 'Accountability Test 01');
  assert.equal(titleCaseFromSlug('about-me'), 'About Me');
});

// ── 2. parsePageTitle ──────────────────────────────────────────────────────────

test('AUTO-DISCOVER: parsePageTitle extracts <title> text', () => {
  const html = '<html><head><title>The Victor Pattern — Topology</title></head></html>';
  assert.equal(parsePageTitle(html, 'the-victor-pattern'), 'The Victor Pattern — Topology');
});

test('AUTO-DISCOVER: parsePageTitle decodes common HTML entities', () => {
  const html = '<title>Human&ndash;AI Governance &amp; Trust</title>';
  assert.equal(parsePageTitle(html, 'x'), 'Human–AI Governance & Trust');
});

test('AUTO-DISCOVER: parsePageTitle falls back to a title-cased slug when there is no <title> tag', () => {
  assert.equal(parsePageTitle('', 'summary-of-value'), 'Summary Of Value');
  assert.equal(parsePageTitle('<html></html>', 'summary-of-value'), 'Summary Of Value');
});

test('AUTO-DISCOVER: parsePageTitle falls back when the <title> tag is empty', () => {
  assert.equal(parsePageTitle('<title></title>', 'connect'), 'Connect');
});

// ── 3. parsePageMeta ───────────────────────────────────────────────────────────

test('AUTO-DISCOVER: parsePageMeta reads vex:department and vex:workType meta tags', () => {
  const html = '<meta name="vex:department" content="media"><meta name="vex:workType" content="reviews">';
  assert.deepEqual(parsePageMeta(html), { department: 'media', workType: 'reviews' });
});

test('AUTO-DISCOVER: parsePageMeta returns undefined fields when no meta tags are present', () => {
  assert.deepEqual(parsePageMeta('<html></html>'), { department: undefined, workType: undefined });
  assert.deepEqual(parsePageMeta(''), { department: undefined, workType: undefined });
});

// ── 4. discoverOrphanNodes ─────────────────────────────────────────────────────

function fakeReader(pages) {
  return slug => {
    if (!(slug in pages)) throw new Error('no such page: ' + slug);
    return pages[slug];
  };
}

test('AUTO-DISCOVER: skips pages already in nodes.json, viewmodels.json, or SKIP_PAGES', () => {
  const result = discoverOrphanNodes(
    ['curated', 'demo-page', 'skip-page', 'new-page'],
    ['curated'],
    { 'skip-page': 'generated page' },
    ['demo-page'],
    fakeReader({ 'new-page': '<title>New Page</title>' }),
    DEPARTMENTS
  );
  assert.equal(result.length, 1);
  assert.equal(result[0].slug, 'new-page');
});

test('AUTO-DISCOVER: synthesized node has id:null, empty arcKeys, and autoDiscovered:true', () => {
  const [node] = discoverOrphanNodes(['x'], [], {}, [], fakeReader({ x: '<title>X Page</title>' }), DEPARTMENTS);
  assert.equal(node.id, null);
  assert.deepEqual(node.arcKeys, []);
  assert.equal(node.autoDiscovered, true);
  assert.equal(node.title, 'X Page');
});

test('AUTO-DISCOVER: falls back to the default:true department/workType when the page declares none', () => {
  const [node] = discoverOrphanNodes(['x'], [], {}, [], fakeReader({ x: '<title>X</title>' }), DEPARTMENTS);
  assert.equal(node.department, 'rd');
  assert.equal(node.workType, 'default');
});

test('AUTO-DISCOVER: a page can declare its own department/workType via meta tags', () => {
  const html = '<title>A Review</title><meta name="vex:department" content="media"><meta name="vex:workType" content="reviews">';
  const [node] = discoverOrphanNodes(['x'], [], {}, [], fakeReader({ x: html }), DEPARTMENTS);
  assert.equal(node.department, 'media');
  assert.equal(node.workType, 'reviews');
});

test('AUTO-DISCOVER: an unreadable/missing page still produces a node (title falls back to the slug)', () => {
  const [node] = discoverOrphanNodes(['ghost-page'], [], {}, [], fakeReader({}), DEPARTMENTS);
  assert.equal(node.title, 'Ghost Page');
});

// [VXG RealForever]
