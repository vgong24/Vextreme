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

test('CHROME-HOME: shared chrome exposes the Vextreme, VexLife, and VexWork family', () => {
  const source = read('lib/vextreme.js');
  const css = read('styles/site-nav.css');
  assert.match(source, /class="vex-family-rail" role="group"/);
  assert.match(source, /class="vex-family-mark" aria-hidden="true"/);
  assert.match(source, /class="vex-family-world vex-nav-title vex-family-current"[^>]*aria-current="page">Vextreme<\/a>/);
  assert.match(source, /class="vex-family-world vex-nav-product" href="https:\/\/vgong24\.github\.io\/VexLife\/">VexLife<\/a>/);
  assert.match(source, /class="vex-family-world vex-nav-product" href="https:\/\/vexgpt\.github\.io\/VexWork\/">VexWork<\/a>/);
  assert.match(css, /\.vex-family-rail \{/);
  assert.match(css, /\.vex-family-mark-glyph \{[\s\S]*vextreme-mark\.svg/);
  assert.match(css, /grid-template-columns:\s*5\.8rem 0\.65rem 5\.3rem 0\.65rem 5\.3rem/);
  assert.match(css, /\.vex-family-world \{[\s\S]*text-align: center;/);
  assert.match(css, /\.vex-nav-title \{[\s\S]*font-family:\s*var\(--serif/);
  assert.match(css, /\.vex-nav-product \{[\s\S]*font-family:\s*var\(--sans/);
  assert.match(css, /\.vex-nav-brand-separator \{[\s\S]*text-align: center;[\s\S]*justify-self: center;/);
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

test('CHROME-RAIL: Spiral opens from one trigger into horizontal primary and vertical secondary lanes', () => {
  const source = read('widgets/vex-fab.js');
  assert.match(source, /id = 'vex-spiral-primary'/);
  assert.match(source, /id = 'vex-spiral-secondary'/);
  assert.match(source, /grid-template-columns: minmax\(0, auto\) 44px/);
  assert.match(source, /#vex-spiral-primary[\s\S]*?grid-row: 1/);
  assert.match(source, /#vex-spiral-secondary[\s\S]*?grid-row: 2/);
  assert.match(source, /data-vex-spiral-axis'\) === 'secondary'/);
  assert.match(source, /lane\.appendChild\(node\)/);
});

test('CHROME-RAIL: primary Spiral lane preserves child popup escape instead of clipping it', () => {
  const source = read('widgets/vex-fab.js');
  assert.match(source, /#vex-spiral-primary[\s\S]*?overflow: visible/);
  assert.doesNotMatch(
    source,
    /#vex-spiral-primary[\s\S]*?overflow-x: auto/,
    'a horizontal scroll container also clips vertical child popups such as the language wheel',
  );
});

test('CHROME-RAIL: Analysis/Search uses the secondary vertical Spiral lane', () => {
  const source = read('widgets/fab-analysis.js');
  assert.match(source, /container\.setAttribute\('data-vex-spiral-axis', 'secondary'\)/);
});

test('CHROME-RAIL: Read Aloud is a shared Spiral child with standalone fallback, not a second fixed FAB owner', () => {
  const source = read('widgets/fab-read-aloud.js');
  assert.match(source, /getElementById\('vex-spiral-group'\)/);
  assert.match(source, /group\.appendChild\(root\)/);
  assert.match(source, /orb\.className = 'vex-orb'/);
  assert.match(source, /document\.body\.appendChild\(root\)/);
  assert.match(source, /vex-read-aloud-standalone/);
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

test('CHROME-RAIL: mobile keeps family coordinates intact and moves Vextreme-only tools onto their own row', () => {
  const source = read('styles/site-nav.css');
  assert.match(source, /@media \(max-width: 640px\) \{[\s\S]*?:root \{ --vex-site-nav-height: 93px; \}/);
  assert.match(source, /@media \(max-width: 640px\) \{[\s\S]*?\.vex-nav-inner \{[\s\S]*?flex-wrap: wrap;[\s\S]*?row-gap: 6px;/);
  assert.match(source, /@media \(max-width: 640px\) \{[\s\S]*?\.vex-family-rail \{[\s\S]*?width: 100%;[\s\S]*?margin-right: 0;/);
  assert.match(source, /grid-template-columns:\s*4\.9rem 0\.65rem 4\.7rem 0\.65rem 4\.8rem/);
  assert.match(source, /@media \(max-width: 640px\) \{[\s\S]*?\.vex-nav-toggle \{ margin-left: auto; \}/);
  assert.match(source, /\.vex-nav-mobile \{[\s\S]*?top: var\(--vex-site-nav-height\);/);
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

test('TESTIMONY-CURRENT: authored body keeps one arc mount while current God Script owns runtime composition', () => {
  const source = read('pages/the-testimony-of-victor-gong.html');

  assert.match(source, /data-content-forge-generator="tools\/vex-content-forge\/project_arc_batch\.js"/,
    'Testimony must be owned by the current Content Forge page-generation path');
  assert.equal((source.match(/id="arcNavMount"/g) || []).length, 1,
    'the authored arc navigation mount remains exactly once');
  assert.match(source, /The raw witness is preserved\. The testimony is sealed\. The covenant is complete\./,
    'page-specific authored body remains intact');
  assert.match(source, /\.\.\/dist\/vextreme-the-testimony-of-victor-gong\.js/,
    'Testimony must use its current same-origin God Script');
  assert.doesNotMatch(source, /<script[^>]+shell\.js/,
    'the old shell must not survive inside the reader-native document');
  assert.doesNotMatch(source, /cdn\.jsdelivr\.net\/gh\/vgong24\/vextreme@main\/lib\/shell\.js/,
    'mutable jsDelivr @main bootstrap must not survive the migration');
});
test('PAGE-ACTIONS: other known fixed top-right controls use the same lane', () => {
  for (const file of ['pages/accountability-test-02.html', 'pages/witness-committee-operations.html']) {
    assert.match(read(file), /<button class="toggle" data-vex-page-action/);
  }
});

// [VXG RealForever]
