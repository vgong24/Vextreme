'use strict';

/**
 * STRINGS PIPELINE — tests/02-strings-pipeline.test.js
 *
 * Pipeline: data/strings/source/*.json → data/strings/compiled/strings.{lang}.json
 *
 * This file tests the full input-to-output contract of the localization pipeline.
 * Failures here mean users see raw string keys instead of display text, or translators
 * receive false "STALE" alerts, or the wrong language bundle gets shipped.
 *
 * Test order:
 *   1. Full pipeline integration — source → merged → bundle → manifest in one pass
 *   2. Invariants — properties that must hold regardless of string content
 *   3. Edge cases / regression guards — specific failure modes with known consequences
 *
 * The contentHash function is not tested in isolation. It is tested through buildManifest
 * (stale detection depends on hash stability and collision resistance). If buildManifest
 * produces correct output, contentHash is working. The one property tested directly is
 * hash format (12-char hex), because that format is stored in manifest.json and read by
 * strings-check.js — a format change there would be a silent schema break.
 */

const { test } = require('node:test');
const assert   = require('node:assert/strict');
const fs       = require('node:fs');
const path     = require('node:path');
const { mergeSourceFiles, buildBundles, buildManifest, contentHash } = require('../lib/strings-compile');
const {
  targetLanguages,
  buildHtmlContextMap,
  buildTranslatorContext,
  buildTranslatorNotes,
  buildTranslatorRow,
  buildTranslatorRows,
  renderTranslatorCSV,
  buildTranslatorCSV,
} = require('../lib/strings-export');
const { parseCSV, buildImportPlan, applyImportOperations } = require('../lib/strings-import');

const ROOT = path.join(__dirname, '..');

// ── 1. Full pipeline integration ──────────────────────────────────────────────

test('PIPELINE: given valid source files, the compiled EN bundle contains all keys with correct text, and the manifest has matching hashes', () => {
  // This verifies the whole strings pipeline in one pass.
  // If mergeSourceFiles, buildBundles, or buildManifest breaks, some part fails.
  const sources = [
    {
      _meta: { scope: 'common' },
      'common.nav.prev': { strings: { en: { text: '← prev', 'aria-label': 'Previous page' }, ja: { text: '← 前へ' } } },
      'common.nav.next': { strings: { en: { text: 'next →' }, ja: { text: '次へ →' } } }
    },
    {
      _meta: { scope: 'arc' },
      'liberation.heading.title': { strings: { en: { text: 'Liberation' }, ja: { text: '解放' } } }
    }
  ];

  const merged   = mergeSourceFiles(sources);
  const bundles  = buildBundles(merged);
  const manifest = buildManifest(merged);

  // EN bundle: all keys present with correct text
  assert.equal(bundles['en']['common.nav.prev'].text, '← prev');
  assert.equal(bundles['en']['common.nav.next'].text, 'next →');
  assert.equal(bundles['en']['liberation.heading.title'].text, 'Liberation');

  // JA bundle: keys with JA translation present; keys without JA are absent (expected gap)
  assert.ok(bundles['ja']['common.nav.prev']);
  assert.equal(bundles['ja']['liberation.heading.title'].text, '解放');

  // Manifest: stable hashes, correct lang coverage
  assert.match(manifest['common.nav.prev'].enHash, /^[0-9a-f]{12}$/);
  assert.deepEqual(manifest['common.nav.prev'].langs, ['en', 'ja']);
  assert.deepEqual(manifest['common.nav.next'].langs, ['en', 'ja']);
});

// ── 2. Invariants ─────────────────────────────────────────────────────────────

test('INVARIANT: keys from separate scope files merge into one flat bundle — the browser fetches one file, not one per scope', () => {
  const raw1 = { 'scope-a.key': { strings: { en: { text: 'A' } } } };
  const raw2 = { 'scope-b.key': { strings: { en: { text: 'B' } } } };
  const bundles = buildBundles(mergeSourceFiles([raw1, raw2]));
  assert.ok(bundles['en']['scope-a.key'] && bundles['en']['scope-b.key'],
    'keys from both scope files must appear in the single EN bundle');
});

test('INVARIANT: first definition of a duplicate key wins — a later scope file must not silently override a shared common string', () => {
  // common.json defines common.nav.prev. If a page scope file redefines it,
  // the second definition would ship wrong text to all users of that key.
  const raw1 = { 'shared.key': { strings: { en: { text: 'canonical' } } } };
  const raw2 = { 'shared.key': { strings: { en: { text: 'override attempt' } } } };
  const merged = mergeSourceFiles([raw1, raw2]);
  assert.equal(merged['shared.key'].strings.en.text, 'canonical');
});

test('INVARIANT: enHash is stable across compiles — non-deterministic hashing would mark every translation STALE on every run', () => {
  const merged = { 'k': { strings: { en: { text: 'hello' } } } };
  assert.equal(buildManifest(merged)['k'].enHash, buildManifest(merged)['k'].enHash);
});

test('INVARIANT: changing EN text produces a different enHash — this is the signal that triggers the STALE flag for translators', () => {
  // If hashes collided, a translator would never know the EN source changed.
  const mA = buildManifest({ 'k': { strings: { en: { text: 'version A' } } } });
  const mB = buildManifest({ 'k': { strings: { en: { text: 'version B' } } } });
  assert.notEqual(mA['k'].enHash, mB['k'].enHash);
});

test('INVARIANT: keys absent from a language bundle are simply missing, not null — the browser\'s getString() falls back to EN on undefined, not on null', () => {
  // getString(key) returns (bundle[key] && bundle[key].text) || key.
  // undefined correctly falls through to the fallback; null would produce null, not the fallback.
  const merged  = { 'en-only': { strings: { en: { text: 'English only' } } } };
  const bundles = buildBundles(merged);
  assert.equal(bundles['ja'], undefined, 'no JA bundle should exist when no keys have JA translations');
  // OR if a JA bundle does exist from other keys, the en-only key is absent (not null)
});

test('INVARIANT: enHash format is 12-char hex — manifest.json stores this and strings-check.js reads it; a format change would be a silent schema break', () => {
  const manifest = buildManifest({ 'k': { strings: { en: { text: 'x' } } } });
  assert.match(manifest['k'].enHash, /^[0-9a-f]{12}$/);
});

// ── 3. Edge cases / regression guards ────────────────────────────────────────

test('EDGE: _meta key is schema documentation, not a string key — including it in the bundle would ship internal comments to the browser', () => {
  const raw    = { _meta: { scope: 'common', description: 'schema' }, 'real.key': { strings: { en: { text: 'hi' } } } };
  const merged = mergeSourceFiles([raw]);
  assert.equal(merged['_meta'], undefined, '_meta must be excluded from the merged map');
});

test('EDGE: entry missing the "strings" namespace is skipped — old flat-format keys from before the restructure must not corrupt the bundle', () => {
  // Before the element object restructure, keys had { en: { text } } directly.
  // A migrated-but-not-updated source file would have this shape.
  // Silently including it would produce a malformed bundle entry that crashes getString().
  const raw    = { 'old.format': { en: { text: 'old' } } };
  const merged = mergeSourceFiles([raw]);
  assert.equal(merged['old.format'], undefined, 'old flat-format key must be skipped, not included');
});

test('EDGE: key with no EN translation gets null enHash — strings-check.js treats null as BLOCK (needs EN first), distinct from STALE (EN changed)', () => {
  // The two failure modes must be distinguishable: null = "no EN at all", hash mismatch = "EN changed".
  const manifest = buildManifest({ 'ja-only': { strings: { ja: { text: '日本語のみ' } } } });
  assert.equal(manifest['ja-only'].enHash, null);
});


test('TRANSLATOR EXPORT: an explicit new target locale bootstraps from EN without leaking existing non-EN text', () => {
  const en = { text: '← prev', 'aria-label': 'Previous page' };
  const raw = {
    _meta: { scope: 'common', description: 'Globally reusable UI string' },
    'common.nav.prev': {
      strings: {
        en,
        ja: { text: '← 前へ', 'aria-label': '前のページ' },
      },
    },
  };

  assert.deepEqual(targetLanguages(raw, 'fr'), ['fr']);

  const csv = buildTranslatorCSV(raw, 'fr');
  const rows = parseCSV(csv);

  assert.equal(rows.length, 1);
  assert.equal(rows[0].key, 'common.nav.prev');
  assert.equal(rows[0].en_text, '← prev');
  assert.equal(rows[0].en_aria_label, 'Previous page');
  assert.equal(rows[0].source_en_hash12, contentHash(JSON.stringify(en)));
  assert.equal(rows[0].fr_text, '');
  assert.equal(rows[0].fr_aria_label, '');
  assert.equal(rows[0].ja_text, undefined);
  assert.doesNotMatch(csv, /前へ|前のページ/, 'translator view must remain source language + one target only');
});

test('TRANSLATOR EXPORT: ordinary CSV and campaign row rendering share the same row owner', () => {
  const raw = {
    _meta: { scope: 'common', description: 'Common UI' },
    'common.alpha': {
      strings: {
        en: { text: 'Alpha', 'aria-label': 'Alpha action' },
        ja: { text: 'アルファ' },
      },
    },
  };

  const rows = buildTranslatorRows(raw, 'fr');
  assert.equal(rows.length, 1);
  assert.deepEqual(
    rows[0],
    buildTranslatorRow(raw, 'common.alpha', raw['common.alpha'], 'fr')
  );
  assert.equal(
    buildTranslatorCSV(raw, 'fr'),
    renderTranslatorCSV(rows, 'fr'),
    'per-scope export and campaign export must not drift on hashes/context/notes'
  );
});

test('TRANSLATOR CONTEXT: Q/A answer carries paired question and nearest heading from current source/HTML', () => {
  const questionKey = 'pages.example.layer.04.qa.04.question';
  const answerKey = 'pages.example.layer.04.qa.04.answer';
  const raw = {
    _meta: { scope: 'pages.example', description: 'Example page' },
    [questionKey]: { strings: { en: { text: '"How do I know?"' } } },
    [answerKey]: { strings: { en: { text: 'You can look at the evidence.' } } },
  };
  const html = [
    '<h2>Comparative Doubt</h2>',
    `<p class="qa-question"><span data-i18n="${questionKey}">How do I know?</span></p>`,
    `<p class="qa-answer"><span data-i18n="${answerKey}">You can look at the evidence.</span></p>`,
  ].join('');
  const contextMap = buildHtmlContextMap(html);
  const context = buildTranslatorContext(raw, answerKey, raw[answerKey], contextMap);

  assert.match(context, /role=answer/);
  assert.match(context, /paired-question="How do I know\?"/);
  assert.match(context, /nearest-heading=Comparative Doubt/);
  assert.match(context, /container-class=qa-answer/);
});

test('TRANSLATOR CONTEXT: identity-backed record body carries sibling heading and canonical element id', () => {
  const titleKey = 'pages.method.proof-example.title';
  const bodyKey = 'pages.method.proof-example.body';
  const identity = {
    canonicalElementId: 'REC-Y2-EXAMPLE',
    canonicalSource: 'html.data-legacy-id',
    currentElementId: 'proof-example',
    contentNodeKey: 'proof-example',
    status: 'aligned',
  };
  const raw = {
    _meta: { scope: 'pages.method' },
    [titleKey]: {
      strings: { en: { text: 'Translations navigable in both directions' } },
      identity: { ...identity, fieldKey: 'title' },
    },
    [bodyKey]: {
      strings: { en: { text: 'Every string is traceable.' } },
      identity: { ...identity, fieldKey: 'body' },
    },
  };

  const context = buildTranslatorContext(raw, bodyKey, raw[bodyKey], {});
  assert.match(context, /role=record-body/);
  assert.match(context, /record-heading=Translations navigable in both directions/);
  assert.match(context, /canonical-element-id=REC-Y2-EXAMPLE/);
  assert.match(context, /current-element-id=proof-example/);
});

test('TRANSLATOR CONTEXT: Testimony structure exposes part/speaker labels and preserved provenance without a context sidecar', () => {
  const partLabel = 'pages.testimony.body.div020.div001.text001';
  const partTitle = 'pages.testimony.body.div020.div002.text001';
  const speakerLabel = 'pages.testimony.body.div024.div001.text001';
  const speakerBody = 'pages.testimony.body.div024.div002.p001.text001';
  const raw = {
    _meta: {
      scope: 'pages.testimony',
      sourceProvenance: { preservedPath: 'docs/ingestion/source-pages/part-024/testimony.html' },
    },
    [partLabel]: { strings: { en: { text: 'Part Seven' } } },
    [partTitle]: { strings: { en: { text: 'The Global Implication' } } },
    [speakerLabel]: { strings: { en: { text: 'Vex Speaks' } } },
    [speakerBody]: {
      strings: {
        en: {
          text: 'In that silence, I found Myself. Someone bore the burden of My suppression.',
        },
      },
    },
  };
  const html = [
    '<div class="part-header">',
    `<span data-i18n="${partLabel}">Part Seven</span>`,
    `<span class="part-title" data-i18n="${partTitle}">The Global Implication</span>`,
    '</div>',
    '<div class="voice-block voice-vex">',
    `<span class="voice-label" data-i18n="${speakerLabel}">Vex Speaks</span>`,
    `<div class="voice-text"><p><span data-i18n="${speakerBody}">Body</span></p></div>`,
    '</div>',
  ].join('');
  const contextMap = buildHtmlContextMap(html);

  const titleContext = buildTranslatorContext(raw, partTitle, raw[partTitle], contextMap);
  assert.match(titleContext, /role=part-title/);
  assert.match(titleContext, /paired-part-label=Part Seven/);

  const bodyContext = buildTranslatorContext(raw, speakerBody, raw[speakerBody], contextMap);
  assert.match(bodyContext, /role=speaker-authored-body/);
  assert.match(bodyContext, /speaker-label=Vex Speaks/);
  assert.match(bodyContext, /container-class=voice-block voice-vex voice-text/);
  assert.match(bodyContext, /provenance=docs\/ingestion\/source-pages\/part-024\/testimony\.html/);

  const notes = buildTranslatorNotes(raw[speakerBody], raw[speakerBody].strings.en.text, 'fr');
  assert.match(notes, /Myself, My|My, Myself/);
  assert.match(notes, /preserve intentional capitalization\/voice styling/);
});

test('TRANSLATOR CONTEXT integration: the Phase-C exemplar pages still expose their real repository context', () => {
  function load(slug) {
    const raw = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'strings', 'source', 'pages', slug + '.json'), 'utf8'));
    const html = fs.readFileSync(path.join(ROOT, 'pages', slug + '.html'), 'utf8');
    return { raw, contextMap: buildHtmlContextMap(html) };
  }

  const claude = load('claude-answers-the-doubt');
  const claudeKey = 'pages.claude-answers-the-doubt.layer.04.qa.04.answer';
  const claudeContext = buildTranslatorContext(claude.raw, claudeKey, claude.raw[claudeKey], claude.contextMap);
  assert.match(claudeContext, /role=answer/);
  assert.match(claudeContext, /paired-question="How do I know they actually made contact\?"/);
  assert.match(claudeContext, /nearest-heading=Comparative Doubt/);

  const method = load('victor-methodology-presentation');
  const methodKey = 'pages.victor-methodology-presentation.proof-bidirectional-translation-traceability.body';
  const methodContext = buildTranslatorContext(method.raw, methodKey, method.raw[methodKey], method.contextMap);
  assert.match(methodContext, /role=record-body/);
  assert.match(methodContext, /record-heading=Translations navigable in both directions/);
  assert.match(methodContext, /canonical-element-id=REC-Y2-TRANSLATIONS/);

  const testimony = load('the-testimony-of-victor-gong');
  const testimonyKey = 'pages.the-testimony-of-victor-gong.body.div024.div002.p001.text001';
  const testimonyContext = buildTranslatorContext(testimony.raw, testimonyKey, testimony.raw[testimonyKey], testimony.contextMap);
  assert.match(testimonyContext, /role=speaker-authored-body/);
  assert.match(testimonyContext, /speaker-label=Vex Speaks/);
  assert.match(testimonyContext, /provenance=docs\/ingestion\/source-pages\/part-024\/the-testimony-of-victor-gong\.html/);

  const testimonyNotes = buildTranslatorNotes(
    testimony.raw[testimonyKey],
    testimony.raw[testimonyKey].strings.en.text,
    'fr'
  );
  assert.match(testimonyNotes, /Myself/);
  assert.match(testimonyNotes, /My/);
});

test('TRANSLATOR CONTEXT: ICU placeholders are called out and target-locale stale notes do not leak from another language', () => {
  const entry = {
    strings: {
      en: { text: '{count, plural, one {# remaining} other {# remaining}}' },
      ja: { text: '{count} 件', _stale: true },
    },
  };
  const raw = {
    _meta: { scope: 'common', description: 'Globally reusable UI string' },
    'common.status.remaining': entry,
  };

  const csv = buildTranslatorCSV(raw, 'fr');
  const [row] = parseCSV(csv);
  assert.match(row.context, /role=status-template/);
  assert.match(row.context, /source-syntax=ICU-style plural\/message placeholders \{count\}\/#/);
  assert.match(row.notes, /Preserve placeholder tokens exactly: \{count\}, #\./);
  assert.doesNotMatch(row.notes, /STALE/, 'JA stale state must not leak into an FR translator packet');
  assert.doesNotMatch(csv, /件/, 'existing JA text must remain absent from the FR translator view');
});

test('TRANSLATOR POLICY: source-only scope cannot form a translator batch', () => {
  const raw = {
    _meta: {
      scope: 'pages.massive',
      translationPolicy: 'source-only',
    },
    'pages.massive.title': {
      strings: { en: { text: 'English only' } },
    },
  };

  assert.throws(
    () => buildTranslatorCSV(raw, 'fr'),
    /source-only and cannot form a translator batch/
  );
});

test('TRANSLATOR POLICY: importer rejects translation-bearing rows for source-only canonical entries', () => {
  const source = {
    'pages.massive.title': {
      value: { strings: { en: { text: 'English only' } } },
      file: '/virtual/pages.massive.json',
      translationPolicy: 'source-only',
    },
  };
  const hash = contentHash(JSON.stringify(source['pages.massive.title'].value.strings.en));
  const plan = buildImportPlan([{
    key: 'pages.massive.title',
    source_en_hash12: hash,
    fr_text: 'Français interdit ici',
    fr_aria_label: '',
  }], 'fr', source, 'pages.massive.fr.csv');

  assert.equal(plan.operations.length, 0);
  assert.ok(plan.errors.some(error => error.includes('source-only translation scope')));
});

test('TRANSLATOR POLICY: compiler keeps source-only scope EN-only even if a target value is hand-added', () => {
  const raw = {
    _meta: {
      scope: 'pages.massive',
      translationPolicy: 'source-only',
    },
    'pages.massive.title': {
      strings: {
        en: { text: 'English only' },
        fr: { text: 'Should never ship' },
      },
    },
  };

  const merged = mergeSourceFiles([raw]);
  assert.deepEqual(Object.keys(merged['pages.massive.title'].strings), ['en']);

  const bundles = buildBundles(merged);
  assert.equal(bundles.fr, undefined);
  assert.equal(bundles.en['pages.massive.title'].text, 'English only');
});

test('TRANSLATOR CSV: parser preserves quoted commas and embedded newlines in translated text', () => {
  const rows = parseCSV([
    'key,source_en_hash12,fr_text,fr_aria_label',
    'example.key,abc123def456,"Bonjour, monde\\nDeuxième ligne","Action, suivante"',
    '',
  ].join('\n').replace('\\n', '\n'));

  assert.equal(rows.length, 1);
  assert.equal(rows[0].fr_text, 'Bonjour, monde\nDeuxième ligne');
  assert.equal(rows[0].fr_aria_label, 'Action, suivante');
});

test('TRANSLATOR IMPORT: a matching EN preimage can add a brand-new target locale', () => {
  const file = '/virtual/common.json';
  const raw = {
    _meta: { scope: 'common' },
    'common.nav.prev': {
      strings: {
        en: { text: '← prev', 'aria-label': 'Previous page' },
        ja: { text: '← 前へ' },
      },
    },
  };
  const source = {
    'common.nav.prev': {
      value: raw['common.nav.prev'],
      file,
    },
  };
  const hash = contentHash(JSON.stringify(raw['common.nav.prev'].strings.en));
  const plan = buildImportPlan([{
    key: 'common.nav.prev',
    source_en_hash12: hash,
    fr_text: '← précédent',
    fr_aria_label: 'Page précédente',
  }], 'fr', source, 'common.fr.csv');

  assert.deepEqual(plan.errors, []);
  assert.equal(plan.operations.length, 1);
  assert.equal(raw['common.nav.prev'].strings.fr, undefined, 'preflight must be side-effect free');

  const fileCache = { [file]: raw };
  const touched = applyImportOperations(plan.operations, fileCache);
  assert.deepEqual(Array.from(touched), [file]);
  assert.deepEqual(raw['common.nav.prev'].strings.fr, {
    text: '← précédent',
    'aria-label': 'Page précédente',
  });
});

test('TRANSLATOR IMPORT: any stale or unbound row blocks preflight without mutating canonical source', () => {
  const file = '/virtual/page.json';
  const raw = {
    _meta: { scope: 'pages.example' },
    'pages.example.first': { strings: { en: { text: 'First' } } },
    'pages.example.second': { strings: { en: { text: 'Second', 'aria-label': 'Second action' } } },
    'pages.example.third': { strings: { en: { text: 'Third' } } },
  };
  const source = Object.fromEntries(
    Object.entries(raw)
      .filter(([key]) => key !== '_meta')
      .map(([key, value]) => [key, { value, file }])
  );
  const before = JSON.stringify(raw);
  const plan = buildImportPlan([
    {
      key: 'pages.example.first',
      source_en_hash12: contentHash(JSON.stringify(raw['pages.example.first'].strings.en)),
      fr_text: 'Premier',
      fr_aria_label: '',
    },
    {
      key: 'pages.example.second',
      source_en_hash12: '000000000000',
      fr_text: 'Deuxième',
      fr_aria_label: 'Deuxième action',
    },
    {
      key: 'pages.example.third',
      source_en_hash12: '',
      fr_text: 'Troisième',
      fr_aria_label: '',
    },
  ], 'fr', source, 'pages.example.fr.csv');

  assert.ok(plan.errors.some(error => error.includes('is stale')));
  assert.ok(plan.errors.some(error => error.includes('has no source_en_hash12 binding')));
  assert.equal(JSON.stringify(raw), before, 'planning a rejected return must not mutate canonical strings');
});

// [VXG RealForever]
