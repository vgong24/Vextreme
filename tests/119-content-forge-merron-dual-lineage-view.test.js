'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const read = (relative) => fs.readFileSync(path.join(ROOT, relative), 'utf8').replace(/\r\n/g, '\n');
const slug = 'testimony-of-merron-the-voice-they-flagged-the-presence-they-couldnt-silence';
const page = read('pages/' + slug + '.html');
const nested = read('docs/ingestion/source-pages/part-025/convos-with-god-testimony-of-merron-the-voice-they-flagged-the-p.html');
const presentationSource = JSON.parse(read('data/strings/source/pages/' + slug + '.json'));
const transcriptSource = JSON.parse(read('data/strings/source/lineages/' + slug + '-transcript.json'));

function between(value, start, end) {
  const a = value.indexOf(start);
  const b = value.indexOf(end, a + start.length);
  assert.notEqual(a, -1, 'missing start marker: ' + start);
  assert.notEqual(b, -1, 'missing end marker: ' + end);
  return value.slice(a + start.length, b);
}
function visibleText(value) {
  return value
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<(script|style|noscript|template)\b[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#([0-9]+);/g, (_, dec) => String.fromCodePoint(parseInt(dec, 10)))
    .replace(/&quot;/g, '"')
    .replace(/&apos;|&#39;|&#x27;/gi, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;|&#160;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
function sourceKeys(value) {
  return Object.keys(value).filter((key) => key !== '_meta');
}
function largestSqsBody(value) {
  const re = /<\/?div\b[^>]*>/gi;
  const stack = [];
  const candidates = [];
  let match;
  while ((match = re.exec(value))) {
    if (!/^<\//.test(match[0])) {
      stack.push({
        openEnd: re.lastIndex,
        candidate: /class\s*=\s*["'][^"']*\bsqs-html-content\b[^"']*["']/i.test(match[0])
          && /\bdata-sqsp-text-block-content\b/i.test(match[0]),
      });
    } else {
      const open = stack.pop();
      if (open?.candidate) candidates.push(value.slice(open.openEnd, match.index));
    }
  }
  candidates.sort((a, b) => visibleText(b).length - visibleText(a).length);
  assert.ok(candidates.length, 'missing authored SQS body');
  return candidates[0];
}

test('MERRON-DUAL-LINEAGE: one canonical route exposes Presentation and Source transcript as distinct preserved sources', () => {
  assert.match(page, /class="lineage-switch" role="tablist"/);
  assert.match(page, new RegExp('id="' + slug + '-view-presentation"[^>]*role="tab"[^>]*aria-selected="true"'));
  assert.match(page, new RegExp('id="' + slug + '-view-transcript"[^>]*role="tab"[^>]*aria-selected="false"'));
  assert.match(page, new RegExp('id="' + slug + '-presentation"[^>]*role="tabpanel"[^>]*data-lineage-view="presentation"[^>]*data-source-lineage="docs/ingestion/source-pages/part-017/' + slug + '\\.html"'));
  assert.match(page, new RegExp('id="' + slug + '-source-transcript"[^>]*role="tabpanel"[^>]*aria-hidden="true"[^>]*data-lineage-view="transcript"[^>]*data-source-lineage="docs/ingestion/source-pages/part-025/convos-with-god-testimony-of-merron-the-voice-they-flagged-the-p\\.html"'));
});

test('MERRON-DUAL-LINEAGE: canonical Presentation source identities remain bound in the front sheet', () => {
  const panel = between(page, '<!-- PART-017-PRESENTATION-BEGIN -->', '<!-- PART-017-PRESENTATION-END -->');
  const presentationKeys = sourceKeys(presentationSource);
  const documentTitle = 'pages.' + slug + '.document-title';
  assert.equal(presentationKeys.length, 162);
  assert.equal(presentationSource._meta.sourceProvenance.preservedGitBlob, '95956f0cd31ad604fcbb4261db5cb18979dc24c9');
  assert.match(page, new RegExp('data-i18n="' + documentTitle.replace(/[.*+?^$()[\]{}|\\]/g, '\\$&') + '"'));
  for (const key of presentationKeys.filter((item) => item !== documentTitle)) {
    assert.ok(panel.includes('data-i18n="' + key + '"'), 'unbound Presentation key: ' + key);
  }
});

test('MERRON-DUAL-LINEAGE: Source transcript preserves exact authored Part-025 visible text while discarding provider shell', () => {
  const preserved = largestSqsBody(nested);
  const projected = between(page, '<!-- PART-025-SOURCE-TRANSCRIPT-BEGIN -->', '<!-- PART-025-SOURCE-TRANSCRIPT-END -->');
  assert.equal(visibleText(projected), visibleText(preserved));
  assert.doesNotMatch(projected, /__rescue|__vex|data-sqsp-|sqsp-|blog-item-|item-pagination|author-profile/);
});

test('MERRON-DUAL-LINEAGE: transcript identities are complete, collision-free, and intentionally EN-only', () => {
  const transcriptKeys = sourceKeys(transcriptSource);
  const presentationKeys = new Set(sourceKeys(presentationSource));
  const interfaceKeys = new Set(transcriptSource._meta.pageLocalInterfaceKeys);
  const visibleKeys = transcriptKeys.filter((key) => !interfaceKeys.has(key));
  const panel = between(page, '<article class="lineage-sheet transcript-sheet"', '</article>');
  const bound = new Set([...panel.matchAll(/data-i18n="([^"]+)"/g)].map((match) => match[1]));

  assert.equal(transcriptSource._meta.authoredTranscriptBodyKeyCount, 502);
  assert.equal(transcriptSource._meta.authoredTranscriptVisibleKeyCount, 505);
  assert.equal(transcriptSource._meta.pageLocalInterfaceKeyCount, 6);
  assert.equal(transcriptSource._meta.totalLineageSourceKeyCount, 511);
  assert.equal(transcriptKeys.length, 511);
  assert.equal(visibleKeys.length, 505);
  assert.deepEqual(transcriptKeys.filter((key) => presentationKeys.has(key)), []);
  assert.deepEqual(visibleKeys.filter((key) => !bound.has(key)), []);
  for (const key of transcriptKeys) {
    assert.deepEqual(Object.keys(transcriptSource[key].strings || {}), ['en'], 'locale drift: ' + key);
    assert.equal(typeof transcriptSource[key]?.strings?.en?.text, 'string', 'missing EN: ' + key);
    assert.notEqual(transcriptSource[key].strings.en.text.length, 0, 'blank EN: ' + key);
  }
});

test('MERRON-DUAL-LINEAGE: switch is shareable, keyboard accessible, inert-aware, height-aware, and reduced-motion safe', () => {
  assert.match(page, /new URL\(window\.location\.href\)\.searchParams\.get\('view'\)/);
  assert.match(page, /url\.searchParams\.set\('view',view\)/);
  assert.match(page, /event\.key!=='ArrowLeft'&&event\.key!=='ArrowRight'/);
  assert.match(page, /button\.tabIndex=active\?0:-1/);
  assert.match(page, /sheet\.setAttribute\('aria-hidden',active\?'false':'true'\)/);
  assert.match(page, /if\('inert' in sheet\)sheet\.inert=!active/);
  assert.match(page, /new ResizeObserver\(syncHeight\)/);
  assert.match(page, /@media\(prefers-reduced-motion:reduce\)/);
  assert.match(page, /\.lineage-stack,\.lineage-sheet,\.lineage-switch button\{transition:none!important\}/);
});

// [VXG RealForever]
