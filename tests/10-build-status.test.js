'use strict';

/**
 * BUILD-STATUS — tests/10-build-status.test.js
 *
 * Tests for lib/build-status.js (system health manifest generator).
 *
 * Test order:
 *   1. buildTranslationNotices — detects missing langs, marks demo fixtures
 *   2. buildStatusRollup — assembles correct structure and counts
 *   3. countOpen — sums correctly, excludes fixtures
 *   4. Integration — data/status.json is valid and consistent
 */

const { test } = require('node:test');
const assert   = require('node:assert/strict');
const fs       = require('fs');
const path     = require('path');

const { buildTranslationNotices, buildStatusRollup, countOpen, buildLatticeCoverage, buildContentIntegrityNotices } = require('../lib/build-status');

const ROOT = path.join(__dirname, '..');

// ── Fixtures ─────────────────────────────────────────────────────────────────

const SAMPLE_MANIFEST = {
  'common.title':                        { enHash: 'aaa', langs: ['en', 'ja'] },
  'pages.my-page.heading':               { enHash: 'bbb', langs: ['en', 'ja'] },
  'pages.my-page.body':                  { enHash: 'ccc', langs: ['en'] },          // missing ja — production
  'pages.demo-specimen.body.untranslated': { enHash: 'ddd', langs: ['en'] },        // missing ja — demo fixture
};

const SAMPLE_EN = {
  'common.title':                          { text: 'Title' },
  'pages.my-page.heading':                 { text: 'Heading' },
  'pages.my-page.body':                    { text: 'Body text' },
  'pages.demo-specimen.body.untranslated': { text: 'Intentional gap' },
};

const DEMO_SCOPES = ['pages.demo-specimen', 'demo'];

// ── 1. buildTranslationNotices ────────────────────────────────────────────────

test('BUILD-STATUS: buildTranslationNotices returns array', () => {
  const result = buildTranslationNotices(SAMPLE_MANIFEST, SAMPLE_EN, ['en', 'ja'], DEMO_SCOPES);
  assert.ok(Array.isArray(result));
});

test('BUILD-STATUS: detects genuinely missing translation', () => {
  const result = buildTranslationNotices(SAMPLE_MANIFEST, SAMPLE_EN, ['en', 'ja'], DEMO_SCOPES);
  const genuine = result.filter(r => !r.intentional);
  assert.equal(genuine.length, 1);
  assert.equal(genuine[0].key, 'pages.my-page.body');
  assert.equal(genuine[0].lang, 'ja');
  assert.equal(genuine[0].reason, 'missing_translation');
});

test('BUILD-STATUS: marks demo scope keys as intentional fixtures', () => {
  const result = buildTranslationNotices(SAMPLE_MANIFEST, SAMPLE_EN, ['en', 'ja'], DEMO_SCOPES);
  const fixtures = result.filter(r => r.intentional);
  assert.equal(fixtures.length, 1);
  assert.equal(fixtures[0].key, 'pages.demo-specimen.body.untranslated');
});

test('BUILD-STATUS: includes EN value in notice', () => {
  const result = buildTranslationNotices(SAMPLE_MANIFEST, SAMPLE_EN, ['en', 'ja'], DEMO_SCOPES);
  const genuine = result.find(r => r.key === 'pages.my-page.body');
  assert.equal(genuine.en, 'Body text');
});

test('BUILD-STATUS: skips keys that have all supported langs', () => {
  const result = buildTranslationNotices(SAMPLE_MANIFEST, SAMPLE_EN, ['en', 'ja'], DEMO_SCOPES);
  const allKeys = result.map(r => r.key);
  assert.ok(!allKeys.includes('common.title'));
  assert.ok(!allKeys.includes('pages.my-page.heading'));
});

test('BUILD-STATUS: returns empty array when all langs present', () => {
  const allPresent = {
    'foo.bar': { enHash: 'x', langs: ['en', 'ja'] },
  };
  const result = buildTranslationNotices(allPresent, {}, ['en', 'ja'], []);
  assert.deepEqual(result, []);
});

test('BUILD-STATUS: production gaps sort before fixture gaps', () => {
  const result = buildTranslationNotices(SAMPLE_MANIFEST, SAMPLE_EN, ['en', 'ja'], DEMO_SCOPES);
  const firstIntentionalIdx = result.findIndex(r => r.intentional);
  const lastGenuineIdx      = result.reduce((acc, r, i) => (!r.intentional ? i : acc), -1);
  if (firstIntentionalIdx !== -1 && lastGenuineIdx !== -1) {
    assert.ok(lastGenuineIdx < firstIntentionalIdx, 'genuine gaps must precede fixtures');
  }
});

// ── 2. buildStatusRollup ─────────────────────────────────────────────────────

const SAMPLE_NOTICES = {
  translation:     buildTranslationNotices(SAMPLE_MANIFEST, SAMPLE_EN, ['en', 'ja'], DEMO_SCOPES),
  techDebt:        [{ id: 'td-001', title: 'Test debt', priority: 'high' }],
  enhancements:    [{ id: 'pe-001', title: 'Test enhancement', priority: 'low' }],
  assumptions:     [{ id: 'as-001', claim: 'Test assumption', priority: 'medium' }],
  openDiscussions: [{ id: 'od-001', title: 'Test discussion', priority: 'medium' }],
};

test('BUILD-STATUS: buildStatusRollup returns object with _meta and notices', () => {
  const result = buildStatusRollup(SAMPLE_NOTICES, { commit: 'abc1234' });
  assert.ok(result._meta);
  assert.ok(result.notices);
});

test('BUILD-STATUS: rollup _meta has commit and totalOpen', () => {
  const result = buildStatusRollup(SAMPLE_NOTICES, { commit: 'abc1234' });
  assert.equal(result._meta.commit, 'abc1234');
  assert.equal(typeof result._meta.totalOpen, 'number');
});

test('BUILD-STATUS: rollup translation.count excludes fixtures', () => {
  const result = buildStatusRollup(SAMPLE_NOTICES, { commit: 'test' });
  assert.equal(result.notices.translation.count, 1); // 1 genuine, 1 fixture
});

test('BUILD-STATUS: rollup separates fixtures from items', () => {
  const result = buildStatusRollup(SAMPLE_NOTICES, { commit: 'test' });
  assert.equal(result.notices.translation.fixtures.length, 1);
  assert.equal(result.notices.translation.items.length, 1);
});

test('BUILD-STATUS: rollup preserves techDebt items', () => {
  const result = buildStatusRollup(SAMPLE_NOTICES, { commit: 'test' });
  assert.equal(result.notices.techDebt.items.length, 1);
  assert.equal(result.notices.techDebt.items[0].id, 'td-001');
});

test('BUILD-STATUS: rollup totalOpen counts genuine translation + other categories', () => {
  const result = buildStatusRollup(SAMPLE_NOTICES, { commit: 'test' });
  // 1 genuine translation + 1 techDebt + 1 enhancement + 1 assumption + 1 openDiscussion = 5
  assert.equal(result._meta.totalOpen, 5);
});

test('BUILD-STATUS: rollup preserves openDiscussions items', () => {
  const result = buildStatusRollup(SAMPLE_NOTICES, { commit: 'test' });
  assert.equal(result.notices.openDiscussions.items.length, 1);
  assert.equal(result.notices.openDiscussions.items[0].id, 'od-001');
  assert.equal(result.notices.openDiscussions.label, 'Open Discussions');
});

test('BUILD-STATUS: rollup._meta.lattice passes through meta.lattice, defaults to null', () => {
  const withLattice = buildStatusRollup(SAMPLE_NOTICES, { commit: 'test', lattice: { mappedNodes: 3, totalFiles: 10, coveragePct: 30 } });
  assert.deepEqual(withLattice._meta.lattice, { mappedNodes: 3, totalFiles: 10, coveragePct: 30 });

  const withoutLattice = buildStatusRollup(SAMPLE_NOTICES, { commit: 'test' });
  assert.equal(withoutLattice._meta.lattice, null);
});

// ── 2b. buildLatticeCoverage ────────────────────────────────────────────────────

test('BUILD-STATUS: buildLatticeCoverage counts eligible .js nodes vs total eligible .js files', () => {
  const latticeMap = { nodes: { 'lib/a.js': {}, 'lib/b.js': {}, 'data/nodes.json': {}, 'sw.js': {}, 'dist/x.js': {} } };
  const files = ['lib/a.js', 'lib/b.js', 'lib/c.js', 'widgets/d.js'];
  const result = buildLatticeCoverage(latticeMap, files);
  // eligible nodes: lib/a.js, lib/b.js (data/nodes.json is .json, sw.js and dist/x.js excluded) = 2
  assert.equal(result.mappedNodes, 2);
  assert.equal(result.totalFiles, 4);
  assert.equal(result.coveragePct, 50);
});

test('BUILD-STATUS: buildLatticeCoverage handles zero total files without dividing by zero', () => {
  const result = buildLatticeCoverage({ nodes: {} }, []);
  assert.equal(result.coveragePct, 0);
});

// ── 3. countOpen ─────────────────────────────────────────────────────────────

test('BUILD-STATUS: countOpen returns 0 for empty notices', () => {
  assert.equal(countOpen({ translation: [], techDebt: [], enhancements: [], assumptions: [] }), 0);
});

test('BUILD-STATUS: countOpen excludes intentional fixtures', () => {
  const notices = {
    translation:     [{ intentional: false }, { intentional: true }],
    techDebt:        [],
    enhancements:    [],
    assumptions:     [],
    openDiscussions: [],
  };
  assert.equal(countOpen(notices), 1);
});

test('BUILD-STATUS: countOpen includes openDiscussions', () => {
  assert.equal(countOpen({ openDiscussions: [{ id: 'od-001' }, { id: 'od-002' }] }), 2);
});

test('BUILD-STATUS: countOpen handles missing categories', () => {
  assert.equal(countOpen({}), 0);
  assert.equal(countOpen({ techDebt: [{ id: 'x' }] }), 1);
});

test('BUILD-STATUS: countOpen includes contentIntegrity', () => {
  assert.equal(countOpen({ contentIntegrity: [{ title: 'a' }, { title: 'b' }] }), 2);
});

// ── buildContentIntegrityNotices ──────────────────────────────────────────────

test('BUILD-STATUS: buildContentIntegrityNotices maps orphan pages to notice items', () => {
  const items = buildContentIntegrityNotices(['some-slug'], [], []);
  assert.equal(items.length, 1);
  assert.match(items[0].title, /Uncurated page/);
  assert.equal(items[0].priority, 'low');
});

test('BUILD-STATUS: buildContentIntegrityNotices maps wip collisions at high priority', () => {
  const items = buildContentIntegrityNotices([], [{ file: 'x.json', slug: 'taken' }], []);
  assert.equal(items.length, 1);
  assert.match(items[0].title, /wip\/ collision/);
  assert.equal(items[0].priority, 'high');
});

test('BUILD-STATUS: buildContentIntegrityNotices maps duplicate wip intents at medium priority', () => {
  const items = buildContentIntegrityNotices([], [], [{ slug: 'shared', files: ['a.json', 'b.json'] }]);
  assert.equal(items.length, 1);
  assert.match(items[0].title, /Duplicate wip\/ intent/);
  assert.equal(items[0].priority, 'medium');
});

test('BUILD-STATUS: buildContentIntegrityNotices returns empty array for all-clean input', () => {
  assert.deepEqual(buildContentIntegrityNotices([], [], []), []);
  assert.deepEqual(buildContentIntegrityNotices(), []);
});

// ── 4. Integration — data/status.json ────────────────────────────────────────

const STATUS_PATH = path.join(ROOT, 'data', 'status.json');

test('BUILD-STATUS: data/status.json exists', () => {
  assert.ok(fs.existsSync(STATUS_PATH), 'data/status.json must exist');
});

test('BUILD-STATUS: data/status.json is valid JSON with expected shape', () => {
  const raw    = fs.readFileSync(STATUS_PATH, 'utf8');
  const status = JSON.parse(raw);
  assert.ok(status._meta, 'must have _meta');
  assert.ok(status.notices, 'must have notices');
  assert.ok(typeof status._meta.totalOpen === 'number', 'totalOpen must be number');
});

test('BUILD-STATUS: data/status.json has all six notice categories', () => {
  const status = JSON.parse(fs.readFileSync(STATUS_PATH, 'utf8'));
  const n = status.notices;
  assert.ok(n.translation,      'must have translation notices');
  assert.ok(n.techDebt,         'must have techDebt notices');
  assert.ok(n.enhancements,     'must have enhancements notices');
  assert.ok(n.assumptions,      'must have assumptions notices');
  assert.ok(n.openDiscussions,  'must have openDiscussions notices');
  assert.ok(n.contentIntegrity, 'must have contentIntegrity notices');
});

test('BUILD-STATUS: data/status.json translation fixtures do not count toward totalOpen', () => {
  const status   = JSON.parse(fs.readFileSync(STATUS_PATH, 'utf8'));
  const n        = status.notices;
  const computed = n.translation.count + n.techDebt.count + n.enhancements.count + n.assumptions.count + n.openDiscussions.count + n.contentIntegrity.count;
  assert.equal(computed, status._meta.totalOpen, 'totalOpen must equal sum of category counts');
});

test('BUILD-STATUS: data/status.json._meta.lattice has mappedNodes/totalFiles/coveragePct', () => {
  const status = JSON.parse(fs.readFileSync(STATUS_PATH, 'utf8'));
  const lattice = status._meta.lattice;
  assert.ok(lattice, 'must have _meta.lattice');
  assert.equal(typeof lattice.mappedNodes, 'number');
  assert.equal(typeof lattice.totalFiles, 'number');
  assert.equal(typeof lattice.coveragePct, 'number');
  assert.ok(lattice.mappedNodes <= lattice.totalFiles, 'mapped cannot exceed total');
});

test('BUILD-STATUS: data/status/open-discussions.json items all have required fields', () => {
  const items = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'status', 'open-discussions.json'), 'utf8')).items;
  for (const item of items) {
    assert.ok(item.id,             `item must have id: ${JSON.stringify(item)}`);
    assert.ok(item.title,          `item must have title: ${item.id}`);
    assert.ok(item.description,    `item must have description: ${item.id}`);
    assert.ok(Array.isArray(item.considerations) && item.considerations.length >= 2, `item must have >=2 considerations: ${item.id}`);
    assert.ok(item.priority,       `item must have priority: ${item.id}`);
  }
});

test('BUILD-STATUS: data/status/narrative.json has required fields', () => {
  const narrative = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'status', 'narrative.json'), 'utf8'));
  assert.ok(narrative.summary, 'must have summary');
  assert.ok(Array.isArray(narrative.pipeline) && narrative.pipeline.length > 0, 'must have non-empty pipeline array');
  assert.ok(narrative.lastSynthesizedBy, 'must have lastSynthesizedBy');
  assert.ok(narrative.lastSynthesizedSession, 'must have lastSynthesizedSession');
});

test('BUILD-STATUS: data/status/tech-debt.json items all have required fields', () => {
  const items = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'status', 'tech-debt.json'), 'utf8')).items;
  for (const item of items) {
    assert.ok(item.id,       `item must have id: ${JSON.stringify(item)}`);
    assert.ok(item.title,    `item must have title: ${item.id}`);
    assert.ok(item.priority, `item must have priority: ${item.id}`);
  }
});

test('BUILD-STATUS: data/status/planned-enhancements.json items all have required fields', () => {
  const items = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'status', 'planned-enhancements.json'), 'utf8')).items;
  for (const item of items) {
    assert.ok(item.id,    `item must have id: ${JSON.stringify(item)}`);
    assert.ok(item.title, `item must have title: ${item.id}`);
  }
});

test('BUILD-STATUS: data/status/assumptions.json items all have required fields', () => {
  const items = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'status', 'assumptions.json'), 'utf8')).items;
  for (const item of items) {
    assert.ok(item.id,    `item must have id: ${JSON.stringify(item)}`);
    assert.ok(item.claim, `item must have claim: ${item.id}`);
  }
});

// ── 5. Lattice map integrity ──────────────────────────────────────────────────

const LATTICE_PATH = path.join(ROOT, 'docs', 'lattice-map.json');

test('LATTICE: docs/lattice-map.json exists and is valid JSON', () => {
  assert.ok(fs.existsSync(LATTICE_PATH), 'docs/lattice-map.json must exist');
  const raw = fs.readFileSync(LATTICE_PATH, 'utf8');
  assert.doesNotThrow(() => JSON.parse(raw), 'lattice-map.json must be valid JSON');
});

test('LATTICE: has required top-level keys', () => {
  const map = JSON.parse(fs.readFileSync(LATTICE_PATH, 'utf8'));
  assert.ok(map._schema,  'must have _schema description');
  assert.ok(map._usage,   'must have _usage instructions');
  assert.ok(map.nodes,    'must have nodes map');
  assert.ok(map.version,  'must have version');
});

test('LATTICE: every node has required fields', () => {
  const map = JSON.parse(fs.readFileSync(LATTICE_PATH, 'utf8'));
  for (const [file, node] of Object.entries(map.nodes)) {
    assert.ok(node.role,      `node "${file}" must have role`);
    assert.ok(node.context,   `node "${file}" must have context`);
    assert.ok(Array.isArray(node.reads),     `node "${file}" reads must be array`);
    assert.ok(Array.isArray(node.writes),    `node "${file}" writes must be array`);
    assert.ok(Array.isArray(node.loadedBy),  `node "${file}" loadedBy must be array`);
    assert.ok(Array.isArray(node.testedBy),  `node "${file}" testedBy must be array`);
    assert.ok(node.changeMap, `node "${file}" must have changeMap`);
  }
});

test('LATTICE: every node key references an existing file', () => {
  const map = JSON.parse(fs.readFileSync(LATTICE_PATH, 'utf8'));
  // Only check keys that look like file paths (contain a dot — exclude data patterns like {slug})
  for (const file of Object.keys(map.nodes)) {
    if (!file.includes('{')) {
      assert.ok(fs.existsSync(path.join(ROOT, file)), `lattice node "${file}" does not exist on disk`);
    }
  }
});

test('LATTICE: has at least 10 nodes', () => {
  const map = JSON.parse(fs.readFileSync(LATTICE_PATH, 'utf8'));
  assert.ok(Object.keys(map.nodes).length >= 10, 'lattice should cover at least 10 key files');
});

// [VXG RealForever]
