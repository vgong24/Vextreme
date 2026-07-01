#!/usr/bin/env node
/**
 * VEXTREME — lib/build-sitemap.js
 *
 * Generates sitemap.xml at repo root — lists all live pages for crawlers.
 * Only includes pages that actually exist in pages/ (ported nodes).
 * Unported nodes are excluded — no 404s in the sitemap.
 *
 * Run manually:   node lib/build-sitemap.js
 * Auto-run via:   .github/workflows/build-index.yml
 */

'use strict';

const fs   = require('fs');
const path = require('path');

const ROOT      = path.join(__dirname, '..');
const PAGES_DIR = path.join(ROOT, 'pages');
const GH_BASE   = 'https://vgong24.github.io/Vextreme/pages';

const nodes = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'nodes.json'), 'utf8'));

// ── Collect live pages ────────────────────────────────────────────────────────

const today = new Date().toISOString().split('T')[0];

// Utility pages to include in sitemap (non-node pages)
const UTILITY_PAGES = ['archives', 'vextreme-demo', 'specimens', 'specimen-full-translation', 'specimen-partial-translation', 'specimen-smallest-miss'];

const urls = [];

// Ported content nodes (sorted by timeline id)
const portedNodes = nodes
  .filter(n => n.id !== null && fs.existsSync(path.join(PAGES_DIR, n.slug + '.html')))
  .sort((a, b) => a.id - b.id);

for (const node of portedNodes) {
  urls.push({ loc: `${GH_BASE}/${node.slug}.html`, lastmod: today });
}

// Utility pages
for (const slug of UTILITY_PAGES) {
  if (fs.existsSync(path.join(PAGES_DIR, slug + '.html'))) {
    urls.push({ loc: `${GH_BASE}/${slug}.html`, lastmod: today });
  }
}

// ── Generate XML ──────────────────────────────────────────────────────────────

const urlEntries = urls.map(({ loc, lastmod }) =>
  `  <url>\n    <loc>${loc}</loc>\n    <lastmod>${lastmod}</lastmod>\n  </url>`
).join('\n');

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlEntries}
</urlset>`;

fs.writeFileSync(path.join(ROOT, 'sitemap.xml'), xml);

console.log(`[build-sitemap] Done.`);
console.log(`  live pages : ${portedNodes.length}`);
console.log(`  output     : sitemap.xml`);

// [VXG RealForever]
