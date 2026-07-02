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
const { Language, Category } = require('./vex-config');

const ROOT          = path.join(__dirname, '..');
const PAGES_DIR     = path.join(ROOT, 'pages');
const GH_BASE       = 'https://vgong24.github.io/Vextreme/pages';
const GH_ROOT       = 'https://vgong24.github.io/Vextreme';
const VIEWMODELS_IN = path.join(ROOT, 'data', 'viewmodels.json');

const nodes      = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'nodes.json'),   'utf8'));
const arcsDef    = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'arcs-v2.json'), 'utf8'));
const viewmodels = fs.existsSync(VIEWMODELS_IN)
  ? JSON.parse(fs.readFileSync(VIEWMODELS_IN, 'utf8'))
  : {};

// Load the EN compiled bundle. Text is baked into HTML at build time —
// no runtime resolver or multi-language blob is embedded in the output.
const COMPILED_DIR = path.join(ROOT, 'data', 'strings', 'compiled');
const strings = JSON.parse(fs.readFileSync(path.join(COMPILED_DIR, 'strings.en.json'), 'utf8'));

// Returns the display text for a string key, falling back to the key itself.
function getString(key) {
  return (strings[key] && strings[key].text) || key;
}

// ── Which slugs have an HTML file? ───────────────────────────────────────────

const ported = new Set();
for (const node of nodes) {
  if (fs.existsSync(path.join(PAGES_DIR, node.slug + '.html'))) {
    ported.add(node.slug);
  }
}

// ── Which ported slugs have translated content, and for what languages? ─────
// Same purpose as `ported` above (a per-slug state check), different state:
// ported = HTML file exists; localized = data-i18n keys exist and are filled
// in for a given language. Kept next to `ported` since both feed the same
// per-cell rendering pass below.

const MANIFEST_PATH = path.join(COMPILED_DIR, 'manifest.json');
const manifest = fs.existsSync(MANIFEST_PATH)
  ? JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'))
  : {};

const targetLangs = fs.readdirSync(COMPILED_DIR)
  .filter(f => /^strings\.[a-z]{2,}\.json$/.test(f))
  .map(f => f.replace(/^strings\./, '').replace(/\.json$/, ''))
  .filter(lang => lang !== Language.EN)
  .sort();

// localization[slug] = { langs: { ja: true } }  — true = every key translated,
// false = some but not all. Slugs with no page-scoped keys are absent (i18n
// hasn't been wired for that page yet, distinct from "translated into zero langs").
const localization = {};
for (const node of nodes) {
  if (!ported.has(node.slug)) continue;
  const prefix = `pages.${node.slug}.`;
  const keys = Object.keys(manifest).filter(k => k.startsWith(prefix));
  if (!keys.length) continue;

  const langs = {};
  for (const lang of targetLangs) {
    const covered = keys.filter(k => manifest[k].langs.includes(lang)).length;
    if (covered > 0) langs[lang] = covered === keys.length;
  }
  if (Object.keys(langs).length) localization[node.slug] = { langs };
}

// ── Dev / Demo pages (from viewmodels.json, category === 'demo') ─────────────
// These pages exist in pages/ but are not in nodes.json (not production content).
// They appear in a collapsible dev section at the bottom of archives.html.

const devPages = Object.entries(viewmodels)
  .filter(([, vm]) => vm.category === Category.DEMO && typeof vm.title === 'string')
  .map(([slug, vm]) => ({
    slug,
    title: vm.title,
    live: fs.existsSync(path.join(PAGES_DIR, slug + '.html')),
  }));

// Arc → section ID mapping for deep-linking from index.html
function arcSectionId(arcName) {
  return 'arc-' + arcName.replace(/_/g, '-');
}

function langChips(slug) {
  const info = localization[slug];
  if (!info) return [];
  return targetLangs
    .filter(lang => lang in info.langs)
    .map(lang => ({ lang, complete: info.langs[lang] }));
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

// Arc display names come from the compiled strings bundle — not hardcoded here.
// Key convention: {arc-key}.heading.title (kebab-case arc key, matching arcs.json source).
// arcs-v2.json uses snake_case keys; arcs.json uses kebab-case. Map between them.
const ARC_KEY_MAP = {
  liberation: 'liberation', epstein: 'epstein',
  claude_journals: 'claude-journals', convos_with_god: 'convos-with-god',
  architecture: 'architecture', ai_practitioner_tools: 'ai-practitioner-tools',
  direct_contact: 'direct-contact', living_blueprint: 'living-blueprint',
  records: 'records', ai_orientation: 'ai-orientation',
  victors_record: 'victors-record', excavation: 'excavation',
  dome: 'dome', covenant: 'covenant',
  march_23_2026: 'march-23-2026', full_timeline: 'full-timeline'
};

function arcLabel(arcName) {
  const stringKey = ARC_KEY_MAP[arcName] + '.heading.title';
  return (strings[stringKey] && strings[stringKey].text) || arcsDef[arcName]?.parent?.title || arcName;
}

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

// totalLocalizedByLang[lang] = count of ported+dated slugs fully translated into that lang.
const totalLocalizedByLang = {};
for (const lang of targetLangs) {
  totalLocalizedByLang[lang] = Object.entries(localization)
    .filter(([slug, info]) => slugMap[slug]?.id !== null && info.langs[lang] === true)
    .length;
}

// ── Render arc section ────────────────────────────────────────────────────────

function renderArcSection(arcName) {
  const slugItems = getArcSlugs(arcName);
  if (!slugItems.length) return '';

  const portedInArc = slugItems.filter(({ slug }) => ported.has(slug)).length;
  const total       = slugItems.length;
  const label       = arcLabel(arcName);
  const pct         = Math.round((portedInArc / total) * 100);

  const cells = slugItems.map(({ slug, section }, i) => {
    const node      = slugMap[slug];
    const title     = node ? node.title : slug;
    const isPorted  = ported.has(slug);
    const date      = node?.date || '';
    const pos       = i + 1;
    const chips     = isPorted ? langChips(slug) : [];
    const langNote  = chips.length
      ? ' — EN, ' + chips.map(c => c.lang.toUpperCase() + (c.complete ? '' : '*')).join(', ')
      : (isPorted ? ' — EN' : '');
    const tooltip   = `${pos}. ${title}${date ? ' — ' + date : ''}${!isPorted ? ' (not yet ported)' : ''}${isPorted ? langNote : ''}`;

    if (isPorted) {
      const chipHtml = chips.length
        ? `<span class="cell-langs">${chips.map(c =>
            `<span class="lang-chip ${c.complete ? 'lang-chip--full' : 'lang-chip--partial'}">${c.lang.toUpperCase()}</span>`
          ).join('')}</span>`
        : '';
      return `<a href="${GH_BASE}/${slug}.html" class="cell cell--ported" title="${tooltip}">
  <span class="cell-pos">${pos}</span>
  <span class="cell-title">${title}</span>
  ${chipHtml}
</a>`;
    } else {
      return `<span class="cell cell--missing" title="${tooltip}" data-slug="${slug}" data-title="${title}" data-date="${date}">
  <span class="cell-pos">${pos}</span>
  <span class="cell-title">${title}</span>
</span>`;
    }
  }).join('\n');

  return `<section class="arc-section" id="${arcSectionId(arcName)}">
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

// ── Dev section ───────────────────────────────────────────────────────────────

function renderDevSection() {
  if (!devPages.length) return '';
  const cells = devPages.map((page, i) => {
    const chips     = page.live ? langChips(page.slug) : [];
    const chipHtml  = chips.length
      ? `<span class="cell-langs">${chips.map(c =>
          `<span class="lang-chip ${c.complete ? 'lang-chip--full' : 'lang-chip--partial'}">${c.lang.toUpperCase()}</span>`
        ).join('')}</span>`
      : '';
    if (page.live) {
      return `<a href="${GH_BASE}/${page.slug}.html" class="cell cell--ported cell--dev" title="${page.title}">
  <span class="cell-pos cell-pos--dev">dev</span>
  <span class="cell-title">${page.title}</span>
  ${chipHtml}
</a>`;
    }
    return `<span class="cell cell--missing cell--dev" title="${page.title} (not yet built)" data-slug="${page.slug}" data-title="${page.title}" data-date="">
  <span class="cell-pos cell-pos--dev">dev</span>
  <span class="cell-title">${page.title}</span>
</span>`;
  }).join('\n');

  return `<section class="arc-section dev-section" id="arc-dev">
  <div class="arc-header">
    <h2 class="arc-name arc-name--dev">Dev &amp; Demo Pages</h2>
    <div class="arc-stats">
      <span class="arc-count dev-count">${devPages.filter(p => p.live).length} / ${devPages.length} live</span>
      <button class="dev-toggle" id="devToggle" aria-expanded="true">hide</button>
    </div>
  </div>
  <div class="cell-grid" id="devGrid">
${cells}
  </div>
</section>`;
}

const devSection = renderDevSection();

// ── Full page ─────────────────────────────────────────────────────────────────

const arcSections = ARC_ORDER.map(renderArcSection).filter(Boolean).join('\n\n');

const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Vextreme — Archives</title>
<meta name="description" content="Complete page map across all arcs and dev tools. Shows which pages are live and which are still being ported.">
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

  .cell-langs { display: flex; gap: 4px; flex-wrap: wrap; }
  .lang-chip {
    font-family: var(--mono); font-size: 9px; letter-spacing: 0.03em;
    padding: 1px 5px; border-radius: 3px; border: 1px solid #333;
  }
  .lang-chip--full    { color: var(--ember); border-color: var(--ember); }
  .lang-chip--partial { color: var(--muted); border-color: #333; }

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
  .legend-chip { font-family: var(--mono); font-size: 9px; padding: 1px 5px; border-radius: 3px; border: 1px solid; }
  .legend-chip--full    { color: var(--ember); border-color: var(--ember); }
  .legend-chip--partial { color: var(--muted); border-color: #333; }

  /* Nav header */
  .page-nav { display: flex; gap: 20px; margin-bottom: 32px; font-family: var(--mono); font-size: 11px; }
  .page-nav a { color: var(--muted); text-decoration: none; letter-spacing: 0.04em; }
  .page-nav a:hover { color: var(--ember); }
  .page-nav a.current { color: var(--text); }

  /* Dev section */
  .arc-name--dev { color: var(--muted); }
  .dev-count { color: var(--muted); }
  .dev-toggle {
    background: none; border: 1px solid var(--border); border-radius: 3px;
    color: var(--muted); font-family: var(--mono); font-size: 10px;
    padding: 2px 8px; cursor: pointer; letter-spacing: 0.05em;
  }
  .dev-toggle:hover { border-color: var(--ember); color: var(--ember); }
  .cell--dev .cell-pos--dev { color: #444; }
  .dev-section { border-top: 1px dashed var(--border); padding-top: 32px; margin-top: 16px; }
</style>
<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono&family=IBM+Plex+Sans:wght@400;500&display=swap" rel="stylesheet">
</head>
<body>

<nav class="page-nav">
  <a href="${GH_ROOT}/index.html">Index</a>
  <a class="current" href="#">Archives</a>
  <a href="${GH_BASE}/ecosystem-hub.html">Ecosystem Hub</a>
</nav>

<header class="site-header">
  <div class="site-title" data-i18n="common.label.site-title">${getString('common.label.site-title')}</div>
  <h1 class="site-sub" data-i18n="archives.heading.page-title">${getString('archives.heading.page-title')}</h1>
  <div class="site-meta">
    <span data-i18n="common.status.pages-live">${totalPorted} of ${totalNodes} pages live</span>
    <span data-i18n="common.status.remaining">${totalNodes - totalPorted} remaining</span>
    ${targetLangs.map(lang => `<span>${totalLocalizedByLang[lang]} / ${totalPorted} <span data-i18n="archives.label.localized-lang">${getString('archives.label.localized-lang')}</span> (${lang.toUpperCase()})</span>`).join('\n    ')}
    <span data-i18n="common.status.built-on">Built ${builtAt}</span>
  </div>
</header>

<div class="global-bar-wrap">
  <div class="global-bar-label">
    <span data-i18n="archives.label.overall-progress">${getString('archives.label.overall-progress')}</span>
    <span>${Math.round((totalPorted / totalNodes) * 100)}%</span>
  </div>
  <div class="global-bar">
    <div class="global-bar-fill" style="width:${Math.round((totalPorted / totalNodes) * 100)}%"></div>
  </div>
</div>

<div class="legend">
  <div class="legend-item"><div class="legend-dot legend-dot--ported"></div> <span data-i18n="common.label.page-live">${getString('common.label.page-live')}</span></div>
  <div class="legend-item"><div class="legend-dot legend-dot--missing"></div> <span data-i18n="common.label.not-yet-ported">${getString('common.label.not-yet-ported')}</span></div>
  ${targetLangs.length ? `<div class="legend-item"><span class="legend-chip legend-chip--full">${targetLangs[0].toUpperCase()}</span> <span data-i18n="archives.label.localized-full">${getString('archives.label.localized-full')}</span></div>
  <div class="legend-item"><span class="legend-chip legend-chip--partial">${targetLangs[0].toUpperCase()}</span> <span data-i18n="archives.label.localized-partial">${getString('archives.label.localized-partial')}</span></div>` : ''}
</div>

${arcSections}

${devSection}

<div id="slugPopover" class="slug-popover" style="display:none">
  <div class="slug-popover-label" data-i18n="common.label.slug">${getString('common.label.slug')}</div>
  <div class="slug-popover-value" id="slugPopoverSlug"></div>
  <div class="slug-popover-filename" id="slugPopoverFile"></div>
  <button class="slug-popover-copy" id="slugPopoverBtn">${getString('common.button.copy-filename')}</button>
</div>

<script>
(function () {
  var COPY_LABEL   = ${JSON.stringify(getString('common.button.copy-filename'))};
  var COPIED_LABEL = ${JSON.stringify(getString('common.button.copied'))};

  var popover = document.getElementById('slugPopover');
  var slugEl  = document.getElementById('slugPopoverSlug');
  var fileEl  = document.getElementById('slugPopoverFile');
  var copyBtn = document.getElementById('slugPopoverBtn');
  var currentSlug = '';

  document.addEventListener('click', function (e) {
    var cell = e.target.closest('.cell--missing');
    if (cell) {
      currentSlug = cell.dataset.slug;
      slugEl.textContent = currentSlug;
      fileEl.textContent = currentSlug + '.html';
      copyBtn.textContent = COPY_LABEL;

      var rect = cell.getBoundingClientRect();
      var top  = rect.bottom + window.scrollY + 8;
      var left = rect.left  + window.scrollX;

      popover.style.display = 'block';
      var pw = popover.offsetWidth;
      if (left + pw > window.innerWidth - 16) left = window.innerWidth - pw - 16;
      popover.style.top  = top + 'px';
      popover.style.left = left + 'px';
      return;
    }
    if (!popover.contains(e.target)) {
      popover.style.display = 'none';
    }
  });

  copyBtn.addEventListener('click', function (e) {
    e.stopPropagation();
    navigator.clipboard.writeText(currentSlug + '.html').then(function () {
      copyBtn.textContent = COPIED_LABEL;
      setTimeout(function () { copyBtn.textContent = COPY_LABEL; }, 1500);
    });
  });
}());

(function () {
  var btn  = document.getElementById('devToggle');
  var grid = document.getElementById('devGrid');
  if (!btn || !grid) return;

  var KEY = 'vex-show-dev';
  var show = localStorage.getItem(KEY) !== '0';

  function apply() {
    grid.style.display = show ? '' : 'none';
    btn.textContent    = show ? 'hide' : 'show';
    btn.setAttribute('aria-expanded', show ? 'true' : 'false');
  }

  apply();
  btn.addEventListener('click', function () {
    show = !show;
    localStorage.setItem(KEY, show ? '1' : '0');
    apply();
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
