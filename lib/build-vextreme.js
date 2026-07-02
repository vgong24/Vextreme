#!/usr/bin/env node
/**
 * VEXTREME — lib/build-vextreme.js
 *
 * God Script assembler. Reads data/index.json + data/viewmodels.json and
 * writes one dist/vextreme-{slug}.js per page that has complete compiled
 * string bundles.
 *
 * Each God Script is a self-contained IIFE containing:
 *   - Per-page viewmodel (category, template, scopes, features)
 *   - EN strings inlined (no fetch required for default language)
 *   - window globals for lang-fab compatibility
 *   - Feature modules (fab-lang.js, fab-demo.js) for pages that need them
 *
 * The browser receives the assembled output. It does not fetch, resolve, or
 * assemble — that is the build script's job.
 *
 * Run manually:   node lib/build-vextreme.js
 *                 node lib/build-vextreme.js --slug=specimen-full-translation
 * Auto-run via:   .github/workflows/build-index.yml after build-index.js
 *
 * Pure functions exported for testing:
 *   resolveAllSlugs(index, viewmodels) → [{slug, viewmodel}]
 *   readScopeBundle(scope, category, lang) → object|null
 *   mergeScopes(scopes, category, lang) → object
 *   assembleGodScript(slug, viewmodel, options) → string
 */

'use strict';

const fs   = require('fs');
const path = require('path');

const { logger } = require('./logger');
const { CODES }  = require('./logger-codes');
const { scopeRelPath, Feature, DEFAULT_LANGUAGE } = require('./vex-config');

const ROOT        = path.join(__dirname, '..');
const INDEX_IN    = path.join(ROOT, 'data', 'index.json');
const VMS_IN      = path.join(ROOT, 'data', 'viewmodels.json');
const SCOPES_DIR  = path.join(ROOT, 'data', 'strings', 'compiled', 'scopes');
const WIDGETS_DIR = path.join(ROOT, 'widgets');
const DIST_DIR    = path.join(ROOT, 'dist');

// Feature name → widget filename. null = no standalone widget (future).
const FEATURE_WIDGET = {
  [Feature.LANG]:       'fab-lang.js',
  [Feature.DEMO]:       'fab-demo.js',
  [Feature.SPIRAL_FAB]: null,
  [Feature.THEME]:      null,
};

// ── Pure computation functions ────────────────────────────────────────────────

// resolveAllSlugs — collects every slug that has a viewmodel, from two sources:
//   1. slugMap entries in index.json (content nodes — already have viewmodels)
//   2. viewmodels.json overrides for demo/specimen slugs not in nodes.json
// Deduplicates. slugMap takes precedence over viewmodels.json for shared slugs.
function resolveAllSlugs(index, viewmodels) {
  const result = [];
  const seen = new Set();

  // Content nodes (from index.json slugMap)
  for (const [slug, entry] of Object.entries(index.slugMap || {})) {
    if (seen.has(slug)) continue;
    seen.add(slug);
    result.push({ slug, viewmodel: entry.viewmodel });
  }

  // Demo/specimen overrides (viewmodels.json keys not already in slugMap)
  for (const [slug, vm] of Object.entries(viewmodels || {})) {
    if (slug.startsWith('_')) continue; // skip comment keys
    if (seen.has(slug)) continue;
    seen.add(slug);
    result.push({ slug, viewmodel: vm });
  }

  return result;
}

// readScopeBundle — reads one compiled EN scope file.
// Returns the parsed object, or null if the file doesn't exist.
function readScopeBundle(scope, category, lang) {
  const relPath  = scopeRelPath(scope, category);
  const filePath = path.join(SCOPES_DIR, relPath + '.' + (lang || DEFAULT_LANGUAGE) + '.json');
  if (!fs.existsSync(filePath)) return null;
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (e) {
    logger.warn({ code: CODES.BUILD_MISSING_SCOPE, message: `Failed to parse scope bundle: ${filePath}`, scope, error: e.message });
    return null;
  }
}

// mergeScopes — reads all scope bundles for a page and merges into one flat map.
// Missing bundles are warned and skipped; the assembly continues with what exists.
// 'common' scope (system category) is automatically included if not already listed.
function mergeScopes(scopes, category, lang) {
  const effectiveLang = lang || DEFAULT_LANGUAGE;
  const allScopes = scopes.includes('common') ? scopes : ['common', ...scopes];

  const merged = {};
  for (const scope of allScopes) {
    const data = readScopeBundle(scope, category, effectiveLang);
    if (!data) {
      logger.warn({
        code:     CODES.BUILD_MISSING_SCOPE,
        message:  `Missing scope bundle — skipped`,
        scope,
        category,
        lang:     effectiveLang,
        expected: path.join(SCOPES_DIR, scopeRelPath(scope, category) + '.' + effectiveLang + '.json'),
      });
      continue;
    }
    Object.assign(merged, data);
  }
  return merged;
}

// assembleGodScript — builds the God Script string for one slug.
// options.widgetsDir — override widgets directory (for tests)
// options.includeSourceComment — if false, omit the header comment (for tests)
function assembleGodScript(slug, viewmodel, options) {
  const opts       = options || {};
  const widgetsDir = opts.widgetsDir || WIDGETS_DIR;
  const lang       = opts.lang       || DEFAULT_LANGUAGE;

  const stringsEN = mergeScopes(viewmodel.scopes || [], viewmodel.category, lang);

  // Collect feature widget sources
  const featureParts = [];
  for (const feature of (viewmodel.features || [])) {
    const filename = FEATURE_WIDGET[feature];
    if (!filename) continue;
    const widgetPath = path.join(widgetsDir, filename);
    if (!fs.existsSync(widgetPath)) {
      logger.warn({ code: CODES.BUILD_MISSING_FEATURE, message: `Feature widget not found: ${filename}`, feature, path: widgetPath });
      continue;
    }
    const src = fs.readFileSync(widgetPath, 'utf8');
    featureParts.push(`\n/* === feature: ${feature} (${filename}) === */\n${src}`);
  }

  const header = opts.includeSourceComment === false ? '' : [
    `/* VEXTREME God Script — ${slug}`,
    ` * Assembled by lib/build-vextreme.js`,
    ` * DO NOT EDIT — regenerate with: node lib/build-vextreme.js`,
    ` */`,
    '',
  ].join('\n');

  return [
    header,
    '(function () {',
    "  'use strict';",
    '',
    '  /* Per-page viewmodel — baked in at build time */',
    '  window.VEX_VIEWMODEL          = ' + JSON.stringify(viewmodel) + ';',
    '',
    '  /* EN strings — inlined at build time, no fetch on default language */',
    '  window.VEX_STRINGS_EN         = ' + JSON.stringify(stringsEN) + ';',
    '',
    '  /* Scope + category globals for fab-lang compatibility */',
    '  window.VEX_STRING_SCOPES    = ' + JSON.stringify(viewmodel.scopes || []) + ';',
    '  window.VEX_STRING_CATEGORY  = ' + JSON.stringify(viewmodel.category) + ';',
    '',
    featureParts.join('\n'),
    '',
    '}());',
  ].join('\n');
}

// hasScopeBundle — returns true if at least the primary page scope has a bundle.
// Used to decide whether to assemble a God Script for a content node.
function hasScopeBundle(viewmodel) {
  const category = viewmodel.category;
  const scopes   = (viewmodel.scopes || []).filter(s => s !== 'common');
  if (!scopes.length) return readScopeBundle('common', 'system') !== null;
  return readScopeBundle(scopes[0], category) !== null;
}

// ── I/O — only runs when executed directly ────────────────────────────────────

if (require.main === module) {
  const args = process.argv.slice(2);
  const slugArg = (args.find(a => a.startsWith('--slug=')) || '').replace('--slug=', '') || null;

  const index      = JSON.parse(fs.readFileSync(INDEX_IN, 'utf8'));
  const viewmodels = fs.existsSync(VMS_IN) ? JSON.parse(fs.readFileSync(VMS_IN, 'utf8')) : {};

  if (!fs.existsSync(DIST_DIR)) {
    fs.mkdirSync(DIST_DIR, { recursive: true });
  }

  const allSlugs = resolveAllSlugs(index, viewmodels);

  let assembled = 0;
  let skipped   = 0;

  for (const { slug, viewmodel } of allSlugs) {
    if (slugArg && slug !== slugArg) continue;
    if (!viewmodel) { skipped++; continue; }

    // Only assemble when primary page scope has a compiled bundle
    if (!hasScopeBundle(viewmodel)) {
      skipped++;
      continue;
    }

    const godScript  = assembleGodScript(slug, viewmodel);
    const outputPath = path.join(DIST_DIR, `vextreme-${slug}.js`);
    fs.writeFileSync(outputPath, godScript);
    assembled++;
  }

  console.log(`[build-vextreme] Done.`);
  console.log(`  assembled : ${assembled}`);
  console.log(`  skipped   : ${skipped} (no compiled scope bundle)`);
  console.log(`  output    : ${DIST_DIR}/`);
}

module.exports = { resolveAllSlugs, readScopeBundle, mergeScopes, assembleGodScript };

// [VXG RealForever]
