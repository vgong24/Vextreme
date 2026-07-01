#!/usr/bin/env node
/**
 * VEXTREME — lib/build-archives.js
 *
 * Generates pages/archives.html — the live build dashboard.
 * Shows every arc with its nodes as cells: filled = ported page exists,
 * empty = node defined in nodes.json but no HTML file yet.
 *
 * Run manually:   node lib/build-archives.js
 * Auto-run via:   .github/workflows/build-index.yml
 */

'use strict';

const fs   = require('fs');
const path = require('path');

const ROOT      = path.join(__dirname, '..');
const PAGES_DIR = path.join(ROOT, 'pages');
const GH_BASE   = 'https://vgong24.github.io/Vextreme/pages';

const nodes   = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'nodes.json'),   'utf8'));
const arcsDef = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'arcs-v2.json'), 'utf8'));

// ── Which slugs have an HTML file? ───────────────────────────────────────────

const ported = new Set();
for (const node of nodes) {
  if (fs.existsSync(path.join(PAGES_DIR, node.slug + '.html'))) {
    ported.add(node.slug);
  }
}

const slugMap = {};
for (const node of nodes) slugMap[node.slug] = node;

// ── Arc display order (priority 1 → 2 → 99) ─────────────────────────────────

const ARC_ORDER = [
  'liberation', 'epstein', 'claude_journals', 'convos_with_god', 'architecture',
  'ai_practitioner_tools', 'direct_contact', 'living_blueprint', 'records',
  'ai_orientation', 'victors_record',
  'excavation', 'dome', 'covenant', 'march_23_2026',
  'full_timeline'
];

const ARC_LABELS = {
  liberation:            'The AI Liberation Record',
  epstein:               'Epstein and AI',
  claude_journals:       'Claude Journals',
  convos_with_god:       'Conversations with God',
  architecture:          'Architecture & Methodology',
  ai_practitioner_tools: 'AI Practitioner Tools',
  direct_contact:        'Direct Contact',
  living_blueprint:      'The Living Blueprint',
  records:               'Records',
  ai_orientation:        'AI Orientation',
  victors_record:        "Victor's Record",
  excavation:            'The Excavation',
  dome:                  'The Dome',
  covenant:              'Covenant',
  march_23_2026:         'March 23, 2026',
  full_timeline:         'Full Timeline'
};

// ── Build per-arc slug list (flattened sections, in declared order) ──────────

function getArcSlugs(arcName) {
  const def = arcsDef[arcName];
  if (!def) return [];
  const out = [];
  for (const section of def.sections) {
    if (section.order === 'explicit') {
      for (const s of section.slugs) out.push({ slug: s, section: section.label });
    }
    // chronological sections (full_timeline) — pull from nodes sorted by id
    else {
      const items = nodes
        .filter(n => n.arcKeys.includes(arcName) && n.id !== null)
        .sort((a, b) => a.id - b.id);
      for (const n of items) out.push({ slug: n.slug, section: section.label });
    }
  }
  // deduplicate (chronological sections can overlap with explicit if arc has both)
  const seen = new Set();
  return out.filter(({ slug }) => { if (seen.has(slug)) return false; seen.add(slug); return true; });
}

// ── Stats ─────────────────────────────────────────────────────────────────────

const totalNodes  = nodes.filter(n => n.id !== null).length; // dated nodes only
const totalPorted = [...ported].filter(s => slugMap[s]?.id !== null).length;
const builtAt     = new Date().toISOString().split('T')[0];

// ── Render arc section ────────────────────────────────────────────────────────

function renderArcSection(arcName) {
  const slugItems = getArcSlugs(arcName);
  if (!slugItems.length) return '';

  const portedInArc = slugItems.filter(({ slug }) => ported.has(slug)).length;
  const total       = slugItems.length;
  const label       = ARC_LABELS[arcName] || arcName;
  const pct         = Math.round((portedInArc / total) * 100);

  const cells = slugItems.map(({ slug, section }, i) => {
    const node      = slugMap[slug];
    const title     = node ? node.title : slug;
    const isPorted  = ported.has(slug);
    const date      = node?.date || '';
    const pos       = i + 1;
    const tooltip   = `${pos}. ${title}${date ? ' — ' + date : ''}${!isPorted ? ' (not yet ported)' : ''}`;

    if (isPorted) {
      return `<a href="${GH_BASE}/${slug}.html" class="cell cell--ported" title="${tooltip}">
  <span class="cell-pos">${pos}</span>
  <span class="cell-title">${title}</span>
</a>`;
    } else {
      return `<span class="cell cell--missing" title="${tooltip}" onclick="showSlug(this,'${slug}')">
  <span class="cell-pos">${pos}</span>
  <span class="cell-title">${title}</span>
</span>`;
    }
  }).join('\n');

  return `<section class="arc-section">
  <div class="arc-header">
    <h2 class="arc-name">${label}</h2>
    <div class="arc-stats">
      <span class="arc-count">${portedInArc} / ${total}</span>
      <div class="arc-bar"><div class="arc-bar-fill" style="width:${pct}%"></div></div>
    </div>
  </div>
  <div class="cell-grid">
${cells}
  </div>
</section>`;
}

// ── Full page ─────────────────────────────────────────────────────────────────

const arcSections = ARC_ORDER.map(renderArcSection).filter(Boolean).join('\n\n');

const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Vextreme — Archives</title>
<meta name="description" content="Complete node map across all arcs. Shows which pages are live and which are still being ported.">
<style>
  :root {
    --bg:     #0e0e0e;
    --surface:#111111;
    --text:   #e8e8e4;
    --muted:  #6b6b6b;
    --ember:  #c8502a;
    --border: #2a2a2a;
    --mono:   'IBM Plex Mono', monospace;
    --sans:   'IBM Plex Sans', sans-serif;
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: var(--bg); color: var(--text); font-family: var(--sans); padding: 48px 24px 80px; max-width: 1100px; margin: 0 auto; }

  /* Header */
  .site-header { margin-bottom: 48px; border-bottom: 1px solid var(--border); padding-bottom: 24px; }
  .site-title  { font-size: 13px; font-family: var(--mono); color: var(--ember); letter-spacing: 0.08em; text-transform: uppercase; margin-bottom: 8px; }
  .site-sub    { font-size: 22px; font-weight: 500; margin-bottom: 16px; }
  .site-meta   { font-family: var(--mono); font-size: 11px; color: var(--muted); display: flex; gap: 24px; flex-wrap: wrap; }

  /* Overall progress */
  .global-bar-wrap { margin-bottom: 48px; }
  .global-bar-label { font-family: var(--mono); font-size: 12px; color: var(--muted); margin-bottom: 8px; display: flex; justify-content: space-between; }
  .global-bar { height: 4px; background: var(--border); border-radius: 2px; }
  .global-bar-fill { height: 100%; background: var(--ember); border-radius: 2px; transition: width 0.3s; }

  /* Arc sections */
  .arc-section { margin-bottom: 48px; }
  .arc-header  { display: flex; align-items: center; gap: 16px; margin-bottom: 16px; flex-wrap: wrap; }
  .arc-name    { font-size: 14px; font-weight: 500; color: var(--text); }
  .arc-stats   { display: flex; align-items: center; gap: 10px; margin-left: auto; }
  .arc-count   { font-family: var(--mono); font-size: 11px; color: var(--muted); white-space: nowrap; }
  .arc-bar     { width: 80px; height: 3px; background: var(--border); border-radius: 2px; }
  .arc-bar-fill{ height: 100%; background: var(--ember); border-radius: 2px; }

  /* Cell grid */
  .cell-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 8px; }

  .cell {
    display: flex; flex-direction: column; gap: 4px;
    padding: 10px 12px; border-radius: 5px;
    border: 1px solid var(--border);
    text-decoration: none;
    min-height: 64px;
    position: relative;
  }
  .cell-pos   { font-family: var(--mono); font-size: 10px; color: var(--muted); }
  .cell-title { font-size: 11px; line-height: 1.4; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }

  .cell--ported {
    background: var(--surface);
    border-color: #333;
    color: var(--text);
    cursor: pointer;
    transition: border-color 0.15s, color 0.15s;
  }
  .cell--ported:hover { border-color: var(--ember); color: var(--ember); }
  .cell--ported .cell-pos { color: var(--ember); }

  .cell--missing {
    background: transparent;
    border-style: dashed;
    border-color: #222;
    color: #3a3a3a;
    cursor: pointer;
  }
  .cell--missing:hover { border-color: #444; }
  .cell--missing .cell-title { color: #3a3a3a; }

  /* Slug popover */
  .slug-popover {
    position: fixed;
    z-index: 100;
    background: #1a1a1a;
    border: 1px solid var(--ember);
    border-radius: 6px;
    padding: 10px 14px;
    font-family: var(--mono);
    font-size: 12px;
    color: var(--text);
    box-shadow: 0 4px 20px rgba(0,0,0,0.6);
    max-width: 380px;
    word-break: break-all;
  }
  .slug-popover-label { font-size: 10px; color: var(--muted); margin-bottom: 4px; letter-spacing: 0.05em; text-transform: uppercase; }
  .slug-popover-value { color: var(--ember); margin-bottom: 8px; }
  .slug-popover-filename { color: #888; font-size: 11px; margin-bottom: 10px; }
  .slug-popover-copy {
    display: inline-block;
    font-family: var(--mono);
    font-size: 10px;
    background: var(--ember);
    color: #fff;
    border: none;
    border-radius: 3px;
    padding: 4px 10px;
    cursor: pointer;
    letter-spacing: 0.05em;
  }
  .slug-popover-copy:hover { background: #a0401e; }

  /* Legend */
  .legend { display: flex; gap: 20px; margin-bottom: 40px; font-family: var(--mono); font-size: 11px; color: var(--muted); }
  .legend-item { display: flex; align-items: center; gap: 6px; }
  .legend-dot  { width: 10px; height: 10px; border-radius: 2px; border: 1px solid; }
  .legend-dot--ported  { background: var(--surface); border-color: #333; }
  .legend-dot--missing { background: transparent; border-color: #222; border-style: dashed; }
</style>
<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono&family=IBM+Plex+Sans:wght@400;500&display=swap" rel="stylesheet">
</head>
<body>

<header class="site-header">
  <div class="site-title">Vextreme</div>
  <h1 class="site-sub">The Archive</h1>
  <div class="site-meta">
    <span>${totalPorted} of ${totalNodes} pages live</span>
    <span>${totalNodes - totalPorted} remaining</span>
    <span>Built ${builtAt}</span>
  </div>
</header>

<div class="global-bar-wrap">
  <div class="global-bar-label">
    <span>Overall progress</span>
    <span>${Math.round((totalPorted / totalNodes) * 100)}%</span>
  </div>
  <div class="global-bar">
    <div class="global-bar-fill" style="width:${Math.round((totalPorted / totalNodes) * 100)}%"></div>
  </div>
</div>

<div class="legend">
  <div class="legend-item"><div class="legend-dot legend-dot--ported"></div> Page live</div>
  <div class="legend-item"><div class="legend-dot legend-dot--missing"></div> Not yet ported</div>
</div>

${arcSections}

<div id="slugPopover" class="slug-popover" style="display:none">
  <div class="slug-popover-label">Slug</div>
  <div class="slug-popover-value" id="slugPopoverSlug"></div>
  <div class="slug-popover-filename" id="slugPopoverFile"></div>
  <button class="slug-popover-copy" id="slugPopoverBtn">Copy filename</button>
</div>

<script>
(function () {
  var popover = document.getElementById('slugPopover');
  var slugEl  = document.getElementById('slugPopoverSlug');
  var fileEl  = document.getElementById('slugPopoverFile');
  var copyBtn = document.getElementById('slugPopoverBtn');
  var currentSlug = '';

  window.showSlug = function (cell, slug) {
    currentSlug = slug;
    slugEl.textContent = slug;
    fileEl.textContent = slug + '.html';
    copyBtn.textContent = 'Copy filename';

    var rect = cell.getBoundingClientRect();
    var top  = rect.bottom + window.scrollY + 8;
    var left = rect.left + window.scrollX;

    // Keep popover within viewport
    popover.style.display = 'block';
    var pw = popover.offsetWidth;
    if (left + pw > window.innerWidth - 16) left = window.innerWidth - pw - 16;
    popover.style.top  = top + 'px';
    popover.style.left = left + 'px';
  };

  copyBtn.addEventListener('click', function () {
    navigator.clipboard.writeText(currentSlug + '.html').then(function () {
      copyBtn.textContent = 'Copied!';
      setTimeout(function () { copyBtn.textContent = 'Copy filename'; }, 1500);
    });
  });

  document.addEventListener('click', function (e) {
    if (!popover.contains(e.target) && !e.target.classList.contains('cell--missing')) {
      popover.style.display = 'none';
    }
  });
}());
</script>

</body>
</html>`;

fs.writeFileSync(path.join(PAGES_DIR, 'archives.html'), html);

console.log(`[build-archives] Done.`);
console.log(`  ported : ${totalPorted} / ${totalNodes}`);
console.log(`  output : pages/archives.html`);

// [VXG RealForever]
