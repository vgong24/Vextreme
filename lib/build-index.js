#!/usr/bin/env node
/**
 * VEXTREME — lib/build-index.js
 *
 * Reads data/nodes.json + data/arcs-v2.json → writes data/index.json
 *
 * Run manually:   node lib/build-index.js
 * Auto-run via:   .github/workflows/build-index.yml on push to main
 *
 * Output (data/index.json) is the pre-built index consumed by the browser.
 * Never edit index.json directly — edit the source files and rebuild.
 */

'use strict';

const fs   = require('fs');
const path = require('path');

const ROOT      = path.join(__dirname, '..');
const NODES_IN  = path.join(ROOT, 'data', 'nodes.json');
const ARCS_IN   = path.join(ROOT, 'data', 'arcs-v2.json');
const INDEX_OUT = path.join(ROOT, 'data', 'index.json');

// ── Date parsing ─────────────────────────────────────────────────────────────

function parseDate(str) {
  if (!str) return null;
  // "Feb 7–10, 2026" → use start date "Feb 7, 2026"
  const fixed = str.replace(/^(\w+)\s+(\d+)[–\-]\d+,\s+(\d{4})$/, '$1 $2, $3');
  const d = new Date(fixed);
  return isNaN(d.getTime()) ? null : d;
}

// ── Load inputs ───────────────────────────────────────────────────────────────

const nodes   = JSON.parse(fs.readFileSync(NODES_IN,  'utf8'));
const arcsDef = JSON.parse(fs.readFileSync(ARCS_IN,   'utf8'));

// Derive dateISO ("YYYY-MM-DD") from human-readable date string.
// Stored in index.json slugMap so the browser can do range comparisons
// without parsing. nodes.json keeps the human-readable string as source.
function toDateISO(str) {
  if (!str) return null;
  const fixed = str.replace(/^(\w+)\s+(\d+)[–\-]\d+,\s+(\d{4})$/, '$1 $2, $3');
  const d = new Date(fixed);
  if (isNaN(d.getTime())) return null;
  return d.toISOString().split('T')[0]; // "YYYY-MM-DD"
}

// Build slugMap for O(1) lookup during section resolution.
// Each entry gets a computed dateISO field alongside the authored date string.
const slugMap = {};
for (const node of nodes) {
  slugMap[node.slug] = { ...node, dateISO: toDateISO(node.date) };
}

// ── Build arcMap ──────────────────────────────────────────────────────────────

const arcMap = {};

for (const [arcName, arcDef] of Object.entries(arcsDef)) {
  if (arcName.startsWith('_')) continue; // skip _meta

  const resolvedSections = [];

  for (const section of arcDef.sections) {
    let orderedSlugs = [];

    if (section.order === 'explicit') {
      orderedSlugs = (section.slugs || []).filter(slug => {
        if (!slugMap[slug]) {
          console.warn(`[WARN] ${arcName} / "${section.label}": slug '${slug}' not in nodes.json — skipped`);
          return false;
        }
        return true;
      });

    } else {
      // chronological — filter nodes whose arcKeys include this arc
      let items = nodes.filter(n => n.arcKeys.includes(arcName));

      // Narrow by dateRange if defined (required for full_timeline sections)
      if (section.dateRange) {
        const from = new Date(section.dateRange.from);
        const to   = new Date(section.dateRange.to);
        to.setHours(23, 59, 59, 999);
        items = items.filter(n => {
          const d = parseDate(n.date);
          return d !== null && d >= from && d <= to;
        });
      }

      items.sort((a, b) => {
        const da = parseDate(a.date);
        const db = parseDate(b.date);
        if (da === null && db === null) return 0;
        if (da === null) return 1;
        if (db === null) return -1;
        return da - db;
      });

      orderedSlugs = items.map(n => n.slug);
    }

    if (orderedSlugs.length > 0) {
      resolvedSections.push({ label: section.label, slugs: orderedSlugs });
    }
  }

  arcMap[arcName] = resolvedSections;
}

// ── Write output ──────────────────────────────────────────────────────────────

const index = {
  builtAt: new Date().toISOString(),
  nodeCount: nodes.length,
  arcCount: Object.keys(arcMap).length,
  slugMap,
  arcMap
};

fs.writeFileSync(INDEX_OUT, JSON.stringify(index, null, 2));

console.log(`[build-index] Done.`);
console.log(`  nodes : ${index.nodeCount}`);
console.log(`  arcs  : ${index.arcCount}`);
console.log(`  output: ${INDEX_OUT}`);
