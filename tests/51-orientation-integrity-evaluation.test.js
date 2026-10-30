'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const suite = require('../config/orientation-integrity-evaluation.json');
const projection = require('../data/orientation-map.json');
const {
  validateSuite,
  evaluateScenario,
  checkForwardReverseParity,
  evaluateInvariants,
  evaluateSuite,
  serializeEvaluation,
} = require('../lib/evaluate-orientation-integrity');

const ROOT = path.join(__dirname, '..');

test('ORIENTATION-EVALUATION: the authored suite is structurally valid', () => {
  assert.deepEqual(validateSuite(suite), []);
});

test('ORIENTATION-EVALUATION: duplicate scenarios and invalid caps fail closed', () => {
  const broken = {
    ...suite,
    maxPacketMaps: 99,
    scenarios: [suite.scenarios[0], suite.scenarios[0]],
  };
  const issues = validateSuite(broken);
  assert.ok(issues.some(issue => /maxPacketMaps/.test(issue)));
  assert.ok(issues.some(issue => /duplicated/.test(issue)));
});

test('ORIENTATION-EVALUATION: unsafe artifact paths and invalid scenario regexes fail closed', () => {
  const broken = JSON.parse(JSON.stringify(suite));
  broken.requiredArtifacts.push('../Vextreme-SDK/private');
  broken.scenarios[0].expect.gapPatterns.push('[');
  const issues = validateSuite(broken);
  assert.ok(issues.some(issue => /unsafe requiredArtifact/.test(issue)));
  assert.ok(issues.some(issue => /invalid gapPattern/.test(issue)));
});

test('ORIENTATION-EVALUATION: every real scenario passes its declared contract', () => {
  for (const scenario of suite.scenarios) {
    const outcome = evaluateScenario(scenario, projection, suite);
    assert.equal(outcome.pass, true, `${scenario.id}: ${JSON.stringify(outcome.checks.filter(check => !check.pass))}`);
  }
});

test('ORIENTATION-EVALUATION: removing a required map produces an auditable failure', () => {
  const scenario = suite.scenarios.find(item => item.id === 'page-navigation');
  const altered = JSON.parse(JSON.stringify(scenario));
  altered.expect.includeMaps.push('not-a-map');
  const outcome = evaluateScenario(altered, projection, suite);
  assert.equal(outcome.pass, false);
  assert.equal(outcome.checks.find(check => check.name === 'required-maps').pass, false);
});

test('ORIENTATION-EVALUATION: generated reverse edges close every authored forward edge', () => {
  assert.equal(checkForwardReverseParity(projection), true);
  const altered = JSON.parse(JSON.stringify(projection));
  const firstEdgeMap = Object.values(altered.maps).find(map => map.forwardEdges.length > 0);
  altered.maps[firstEdgeMap.forwardEdges[0].to].reverseEdges = [];
  assert.equal(checkForwardReverseParity(altered), false);
});

test('ORIENTATION-EVALUATION: full result is deterministic and all invariants pass', () => {
  const first = evaluateSuite(suite, projection, ROOT);
  const second = evaluateSuite(suite, projection, ROOT);
  assert.deepEqual(first, second);
  assert.equal(first.status, 'pass');
  assert.equal(first.summary.failedInvariants, 0);
  assert.equal(first.summary.failedScenarios, 0);
});

test('ORIENTATION-EVALUATION: a worker promoted to available fails the availability invariant', () => {
  const altered = JSON.parse(JSON.stringify(projection));
  altered.workers[0].availability = 'available';
  const availability = evaluateInvariants(suite, altered, ROOT)
    .find(check => check.name === 'workers-remain-unknown');
  assert.equal(availability.pass, false);
});

test('ORIENTATION-EVALUATION: required closeout artifacts avoid PR #128 continuity surfaces', () => {
  assert.ok(suite.requiredArtifacts.every(itemPath => !itemPath.startsWith('docs/continuity/')));
  assert.ok(suite.requiredArtifacts.every(itemPath => !/covenant/i.test(itemPath)));
});

test('ORIENTATION-EVALUATION integration: committed evaluation equals a fresh PASS result', () => {
  const expected = serializeEvaluation(evaluateSuite(suite, projection, ROOT));
  const actual = fs.readFileSync(path.join(ROOT, 'data', 'orientation-integrity-evaluation.json'), 'utf8');
  assert.equal(actual, expected);
});

// [VXG RealForever]
