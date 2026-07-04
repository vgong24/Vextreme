#!/usr/bin/env node
/**
 * VEXTREME — lib/build-specimens.js
 *
 * Generates pages/specimens.html (dashboard) and three specimen pages, each
 * a small fixed fixture (not real content) isolating one localization state
 * and pairing it with a process-map diagram of the pipeline stage that
 * produces or catches that state:
 *
 *   specimen-full-translation.html    — every string translated  → test-suite process map
 *   specimen-partial-translation.html — one string left untranslated → screenshot-verification process map
 *   specimen-smallest-miss.html       — one line, staled on purpose → strings-check process map
 *
 * Sits between pages/vextreme-demo.html (architecture pitch) and
 * pages/archives.html (real progress tracker): smaller than either, meant
 * to be read in a minute, linked from both.
 *
 * Run manually:   node lib/build-specimens.js
 * Auto-run via:   .github/workflows/build-index.yml
 */

'use strict';

const fs   = require('fs');
const path = require('path');
const { Category, Language, Scope, CDN_BASE, scopeRelPath } = require('./vex-config');

const ROOT      = path.join(__dirname, '..');
const PAGES_DIR = path.join(ROOT, 'pages');
const GH_BASE   = 'https://vgong24.github.io/Vextreme/pages';

const specimens = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'specimens.json'), 'utf8'));

const COMPILED_DIR = path.join(ROOT, 'data', 'strings', 'compiled');
const strings = JSON.parse(fs.readFileSync(path.join(COMPILED_DIR, 'strings.en.json'), 'utf8'));

function getString(key) {
  return (strings[key] && strings[key].text) || key;
}

// ── Shared chrome: styles, widgets, page shell ─────────────────────────────

const SHARED_CSS = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: var(--bg); color: var(--text); font-family: var(--sans); padding: 48px 24px 96px; max-width: 860px; margin: 0 auto; line-height: 1.6; }
  .site-header { margin-bottom: 16px; }
  .site-title  { font-size: 13px; font-family: var(--mono); color: var(--ember); letter-spacing: 0.08em; text-transform: uppercase; margin-bottom: 8px; }
  h1 { font-size: 26px; font-weight: 500; margin-bottom: 8px; }
  .subtitle { color: var(--muted); font-size: 15px; margin-bottom: 40px; max-width: 640px; }
  section { margin-bottom: 44px; border-top: 1px solid var(--border); padding-top: 28px; }
  h2 { font-size: 16px; font-weight: 500; color: var(--ember); margin-bottom: 12px; }
  p  { font-size: 14px; color: var(--text); max-width: 680px; margin-bottom: 10px; }
  .links { display: flex; flex-direction: column; gap: 8px; margin-top: 16px; }
  .links a { color: var(--ember); text-decoration: none; font-size: 14px; }
  .links a:hover { text-decoration: underline; }

  /* Specimen cards (dashboard) */
  .card-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 14px; }
  .card { border: 1px solid var(--border); border-radius: 8px; padding: 16px; text-decoration: none; color: var(--text); display: block; }
  .card:hover { border-color: var(--ember); }
  .card-badge { font-family: var(--mono); font-size: 9px; letter-spacing: 0.05em; text-transform: uppercase; color: var(--ember); border: 1px solid var(--ember); border-radius: 3px; padding: 2px 6px; display: inline-block; margin-bottom: 10px; }
  .card-label { font-size: 15px; font-weight: 500; margin-bottom: 8px; }
  .card-desc  { font-size: 12.5px; color: var(--muted); }

  /* Process map — boxes and arrows, plain HTML/CSS */
  .process-map { display: flex; flex-direction: column; gap: 0; }
  .process-step { border: 1px solid var(--border); border-radius: 6px; padding: 14px 16px; position: relative; }
  .process-step-num { font-family: var(--mono); font-size: 10px; color: var(--ember); letter-spacing: 0.05em; margin-bottom: 4px; }
  .process-step-label { font-size: 14px; font-weight: 500; margin-bottom: 6px; }
  .process-step-detail { font-size: 12.5px; color: var(--muted); }
  .process-arrow { text-align: center; font-family: var(--mono); color: var(--ember); font-size: 14px; padding: 4px 0; }

  .body-text { border-left: 2px solid var(--border); padding-left: 16px; margin-bottom: 8px; }
  .live-note { font-family: var(--mono); font-size: 11px; color: var(--muted); margin-top: 10px; }
  .stale-badge { display: none; font-family: var(--mono); font-size: 11px; color: var(--ember); border: 1px solid var(--ember); border-radius: 4px; padding: 6px 10px; margin: 10px 0; }
  .stale-badge.is-visible { display: inline-block; }
`;

function widgetScripts(scopes) {
  const list = Array.isArray(scopes) ? scopes : [scopes];
  return `<script>
  window.VEX_STRING_CATEGORY = '${Category.DEMO}';
  window.VEX_STRING_SCOPES = ${JSON.stringify(list)};
</script>
<script src="${CDN_BASE}/widgets/lang-fab.js"></script>
<script src="${CDN_BASE}/widgets/demo-fab.js"></script>`;
}

function pageShell({ title, scope, body, extraHead }) {
  return `<!DOCTYPE html>
<html lang="en" data-theme="dashboard">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${title}</title>
<link rel="stylesheet" href="${CDN_BASE}/styles/design-system.css">
<style>${SHARED_CSS}</style>
<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono&family=IBM+Plex+Sans:wght@400;500&display=swap" rel="stylesheet">
${extraHead || ''}
</head>
<body>
${body}
${widgetScripts(scope)}
</body>
</html>`;
}

// ── Dashboard: pages/specimens.html ────────────────────────────────────────

const cardHtml = specimens.map(s => `<a class="card" href="${GH_BASE}/${s.slug}.html">
  <div class="card-badge" data-i18n="specimens.card.${s.state}.label">${getString(`specimens.card.${s.state}.label`)}</div>
  <div class="card-label">${s.title}</div>
  <div class="card-desc" data-i18n="specimens.card.${s.state}.description">${getString(`specimens.card.${s.state}.description`)}</div>
  <div class="card-desc" style="color:var(--ember);margin-top:8px;" data-i18n="specimens.link.view">${getString('specimens.link.view')}</div>
</a>`).join('\n');

const dashboardBody = `<header class="site-header">
  <div class="site-title" data-i18n="common.label.site-title">${getString('common.label.site-title')}</div>
  <h1 data-i18n="specimens.heading.title">${getString('specimens.heading.title')}</h1>
  <div class="subtitle" data-i18n="specimens.heading.subtitle">${getString('specimens.heading.subtitle')}</div>
</header>

<div class="card-grid">
${cardHtml}
</div>

<section>
  <div class="links">
    <a href="${GH_BASE}/vextreme-demo.html" data-i18n="specimens.link.demo">${getString('specimens.link.demo')}</a>
    <a href="${GH_BASE}/archives.html" data-i18n="specimens.link.archives">${getString('specimens.link.archives')}</a>
  </div>
</section>`;

fs.writeFileSync(path.join(PAGES_DIR, 'specimens.html'), pageShell({
  title: 'Vextreme — Specimens',
  scope: 'specimens',
  body: dashboardBody,
}));

// ── Specimen: full translation ─────────────────────────────────────────────

function processMapHtml(scope, steps) {
  return steps.map((n, i) => {
    const label  = getString(`${scope}.process.step${n}.label`);
    const detail = getString(`${scope}.process.step${n}.detail`);
    const step = `<div class="process-step">
  <div class="process-step-num">${String(n).padStart(2, '0')}</div>
  <div class="process-step-label" data-i18n="${scope}.process.step${n}.label">${label}</div>
  <div class="process-step-detail" data-i18n="${scope}.process.step${n}.detail">${detail}</div>
</div>`;
    return i < steps.length - 1 ? step + '\n<div class="process-arrow">↓</div>' : step;
  }).join('\n');
}

function backLinks() {
  return `<div class="links">
    <a href="${GH_BASE}/specimens.html" data-i18n="specimens.link.back">${getString('specimens.link.back')}</a>
  </div>`;
}

const fullScope = 'pages.specimen-full-translation';
const fullBody = `<header class="site-header">
  <div class="site-title" data-i18n="common.label.site-title">${getString('common.label.site-title')}</div>
  <h1 data-i18n="${fullScope}.heading.title">${getString(`${fullScope}.heading.title`)}</h1>
  <div class="subtitle" data-i18n="${fullScope}.intro">${getString(`${fullScope}.intro`)}</div>
</header>

<section>
  <div class="body-text" data-i18n="${fullScope}.body">${getString(`${fullScope}.body`)}</div>
</section>

<section>
  <h2 data-i18n="${fullScope}.process.heading">${getString(`${fullScope}.process.heading`)}</h2>
  <div class="process-map">
${processMapHtml(fullScope, [1, 2, 3, 4])}
  </div>
</section>

<section>
  ${backLinks()}
</section>`;

fs.writeFileSync(path.join(PAGES_DIR, 'specimen-full-translation.html'), pageShell({
  title: 'Vextreme — Specimen: Full Translation',
  scope: [fullScope, 'specimens'],
  body: fullBody,
}));

// ── Specimen: partial translation ──────────────────────────────────────────

const partialScope = 'pages.specimen-partial-translation';
const partialBody = `<header class="site-header">
  <div class="site-title" data-i18n="common.label.site-title">${getString('common.label.site-title')}</div>
  <h1 data-i18n="${partialScope}.heading.title">${getString(`${partialScope}.heading.title`)}</h1>
  <div class="subtitle" data-i18n="${partialScope}.intro">${getString(`${partialScope}.intro`)}</div>
</header>

<section>
  <div class="body-text" data-i18n="${partialScope}.body.translated">${getString(`${partialScope}.body.translated`)}</div>
  <div class="body-text" data-i18n="${partialScope}.body.untranslated">${getString(`${partialScope}.body.untranslated`)}</div>
</section>

<section>
  <h2 data-i18n="${partialScope}.process.heading">${getString(`${partialScope}.process.heading`)}</h2>
  <div class="process-map">
${processMapHtml(partialScope, [1, 2, 3, 4])}
  </div>
</section>

<section>
  ${backLinks()}
</section>`;

fs.writeFileSync(path.join(PAGES_DIR, 'specimen-partial-translation.html'), pageShell({
  title: 'Vextreme — Specimen: Partial Translation',
  scope: [partialScope, 'specimens'],
  body: partialBody,
}));

// ── Specimen: the smallest miss ────────────────────────────────────────────
// The stale-status line below is fetched live from the compiled JA scope
// bundle, not baked here — this page can't know at EN-build-time whether
// strings-check.js has flagged the JA translation stale yet (see the two-pass
// staleness demo described in lib/strings-compile.js's scope docs and the
// continuity log). It mirrors the live-fetch pattern already used on
// pages/vextreme-demo.html rather than guessing at build time.

const missScope = 'pages.specimen-smallest-miss';
const missBody = `<header class="site-header">
  <div class="site-title" data-i18n="common.label.site-title">${getString('common.label.site-title')}</div>
  <h1 data-i18n="${missScope}.heading.title">${getString(`${missScope}.heading.title`)}</h1>
  <div class="subtitle" data-i18n="${missScope}.intro">${getString(`${missScope}.intro`)}</div>
</header>

<section>
  <div class="body-text" data-i18n="${missScope}.body">${getString(`${missScope}.body`)}</div>
  <div class="stale-badge" id="staleBadge" data-i18n="${missScope}.stale-badge">${getString(`${missScope}.stale-badge`)}</div>
  <div class="live-note" id="staleLiveNote">Checking live translation status…</div>
</section>

<section>
  <h2 data-i18n="${missScope}.process.heading">${getString(`${missScope}.process.heading`)}</h2>
  <div class="process-map">
${processMapHtml(missScope, [1, 2, 3, 4])}
  </div>
</section>

<section>
  ${backLinks()}
</section>

<script>
(function () {
  var url = '${CDN_BASE}/data/strings/compiled/scopes/${scopeRelPath(missScope, Category.DEMO)}.${Language.JA}.json?v=' + Date.now();
  var req = new XMLHttpRequest();
  req.open('GET', url, true);
  req.onload = function () {
    var note = document.getElementById('staleLiveNote');
    var badge = document.getElementById('staleBadge');
    if (req.status !== 200) { note.textContent = 'Live check failed — could not fetch JA scope bundle.'; return; }
    try {
      var data = JSON.parse(req.responseText);
      var entry = data['${missScope}.body'];
      var isStale = !!(entry && entry._stale);
      badge.classList.toggle('is-visible', isStale);
      note.textContent = isStale
        ? 'Live check: fetched ${missScope}.ja.json — _stale is true on this key, confirmed just now.'
        : 'Live check: fetched ${missScope}.ja.json — not flagged stale.';
    } catch (e) {
      document.getElementById('staleLiveNote').textContent = 'Live check failed — could not parse JA scope bundle.';
    }
  };
  req.onerror = function () {
    document.getElementById('staleLiveNote').textContent = 'Live check failed — network error.';
  };
  req.send();
}());
</script>`;

fs.writeFileSync(path.join(PAGES_DIR, 'specimen-smallest-miss.html'), pageShell({
  title: 'Vextreme — Specimen: The Smallest Miss',
  scope: [missScope, 'specimens'],
  body: missBody,
}));

console.log(`[build-specimens] Done.`);
console.log(`  specimens : ${specimens.length}`);
console.log(`  output    : pages/specimens.html + pages/specimen-*.html`);

// [VXG RealForever]
