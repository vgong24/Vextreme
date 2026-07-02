#!/usr/bin/env node
/**
 * VEXTREME — lib/build-demo.js
 *
 * Generates pages/vextreme-demo.html — the client-facing architecture demo.
 * Explains and shows (not just describes) why the system is built the way
 * it is: CQRS data split, slug identity, i18n pipeline, continuity system,
 * live-fetched index.json stats, and a pointer to the intentionally
 * incomplete archive dashboard as the "in progress vs. production" proof.
 *
 * Run manually:   node lib/build-demo.js
 * Auto-run via:   .github/workflows/build-index.yml
 */

'use strict';

const fs   = require('fs');
const path = require('path');
const { Category, Scope, CDN_BASE } = require('./vex-config');

const ROOT      = path.join(__dirname, '..');
const PAGES_DIR = path.join(ROOT, 'pages');
const GH_BASE   = 'https://vgong24.github.io/Vextreme/pages';

const nodes   = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'nodes.json'),   'utf8'));
const arcsDef = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'arcs-v2.json'), 'utf8'));

const COMPILED_DIR = path.join(ROOT, 'data', 'strings', 'compiled');
const strings = JSON.parse(fs.readFileSync(path.join(COMPILED_DIR, 'strings.en.json'), 'utf8'));

function getString(key) {
  return (strings[key] && strings[key].text) || key;
}

// Build-time values — the live section re-fetches these from index.json in
// the browser to prove they aren't just written into this page.
const nodeCount = nodes.filter(n => n.id !== null).length;
const arcCount  = Object.keys(arcsDef).filter(k => !k.startsWith('_')).length;
const portedCount = nodes.filter(n => n.id !== null && fs.existsSync(path.join(PAGES_DIR, n.slug + '.html'))).length;

const COMPARISON_ROWS = ['cqrs', 'slug', 'i18n', 'continuity'];

const approachLabel     = getString('demo.comparison.label.this-approach');
const conventionalLabel = getString('demo.comparison.label.conventional');

const comparisonHtml = COMPARISON_ROWS.map(key => `<div class="compare-row">
  <div class="compare-cell compare-cell--approach">
    <div class="compare-label" data-i18n="demo.comparison.label.this-approach">${approachLabel}</div>
    <div data-i18n="demo.comparison.${key}.approach">${getString(`demo.comparison.${key}.approach`)}</div>
  </div>
  <div class="compare-cell compare-cell--alternative">
    <div class="compare-label" data-i18n="demo.comparison.label.conventional">${conventionalLabel}</div>
    <div data-i18n="demo.comparison.${key}.alternative">${getString(`demo.comparison.${key}.alternative`)}</div>
  </div>
</div>`).join('\n');

const html = `<!DOCTYPE html>
<html lang="en" data-theme="dashboard">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Vextreme — How This Is Built</title>
<meta name="description" content="A live demonstration of the architecture, tests, and process behind Vextreme.">
<link rel="stylesheet" href="${CDN_BASE}/styles/design-system.css">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: var(--bg); color: var(--text); font-family: var(--sans); padding: 48px 24px 96px; max-width: 860px; margin: 0 auto; line-height: 1.6; }

  .site-header { margin-bottom: 16px; }
  .site-title  { font-size: 13px; font-family: var(--mono); color: var(--ember); letter-spacing: 0.08em; text-transform: uppercase; margin-bottom: 8px; }
  h1 { font-size: 26px; font-weight: 500; margin-bottom: 8px; }
  .subtitle { color: var(--muted); font-size: 15px; margin-bottom: 40px; max-width: 640px; }

  section { margin-bottom: 44px; border-top: 1px solid var(--border); padding-top: 28px; }
  h2 { font-size: 16px; font-weight: 500; color: var(--ember); margin-bottom: 12px; }
  p  { font-size: 14px; color: var(--text); max-width: 680px; }

  .compare-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 12px; }
  .compare-cell { border: 1px solid var(--border); border-radius: 6px; padding: 12px 14px; font-size: 13px; }
  .compare-cell--approach { border-color: var(--ember); background: rgba(200,80,42,0.06); }
  .compare-label { font-family: var(--mono); font-size: 10px; letter-spacing: 0.06em; text-transform: uppercase; color: var(--muted); margin-bottom: 6px; }
  .compare-cell--approach .compare-label { color: var(--ember); }

  .live-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 12px; margin-top: 12px; }
  .live-stat { border: 1px solid var(--border); border-radius: 6px; padding: 14px; text-align: center; }
  .live-stat-value { font-family: var(--mono); font-size: 22px; color: var(--ember); }
  .live-stat-label { font-size: 11px; color: var(--muted); margin-top: 4px; }
  .live-note { font-family: var(--mono); font-size: 11px; color: var(--muted); margin-top: 10px; }

  .links { display: flex; flex-direction: column; gap: 8px; margin-top: 16px; }
  .links a { color: var(--ember); text-decoration: none; font-size: 14px; }
  .links a:hover { text-decoration: underline; }
</style>
<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono&family=IBM+Plex+Sans:wght@400;500&display=swap" rel="stylesheet">
</head>
<body>

<header class="site-header">
  <div class="site-title" data-i18n="common.label.site-title">${getString('common.label.site-title')}</div>
  <h1 data-i18n="demo.heading.title">${getString('demo.heading.title')}</h1>
  <div class="subtitle" data-i18n="demo.heading.subtitle">${getString('demo.heading.subtitle')}</div>
</header>

<section id="why">
  <h2 data-i18n="demo.section.why.heading">${getString('demo.section.why.heading')}</h2>
  <p data-i18n="demo.section.why.body">${getString('demo.section.why.body')}</p>
</section>

<section id="comparison">
  <h2 data-i18n="demo.section.comparison.heading">${getString('demo.section.comparison.heading')}</h2>
  ${comparisonHtml}
</section>

<section id="live">
  <h2 data-i18n="demo.section.live.heading">${getString('demo.section.live.heading')}</h2>
  <p data-i18n="demo.section.live.body">${getString('demo.section.live.body')}</p>
  <div class="live-grid" id="liveGrid">
    <div class="live-stat"><div class="live-stat-value" id="liveNodes">${nodeCount}</div><div class="live-stat-label" data-i18n="demo.live.label.nodes">${getString('demo.live.label.nodes')}</div></div>
    <div class="live-stat"><div class="live-stat-value" id="liveArcs">${arcCount}</div><div class="live-stat-label" data-i18n="demo.live.label.arcs">${getString('demo.live.label.arcs')}</div></div>
    <div class="live-stat"><div class="live-stat-value" id="liveLangs">—</div><div class="live-stat-label" data-i18n="demo.live.label.langs">${getString('demo.live.label.langs')}</div></div>
  </div>
  <div class="live-note" id="liveNote" data-i18n="demo.live.status.loading">${getString('demo.live.status.loading')}</div>
</section>

<section id="tests">
  <h2 data-i18n="demo.section.tests.heading">${getString('demo.section.tests.heading')}</h2>
  <p data-i18n="demo.section.tests.body">${getString('demo.section.tests.body')}</p>
</section>

<section id="specimens">
  <h2 data-i18n="demo.section.specimens.heading">${getString('demo.section.specimens.heading')}</h2>
  <p data-i18n="demo.section.specimens.body">${getString('demo.section.specimens.body')}</p>
  <div class="links">
    <a href="${GH_BASE}/specimens.html" data-i18n="demo.link.specimens">${getString('demo.link.specimens')}</a>
  </div>
</section>

<section id="gaps">
  <h2 data-i18n="demo.section.gaps.heading">${getString('demo.section.gaps.heading')}</h2>
  <p data-i18n="demo.section.gaps.body">${getString('demo.section.gaps.body')}</p>
  <div class="links">
    <a href="${GH_BASE}/archives.html" data-i18n="demo.link.archives">${getString('demo.link.archives')}</a>
    <a href="https://vextreme24.com" data-i18n="demo.link.production">${getString('demo.link.production')}</a>
  </div>
</section>

<script>
(function () {
  var INDEX_URL = '${CDN_BASE}/data/index.json?v=' + Date.now();
  var FAILED_TEXT = ${JSON.stringify(getString('demo.live.status.failed'))};

  // note.removeAttribute('data-i18n') below is load-bearing: once this div shows
  // live-fetched content, widgets/lang-fab.js's [data-i18n] sweep on language
  // switch would otherwise overwrite it back to the static "loading" translation,
  // silently reverting the page's "this is live, not baked" claim.
  var req = new XMLHttpRequest();
  req.open('GET', INDEX_URL, true);
  req.onload = function () {
    var note = document.getElementById('liveNote');
    note.removeAttribute('data-i18n');
    if (req.status !== 200) { note.textContent = FAILED_TEXT; return; }
    try {
      var data = JSON.parse(req.responseText);
      document.getElementById('liveNodes').textContent = data.nodeCount;
      document.getElementById('liveArcs').textContent = data.arcCount;
      document.getElementById('liveLangs').textContent = (data.supportedLangs || []).join(', ').toUpperCase();
      note.textContent = ${JSON.stringify(getString('demo.live.label.built-at'))} + ': ' + data.builtAt;
    } catch (e) {
      note.textContent = FAILED_TEXT;
    }
  };
  req.onerror = function () {
    var note = document.getElementById('liveNote');
    note.removeAttribute('data-i18n');
    note.textContent = FAILED_TEXT;
  };
  req.send();
}());
</script>

<script>
  // Demo pages live in the 'demo' category — scopes compile to
  // scopes/demo/ instead of scopes/production/. lang-fab reads this to
  // construct the correct fetch URL without a runtime lookup table.
  window.VEX_STRING_CATEGORY = '${Category.DEMO}';
  window.VEX_STRING_SCOPES = ['${Scope.DEMO}'];
</script>
<script src="${CDN_BASE}/widgets/lang-fab.js"></script>
<script src="${CDN_BASE}/widgets/demo-fab.js"></script>

</body>
</html>`;

fs.writeFileSync(path.join(PAGES_DIR, 'vextreme-demo.html'), html);

console.log(`[build-demo] Done.`);
console.log(`  nodes  : ${nodeCount}`);
console.log(`  arcs   : ${arcCount}`);
console.log(`  ported : ${portedCount}`);
console.log(`  output : pages/vextreme-demo.html`);

// [VXG RealForever]
