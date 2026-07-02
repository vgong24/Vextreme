#!/usr/bin/env node
/**
 * VEXTREME — lib/check-key-alignment.js
 *
 * Non-blocking CI check that compares slug and arc keys across data files
 * and reports any misalignment as a JSON report (stdout) and optional
 * GitHub PR comment (via .github/workflows/key-alignment.yml).
 *
 * What it catches:
 *   - Node added to nodes.json, index.json not rebuilt (missingFromIndex)
 *   - Node deleted from nodes.json, index.json stale (extraInIndex)
 *   - Arc renamed, arcs-v2.json updated, index.json stale
 *   - build-index.js failed silently during CI
 *
 * This check is INFORMATIONAL, not blocking. JSON is string-based;
 * key drift is unavoidable without tooling — this tooling catches it.
 *
 * Run manually:   node lib/check-key-alignment.js
 *                 node lib/check-key-alignment.js --json     (JSON output only)
 * Auto-run via:   .github/workflows/key-alignment.yml on pull_request
 *
 * Exports checkKeyAlignment() for use in tests.
 */

'use strict';

const fs   = require('fs');
const path = require('path');

const ROOT     = path.join(__dirname, '..');
const NODES_IN = path.join(ROOT, 'data', 'nodes.json');
const ARCS_IN  = path.join(ROOT, 'data', 'arcs-v2.json');
const INDEX_IN = path.join(ROOT, 'data', 'index.json');

// ── Pure computation ──────────────────────────────────────────────────────────

function checkKeyAlignment() {
  const nodes = JSON.parse(fs.readFileSync(NODES_IN,  'utf8'));
  const arcs  = JSON.parse(fs.readFileSync(ARCS_IN,   'utf8'));
  const index = JSON.parse(fs.readFileSync(INDEX_IN,  'utf8'));

  const nodeSlugs   = new Set(nodes.map(n => n.slug));
  const indexSlugs  = new Set(Object.keys(index.slugMap || {}));

  // arcsDef is an object keyed by arc name; skip underscore-prefixed meta keys
  const arcIds      = new Set(Object.keys(arcs).filter(k => !k.startsWith('_')));
  const indexArcIds = new Set(Object.keys(index.arcMap || {}));

  return {
    nodes: {
      total:             nodeSlugs.size,
      inIndex:           [...nodeSlugs].filter(s => indexSlugs.has(s)).length,
      missingFromIndex:  [...nodeSlugs].filter(s => !indexSlugs.has(s)),
      extraInIndex:      [...indexSlugs].filter(s => !nodeSlugs.has(s)),
    },
    arcs: {
      total:             arcIds.size,
      inIndex:           [...arcIds].filter(a => indexArcIds.has(a)).length,
      missingFromIndex:  [...arcIds].filter(a => !indexArcIds.has(a)),
      extraInIndex:      [...indexArcIds].filter(a => !arcIds.has(a)),
    },
  };
}

// ── I/O — only runs when executed directly ────────────────────────────────────

if (require.main === module) {
  const jsonOnly = process.argv.includes('--json');

  const report = checkKeyAlignment();

  if (jsonOnly) {
    console.log(JSON.stringify(report, null, 2));
    process.exit(0);
  }

  const nd = report.nodes;
  const ar = report.arcs;

  console.log('[check-key-alignment] Results:');
  console.log(`  nodes: ${nd.total} total, ${nd.inIndex} in index`);
  if (nd.missingFromIndex.length) {
    console.warn(`  ⚠️  missing from index (${nd.missingFromIndex.length}): ${nd.missingFromIndex.join(', ')}`);
  }
  if (nd.extraInIndex.length) {
    console.warn(`  ⚠️  extra in index (${nd.extraInIndex.length}): ${nd.extraInIndex.join(', ')}`);
  }

  console.log(`  arcs:  ${ar.total} total, ${ar.inIndex} in index`);
  if (ar.missingFromIndex.length) {
    console.warn(`  ⚠️  missing from index (${ar.missingFromIndex.length}): ${ar.missingFromIndex.join(', ')}`);
  }
  if (ar.extraInIndex.length) {
    console.warn(`  ⚠️  extra in index (${ar.extraInIndex.length}): ${ar.extraInIndex.join(', ')}`);
  }

  const hasWarnings = nd.missingFromIndex.length || nd.extraInIndex.length
    || ar.missingFromIndex.length || ar.extraInIndex.length;

  if (!hasWarnings) {
    console.log('[check-key-alignment] OK — all keys aligned');
  } else {
    console.log('[check-key-alignment] Warnings above. This is informational — run node lib/build-index.js to rebuild.');
  }
}

module.exports = { checkKeyAlignment };

// [VXG RealForever]
