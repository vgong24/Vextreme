'use strict';

/**
 * WIP-DRAFTS — tests/21-wip-drafts.test.js
 *
 * Session 022 continued: Victor added wip/victor-methodology-presentation.html
 * directly and found no build script gave it an "initial mapping" — nothing
 * scanned wip/*.html at all, only wip/*.json's declared _meta.slug. These
 * tests cover the three new pieces that close that gap:
 *   - lib/auto-discover-nodes.js's discoverWipDrafts (title/meta scrape)
 *   - lib/check-key-alignment.js's scanWipHtmlDrafts + its merge into the
 *     existing collision/duplicate-intent checks
 *   - lib/detect-wip-promotions.js's parseRenameStatus (the wip/ -> pages/
 *     move, detected via git's own rename similarity, not custom tracking)
 */

const { test } = require('node:test');
const assert    = require('node:assert/strict');
const fs        = require('fs');
const path      = require('path');
const os        = require('os');

const { discoverWipDrafts } = require('../lib/auto-discover-nodes');
const { scanWipHtmlDrafts, findWipSlugCollisions, findDuplicateWipIntents } = require('../lib/check-key-alignment');
const { parseRenameStatus } = require('../lib/detect-wip-promotions');
const { buildContentIntegrityNotices } = require('../lib/build-status');

// ── discoverWipDrafts ──────────────────────────────────────────────────────────

test('WIP-DRAFTS: discoverWipDrafts scrapes the title from each file', () => {
  const pages = { foo: '<html><title>Foo Title</title></html>' };
  const result = discoverWipDrafts(['foo'], slug => pages[slug]);
  assert.deepEqual(result, [{ slug: 'foo', title: 'Foo Title', department: undefined, workType: undefined }]);
});

test('WIP-DRAFTS: discoverWipDrafts falls back to a title-cased slug when there is no <title>', () => {
  const result = discoverWipDrafts(['my-draft-page'], () => '<html></html>');
  assert.equal(result[0].title, 'My Draft Page');
});

test('WIP-DRAFTS: discoverWipDrafts picks up optional vex:department/vex:workType meta tags', () => {
  const html = '<html><head><meta name="vex:department" content="media"><meta name="vex:workType" content="reviews"></head></html>';
  const result = discoverWipDrafts(['tagged'], () => html);
  assert.equal(result[0].department, 'media');
  assert.equal(result[0].workType, 'reviews');
});

test('WIP-DRAFTS: discoverWipDrafts does not default a department when none is declared', () => {
  const result = discoverWipDrafts(['undeclared'], () => '<html></html>');
  assert.equal(result[0].department, undefined);
  assert.equal(result[0].workType, undefined);
});

// ── scanWipHtmlDrafts (real filesystem, tmp dir) ──────────────────────────────

test('WIP-DRAFTS: scanWipHtmlDrafts reads real .html files from the given directory, not the repo\'s real wip/', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'wip-html-test-'));
  fs.writeFileSync(path.join(tmpDir, 'draft-one.html'), '<html><title>Draft One</title></html>');
  fs.writeFileSync(path.join(tmpDir, 'not-html.json'), '{}');
  const result = scanWipHtmlDrafts(tmpDir);
  assert.deepEqual(result, [{ file: 'draft-one.html', slug: 'draft-one', title: 'Draft One' }]);
  fs.rmSync(tmpDir, { recursive: true });
});

test('WIP-DRAFTS: scanWipHtmlDrafts returns an empty array for a directory with no .html files', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'wip-html-empty-'));
  fs.writeFileSync(path.join(tmpDir, 'placeholder.json'), '{}');
  assert.deepEqual(scanWipHtmlDrafts(tmpDir), []);
  fs.rmSync(tmpDir, { recursive: true });
});

test('WIP-DRAFTS: an html-draft slug colliding with a real page is caught by the existing collision check', () => {
  const combined = [{ file: 'silent-god.json', slug: 'reserved' }, { file: 'draft.html', slug: 'already-live' }];
  const result = findWipSlugCollisions(combined, ['already-live']);
  assert.equal(result.length, 1);
  assert.equal(result[0].file, 'draft.html');
});

test('WIP-DRAFTS: an html-draft slug duplicating a json-declared intent is caught by the existing duplicate check', () => {
  const combined = [{ file: 'a.json', slug: 'shared' }, { file: 'b.html', slug: 'shared' }];
  const result = findDuplicateWipIntents(combined);
  assert.equal(result.length, 1);
  assert.deepEqual(result[0].files.sort(), ['a.json', 'b.html']);
});

// ── buildContentIntegrityNotices with wip html drafts ─────────────────────────

test('WIP-DRAFTS: buildContentIntegrityNotices emits a low-priority notice per draft', () => {
  const items = buildContentIntegrityNotices([], [], [], [{ file: 'foo.html', slug: 'foo', title: 'Foo' }]);
  assert.equal(items.length, 1);
  assert.equal(items[0].priority, 'low');
  assert.match(items[0].title, /Draft in wip\/: Foo/);
  assert.match(items[0].description, /pages\/foo\.html/);
});

test('WIP-DRAFTS: buildContentIntegrityNotices with no drafts adds nothing new', () => {
  const items = buildContentIntegrityNotices(['orphan'], [], [], []);
  assert.equal(items.length, 1);
  assert.doesNotMatch(items[0].title, /Draft in wip/);
});

// ── parseRenameStatus (git diff porcelain) ────────────────────────────────────

test('WIP-PROMOTION: parseRenameStatus finds a wip/ -> pages/ rename with the same slug', () => {
  const output = 'R100\twip/victor-methodology-presentation.html\tpages/victor-methodology-presentation.html\n';
  const result = parseRenameStatus(output);
  assert.equal(result.length, 1);
  assert.equal(result[0].fromSlug, 'victor-methodology-presentation');
  assert.equal(result[0].toSlug, 'victor-methodology-presentation');
  assert.equal(result[0].slugChanged, false);
  assert.equal(result[0].similarity, 100);
});

test('WIP-PROMOTION: parseRenameStatus flags a slug change across the move', () => {
  const output = 'R92\twip/old-name.html\tpages/new-name.html\n';
  const result = parseRenameStatus(output);
  assert.equal(result[0].slugChanged, true);
});

test('WIP-PROMOTION: parseRenameStatus ignores unrelated changes (M, A, D, non-wip/pages renames)', () => {
  const output = [
    'M\tdata/index.json',
    'A\tpages/brand-new-page.html',
    'D\twip/abandoned-draft.html',
    'R100\tsome/other.html\tsome/place.html',
  ].join('\n');
  assert.deepEqual(parseRenameStatus(output), []);
});

test('WIP-PROMOTION: parseRenameStatus handles empty input', () => {
  assert.deepEqual(parseRenameStatus(''), []);
  assert.deepEqual(parseRenameStatus('\n\n'), []);
});

// [VXG RealForever]
