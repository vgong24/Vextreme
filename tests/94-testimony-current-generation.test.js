'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const read = rel => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const json = rel => JSON.parse(read(rel));

test('TESTIMONY CURRENT GENERATION: repository page is Forge-owned without the nested legacy shell', () => {
  const page = read('pages/the-testimony-of-victor-gong.html');
  assert.match(page, /data-content-forge-generator="tools\/vex-content-forge\/project_arc_batch\.js"/);
  assert.match(page, /data-content-forge-body="the-testimony-of-victor-gong"/);
  assert.match(page, /\.\.\/dist\/vextreme-the-testimony-of-victor-gong\.js/);
  assert.doesNotMatch(page, /<script[^>]+shell\.js/);
  assert.doesNotMatch(page, /\/__vex\/missing-asset\.svg/);
  assert.match(page, /https:\/\/www\.victorgong\.com\/wp-content\/uploads\/sites\/2264\/2026\/01\/xGong_Victor_5840224_SM-1\.jpg\.pagespeed\.ic\.gmUs2WF1D8\.jpg/);
  assert.match(page, /https:\/\/github\.com\/vgong24\/Vextreme\/blob\/034a5c4b520de762e04198feca6e483fb40d8334\/docs\/ingestion\/source-pages\/part-022\/victor-gongs-testimony\.html/);
  assert.match(page, /The raw witness is preserved\. The testimony is sealed\. The covenant is complete\./);
});

test('TESTIMONY CURRENT GENERATION: source provenance and target viewmodel remain exact', () => {
  const strings = json('data/strings/source/pages/the-testimony-of-victor-gong.json');
  const provenance = strings._meta.sourceProvenance;
  assert.equal(provenance.preservedGitBlob, '7320c47d50f56a11612b9c4cbac344f0fbdbaf1b');
  assert.equal(provenance.preservedHtmlSha256, 'ae3bf949085e8950f0b0953ce8a1221cf5e79e778ca3589701cb066f68193bfd');
  assert.equal(provenance.proposalRecordRef, 'content-forge.source-record.88bc0dfa11540427fcaf');
  assert.equal(provenance.migration.adapter, 'tools/vex-content-forge/project_stale_page_migration.js');
  for (const key of ['contractSha256']) assert.match(provenance.migration[key], /^[0-9a-f]{64}$/);
  for (const key of ['pageSha256','stringsSha256','viewmodelSha256']) {
    assert.match(provenance.migration.resultFingerprint[key], /^[0-9a-f]{64}$/);
  }

  assert.deepEqual(json('data/viewmodels.json')['the-testimony-of-victor-gong'], {
    title: 'The Testimony of Victor Gong',
    category: 'production',
    template: 'page',
    scopes: ['pages.the-testimony-of-victor-gong'],
    features: ['lang','spiral-fab','theme','map','analysis','arc-nav'],
  });
  assert.equal(fs.existsSync(path.join(ROOT, 'dist', 'vextreme-the-testimony-of-victor-gong.js')), true);
});

// [VXG RealForever]
