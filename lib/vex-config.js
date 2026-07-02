/**
 * VEXTREME — lib/vex-config.js
 *
 * Single source of truth for all semantic constants in the build system and
 * browser runtime. No build script, no widget, no generated page should contain
 * a hardcoded semantic string — everything flows from here.
 *
 * Usage (Node.js build scripts):
 *   const { Category, Language, Scope, Path } = require('./vex-config');
 *   const cat = Category.DEMO;  // 'demo'
 *
 * Usage (browser runtime, widgets):
 *   Constants are bundled inline by the build scripts that generate pages.
 *   lang-fab.js reads window.VEX_STRING_CATEGORY / window.VEX_STRING_SCOPES
 *   which are emitted by build scripts using these constants.
 *
 * End-state note (Session 009):
 *   In a future PR, vextreme.js will read slug → slugMap → { category, scopes,
 *   features } from data/index.json and eliminate the per-page window globals
 *   entirely. This file provides the named constant layer that makes that
 *   transition safe — every reference to 'demo', 'ja', 'common' etc. is
 *   already one Ctrl+click away rather than a grep hunt.
 */

'use strict';

// ── Content lifecycle categories ──────────────────────────────────────────────
// Maps to scopes/{category}/ in the compiled output.
// Mirrors _meta.category in string source files.

const Category = {
  SYSTEM:       'system',       // Infrastructure strings (common). Always loaded.
  PRODUCTION:   'production',   // Real content pages. Default for source files without explicit _meta.category.
  DEMO:         'demo',         // Architecture reference / teaching fixtures.
  STAGING:      'staging',      // In-progress content. Direct-link only, not indexed.
  EXPERIMENTAL: 'experimental', // R&D. Branch-only, never committed to main.
};

// The default category for source files and pages that don't declare one.
const DEFAULT_CATEGORY = Category.PRODUCTION;

// ── Supported languages ───────────────────────────────────────────────────────

const Language = {
  EN: 'en',  // Source language. Always complete.
  JA: 'ja',  // Primary translation target.
};

// The source/fallback language. Used when a requested language has no entry.
const DEFAULT_LANGUAGE = Language.EN;

// ── Named scopes ──────────────────────────────────────────────────────────────
// Scopes used by more than one file — give them names so callers don't repeat
// the string literal. Page-specific scopes (pages.foo) are typically inlined
// where used; only shared scopes go here.

const Scope = {
  COMMON:    'common',    // Shared UI chrome. Lives in system/. Always fetched.
  DEMO:      'demo',      // Demo page strings.
  SPECIMENS: 'specimens', // Specimens dashboard chrome.
  ARCHIVES:  'archives',  // Archives dashboard strings.
  ARCS:      'arcs',      // Arc nav strings.
};

// ── CDN and path constants ────────────────────────────────────────────────────

const CDN_BASE = 'https://cdn.jsdelivr.net/gh/vgong24/vextreme@main';

const Path = {
  // Source (write-side)
  STRINGS_SOURCE:   'data/strings/source',

  // Compiled (read-side, generated)
  STRINGS_COMPILED: 'data/strings/compiled',
  SCOPES_DIR:       'data/strings/compiled/scopes',
  MANIFEST:         'data/strings/compiled/manifest.json',

  // Pages
  PAGES:            'pages',

  // CDN
  CDN_BASE,
};

// ── Browser window global names ───────────────────────────────────────────────
// Names of the window properties that pages set before loading lang-fab.js.
// In the future slug-driven architecture these will be eliminated; the loader
// will derive category + scopes from the slugMap in data/index.json.

const WindowGlobal = {
  SCOPES:   'VEX_STRING_SCOPES',   // string[] — scope names to fetch
  CATEGORY: 'VEX_STRING_CATEGORY', // string   — page content lifecycle category
  VARIANT:  'VEX_STRING_VARIANT',  // string?  — A/B variant suffix (optional)
};

// ── Path derivation ───────────────────────────────────────────────────────────
// Derives the relative path within scopes/ for a given scope + category.
// Dots in scope names become directory segments: 'pages.foo' → 'pages/foo'.
// 'common' always routes to system/ regardless of the caller's category.
//
// This rule is applied identically in:
//   - lib/strings-compile.js (build time: write output path)
//   - widgets/lang-fab.js    (runtime: construct fetch URL)
// Keeping one canonical implementation here prevents the two from drifting.

function scopeRelPath(scope, category) {
  const cat  = (scope === Scope.COMMON) ? Category.SYSTEM : (category || DEFAULT_CATEGORY);
  const segs = scope.split('.');
  return [cat, ...segs.slice(0, -1), segs[segs.length - 1]].join('/');
}

// Full CDN URL for a compiled scope bundle.
function scopeUrl(scope, category, lang, cdnBase) {
  return (cdnBase || CDN_BASE)
    + '/' + Path.SCOPES_DIR + '/'
    + scopeRelPath(scope, category) + '.' + lang + '.json';
}

// Full CDN URL for the flat bundle (legacy / default path).
function flatBundleUrl(lang, cdnBase) {
  return (cdnBase || CDN_BASE)
    + '/' + Path.STRINGS_COMPILED + '/strings.' + lang + '.json';
}

// ── Exports ───────────────────────────────────────────────────────────────────

module.exports = {
  Category,
  DEFAULT_CATEGORY,
  Language,
  DEFAULT_LANGUAGE,
  Scope,
  Path,
  CDN_BASE,
  WindowGlobal,
  scopeRelPath,
  scopeUrl,
  flatBundleUrl,
};

// [VXG RealForever]
