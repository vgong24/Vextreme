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
 *
 * Pure computation functions are exported for testing:
 *   buildViewmodel(slug, viewmodels) → viewmodel
 *   buildSlugMap(nodes, arcsDef, viewmodels) → slugMap
 *   buildArcMap(nodes, arcsDef, slugMap) → arcMap
 *   buildArcMeta(arcsDef) → arcMeta
 *
 * LATTICE
 *   role      : content pipeline assembler — reads source data, writes the single
 *               pre-built index every browser page and build script reads from
 *   reads     : data/nodes.json (content node definitions)
 *               data/arcs-v2.json (arc structure and ordering)
 *               data/viewmodels.json (per-slug viewmodel overrides)
 *               lib/vex-config.js (Language, Feature, DEFAULT_CATEGORY constants)
 *   writes    : data/index.json
 *   loaded-by : lib/vextreme-index-v2.js (browser reads index.json via CDN),
 *               lib/build-vextreme.js (reads index.json for slugMap + supportedLangs),
 *               lib/check-key-alignment.js, lib/audit-pages.js,
 *               tests/01, tests/03, tests/07, tests/08 (via KEY-ALIGNMENT)
 *   tested-by : tests/01-content-pipeline.test.js, tests/03-browser-nav.test.js,
 *               tests/07-viewmodel.test.js
 *
 * CHANGE MAP — if you touch X here, also check:
 *   slugMap schema       → lib/vextreme-index-v2.js buildArcNavData(),
 *                           lib/build-vextreme.js resolveAllSlugs(),
 *                           tests/01, tests/03, tests/07, tests/08
 *   arcMap schema        → lib/vextreme-index-v2.js buildArcNavData(),
 *                           tests/01, tests/03
 *   arcMeta schema       → lib/vextreme-index-v2.js renderArcRow(),
 *                           tests/01
 *   supportedLangs field → lib/build-vextreme.js passes it into every God Script
 *                           as window.VEX_SUPPORTED_LANGS, tests/08
 *   viewmodel shape      → data/viewmodels.json, lib/build-vextreme.js assembleGodScript(),
 *                           tests/07-viewmodel.test.js
 */

'use strict';

const fs   = require('fs');
const path = require('path');
const { logger } = require('./logger');
const { CODES }  = require('./logger-codes');
const { Language, DEFAULT_CATEGORY, Feature } = require('./vex-config');

const ROOT           = path.join(__dirname, '..');
const NODES_IN       = path.join(ROOT, 'data', 'nodes.json');
const ARCS_IN        = path.join(ROOT, 'data', 'arcs-v2.json');
const VIEWMODELS_IN  = path.join(ROOT, 'data', 'viewmodels.json');
const INDEX_OUT      = path.join(ROOT, 'data', 'index.json');

// ── Date parsing ─────────────────────────────────────────────────────────────

function parseDate(str) {
  if (!str) return null;
  // "Feb 7–10, 2026" → use start date "Feb 7, 2026"
  const fixed = str.replace(/^(\w+)\s+(\d+)[–\-]\d+,\s+(\d{4})$/, '$1 $2, $3');
  const d = new Date(fixed);
  return isNaN(d.getTime()) ? null : d;
}

function toDateISO(str) {
  if (!str) return null;
  const fixed = str.replace(/^(\w+)\s+(\d+)[–\-]\d+,\s+(\d{4})$/, '$1 $2, $3');
  const d = new Date(fixed);
  if (isNaN(d.getTime())) return null;
  return d.toISOString().split('T')[0]; // "YYYY-MM-DD"
}

// ── Pure computation functions ────────────────────────────────────────────────

// buildViewmodel — derives the per-page viewmodel for a slug.
// Merges the slug's override from data/viewmodels.json with safe defaults.
// The viewmodel is the contract between the build pipeline and the God Script
// assembler: it tells the assembler which category, template, scopes, and
// features to inline for this page.
function buildViewmodel(slug, viewmodels) {
  const override = (viewmodels || {})[slug] || {};
  return {
    category: override.category || DEFAULT_CATEGORY,
    template: override.template || 'page',
    scopes:   override.scopes   || [`pages.${slug}`],
    features: override.features || [Feature.LANG, Feature.SPIRAL_FAB],
  };
}

// buildSlugMap — O(1) lookup table from slug → node with derived fields.
// arcKeys re-sorted by arc priority so the browser renders in correct order.
// viewmodels is the parsed data/viewmodels.json override map (optional).
function buildSlugMap(nodes, arcsDef, viewmodels) {
  const slugMap = {};
  for (const node of nodes) {
    const sortedArcKeys = node.arcKeys.slice().sort((a, b) => {
      const pa = arcsDef[a]?.priority ?? 50;
      const pb = arcsDef[b]?.priority ?? 50;
      return pa - pb;
    });
    slugMap[node.slug] = {
      ...node,
      arcKeys:   sortedArcKeys,
      dateISO:   toDateISO(node.date),
      viewmodel: buildViewmodel(node.slug, viewmodels),
    };
  }
  return slugMap;
}

// buildArcMap — resolves each arc's sections into ordered slug lists.
// Supports 'explicit' (manually ordered) and 'chronological' (date-sorted) sections.
function buildArcMap(nodes, arcsDef, slugMap) {
  const arcMap = {};

  for (const [arcName, arcDef] of Object.entries(arcsDef)) {
    if (arcName.startsWith('_')) continue;

    const resolvedSections = [];

    for (const section of arcDef.sections) {
      let orderedSlugs = [];

      if (section.order === 'explicit') {
        orderedSlugs = (section.slugs || []).filter(slug => {
          if (!slugMap[slug]) {
            logger.warn({ code: CODES.SLUG_NOT_IN_NODES, message: `slug not in nodes.json — skipped`, arc: arcName, section: section.label, slug });
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

  return arcMap;
}

// buildSupportedLangs — scans compiled strings directory for available bundles.
// Automatic: adding a new language to the strings pipeline makes it appear here.
function buildSupportedLangs() {
  const compiledDir = path.join(ROOT, 'data', 'strings', 'compiled');
  try {
    return fs.readdirSync(compiledDir)
      .filter(f => /^strings\.[a-z]{2,}\.json$/.test(f))
      .map(f => f.replace(/^strings\./, '').replace(/\.json$/, ''))
      .sort();
  } catch (e) {
    return [Language.EN];
  }
}

// buildArcMeta — extracts display metadata from arc definitions.
// Stored in index.json so the browser has no hard-coded arc tables.
function buildArcMeta(arcsDef) {
  const arcMeta = {};
  for (const [arcName, arcDef] of Object.entries(arcsDef)) {
    if (arcName.startsWith('_')) continue;
    arcMeta[arcName] = {
      title:      arcDef.parent?.title  ?? arcName,
      url:        arcDef.parent?.url    ?? '#',
      renderMode: arcDef.renderMode     ?? 'dots'
    };
  }
  return arcMeta;
}

// ── I/O — only runs when executed directly ────────────────────────────────────

if (require.main === module) {
  const nodes      = JSON.parse(fs.readFileSync(NODES_IN,  'utf8'));
  const arcsDef    = JSON.parse(fs.readFileSync(ARCS_IN,   'utf8'));
  const viewmodels = fs.existsSync(VIEWMODELS_IN)
    ? JSON.parse(fs.readFileSync(VIEWMODELS_IN, 'utf8'))
    : {};

  const slugMap       = buildSlugMap(nodes, arcsDef, viewmodels);
  const arcMap        = buildArcMap(nodes, arcsDef, slugMap);
  const arcMeta       = buildArcMeta(arcsDef);
  const supportedLangs = buildSupportedLangs();

  const index = {
    builtAt:      new Date().toISOString(),
    nodeCount:    nodes.length,
    arcCount:     Object.keys(arcMap).length,
    supportedLangs,
    slugMap,
    arcMap,
    arcMeta
  };

  fs.writeFileSync(INDEX_OUT, JSON.stringify(index, null, 2));

  console.log(`[build-index] Done.`);
  console.log(`  nodes : ${index.nodeCount}`);
  console.log(`  arcs  : ${index.arcCount}`);
  console.log(`  output: ${INDEX_OUT}`);
}

module.exports = { buildViewmodel, buildSlugMap, buildArcMap, buildArcMeta, buildSupportedLangs, parseDate, toDateISO };

// [VXG RealForever]
