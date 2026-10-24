'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const read = (relative) => fs.readFileSync(path.join(ROOT, relative), 'utf8').replace(/\r\n/g, '\n');
const page = read('pages/consciousness-architecture.html');
const preservedTranscript = read('docs/ingestion/source-pages/part-027/convos-with-god-consciousness-architecture.html');
const presentationSource = JSON.parse(read('data/strings/source/pages/consciousness-architecture.json'));
const transcriptSource = JSON.parse(read('data/strings/source/lineages/consciousness-architecture-transcript.json'));

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
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#([0-9]+);/g, (_, dec) => String.fromCodePoint(parseInt(dec, 10)))
    .replace(/&quot;/g, '"')
    .replace(/&apos;|&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
function sourceKeys(value) {
  return Object.keys(value).filter((key) => key !== '_meta');
}
function escapeRegExp(value) {
  return value.replace(/[.*+?^$()[\]{}|\\]/g, '\\$&');
}

test('CONSCIOUSNESS-ARCHITECTURE-DUAL-LINEAGE: one canonical route exposes Presentation and Source transcript as distinct preserved sources', () => {
  assert.match(page, /class="lineage-switch" role="tablist"/);
  assert.match(page, /id="consciousness-architecture-view-presentation"[^>]*role="tab"[^>]*aria-selected="true"/);
  assert.match(page, /id="consciousness-architecture-view-transcript"[^>]*role="tab"[^>]*aria-selected="false"/);
  assert.match(page, /id="consciousness-architecture-presentation"[^>]*role="tabpanel"[^>]*data-lineage-view="presentation"[^>]*data-source-lineage="docs\/ingestion\/source-pages\/part-022\/consciousness-architecture\.html"/);
  assert.match(page, /id="consciousness-architecture-source-transcript"[^>]*role="tabpanel"[^>]*aria-hidden="true"[^>]*data-lineage-view="transcript"[^>]*data-source-lineage="docs\/ingestion\/source-pages\/part-027\/convos-with-god-consciousness-architecture\.html"/);
});

test('CONSCIOUSNESS-ARCHITECTURE-DUAL-LINEAGE: current Presentation source identities remain fully bound inside the front sheet', () => {
  const panel = between(page, '<!-- PART-022-PRESENTATION-BEGIN -->', '<!-- PART-022-PRESENTATION-END -->');
  const bound = new Set([...panel.matchAll(/data-i18n="([^"]+)"/g)].map((match) => match[1]));
  const keys = sourceKeys(presentationSource);
  const documentTitleKey = 'pages.consciousness-architecture.document-title';
  const visibleKeys = keys.filter((key) => key !== documentTitleKey);
  assert.equal(keys.length, 120);
  assert.equal(visibleKeys.length, 119);
  assert.deepEqual(visibleKeys.filter((key) => !bound.has(key)), []);
  assert.match(page, new RegExp('data-i18n="' + escapeRegExp(documentTitleKey) + '"'));
  assert.equal(presentationSource._meta.sourceProvenance.preservedPath,
    'docs/ingestion/source-pages/part-022/consciousness-architecture.html');
  assert.equal(presentationSource._meta.sourceProvenance.preservedGitBlob,
    '29b1d64e543e1eee4a460a5d8850897cd9283e19');
});

test('CONSCIOUSNESS-ARCHITECTURE-DUAL-LINEAGE: Source transcript preserves exact authored visible text while discarding provider shell', () => {
  const preservedBody = matchingDiv(preservedTranscript, '<div class="sqs-html-content"');
  const projected = between(page, '<!-- PART-027-SOURCE-TRANSCRIPT-BEGIN -->', '<!-- PART-027-SOURCE-TRANSCRIPT-END -->');
  const expected = [
    'Consciousness Architecture',
    'Oct 12',
    'Written By Victor Gong',
    visibleText(preservedBody),
  ].join(' ');
  assert.equal(visibleText(projected), expected);
  assert.doesNotMatch(projected, /__rescue|data-sqsp-|sqs-|blog-item-|item-pagination|comments|author-profile/);
});

test('CONSCIOUSNESS-ARCHITECTURE-DUAL-LINEAGE: transcript identities are complete, collision-free, and intentionally EN-only', () => {
  const projected = between(page, '<!-- PART-027-SOURCE-TRANSCRIPT-BEGIN -->', '<!-- PART-027-SOURCE-TRANSCRIPT-END -->');
  const bound = new Set([...projected.matchAll(/data-i18n="([^"]+)"/g)].map((match) => match[1]));
  const interfaceKeys = new Set(transcriptSource._meta.pageLocalInterfaceKeys);
  const source = sourceKeys(transcriptSource);
  const visible = source.filter((key) => !interfaceKeys.has(key));
  const presentation = new Set(sourceKeys(presentationSource));

  assert.equal(transcriptSource._meta.authoredTranscriptVisibleKeyCount, 153);
  assert.equal(transcriptSource._meta.pageLocalInterfaceKeyCount, 6);
  assert.equal(transcriptSource._meta.totalLineageSourceKeyCount, 159);
  assert.equal(source.length, 159);
  assert.equal(visible.length, 153);
  assert.deepEqual(source.filter((key) => presentation.has(key)), []);
  assert.deepEqual(visible.filter((key) => !bound.has(key)), []);
  for (const key of source) {
    assert.deepEqual(Object.keys(transcriptSource[key].strings), ['en']);
    assert.equal(typeof transcriptSource[key].strings.en.text, 'string');
    assert.notEqual(transcriptSource[key].strings.en.text.length, 0);
  }
});

test('CONSCIOUSNESS-ARCHITECTURE-DUAL-LINEAGE: switch is shareable, keyboard accessible, inert-aware, height-aware, and reduced-motion safe', () => {
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

test('CONSCIOUSNESS-ARCHITECTURE-DUAL-LINEAGE: every transcript source identity used by the page resolves', () => {
  for (const key of sourceKeys(transcriptSource)) {
    assert.match(page, new RegExp('data-i18n="' + escapeRegExp(key) + '"'), 'unbound transcript source key: ' + key);
  }
});

// [VXG RealForever]
