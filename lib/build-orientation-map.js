#!/usr/bin/env node
/**
 * Builds the public map-of-maps projection. Relationships are authored once as
 * forwardEdges; reverse edges, question routes, path routes, and worker views
 * are derived deterministically.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const REGISTRY_PATH = path.join(ROOT, 'config', 'orientation-maps.json');
const COORDINATION_PATH = path.join(ROOT, 'config', 'work-coordination.json');
const OUT_PATH = path.join(ROOT, 'data', 'orientation-map.json');
const AUTHORITY_STATES = new Set([
  'accepted', 'observed', 'generated', 'proposed', 'historical', 'partial',
  'private-reference', 'unknown',
]);

function validateRegistry(registry, root = null) {
  const issues = [];
  if (registry.schemaVersion !== 'orientation-maps.registry/v1') {
    issues.push('schemaVersion must be orientation-maps.registry/v1');
  }
  if (!Array.isArray(registry.maps) || registry.maps.length === 0) {
    return [...issues, 'maps must be a non-empty array'];
  }

  const ids = new Set();
  const questionIds = new Set();
  for (const map of registry.maps) {
    if (!map.id || ids.has(map.id)) issues.push(`map id is missing or duplicated: ${map.id || '(missing)'}`);
    ids.add(map.id);
    for (const field of ['type', 'scope', 'visibility', 'freshness']) {
      if (!map[field]) issues.push(`${map.id || '(missing)'} is missing ${field}`);
    }
    for (const field of ['authority', 'sourcePaths', 'projectionPaths', 'questions', 'exclusions', 'triggers', 'forwardEdges']) {
      if (!Array.isArray(map[field])) issues.push(`${map.id || '(missing)'}.${field} must be an array`);
    }
    for (const state of map.authority || []) {
      if (!AUTHORITY_STATES.has(state)) issues.push(`${map.id} has unknown authority state ${state}`);
    }
    for (const question of map.questions || []) {
      if (!question.id || !question.text) issues.push(`${map.id} has a question without id/text`);
      if (questionIds.has(question.id)) issues.push(`question id is duplicated: ${question.id}`);
      questionIds.add(question.id);
    }
    if (!map.health || !map.health.state) issues.push(`${map.id} is missing health state`);
    if (!map.lastVerified || !map.lastVerified.date || !map.lastVerified.evidence) issues.push(`${map.id} is missing lastVerified evidence`);
    if (!Object.prototype.hasOwnProperty.call(map, 'supersededBy')) issues.push(`${map.id} is missing supersededBy`);
    for (const sourcePath of [...(map.sourcePaths || []), ...(map.projectionPaths || [])]) {
      if (path.isAbsolute(sourcePath) || sourcePath.includes('..')) issues.push(`${map.id} has unsafe path ${sourcePath}`);
      if (root && !fs.existsSync(path.join(root, sourcePath))) issues.push(`${map.id} path does not exist: ${sourcePath}`);
    }
  }

  for (const map of registry.maps) {
    for (const edge of map.forwardEdges || []) {
      if (!edge.to || !edge.relation) issues.push(`${map.id} has an incomplete forward edge`);
      else if (!ids.has(edge.to)) issues.push(`${map.id} points to unknown map ${edge.to}`);
    }
    if (map.supersededBy !== null && !ids.has(map.supersededBy)) {
      issues.push(`${map.id} is superseded by unknown map ${map.supersededBy}`);
    }
  }
  return issues;
}

function buildReverseEdges(maps) {
  const reverse = Object.fromEntries(maps.map(map => [map.id, []]));
  for (const map of maps) {
    for (const edge of map.forwardEdges) {
      reverse[edge.to].push({ from: map.id, relation: edge.relation });
    }
  }
  for (const edges of Object.values(reverse)) {
    edges.sort((a, b) => a.from.localeCompare(b.from) || a.relation.localeCompare(b.relation));
  }
  return reverse;
}

function buildQuestionIndex(maps) {
  const index = {};
  for (const map of maps) {
    for (const question of map.questions) {
      index[question.id] = { mapId: map.id, text: question.text };
    }
  }
  return Object.fromEntries(Object.entries(index).sort(([a], [b]) => a.localeCompare(b)));
}

function buildPathIndex(maps) {
  const index = {};
  for (const map of maps) {
    for (const [kind, paths] of [['sourceFor', map.sourcePaths], ['projectionFor', map.projectionPaths]]) {
      for (const itemPath of paths) {
        if (!index[itemPath]) index[itemPath] = { sourceFor: [], projectionFor: [] };
        index[itemPath][kind].push(map.id);
      }
    }
  }
  for (const record of Object.values(index)) {
    record.sourceFor.sort();
    record.projectionFor.sort();
  }
  return Object.fromEntries(Object.entries(index).sort(([a], [b]) => a.localeCompare(b)));
}

function buildWorkers(participants, claims = [], claimsObserved = false) {
  return participants.map(participant => {
    const actorClaims = claims
      .filter(claim => claim.actorRef === participant.actorRef)
      .map(claim => ({
        workRef: claim.workRef,
        status: claim.status,
        epic: claim.epic || null,
        paths: [...(claim.paths || [])].sort(),
      }))
      .sort((a, b) => a.workRef.localeCompare(b.workRef));
    return {
      actorRef: participant.actorRef,
      agentType: participant.agentType,
      environmentRef: participant.environmentRef,
      availability: 'unknown',
      claimObservation: claimsObserved ? 'observed' : 'not-observed',
      claims: actorClaims,
    };
  }).sort((a, b) => a.actorRef.localeCompare(b.actorRef));
}

function buildProjection(registry, coordination, options = {}) {
  const reverse = buildReverseEdges(registry.maps);
  const maps = Object.fromEntries(registry.maps.map(map => [map.id, {
    ...map,
    reverseEdges: reverse[map.id],
  }]));
  return {
    schemaVersion: 'orientation-map.projection/v1',
    repository: registry.repository,
    sourceRegistry: 'config/orientation-maps.json',
    maps,
    questionIndex: buildQuestionIndex(registry.maps),
    pathIndex: buildPathIndex(registry.maps),
    workers: buildWorkers(coordination.participants, options.claims || [], Boolean(options.claimsObserved)),
    boundaries: {
      availability: 'Claims never prove availability; without separate live evidence availability remains unknown.',
      authority: 'This projection routes evidence and never grants implementation or disclosure authority.',
      privateState: 'Private implementation mechanics, counts, roadmap state, credentials, and client data are excluded.',
    },
  };
}

function serializeProjection(projection) {
  return `${JSON.stringify(projection, null, 2)}\n`;
}

function run(args = process.argv.slice(2)) {
  const registry = JSON.parse(fs.readFileSync(REGISTRY_PATH, 'utf8'));
  const coordination = JSON.parse(fs.readFileSync(COORDINATION_PATH, 'utf8'));
  const issues = validateRegistry(registry, ROOT);
  if (issues.length > 0) {
    for (const issue of issues) console.error(`[build-orientation-map] ${issue}`);
    return 1;
  }
  const output = serializeProjection(buildProjection(registry, coordination));
  if (args.includes('--check')) {
    const actual = fs.existsSync(OUT_PATH) ? fs.readFileSync(OUT_PATH, 'utf8') : '';
    if (actual !== output) {
      console.error('[build-orientation-map] data/orientation-map.json is stale');
      return 1;
    }
    console.log(`[build-orientation-map] ${registry.maps.length} maps agree with the generated projection.`);
    return 0;
  }
  fs.writeFileSync(OUT_PATH, output);
  console.log(`[build-orientation-map] Wrote ${registry.maps.length} maps → data/orientation-map.json`);
  return 0;
}

if (require.main === module) process.exitCode = run();

module.exports = {
  validateRegistry,
  buildReverseEdges,
  buildQuestionIndex,
  buildPathIndex,
  buildWorkers,
  buildProjection,
  serializeProjection,
  run,
};

// [VXG RealForever]
