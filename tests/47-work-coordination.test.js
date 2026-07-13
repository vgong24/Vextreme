'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const policy = require('../config/work-coordination.json');
const {
  END,
  START,
  checkClaim,
  checkPolicy,
  inspectPullRequests,
  pathOverlap,
  readClaim,
} = require('../lib/work-coordination');

function claim(overrides = {}) {
  return {
    schemaVersion: 'work-coordination.claim/v1',
    workRef: 'work.public-synthetic',
    actorRef: 'codex-windows-continuity',
    instanceRef: 'codex-public-test',
    repository: 'vgong24/Vextreme',
    branch: 'VXG-071226-codex-public-test',
    epic: { name: 'Public Synthetic', item: '1/2' },
    status: 'active',
    paths: ['docs/process/', 'lib/example.js'],
    dependsOn: [],
    lease: { renewBy: '2099-01-01' },
    coordinationOnly: true,
    implementationAuthority: false,
    ...overrides,
  };
}

function pr(number, value) {
  return {
    number,
    title: `Synthetic ${number}`,
    headRefName: value.branch,
    isDraft: true,
    url: `https://example.invalid/${number}`,
    body: `${START}\n${JSON.stringify(value)}\n${END}`,
  };
}

test('WORK COORDINATION: public registry is valid and non-authoritative', () => {
  assert.equal(checkPolicy(policy).valid, true);
  assert.equal(policy.policy.unknownLiveStateMeansFree, false);
  assert.equal(policy.policy.claimGrantsAuthority, false);
});

test('WORK COORDINATION: claim parser handles missing, malformed, and valid blocks', () => {
  assert.equal(readClaim('no claim').kind, 'missing');
  assert.equal(readClaim(`${START}\nnot json\n${END}`).kind, 'invalid');
  assert.deepEqual(readClaim(pr(1, claim()).body).value, claim());
});

test('WORK COORDINATION: claims bind actor, branch, repository, and authority flags', () => {
  assert.equal(checkClaim(claim(), policy, { headRefName: claim().branch }).valid, true);
  assert.equal(checkClaim(claim({ paths: ['.github/pull_request_template.md'] }), policy).valid, true);
  assert.equal(checkClaim(claim({ actorRef: 'unregistered' }), policy).valid, false);
  assert.equal(checkClaim(claim({ implementationAuthority: true }), policy).valid, false);
  assert.equal(checkClaim(claim({ extraPayload: 'blocked' }), policy).valid, false);
  assert.equal(checkClaim(claim({ paths: ['../private'] }), policy).valid, false);
});

test('WORK COORDINATION: path comparison catches parent-child overlap', () => {
  assert.equal(pathOverlap('pages/', 'pages/terrain-map.html'), true);
  assert.equal(pathOverlap('pages/one.html', 'pages/two.html'), false);
});

test('WORK COORDINATION: two active owners on one surface fail closed', () => {
  const other = claim({
    workRef: 'work.public-other',
    actorRef: 'codex-macbook-collaborator',
    instanceRef: 'codex-macbook-test',
    branch: 'VXG-071226-codex-other',
    paths: ['docs/process/coordination.md'],
  });
  const result = inspectPullRequests([pr(1, claim()), pr(2, other)], policy, '2026-07-12');
  assert.equal(result.valid, false);
  assert.match(result.errors.join(' '), /overlaps/);
});

test('WORK COORDINATION: waiting work exposes dependency without reserving paths', () => {
  const waiting = claim({
    workRef: 'work.public-waiting',
    actorRef: 'codex-macbook-collaborator',
    instanceRef: 'codex-macbook-waiting',
    branch: 'VXG-071226-codex-waiting',
    status: 'waiting',
    dependsOn: ['work.public-synthetic'],
  });
  const result = inspectPullRequests([pr(1, claim()), pr(2, waiting)], policy, '2026-07-12');
  assert.equal(result.valid, true);
  assert.equal(result.claims.length, 2);
});

test('WORK COORDINATION: expired leases and malformed claims block', () => {
  const expired = claim({ lease: { renewBy: '2026-07-11' } });
  const result = inspectPullRequests([pr(1, expired)], policy, '2026-07-12');
  assert.equal(result.valid, false);
  assert.match(result.errors.join(' '), /lease expired/);
});

test('WORK COORDINATION: legacy PRs warn but never become inferred claims', () => {
  const result = inspectPullRequests([{ number: 1, title: 'legacy', body: '' }], policy, '2026-07-12');
  assert.equal(result.valid, true);
  assert.equal(result.claims.length, 0);
  assert.equal(result.unclaimed.length, 1);
});

// [VXG RealForever]
