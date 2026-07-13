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
  renderClaims,
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

function pr(number, value, overrides = {}) {
  return {
    number,
    title: `Synthetic ${number}`,
    headRefName: value.branch,
    baseRefName: 'main',
    isDraft: true,
    url: `https://example.invalid/${number}`,
    body: `${START}\n${JSON.stringify(value)}\n${END}`,
    ...overrides,
  };
}

test('WORK COORDINATION: public registry is valid and non-authoritative', () => {
  assert.equal(checkPolicy(policy).valid, true);
  assert.equal(policy.policy.unknownLiveStateMeansFree, false);
  assert.equal(policy.policy.claimGrantsAuthority, false);
  assert.equal(policy.policy.maxOpenClaimsPerWindow, 5);
  assert.equal(policy.policy.refillWindowAtOrBelow, 2);
  assert.equal(policy.policy.maxConcurrentWindowsPerActorEpic, 2);
  assert.equal(policy.policy.maxOpenWindowClaimsPerActorEpic, 7);
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
  assert.equal(checkClaim(claim({ windowRef: 'window.public-1' }), policy).valid, true);
  assert.equal(checkClaim(claim({ windowRef: '../private' }), policy).valid, false);
  assert.equal(checkClaim(claim({ stackedOn: 'work.parent', dependsOn: ['work.parent'] }), policy).valid, true);
  assert.equal(checkClaim(claim({ stackedOn: 'work.parent', dependsOn: [] }), policy).valid, false);
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

test('WORK COORDINATION: one ordered window may stack overlapping rows', () => {
  const first = claim({ windowRef: 'window.public-1' });
  const second = claim({
    workRef: 'work.public-second',
    branch: 'VXG-071226-codex-public-second',
    epic: { name: 'Public Synthetic', item: '2/2' },
    windowRef: 'window.public-1',
    paths: ['docs/process/coordination.md'],
    dependsOn: [first.workRef],
    stackedOn: first.workRef,
  });
  const result = inspectPullRequests([
    pr(1, first),
    pr(2, second, { baseRefName: first.branch }),
  ], policy, '2026-07-12');
  assert.equal(result.valid, true);
  assert.equal(result.windows[0].openClaims, 2);
  assert.equal(result.windows[0].refillEligible, true);
  assert.match(renderClaims(result, 'available').join('\n'), /window window\.public-1: 2\/5 open; refill eligible/);
});

test('WORK COORDINATION: window overlap still requires one actor, instance, epic, and dependency order', () => {
  const first = claim({ windowRef: 'window.public-1' });
  const unordered = claim({
    workRef: 'work.public-unordered',
    branch: 'VXG-071226-codex-public-unordered',
    windowRef: 'window.public-1',
    paths: ['docs/process/coordination.md'],
  });
  const otherActor = claim({
    workRef: 'work.public-other-actor',
    actorRef: 'codex-macbook-collaborator',
    branch: 'VXG-071226-codex-public-other-actor',
    windowRef: 'window.public-1',
    paths: ['docs/process/coordination.md'],
    dependsOn: [first.workRef],
    stackedOn: first.workRef,
  });
  assert.equal(inspectPullRequests([pr(1, first), pr(2, unordered)], policy, '2026-07-12').valid, false);
  assert.equal(inspectPullRequests([pr(1, first), pr(2, otherActor)], policy, '2026-07-12').valid, false);
  const wrongBase = claim({
    workRef: 'work.public-wrong-base',
    branch: 'VXG-071226-codex-public-wrong-base',
    windowRef: 'window.public-1',
    paths: ['docs/process/coordination.md'],
    dependsOn: [first.workRef],
    stackedOn: first.workRef,
  });
  assert.equal(inspectPullRequests([pr(1, first), pr(2, wrongBase)], policy, '2026-07-12').valid, false);
  const missingParent = claim({
    workRef: 'work.public-missing-parent',
    branch: 'VXG-071226-codex-public-missing-parent',
    windowRef: 'window.public-1',
    paths: ['docs/process/independent.md'],
    dependsOn: ['work.closed-parent'],
    stackedOn: 'work.closed-parent',
  });
  const missingResult = inspectPullRequests([pr(1, missingParent)], policy, '2026-07-12');
  assert.equal(missingResult.valid, false);
  assert.match(missingResult.errors.join(' '), /stacked parent work\.closed-parent is not an open claim/);
});

test('WORK COORDINATION: one window cannot mix owner identity or contain a dependency cycle', () => {
  const first = claim({
    workRef: 'work.public-first',
    branch: 'VXG-071226-codex-public-first',
    windowRef: 'window.public-1',
    paths: ['docs/process/first.md'],
    dependsOn: ['work.public-second'],
  });
  const second = claim({
    workRef: 'work.public-second',
    branch: 'VXG-071226-codex-public-second',
    windowRef: 'window.public-1',
    paths: ['docs/process/second.md'],
    dependsOn: [first.workRef],
  });
  const cycle = inspectPullRequests([pr(1, first), pr(2, second)], policy, '2026-07-12');
  assert.equal(cycle.valid, false);
  assert.match(cycle.errors.join(' '), /dependency cycle/);

  second.dependsOn = [];
  second.actorRef = 'codex-macbook-collaborator';
  const mixed = inspectPullRequests([pr(1, first), pr(2, second)], policy, '2026-07-12');
  assert.equal(mixed.valid, false);
  assert.match(mixed.errors.join(' '), /one actor, instance, and epic/);
});

test('WORK COORDINATION: one window is bounded to five open claims', () => {
  const claims = Array.from({ length: 6 }, (_, index) => claim({
    workRef: `work.public-${index}`,
    branch: `VXG-071226-codex-public-${index}`,
    epic: { name: 'Public Synthetic', item: `${index}/5` },
    windowRef: 'window.public-1',
    paths: [`docs/process/window-${index}.md`],
  }));
  const result = inspectPullRequests(claims.map((value, index) => pr(index + 1, value)), policy, '2026-07-12');
  assert.equal(result.valid, false);
  assert.match(result.errors.join(' '), /6 open claims; maximum is 5/);
});

test('WORK COORDINATION: one actor/instance/epic may roll into at most two windows and seven open claims', () => {
  const claims = Array.from({ length: 8 }, (_, index) => claim({
    workRef: `work.rolling-${index}`,
    branch: `VXG-071226-codex-rolling-${index}`,
    epic: { name: 'Public Synthetic', item: `${index}/7` },
    windowRef: index < 4 ? 'window.public-1' : 'window.public-2',
    paths: [`docs/process/rolling-${index}.md`],
  }));
  const tooManyClaims = inspectPullRequests(claims.map((value, index) => pr(index + 1, value)), policy, '2026-07-12');
  assert.equal(tooManyClaims.valid, false);
  assert.match(tooManyClaims.errors.join(' '), /8 open window claims; maximum is 7/);

  claims.pop();
  claims[6].windowRef = 'window.public-3';
  const tooManyWindows = inspectPullRequests(claims.map((value, index) => pr(index + 1, value)), policy, '2026-07-12');
  assert.equal(tooManyWindows.valid, false);
  assert.match(tooManyWindows.errors.join(' '), /3 concurrent windows; maximum is 2/);
});

test('WORK COORDINATION: a rolling window opens only after the older window reaches two claims', () => {
  const makeClaims = (olderCount, newerCount) => [
    ...Array.from({ length: olderCount }, (_, index) => claim({
      workRef: `work.older-${index}`,
      branch: `VXG-071226-codex-older-${index}`,
      epic: { name: 'Public Synthetic', item: `${index}/6` },
      windowRef: 'window.public-1',
      paths: [`docs/process/older-${index}.md`],
    })),
    ...Array.from({ length: newerCount }, (_, index) => claim({
      workRef: `work.newer-${index}`,
      branch: `VXG-071226-codex-newer-${index}`,
      epic: { name: 'Public Synthetic', item: `${olderCount + index}/6` },
      windowRef: 'window.public-2',
      paths: [`docs/process/newer-${index}.md`],
    })),
  ];
  const early = makeClaims(3, 4);
  const earlyResult = inspectPullRequests(early.map((value, index) => pr(index + 1, value)), policy, '2026-07-12');
  assert.equal(earlyResult.valid, false);
  assert.match(earlyResult.errors.join(' '), /older window window\.public-1 still has 3 claims/);

  const eligible = makeClaims(2, 5);
  assert.equal(inspectPullRequests(eligible.map((value, index) => pr(index + 1, value)), policy, '2026-07-12').valid, true);
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
  assert.match(renderClaims(result, 'available').join('\n'), /health: warning/);
});

// [VXG RealForever]
