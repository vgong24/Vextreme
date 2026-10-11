#!/usr/bin/env node
/**
 * VEXTREME — scripts/screenshot-localization.js
 *
 * Thin orchestration layer over the accepted general localization renderer
 * (scripts/screenshot-page.js). It does not render or ingest evidence itself.
 *
 * It answers one question deterministically:
 *   Which page × locale cells are safe to capture now?
 *
 * A cell is ready only when:
 * - the page is registered with the lang feature;
 * - the locale is live in data/index.json.supportedLangs;
 * - every required compiled scope (including common) has the same key count as EN;
 * - the locale bundle for each required scope exists and contains no _stale entries.
 *
 * Usage:
 *   node scripts/screenshot-localization.js --plan
 *   node scripts/screenshot-localization.js --plan --langs ja,zh
 *   node scripts/screenshot-localization.js --capture --langs ja,zh --assets-root ../Vextreme-Assets
 *   node scripts/screenshot-localization.js --capture --slug claude-answers-the-doubt --assets-root ../Vextreme-Assets
 *
 * --plan is the default. --capture delegates each ready cell to screenshot-page.js.
 * When --assets-root is supplied, that existing writer hands the exact PNG bytes to
 * Vextreme-Assets' accepted screenshot ingest contract.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const INDEX_PATH = path.join(ROOT, 'data', 'index.json');
const VIEWMODELS_PATH = path.join(ROOT, 'data', 'viewmodels.json');
const SCOPE_INDEX_PATH = path.join(ROOT, 'data', 'strings', 'compiled', 'scopes', 'index.json');
const SCREENSHOT_WRITER = path.join(ROOT, 'scripts', 'screenshot-page.js');

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function parseArgs(argv) {
  const options = {
    capture: false,
    plan: false,
    langs: null,
    slug: null,
    assetsRoot: process.env.VEXTREME_ASSETS_ROOT || null,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === '--capture') options.capture = true;
    else if (token === '--plan') options.plan = true;
    else if (token === '--langs' || token === '--slug' || token === '--assets-root') {
      const value = argv[++i];
      if (!value || value.startsWith('--')) throw new Error(token + ' requires a value');
      if (token === '--langs') options.langs = value.split(',').map(v => v.trim()).filter(Boolean);
      if (token === '--slug') options.slug = value;
      if (token === '--assets-root') options.assetsRoot = path.resolve(value);
    } else {
      throw new Error('unknown argument: ' + token);
    }
  }
  if (options.capture && options.plan) throw new Error('choose --plan or --capture, not both');
  if (!options.capture) options.plan = true;
  if (options.capture && options.assetsRoot && !fs.existsSync(options.assetsRoot)) {
    throw new Error('assets root does not exist: ' + options.assetsRoot);
  }
  return options;
}

function resolvePages(indexJson, viewmodels) {
  const pages = [];
  const seen = new Set();
  for (const [slug, entry] of Object.entries(indexJson.slugMap || {})) {
    if (!entry || !entry.viewmodel) continue;
    seen.add(slug);
    pages.push({ slug, viewmodel: entry.viewmodel });
  }
  for (const [slug, viewmodel] of Object.entries(viewmodels || {})) {
    if (slug.startsWith('_') || seen.has(slug)) continue;
    seen.add(slug);
    pages.push({ slug, viewmodel });
  }
  return pages.sort((a, b) => a.slug.localeCompare(b.slug));
}

function bundlePathFor(root, scopeIndex, scope, locale) {
  const record = scopeIndex[scope];
  if (!record || typeof record.path !== 'string') return null;
  return path.join(root, 'data', 'strings', 'compiled', 'scopes', `${record.path}.${locale}.json`);
}

function bundleHasStale(file) {
  if (!file || !fs.existsSync(file)) return true;
  const bundle = readJson(file);
  return Object.values(bundle).some(value => value && value._stale === true);
}

function localeCoverage(page, locale, scopeIndex, staleProbe) {
  const viewmodel = page.viewmodel || {};
  const scopes = Array.from(new Set(['common', ...(viewmodel.scopes || [])]));
  const missing = [];
  const stale = [];

  for (const scope of scopes) {
    const record = scopeIndex[scope];
    if (!record) {
      missing.push({ scope, reason: 'scope-not-indexed' });
      continue;
    }
    const en = Number(record.en || 0);
    const target = Number(record[locale] || 0);
    if (en <= 0 || target !== en) {
      missing.push({ scope, en, target });
      continue;
    }
    if (staleProbe(scope, locale)) stale.push(scope);
  }

  return {
    ready: missing.length === 0 && stale.length === 0,
    requiredScopes: scopes,
    missing,
    stale,
  };
}

function buildCapturePlan({ indexJson, viewmodels, scopeIndex, requestedLangs, requestedSlug, staleProbe }) {
  const supported = (indexJson.supportedLangs || []).filter(lang => lang !== 'en');
  const targets = requestedLangs && requestedLangs.length ? requestedLangs : supported;
  const unsupported = targets.filter(lang => !supported.includes(lang));
  const pages = resolvePages(indexJson, viewmodels);
  const cells = [];
  const skipped = [];

  for (const page of pages) {
    if (requestedSlug && page.slug !== requestedSlug) continue;
    const features = page.viewmodel.features || [];
    if (!features.includes('lang')) {
      skipped.push({ slug: page.slug, reason: 'lang-feature-not-active' });
      continue;
    }
    for (const locale of targets) {
      if (unsupported.includes(locale)) {
        skipped.push({ slug: page.slug, locale, reason: 'locale-not-live-in-index' });
        continue;
      }
      const coverage = localeCoverage(page, locale, scopeIndex, staleProbe);
      if (coverage.ready) cells.push({ slug: page.slug, locale, requiredScopes: coverage.requiredScopes });
      else skipped.push({ slug: page.slug, locale, reason: 'coverage-incomplete', ...coverage });
    }
  }

  if (requestedSlug && !pages.some(page => page.slug === requestedSlug)) {
    throw new Error('unknown page slug: ' + requestedSlug);
  }

  return { supportedLangs: supported, requestedLangs: targets, cells, skipped };
}

function main(argv = process.argv.slice(2)) {
  const options = parseArgs(argv);
  const indexJson = readJson(INDEX_PATH);
  const viewmodels = readJson(VIEWMODELS_PATH);
  const scopeIndex = readJson(SCOPE_INDEX_PATH);
  const staleProbe = (scope, locale) => bundleHasStale(bundlePathFor(ROOT, scopeIndex, scope, locale));
  const plan = buildCapturePlan({
    indexJson,
    viewmodels,
    scopeIndex,
    requestedLangs: options.langs,
    requestedSlug: options.slug,
    staleProbe,
  });

  process.stdout.write(
    `[screenshot-localization] ${plan.cells.length} ready cell(s), ` +
    `${plan.skipped.length} skipped; locales=${plan.requestedLangs.join(',') || '(none)'}\n`
  );

  if (options.plan) {
    process.stdout.write(JSON.stringify(plan, null, 2) + '\n');
    return plan;
  }

  for (const cell of plan.cells) {
    const args = [SCREENSHOT_WRITER, cell.slug, cell.locale];
    if (options.assetsRoot) args.push('--assets-root', options.assetsRoot);
    process.stdout.write(`[screenshot-localization] capture ${cell.slug}/${cell.locale}\n`);
    execFileSync(process.execPath, args, { cwd: ROOT, stdio: 'inherit' });
  }

  if (options.assetsRoot) {
    const checker = path.join(options.assetsRoot, 'scripts', 'ingest-screenshot-evidence.mjs');
    if (!fs.existsSync(checker)) throw new Error('Assets screenshot ingest checker missing: ' + checker);
    execFileSync(process.execPath, [checker, '--check'], {
      cwd: options.assetsRoot,
      stdio: 'inherit',
    });
  }

  return plan;
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error('[screenshot-localization] ' + (error.stack || error.message));
    process.exitCode = 1;
  }
}

module.exports = {
  parseArgs,
  resolvePages,
  bundlePathFor,
  bundleHasStale,
  localeCoverage,
  buildCapturePlan,
  main,
};

// [VXG RealForever]
