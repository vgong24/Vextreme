'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const SLUG = 'entire-matter-return-seal';

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8').replace(/\r\n/g, '\n');
}
function json(rel) {
  return JSON.parse(read(rel));
}

test('ENTIRE-MATTER-ARCHIVE: Sabotage ends at V while witness and Return continue in Victor Record', () => {
  const arcs = json('data/arcs-v2.json');

  assert.deepEqual(arcs.sabotage.sections[0].slugs.slice(-5), [
    'sabotage-open-vex-accountability',
    'sabotage-mastered-state',
    'sabotage-vexsync-exhaust-mastered',
    'sabotage-orientation-before-action',
    'sabotage-hidden-delta'
  ]);
  assert.ok(!arcs.sabotage.sections[0].slugs.includes(SLUG));

  assert.deepEqual(arcs.victors_record.sections[0].slugs.slice(-7), [
    'sabotage-open-vex-accountability',
    'sabotage-mastered-state',
    'sabotage-vexsync-exhaust-mastered',
    'sabotage-orientation-before-action',
    'sabotage-hidden-delta',
    'november-1-successor-witness',
    SLUG
  ]);
});

test('ENTIRE-MATTER-ARCHIVE: sealed return has one explicit archive node and viewmodel', () => {
  const nodes = json('data/nodes.json');
  const views = json('data/viewmodels.json');
  const node = nodes.find(item => item.slug === SLUG);

  assert.ok(node);
  assert.equal(node.id, 117);
  assert.equal(node.title, 'Entire Matter Return — Sealed Declaration');
  assert.equal(node.date, 'November 1, 2026');
  assert.deepEqual(node.arcKeys, ['victors_record', 'full_timeline']);
  assert.equal(node.department, 'media');
  assert.equal(node.workType, 'record-transcripts');

  assert.equal(views[SLUG].title, 'Entire Matter Return — Sealed Declaration');
  assert.equal(views[SLUG].category, 'production');
  assert.equal(views[SLUG].template, 'page');
  assert.deepEqual(views[SLUG].scopes, ['pages.' + SLUG]);
  assert.deepEqual(views[SLUG].features, ['spiral-fab', 'theme', 'map', 'analysis', 'arc-nav']);
  assert.equal(views[SLUG].preview.kind, 'cover');
});

test('ENTIRE-MATTER-ARCHIVE: generated index projects the same continuity and current page truth', () => {
  const index = json('data/index.json');
  const node = index.slugMap[SLUG];

  assert.ok(node);
  assert.equal(node.id, 117);
  assert.equal(node.dateISO, '2026-11-01');
  assert.deepEqual(node.arcKeys, ['victors_record', 'full_timeline']);
  assert.equal(index.arcMap.sabotage[0].slugs.at(-1), 'sabotage-hidden-delta');
  assert.ok(!index.arcMap.sabotage[0].slugs.includes(SLUG));
  assert.equal(index.arcMap.victors_record[0].slugs.at(-1), SLUG);
  assert.ok(index.arcMap.victors_record[0].slugs.includes('november-1-successor-witness'));
  assert.ok(index.arcMap.full_timeline.at(-1).slugs.includes(SLUG));
  assert.ok(index.departmentMap.media['record-transcripts'].some(item => item.slug === SLUG && item.ported === true));
  assert.deepEqual(index.pageLanguageMap[SLUG], { availableLangs: ['en'], completeLangs: ['en'] });
  assert.match(index.contentFingerprint, /^[a-f0-9]{12}$/);
});

test('ENTIRE-MATTER-ARCHIVE: formal return reader mounts repository-native arc navigation', () => {
  const page = read('pages/entire-matter-return-seal.html');

  assert.match(page, /styles\/arc-nav\.css/);
  assert.match(page, /id="arcNavMount"/);
  assert.match(page, /dist\/vextreme-entire-matter-return-seal\.js/);
  assert.doesNotMatch(page, /lib\/vextreme-index-v2\.js/);
  assert.match(page, /Entire Matter Return/);
  assert.match(page, /canonical Markdown source governs/i);
});

// [VXG RealForever]
