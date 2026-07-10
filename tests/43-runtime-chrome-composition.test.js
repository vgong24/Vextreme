'use strict';

/**
 * RUNTIME-CHROME-COMPOSITION
 *
 * Source-contract coverage for the shared nav action rail and the two page
 * geometries that exposed the missing contract. Browser verification remains
 * the evidence for actual rendered rectangles; these checks keep the wiring
 * and explicit ownership decisions from silently drifting afterward.
 */

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

function read(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8').replace(/\r\n/g, '\n');
}

test('CHROME-RAIL: nav exposes one reserved action mount', () => {
  const source = read('lib/vextreme.js');
  assert.equal((source.match(/id="vex-nav-actions"/g) || []).length, 1);
  assert.match(source, /class="vex-nav-actions" id="vex-nav-actions" aria-label="Page tools"/);
});

test('CHROME-RAIL: nav is injected before FAB loading and is not rebuilt afterward', () => {
  const source = read('lib/vextreme.js');
  const run = source.match(/function run\(cfg\) \{[\s\S]*?\n  \}\n\n\n  \/\//);
  assert.ok(run, 'run() must be extractable');
  const navIndex = run[0].indexOf('injectNav(cfg)');
  const fabIndex = run[0].indexOf('loadFabWidgets(cfg)');
  assert.ok(navIndex >= 0 && fabIndex > navIndex, 'nav must exist before vex-fab.js mounts');
  assert.equal((run[0].match(/injectNav\(cfg\)/g) || []).length, 1,
    're-injecting nav after FAB mount would delete the mounted action rail');
});

test('CHROME-RAIL: spiral FAB uses the nav rail with a standalone fallback', () => {
  const source = read('widgets/vex-fab.js');
  assert.match(source, /getElementById\('vex-nav-actions'\)/);
  assert.match(source, /navActions\.appendChild\(container\)/);
  assert.match(source, /document\.body\.appendChild\(container\)/);
  assert.match(source, /vex-spiral-fab--nav/);
});

test('CHROME-RAIL: site nav is full-width and owns a below-nav page-action lane', () => {
  const source = read('styles/site-nav.css');
  assert.match(source, /\.vex-nav-inner \{[\s\S]*?width: 100%;[\s\S]*?margin: 0;/);
  assert.equal(/\.vex-nav-inner \{[\s\S]*?max-width: 1080px;/.test(source), false);
  assert.match(source, /\.vex-nav-actions \{/);
  assert.match(source, /#vex-site-nav ~ \[data-vex-page-action\]/);
});

test('CHROME-RAIL: nav cancels authored body insets without mutating body styles', () => {
  const source = read('lib/vextreme.js');
  assert.match(source, /function alignNavToViewport\(el\)/);
  assert.match(source, /getComputedStyle\(document\.body\)/);
  assert.match(source, /el\.style\.marginLeft/);
  assert.match(source, /el\.style\.marginRight/);
  assert.equal(/document\.body\.style\.(?:margin|padding)/.test(source), false);
});

test('TERRAIN-COMPOSITION: map consumes the remaining viewport below nav', () => {
  const source = read('pages/terrain-map.html');
  const navCss = read('styles/site-nav.css');
  assert.match(source, /#vex-site-nav \+ \.app\{/);
  assert.match(source, /height:calc\(100dvh - var\(--vex-site-nav-height, 61px\)\)/);
  assert.match(source, /\.panel\{[\s\S]*?position:absolute; top:0; right:0; bottom:0;/);
  assert.equal(source.includes("style.setProperty('--topbar-h'"), false);
  const pageHeight = source.match(/--vex-site-nav-height:\s*(\d+)px/);
  const sharedHeight = navCss.match(/--vex-site-nav-height:\s*(\d+)px/);
  assert.ok(pageHeight && sharedHeight, 'both page fallback and shared nav height must be declared');
  assert.equal(pageHeight[1], sharedHeight[1], 'terrain fallback must track the shared nav height');
});

test('PHANTOM-COMPOSITION: authored palette, full-bleed hero, and page action remain owned', () => {
  const source = read('pages/phantom-opera-meta-review.html');
  assert.match(source, /--cream:var\(--bg\); --stone:var\(--ink\); --border:var\(--line\);/);
  assert.match(source, /data-vex-page-action/);
  assert.match(source, /VEXTREME_OVERRIDE = \{ bodyWrap: false, fabWidgets: \{ theme: false \} \}/);
});

test('PAGE-ACTIONS: other known fixed top-right controls use the same lane', () => {
  for (const file of ['pages/accountability-test-02.html', 'pages/witness-committee-operations.html']) {
    assert.match(read(file), /<button class="toggle" data-vex-page-action/);
  }
});

// [VXG RealForever]
