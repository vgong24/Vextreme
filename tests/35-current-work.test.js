'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const {
  parseRepoName,
  parseGoneBranches,
  interpretGhAvailability,
  buildSuggestions,
  renderReport,
} = require('../lib/current-work');

const SOURCE = fs.readFileSync(path.join(__dirname, '..', 'lib', 'current-work.js'), 'utf8');

function baseReport(overrides = {}) {
  const report = {
    repository: 'Vextreme',
    branch: 'feature/example',
    workingTree: { clean: true, dirtyFiles: [] },
    aheadBehind: { ahead: 0, behind: 0 },
    upstream: { name: 'origin/feature/example', status: 'exists' },
    goneBranches: [],
    branchTriage: { status: 'available', classification: 'stale-safe-to-clean-later', recommendedAction: 'cleanup may be safe later, but requires Victor/Vex approval' },
    openPr: { status: 'none found', detail: '' },
    ...overrides,
  };
  report.suggestions = buildSuggestions(report);
  return report;
}

test('CURRENT-WORK: parseRepoName extracts the repo name from an https remote url', () => {
  assert.equal(parseRepoName('https://github.com/vgong24/Vextreme.git'), 'Vextreme');
});

test('CURRENT-WORK: parseRepoName extracts the repo name from a proxied remote url with no .git suffix', () => {
  assert.equal(parseRepoName('http://local_proxy@127.0.0.1:41729/git/vgong24/Vextreme'), 'Vextreme');
});

test('CURRENT-WORK: parseRepoName returns unknown for an empty remote', () => {
  assert.equal(parseRepoName(''), 'unknown');
});

test('CURRENT-WORK: parseGoneBranches finds only branches marked [gone]', () => {
  const output = [
    'claude/elegant-bell-gkmgmk ',
    'main [behind 28]',
    'codex/old-experiment [gone]',
  ].join('\n');
  assert.deepEqual(parseGoneBranches(output), ['codex/old-experiment']);
});

test('CURRENT-WORK: parseGoneBranches returns empty array when nothing is gone', () => {
  assert.deepEqual(parseGoneBranches('main [behind 3]\nfeature/x '), []);
});

test('CURRENT-WORK: interpretGhAvailability reports gh missing when the version check fails', () => {
  assert.deepEqual(
    interpretGhAvailability({ versionOk: false, authOk: false }),
    { available: false, reason: 'gh missing' },
  );
});

test('CURRENT-WORK: interpretGhAvailability reports gh unauthenticated when gh exists but auth fails', () => {
  assert.deepEqual(
    interpretGhAvailability({ versionOk: true, authOk: false }),
    { available: false, reason: 'gh unauthenticated' },
  );
});

test('CURRENT-WORK: interpretGhAvailability reports available when both checks pass', () => {
  assert.deepEqual(
    interpretGhAvailability({ versionOk: true, authOk: true }),
    { available: true, reason: null },
  );
});

test('CURRENT-WORK: buildSuggestions recommends branch-triage cleanup check when nothing is gone', () => {
  const suggestions = buildSuggestions(baseReport());
  assert.ok(suggestions.some((s) => s.includes('npm run branch-triage')));
});

test('CURRENT-WORK: buildSuggestions surfaces gone-branch count when present', () => {
  const suggestions = buildSuggestions(baseReport({ goneBranches: ['codex/old-experiment'] }));
  assert.ok(suggestions.some((s) => s.includes('1 local branch(es)')));
});

test('CURRENT-WORK: buildSuggestions always recommends an isolated worktree when the tree is dirty', () => {
  const suggestions = buildSuggestions(baseReport({ workingTree: { clean: false, dirtyFiles: [{ path: 'x', code: ' M' }] } }));
  assert.ok(suggestions.some((s) => s.includes('isolated worktree')));
});

test('CURRENT-WORK: buildSuggestions always mentions pr-ready as a post-selection step', () => {
  const suggestions = buildSuggestions(baseReport());
  assert.ok(suggestions.some((s) => s.includes('npm run pr-ready')));
});

test('CURRENT-WORK: recommendations never instruct a mutating git/npm action', () => {
  const suggestions = buildSuggestions(baseReport({
    workingTree: { clean: false, dirtyFiles: [{ path: 'x', code: ' M' }] },
    goneBranches: ['codex/old-experiment'],
  }));
  const forbidden = /git (push|reset|checkout|stash|clean|commit|branch -D)|rm -rf/;
  for (const suggestion of suggestions) {
    assert.doesNotMatch(suggestion, forbidden, `suggestion implied mutation: ${suggestion}`);
  }
});

test('CURRENT-WORK: renderReport renders a clean working tree', () => {
  const output = renderReport(baseReport());
  assert.match(output, /Working tree:\n {2}clean/);
  assert.match(output, /Dirty files:\n {2}none/);
});

test('CURRENT-WORK: renderReport renders a dirty working tree with its files listed', () => {
  const output = renderReport(baseReport({
    workingTree: { clean: false, dirtyFiles: [{ path: 'data/lessons.json', code: ' M' }] },
  }));
  assert.match(output, /Working tree:\n {2}dirty/);
  assert.match(output, /data\/lessons\.json/);
});

test('CURRENT-WORK: renderReport shows branch-triage classification when available', () => {
  const output = renderReport(baseReport());
  assert.match(output, /Branch triage:\n {2}stale-safe-to-clean-later/);
});

test('CURRENT-WORK: renderReport falls back to a pointer when branch-triage is unavailable', () => {
  const output = renderReport(baseReport({
    branchTriage: { status: 'unavailable', classification: null, recommendedAction: null },
  }));
  assert.match(output, /Branch triage:\n {2}unavailable — run `npm run branch-triage`/);
});

test('CURRENT-WORK: renderReport surfaces gh missing for open PR status', () => {
  const output = renderReport(baseReport({ openPr: { status: 'gh missing', detail: '' } }));
  assert.match(output, /Open PRs:\n {2}gh missing/);
});

test('CURRENT-WORK: renderReport surfaces gh unauthenticated for open PR status', () => {
  const output = renderReport(baseReport({ openPr: { status: 'gh unauthenticated', detail: '' } }));
  assert.match(output, /Open PRs:\n {2}gh unauthenticated/);
});

test('CURRENT-WORK: renderReport always states no mutation was performed', () => {
  const output = renderReport(baseReport());
  assert.match(output, /Mutation performed:\n {2}no/);
});

test('CURRENT-WORK: source never invokes npm, so pr-ready is never called by default', () => {
  assert.doesNotMatch(SOURCE, /execFileSync\(\s*['"]npm['"]/);
  assert.doesNotMatch(SOURCE, /runCommand\(\s*['"]npm['"]/);
});

test('CURRENT-WORK: source only calls read-only git subcommands', () => {
  const allowlist = new Set(['status', 'branch', 'rev-parse', 'rev-list', 'for-each-ref', 'remote']);
  const calls = [...SOURCE.matchAll(/runGit\(\[\s*'([a-z-]+)'/g)].map((m) => m[1]);
  assert.ok(calls.length > 0, 'expected at least one runGit call to scan');
  for (const subcommand of calls) {
    assert.ok(allowlist.has(subcommand), `unexpected git subcommand in current-work.js: ${subcommand}`);
  }
});

test('CURRENT-WORK: source only calls read-only gh subcommands', () => {
  const allowlist = new Set(['--version', 'auth']);
  const calls = [...SOURCE.matchAll(/runCommand\(\s*'gh',\s*\[\s*'([a-z-]+)'/g)].map((m) => m[1]);
  assert.ok(calls.length > 0, 'expected at least one gh runCommand call to scan');
  for (const subcommand of calls) {
    assert.ok(allowlist.has(subcommand), `unexpected gh subcommand in current-work.js: ${subcommand}`);
  }
});

// [VXG RealForever]
