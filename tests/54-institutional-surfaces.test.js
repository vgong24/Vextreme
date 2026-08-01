'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const registry = require('../config/institutional-surfaces.json');
const {
  SCHEMA_VERSION,
  validateRegistry,
  surfacesByState,
  run,
} = require('../lib/check-institutional-surfaces');
const {
  AUTO_DISCOVERY_EXCLUSIONS,
  autoDiscoveryExclusions,
  institutionalSurfaceExclusions,
  getRecordPageSlugs,
} = require('../lib/audit-pages');
const { discoverOrphanNodes } = require('../lib/auto-discover-nodes');

const ROOT = path.join(__dirname, '..');

function entry(overrides = {}) {
  return {
    state: 'reserved',
    kind: 'institutional',
    purpose: 'test-surface',
    archive: { indexed: false, arcMembership: false },
    runtime: { mode: 'standalone', godScript: false, shell: false },
    strings: { category: 'system', scope: 'institution', requiredLocales: ['en'], plannedLocales: ['ja'] },
    theme: { family: 'foundation', variants: ['foundation', 'foundation-light'] },
    evidence: { viewports: [320, 768, 1440], themes: ['foundation', 'foundation-light'] },
    origin: { sourcePr: 135 },
    ...overrides,
  };
}

function makeRoot() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'vxg-institutional-'));
  for (const dir of [
    'config', 'pages', 'data', 'dist',
    'data/strings/compiled/scopes/system', 'docs/screenshots',
  ]) fs.mkdirSync(path.join(root, dir), { recursive: true });
  fs.writeFileSync(path.join(root, 'data', 'nodes.json'), '[]\n');
  fs.writeFileSync(path.join(root, 'data', 'arcs-v2.json'), '{}\n');
  fs.writeFileSync(path.join(root, 'data', 'index.json'), '{}\n');
  return root;
}

function activeHtml() {
  return [
    '<!doctype html>',
    '<html data-vex-surface="institutional" data-vex-string-category="system" data-vex-string-scope="institution" data-vex-theme-family="foundation" data-theme="foundation">',
    '<body>',
    '<h1 data-i18n="institution.test">Test</h1>',
    '<img alt="Test image" data-i18n-alt="institution.test.alt">',
    '<button aria-label="Test action" data-i18n-aria="institution.test.aria">Test</button>',
    '</body>',
    '</html>',
    '',
  ].join('\n');
}

function writeActiveAcceptance(root, slug, surfaceEntry) {
  for (const locale of surfaceEntry.strings.requiredLocales) {
    const bundlePath = path.join(
      root, 'data', 'strings', 'compiled', 'scopes', surfaceEntry.strings.category,
      `${surfaceEntry.strings.scope}.${locale}.json`
    );
    fs.mkdirSync(path.dirname(bundlePath), { recursive: true });
    fs.writeFileSync(
      bundlePath,
      `${JSON.stringify({
        'institution.test': { text: `Test ${locale}` },
        'institution.test.alt': { text: `Test image ${locale}` },
        'institution.test.aria': { text: `Test action ${locale}` },
      }, null, 2)}\n`
    );
  }
  const validPng = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
    'base64'
  );
  for (const locale of surfaceEntry.strings.requiredLocales) {
    for (const theme of surfaceEntry.evidence.themes) {
      for (const viewport of surfaceEntry.evidence.viewports) {
        fs.writeFileSync(path.join(root, 'docs', 'screenshots', `${slug}-${locale}-${theme}-${viewport}.png`), validPng);
      }
    }
  }
}

test('INSTITUTIONAL-SURFACES: real reservations are valid and deterministic', () => {
  assert.deepEqual(validateRegistry(registry, ROOT), []);
  assert.deepEqual(surfacesByState(registry, 'reserved').map(surface => surface.slug), [
    'vex-support',
    'vextreme-home',
  ]);
  assert.deepEqual(Object.keys(institutionalSurfaceExclusions()), ['vex-support', 'vextreme-home']);
  assert.ok(AUTO_DISCOVERY_EXCLUSIONS['vex-support']);
  assert.ok(AUTO_DISCOVERY_EXCLUSIONS['vextreme-home']);
  assert.ok(!getRecordPageSlugs().includes('vex-support'));
});

test('INSTITUTIONAL-SURFACES: unsafe identity and permissive runtime fail closed', () => {
  const broken = {
    schemaVersion: SCHEMA_VERSION,
    surfaces: {
      home: entry({
        runtime: { mode: 'standalone', godScript: true, shell: false },
        archive: { indexed: true, arcMembership: false },
      }),
    },
  };
  const checks = new Set(validateRegistry(broken, makeRoot()).map(issue => issue.check));
  assert.ok(checks.has('slug'));
  assert.ok(checks.has('runtime-boundary'));
  assert.ok(checks.has('archive-boundary'));
});

test('INSTITUTIONAL-SURFACES: a reservation cannot silently acquire a page', () => {
  const root = makeRoot();
  fs.writeFileSync(path.join(root, 'pages', 'vex-test.html'), '<html></html>\n');
  const broken = { schemaVersion: SCHEMA_VERSION, surfaces: { 'vex-test': entry() } };
  assert.ok(validateRegistry(broken, root).some(issue => issue.check === 'reservation-stale'));
});

test('INSTITUTIONAL-SURFACES: a reservation owns node, arc, dist, and generated-index identity', () => {
  const root = makeRoot();
  fs.writeFileSync(path.join(root, 'dist', 'vextreme-vex-test.js'), '// collision\n');
  fs.writeFileSync(path.join(root, 'data', 'nodes.json'), '[{"slug":"vex-test"}]\n');
  fs.writeFileSync(path.join(root, 'data', 'arcs-v2.json'), '{"a":{"sections":[{"slugs":["vex-test"]}]}}\n');
  fs.writeFileSync(path.join(root, 'data', 'index.json'), '{"slugMap":{"vex-test":{}},"departmentMap":{}}\n');
  const broken = { schemaVersion: SCHEMA_VERSION, surfaces: { 'vex-test': entry() } };
  const checks = new Set(validateRegistry(broken, root).map(issue => issue.check));
  for (const expected of ['god-script-output', 'archive-index', 'arc-membership', 'generated-index']) {
    assert.ok(checks.has(expected), `expected ${expected}`);
  }
});

test('INSTITUTIONAL-SURFACES: generated map primitive and key leaks fail closed', () => {
  const root = makeRoot();
  const broken = { schemaVersion: SCHEMA_VERSION, surfaces: { 'vex-test': entry() } };

  fs.writeFileSync(path.join(root, 'data', 'index.json'), '{"arcMap":{"a":["vex-test"]}}\n');
  assert.ok(validateRegistry(broken, root).some(issue => issue.check === 'generated-index'));

  fs.writeFileSync(path.join(root, 'data', 'index.json'), '{"arcMap":{"vex-test":[]}}\n');
  assert.ok(validateRegistry(broken, root).some(issue => issue.check === 'generated-index'));
});

test('INSTITUTIONAL-SURFACES: real auto-discovery excludes registry identities without another slug list', () => {
  const active = { schemaVersion: SCHEMA_VERSION, surfaces: { 'vex-test': entry({ state: 'active' }) } };
  const exclusions = autoDiscoveryExclusions({}, active);
  const discovered = discoverOrphanNodes(
    ['vex-test'],
    [],
    exclusions,
    [],
    () => activeHtml(),
    { rd: { default: true } }
  );
  assert.deepEqual(discovered, []);
});

test('INSTITUTIONAL-SURFACES: malformed active entries report shape errors instead of throwing', () => {
  const malformed = {
    schemaVersion: SCHEMA_VERSION,
    surfaces: {
      'vex-test': { state: 'active', kind: 'institutional', purpose: 'test-surface' },
    },
  };
  const issues = validateRegistry(malformed, makeRoot());
  assert.ok(issues.some(issue => issue.check === 'missing-field'));
  assert.ok(issues.some(issue => issue.check === 'shape'));
});

test('INSTITUTIONAL-SURFACES: active page projections are checked together', () => {
  const root = makeRoot();
  fs.writeFileSync(path.join(root, 'pages', 'vex-test.html'), '<html><script src="../lib/shell.js"></script></html>\n');
  fs.writeFileSync(path.join(root, 'dist', 'vextreme-vex-test.js'), '// unexpected\n');
  fs.writeFileSync(path.join(root, 'data', 'nodes.json'), '[{"slug":"vex-test"}]\n');
  fs.writeFileSync(path.join(root, 'data', 'arcs-v2.json'), '{"a":{"sections":[{"slugs":["vex-test"]}]}}\n');
  const broken = { schemaVersion: SCHEMA_VERSION, surfaces: { 'vex-test': entry({ state: 'active' }) } };
  const checks = new Set(validateRegistry(broken, root).map(issue => issue.check));
  for (const expected of [
    'surface-marker', 'scope-marker', 'category-marker', 'theme-family-marker', 'theme-variant-marker',
    'runtime-boundary', 'i18n-bindings', 'evidence-matrix',
    'god-script-output', 'archive-index', 'arc-membership',
  ]) assert.ok(checks.has(expected), `expected ${expected}`);
});

test('INSTITUTIONAL-SURFACES: active requires every locale binding and declared evidence cell', () => {
  const root = makeRoot();
  fs.writeFileSync(path.join(root, 'pages', 'vex-test.html'), activeHtml());
  const activeEntry = entry({ state: 'active' });
  const active = { schemaVersion: SCHEMA_VERSION, surfaces: { 'vex-test': activeEntry } };
  const missingChecks = new Set(validateRegistry(active, root).map(issue => issue.check));
  assert.ok(missingChecks.has('required-locale-bundle'));
  assert.ok(missingChecks.has('evidence-matrix'));

  writeActiveAcceptance(root, 'vex-test', activeEntry);
  const bundlePath = path.join(root, 'data', 'strings', 'compiled', 'scopes', 'system', 'institution.en.json');
  fs.writeFileSync(bundlePath, '{}\n');
  assert.ok(validateRegistry(active, root).some(issue => issue.check === 'required-locale-key'));
});

test('INSTITUTIONAL-SURFACES: accessibility bindings and string category are activation contracts', () => {
  const root = makeRoot();
  fs.writeFileSync(path.join(root, 'pages', 'vex-test.html'), activeHtml());
  const activeEntry = entry({ state: 'active' });
  writeActiveAcceptance(root, 'vex-test', activeEntry);
  const bundlePath = path.join(root, 'data', 'strings', 'compiled', 'scopes', 'system', 'institution.en.json');
  fs.writeFileSync(bundlePath, `${JSON.stringify({ 'institution.test': { text: 'Test' } })}\n`);
  const messages = validateRegistry(
    { schemaVersion: SCHEMA_VERSION, surfaces: { 'vex-test': activeEntry } },
    root
  ).filter(issue => issue.check === 'required-locale-key').map(issue => issue.message);
  assert.ok(messages.some(message => message.includes('institution.test.alt')));
  assert.ok(messages.some(message => message.includes('institution.test.aria')));

  const badCategory = entry({ strings: { ...activeEntry.strings, category: 'unknown' } });
  assert.ok(validateRegistry(
    { schemaVersion: SCHEMA_VERSION, surfaces: { 'vex-category': badCategory } },
    makeRoot()
  ).some(issue => issue.check === 'string-category'));
});

test('INSTITUTIONAL-SURFACES: evidence requires every variant and a complete PNG structure', () => {
  const root = makeRoot();
  fs.writeFileSync(path.join(root, 'pages', 'vex-test.html'), activeHtml());
  const activeEntry = entry({ state: 'active' });
  writeActiveAcceptance(root, 'vex-test', activeEntry);
  const pseudoPng = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  fs.writeFileSync(
    path.join(root, 'docs', 'screenshots', 'vex-test-en-foundation-320.png'),
    pseudoPng
  );
  assert.ok(validateRegistry(
    { schemaVersion: SCHEMA_VERSION, surfaces: { 'vex-test': activeEntry } },
    root
  ).some(issue => issue.check === 'evidence-matrix'));

  const uncoveredTheme = entry({
    theme: { family: 'foundation', variants: ['foundation', 'foundation-light', 'foundation-high-contrast'] },
  });
  assert.ok(validateRegistry(
    { schemaVersion: SCHEMA_VERSION, surfaces: { 'vex-theme': uncoveredTheme } },
    makeRoot()
  ).some(issue => issue.check === 'evidence-theme-coverage'));
});

test('INSTITUTIONAL-SURFACES: a bounded standalone active fixture passes', () => {
  const root = makeRoot();
  fs.writeFileSync(path.join(root, 'pages', 'vex-test.html'), activeHtml());
  const activeEntry = entry({ state: 'active' });
  writeActiveAcceptance(root, 'vex-test', activeEntry);
  const active = { schemaVersion: SCHEMA_VERSION, surfaces: { 'vex-test': activeEntry } };
  assert.deepEqual(validateRegistry(active, root), []);
});

test('INSTITUTIONAL-SURFACES integration: committed registry and current main projections agree', () => {
  assert.deepEqual(run(ROOT).issues, []);
});

// [VXG RealForever]
