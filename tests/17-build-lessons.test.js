'use strict';

/**
 * BUILD-LESSONS — tests/17-build-lessons.test.js
 *
 * Tests for lib/build-lessons.js (config/lessons/*.json → data/lessons.json
 * compiler). Session 022 added this after finding config/lessons/ had no
 * path into any generated artifact the Ecosystem Hub could fetch — a lesson
 * was discoverable by grep or by an out-of-date hand-authored specimen page,
 * but never reached the one dashboard meant to answer "what does this
 * system currently know."
 *
 * Test order:
 *   1. normalizeLessonSessions — handles both schema generations
 *   2. buildLessonsManifest — assembles correct structure, sorted output
 *   3. Integration — data/lessons.json is valid and consistent with the
 *      actual config/lessons/ directory
 */

const { test } = require('node:test');
const assert   = require('node:assert/strict');
const fs       = require('fs');
const path     = require('path');

const { normalizeLessonSessions, buildLessonsManifest } = require('../lib/build-lessons');

const ROOT        = path.join(__dirname, '..');
const LESSONS_DIR = path.join(ROOT, 'config', 'lessons');
const LESSONS_OUT = path.join(ROOT, 'data', 'lessons.json');

// ── 1. normalizeLessonSessions ────────────────────────────────────────────────

test('BUILD-LESSONS: normalizeLessonSessions returns the sessions array when present', () => {
  assert.deepEqual(normalizeLessonSessions({ sessions: ['013', '014'] }), ['013', '014']);
});

test('BUILD-LESSONS: normalizeLessonSessions falls back to the older singular session field', () => {
  assert.deepEqual(normalizeLessonSessions({ session: '011' }), ['011']);
});

test('BUILD-LESSONS: normalizeLessonSessions returns an empty array when neither field is present', () => {
  assert.deepEqual(normalizeLessonSessions({}), []);
});

// ── 2. buildLessonsManifest ────────────────────────────────────────────────────

const SAMPLE_FILES = [
  { filename: 'b-lesson.json', content: { id: 'b-lesson', title: 'B', problem: 'p', lesson: 'l', impact: 'i', sessions: ['002'] } },
  { filename: 'a-lesson.json', content: { id: 'a-lesson', title: 'A', problem: 'p', lesson: 'l', session: '001', visual: 'pages/x.html#decision-1' } },
];

test('BUILD-LESSONS: buildLessonsManifest returns the correct count', () => {
  const result = buildLessonsManifest(SAMPLE_FILES);
  assert.equal(result.count, 2);
  assert.equal(result.items.length, 2);
});

test('BUILD-LESSONS: buildLessonsManifest sorts items by id', () => {
  const result = buildLessonsManifest(SAMPLE_FILES);
  assert.deepEqual(result.items.map(i => i.id), ['a-lesson', 'b-lesson']);
});

test('BUILD-LESSONS: buildLessonsManifest normalizes sessions for every item', () => {
  const result = buildLessonsManifest(SAMPLE_FILES);
  const a = result.items.find(i => i.id === 'a-lesson');
  const b = result.items.find(i => i.id === 'b-lesson');
  assert.deepEqual(a.sessions, ['001']);
  assert.deepEqual(b.sessions, ['002']);
});

test('BUILD-LESSONS: buildLessonsManifest defaults impact to empty string and visual to null when absent', () => {
  const result = buildLessonsManifest(SAMPLE_FILES);
  const b = result.items.find(i => i.id === 'b-lesson');
  const a = result.items.find(i => i.id === 'a-lesson');
  assert.equal(b.visual, null);
  assert.equal(a.impact, '');
});

// ── 3. Integration ─────────────────────────────────────────────────────────────

test('BUILD-LESSONS integration: data/lessons.json exists and is valid JSON', () => {
  assert.ok(fs.existsSync(LESSONS_OUT), 'run node lib/build-lessons.js before testing');
  const manifest = JSON.parse(fs.readFileSync(LESSONS_OUT, 'utf8'));
  assert.ok(Array.isArray(manifest.items));
  assert.equal(manifest.count, manifest.items.length);
});

test('BUILD-LESSONS integration: every config/lessons/*.json file is represented in the manifest', () => {
  const manifest = JSON.parse(fs.readFileSync(LESSONS_OUT, 'utf8'));
  const manifestIds = manifest.items.map(i => i.id).sort();

  const diskIds = fs.readdirSync(LESSONS_DIR)
    .filter(f => f.endsWith('.json'))
    .map(f => JSON.parse(fs.readFileSync(path.join(LESSONS_DIR, f), 'utf8')).id)
    .sort();

  assert.deepEqual(manifestIds, diskIds);
});

test('BUILD-LESSONS integration: every item has the fields lib/build-ecosystem-hub.js renders', () => {
  const manifest = JSON.parse(fs.readFileSync(LESSONS_OUT, 'utf8'));
  for (const item of manifest.items) {
    assert.equal(typeof item.title, 'string');
    assert.equal(typeof item.problem, 'string');
    assert.equal(typeof item.lesson, 'string');
    assert.ok(Array.isArray(item.sessions));
  }
});

// [VXG RealForever]
