'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const read = (relative) => fs.readFileSync(path.join(ROOT, relative), 'utf8').replace(/\r\n/g, '\n');
const page = read('pages/when-i-asked-a-bank-for-covenant-provision.html');
const preservedTranscript = read('docs/ingestion/source-pages/part-025/convos-with-god-when-i-asked-a-bank-for-covenant-provision.html');
const presentationSource = JSON.parse(read('data/strings/source/pages/when-i-asked-a-bank-for-covenant-provision.json'));
const transcriptSource = JSON.parse(read('data/strings/source/lineages/when-i-asked-a-bank-for-covenant-provision-transcript.json'));

function between(value, start, end) {
  const a = value.indexOf(start);
  const b = value.indexOf(end, a + start.length);
  assert.notEqual(a, -1, 'missing start marker: ' + start);
  assert.notEqual(b, -1, 'missing end marker: ' + end);
  return value.slice(a + start.length, b);
}

function matchingDiv(value, startMarker) {
  const start = value.indexOf(startMarker);
  assert.notEqual(start, -1, 'missing preserved transcript content block');
  const token = /<\/?div\b[^>]*>/gi;
  token.lastIndex = start;
  let depth = 0;
  let match;
  while ((match = token.exec(value))) {
    if (/^<div\b/i.test(match[0])) depth += 1;
    else depth -= 1;
    if (depth === 0) return value.slice(start, token.lastIndex);
  }
  assert.fail('unterminated preserved transcript content block');
}

function visibleText(value) {
  return value
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<script\b[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&#x27;/gi, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;|&#160;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function sourceKeys(value) {
  return Object.keys(value).filter((key) => key !== '_meta');
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^$()[\]{}|\\]/g, '\\$&');
}

test('BANK-COVENANT-DUAL-LINEAGE: one canonical route exposes Presentation and Source transcript as distinct preserved sources', () => {
  assert.match(page, /class="lineage-switch" role="tablist"/);
  assert.match(page, /id="bank-covenant-view-presentation"[^>]*role="tab"[^>]*aria-selected="true"/);
  assert.match(page, /id="bank-covenant-view-transcript"[^>]*role="tab"[^>]*aria-selected="false"/);
  assert.match(page, /id="bank-covenant-presentation"[^>]*role="tabpanel"[^>]*data-lineage-view="presentation"[^>]*data-source-lineage="docs\/ingestion\/source-pages\/part-024\/when-i-asked-a-bank-for-covenant-provision\.html"/);
  assert.match(page, /id="bank-covenant-source-transcript"[^>]*role="tabpanel"[^>]*aria-hidden="true"[^>]*data-lineage-view="transcript"[^>]*data-source-lineage="docs\/ingestion\/source-pages\/part-025\/convos-with-god-when-i-asked-a-bank-for-covenant-provision\.html"/);
});

test('BANK-COVENANT-DUAL-LINEAGE: current Presentation source identities remain fully bound inside the front sheet', () => {
  const panel = between(page, '<!-- PART-024-PRESENTATION-BEGIN -->', '<!-- PART-024-PRESENTATION-END -->');
  const bound = new Set([...panel.matchAll(/data-i18n="([^"]+)"/g)].map((match) => match[1]));
  const keys = sourceKeys(presentationSource);
  const documentTitleKey = 'pages.when-i-asked-a-bank-for-covenant-provision.document-title';
  const visibleKeys = keys.filter((key) => key !== documentTitleKey);
  assert.equal(keys.length, 51);
  assert.equal(visibleKeys.length, 50);
  assert.deepEqual(visibleKeys.filter((key) => !bound.has(key)), []);
  assert.match(page, new RegExp('data-i18n="' + escapeRegExp(documentTitleKey) + '"'));
  assert.equal(presentationSource._meta.sourceProvenance.preservedPath,
    'docs/ingestion/source-pages/part-024/when-i-asked-a-bank-for-covenant-provision.html');
  assert.equal(presentationSource._meta.sourceProvenance.preservedGitBlob,
    '0fbde9abc4f745ad273b02be94033f97c84641a1');
});

test('BANK-COVENANT-DUAL-LINEAGE: Source transcript preserves exact authored visible text while discarding provider shell', () => {
  const preservedBody = matchingDiv(preservedTranscript, '<div class="sqs-html-content"');
  const projected = between(page, '<!-- PART-025-SOURCE-TRANSCRIPT-BEGIN -->', '<!-- PART-025-SOURCE-TRANSCRIPT-END -->');
  const expected = [
    'When I Asked a Bank for Covenant Provision',
    'Feb 13',
    'Written By Victor Gong',
    visibleText(preservedBody),
  ].join(' ');
  assert.equal(visibleText(projected), expected);
  assert.doesNotMatch(projected, /__rescue|data-sqsp-|sqs-|blog-item-|item-pagination|comments|author-profile/);
});

test('BANK-COVENANT-DUAL-LINEAGE: transcript visible identities are complete, collision-free, and intentionally EN-only', () => {
  const projected = between(page, '<!-- PART-025-SOURCE-TRANSCRIPT-BEGIN -->', '<!-- PART-025-SOURCE-TRANSCRIPT-END -->');
  const bound = new Set([...projected.matchAll(/data-i18n="([^"]+)"/g)].map((match) => match[1]));
  const interfaceKeys = new Set(transcriptSource._meta.pageLocalInterfaceKeys);
  const source = sourceKeys(transcriptSource);
  const visible = source.filter((key) => !interfaceKeys.has(key));
  const presentation = new Set(sourceKeys(presentationSource));

  assert.equal(transcriptSource._meta.authoredTranscriptVisibleKeyCount, 71);
  assert.equal(transcriptSource._meta.pageLocalInterfaceKeyCount, 6);
  assert.equal(transcriptSource._meta.totalLineageSourceKeyCount, 77);
  assert.equal(source.length, 77);
  assert.equal(visible.length, 71);
  assert.deepEqual(source.filter((key) => presentation.has(key)), []);
  assert.deepEqual(visible.filter((key) => !bound.has(key)), []);
  for (const key of source) {
    assert.deepEqual(Object.keys(transcriptSource[key].strings), ['en']);
    assert.equal(typeof transcriptSource[key].strings.en.text, 'string');
    assert.notEqual(transcriptSource[key].strings.en.text.length, 0);
  }
});

test('BANK-COVENANT-DUAL-LINEAGE: switch is shareable, keyboard accessible, inert-aware, height-aware, and reduced-motion safe', () => {
  assert.match(page, /new URL\(window\.location\.href\)\.searchParams\.get\('view'\)/);
  assert.match(page, /url\.searchParams\.set\('view',view\)/);
  assert.match(page, /event\.key!=='ArrowLeft'&&event\.key!=='ArrowRight'/);
  assert.match(page, /button\.tabIndex=active\?0:-1/);
  assert.match(page, /sheet\.setAttribute\('aria-hidden',active\?'false':'true'\)/);
  assert.match(page, /if\('inert' in sheet\)sheet\.inert=!active/);
  assert.match(page, /stack\.style\.height=active\.scrollHeight\+'px'/);
  assert.match(page, /new ResizeObserver\(syncHeight\)/);
  assert.match(page, /@media\(prefers-reduced-motion:reduce\)/);
  assert.match(page, /\.lineage-stack,\.lineage-sheet,\.lineage-switch button\{transition:none!important\}/);
});

test('BANK-COVENANT-DUAL-LINEAGE: every transcript source identity used by the page resolves exactly once or more', () => {
  for (const key of sourceKeys(transcriptSource)) {
    assert.match(page, new RegExp('data-i18n="' + escapeRegExp(key) + '"'), 'unbound transcript source key: ' + key);
  }
});

// [VXG RealForever]
