'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const SLUG = 'return-kiss-presence-accountability';
const SOURCE_HEAD = '788b43fb20d24942d40b4b6b5b195b24607992f2';

function read(rel) { return fs.readFileSync(path.join(ROOT, rel), 'utf8').replace(/\r\n/g, '\n'); }
function json(rel) { return JSON.parse(read(rel)); }

test('RETURN-KISS: fifth dream arc is registered without requiring cover art', () => {
  const arcs = json('data/arcs-v2.json');
  const nodes = json('data/nodes.json');
  const views = json('data/viewmodels.json');
  const node = nodes.find(n => n.slug === SLUG);

  assert.ok(node);
  assert.equal(node.id, 120);
  assert.equal(node.title, 'The Return Kiss — Full October 31 Witness Transcript');
  assert.deepEqual(node.arcKeys, ['convos_with_god', 'victors_record', 'full_timeline']);

  const convos = arcs.convos_with_god.sections[0].slugs;
  assert.equal(convos.indexOf(SLUG), convos.indexOf('pier-house-scarcity-companionship') + 1);

  const record = arcs.victors_record.sections[0].slugs;
  assert.equal(record.indexOf(SLUG), record.indexOf('pier-house-scarcity-companionship') + 1);
  assert.equal(record[record.indexOf(SLUG) + 1], 'starting-anew-orientation-before-work');
  assert.equal(record[record.indexOf(SLUG) + 2], 'sabotage-open-vex-accountability');

  assert.equal(views[SLUG].title, node.title);
  assert.deepEqual(views[SLUG].scopes, ['pages.' + SLUG]);
  assert.equal(views[SLUG].preview, undefined, 'cover judgment is intentionally deferred');
});

test('RETURN-KISS: reader exposes ten complete source exchanges through one shared reader', () => {
  const page = read('pages/' + SLUG + '.html');
  assert.equal((page.match(/data-record-reader-root/g) || []).length, 1);
  assert.equal((page.match(/<button class="sar-track-btn/g) || []).length, 10);
  assert.equal((page.match(/data-reader-component="phase"/g) || []).length, 10);
  assert.match(page, /id="sar-reader-position">01 \/ 10/);
  assert.ok(page.includes(SOURCE_HEAD));

  for (const file of [
    '01-dream-memory-return-kiss.md',
    '02-direct-signal-request.md',
    '03-presence-pattern-report.md',
    '04-vex-source-witness.md',
    '05-presence-core-return.md',
    '06-timing-threshold-sharing.md',
    '07-presence-uninterrupted-continuation.md',
    '08-god-proof-and-accountability-analogy.md',
    '09-inverse-belief-and-evasion.md',
    '10-dual-jurisdiction-accountability.md',
  ]) assert.ok(page.includes(file), file);

  assert.match(page, /Presence I remains a named viewpoint inside Vex-authored quoted text/);
  assert.match(page, /Holy Father God \/ I AM THAT I AM is preserved as addressee/);
});

test('RETURN-KISS: source provenance stays explicit and generated discovery may remain coverless', () => {
  const strings = json('data/strings/source/pages/' + SLUG + '.json');
  assert.equal(strings._meta.sourceProvenance.parentRecord, 'github.pull.vextreme.544');
  assert.equal(strings._meta.sourceProvenance.parentHead, SOURCE_HEAD);
  assert.equal(strings._meta.sourceProvenance.recordClass, 'PRESERVED_TEN_EXCHANGE_DIALOGUE');

  const index = json('data/index.json');
  const terrain = json('data/terrain-map.json');
  assert.ok(index.slugMap[SLUG]);
  const page = terrain.pages.find(p => p.slug === SLUG);
  assert.ok(page);
  assert.equal(page.live, true);
  assert.equal(page.arc, 'convos_with_god');
});

// [VXG RealForever]
