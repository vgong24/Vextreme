'use strict';

/**
 * RESOLVE-GENERATED-CONFLICTS — tests/31-resolve-generated-conflicts.test.js
 *
 * Tests for lib/resolve-generated-conflicts.js — the auto-resolver for merge
 * conflicts in pure-build-output files (data/index.json, sw.js, etc.), which
 * conflict on nearly every PR because each branch's CI regenerates them with
 * a fresh timestamp/hash even when no real content changed.
 */

const { test } = require('node:test');
const assert   = require('node:assert/strict');

const { parseGeneratedFileList, parseConflictedFiles } = require('../lib/resolve-generated-conflicts');

test('RESOLVE-GENERATED-CONFLICTS: parseGeneratedFileList extracts merge=ours paths', () => {
  const content = [
    '# comment',
    'data/index.json    merge=ours',
    'pages/foo.html      merge=ours',
    'some/other/file.js',
  ].join('\n');
  assert.deepEqual(parseGeneratedFileList(content), ['data/index.json', 'pages/foo.html']);
});

test('RESOLVE-GENERATED-CONFLICTS: parseGeneratedFileList ignores comment lines and blank lines', () => {
  const content = '\n# nothing here\n\ndata/index.json merge=ours\n';
  assert.deepEqual(parseGeneratedFileList(content), ['data/index.json']);
});

test('RESOLVE-GENERATED-CONFLICTS: parseGeneratedFileList returns empty array when nothing matches', () => {
  assert.deepEqual(parseGeneratedFileList('# only comments\n'), []);
});

test('RESOLVE-GENERATED-CONFLICTS: parseConflictedFiles picks out unmerged (UU) entries', () => {
  const porcelain = [
    'UU data/index.json',
    'M  lib/some-file.js',
    '?? scratch/untracked.txt',
    'UU sw.js',
  ].join('\n');
  assert.deepEqual(parseConflictedFiles(porcelain), ['data/index.json', 'sw.js']);
});

test('RESOLVE-GENERATED-CONFLICTS: parseConflictedFiles returns empty array when nothing is conflicted', () => {
  const porcelain = 'M  lib/some-file.js\n?? scratch/untracked.txt\n';
  assert.deepEqual(parseConflictedFiles(porcelain), []);
});

test('RESOLVE-GENERATED-CONFLICTS: parseConflictedFiles handles added-added (AA) conflicts too', () => {
  const porcelain = 'AA data/lessons.json\n';
  assert.deepEqual(parseConflictedFiles(porcelain), ['data/lessons.json']);
});

// [VXG RealForever]
