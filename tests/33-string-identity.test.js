'use strict';

/**
 * STRING IDENTITY PILOT — tests/33-string-identity.test.js
 *
 * Tests for the three localization identity pilot scripts (Session 027,
 * PR #93/#94 continuation): lib/discover-string-identity.js,
 * lib/build-string-identity-index.js, lib/check-string-identity.js.
 *
 * Test order:
 *   1. discover-string-identity — pure functions
 *   2. build-string-identity-index — pure functions
 *   3. check-string-identity — pure functions
 *   4. Integration — the real pilot page's committed state holds
 */

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { execFileSync } = require('child_process');
const path = require('path');

const {
  contentNodeSegments,
  findElementId,
  findLegacyId,
  findTitleAlias,
  classifyCandidate,
} = require('../lib/discover-string-identity');

const { collectIdentityRecords, buildIndexes, renderMarkdownReport } = require('../lib/build-string-identity-index');

const {
  checkIndexKeysResolve,
  checkCanonicalConflicts,
  checkCoverageGaps,
  checkElementIdsStillReal,
} = require('../lib/check-string-identity');

const ROOT = path.join(__dirname, '..');

// ── 1. discover-string-identity ──────────────────────────────────────────────

test('IDENTITY-DISCOVER: contentNodeSegments groups keys by their third dot segment', () => {
  const keys = [
    'pages.demo.header.title',
    'pages.demo.header.subtitle',
    'pages.demo.footer.line',
  ];
  const nodes = contentNodeSegments(keys, 'demo');
  assert.deepEqual(nodes, [
    { contentNodeKey: 'header', fieldKeys: ['title', 'subtitle'] },
    { contentNodeKey: 'footer', fieldKeys: ['line'] },
  ]);
});

test('IDENTITY-DISCOVER: findElementId matches case-insensitively but does not match inside data-legacy-id', () => {
  const html = '<div data-legacy-id="REC-1" id="proof-node">text</div>';
  assert.equal(findElementId(html, 'proof-node'), 'proof-node');
  // the regression this guards: a naive \b-based regex also matches the
  // "-id=" tail of data-legacy-id.
  assert.equal(findElementId(html, 'rec-1'), null);
});

test('IDENTITY-DISCOVER: findElementId returns null when no id matches', () => {
  const html = '<div id="something-else">text</div>';
  assert.equal(findElementId(html, 'proof-node'), null);
});

test('IDENTITY-DISCOVER: findLegacyId reads data-legacy-id from the same tag as the given elementId', () => {
  const html = '<div data-legacy-id="REC-1" id="proof-node">text</div>';
  assert.equal(findLegacyId(html, 'proof-node'), 'REC-1');
  assert.equal(findLegacyId(html, null), null);
});

test('IDENTITY-DISCOVER: findTitleAlias reads an informal legacy alias near the element', () => {
  const html = '<div class="fit" id="FIT-X"><span title="legacy alias: FIT-01">fit-x</span></div>';
  assert.equal(findTitleAlias(html, 'FIT-X'), 'FIT-01');
  assert.equal(findTitleAlias(html, 'missing'), null);
});

test('IDENTITY-DISCOVER: classifyCandidate — aligned when legacy id exists and current id matches', () => {
  const c = classifyCandidate({ contentNodeKey: 'proof-x', elementId: 'proof-x', legacyId: 'REC-1', titleAlias: null });
  assert.equal(c.status, 'aligned');
  assert.equal(c.canonicalElementId, 'REC-1');
});

test('IDENTITY-DISCOVER: classifyCandidate — needs_review when legacy id exists but current id diverges', () => {
  const c = classifyCandidate({ contentNodeKey: 'header', elementId: 'page-root', legacyId: 'DOSSIER-ROOT', titleAlias: null });
  assert.equal(c.status, 'needs_review');
  assert.match(c.note, /does not match/);
});

test('IDENTITY-DISCOVER: classifyCandidate — needs_review when only an informal title alias exists', () => {
  const c = classifyCandidate({ contentNodeKey: 'fit-x', elementId: 'FIT-X', legacyId: null, titleAlias: 'FIT-01' });
  assert.equal(c.status, 'needs_review');
  assert.equal(c.canonicalSource, 'html.title-alias');
});

test('IDENTITY-DISCOVER: classifyCandidate — unresolved when nothing is found', () => {
  const c = classifyCandidate({ contentNodeKey: 'footer', elementId: null, legacyId: null, titleAlias: null });
  assert.equal(c.status, 'unresolved');
  assert.equal(c.canonicalElementId, null);
});

// ── 2. build-string-identity-index ──────────────────────────────────────────

test('IDENTITY-INDEX: collectIdentityRecords skips keys with no identity block', () => {
  const sourceFiles = [{
    file: 'x.json',
    data: {
      _meta: {},
      'pages.x.a.title': { strings: { en: {} }, identity: { canonicalElementId: 'A', canonicalSource: 'html.data-legacy-id', currentElementId: 'a', contentNodeKey: 'a', fieldKey: 'title', status: 'aligned' } },
      'pages.x.b.title': { strings: { en: {} } },
    },
  }];
  const records = collectIdentityRecords(sourceFiles);
  assert.equal(records.length, 1);
  assert.equal(records[0].key, 'pages.x.a.title');
});

test('IDENTITY-INDEX: buildIndexes produces pointer arrays, not duplicated records', () => {
  const records = [
    { key: 'pages.x.a.title', canonicalElementId: 'A', contentNodeKey: 'a', fieldKey: 'title', status: 'aligned' },
    { key: 'pages.x.a.body', canonicalElementId: 'A', contentNodeKey: 'a', fieldKey: 'body', status: 'aligned' },
  ];
  const idx = buildIndexes(records);
  assert.deepEqual(idx.byCanonicalElementId.A, ['pages.x.a.title', 'pages.x.a.body']);
  assert.deepEqual(idx.byContentNodeKey.a, ['pages.x.a.title', 'pages.x.a.body']);
  // byStringId is the one thin cross-reference object, never the full record
  assert.deepEqual(Object.keys(idx.byStringId['pages.x.a.title']).sort(), ['canonicalElementId', 'contentNodeKey', 'status']);
});

test('IDENTITY-INDEX: buildIndexes does not create a canonical index entry when canonicalElementId is absent', () => {
  const records = [{ key: 'pages.x.a.title', canonicalElementId: null, contentNodeKey: 'a', fieldKey: 'title', status: 'unresolved' }];
  const idx = buildIndexes(records);
  assert.deepEqual(idx.byCanonicalElementId, {});
  assert.deepEqual(idx.byStatus.unresolved, ['pages.x.a.title']);
});

test('IDENTITY-INDEX: collectIdentityRecords captures per-language text for the report, not the index', () => {
  const sourceFiles = [{
    file: 'x.json',
    data: {
      _meta: {},
      'pages.x.a.title': {
        strings: { en: { text: 'Hello' }, zh: { text: '你好' } },
        identity: { canonicalElementId: 'A', canonicalSource: 'html.data-legacy-id', currentElementId: 'a', contentNodeKey: 'a', fieldKey: 'title', status: 'aligned' },
      },
    },
  }];
  const records = collectIdentityRecords(sourceFiles);
  assert.deepEqual(records[0].texts, { en: 'Hello', zh: '你好' });
  // buildIndexes must never carry texts through into the pointer index
  const idx = buildIndexes(records);
  assert.equal('texts' in idx.byStringId['pages.x.a.title'], false);
});

// PR #97 (dossier hardening) — renderMarkdownReport gained sections; existing
// callers that omit `meta` (4th arg) must still work.
test('IDENTITY-REPORT: renderMarkdownReport works without a meta argument', () => {
  const records = [{ key: 'pages.x.a.title', canonicalElementId: 'A', canonicalSource: 'html.data-legacy-id', currentElementId: 'a', contentNodeKey: 'a', fieldKey: 'title', status: 'aligned', languages: ['en'], texts: { en: 'Hello' } }];
  const md = renderMarkdownReport('x', records, buildIndexes(records));
  assert.match(md, /## Page summary/);
  assert.match(md, /## Screenshot refs/);
  assert.match(md, /None recorded\./);
});

test('IDENTITY-REPORT: Known limitations lists every non-aligned content node once, not per field', () => {
  const records = [
    { key: 'pages.x.a.title', canonicalElementId: null, canonicalSource: 'none', currentElementId: null, contentNodeKey: 'a', fieldKey: 'title', status: 'unresolved', note: 'no legacy id found', languages: ['en'], texts: { en: 'Hi' } },
    { key: 'pages.x.a.body', canonicalElementId: null, canonicalSource: 'none', currentElementId: null, contentNodeKey: 'a', fieldKey: 'body', status: 'unresolved', note: 'no legacy id found', languages: ['en'], texts: { en: 'Body' } },
  ];
  const md = renderMarkdownReport('x', records, buildIndexes(records));
  // Appears twice by design: once in the aggregated "Known limitations"
  // section, once in the per-node detail section below it — never a third
  // time, which is what a per-field (rather than per-node) bug would produce
  // for this fixture's two fields sharing one content node.
  const occurrences = (md.match(/no legacy id found/g) || []).length;
  assert.equal(occurrences, 2, 'the limitation note should appear once in Known limitations + once in the per-node detail, not once per field');
});

test('IDENTITY-REPORT: side-by-side language table renders real text per field', () => {
  const records = [{ key: 'pages.x.a.title', canonicalElementId: 'A', canonicalSource: 'html.data-legacy-id', currentElementId: 'a', contentNodeKey: 'a', fieldKey: 'title', status: 'aligned', languages: ['en', 'zh'], texts: { en: 'Hello', zh: '你好' } }];
  const md = renderMarkdownReport('x', records, buildIndexes(records));
  assert.match(md, /\| Field \| en \| zh \|/);
  assert.match(md, /\| title \| Hello \| 你好 \|/);
});

test('IDENTITY-REPORT: screenshot refs render when meta.screenshotRefs is passed', () => {
  const records = [{ key: 'pages.x.a.title', canonicalElementId: 'A', canonicalSource: 'html.data-legacy-id', currentElementId: 'a', contentNodeKey: 'a', fieldKey: 'title', status: 'aligned', languages: ['en'], texts: { en: 'Hi' } }];
  const md = renderMarkdownReport('x', records, buildIndexes(records), { screenshotRefs: ['docs/screenshots/x-en.png'] });
  assert.match(md, /docs\/screenshots\/x-en\.png/);
});

// ── 3. check-string-identity ────────────────────────────────────────────────

test('IDENTITY-CHECK: checkIndexKeysResolve flags an index key with no real source key', () => {
  const index = { byStringId: { 'pages.x.a.title': {}, 'pages.x.ghost.title': {} } };
  const issues = checkIndexKeysResolve(index, { 'x.json': ['pages.x.a.title'] });
  assert.equal(issues.length, 1);
  assert.match(issues[0].message, /ghost/);
});

test('IDENTITY-CHECK: checkCanonicalConflicts flags one canonical ID claimed by two content nodes', () => {
  const records = [
    { canonicalElementId: 'A', contentNodeKey: 'node-1' },
    { canonicalElementId: 'A', contentNodeKey: 'node-2' },
  ];
  const issues = checkCanonicalConflicts(records);
  assert.equal(issues.length, 1);
  assert.match(issues[0].message, /node-1.*node-2|node-2.*node-1/);
});

test('IDENTITY-CHECK: checkCanonicalConflicts does not flag one canonical ID shared within one content node', () => {
  const records = [
    { canonicalElementId: 'A', contentNodeKey: 'node-1' },
    { canonicalElementId: 'A', contentNodeKey: 'node-1' },
  ];
  assert.deepEqual(checkCanonicalConflicts(records), []);
});

test('IDENTITY-CHECK: checkCoverageGaps flags partial coverage, not zero or full coverage', () => {
  const partial = [{ file: 'p.json', data: { _meta: {}, a: { identity: {} }, b: {} } }];
  const zero = [{ file: 'z.json', data: { _meta: {}, a: {}, b: {} } }];
  const full = [{ file: 'f.json', data: { _meta: {}, a: { identity: {} }, b: { identity: {} } } }];
  assert.equal(checkCoverageGaps(partial).length, 1);
  assert.equal(checkCoverageGaps(zero).length, 0);
  assert.equal(checkCoverageGaps(full).length, 0);
});

test('IDENTITY-CHECK: checkElementIdsStillReal flags a currentElementId no longer present in the HTML', () => {
  const records = [{ key: 'pages.demo.a.title', currentElementId: 'gone-now' }];
  const issues = checkElementIdsStillReal(records, { demo: '<div>no matching id here</div>' });
  assert.equal(issues.length, 1);
  assert.match(issues[0].message, /gone-now/);
});

test('IDENTITY-CHECK: checkElementIdsStillReal passes when the id is still present', () => {
  const records = [{ key: 'pages.demo.a.title', currentElementId: 'still-here' }];
  const issues = checkElementIdsStillReal(records, { demo: '<div id="still-here">ok</div>' });
  assert.deepEqual(issues, []);
});

// ── 4. Integration ───────────────────────────────────────────────────────────

test('IDENTITY integration: the real pilot page (victor-methodology-presentation) has zero check-string-identity issues', () => {
  const out = execFileSync('node', ['lib/check-string-identity.js', '--json'], { cwd: ROOT, encoding: 'utf8' });
  const report = JSON.parse(out);
  assert.equal(report.skipped, false);
  assert.deepEqual(report.issues, []);
});

test('IDENTITY integration: existing strings-check.js and strings-compile.js remain unaffected by identity blocks', () => {
  // Regression guard for the core "extends, does not fork" requirement:
  // the compiled EN bundle for an identity-carrying key must contain only
  // { text }, never leak the identity object into runtime output.
  const compiled = JSON.parse(require('fs').readFileSync(path.join(ROOT, 'data/strings/compiled/strings.en.json'), 'utf8'));
  const key = 'pages.victor-methodology-presentation.proof-organization-knowledge-map.title';
  assert.deepEqual(Object.keys(compiled[key]).sort(), ['text']);
});
