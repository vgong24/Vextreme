'use strict';

/**
 * APPLY-CONTENT-INTENTS — tests/18-apply-content-intents.test.js
 *
 * Tests for lib/apply-content-intents.js — the "declare where a page goes,
 * let code place it" mechanism (Session 022), extending the existing
 * vex:department/vex:workType meta-tag pattern to arc membership via each
 * arc's one auto-managed section in data/arcs-v2.json.
 *
 * Test order:
 *   1. upsertMetaTag — insert vs. replace, idempotent, no-<head> fragment pages
 *   2. applyArcPlacement — add, move between arcs, curated section untouched
 *   3. applyIntent — combines both, in-memory only
 *   4. validateIntent — catches an unregistered department and a nonexistent
 *      arcKey, the two silent-failure modes found by running this tool
 *      against real content
 */

const { test } = require('node:test');
const assert   = require('node:assert/strict');

const { upsertMetaTag, applyArcPlacement, applyIntent, validateIntent, AUTO_SECTION_LABEL } = require('../lib/apply-content-intents');

// ── 1. upsertMetaTag ───────────────────────────────────────────────────────────

test('APPLY-CONTENT-INTENTS: upsertMetaTag inserts a new tag before </head> when absent', () => {
  const html = '<html><head><title>x</title></head><body></body></html>';
  const result = upsertMetaTag(html, 'vex:department', 'institute');
  assert.match(result, /<meta name="vex:department" content="institute">/);
  assert.match(result, /<meta name="vex:department" content="institute">\s*<\/head>/);
});

test('APPLY-CONTENT-INTENTS: upsertMetaTag replaces an existing tag rather than duplicating it', () => {
  const html = '<html><head><meta name="vex:department" content="rd"></head><body></body></html>';
  const result = upsertMetaTag(html, 'vex:department', 'institute');
  assert.equal((result.match(/vex:department/g) || []).length, 1);
  assert.match(result, /content="institute"/);
});

test('APPLY-CONTENT-INTENTS: upsertMetaTag is idempotent (applying twice equals applying once)', () => {
  const html = '<html><head></head><body></body></html>';
  const once  = upsertMetaTag(html, 'vex:workType', 'governance');
  const twice = upsertMetaTag(once, 'vex:workType', 'governance');
  assert.equal(once, twice);
});

test('APPLY-CONTENT-INTENTS: upsertMetaTag prepends the tag when the page has no <head> at all (Squarespace paste-fragment pages)', () => {
  const html = '<!-- Paste into: Squarespace Code Block -->\n<div class="wrap">content</div>';
  const result = upsertMetaTag(html, 'vex:department', 'institute');
  assert.match(result, /^<meta name="vex:department" content="institute">/);
  assert.doesNotThrow(() => upsertMetaTag(result, 'vex:department', 'institute'), 'must stay idempotent on fragment pages too');
});

test('APPLY-CONTENT-INTENTS: upsertMetaTag is idempotent on a fragment page (no duplicate tag on re-apply)', () => {
  const html = '<div class="wrap">content</div>';
  const once  = upsertMetaTag(html, 'vex:department', 'institute');
  const twice = upsertMetaTag(once, 'vex:department', 'institute');
  assert.equal(once, twice);
  assert.equal((twice.match(/vex:department/g) || []).length, 1);
});

// ── 2. applyArcPlacement ───────────────────────────────────────────────────────

const SAMPLE_ARCS = {
  arc_a: { sections: [{ label: 'Arc A', order: 'explicit', slugs: ['curated-page'] }] },
  arc_b: { sections: [{ label: 'Arc B', order: 'explicit', slugs: [] }] },
};

test('APPLY-CONTENT-INTENTS: applyArcPlacement creates the auto section on first use', () => {
  const result = applyArcPlacement(SAMPLE_ARCS, 'arc_b', 'new-page', AUTO_SECTION_LABEL);
  const autoSection = result.arc_b.sections.find(s => s.label === AUTO_SECTION_LABEL);
  assert.ok(autoSection);
  assert.deepEqual(autoSection.slugs, ['new-page']);
});

test('APPLY-CONTENT-INTENTS: applyArcPlacement does not mutate the input object', () => {
  const before = JSON.stringify(SAMPLE_ARCS);
  applyArcPlacement(SAMPLE_ARCS, 'arc_b', 'new-page', AUTO_SECTION_LABEL);
  assert.equal(JSON.stringify(SAMPLE_ARCS), before);
});

test('APPLY-CONTENT-INTENTS: applyArcPlacement moves a slug between arcs, removing it from the prior auto section', () => {
  const step1 = applyArcPlacement(SAMPLE_ARCS, 'arc_a', 'wandering-page', AUTO_SECTION_LABEL);
  const step2 = applyArcPlacement(step1, 'arc_b', 'wandering-page', AUTO_SECTION_LABEL);

  const arcAAuto = step2.arc_a.sections.find(s => s.label === AUTO_SECTION_LABEL);
  const arcBAuto = step2.arc_b.sections.find(s => s.label === AUTO_SECTION_LABEL);
  assert.ok(!arcAAuto.slugs.includes('wandering-page'), 'must be removed from the arc it moved out of');
  assert.ok(arcBAuto.slugs.includes('wandering-page'), 'must be present in the arc it moved into');
});

test('APPLY-CONTENT-INTENTS: applyArcPlacement never touches a hand-curated section', () => {
  const result = applyArcPlacement(SAMPLE_ARCS, 'arc_a', 'curated-page', AUTO_SECTION_LABEL);
  const curatedSection = result.arc_a.sections.find(s => s.label === 'Arc A');
  assert.deepEqual(curatedSection.slugs, ['curated-page'], 'curated section must be untouched');
  const autoSection = result.arc_a.sections.find(s => s.label === AUTO_SECTION_LABEL);
  assert.ok(!autoSection, 'must not create an auto section for a slug already curated in this arc');
});

test('APPLY-CONTENT-INTENTS: applyArcPlacement throws on an unknown arc key', () => {
  assert.throws(() => applyArcPlacement(SAMPLE_ARCS, 'not_a_real_arc', 'slug', AUTO_SECTION_LABEL));
});

// ── 3. applyIntent ──────────────────────────────────────────────────────────────

test('APPLY-CONTENT-INTENTS: applyIntent applies department, workType, and arc together', () => {
  const html = '<html><head></head><body></body></html>';
  const intent = { slug: 'new-page', department: 'institute', workType: 'governance', arcKey: 'arc_b' };
  const result = applyIntent(intent, html, SAMPLE_ARCS, AUTO_SECTION_LABEL);

  assert.match(result.html, /content="institute"/);
  assert.match(result.html, /content="governance"/);
  assert.ok(result.arcsDef.arc_b.sections.find(s => s.label === AUTO_SECTION_LABEL).slugs.includes('new-page'));
  assert.equal(result.changed.length, 3);
});

test('APPLY-CONTENT-INTENTS: applyIntent with no arcKey leaves arcsDef reference-equal (no-op)', () => {
  const html = '<html><head></head><body></body></html>';
  const intent = { slug: 'new-page', department: 'institute' };
  const result = applyIntent(intent, html, SAMPLE_ARCS, AUTO_SECTION_LABEL);
  assert.equal(result.arcsDef, SAMPLE_ARCS, 'arcsDef must be untouched when the intent declares no arcKey');
});

// ── 4. validateIntent ───────────────────────────────────────────────────────────

const SAMPLE_DEPARTMENTS = {
  rd:    { label: 'R&D', default: true, workTypes: {} },
  media: { label: 'Media', default: false, workTypes: {} },
};

test('APPLY-CONTENT-INTENTS: validateIntent passes a registered department and a real arcKey', () => {
  const result = validateIntent({ slug: 'x', department: 'media', arcKey: 'arc_a' }, SAMPLE_DEPARTMENTS, SAMPLE_ARCS);
  assert.equal(result.valid, true);
  assert.deepEqual(result.errors, []);
});

test('APPLY-CONTENT-INTENTS: validateIntent rejects a department not in data/departments.json', () => {
  const result = validateIntent({ slug: 'x', department: 'institute' }, SAMPLE_DEPARTMENTS, SAMPLE_ARCS);
  assert.equal(result.valid, false);
  assert.match(result.errors[0], /institute.*not registered/);
});

test('APPLY-CONTENT-INTENTS: validateIntent rejects an arcKey that is not a real arc', () => {
  const result = validateIntent({ slug: 'x', arcKey: 'not_a_real_arc' }, SAMPLE_DEPARTMENTS, SAMPLE_ARCS);
  assert.equal(result.valid, false);
  assert.match(result.errors[0], /not_a_real_arc.*not a real arc/);
});

test('APPLY-CONTENT-INTENTS: validateIntent with neither field set is always valid', () => {
  const result = validateIntent({ slug: 'x' }, SAMPLE_DEPARTMENTS, SAMPLE_ARCS);
  assert.equal(result.valid, true);
});

// [VXG RealForever]
