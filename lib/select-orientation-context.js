#!/usr/bin/env node
/**
 * Deterministically selects a bounded orientation packet from the generated
 * map graph. No network, embeddings, AI/RAG inference, filesystem crawl, or
 * private-path discovery occurs here.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const PROJECTION_PATH = path.join(ROOT, 'data', 'orientation-map.json');
const BASELINE_MAPS = ['cold-start', 'work-coordination'];
const DEFAULT_MAX_MAPS = 5;

function normalizeText(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9./_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeRepoPath(value) {
  const normalized = String(value || '').replace(/\\/g, '/').replace(/^\.\//, '');
  if (!normalized || path.posix.isAbsolute(normalized) || /^[a-z]:\//i.test(normalized) || normalized.includes('\0') || normalized.split('/').includes('..')) {
    throw new Error(`unsafe or empty repository path: ${value}`);
  }
  return normalized.replace(/\/+$/, '');
}

function pathMatches(registeredPath, requestedPath) {
  return requestedPath === registeredPath || requestedPath.startsWith(`${registeredPath}/`);
}

function addReason(scores, mapId, points, reason) {
  if (!scores.has(mapId)) scores.set(mapId, { score: 0, reasons: [] });
  const entry = scores.get(mapId);
  entry.score += points;
  if (!entry.reasons.includes(reason)) entry.reasons.push(reason);
}

function scoreMaps(projection, request) {
  const scores = new Map();
  const gaps = [];
  const task = normalizeText(request.task);
  const questionIds = [...new Set(request.questionIds || [])].sort();
  const requestedPaths = [...new Set(request.paths || [])].map(normalizeRepoPath).sort();

  for (const mapId of BASELINE_MAPS) addReason(scores, mapId, 0, 'required safety baseline');

  for (const questionId of questionIds) {
    const route = projection.questionIndex[questionId];
    if (!route) {
      gaps.push(`Unknown question id: ${questionId}`);
      continue;
    }
    addReason(scores, route.mapId, 100, `explicit question: ${questionId}`);
  }

  for (const requestedPath of requestedPaths) {
    let matched = false;
    for (const [registeredPath, routes] of Object.entries(projection.pathIndex)) {
      if (!pathMatches(registeredPath, requestedPath)) continue;
      matched = true;
      for (const mapId of [...routes.sourceFor, ...routes.projectionFor]) {
        addReason(scores, mapId, 80, `path route: ${requestedPath} via ${registeredPath}`);
      }
    }
    if (!matched) gaps.push(`No registered map path contains: ${requestedPath}`);
  }

  if (task) {
    for (const map of Object.values(projection.maps)) {
      for (const trigger of map.triggers) {
        const normalizedTrigger = normalizeText(trigger);
        if (!normalizedTrigger || !task.includes(normalizedTrigger)) continue;
        const weight = 20 + normalizedTrigger.split(' ').length;
        addReason(scores, map.id, weight, `task trigger: ${trigger}`);
      }
    }
  }

  const taskSpecific = [...scores.entries()]
    .filter(([mapId, entry]) => !BASELINE_MAPS.includes(mapId) && entry.score > 0);
  if (taskSpecific.length === 0 && questionIds.length === 0 && requestedPaths.length === 0) {
    gaps.push('No task-specific trigger matched; packet remains at the safety baseline.');
  }
  return { scores, gaps, requestedPaths };
}

function selectMapIds(scores, maxMaps = DEFAULT_MAX_MAPS) {
  const boundedMax = Math.max(BASELINE_MAPS.length, Math.min(DEFAULT_MAX_MAPS, Number(maxMaps) || DEFAULT_MAX_MAPS));
  const selected = [...BASELINE_MAPS];
  const candidates = [...scores.entries()]
    .filter(([mapId, entry]) => !BASELINE_MAPS.includes(mapId) && entry.score > 0)
    .sort(([aId, a], [bId, b]) => b.score - a.score || aId.localeCompare(bId));
  for (const [mapId] of candidates) {
    if (selected.length >= boundedMax) break;
    selected.push(mapId);
  }
  return selected;
}

function buildReadOrder(projection, mapIds) {
  const seen = new Set();
  const reads = [];
  for (const mapId of mapIds) {
    const map = projection.maps[mapId];
    for (const [kind, paths] of [['source', map.sourcePaths], ['projection', map.projectionPaths]]) {
      for (const itemPath of paths) {
        const key = `${kind}:${itemPath}`;
        if (seen.has(key)) continue;
        seen.add(key);
        reads.push({ mapId, kind, path: itemPath });
      }
    }
  }
  return reads;
}

function selectOrientationContext(projection, request = {}) {
  if (!projection || projection.schemaVersion !== 'orientation-map.projection/v1') {
    throw new Error('orientation-map.projection/v1 is required');
  }
  const { scores, gaps, requestedPaths } = scoreMaps(projection, request);
  const mapIds = selectMapIds(scores, request.maxMaps);
  const maps = mapIds.map(mapId => {
    const map = projection.maps[mapId];
    const score = scores.get(mapId) || { score: 0, reasons: ['required safety baseline'] };
    return {
      id: map.id,
      score: score.score,
      reasons: [...score.reasons].sort(),
      authority: map.authority,
      freshness: map.freshness,
      lastVerified: map.lastVerified,
      sourcePaths: map.sourcePaths,
      projectionPaths: map.projectionPaths,
      health: map.health,
      exclusions: map.exclusions,
      nextRoutes: {
        forward: map.forwardEdges,
        reverse: map.reverseEdges,
      },
    };
  });
  const matchedSignal = [...scores.values()].some(entry => entry.score > 0);

  return {
    schemaVersion: 'orientation-context.packet/v1',
    request: {
      task: String(request.task || ''),
      questionIds: [...new Set(request.questionIds || [])].sort(),
      paths: requestedPaths,
    },
    status: matchedSignal ? 'routed' : 'partial',
    selectionPolicy: {
      baselineMaps: BASELINE_MAPS,
      maxMaps: Math.max(BASELINE_MAPS.length, Math.min(DEFAULT_MAX_MAPS, Number(request.maxMaps) || DEFAULT_MAX_MAPS)),
      expansion: 'matched maps only; adjacent edges are returned as next routes, not auto-loaded',
    },
    maps,
    readOrder: buildReadOrder(projection, mapIds),
    healthChecks: [...new Set(maps.map(map => map.health.checker).filter(Boolean))],
    gaps,
    boundaries: projection.boundaries,
  };
}

function parseArgs(args) {
  const request = { task: '', questionIds: [], paths: [] };
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === '--task') request.task = args[++index] || '';
    else if (arg === '--question') request.questionIds.push(args[++index] || '');
    else if (arg === '--path') request.paths.push(args[++index] || '');
    else if (arg === '--max-maps') request.maxMaps = Number(args[++index]);
    else if (arg !== '--json') throw new Error(`unknown argument: ${arg}`);
  }
  return request;
}

function run(args = process.argv.slice(2)) {
  try {
    const projection = JSON.parse(fs.readFileSync(PROJECTION_PATH, 'utf8'));
    const packet = selectOrientationContext(projection, parseArgs(args));
    console.log(JSON.stringify(packet, null, 2));
    return 0;
  } catch (error) {
    console.error(`[select-orientation-context] ${error.message}`);
    return 1;
  }
}

if (require.main === module) process.exitCode = run();

module.exports = {
  BASELINE_MAPS,
  DEFAULT_MAX_MAPS,
  normalizeText,
  normalizeRepoPath,
  pathMatches,
  scoreMaps,
  selectMapIds,
  buildReadOrder,
  selectOrientationContext,
  parseArgs,
  run,
};

// [VXG RealForever]
