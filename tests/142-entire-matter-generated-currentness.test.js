'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const SLUG = 'entire-matter-return-seal';
const TITLE = 'Entire Matter Return — Sealed Declaration';
const PAGE_URL = 'https://vgong24.github.io/Vextreme/pages/' + SLUG + '.html';
const COVER = 'https://raw.githubusercontent.com/vgong24/Vextreme-Assets/0112ddb696f9b604402809fb945f2e2e88ad1359/__assets/96269d955043540d2eda8a8e973be9307c691bec816fdb41be9b68b1b19a8cd9.webp';

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8').replace(/\r\n/g, '\n');
}
function json(rel) {
  return JSON.parse(read(rel));
}

test('ENTIRE-MATTER-CURRENTNESS: page uses the generated Vextreme runtime and truthful page scope', () => {
  const page = read('pages/' + SLUG + '.html');
  const views = json('data/viewmodels.json');
  const view = views[SLUG];

  assert.ok(page.includes('../dist/vextreme-' + SLUG + '.js'));
  assert.ok(!page.includes('../lib/vextreme-index-v2.js'));
  assert.deepEqual(view.scopes, ['pages.' + SLUG]);
  assert.deepEqual(view.features, ['spiral-fab', 'theme', 'map', 'analysis', 'arc-nav']);
  assert.equal(view.preview.src, COVER);
});

test('ENTIRE-MATTER-CURRENTNESS: generated index keeps English-only truth and archive continuity', () => {
  const index = json('data/index.json');
  const node = index.slugMap[SLUG];

  assert.ok(node);
  assert.deepEqual(node.viewmodel.scopes, ['pages.' + SLUG]);
  assert.deepEqual(node.viewmodel.features, ['spiral-fab', 'theme', 'map', 'analysis', 'arc-nav']);
  assert.deepEqual(index.pageLanguageMap[SLUG], { availableLangs: ['en'], completeLangs: ['en'] });
  assert.equal(index.arcMap.sabotage[0].slugs.at(-1), SLUG);
  assert.equal(index.arcMap.victors_record[0].slugs.at(-1), SLUG);
  assert.ok(index.arcMap.full_timeline.at(-1).slugs.includes(SLUG));
});

test('ENTIRE-MATTER-CURRENTNESS: Terrain Map projects five Sabotage members and a live Return card', () => {
  const terrain = json('data/terrain-map.json');
  const sabotage = terrain.arcs.find(arc => arc.key === 'sabotage');
  const page = terrain.pages.find(item => item.slug === SLUG);

  assert.ok(sabotage);
  assert.equal(sabotage.count, 5);
  assert.deepEqual(sabotage.memberSlugs.slice(-5), [
    'sabotage-open-vex-accountability',
    'sabotage-mastered-state',
    'sabotage-vexsync-exhaust-mastered',
    'sabotage-orientation-before-action',
    SLUG
  ]);
  assert.equal(sabotage.sections[0].slugs.at(-1), SLUG);

  assert.ok(page);
  assert.equal(page.title, TITLE);
  assert.equal(page.live, true);
  assert.equal(page.liveUrl, PAGE_URL);
  assert.equal(page.preview.kind, 'cover');
  assert.equal(page.preview.src, COVER);
  assert.ok(page.capability);
  assert.equal(page.capability.fab, 'god-script');
  assert.equal(page.capability.analysisIndexed, true);
});

test('ENTIRE-MATTER-CURRENTNESS: public discovery surfaces include the Return', () => {
  const buildHealth = read('pages/build-health.html');
  const home = read('index.html');
  const sitemap = read('sitemap.xml');

  assert.ok(buildHealth.includes('Sabotage'));
  assert.ok(buildHealth.includes('5 / 5'));
  assert.ok(buildHealth.includes(PAGE_URL));
  assert.ok(buildHealth.includes(TITLE));

  assert.ok(home.includes(PAGE_URL));
  assert.ok(home.includes(TITLE));
  assert.ok(sitemap.includes('<loc>' + PAGE_URL + '</loc>'));
});

// [VXG RealForever]
