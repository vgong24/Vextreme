#!/usr/bin/env node
/**
 * Fails when a file under docs/ has no route, matches multiple routes, or uses
 * a collection as a catch-all. This is placement integrity: specialized checks
 * still own the internal bindings of architecture, continuity, and screenshots.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const REGISTRY_PATH = path.join(ROOT, 'config', 'document-routing.json');

function toPosix(value) {
  return value.split(path.sep).join('/');
}

function walkFiles(dir, root = ROOT) {
  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const absolute = path.join(dir, entry.name);
    if (entry.isSymbolicLink()) {
      files.push({ path: toPosix(path.relative(root, absolute)), symlink: true });
    } else if (entry.isDirectory()) {
      files.push(...walkFiles(absolute, root));
    } else if (entry.isFile()) {
      files.push({ path: toPosix(path.relative(root, absolute)), symlink: false });
    }
  }
  return files.sort((a, b) => a.path.localeCompare(b.path));
}

function compileCollections(registry) {
  return (registry.collections || []).map(collection => ({
    ...collection,
    regex: new RegExp(collection.pattern),
  }));
}

function matchingRoutes(filePath, registry) {
  const matches = [];
  for (const document of registry.exactDocuments || []) {
    if (document.path === filePath) matches.push({ type: 'exact', id: document.path });
  }
  for (const collection of compileCollections(registry)) {
    if (collection.regex.test(filePath)) matches.push({ type: 'collection', id: collection.id });
  }
  return matches;
}

function checkCoverage(files, registry) {
  const issues = [];
  for (const file of files) {
    if (file.symlink) {
      issues.push({ check: 'document-symlink', path: file.path, message: `${file.path} is a symlink; docs routes must bind real repository files` });
      continue;
    }
    const matches = matchingRoutes(file.path, registry);
    if (matches.length === 0) {
      issues.push({ check: 'stray-document', path: file.path, message: `${file.path} has no document route` });
    } else if (matches.length > 1) {
      issues.push({ check: 'ambiguous-document', path: file.path, message: `${file.path} matches multiple routes: ${matches.map(match => match.id).join(', ')}` });
    }
  }
  return issues;
}

function safeRepoPath(value) {
  return typeof value === 'string'
    && value.length > 0
    && !path.posix.isAbsolute(value)
    && !/^[a-z]:\//i.test(value)
    && !value.split('/').includes('..');
}

function validateRegistry(registry, root = ROOT, files = null) {
  const issues = [];
  if (registry.schemaVersion !== 'document-routing.registry/v1') issues.push('schemaVersion must be document-routing.registry/v1');
  if (registry.root !== 'docs') issues.push('root must be docs');
  if (!Array.isArray(registry.exactDocuments)) issues.push('exactDocuments must be an array');
  if (!Array.isArray(registry.collections)) issues.push('collections must be an array');

  const exactPaths = new Set();
  for (const document of registry.exactDocuments || []) {
    if (!safeRepoPath(document.path) || !document.path.startsWith('docs/')) issues.push(`unsafe exact document path: ${document.path}`);
    if (exactPaths.has(document.path)) issues.push(`duplicate exact document: ${document.path}`);
    exactPaths.add(document.path);
    if (!document.category || !document.authority || !document.healthCheck) issues.push(`${document.path} is missing category, authority, or healthCheck`);
    if (!safeRepoPath(document.routeOwner) || document.routeOwner === document.path) issues.push(`${document.path} has an invalid routeOwner`);
    const absolute = path.join(root, document.path);
    const ownerAbsolute = path.join(root, document.routeOwner || '');
    if (!fs.existsSync(absolute)) issues.push(`exact document does not exist: ${document.path}`);
    if (!fs.existsSync(ownerAbsolute)) {
      issues.push(`route owner does not exist for ${document.path}: ${document.routeOwner}`);
    } else if (!fs.readFileSync(ownerAbsolute, 'utf8').includes(document.path)) {
      issues.push(`route owner ${document.routeOwner} does not name ${document.path}`);
    }
  }

  const collectionIds = new Set();
  const discovered = files || walkFiles(path.join(root, registry.root || 'docs'), root);
  for (const collection of registry.collections || []) {
    if (!collection.id || collectionIds.has(collection.id)) issues.push(`collection id is missing or duplicated: ${collection.id || '(missing)'}`);
    collectionIds.add(collection.id);
    if (!collection.pattern || !collection.pattern.startsWith('^docs/') || !collection.pattern.endsWith('$')) issues.push(`${collection.id} pattern must be anchored under docs/`);
    if ((collection.pattern || '').includes('.*') || (collection.pattern || '').includes('.+')) issues.push(`${collection.id} pattern cannot use a catch-all wildcard`);
    let regex = null;
    try { regex = new RegExp(collection.pattern); } catch { issues.push(`${collection.id} has an invalid pattern`); }
    if (!collection.category || !collection.authority || !collection.healthCheck || !collection.placementRule) issues.push(`${collection.id} is missing routing metadata`);
    if (!safeRepoPath(collection.routeOwner) || !fs.existsSync(path.join(root, collection.routeOwner || ''))) issues.push(`${collection.id} routeOwner does not exist`);
    if (regex && !discovered.some(file => regex.test(file.path))) issues.push(`${collection.id} matches no current docs file`);
  }
  return issues;
}

function run(root = ROOT) {
  const registry = JSON.parse(fs.readFileSync(path.join(root, 'config', 'document-routing.json'), 'utf8'));
  const files = walkFiles(path.join(root, 'docs'), root);
  const registryIssues = validateRegistry(registry, root, files)
    .map(message => ({ check: 'registry', path: null, message }));
  return { files, issues: [...registryIssues, ...checkCoverage(files, registry)] };
}

if (require.main === module) {
  const report = run();
  if (process.argv.includes('--json')) {
    console.log(JSON.stringify({ clean: report.issues.length === 0, fileCount: report.files.length, issues: report.issues }, null, 2));
  } else {
    console.log(`[check-document-routes] ${report.issues.length === 0 ? `${report.files.length} docs files each have exactly one route.` : `${report.issues.length} issue(s):`}`);
    for (const issue of report.issues) console.log(`  [${issue.check}] ${issue.message}`);
  }
  if (report.issues.length > 0) process.exitCode = 1;
}

module.exports = {
  walkFiles,
  compileCollections,
  matchingRoutes,
  checkCoverage,
  safeRepoPath,
  validateRegistry,
  run,
};

// [VXG RealForever]
