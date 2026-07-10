'use strict';

/**
 * VEXTREME-FAB-AUTOLOAD — tests/41-vextreme-fab-autoload.test.js
 *
 * Tests for lib/vextreme.js's FAB auto-loader (loadFabWidgets, and
 * resolveConfig's new `fab` field) — the fix making shell.js the one
 * script tag a page needs for both nav and the current spiral-FAB set,
 * instead of each page hand-authoring its own vex-fab.js/fab-lang.js/
 * fab-theme.js/fab-map.js <script> tags.
 *
 * Same regex-extraction technique tests/08 and tests/39 already use for
 * this file's own IIFE-only, no-module.exports code: pull the real
 * function source out and evaluate it directly with mocked dependencies,
 * rather than simulating a full DOM/browser environment.
 */

const { test } = require('node:test');
const assert    = require('node:assert/strict');
const fs        = require('fs');
const path      = require('path');

const ROOT  = path.join(__dirname, '..');
const VX_IN = path.join(ROOT, 'lib', 'vextreme.js');

function readSource() {
  return fs.readFileSync(VX_IN, 'utf8');
}

// loadFabWidgets — extracted with a fake loadScript(src) that records call
// order and resolves immediately, so the real sequencing logic runs for
// real rather than being inferred from source text position.
function loadLoadFabWidgets() {
  const source = readSource();
  const match = source.match(/function loadFabWidgets\(cfg\) \{[\s\S]*?\n  \}/);
  assert.ok(match, 'loadFabWidgets() must exist in lib/vextreme.js');
  const fn = new Function('loadScript', 'log', match[0] + '\nreturn loadFabWidgets;');
  return fn;
}

function fakeLoadScript(calls) {
  return function (src) {
    calls.push(src);
    return Promise.resolve();
  };
}

test('FAB-AUTOLOAD: loadFabWidgets does nothing when cfg.fab is false', async () => {
  const calls = [];
  const loadFabWidgets = loadLoadFabWidgets()(fakeLoadScript(calls), function () {});
  await loadFabWidgets({ fab: false, baseUrl: 'https://cdn.example', cacheVer: '?v=1' });
  assert.deepEqual(calls, []);
});

test('FAB-AUTOLOAD: loadFabWidgets loads vex-fab.js, fab-lang.js, fab-theme.js, fab-map.js in that exact order', async () => {
  const calls = [];
  const loadFabWidgets = loadLoadFabWidgets()(fakeLoadScript(calls), function () {});
  await loadFabWidgets({ fab: true, baseUrl: 'https://cdn.example', cacheVer: '?v=1' });
  assert.deepEqual(calls, [
    'https://cdn.example/widgets/vex-fab.js?v=1',
    'https://cdn.example/widgets/fab-lang.js?v=1',
    'https://cdn.example/widgets/fab-theme.js?v=1',
    'https://cdn.example/widgets/fab-map.js?v=1',
  ]);
});

test('FAB-AUTOLOAD: fabWidgets.theme:false skips fab-theme.js but keeps vex-fab.js/fab-lang.js/fab-map.js', async () => {
  const calls = [];
  const loadFabWidgets = loadLoadFabWidgets()(fakeLoadScript(calls), function () {});
  await loadFabWidgets({ fab: true, fabWidgets: { theme: false }, baseUrl: 'https://cdn.example', cacheVer: '' });
  assert.deepEqual(calls, [
    'https://cdn.example/widgets/vex-fab.js',
    'https://cdn.example/widgets/fab-lang.js',
    'https://cdn.example/widgets/fab-map.js',
  ]);
});

test('FAB-AUTOLOAD: fabWidgets can disable multiple widgets at once, always keeping vex-fab.js', async () => {
  const calls = [];
  const loadFabWidgets = loadLoadFabWidgets()(fakeLoadScript(calls), function () {});
  await loadFabWidgets({ fab: true, fabWidgets: { lang: false, map: false }, baseUrl: 'https://cdn.example', cacheVer: '' });
  assert.deepEqual(calls, [
    'https://cdn.example/widgets/vex-fab.js',
    'https://cdn.example/widgets/fab-theme.js',
  ]);
});

test('FAB-AUTOLOAD: an empty fabWidgets object loads everything, same as omitting it', async () => {
  const calls = [];
  const loadFabWidgets = loadLoadFabWidgets()(fakeLoadScript(calls), function () {});
  await loadFabWidgets({ fab: true, fabWidgets: {}, baseUrl: 'https://cdn.example', cacheVer: '' });
  assert.equal(calls.length, 4);
});

test('FAB-AUTOLOAD: loadFabWidgets waits for each script before requesting the next (real sequencing, not fire-and-forget)', async () => {
  const order = [];
  let resolveFirst;
  const slowThenFast = function (src) {
    if (src.indexOf('vex-fab.js') !== -1) {
      return new Promise((resolve) => { resolveFirst = () => { order.push('vex-fab resolved'); resolve(); }; });
    }
    order.push(src.indexOf('fab-lang.js') !== -1 ? 'fab-lang requested' : 'other requested');
    return Promise.resolve();
  };
  const loadFabWidgets = loadLoadFabWidgets()(slowThenFast, function () {});
  const donePromise = loadFabWidgets({ fab: true, baseUrl: 'https://cdn.example', cacheVer: '' });

  // fab-lang.js must not have been requested yet — vex-fab.js's own promise hasn't resolved
  await Promise.resolve();
  assert.deepEqual(order, []);

  resolveFirst();
  await donePromise;
  // fab-lang.js was requested only after vex-fab.js resolved, confirming real
  // sequencing rather than firing all four requests immediately in parallel
  assert.deepEqual(order, ['vex-fab resolved', 'fab-lang requested', 'other requested', 'other requested']);
});

test('FAB-AUTOLOAD: loadFabWidgets never references fab-demo.js or fab-analysis.js', () => {
  const source = readSource();
  const match = source.match(/function loadFabWidgets\(cfg\) \{[\s\S]*?\n  \}/);
  assert.ok(match);
  assert.equal(match[0].includes('fab-demo.js'), false, 'fab-demo.js is deprecated per fab-map.js\'s own header, must not be auto-loaded');
  assert.equal(match[0].includes('fab-analysis.js'), false, 'fab-analysis.js needs real per-page data, must stay opt-in via the God-Script build system');
});

// resolveConfig — extracted with mocked detectEnv/detectSlug so the `fab`
// field's real gating logic runs, not just text-matched.
function loadResolveConfig() {
  const source = readSource();
  const navEnvsMatch     = source.match(/var NAV_ENVS = (\[[^\]]*\]);/);
  const defaultBaseMatch = source.match(/var DEFAULT_BASE\s*=\s*'[^']*';/);
  const defaultCacheMatch = source.match(/var DEFAULT_CACHE\s*=\s*'[^']*';/);
  const resolveConfigMatch = source.match(/function resolveConfig\(raw\) \{[\s\S]*?\n  \}/);
  assert.ok(navEnvsMatch, 'NAV_ENVS must exist in lib/vextreme.js');
  assert.ok(defaultBaseMatch, 'DEFAULT_BASE must exist in lib/vextreme.js');
  assert.ok(defaultCacheMatch, 'DEFAULT_CACHE must exist in lib/vextreme.js');
  assert.ok(resolveConfigMatch, 'resolveConfig() must exist in lib/vextreme.js');
  const fn = new Function(
    'detectEnv', 'detectSlug',
    'var NAV_ENVS = ' + navEnvsMatch[1] + ';\n' +
    defaultBaseMatch[0] + '\n' +
    defaultCacheMatch[0] + '\n' +
    resolveConfigMatch[0] + '\n' +
    'return resolveConfig;'
  );
  return fn(() => 'github_pages', () => 'test-slug');
}

test('FAB-AUTOLOAD: resolveConfig defaults fab to true on github_pages', () => {
  const resolveConfig = loadResolveConfig();
  const cfg = resolveConfig({ env: 'github_pages' });
  assert.equal(cfg.fab, true);
});

test('FAB-AUTOLOAD: resolveConfig defaults fab to true on local', () => {
  const resolveConfig = loadResolveConfig();
  const cfg = resolveConfig({ env: 'local' });
  assert.equal(cfg.fab, true);
});

test('FAB-AUTOLOAD: resolveConfig defaults fab to false on squarespace, same gate as nav/bodyWrap', () => {
  const resolveConfig = loadResolveConfig();
  const cfg = resolveConfig({ env: 'squarespace' });
  assert.equal(cfg.fab, false);
  assert.equal(cfg.nav, false);
  assert.equal(cfg.bodyWrap, false);
});

test('FAB-AUTOLOAD: resolveConfig honors an explicit fab:false override on github_pages', () => {
  const resolveConfig = loadResolveConfig();
  const cfg = resolveConfig({ env: 'github_pages', fab: false });
  assert.equal(cfg.fab, false);
});

test('FAB-AUTOLOAD: resolveConfig defaults fabWidgets to an empty object', () => {
  const resolveConfig = loadResolveConfig();
  const cfg = resolveConfig({ env: 'github_pages' });
  assert.deepEqual(cfg.fabWidgets, {});
});

test('FAB-AUTOLOAD: resolveConfig passes an explicit fabWidgets override through unchanged', () => {
  const resolveConfig = loadResolveConfig();
  const cfg = resolveConfig({ env: 'github_pages', fabWidgets: { theme: false } });
  assert.deepEqual(cfg.fabWidgets, { theme: false });
});

test('FAB-AUTOLOAD: run() actually calls loadFabWidgets — wired into the main loader, not just defined and orphaned', () => {
  const source = readSource();
  const runMatch = source.match(/function run\(cfg\) \{[\s\S]*?\n  \}\n\n\n  \/\//);
  assert.ok(runMatch, 'run() must exist in lib/vextreme.js');
  assert.ok(runMatch[0].includes('loadFabWidgets(cfg)'), 'run() must call loadFabWidgets(cfg)');
});

test('FAB-AUTOLOAD: CONFIG SCHEMA doc comment documents the new fab field', () => {
  const source = readSource();
  assert.match(source, /\*\s+fab\s+boolean\s+Auto-load the spiral-FAB widget set/);
});
