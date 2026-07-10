'use strict';

/**
 * AUDIT-FAB — tests/42-audit-fab.test.js
 *
 * Tests for lib/audit-fab.js — the runtime-chrome composition auditor that
 * makes the nav/FAB rollout's three hand-found regression classes
 * (wide-layout squash, data-theme clobber, hand-authored FAB duplication)
 * script-perceptible. Synthetic HTML snippets isolate each rule; an
 * integration test runs the real pages/ tree and asserts zero findings —
 * the regression-fix PR that adds this auditor also fixed everything it
 * flags, so a finding appearing here again means a new page reintroduced a
 * known-conflict pattern without its override.
 */

const { test } = require('node:test');
const assert    = require('node:assert/strict');
const fs        = require('fs');
const path      = require('path');

const {
  WRAP_CAP_PX,
  hasShellJs,
  maxAuthoredWidth,
  usesViewportRelativeLayout,
  hasBodyWrapOptOut,
  managesOwnDataTheme,
  hasThemeOptOut,
  handAuthoredFabTags,
  auditPage,
} = require('../lib/audit-fab');

const ROOT      = path.join(__dirname, '..');
const PAGES_DIR = path.join(ROOT, 'pages');

const SHELL_TAG = '<script src="https://cdn.jsdelivr.net/gh/vgong24/vextreme@main/lib/shell.js"></script>';

// ── hasShellJs ───────────────────────────────────────────────────────────────

test('AUDIT-FAB: hasShellJs detects the real CDN shell.js tag', () => {
  assert.equal(hasShellJs(SHELL_TAG), true);
  assert.equal(hasShellJs('<script src="/lib/other.js"></script>'), false);
});

// ── maxAuthoredWidth ─────────────────────────────────────────────────────────

test('AUDIT-FAB: maxAuthoredWidth reads a plain px max-width', () => {
  assert.equal(maxAuthoredWidth('<style>body { max-width: 900px; }</style>'), 900);
});

test('AUDIT-FAB: maxAuthoredWidth ignores @media query conditions', () => {
  assert.equal(maxAuthoredWidth('<style>@media (max-width: 520px) { .x { color: red; } }</style>'), null);
});

test('AUDIT-FAB: maxAuthoredWidth reads *-width custom properties', () => {
  assert.equal(maxAuthoredWidth('<style>:root { --page-width: 1300px; }</style>'), 1300);
});

test('AUDIT-FAB: maxAuthoredWidth resolves arbitrary-named custom properties consumed via var() (org-blueprint pattern)', () => {
  const html = '<style>:root { --maxw: 1160px; } .wrap { max-width:var(--maxw); }</style>';
  assert.equal(maxAuthoredWidth(html), 1160);
});

test('AUDIT-FAB: maxAuthoredWidth does not count an unused custom property', () => {
  const html = '<style>:root { --gap: 900px; } .wrap { max-width: 600px; }</style>';
  assert.equal(maxAuthoredWidth(html), 600);
});

// ── usesViewportRelativeLayout ───────────────────────────────────────────────

test('AUDIT-FAB: usesViewportRelativeLayout catches a percentage max-width (terrain-map pattern)', () => {
  assert.equal(usesViewportRelativeLayout('<style>.panel { max-width:60%; }</style>'), true);
});

test('AUDIT-FAB: usesViewportRelativeLayout excludes the responsive-image idiom max-width:100%', () => {
  assert.equal(usesViewportRelativeLayout('<style>img { max-width:100%; }</style>'), false);
});

test('AUDIT-FAB: usesViewportRelativeLayout excludes percentage widths inside @media conditions', () => {
  assert.equal(usesViewportRelativeLayout('<style>@media (max-width:60%) { .x{} }</style>'), false);
});

test('AUDIT-FAB: usesViewportRelativeLayout catches vw widths', () => {
  assert.equal(usesViewportRelativeLayout('<style>.hero { width: 100vw; }</style>'), true);
});

// ── theme management detection ───────────────────────────────────────────────

test('AUDIT-FAB: managesOwnDataTheme catches a static data-theme on the html tag', () => {
  assert.equal(managesOwnDataTheme('<html lang="en" data-theme="dashboard">'), true);
});

test('AUDIT-FAB: managesOwnDataTheme catches documentElement.setAttribute', () => {
  assert.equal(managesOwnDataTheme("<script>document.documentElement.setAttribute('data-theme', next);</script>"), true);
});

test('AUDIT-FAB: managesOwnDataTheme catches the root-alias pattern (phantom-opera)', () => {
  const html = "<script>const root = document.documentElement;\nroot.setAttribute('data-theme','dark');</script>";
  assert.equal(managesOwnDataTheme(html), true);
});

test('AUDIT-FAB: managesOwnDataTheme ignores a container-scoped data-theme (origins-of-proof pattern)', () => {
  assert.equal(managesOwnDataTheme('<div id="op-root" data-theme="light">'), false);
});

// ── overrides + hand-authored tags ───────────────────────────────────────────

test('AUDIT-FAB: hasBodyWrapOptOut and hasThemeOptOut detect the real override shapes', () => {
  const html = '<script>window.VEXTREME_OVERRIDE = { bodyWrap: false, fabWidgets: { theme: false } };</script>';
  assert.equal(hasBodyWrapOptOut(html), true);
  assert.equal(hasThemeOptOut(html), true);
  assert.equal(hasBodyWrapOptOut('<script>window.VEXTREME_OVERRIDE = {};</script>'), false);
});

test('AUDIT-FAB: handAuthoredFabTags finds legacy and current fab widget tags, ignores shell.js', () => {
  const html = [
    '<script src="https://cdn.jsdelivr.net/gh/vgong24/vextreme@main/widgets/lang-fab.js"></script>',
    '<script src="https://cdn.jsdelivr.net/gh/vgong24/vextreme@main/widgets/fab-theme.js"></script>',
    SHELL_TAG,
  ].join('\n');
  const tags = handAuthoredFabTags(html);
  assert.equal(tags.length, 2);
});

// ── auditPage rules ──────────────────────────────────────────────────────────

test('AUDIT-FAB: a non-shell.js page produces no findings regardless of content', () => {
  const { findings } = auditPage('x', '<style>body{max-width:2000px}</style><html data-theme="dark">');
  assert.deepEqual(findings, []);
});

test('AUDIT-FAB: wide layout without opt-out is flagged; with opt-out is clean', () => {
  const wide = `<style>body{max-width:${WRAP_CAP_PX + 100}px}</style>` + SHELL_TAG;
  assert.equal(auditPage('x', wide).findings.some((f) => f.type === 'wide-layout'), true);

  const fixed = wide.replace(SHELL_TAG, '<script>window.VEXTREME_OVERRIDE = { bodyWrap: false };</script>' + SHELL_TAG);
  assert.equal(auditPage('x', fixed).findings.some((f) => f.type === 'wide-layout'), false);
});

test('AUDIT-FAB: document-level theme management without opt-out is flagged; with opt-out is clean', () => {
  const conflicted = '<html data-theme="dashboard">' + SHELL_TAG;
  assert.equal(auditPage('x', conflicted).findings.some((f) => f.type === 'theme-conflict'), true);

  const fixed = '<html data-theme="dashboard"><script>window.VEXTREME_OVERRIDE = { fabWidgets: { theme: false } };</script>' + SHELL_TAG;
  assert.equal(auditPage('x', fixed).findings.some((f) => f.type === 'theme-conflict'), false);
});

test('AUDIT-FAB: hand-authored FAB tags on a shell.js page are flagged', () => {
  const html = '<script src="https://cdn.jsdelivr.net/gh/vgong24/vextreme@main/widgets/fab-lang.js"></script>' + SHELL_TAG;
  assert.equal(auditPage('x', html).findings.some((f) => f.type === 'hand-authored-fab-tags'), true);
});

// ── Integration: the real repo is clean ──────────────────────────────────────

test('AUDIT-FAB: the real pages/ tree currently has zero findings (regressions fixed; new findings mean a new page reintroduced a known conflict)', () => {
  const files = fs.readdirSync(PAGES_DIR).filter((f) => f.endsWith('.html'));
  const flagged = [];
  for (const f of files) {
    const html = fs.readFileSync(path.join(PAGES_DIR, f), 'utf8');
    const { slug, findings } = auditPage(f.replace(/\.html$/, ''), html);
    if (findings.length) flagged.push({ slug, findings });
  }
  assert.deepEqual(flagged, []);
});
