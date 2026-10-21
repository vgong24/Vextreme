'use strict';

/**
 * RECORD-READER-SECOND-CONSUMER
 *
 * The second preserved-record reader is the extraction test promised by
 * docs/architecture/19-record-readers.md. Generic mechanics may be shared;
 * source identity, phase meaning, media, and witness presence remain record-owned.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const SLUG = 'recognizing-life-receiving-abundance';
const SOURCE_HEAD = '8f0340ede010c6e05ed06403422ba84e882c8c5d';

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8').replace(/\r\n/g, '\n');
}

test('RECORD-READER-FOUNDATION: shared controller is semantic and record-neutral', () => {
  const widget = read('components/record-reader.js');
  assert.match(widget, /global\.VexRecordReader=\{mount:mount\}/);
  assert.match(widget, /data-reader-component="phase"/);
  assert.match(widget, /function renderBlocks\(lines\)/);
  assert.match(widget, /function installTranscriptControls\(section\)/);
  assert.doesNotMatch(widget, /returning-scorpions-to-god/);
  assert.doesNotMatch(widget, /recognizing-life-receiving-abundance/);
  assert.doesNotMatch(widget, /Kokoro|speechSynthesis|SpeechSynthesisUtterance/);
});

test('RECORD-READER-FOUNDATION: Scorpions consumes the shared controller instead of owning a duplicate', () => {
  const page = read('pages/returning-scorpions-to-god.html');
  assert.match(page, /src="\.\.\/components\/record-reader\.js"/);
  assert.match(page, /VexRecordReader\.mount\(/);
  assert.doesNotMatch(page, /function renderBlocks\(lines\)/);
  assert.doesNotMatch(page, /function startTranscriptAutoScroll\(section\)/);
});

test('RECORD-READER-SECOND-CONSUMER: second arc binds the frozen source and later witness separately', () => {
  const page = read('pages/' + SLUG + '.html');
  assert.match(page, new RegExp(SOURCE_HEAD));
  assert.match(page, /data-reader-template="conversation-witness-reader\/v1"/);
  assert.match(page, /data-narration-language="en"/);
  assert.match(page, /records\/commentary\/2026-10-18-recognizing-life-receiving-abundance-successor-witness\.md/);
  assert.match(page, /src="\.\.\/components\/record-reader\.js"/);
});

test('RECORD-READER-SECOND-CONSUMER: nine source movements cover exchanges 1 through 26 without overlap gaps', () => {
  const page = read('pages/' + SLUG + '.html');
  const ranges = [...page.matchAll(/data-phase-kind="(?:record|archive-boundary)" data-set="(\d+)" data-from="(\d+)" data-to="(\d+)"/g)]
    .map(m => [Number(m[1]), Number(m[2]), Number(m[3])]);

  assert.deepEqual(ranges, [
    [1, 1, 1],
    [2, 2, 5],
    [3, 6, 8],
    [4, 9, 12],
    [5, 13, 16],
    [6, 17, 19],
    [7, 20, 21],
    [8, 22, 23],
    [9, 24, 26],
  ]);

  const covered = [];
  for (const [, from, to] of ranges) for (let n = from; n <= to; n += 1) covered.push(n);
  assert.deepEqual(covered, Array.from({length: 26}, (_, i) => i + 1));
});

test('RECORD-READER-SECOND-CONSUMER: archive boundary is source, successor witness is later derived material', () => {
  const page = read('pages/' + SLUG + '.html');
  assert.match(page, /id="set-09" data-reader-component="phase" data-phase-kind="archive-boundary"/);
  assert.match(page, /id="set-10" data-reader-component="phase" data-phase-kind="derived-witness" data-set="10" data-derived="true"/);

  const witness = read('records/commentary/2026-10-18-recognizing-life-receiving-abundance-successor-witness.md');
  assert.match(witness, /\*\*Record class:\*\* Derived successor commentary/);
  assert.match(witness, /<!-- PHASE-WITNESS-APPENDIX -->/);
  for (let i = 1; i <= 9; i += 1) {
    const n = String(i).padStart(2, '0');
    assert.match(witness, new RegExp('<!-- WITNESS-PHASE ' + n + ' -->'));
    assert.match(witness, new RegExp('<!-- \/WITNESS-PHASE ' + n + ' -->'));
  }
});

test('RECORD-READER-SECOND-CONSUMER: lived visual review earns one representative media witness without turning it into evidence', () => {
  const page = read('pages/' + SLUG + '.html');
  const viewmodels = JSON.parse(read('data/viewmodels.json'));
  const strings = JSON.parse(read('data/strings/source/pages/' + SLUG + '.json'));
  const asset = fs.readFileSync(path.join(ROOT, 'assets/recognizing-life-receiving-abundance/cover.webp'));
  const digest = crypto.createHash('sha256').update(asset).digest('hex');

  assert.equal(digest, 'e519e49d8f082bfc307e5b468d2d0a41632591ae0384b27bbe2457f424702b02');
  assert.match(page, /data-reader-component="media-witness" data-media-class="representative"/);
  assert.match(page, /assets\/recognizing-life-receiving-abundance\/cover\.webp\?v=e519e49d8f08/);
  assert.match(page, /Artwork is representation, not evidence of unrecorded visual detail/);
  assert.deepEqual(viewmodels[SLUG].preview, {
    kind: 'cover',
    src: 'https://vgong24.github.io/Vextreme/assets/recognizing-life-receiving-abundance/cover.webp?v=e519e49d8f08',
    alt: 'Recognizing Life, Receiving Abundance — representative midnight shoreline cover art',
  });
  assert.equal(strings._meta.sourceProvenance.derivedMedia, 'assets/recognizing-life-receiving-abundance/cover.webp');
  assert.equal(strings._meta.sourceProvenance.derivedMediaClass, 'REPRESENTATIVE_NOT_EVIDENCE');
});

test('RECORD-READER-SECOND-CONSUMER: shared site accessibility remains the only speech owner', () => {
  const page = read('pages/' + SLUG + '.html');
  for (const forbidden of [
    'KokoroNarrationProvider',
    'BrowserSpeechNarrationProvider',
    'speechSynthesis',
    'SpeechSynthesisUtterance',
    'KOKORO_MODEL_ID',
  ]) {
    assert.equal(page.includes(forbidden), false, forbidden + ' must not be reintroduced by the second record reader');
  }
});

test('RECORD-READER-SECOND-CONSUMER: repository projections use rightful write-side owners', () => {
  const nodes = JSON.parse(read('data/nodes.json'));
  const arcs = JSON.parse(read('data/arcs-v2.json'));
  const views = JSON.parse(read('data/viewmodels.json'));
  const strings = JSON.parse(read('data/strings/source/pages/' + SLUG + '.json'));

  const node = nodes.find(x => x.slug === SLUG);
  assert.ok(node, 'node registry must contain the second arc');
  assert.deepEqual(node.arcKeys, ['convos_with_god', 'victors_record', 'full_timeline']);

  for (const key of ['convos_with_god', 'victors_record']) {
    const slugs = arcs[key].sections.flatMap(section => section.slugs || []);
    const first = slugs.indexOf('returning-scorpions-to-god');
    const second = slugs.indexOf(SLUG);
    assert.notEqual(first, -1, key + ' must retain the first arc');
    assert.equal(second, first + 1, key + ' must place the second arc immediately after the first');
  }

  assert.equal(views[SLUG].scopes[0], 'pages.' + SLUG);
  assert.equal(strings._meta.sourceProvenance.parentHead, SOURCE_HEAD);
  assert.equal(strings._meta.sourceProvenance.derivedCommentary,
    'records/commentary/2026-10-18-recognizing-life-receiving-abundance-successor-witness.md');
});

// [VXG RealForever]
