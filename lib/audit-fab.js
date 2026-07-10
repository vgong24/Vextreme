#!/usr/bin/env node
/**
 * VEXTREME — lib/audit-fab.js
 *
 * Read-only auditor: for every page that includes shell.js, does the
 * runtime chrome (nav, body-wrap, FAB widgets) compose safely with the
 * page's own authored layout and behavior — or is there a known-conflict
 * pattern with no explicit override declared?
 *
 * Prompted directly by Victor (2026-07-10), after real regressions from
 * the nav/FAB rollout: "i was hoping for pattern recognition so that
 * honing could be script perceptible kind of like with the other patterns
 * of this architecture." The three regression classes this checks for were
 * each found by hand first (phantom-opera's styles overwritten, the
 * terrain map squashed to 720px, fab-theme clobbering data-theme) — this
 * script makes the same checks repeatable so the next rollout doesn't
 * rediscover them manually.
 *
 * Checks per shell.js page:
 *   1. wide-layout   — the page's own CSS declares a content width wider
 *                      than .vex-page-body's 720px cap (a max-width > 720
 *                      outside a @media query, or a *-width custom property
 *                      > 720), but no bodyWrap:false override is declared.
 *                      The default wrap would squash the authored layout.
 *   2. theme-conflict — the page manages document.documentElement's
 *                      data-theme itself (a static data-theme attribute on
 *                      the <html> tag, or a documentElement.setAttribute
 *                      call in its own scripts), but no
 *                      fabWidgets:{theme:false} override is declared.
 *                      fab-theme.js's mount() applies its own value to that
 *                      attribute unconditionally on load.
 *   3. hand-authored FAB tags — the page hand-includes any widgets/*fab*.js
 *                      script tag. Since lib/vextreme.js auto-loads the FAB
 *                      set (docs/architecture/17-fab-autoload.md), a
 *                      hand-authored tag is duplication that will drift.
 *
 * A flag is a signal to look, not an automatic verdict — same posture as
 * lib/audit-nav.js. A page can legitimately manage data-theme AND opt out,
 * for example; the flag only fires when the conflict pattern exists with
 * no explicit override visible.
 *
 * Run: node lib/audit-fab.js
 * Read-only. Exits 0 always (informational, like audit-nav).
 *
 * Pure functions exported for testing:
 *   hasShellJs(html) → boolean
 *   maxAuthoredWidth(html) → number|null   (widest non-@media width found)
 *   hasBodyWrapOptOut(html) → boolean
 *   managesOwnDataTheme(html) → boolean
 *   hasThemeOptOut(html) → boolean
 *   handAuthoredFabTags(html) → string[]
 *   auditPage(slug, html) → { slug, findings: [...] }
 */

'use strict';

const fs   = require('fs');
const path = require('path');

const ROOT      = path.join(__dirname, '..');
const PAGES_DIR = path.join(ROOT, 'pages');

const WRAP_CAP_PX = 720; // .vex-page-body's max-width in styles/site-nav.css

function hasShellJs(html) {
  return /<script[^>]+src="[^"]*lib\/shell\.js[^"]*"/.test(html);
}

// maxAuthoredWidth — the widest pixel width the page's own CSS asks for:
// max-width declarations outside @media query conditions, *-width custom
// properties, and any custom property (whatever its name — org-blueprint
// uses --maxw) whose px value is actually consumed by a width/max-width
// declaration via var(). Returns null when nothing relevant is declared.
function maxAuthoredWidth(html) {
  let widest = null;

  // max-width: NNNpx — skip @media conditions like "(max-width: 520px)"
  // by requiring the match NOT be preceded by an opening paren.
  const maxWidthRe = /([^(])max-width:\s*(\d+)px/g;
  let m;
  while ((m = maxWidthRe.exec(html))) {
    const px = parseInt(m[2], 10);
    if (widest === null || px > widest) widest = px;
  }

  // --anything-width: NNNpx custom properties (e.g. --page-width: 1300px,
  // --vp-page-width: 1180px, --max-width: 1300px)
  const varRe = /--[a-z-]*width:\s*(\d+)px/g;
  while ((m = varRe.exec(html))) {
    const px = parseInt(m[1], 10);
    if (widest === null || px > widest) widest = px;
  }

  // Custom properties with ANY name whose px value feeds a width via var()
  // (real case: org-blueprint's `--maxw: 740px` + `max-width:var(--maxw)`).
  const propValues = {};
  const propRe = /(--[a-zA-Z0-9-]+):\s*(\d+)px/g;
  while ((m = propRe.exec(html))) {
    propValues[m[1]] = parseInt(m[2], 10);
  }
  const varUseRe = /(?:max-)?width:\s*var\((--[a-zA-Z0-9-]+)\)/g;
  while ((m = varUseRe.exec(html))) {
    const px = propValues[m[1]];
    if (typeof px === 'number' && (widest === null || px > widest)) widest = px;
  }

  return widest;
}

// usesViewportRelativeLayout — true when the page's own CSS sizes content
// relative to the viewport (a non-100 percentage max-width, or any vw
// width). A 720px wrap always constrains such a layout on desktop — the
// real case is terrain-map's `max-width:60%` dashboard, squashed by the
// default wrap. max-width:100% is excluded: that's the standard responsive
// image idiom, not a wide-layout signal.
function usesViewportRelativeLayout(html) {
  const pctRe = /([^(])max-width:\s*(\d+)%/g;
  let m;
  while ((m = pctRe.exec(html))) {
    if (parseInt(m[2], 10) !== 100) return true;
  }
  if (/([^(])(?:max-)?width:\s*\d+vw/.test(html)) return true;
  return false;
}

function hasBodyWrapOptOut(html) {
  return /bodyWrap:\s*false/.test(html);
}

// managesOwnDataTheme — true when the page controls the DOCUMENT-level
// data-theme attribute itself. An attribute on a nested container (e.g.
// origins-of-proof's #op-root) is fine — fab-theme.js only touches
// document.documentElement, so only <html>-level management conflicts.
function managesOwnDataTheme(html) {
  if (/<html[^>]+data-theme=/.test(html)) return true;
  if (/document\.documentElement\.setAttribute\(\s*['"]data-theme['"]/.test(html)) return true;
  // common alias: var root = document.documentElement; root.setAttribute('data-theme', ...)
  if (/documentElement\s*;?[\s\S]{0,200}?root\.setAttribute\(\s*['"]data-theme['"]/.test(html)) return true;
  return false;
}

function hasThemeOptOut(html) {
  return /fabWidgets:\s*\{[^}]*theme:\s*false/.test(html);
}

function handAuthoredFabTags(html) {
  const tags = [];
  const re = /<script[^>]+src="([^"]*widgets\/[^"]*fab[^"]*\.js[^"]*)"/g;
  let m;
  while ((m = re.exec(html))) tags.push(m[1]);
  return tags;
}

function auditPage(slug, html) {
  const findings = [];

  if (!hasShellJs(html)) return { slug, findings };

  const widest = maxAuthoredWidth(html);
  const relative = usesViewportRelativeLayout(html);
  if (!hasBodyWrapOptOut(html)) {
    if (widest !== null && widest > WRAP_CAP_PX) {
      findings.push({
        type: 'wide-layout',
        detail: `authored width ${widest}px > wrap cap ${WRAP_CAP_PX}px, no bodyWrap:false override`,
      });
    } else if (relative) {
      findings.push({
        type: 'wide-layout',
        detail: `viewport-relative layout (percentage/vw widths), constrained by the ${WRAP_CAP_PX}px wrap on desktop, no bodyWrap:false override`,
      });
    }
  }

  if (managesOwnDataTheme(html) && !hasThemeOptOut(html)) {
    findings.push({
      type: 'theme-conflict',
      detail: 'page manages document-level data-theme itself, no fabWidgets theme:false override',
    });
  }

  const fabTags = handAuthoredFabTags(html);
  if (fabTags.length) {
    findings.push({
      type: 'hand-authored-fab-tags',
      detail: `hand-includes ${fabTags.join(', ')} — vextreme.js auto-loads the FAB set now`,
    });
  }

  return { slug, findings };
}

function getReport() {
  const files = fs.readdirSync(PAGES_DIR).filter((f) => f.endsWith('.html'));
  return files.map((f) => {
    const html = fs.readFileSync(path.join(PAGES_DIR, f), 'utf8');
    return auditPage(f.replace(/\.html$/, ''), html);
  }).filter((r) => r.findings.length > 0 || hasShellJs(fs.readFileSync(path.join(PAGES_DIR, r.slug + '.html'), 'utf8')));
}

function main() {
  const files = fs.readdirSync(PAGES_DIR).filter((f) => f.endsWith('.html'));
  let flagged = 0;
  let checked = 0;

  console.log('FAB/chrome composition audit — shell.js pages only\n');

  for (const f of files) {
    const html = fs.readFileSync(path.join(PAGES_DIR, f), 'utf8');
    if (!hasShellJs(html)) continue;
    checked += 1;
    const { slug, findings } = auditPage(f.replace(/\.html$/, ''), html);
    if (!findings.length) continue;
    flagged += 1;
    console.log(slug);
    for (const finding of findings) {
      console.log(`  [${finding.type}] ${finding.detail}`);
    }
  }

  console.log(`\nSummary: ${checked} shell.js page(s) checked, ${flagged} flagged.`);
  if (flagged) {
    console.log('A flag means "look at this page," not "this page is broken" — see this file\'s header.');
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  WRAP_CAP_PX,
  hasShellJs,
  maxAuthoredWidth,
  usesViewportRelativeLayout,
  hasBodyWrapOptOut,
  managesOwnDataTheme,
  hasThemeOptOut,
  handAuthoredFabTags,
  auditPage,
};

// [VXG RealForever]
