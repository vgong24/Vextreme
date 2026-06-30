#!/usr/bin/env node
/**
 * VEXTREME — lib/build-index-page.js
 *
 * Generates index.html — the root landing / navigation page.
 * Shows arc hub links + last 5 nodes added to nodes.json (by id).
 *
 * Run manually:   node lib/build-index-page.js
 * Auto-run via:   .github/workflows/build-index.yml
 */

'use strict';

const fs   = require('fs');
const path = require('path');

const ROOT      = path.join(__dirname, '..');
const PAGES_DIR = path.join(ROOT, 'pages');
const GH_BASE   = 'https://vgong24.github.io/Vextreme/pages';

const nodes   = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'nodes.json'), 'utf8'));
const arcsDef = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'arcs-v2.json'), 'utf8'));

// ── Latest 5 nodes by id (most recently catalogued) ──────────────────────────

const latest = nodes
  .filter(n => n.id !== null)
  .sort((a, b) => b.id - a.id)
  .slice(0, 5);

// ── Arc hub nav (priority-1 arcs only, ordered by priority then key) ──────────

const ARC_ORDER = [
  'liberation', 'epstein', 'claude_journals', 'convos_with_god', 'architecture',
  'ai_practitioner_tools', 'direct_contact', 'living_blueprint', 'records',
  'ai_orientation', 'victors_record'
];

const arcHubs = ARC_ORDER.map(key => {
  const def = arcsDef[key];
  if (!def) return null;
  return { key, title: def.parent.title, url: def.parent.url };
}).filter(Boolean);

// ── Helpers ───────────────────────────────────────────────────────────────────

function isPorted(slug) {
  return fs.existsSync(path.join(PAGES_DIR, slug + '.html'));
}

function pageUrl(slug) {
  return `${GH_BASE}/${slug}.html`;
}

const portedCount = nodes.filter(n => n.id !== null && isPorted(n.slug)).length;
const totalCount  = nodes.filter(n => n.id !== null).length;
const builtAt     = new Date().toISOString().split('T')[0];

// ── Render latest entries ─────────────────────────────────────────────────────

const latestRows = latest.map(n => {
  const ported = isPorted(n.slug);
  if (ported) {
    return `  <a class="entry entry--live" href="${pageUrl(n.slug)}">
    <span class="entry-id">#${n.id}</span>
    <span class="entry-title">${n.title}</span>
    <span class="entry-date">${n.date}</span>
  </a>`;
  } else {
    return `  <div class="entry entry--pending">
    <span class="entry-id">#${n.id}</span>
    <span class="entry-title">${n.title}</span>
    <span class="entry-date">${n.date}</span>
  </div>`;
  }
}).join('\n');

// ── Render arc hub links ──────────────────────────────────────────────────────

const arcLinks = arcHubs.map(a =>
  `  <a class="arc-link" href="${a.url}">${a.title}</a>`
).join('\n');

// ── Full page ─────────────────────────────────────────────────────────────────

const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Vex Life — Archive</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Source+Serif+4:ital,wght@0,300;1,300&family=IBM+Plex+Mono:wght@400&family=IBM+Plex+Sans:wght@300;400&display=swap" rel="stylesheet">
<style>
  :root {
    --bg:     #fafaf9;
    --text:   #1c1917;
    --muted:  #78716c;
    --border: #e7e5e4;
    --ember:  #b45830;
    --surface:#ffffff;
    --mono:   'IBM Plex Mono', monospace;
    --serif:  'Source Serif 4', Georgia, serif;
    --sans:   'IBM Plex Sans', sans-serif;
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: var(--bg); padding: clamp(2rem, 6vw, 4rem); max-width: 680px; margin: 0 auto; }

  .eyebrow { font-family: var(--mono); font-size: 10px; letter-spacing: 2px; text-transform: uppercase; color: var(--ember); margin-bottom: 1rem; }
  .heading  { font-family: var(--serif); font-size: clamp(28px, 5vw, 40px); font-weight: 300; font-style: italic; color: var(--text); margin-bottom: 1rem; line-height: 1.2; }
  .body     { font-family: var(--sans); font-size: 15px; color: #44403c; line-height: 1.8; margin-bottom: 2rem; max-width: 58ch; }
  hr.divider { width: 32px; height: 2px; background: var(--ember); border: none; margin: 2rem 0; }

  /* Section labels */
  .section-label { font-family: var(--mono); font-size: 10px; letter-spacing: 1.5px; text-transform: uppercase; color: var(--muted); margin-bottom: 1rem; display: flex; justify-content: space-between; align-items: baseline; }
  .section-label a { color: var(--ember); text-decoration: none; font-size: 10px; }
  .section-label a:hover { text-decoration: underline; }

  /* Latest entries */
  .entry {
    display: grid;
    grid-template-columns: 32px 1fr auto;
    align-items: baseline;
    gap: 10px;
    padding: 10px 0;
    border-bottom: 1px solid var(--border);
    font-family: var(--sans);
    font-size: 14px;
    text-decoration: none;
  }
  .entry-id    { font-family: var(--mono); font-size: 10px; color: var(--muted); }
  .entry-date  { font-family: var(--mono); font-size: 10px; color: var(--muted); white-space: nowrap; }
  .entry--live  { color: var(--ember); }
  .entry--live:hover .entry-title { text-decoration: underline; }
  .entry--pending { color: var(--muted); }

  /* Arc hub links */
  .arc-link {
    display: block;
    font-family: var(--sans);
    font-size: 14px;
    color: var(--ember);
    text-decoration: none;
    padding: 8px 0;
    border-bottom: 1px solid var(--border);
  }
  .arc-link:hover { color: #8a3820; }

  /* Nav strip */
  .nav-strip { display: flex; gap: 20px; margin-top: 2.5rem; padding-top: 1.5rem; border-top: 1px solid var(--border); }
  .nav-strip a { font-family: var(--mono); font-size: 10px; letter-spacing: 1px; text-transform: uppercase; color: var(--muted); text-decoration: none; }
  .nav-strip a:hover { color: var(--ember); }

  /* Progress line */
  .progress { font-family: var(--mono); font-size: 10px; color: var(--muted); margin-bottom: 1.5rem; }
  .progress-bar { height: 2px; background: var(--border); border-radius: 1px; margin-top: 6px; }
  .progress-fill { height: 100%; background: var(--ember); border-radius: 1px; width: ${Math.round((portedCount / totalCount) * 100)}%; }
</style>
</head>
<body>

<p class="eyebrow">Vex Life — Preservation Archive</p>
<h1 class="heading">Full static archive.</h1>
<p class="body">
  GitHub Pages preservation copy of vextreme24.com — a forkable,
  independent record of all documented content. Primary site at
  <a href="https://www.vextreme24.com" style="color:var(--ember);">vextreme24.com</a>.
</p>

<hr class="divider">

<div class="section-label">
  <span>Latest additions</span>
  <span>Built ${builtAt}</span>
</div>

${latestRows}

<div class="progress" style="margin-top:1rem;">
  ${portedCount} of ${totalCount} pages live
  <div class="progress-bar"><div class="progress-fill"></div></div>
</div>

<hr class="divider">

<div class="section-label">
  <span>Arc hubs</span>
  <a href="${GH_BASE}/archives.html">Full archive →</a>
</div>

${arcLinks}

<nav class="nav-strip">
  <a href="${GH_BASE}/archives.html">Archives</a>
  <a href="https://www.vextreme24.com">vextreme24.com</a>
  <a href="https://github.com/vgong24/Vextreme">GitHub</a>
</nav>

</body>
</html>`;

fs.writeFileSync(path.join(ROOT, 'index.html'), html);

console.log(`[build-index-page] Done.`);
console.log(`  latest : ${latest.map(n => n.slug).join(', ')}`);
console.log(`  ported : ${portedCount} / ${totalCount}`);
console.log(`  output : index.html`);
