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

test('CHROME-HOME: shared chrome separates Vextreme Terrain home from VexLife onboarding home', () => {
  const source = read('lib/vextreme.js');
  const css = read('styles/site-nav.css');
  assert.match(source, /class="vex-nav-brand-pair"/);
  assert.match(source, /class="vex-nav-title" href="\/Vextreme\/pages\/terrain-map\.html\?view=content&profile=evolution-v1">Vextreme<\/a>/);
  assert.match(source, /class="vex-nav-life" href="https:\/\/vgong24\.github\.io\/VexLife\/">VexLife<\/a>/);
  assert.match(css, /\.vex-nav-brand-pair \{/);
  assert.match(css, /\.vex-nav-life \{/);
});

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

test('CHROME-RAIL: configured FAB links remain children of the shared Spiral and fail closed on unsafe URL / raw HTML patterns', () => {
  const source = read('lib/vextreme.js');
  const helper = source.match(/function safeFabLinkUrl\(value\) \{[\s\S]*?\n  function loadFabWidgets\(cfg\)/);
  assert.ok(helper, 'configured FAB link helpers must remain adjacent to the shared loader');
  const code = helper[0];
  assert.match(code, /getElementById\('vex-spiral-group'\)/);
  assert.match(code, /url\.protocol === 'http:' \|\| url\.protocol === 'https:'/);
  assert.match(code, /document\.createElement\('a'\)/);
  assert.match(code, /document\.createElement\('img'\)/);
  assert.match(code, /link\.setAttribute\('aria-label', label\)/);
  assert.match(code, /group\.appendChild\(link\)/);
  assert.doesNotMatch(code, /\.innerHTML\s*=/, 'configured icons/labels must not become raw HTML injection');
  assert.doesNotMatch(code, /position:\s*fixed/, 'configured links must not create a second independently positioned FAB');
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

test('TERRAIN-COMPOSITION: Terrain keeps shared FAB ownership, disables only its redundant map child, and configures Support through the reusable link seam', () => {
  const source = read('pages/terrain-map.html');
  assert.match(source, /window\.VEXTREME_OVERRIDE = \{/);
  assert.match(source, /fabWidgets: \{ map: false \}/);
  assert.match(source, /fabLinks: \[\{/);
  assert.match(source, /id: 'support'/);
  assert.match(source, /href: 'vex-support\.html'/);
  assert.match(source, /label: 'Support Vextreme and VexLife'/);
  assert.doesNotMatch(source, /MutationObserver[\s\S]{0,300}aria-expanded/);
  assert.doesNotMatch(source, /getAttribute\(['"]aria-expanded['"]\)/);
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

test('ARC-COMPOSITION: one shared stylesheet serves both preserved v1 lattice and current v2 renderer grammars', () => {
  const css = read('styles/arc-nav.css');
  const v1 = read('lib/arc-nav.js');
  const v2 = read('lib/vextreme-index-v2.js');

  assert.match(v1, /class="arc-nav-header"/);
  assert.match(v1, /class="arc-nav-dots"/);
  assert.match(v1, /var dotClass = isActive \? 'arc-dot active'/);
  assert.match(css, /\.arc-nav-header\s*\{/);
  assert.match(css, /\.arc-nav-dots\s*\{/);
  assert.match(css, /\.arc-dot\.active\s*\{/);

  assert.match(v2, /class="arc-nav-label"/);
  assert.match(v2, /class="arc-nav-right"/);
  assert.match(v2, /class="arc-nav-counter"/);
  assert.match(v2, /class="arc-nav-arrows"/);
  assert.match(css, /\.arc-nav-row:has\(> \.arc-nav-label\)\s*\{/);
  assert.match(css, /\.arc-nav-label\s*\{/);
  assert.match(css, /\.arc-nav-right,\s*\n\.arc-nav-arrows\s*\{/);
  assert.match(css, /\.arc-nav-counter\s*\{/);

  assert.match(css, /\.arc-nav-current\s*\{[\s\S]*?font-family: var\(--serif\)/,
    'v2 inline current-title text must inherit the same reading typography as the preserved v1 current-title child');
});

test('LEGACY-COMPAT: Testimony preserves authored body + v1 lattice while stale route/bootstrap infrastructure is repaired', () => {
  const source = read('pages/the-testimony-of-victor-gong.html');
  const shell = read('lib/shell.js');

  assert.match(source, /href="archives\.html"/,
    'authored Archives affordance should resolve inside the current repository rather than the retired external site');
  assert.doesNotMatch(source, /vextreme24\.com\/archives/);

  assert.equal((source.match(/id="arcNavMount"/g) || []).length, 1,
    'the preserved rich v1 arc lattice mount remains authored exactly once');
  assert.match(source, /The raw witness is preserved\. The testimony is sealed\. The covenant is complete\./,
    'page-specific authored body remains intact');
  assert.doesNotMatch(source, /VEXTREME_mount/,
    'the page must not attempt to mount arc navigation before the shared runtime owns data/script readiness');

  const shellVer = shell.match(/var VEXTREME_VER = '([^']+)';/);
  const shellTag = source.match(/<script src="\.\.\/lib\/shell\.js([^"]*)"><\/script>/);
  assert.ok(shellVer && shellTag, 'Testimony must use the same-origin shared shell bootstrap');
  assert.equal(shellTag[1], shellVer[1],
    'Testimony shell cache token must track the runtime generation');
  assert.doesNotMatch(source, /cdn\.jsdelivr\.net\/gh\/vgong24\/vextreme@main\/lib\/shell\.js/,
    'mutable jsDelivr @main bootstrap must not remain on the legacy specimen');
});

test('PAGE-ACTIONS: other known fixed top-right controls use the same lane', () => {
  for (const file of ['pages/accountability-test-02.html', 'pages/witness-committee-operations.html']) {
    assert.match(read(file), /<button class="toggle" data-vex-page-action/);
  }
});

// [VXG RealForever]
