#!/usr/bin/env node
/**
 * VEXTREME — lib/build-ecosystem-hub.js
 *
 * Generates pages/ecosystem-hub.html — a developer-facing dashboard
 * showing the current state of the content ecosystem and system health.
 *
 * The page is static chrome generated at build time. All live data
 * (index.json and status.json) is fetched at runtime in the browser,
 * matching the pattern established by vextreme-demo.html.
 *
 * Sections:
 *   Content Map    — arc count, node count, supported langs (live from index.json)
 *   Page Registry  — slug list with GitHub source links, copy-slug button
 *   System Health  — translation debt, tech debt, enhancements, assumptions (live from status.json)
 */

'use strict';

const fs   = require('fs');
const path = require('path');

const ROOT     = path.join(__dirname, '..');
const OUT_HTML = path.join(ROOT, 'pages', 'ecosystem-hub.html');
const CDN_BASE = 'https://cdn.jsdelivr.net/gh/vgong24/vextreme@main';
const REPO_URL = 'https://github.com/vgong24/Vextreme/blob/main';

function generateEcosystemHub() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Ecosystem Hub — Vextreme</title>
  <link rel="stylesheet" href="${CDN_BASE}/styles/design-system.css">
  <link rel="stylesheet" href="${CDN_BASE}/styles/arc-nav.css">
  <style>
    body { max-width: 900px; margin: 0 auto; padding: 2rem 1.5rem 4rem; }

    .hub-header { margin-bottom: 3rem; }
    .hub-header h1 { font-size: 2rem; font-weight: 700; margin: 0 0 0.5rem; }
    .hub-header p { color: var(--stone-400); margin: 0; }

    /* Stat tiles */
    .stat-row { display: flex; gap: 1rem; margin: 1.5rem 0; flex-wrap: wrap; }
    .stat-tile {
      flex: 1; min-width: 120px;
      border: 1px solid var(--stone-800);
      border-radius: 6px; padding: 1rem;
      text-align: center;
    }
    .stat-tile .val { font-size: 1.75rem; font-weight: 700; color: var(--ember); font-family: var(--font-mono); }
    .stat-tile .lbl { font-size: 0.75rem; color: var(--stone-400); margin-top: 0.25rem; }

    /* Section headers */
    .section { margin: 3rem 0 1.5rem; }
    .section h2 { font-size: 1rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em; color: var(--stone-300); border-bottom: 1px solid var(--stone-800); padding-bottom: 0.5rem; margin: 0 0 1rem; }

    /* Page registry table */
    .page-table { width: 100%; border-collapse: collapse; font-size: 0.85rem; }
    .page-table th { text-align: left; padding: 0.5rem 0.75rem; color: var(--stone-500); font-weight: 500; border-bottom: 1px solid var(--stone-800); }
    .page-table td { padding: 0.45rem 0.75rem; border-bottom: 1px solid var(--stone-900); vertical-align: middle; }
    .page-table tr:hover td { background: var(--stone-900); }
    .slug-cell { font-family: var(--font-mono); color: var(--stone-200); }
    .copy-btn {
      background: none; border: 1px solid var(--stone-700); border-radius: 3px;
      color: var(--stone-400); font-size: 0.7rem; padding: 0.15rem 0.4rem;
      cursor: pointer; font-family: var(--font-mono);
    }
    .copy-btn:hover { border-color: var(--ember); color: var(--ember); }
    .copy-btn.copied { color: var(--stone-500); border-color: var(--stone-800); }
    .gh-link { color: var(--stone-500); text-decoration: none; font-size: 0.75rem; }
    .gh-link:hover { color: var(--ember); }

    /* Health panels */
    .health-grid { display: flex; flex-direction: column; gap: 0.75rem; }
    details.health-panel {
      border: 1px solid var(--stone-800);
      border-radius: 6px; overflow: hidden;
    }
    details.health-panel[open] { border-color: var(--stone-700); }
    summary.panel-head {
      display: flex; align-items: center; justify-content: space-between;
      padding: 0.85rem 1rem; cursor: pointer; list-style: none; user-select: none;
      background: var(--stone-950, #0a0a0a);
    }
    summary.panel-head::-webkit-details-marker { display: none; }
    .panel-title { font-weight: 600; font-size: 0.9rem; display: flex; align-items: center; gap: 0.6rem; }
    .panel-badge {
      font-size: 0.7rem; font-family: var(--font-mono);
      background: var(--stone-800); border-radius: 999px;
      padding: 0.1rem 0.5rem; color: var(--stone-300);
    }
    .panel-badge.zero { background: transparent; color: var(--stone-600); }
    .panel-caret { color: var(--stone-600); font-size: 0.75rem; }
    details[open] .panel-caret::after { content: '▲'; }
    .panel-caret::after { content: '▼'; }

    .panel-body { padding: 0.75rem 1rem 1rem; border-top: 1px solid var(--stone-800); }

    .notice-item { padding: 0.6rem 0; border-bottom: 1px solid var(--stone-900); }
    .notice-item:last-child { border-bottom: none; }
    .notice-item .ni-title { font-weight: 600; font-size: 0.85rem; margin-bottom: 0.25rem; }
    .notice-item .ni-desc { font-size: 0.8rem; color: var(--stone-400); line-height: 1.5; }
    .notice-item .ni-meta { font-size: 0.72rem; color: var(--stone-600); margin-top: 0.25rem; font-family: var(--font-mono); }
    .notice-item .ni-tag {
      display: inline-block; font-size: 0.65rem; border-radius: 3px;
      padding: 0.1rem 0.4rem; margin-right: 0.3rem; font-family: var(--font-mono);
    }
    .tag-high    { background: rgba(200,80,42,0.15); color: var(--ember); }
    .tag-medium  { background: rgba(74,158,255,0.1); color: #4a9eff; }
    .tag-low     { background: rgba(100,100,100,0.15); color: var(--stone-500); }
    .tag-fixture { background: rgba(100,100,100,0.1); color: var(--stone-600); }

    .empty-state { color: var(--stone-600); font-size: 0.85rem; padding: 0.5rem 0; }

    .loading { color: var(--stone-600); font-size: 0.85rem; }
    .error-msg { color: #e05050; font-size: 0.85rem; }
  </style>
</head>
<body>

  <div class="hub-header">
    <h1>Ecosystem Hub</h1>
    <p>Current state of the content ecosystem and system health.</p>
  </div>

  <!-- Content Map -->
  <div class="section"><h2>Content Map</h2></div>
  <div class="stat-row">
    <div class="stat-tile"><div class="val" id="stat-nodes">—</div><div class="lbl">Content Nodes</div></div>
    <div class="stat-tile"><div class="val" id="stat-arcs">—</div><div class="lbl">Arcs</div></div>
    <div class="stat-tile"><div class="val" id="stat-langs">—</div><div class="lbl">Languages</div></div>
    <div class="stat-tile"><div class="val" id="stat-open">—</div><div class="lbl">Open Items</div></div>
  </div>

  <!-- Page Registry -->
  <div class="section"><h2>Page Registry</h2></div>
  <div id="page-registry"><span class="loading">Loading…</span></div>

  <!-- System Health -->
  <div class="section"><h2>System Health</h2></div>
  <div class="health-grid" id="health-grid">
    <span class="loading">Loading…</span>
  </div>

  <script>
  (function () {
    'use strict';

    var BASE       = '/Vextreme';
    var INDEX_URL  = BASE + '/data/index.json';
    var STATUS_URL = BASE + '/data/status.json';
    var REPO_URL   = '${REPO_URL}';

    function el(id) { return document.getElementById(id); }

    function copySlug(slug, btn) {
      navigator.clipboard.writeText(slug).then(function () {
        btn.textContent = 'copied';
        btn.classList.add('copied');
        setTimeout(function () {
          btn.textContent = 'copy';
          btn.classList.remove('copied');
        }, 1500);
      });
    }

    function renderPageRegistry(index) {
      var slugMap = index.slugMap || {};
      var slugs   = Object.keys(slugMap).sort();
      if (!slugs.length) {
        el('page-registry').innerHTML = '<span class="empty-state">No pages found.</span>';
        return;
      }
      var rows = slugs.map(function (slug) {
        var entry   = slugMap[slug];
        var arcId   = entry.arc || '';
        var ghLink  = REPO_URL + '/pages/' + slug + '.html';
        return '<tr>' +
          '<td class="slug-cell">' + slug + '</td>' +
          '<td>' + (arcId || '<span style="color:var(--stone-700)">—</span>') + '</td>' +
          '<td>' +
            '<button class="copy-btn" onclick="(function(b){navigator.clipboard.writeText(\\'' + slug + '\\').then(function(){b.textContent=\\'copied\\';b.classList.add(\\'copied\\');setTimeout(function(){b.textContent=\\'copy\\';b.classList.remove(\\'copied\\')},1500)})})(this)">copy</button>' +
          '</td>' +
          '<td><a class="gh-link" href="' + ghLink + '" target="_blank" rel="noopener">↗ source</a></td>' +
        '</tr>';
      }).join('');
      el('page-registry').innerHTML =
        '<table class="page-table">' +
          '<thead><tr><th>Slug</th><th>Arc</th><th></th><th>Source</th></tr></thead>' +
          '<tbody>' + rows + '</tbody>' +
        '</table>';
    }

    function tagClass(priority) {
      return 'ni-tag tag-' + (priority || 'low');
    }

    function renderHealthPanel(key, data) {
      var count  = data.count || 0;
      var items  = data.items || [];
      var badge  = '<span class="panel-badge' + (count === 0 ? ' zero' : '') + '">' + count + '</span>';
      var icons  = { translation: '🌐', techDebt: '🔧', enhancements: '💡', assumptions: '❓' };
      var icon   = icons[key] || '•';

      var bodyHtml;
      if (!items.length) {
        bodyHtml = '<div class="empty-state">No open items.</div>';
      } else {
        bodyHtml = items.map(function (item) {
          var priority = item.priority || 'low';
          var meta = [];
          if (item.addedSession) meta.push('session ' + item.addedSession);
          if (item.addedPR)      meta.push('PR #' + item.addedPR);
          if (item.context)      meta.push(item.context);
          if (item.blockedBy)    meta.push('blocked: ' + item.blockedBy);
          if (item.lang)         meta.push(item.lang.toUpperCase());
          if (item.key)          meta.push(item.key);

          var titleText = item.title || item.claim || item.key || '—';
          var descText  = item.description || item.en || '';

          return '<div class="notice-item">' +
            '<div class="ni-title">' +
              '<span class="' + tagClass(priority) + '">' + priority + '</span>' +
              titleText +
            '</div>' +
            (descText ? '<div class="ni-desc">' + descText + '</div>' : '') +
            (meta.length ? '<div class="ni-meta">' + meta.join(' · ') + '</div>' : '') +
          '</div>';
        }).join('');
      }

      // Show fixtures as a collapsed sub-section for translation panel
      if (key === 'translation' && data.fixtures && data.fixtures.length) {
        bodyHtml += '<details style="margin-top:0.75rem"><summary style="cursor:pointer;color:var(--stone-600);font-size:0.8rem">Intentional fixtures (' + data.fixtures.length + ')</summary>' +
          data.fixtures.map(function (f) {
            return '<div class="notice-item"><div class="ni-title"><span class="ni-tag tag-fixture">fixture</span>' + f.key + '</div>' +
              (f.en ? '<div class="ni-desc">' + f.en + '</div>' : '') + '</div>';
          }).join('') +
        '</details>';
      }

      return '<details class="health-panel">' +
        '<summary class="panel-head">' +
          '<span class="panel-title">' + icon + ' ' + data.label + ' ' + badge + '</span>' +
          '<span class="panel-caret"></span>' +
        '</summary>' +
        '<div class="panel-body">' + bodyHtml + '</div>' +
      '</details>';
    }

    function renderHealth(status) {
      var n       = status.notices;
      var order   = ['translation', 'techDebt', 'enhancements', 'assumptions'];
      var html    = order.map(function (k) { return renderHealthPanel(k, n[k]); }).join('');
      el('health-grid').innerHTML = html;
      el('stat-open').textContent = status._meta.totalOpen;
    }

    // Fetch both in parallel
    var indexDone = false, statusDone = false;
    var indexData, statusData;

    function maybeRenderRegistry() {
      if (indexDone) renderPageRegistry(indexData);
    }
    function maybeRenderHealth() {
      if (statusDone) renderHealth(statusData);
    }

    fetch(INDEX_URL)
      .then(function (r) { return r.json(); })
      .then(function (data) {
        indexData = data;
        indexDone = true;
        var slugCount = Object.keys(data.slugMap || {}).length;
        var arcCount  = Object.keys(data.arcMap  || {}).length;
        var langs     = (data.supportedLangs || []).join(', ').toUpperCase();
        el('stat-nodes').textContent = slugCount;
        el('stat-arcs').textContent  = arcCount;
        el('stat-langs').textContent = langs;
        maybeRenderRegistry();
      })
      .catch(function (e) {
        el('page-registry').innerHTML = '<span class="error-msg">Failed to load index.json: ' + e.message + '</span>';
      });

    fetch(STATUS_URL)
      .then(function (r) { return r.json(); })
      .then(function (data) {
        statusData = data;
        statusDone = true;
        maybeRenderHealth();
      })
      .catch(function (e) {
        el('health-grid').innerHTML = '<span class="error-msg">Failed to load status.json: ' + e.message + '</span>';
      });

  }());
  </script>

  <script src="${CDN_BASE}/widgets/sw-register.js"></script>
</body>
</html>
<!-- [VXG RealForever] -->
`;
}

if (require.main === module) {
  const html = generateEcosystemHub();
  fs.writeFileSync(OUT_HTML, html);
  console.log('[build-ecosystem-hub] Done.');
  console.log('  output:', OUT_HTML);
}

module.exports = { generateEcosystemHub };

// [VXG RealForever]
