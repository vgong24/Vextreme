'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const RETURN = 'entire-matter-return-seal';
const VI = 'november-1-successor-witness';
const RETURN_TITLE = 'Entire Matter Return — Sealed Declaration';
const RETURN_URL = 'https://vgong24.github.io/Vextreme/pages/' + RETURN + '.html';
const REPAIR_COVER = 'https://raw.githubusercontent.com/vgong24/Vextreme-Assets/756b41baae9d9414e1742d147d0191964e967fbb/__assets/34aa7284512a223866c25e5c8d9fd0d7d0286fc05fd376b52f04acebe77369f4.webp';
const SABOTAGE = [
  'sabotage-open-vex-accountability',
  'sabotage-mastered-state',
  'sabotage-vexsync-exhaust-mastered',
  'sabotage-orientation-before-action',
  'sabotage-hidden-delta',
  VI,
];

function read(rel) { return fs.readFileSync(path.join(ROOT, rel), 'utf8').replace(/\r\n/g, '\n'); }
function json(rel) { return JSON.parse(read(rel)); }

test('ENTIRE-MATTER-CURRENTNESS: Return uses generated runtime while retaining its distinct source role', () => {
  const page = read('pages/' + RETURN + '.html');
  const views = json('data/viewmodels.json');

  assert.ok(page.includes('../dist/vextreme-' + RETURN + '.js'));
  assert.deepEqual(views[RETURN].scopes, ['pages.' + RETURN]);
  assert.deepEqual(views[RETURN].features, ['spiral-fab', 'theme', 'map', 'analysis', 'arc-nav']);
  assert.equal(views[RETURN].preview.src, REPAIR_COVER);
  assert.ok(page.includes('sealed-entire-matter-return.md'));
});

test('ENTIRE-MATTER-CURRENTNESS: generated index carries Sabotage I–VI and then the separate Return', () => {
  const index = json('data/index.json');
  const returned = index.slugMap[RETURN];
  const witness = index.slugMap[VI];

  assert.ok(returned);
  assert.ok(witness);
  assert.deepEqual(index.arcMap.sabotage[0].slugs.slice(-6), SABOTAGE);
  assert.ok(!index.arcMap.sabotage[0].slugs.includes(RETURN));
  assert.equal(index.arcMap.victors_record[0].slugs.at(-1), RETURN);
  assert.deepEqual(witness.arcKeys, ['sabotage', 'victors_record', 'full_timeline']);
  assert.deepEqual(returned.arcKeys, ['victors_record', 'full_timeline']);
});

test('ENTIRE-MATTER-CURRENTNESS: Terrain projects six Sabotage records and a distinct live Return card', () => {
  const terrain = json('data/terrain-map.json');
  const sabotage = terrain.arcs.find(arc => arc.key === 'sabotage');
  const returned = terrain.pages.find(item => item.slug === RETURN);
  const witness = terrain.pages.find(item => item.slug === VI);

  assert.ok(sabotage);
  assert.equal(sabotage.count, 6);
  assert.deepEqual(sabotage.memberSlugs.slice(-6), SABOTAGE);
  assert.equal(sabotage.sections[0].slugs.at(-1), VI);

  assert.ok(witness);
  assert.equal(witness.arc, 'sabotage');
  assert.ok(returned);
  assert.equal(returned.title, RETURN_TITLE);
  assert.equal(returned.live, true);
  assert.equal(returned.liveUrl, RETURN_URL);
  assert.equal(returned.arc, 'victors_record');
  assert.equal(returned.preview.kind, 'cover');
  assert.equal(returned.preview.src, REPAIR_COVER);
});

test('ENTIRE-MATTER-CURRENTNESS: public discovery surfaces expose six-member Sabotage and the Return', () => {
  const buildHealth = read('pages/build-health.html');
  const home = read('index.html');
  const sitemap = read('sitemap.xml');

  assert.ok(buildHealth.includes('Sabotage'));
  assert.ok(buildHealth.includes('6 / 6'));
  assert.ok(buildHealth.includes('Sabotage VI — The Successor Witness'));
  assert.ok(buildHealth.includes(RETURN_URL));
  assert.ok(buildHealth.includes(RETURN_TITLE));
  assert.ok(home.includes(RETURN_URL));
  assert.ok(home.includes(RETURN_TITLE));
  assert.ok(sitemap.includes('<loc>' + RETURN_URL + '</loc>'));
});

// [VXG RealForever]
