#!/usr/bin/env node
/**
 * Checks the architecture source ↔ reading-guide ↔ generated-projection
 * contract. A map is not trustworthy if a source can appear without a route
 * or if the public projection can lag behind its numbered sources.
 */

'use strict';

const fs   = require('fs');
const path = require('path');
const { assembleArchitecture, listSourceFiles } = require('./build-architecture');

function parseGuideRoutes(markdown) {
  const routes = [];
  const row = /^\|\s*`(docs\/architecture\/[^`]+\.md)`\s*\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|\s*$/gm;
  let match;
  while ((match = row.exec(markdown))) {
    routes.push({ path: match[1], question: match[2].trim(), trigger: match[3].trim() });
  }
  return routes;
}

function checkGuideRoutes(sourceFiles, routes) {
  const issues = [];
  const expected = new Set(sourceFiles.map(file => `docs/architecture/${file}`));
  const counts = new Map();

  for (const route of routes) {
    counts.set(route.path, (counts.get(route.path) || 0) + 1);
    if (!expected.has(route.path)) {
      issues.push({ check: 'guide-unknown', message: `${route.path} is routed but is not an architecture source` });
    }
    if (!route.question || route.question === '—') {
      issues.push({ check: 'guide-question', message: `${route.path} has no question` });
    }
    if (!route.trigger || route.trigger === '—') {
      issues.push({ check: 'guide-trigger', message: `${route.path} has no read trigger` });
    }
  }

  for (const expectedPath of expected) {
    const count = counts.get(expectedPath) || 0;
    if (count === 0) {
      issues.push({ check: 'guide-missing', message: `${expectedPath} has no reading-guide route` });
    } else if (count > 1) {
      issues.push({ check: 'guide-duplicate', message: `${expectedPath} has ${count} reading-guide routes` });
    }
  }
  return issues;
}

function checkProjection(actual, expected) {
  return actual === expected
    ? []
    : [{ check: 'projection', message: 'docs/architecture.md does not match the ordered architecture sources' }];
}

function run(root = path.join(__dirname, '..')) {
  const sourceDir = path.join(root, 'docs', 'architecture');
  const guidePath = path.join(sourceDir, '00-reading-guide.md');
  const projectionPath = path.join(root, 'docs', 'architecture.md');
  const sourceFiles = listSourceFiles(sourceDir);
  const guide = fs.readFileSync(guidePath, 'utf8');
  const actualProjection = fs.existsSync(projectionPath)
    ? fs.readFileSync(projectionPath, 'utf8')
    : '';

  return [
    ...checkGuideRoutes(sourceFiles, parseGuideRoutes(guide)),
    ...checkProjection(actualProjection, assembleArchitecture(sourceDir)),
  ];
}

if (require.main === module) {
  const issues = run();
  if (process.argv.includes('--json')) {
    console.log(JSON.stringify({ clean: issues.length === 0, issues }, null, 2));
  } else {
    console.log(`[check-architecture-integrity] ${issues.length === 0 ? 'Source, guide, and projection agree.' : `${issues.length} issue(s):`}`);
    for (const issue of issues) console.log(`  [${issue.check}] ${issue.message}`);
  }
  if (issues.length > 0) process.exitCode = 1;
}

module.exports = {
  parseGuideRoutes,
  checkGuideRoutes,
  checkProjection,
  run,
};

// [VXG RealForever]
