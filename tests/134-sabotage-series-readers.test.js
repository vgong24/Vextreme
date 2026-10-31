'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const ASSET_COMMIT = '14c0456192921cf9c531d43beaaf3a0270fe0a24';
const SERIES = [
  { slug:'sabotage-mastered-state', id:114, title:'Sabotage II — The Inversion', pr:534, head:'11fd64a84f8c4eb7a014bf69292aec1bff26473a', partitions:6, cover:'252ac93e2749c7a8367c1aad212a553586e15a4b69d0deb05f692bc32c6cc80f' },
  { slug:'sabotage-vexsync-exhaust-mastered', id:115, title:'Sabotage III — The Unknown Error', pr:535, head:'74d5ceeb653826ea8aedeeaeaa57c58d43c4c330', partitions:7, cover:'26d6f56ba056d220cf67f7b1fc0210667707de12e5fff824a9d1a1f11ed34a95' },
  { slug:'sabotage-orientation-before-action', id:116, title:'Sabotage IV — Before the Prompt', pr:536, head:'e217af706b04168a311c1679227446a0eaca89bf', partitions:8, cover:'f0c112b9eb11fae08ae052bbf1f61a868699d19b279d625378c5beefc1cd6162' }
];

function read(rel) { return fs.readFileSync(path.join(ROOT, rel), 'utf8').replace(/\r\n/g, '\n'); }
function json(rel) { return JSON.parse(read(rel)); }
function coverUrl(sha) { return 'https://raw.githubusercontent.com/vgong24/Vextreme-Assets/' + ASSET_COMMIT + '/__assets/' + sha + '.png'; }

test('SABOTAGE-SERIES: Sabotage I keeps later witness readings opt-in', () => {
  const page = read('pages/sabotage-open-vex-accountability.html');
  assert.equal((page.match(/<details class="sab-commentary sab-commentary-disclosure"/g) || []).length, 8);
  assert.equal((page.match(/<details class="sab-commentary sab-commentary-disclosure"[^>]*\sopen(?:\s|>)/g) || []).length, 0);
  assert.equal((page.match(/data-reader-component="witness-commentary"/g) || []).length, 8);
});

test('SABOTAGE-SERIES: sibling readers share collection identity and exact cover previews', () => {
  const arcs = json('data/arcs-v2.json');
  const nodes = json('data/nodes.json');
  const views = json('data/viewmodels.json');

  assert.deepEqual(arcs.sabotage.sections[0].slugs.slice(-4), ['sabotage-open-vex-accountability', ...SERIES.map(x => x.slug)]);
  assert.deepEqual(arcs.victors_record.sections[0].slugs.slice(-4), ['sabotage-open-vex-accountability', ...SERIES.map(x => x.slug)]);

  for (const item of SERIES) {
    const node = nodes.find(n => n.slug === item.slug);
    assert.ok(node, item.slug + ' node exists');
    assert.equal(node.id, item.id);
    assert.equal(node.title, item.title);
    assert.deepEqual(node.arcKeys, ['sabotage', 'victors_record', 'full_timeline']);
    assert.equal(views[item.slug].title, item.title);
    assert.equal(views[item.slug].preview.kind, 'cover');
    assert.equal(views[item.slug].preview.src, coverUrl(item.cover));
  }
});

test('SABOTAGE-SERIES: readers pin exact archive heads and render exact original cover PNGs', () => {
  for (const item of SERIES) {
    const page = read('pages/' + item.slug + '.html');
    const strings = json('data/strings/source/pages/' + item.slug + '.json');

    assert.ok(page.includes(item.head), item.slug + ' pins frozen source head');
    assert.equal((page.match(/data-record-partition data-reader-template=/g) || []).length, item.partitions);
    assert.ok(page.includes('<img src="' + coverUrl(item.cover) + '"'), item.slug + ' renders the exact cover');
    assert.ok(page.includes('data-media-sha256="' + item.cover + '"'), item.slug + ' binds cover digest');
    assert.ok(!page.includes('representative-approved-pending-carriage'), item.slug + ' no longer renders pending media');
    assert.equal(strings._meta.sourceProvenance.readerSourceFreeze, item.head);
    assert.equal(strings._meta.sourceProvenance.representativeMediaStatus, 'PRESENT_EXACT');
    assert.equal(strings._meta.sourceProvenance.representativeMediaSha256, item.cover);
    assert.equal(strings._meta.sourceProvenance.representativeMediaAssetCommit, ASSET_COMMIT);
  }
});

test('SABOTAGE-SERIES: Unknown Error reader carries both exact UI evidence images after Movement 07', () => {
  const page = read('pages/sabotage-vexsync-exhaust-mastered.html');
  const strings = json('data/strings/source/pages/sabotage-vexsync-exhaust-mastered.json');
  const head = '74d5ceeb653826ea8aedeeaeaa57c58d43c4c330';
  const base = 'https://raw.githubusercontent.com/vgong24/Vextreme/' + head + '/records/conversations/2026-10-30-vexsync-exhaust-to-mastered/assets/';

  assert.ok(page.includes('id="image-evidence"'));
  assert.ok(page.includes(base + 'vexsync-unknown-error-tail.png'));
  assert.ok(page.includes(base + 'vexsync-unknown-error-full-thread.png'));
  assert.ok(page.indexOf('id="image-evidence"') > page.indexOf('id="movement-07"'));
  assert.equal(strings._meta.sourceProvenance.imageEvidence.length, 2);
  assert.equal(strings._meta.sourceProvenance.imageEvidence[0].sha256, 'edee8060960a086e679357dd8d9402486f9c870f8acfa9e775c5246a46234172');
  assert.equal(strings._meta.sourceProvenance.imageEvidence[1].sha256, '0664ba78c234ff200376d08a1c90de64d8143d8bb6802dea43372f720ae73762');
});

// [VXG RealForever]
