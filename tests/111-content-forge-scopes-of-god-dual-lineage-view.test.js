'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const read = (relative) => fs.readFileSync(path.join(ROOT, relative), 'utf8').replace(/\r\n/g, '\n');
const page = read('pages/scopes-of-god.html');
const standalone = read('docs/ingestion/source-pages/part-022/scopes-of-god.html');
const transcriptSource = JSON.parse(read('data/strings/source/pages/scopes-of-god.json'));
const presentationSource = JSON.parse(read('data/strings/source/lineages/scopes-of-god-presentation.json'));

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
    .replace(/<script\b[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&#x27;/gi, "'")
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

test('SCOPES-OF-GOD-DUAL-LINEAGE: one canonical route exposes Presentation and Source transcript as distinct preserved sources', () => {
  assert.match(page, /class="lineage-switch" role="tablist"/);
  assert.match(page, /id="scopes-of-god-view-presentation"[^>]*role="tab"[^>]*aria-selected="true"/);
  assert.match(page, /id="scopes-of-god-view-transcript"[^>]*role="tab"[^>]*aria-selected="false"/);
  assert.match(page, /id="scopes-of-god-presentation"[^>]*role="tabpanel"[^>]*data-lineage-view="presentation"[^>]*data-source-lineage="docs\/ingestion\/source-pages\/part-022\/scopes-of-god\.html"/);
  assert.match(page, /id="scopes-of-god-source-transcript"[^>]*role="tabpanel"[^>]*aria-hidden="true"[^>]*data-lineage-view="transcript"[^>]*data-source-lineage="docs\/ingestion\/source-pages\/part-026\/convos-with-god-scopes-of-god\.html"/);
});

test('SCOPES-OF-GOD-DUAL-LINEAGE: Presentation preserves authored Part-022 visible body and excludes legacy page chrome/runtime', () => {
  const preservedMain = between(standalone, '<main', '</main>');
  const sourceBody = preservedMain.slice(
    preservedMain.indexOf('<div class="entry-meta">'),
    preservedMain.indexOf('<div id="arcNavMount"')
  );
  const projected = between(page, '<!-- PART-022-PRESENTATION-BEGIN -->', '<!-- PART-022-PRESENTATION-END -->');
  assert.equal(visibleText(projected), visibleText(sourceBody));
  assert.doesNotMatch(projected, /← Archives/);
  assert.doesNotMatch(projected, /__rescue|__vex|VEXTREME_ARCS|archive-renderer|section-toggle|bc-nav/);
});

test('SCOPES-OF-GOD-DUAL-LINEAGE: Source transcript remains bound to accepted Part-026 source identity', () => {
  const transcriptPanel = between(page, '<article class="lineage-sheet transcript-sheet"', '</article>');
  const transcriptKeys = sourceKeys(transcriptSource);
  assert.equal(transcriptKeys.length, 143);
  const documentTitleKey = 'pages.scopes-of-god.document-title';
  assert.match(page, new RegExp('data-i18n="' + escapeRegExp(documentTitleKey) + '"'));
  for (const key of transcriptKeys.filter((item) => item !== documentTitleKey)) {
    assert.match(transcriptPanel, new RegExp('data-i18n="' + escapeRegExp(key) + '"'));
  }
  assert.equal(transcriptSource._meta.sourceProvenance.preservedPath,
    'docs/ingestion/source-pages/part-026/convos-with-god-scopes-of-god.html');
  assert.equal(transcriptSource._meta.sourceProvenance.preservedGitBlob,
    '6518d2ca81fa42c4e556b018a78bd44b3ea2afc1');
});

test('SCOPES-OF-GOD-DUAL-LINEAGE: Part-022 Presentation lineage is collision-free and excludes historical shell identities', () => {
  const presentationKeys = sourceKeys(presentationSource);
  const transcriptKeys = new Set(sourceKeys(transcriptSource));
  assert.equal(presentationKeys.length, 90);
  assert.equal(presentationSource._meta.preservedPresentationKeyCount, 53);
  assert.equal(presentationSource._meta.pageLocalPresentationAddedKeyCount, 31);
  assert.equal(presentationSource._meta.presentationVisibleLocalizationKeyCount, 84);
  assert.equal(presentationSource._meta.totalLineageSourceKeyCount, 90);
  assert.equal(presentationSource._meta.sourceProvenance.preservedPath,
    'docs/ingestion/source-pages/part-022/scopes-of-god.html');
  assert.equal(presentationSource._meta.sourceProvenance.preservedGitBlob,
    '3213beb49603a0ce0f7a979679aa0f34f898be78');
  assert.equal(presentationKeys.some((key) => key.includes('.title-8ca9da33cb14.')), false);
  assert.equal(presentationKeys.some((key) => key.includes('.link-67dae971b7db.')), false);
  assert.equal(presentationKeys.some((key) => key.startsWith('common.')), false);
  assert.deepEqual(presentationKeys.filter((key) => transcriptKeys.has(key)), []);
});

test('SCOPES-OF-GOD-DUAL-LINEAGE: every visible Presentation localization identity is bound and Global Core complete', () => {
  const panel = between(page, '<!-- PART-022-PRESENTATION-BEGIN -->', '<!-- PART-022-PRESENTATION-END -->');
  const bound = new Set([...panel.matchAll(/data-i18n="([^"]+)"/g)].map((match) => match[1]));
  const interfaceKeys = new Set(presentationSource._meta.pageLocalInterfaceKeys);
  const source = sourceKeys(presentationSource);
  const visibleKeys = source.filter((key) => !interfaceKeys.has(key));
  assert.equal(visibleKeys.length, 84);
  assert.deepEqual(visibleKeys.filter((key) => !bound.has(key)), []);
  const targets = presentationSource._meta.targetLocales;
  assert.deepEqual(targets, ['zh', 'ja', 'ko', 'fr', 'de', 'es', 'pt', 'ar', 'hi']);
  for (const key of source) {
    const entry = presentationSource[key];
    assert.equal(typeof entry?.strings?.en?.text, 'string', key + ': missing EN');
    for (const locale of targets) {
      assert.equal(typeof entry?.strings?.[locale]?.text, 'string', key + ': missing ' + locale);
      assert.notEqual(entry.strings[locale].text.length, 0, key + ': blank ' + locale);
    }
  }
});

test('SCOPES-OF-GOD-DUAL-LINEAGE: switch is shareable, keyboard accessible, inert-aware, height-aware, and reduced-motion safe', () => {
  assert.match(page, /new URL\(window\.location\.href\)\.searchParams\.get\('view'\)/);
  assert.match(page, /url\.searchParams\.set\('view',view\)/);
  assert.match(page, /event\.key!=='ArrowLeft'&&event\.key!=='ArrowRight'/);
  assert.match(page, /button\.tabIndex=active\?0:-1/);
  assert.match(page, /sheet\.setAttribute\('aria-hidden',active\?'false':'true'\)/);
  assert.match(page, /if\('inert' in sheet\)sheet\.inert=!active/);
  assert.match(page, /var height=active\.scrollHeight/);
  assert.match(page, /new ResizeObserver/);
  assert.match(page, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(page, /\.lineage-stack,\.lineage-sheet,\.lineage-switch button \{ transition:none !important; \}/);
});

// [VXG RealForever]
