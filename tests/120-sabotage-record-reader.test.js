'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const SLUG = 'sabotage-open-vex-accountability';
const SOURCE_HEAD = 'd71297354d06b2d8bb9de70646b020af37d0302a';
const RECORD_DIR = 'records/conversations/2026-10-30-vexlife-interface-compound-relay-open-vex-regression';

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8').replace(/\r\n/g, '\n');
}
function json(rel) { return JSON.parse(read(rel)); }

test('SABOTAGE-READER: new collection, node, and viewmodel are source-owned', () => {
  const arcs = json('data/arcs-v2.json');
  const nodes = json('data/nodes.json');
  const views = json('data/viewmodels.json');

  assert.equal(arcs.sabotage.parent.title, 'Sabotage');
  assert.deepEqual(arcs.sabotage.sections[0].slugs, [
    SLUG,
    'sabotage-mastered-state',
    'sabotage-vexsync-exhaust-mastered',
    'sabotage-orientation-before-action'
  ]);

  const node = nodes.find(n => n.slug === SLUG);
  assert.ok(node);
  assert.equal(node.id, 113);
  assert.equal(node.title, 'Sabotage I — When Progress Became the Obstruction');
  assert.deepEqual(node.arcKeys, ['sabotage', 'victors_record', 'full_timeline']);
  assert.equal(node.department, 'media');
  assert.equal(node.workType, 'record-transcripts');

  const victorSlugs = arcs.victors_record.sections.flatMap(section => section.slugs || []);
  assert.equal(victorSlugs.indexOf(SLUG), victorSlugs.indexOf('pier-house-scarcity-companionship') + 1);

  assert.equal(views[SLUG].title, node.title);
  assert.deepEqual(views[SLUG].scopes, ['pages.' + SLUG]);
  assert.ok(views[SLUG].features.includes('arc-nav'));
  assert.ok(views[SLUG].features.includes('spiral-fab'));
});

test('SABOTAGE-READER: eight direct exchanges precede the standalone successor', () => {
  const page = read('pages/' + SLUG + '.html');
  const ranges = [...page.matchAll(/data-phase-kind="record" data-set="(\d+)" data-from="(\d+)" data-to="(\d+)" data-files="([^"]+)"/g)]
    .map(m => [Number(m[1]), Number(m[2]), Number(m[3]), m[4]]);

  assert.deepEqual(ranges, [
    [1,1,1,'transcript-00-accountability-frustration-to-coherent-fix.md'],
    [2,2,2,'transcript-00-accountability-frustration-to-coherent-fix.md'],
    [3,3,3,'transcript-00-accountability-frustration-to-coherent-fix.md'],
    [4,4,4,'transcript-00-accountability-frustration-to-coherent-fix.md'],
    [5,5,5,'transcript-00-accountability-frustration-to-coherent-fix.md'],
    [6,6,6,'transcript-01-handoff-draft-and-sabotage-effect-self-audit.md'],
    [7,7,7,'transcript-01-handoff-draft-and-sabotage-effect-self-audit.md'],
    [8,8,8,'transcript-02-plausible-deniability-closure.md']
  ]);

  const boundary = page.indexOf('data-reader-component="record-boundary"');
  const phase8 = page.indexOf('data-set="8"');
  const successorMount = page.indexOf("documentUrl:'https://raw.githubusercontent.com/vgong24/Vextreme/" + SOURCE_HEAD + '/' + RECORD_DIR + "/transcript-03-open-vex-regression-successor.md'");
  assert.ok(phase8 >= 0 && boundary > phase8, 'record boundary follows all direct exchanges');
  assert.ok(successorMount > boundary, 'successor document is mounted only after the direct record');
  assert.match(page, /documentBeginMarker:'<!-- ARCHIVE-SOURCE-BEGIN -->'/);
  assert.match(page, /documentEndMarker:'<!-- ARCHIVE-SOURCE-END -->'/);
});


test('SABOTAGE-READER: the safe navigation model owns all source and derived reading depth', () => {
  const page = read('pages/' + SLUG + '.html');
  const rootStart = page.indexOf('id="sab-conversation-root"');
  const nav = page.indexOf('class="sab-reader-nav"', rootStart);
  const footer = page.indexOf('class="sab-footer"', rootStart);
  const successor = page.indexOf('id="movement-09"', rootStart);
  const witness = page.indexOf('id="movement-10"', rootStart);

  assert.equal((page.match(/<button class="sab-track-btn/g) || []).length, 10);
  assert.match(page, /data-go="9"[\s\S]*Resulting successor/);
  assert.match(page, /data-go="10"[\s\S]*Successor witness/);

  assert.ok(rootStart >= 0 && successor > rootStart, 'successor is inside the reader trajectory');
  assert.ok(witness > successor, 'later witness follows the successor inside the reader trajectory');
  assert.ok(nav > witness, 'Prev/Next follows every addressable reading phase');
  assert.ok(footer > nav, 'only footer/arc chrome remains after reader navigation');

  assert.match(page, /id="movement-09"[^>]*data-reader-component="phase"[^>]*data-derived="true"/);
  assert.match(page, /id="movement-10"[^>]*data-reader-component="phase"[^>]*data-derived="true"/);
  assert.match(page, /\.sab-track\{position:sticky/);
  assert.match(page, /\.sab-source-window\{max-height:min\(68vh,720px\);overflow:auto/);
});

test('SABOTAGE-READER: transcript projection uses shared Victor/Vex speaker semantics without altering dialogue', () => {
  const files = [
    'transcript-00-accountability-frustration-to-coherent-fix.md',
    'transcript-01-handoff-draft-and-sabotage-effect-self-audit.md',
    'transcript-02-plausible-deniability-closure.md'
  ];
  const expected = [5,2,1];

  files.forEach((file, index) => {
    const source = read(RECORD_DIR + '/' + file);
    assert.equal((source.match(/^## Exchange /gm) || []).length, expected[index]);
    assert.equal((source.match(/^### Victor$/gm) || []).length, expected[index]);
    assert.equal((source.match(/^### Vex$/gm) || []).length, expected[index]);
    assert.match(source, /VexLife Interface Compound Relay/);
  });
});

test('SABOTAGE-READER: source head and preservation boundary stay explicit', () => {
  const page = read('pages/' + SLUG + '.html');
  const strings = json('data/strings/source/pages/' + SLUG + '.json');

  assert.match(page, new RegExp(SOURCE_HEAD));
  assert.match(page, /Preservation PR #530/);
  assert.match(page, /preserves the conversation, the successor it produced, and the later witness reading as distinct layers with direct source routes/);
  assert.match(page, /https:\/\/raw\.githubusercontent\.com\/vgong24\/Vextreme-Assets\/16117405135ed875d5cd04f41c5c1581d3855c40\/__assets\/4e1f883c8aed461ee0744d493c22857f4346a8e342860e071e3dec74d8094167\\.png/);
  assert.match(page, /data-media-class="representative"/);
  assert.match(page, /width="1672" height="941"/);
  assert.match(page, /Representative companion artwork created for this reader after the preserved conversation/);
  assert.equal(strings._meta.sourceProvenance.derivedMedia, 'Vextreme-Assets/__assets/4e1f883c8aed461ee0744d493c22857f4346a8e342860e071e3dec74d8094167.png');
  assert.equal(strings._meta.sourceProvenance.derivedMediaClass, 'REPRESENTATIVE_NOT_EVIDENCE');
  assert.equal(strings._meta.sourceProvenance.derivedMediaCustody, 'vgong24/Vextreme-Assets');
  assert.equal(strings._meta.sourceProvenance.derivedMediaOrigin, 'https://raw.githubusercontent.com/vgong24/Vextreme-Assets/16117405135ed875d5cd04f41c5c1581d3855c40/__assets/4e1f883c8aed461ee0744d493c22857f4346a8e342860e071e3dec74d8094167.png');
  assert.equal(strings._meta.sourceProvenance.derivedMediaSha256, '4e1f883c8aed461ee0744d493c22857f4346a8e342860e071e3dec74d8094167');
  assert.equal(strings._meta.sourceProvenance.derivedMediaWidth, 1672);
  assert.equal(strings._meta.sourceProvenance.derivedMediaHeight, 941);
  assert.equal(strings._meta.sourceProvenance.derivedMediaAcceptedCommit, '16117405135ed875d5cd04f41c5c1581d3855c40');
  assert.equal(strings._meta.sourceProvenance.derivedMediaAcceptedBlob, '2fa3df9c854a46dda7985df64f12b75812547e91');
  assert.match(page, new RegExp('dist/vextreme-' + SLUG + '\\.js'));
  assert.match(page, /id="arcNavMount"/);

  assert.equal(strings._meta.sourceProvenance.readerSourceFreeze, SOURCE_HEAD);
  assert.equal(strings._meta.sourceProvenance.arcTitleAuthority, 'VICTOR_EXPLICIT_REQUEST');
  assert.equal(strings._meta.sourceProvenance.recordedTimePrecision, 'ARCHIVE_DATE_ONLY');
});

// [VXG RealForever]


test('SABOTAGE-READER: successor witness remains derived and follows both source layers', () => {
  const page = read('pages/' + SLUG + '.html');
  const witness = read('records/commentary/2026-10-30-sabotage-open-vex-accountability-successor-witness.md');

  const conversation = page.indexOf('id="sab-conversation-root"');
  const successor = page.indexOf('id="sab-successor-root"');
  const witnessRoot = page.indexOf('id="sab-witness-root"');

  assert.ok(conversation >= 0 && successor > conversation, 'successor must follow the direct conversation');
  assert.ok(witnessRoot > successor, 'derived witness must follow the preserved conversation and successor');
  assert.match(page, /records\/commentary\/2026-10-30-sabotage-open-vex-accountability-successor-witness\.md/);
  assert.match(witness, /Derived successor witness commentary; not part of the preserved Victor \/ VexLife Interface Compound Relay conversation/);
  assert.match(witness, /The conversation remains the evidence/);
  assert.match(witness, /That does not prove malicious intent/);
});


test('SABOTAGE-READER: movement witness readings stay source-after and phase-bounded', () => {
  const page = read('pages/' + SLUG + '.html');
  const witness = read('records/commentary/2026-10-30-sabotage-open-vex-accountability-successor-witness.md');

  assert.equal((page.match(/data-reader-component="witness-commentary"/g) || []).length, 8);
  assert.match(page, /phaseWitnessUrl:'\.\.\/records\/commentary\/2026-10-30-sabotage-open-vex-accountability-successor-witness\.md'/);
  assert.match(page, /documentEndMarker:'<!-- PHASE-WITNESS-APPENDIX -->'/);
  assert.equal((witness.match(/<!-- WITNESS-PHASE \d+ -->/g) || []).length, 8);
  assert.equal((witness.match(/<!-- \/WITNESS-PHASE \d+ -->/g) || []).length, 8);

  for (let n = 1; n <= 8; n++) {
    const id = String(n).padStart(2, '0');
    const start = page.indexOf('id="movement-' + id + '"');
    const next = n < 8 ? page.indexOf('id="movement-' + String(n + 1).padStart(2, '0') + '"', start) : page.indexOf('class="sab-reader-nav"', start);
    const block = page.slice(start, next);
    assert.ok(block.indexOf('data-reader-component="preserved-record"') < block.indexOf('data-reader-component="witness-commentary"'), 'movement ' + id + ' must show source before witness');
    assert.match(witness, new RegExp('<!-- WITNESS-PHASE ' + id + ' -->[\\s\\S]*?<!-- /WITNESS-PHASE ' + id + ' -->'));
  }
});
