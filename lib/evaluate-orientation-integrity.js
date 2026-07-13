#!/usr/bin/env node
/**
 * Runs deterministic task-packet scenarios plus graph-wide invariants and
 * writes a compact, auditable evaluation projection.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { selectOrientationContext } = require('./select-orientation-context');

const ROOT = path.join(__dirname, '..');
const SUITE_PATH = path.join(ROOT, 'config', 'orientation-integrity-evaluation.json');
const PROJECTION_PATH = path.join(ROOT, 'data', 'orientation-map.json');
const OUT_PATH = path.join(ROOT, 'data', 'orientation-integrity-evaluation.json');

function validateSuite(suite) {
  const issues = [];
  if (suite.schemaVersion !== 'orientation-integrity.evaluation-suite/v1') {
    issues.push('schemaVersion must be orientation-integrity.evaluation-suite/v1');
  }
  if (!Number.isInteger(suite.maxPacketMaps) || suite.maxPacketMaps < 2 || suite.maxPacketMaps > 5) {
    issues.push('maxPacketMaps must be an integer from 2 through 5');
  }
  for (const field of ['requiredArtifacts', 'forbiddenReadPatterns', 'scenarios']) {
    if (!Array.isArray(suite[field])) issues.push(`${field} must be an array`);
  }
  if (!suite.invariants || typeof suite.invariants !== 'object') issues.push('invariants must be an object');
  for (const itemPath of suite.requiredArtifacts || []) {
    if (!itemPath || path.isAbsolute(itemPath) || itemPath.split('/').includes('..')) {
      issues.push(`unsafe requiredArtifact: ${itemPath || '(empty)'}`);
    }
  }
  const ids = new Set();
  for (const scenario of suite.scenarios || []) {
    if (!scenario.id || ids.has(scenario.id)) issues.push(`scenario id is missing or duplicated: ${scenario.id || '(missing)'}`);
    ids.add(scenario.id);
    if (!scenario.request || !scenario.expect) issues.push(`${scenario.id} must include request and expect`);
    for (const field of ['includeMaps', 'excludeMaps', 'includeReads', 'gapPatterns']) {
      if (!Array.isArray(scenario.expect && scenario.expect[field])) issues.push(`${scenario.id}.expect.${field} must be an array`);
    }
    for (const pattern of (scenario.expect && scenario.expect.gapPatterns) || []) {
      try { new RegExp(pattern); } catch { issues.push(`${scenario.id} has invalid gapPattern: ${pattern}`); }
    }
  }
  for (const pattern of suite.forbiddenReadPatterns || []) {
    try { new RegExp(pattern); } catch { issues.push(`invalid forbiddenReadPattern: ${pattern}`); }
  }
  return issues;
}

function result(name, pass, detail) {
  return { name, pass: Boolean(pass), detail };
}

function evaluateScenario(scenario, projection, suite) {
  const packet = selectOrientationContext(projection, {
    ...scenario.request,
    maxMaps: suite.maxPacketMaps,
  });
  const mapIds = packet.maps.map(map => map.id);
  const readPaths = packet.readOrder.map(read => read.path);
  const checks = [
    result('status', packet.status === scenario.expect.status, `${packet.status} == ${scenario.expect.status}`),
    result('map-cap', mapIds.length <= suite.maxPacketMaps, `${mapIds.length} <= ${suite.maxPacketMaps}`),
    result('required-maps', scenario.expect.includeMaps.every(id => mapIds.includes(id)), mapIds.join(', ')),
    result('excluded-maps', scenario.expect.excludeMaps.every(id => !mapIds.includes(id)), mapIds.join(', ')),
    result('required-reads', scenario.expect.includeReads.every(itemPath => readPaths.includes(itemPath)), readPaths.join(', ')),
    result('required-gaps', scenario.expect.gapPatterns.every(pattern => packet.gaps.some(gap => new RegExp(pattern).test(gap))), packet.gaps.join(' | ')),
    result('forbidden-reads', suite.forbiddenReadPatterns.every(pattern => readPaths.every(itemPath => !new RegExp(pattern).test(itemPath))), readPaths.join(', ')),
  ];
  return {
    id: scenario.id,
    description: scenario.description,
    pass: checks.every(check => check.pass),
    checks,
    packet: {
      status: packet.status,
      maps: mapIds,
      reads: readPaths,
      healthChecks: packet.healthChecks,
      gaps: packet.gaps,
    },
  };
}

function checkForwardReverseParity(projection) {
  for (const map of Object.values(projection.maps)) {
    for (const edge of map.forwardEdges) {
      const target = projection.maps[edge.to];
      if (!target || !target.reverseEdges.some(reverse => reverse.from === map.id && reverse.relation === edge.relation)) return false;
    }
  }
  return true;
}

function evaluateInvariants(suite, projection, root = ROOT) {
  const allReadPaths = Object.values(projection.maps).flatMap(map => [...map.sourcePaths, ...map.projectionPaths]);
  return [
    result(
      'required-artifacts-exist',
      suite.requiredArtifacts.every(itemPath => fs.existsSync(path.join(root, itemPath))),
      `${suite.requiredArtifacts.length} required artifacts`
    ),
    result(
      'workers-remain-unknown',
      !suite.invariants.requireWorkersUnknown || projection.workers.every(worker => worker.availability === 'unknown'),
      projection.workers.map(worker => `${worker.actorRef}:${worker.availability}`).join(', ')
    ),
    result(
      'forward-reverse-parity',
      !suite.invariants.requireForwardReverseParity || checkForwardReverseParity(projection),
      `${Object.keys(projection.maps).length} maps`
    ),
    result(
      'question-targets-exist',
      !suite.invariants.requireQuestionTargets || Object.values(projection.questionIndex).every(route => Boolean(projection.maps[route.mapId])),
      `${Object.keys(projection.questionIndex).length} question routes`
    ),
    result(
      'registry-path-boundary',
      suite.forbiddenReadPatterns.every(pattern => allReadPaths.every(itemPath => !new RegExp(pattern).test(itemPath))),
      `${allReadPaths.length} registered source/projection paths`
    ),
  ];
}

function evaluateSuite(suite, projection, root = ROOT) {
  const suiteIssues = validateSuite(suite);
  if (suiteIssues.length > 0) throw new Error(suiteIssues.join('; '));
  const invariants = evaluateInvariants(suite, projection, root);
  const scenarios = suite.scenarios.map(scenario => evaluateScenario(scenario, projection, suite));
  const failedInvariants = invariants.filter(check => !check.pass).length;
  const failedScenarios = scenarios.filter(scenario => !scenario.pass).length;
  return {
    schemaVersion: 'orientation-integrity.evaluation/v1',
    sourceSuite: 'config/orientation-integrity-evaluation.json',
    sourceProjection: 'data/orientation-map.json',
    status: failedInvariants === 0 && failedScenarios === 0 ? 'pass' : 'fail',
    summary: {
      invariants: invariants.length,
      failedInvariants,
      scenarios: scenarios.length,
      failedScenarios,
    },
    invariants,
    scenarios,
    interpretation: {
      passMeans: 'The declared deterministic orientation contracts hold for this source state.',
      passDoesNotMean: 'Victor reviewed or accepted the PRs, private state was inspected, or implementation authority was granted.',
    },
  };
}

function serializeEvaluation(evaluation) {
  return `${JSON.stringify(evaluation, null, 2)}\n`;
}

function run(args = process.argv.slice(2)) {
  try {
    const suite = JSON.parse(fs.readFileSync(SUITE_PATH, 'utf8'));
    const projection = JSON.parse(fs.readFileSync(PROJECTION_PATH, 'utf8'));
    const evaluation = evaluateSuite(suite, projection);
    const output = serializeEvaluation(evaluation);
    if (args.includes('--check')) {
      const actual = fs.existsSync(OUT_PATH) ? fs.readFileSync(OUT_PATH, 'utf8') : '';
      if (actual !== output) {
        console.error('[evaluate-orientation-integrity] committed evaluation is stale');
        return 1;
      }
      if (evaluation.status !== 'pass') {
        console.error('[evaluate-orientation-integrity] evaluation contains failures');
        return 1;
      }
      console.log(`[evaluate-orientation-integrity] PASS — ${evaluation.summary.invariants} invariants, ${evaluation.summary.scenarios} scenarios.`);
      return 0;
    }
    fs.writeFileSync(OUT_PATH, output);
    console.log(`[evaluate-orientation-integrity] ${evaluation.status.toUpperCase()} → data/orientation-integrity-evaluation.json`);
    return evaluation.status === 'pass' ? 0 : 1;
  } catch (error) {
    console.error(`[evaluate-orientation-integrity] ${error.message}`);
    return 1;
  }
}

if (require.main === module) process.exitCode = run();

module.exports = {
  validateSuite,
  evaluateScenario,
  checkForwardReverseParity,
  evaluateInvariants,
  evaluateSuite,
  serializeEvaluation,
  run,
};

// [VXG RealForever]
