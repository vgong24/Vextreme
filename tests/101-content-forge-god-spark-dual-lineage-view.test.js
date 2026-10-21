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
