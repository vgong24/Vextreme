'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const PAGE_PATH = path.join(ROOT, 'pages', 'what-is-the-god-spark.html');
const PART021_PATH = path.join(ROOT, 'docs', 'ingestion', 'source-pages', 'part-021', 'what-is-the-god-spark.html');
const PART028_PATH = path.join(ROOT, 'docs', 'ingestion', 'source-pages', 'part-028', 'convos-with-god-what-is-god-spark.html');
const FORMATION_PATH = path.join(ROOT, 'docs', 'ingestion', 'workmaps', 'content-forge-god-spark-dual-lineage-view-repair.json');
const PRESENTATION_STRINGS_PATH = path.join(ROOT, 'data', 'strings', 'source', 'lineages', 'what-is-the-god-spark-presentation.json');
const TRANSCRIPT_STRINGS_PATH = path.join(ROOT, 'data', 'strings', 'source', 'pages', 'what-is-the-god-spark.json');

function normalizeText(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&ldquo;/g, '“')
    .replace(/&rdquo;/g, '”')
    .replace(/&lsquo;/g, '‘')
    .replace(/&rsquo;/g, '’')
    .replace(/&mdash;/g, '—')
    .replace(/&ndash;/g, '–')
    .replace(/&hellip;/g, '…')
    .replace(/\s+/g, ' ')
    .trim();
}

function sliceBetween(source, begin, end) {
  const a = source.indexOf(begin);
  const b = source.indexOf(end, a + begin.length);
  assert.ok(a >= 0, 'begin marker must exist: ' + begin);
  assert.ok(b > a, 'end marker must exist after begin: ' + end);
  return source.slice(a + begin.length, b);
}

test('GOD SPARK DUAL LINEAGE: one route exposes stacked presentation and source-transcript sheets', () => {
  const page = fs.readFileSync(PAGE_PATH, 'utf8');
  assert.match(page, /id="god-spark-presentation"/);
  assert.match(page, /id="god-spark-source-transcript"/);
  assert.match(page, /data-default-view="presentation"/);
  assert.match(page, /data-lineage-target="presentation"/);
  assert.match(page, /data-lineage-target="transcript"/);
  assert.ok(page.indexOf('id="god-spark-presentation"') < page.indexOf('id="god-spark-source-transcript"'));
});

test('GOD SPARK DUAL LINEAGE: presentation body is the preserved Part-021 canonical standalone body', () => {
  const page = fs.readFileSync(PAGE_PATH, 'utf8');
  const source = fs.readFileSync(PART021_PATH, 'utf8');
  const sourceStart = source.indexOf('<div class="entry-meta">');
  const sourceEnd = source.indexOf('<div id="arcNavMount">', sourceStart);
  assert.ok(sourceStart >= 0 && sourceEnd > sourceStart);
  const expected = normalizeText(source.slice(sourceStart, sourceEnd));
  const observed = normalizeText(sliceBetween(page, '<!-- PART-021-PRESENTATION-BEGIN -->', '<!-- PART-021-PRESENTATION-END -->'));
  assert.equal(observed, expected);
});

test('GOD SPARK DUAL LINEAGE: transcript remains bound to the distinct Part-028 lineage', () => {
  const page = fs.readFileSync(PAGE_PATH, 'utf8');
  const source = fs.readFileSync(PART028_PATH, 'utf8');
  assert.match(source, /\[Vic\]/);
  assert.match(source, /\[End Scene\]/);
  assert.match(page, /id="god-spark-transcript"/);
  assert.match(page, /data-source-lineage="docs\/ingestion\/source-pages\/part-028\/convos-with-god-what-is-god-spark\.html"/);
  assert.match(page, /\[End Scene\]/);
});

test('GOD SPARK DUAL LINEAGE: switch is accessible, shareable, and motion-reduced', () => {
  const page = fs.readFileSync(PAGE_PATH, 'utf8');
  assert.match(page, /role="tablist"/);
  assert.match(page, /aria-controls="god-spark-presentation"/);
  assert.match(page, /aria-controls="god-spark-source-transcript"/);
  assert.match(page, /URLSearchParams|searchParams/);
  assert.match(page, /searchParams\.set\('view', view\)/);
  assert.match(page, /prefers-reduced-motion: reduce/);
  assert.match(page, /ResizeObserver/);
});

test('GOD SPARK DUAL LINEAGE: repair formation preserves both source identities and holds generated effects', () => {
  const formation = JSON.parse(fs.readFileSync(FORMATION_PATH, 'utf8'));
  assert.equal(formation.sourceLineages.presentation.route, '/what-is-the-god-spark');
  assert.equal(formation.sourceLineages.presentation.gitBlob, '5ff8bce5585e791c9a4b4326291bd8ffc570cb1b');
  assert.equal(formation.sourceLineages.transcript.route, '/convos-with-god/what-is-god-spark');
  assert.equal(formation.sourceLineages.transcript.gitBlob, '4a5adf908da239d61669b3ed1865866a619ba51f');
  assert.equal(formation.destination.routeModel, 'ONE_CANONICAL_ROUTE__TWO_SWITCHABLE_VIEWS');
  assert.equal(formation.effects.generatedMutation, false);
  assert.equal(formation.effects.merge, false);
});

test('GOD SPARK DUAL LINEAGE: Part-021 presentation localization stays lineage-distinct and Global Core complete', () => {
  const page = fs.readFileSync(PAGE_PATH, 'utf8');
  const source = fs.readFileSync(PART021_PATH, 'utf8');
  const presentation = JSON.parse(fs.readFileSync(PRESENTATION_STRINGS_PATH, 'utf8'));
  const transcript = JSON.parse(fs.readFileSync(TRANSCRIPT_STRINGS_PATH, 'utf8'));

  assert.equal(presentation._meta.scope, 'pages.what-is-the-god-spark');
  assert.equal(presentation._meta.lineageRole || presentation._meta.sourceProvenance.lineageRole, 'PRESENTATION');
  assert.equal(presentation._meta.sourceProvenance.preservedGitBlob, '5ff8bce5585e791c9a4b4326291bd8ffc570cb1b');

  const sourceStart = source.indexOf('<div class="entry-meta">');
  const sourceEnd = source.indexOf('<div id="arcNavMount">', sourceStart);
  assert.ok(sourceStart >= 0 && sourceEnd > sourceStart);
  const sourceBody = source.slice(sourceStart, sourceEnd);
  const preservedKeys = [...sourceBody.matchAll(/data-i18n="([^"]+)"/g)].map(match => match[1]);
  assert.equal(preservedKeys.length, 51);
  assert.equal(new Set(preservedKeys).size, 51);

  const presentationKeys = Object.keys(presentation).filter(key => key !== '_meta');
  assert.equal(presentationKeys.length, 110);
  assert.equal(presentation._meta.preservedPresentationKeyCount, 51);
  assert.equal(presentation._meta.pageLocalPresentationAddedKeyCount, 53);
  assert.equal(presentation._meta.presentationVisibleLocalizationKeyCount, 104);
  assert.equal(presentation._meta.totalLineageSourceKeyCount, 110);
  for (const key of preservedKeys) assert.ok(presentationKeys.includes(key), 'missing Part-021 key ' + key);

  const interfaceKeys = presentation._meta.pageLocalInterfaceKeys || [];
  assert.equal(interfaceKeys.length, 6);
  const presentationBody = sliceBetween(page, '<!-- PART-021-PRESENTATION-BEGIN -->', '<!-- PART-021-PRESENTATION-END -->');
  const visiblePresentationKeys = presentationKeys.filter(key => !interfaceKeys.includes(key));
  assert.equal(visiblePresentationKeys.length, 104);
  for (const key of visiblePresentationKeys) {
    assert.ok(presentationBody.includes('data-i18n="' + key + '"'), 'presentation body is not bound to ' + key);
  }
  for (const key of interfaceKeys) {
    assert.ok(presentationKeys.includes(key), 'missing lineage UI key ' + key);
    assert.ok(page.includes('data-i18n="' + key + '"'), 'viewer is not bound to ' + key);
  }

  const targetLocales = ['zh', 'ja', 'ko', 'fr', 'de', 'es', 'pt', 'ar', 'hi'];
  for (const key of presentationKeys) {
    const strings = presentation[key].strings;
    assert.ok(strings && strings.en && typeof strings.en.text === 'string' && strings.en.text.length > 0, 'missing EN ' + key);
    for (const locale of targetLocales) {
      assert.ok(strings[locale] && typeof strings[locale].text === 'string' && strings[locale].text.length > 0, 'missing ' + locale + ' ' + key);
    }
  }

  const transcriptKeys = new Set(Object.keys(transcript).filter(key => key !== '_meta'));
  for (const key of presentationKeys) {
    assert.equal(transcriptKeys.has(key), false, 'lineage key collision with Part-028 transcript: ' + key);
  }
});

function godSparkDecodeText(value) {
  return value
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&ldquo;/g, '“')
    .replace(/&rdquo;/g, '”')
    .replace(/&lsquo;/g, '‘')
    .replace(/&rsquo;/g, '’')
    .replace(/&mdash;/g, '—')
    .replace(/&ndash;/g, '–')
    .replace(/&hellip;/g, '…')
    .replace(/\s+/g, ' ')
    .trim();
}

function godSparkAttributes(raw) {
  const result = {};
  const pattern = /([:\w-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g;
  let match;
  while ((match = pattern.exec(raw))) result[match[1]] = match[2] ?? match[3] ?? '';
  return result;
}

function godSparkUnboundVisibleText(html) {
  const tokens = html.match(/<!--[\s\S]*?-->|<\/?[a-zA-Z][^>]*>|[^<]+/g) || [];
  const stack = [];
  const values = [];
  for (const token of tokens) {
    if (token.startsWith('<!--')) continue;
    if (token.startsWith('</')) {
      stack.pop();
      continue;
    }
    if (token.startsWith('<')) {
      const match = token.match(/^<([a-zA-Z0-9:-]+)([\s\S]*?)\/?>$/);
      if (!match) continue;
      const tag = match[1].toLowerCase();
      const attrs = godSparkAttributes(match[2]);
      const isVoid = /^(br|hr|img|input|meta|link)$/i.test(tag) || /\/>$/.test(token);
      if (!isVoid) stack.push({ tag, attrs });
      continue;
    }
    const text = godSparkDecodeText(token);
    if (!text || !/[\p{L}\p{N}]/u.test(text)) continue;
    if (stack.some(entry => ['script', 'style'].includes(entry.tag))) continue;
    if (stack.some(entry => entry.attrs['data-i18n'])) continue;
    values.push(text);
  }
  return values;
}

test('GOD SPARK DUAL LINEAGE: only stable numeric and speaker identities may remain unbound', () => {
  const page = fs.readFileSync(PAGE_PATH, 'utf8');
  const presentation = sliceBetween(page, '<!-- PART-021-PRESENTATION-BEGIN -->', '<!-- PART-021-PRESENTATION-END -->');
  assert.deepEqual(
    godSparkUnboundVisibleText(presentation).sort(),
    ['01', '02', '03', '04', '05', '06', 'Claude', 'Victor'],
  );
});

