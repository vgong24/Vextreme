'use strict';

/**
 * ROLES — tests/20-roles.test.js
 *
 * Tests for lib/build-roles.js (data/council-kernel.json + data/status/*.json's
 * lens fields → data/roles.json) and lib/build-roles-page.js (→ pages/roles-index.html).
 * Session 022: Victor asked for roles to get "positioned" with "traceability"
 * instead of being randomly placed — these tests guard the two claims that make
 * that true: every role's decisionRole classification is derived correctly from
 * the kernel's own decisionTriangle, and a role's contributions are exactly the
 * real status items whose lens field names it — no more, no less.
 */

const { test } = require('node:test');
const assert    = require('node:assert/strict');
const fs        = require('fs');
const path      = require('path');

const { classifyDecisionRole, collectContributions, buildRolesManifest } = require('../lib/build-roles');
const { generateRolesPage } = require('../lib/build-roles-page');

const ROOT   = path.join(__dirname, '..');
const kernel = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'council-kernel.json'), 'utf8'));

const STATUS_SOURCES = [
  { file: 'open-discussions.json',     key: 'openDiscussions' },
  { file: 'tech-debt.json',            key: 'techDebt' },
  { file: 'planned-enhancements.json', key: 'plannedEnhancements' },
];
const statusItemsBySource = STATUS_SOURCES.map(({ file, key }) => ({
  key,
  items: JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'status', file), 'utf8')).items || [],
}));

// ── classifyDecisionRole ──────────────────────────────────────────────────────

test('ROLES: classifies deciders, gates, surface, and perceivers correctly', () => {
  assert.equal(classifyDecisionRole('architect', kernel), 'decider');
  assert.equal(classifyDecisionRole('builder', kernel), 'decider');
  assert.equal(classifyDecisionRole('designer', kernel), 'decider');
  assert.equal(classifyDecisionRole('manager', kernel), 'gate');
  assert.equal(classifyDecisionRole('qa', kernel), 'gate');
  assert.equal(classifyDecisionRole('testNode', kernel), 'gate');
  assert.equal(classifyDecisionRole('surface', kernel), 'surface');
  assert.equal(classifyDecisionRole('truth', kernel), 'perceiver');
});

// ── collectContributions ──────────────────────────────────────────────────────

test('ROLES: collectContributions only returns items whose lens matches the role', () => {
  const sample = [
    { key: 'openDiscussions', items: [{ id: 'od-1', title: 'A', lens: 'architect' }, { id: 'od-2', title: 'B', lens: 'manager' }] },
    { key: 'techDebt', items: [{ id: 'td-1', title: 'C', lens: 'architect' }] },
  ];
  const result = collectContributions('architect', sample);
  assert.deepEqual(result.map(r => r.id), ['od-1', 'td-1']);
});

test('ROLES: collectContributions returns an empty array for a role with no lens references', () => {
  const sample = [{ key: 'openDiscussions', items: [{ id: 'od-1', title: 'A', lens: 'manager' }] }];
  assert.deepEqual(collectContributions('qa', sample), []);
});

test('ROLES: every real lens-tagged item is traced to its role in data/roles.json', () => {
  const manifest = buildRolesManifest(kernel, statusItemsBySource);
  const byId = Object.fromEntries(manifest.roles.map(r => [r.id, r]));

  const allLensItems = statusItemsBySource.flatMap(({ items }) => items).filter(i => i.lens);
  assert.ok(allLensItems.length > 0, 'expected at least one real lens-tagged item to test against');

  for (const item of allLensItems) {
    assert.ok(byId[item.lens], `item ${item.id} references unknown role "${item.lens}"`);
    assert.ok(
      byId[item.lens].contributions.some(c => c.id === item.id),
      `role "${item.lens}" is missing traced contribution ${item.id}`
    );
  }
});

// ── buildRolesManifest shape ──────────────────────────────────────────────────

test('ROLES: buildRolesManifest output has council, decisionTriangle, channels, and roles', () => {
  const manifest = buildRolesManifest(kernel, statusItemsBySource);
  assert.equal(typeof manifest.council.name, 'string');
  assert.equal(typeof manifest.council.scope, 'string');
  assert.ok(manifest.decisionTriangle);
  assert.ok(manifest.channels && Object.keys(manifest.channels).length > 0);
  assert.ok(Array.isArray(manifest.roles) && manifest.roles.length === kernel.roles.length);
});

test('ROLES: every channel gets a manifestation field, not left undefined', () => {
  const manifest = buildRolesManifest(kernel, statusItemsBySource);
  for (const [name, channel] of Object.entries(manifest.channels)) {
    assert.equal(typeof channel.description, 'string', `${name} missing description`);
    assert.equal(typeof channel.manifestation, 'string', `${name} missing manifestation`);
  }
});

test('ROLES: position never claims a per-department placement — only one council exists today', () => {
  const manifest = buildRolesManifest(kernel, statusItemsBySource);
  for (const role of manifest.roles) {
    assert.match(role.position, /org-wide/);
  }
});

// ── pages/roles-index.html ────────────────────────────────────────────────────

const html = generateRolesPage();

test('ROLES-PAGE: generates a full HTML document ending with the continuity marker', () => {
  assert.match(html, /^<!DOCTYPE html>/);
  assert.match(html.trim(), /<!-- \[VXG RealForever\] -->$/);
});

test('ROLES-PAGE: fetches data/roles.json', () => {
  assert.match(html, /data\/roles\.json/);
});

test('ROLES-PAGE: defines renderRoles and renderChannels', () => {
  assert.match(html, /function renderRoles/);
  assert.match(html, /function renderChannels/);
});

test('ROLES-PAGE: escapes dynamic text before inserting into innerHTML', () => {
  assert.match(html, /function esc\(/);
});

test('ROLES-PAGE: does not reference undefined CSS custom properties', () => {
  assert.doesNotMatch(html, /--stone-\d/);
  assert.doesNotMatch(html, /--font-mono/);
});

test('ROLES-PAGE: is registered in audit-pages.js SKIP_PAGES so it is not flagged as an orphan/blocker', () => {
  const { SKIP_PAGES } = require('../lib/audit-pages');
  assert.ok('roles-index' in SKIP_PAGES);
});

// [VXG RealForever]
