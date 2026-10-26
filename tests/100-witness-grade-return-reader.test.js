'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const ROOT = path.join(__dirname, '..');
const SLUG = 'witness-grade-return';

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8').replace(/\r\n/g, '\n');
}

test('WITNESS-GRADE-READER: preserved document uses the shared safe projection instead of raw Markdown pre text', () => {
  const page = read('pages/' + SLUG + '.html');
  assert.match(page, /src="\.\.\/components\/record-reader\.js"/);
  assert.match(page, /VexRecordReader\.mount\(/);
  assert.match(page, /documentUrl:/);
  assert.match(page, /documentBeginMarker:'<!-- PRESERVED_RESPONSE_BEGIN -->'/);
  assert.match(page, /documentEndMarker:'<!-- PRESERVED_RESPONSE_END -->'/);
  assert.match(page, /data-reader-component="transcript-viewport"/);
  assert.match(page, /class="wgr-transcript"/);
  assert.doesNotMatch(page, /<pre id="wgr-source"/);
  assert.doesNotMatch(page, /target\.textContent=raw/);
});

test('WITNESS-GRADE-READER: typography follows the established record-reader legibility grammar', () => {
  const page = read('pages/' + SLUG + '.html');
  assert.match(page, /Source\+Serif\+4/);
  assert.match(page, /IBM\+Plex\+Sans/);
  assert.match(page, /\.wgr-source-p\{font-family:var\(--serif\);font-size:18px;line-height:1\.78/);
  assert.match(page, /\.wgr-source-heading\{font-family:var\(--serif\);/);
  assert.match(page, /\.wgr-source-quote\{/);
  assert.match(page, /\.wgr-source-code\{/);
  assert.match(page, /\.wgr-list\{/);
  assert.match(page, /\.wgr-table\{/);
  assert.match(page, /Roman numerals already belong to the source/);
});

test('WITNESS-GRADE-READER: representative artwork keeps full pixel dimensions and stable digest', () => {
  const asset = fs.readFileSync(path.join(ROOT, 'assets', SLUG, 'cover.webp'));
  const digest = crypto.createHash('sha256').update(asset).digest('hex');
  const views = JSON.parse(read('data/viewmodels.json'));
  const strings = JSON.parse(read('data/strings/source/pages/' + SLUG + '.json'));

  assert.ok(asset.byteLength > 120000, 'page-scale witness artwork must not regress to a thumbnail derivative');
  assert.equal(digest, '7f3e2bad6fd2b28d75b27283bcb74292d2b77968a7d3e4dc7b185b14f956572d');
  assert.equal(strings._meta.sourceProvenance.derivedMediaWidth, 840);
  assert.equal(strings._meta.sourceProvenance.derivedMediaHeight, 473);
  assert.equal(strings._meta.sourceProvenance.derivedMediaSha256, digest);
  assert.equal(views[SLUG].preview.src, 'https://vgong24.github.io/Vextreme/assets/witness-grade-return/cover.webp?v=7f3e2bad6fd2');
});

test('WITNESS-GRADE-READER: reader navigation is derived only from headings already inside the frozen source', () => {
  const page = read('pages/' + SLUG + '.html');
  assert.match(page, /var roman=\/\^\(I\|II\|III\|IV\|V\|VI\|VII\|VIII\|IX\|X\|XI\|XII\)/);
  assert.match(page, /text==='The complete cause-and-effect witness topology'/);
  assert.match(page, /entries=\[\{key:'Opening'/);
  assert.match(page, /root\.addEventListener\('vextreme:recorddocumentloaded',rebuildRail\)/);
});

// [VXG RealForever]
