/**
 * VEXTREME — lib/vextreme-index-v2.js
 *
 * Browser library for the v2 arc nav system. GitHub Pages only.
 * Loads data/index.json (pre-built by lib/build-index.js), caches in
 * localStorage with stale-while-revalidate via ETag, renders arc nav
 * into #arcNavMount.
 *
 * Activated by pages that include this script on github.io or localhost.
 * Zero effect on vextreme24.com — that site does not load this file.
 */

(function () {
  'use strict';

  var VERSION   = '1.0.0';
  var CDN_BASE  = 'https://cdn.jsdelivr.net/gh/vgong24/vextreme@main';
  var INDEX_URL = CDN_BASE + '/data/index.json?v=' + VERSION;
  var LS_DATA   = 'vex-index-v2-data';
  var LS_ETAG   = 'vex-index-v2-etag';

  // ── Environment ─────────────────────────────────────────────────────────────

  var host    = window.location.hostname;
  var isGitHub = host === 'vgong24.github.io';
  var isLocal  = host === 'localhost' || host === '127.0.0.1';

  function buildBaseUrl() {
    if (isGitHub) return 'https://vgong24.github.io/Vextreme';
    if (isLocal)  return 'http://localhost:8080';
    return 'https://www.vextreme24.com';
  }

  function urlFromSlug(slug) {
    var base = buildBaseUrl();
    if (isGitHub || isLocal) return base + '/pages/' + slug + '.html';
    return base + '/' + slug;
  }

  function detectSlug() {
    // Allow page to override (for test pages)
    if (window.VEX_SLUG) return window.VEX_SLUG;
    var parts = window.location.pathname.split('/').filter(Boolean);
    var last  = parts[parts.length - 1] || '';
    return last.replace(/\.html$/, '');
  }

  // ── Index loading (cache + stale-while-revalidate) ───────────────────────────

  function loadIndex(onData) {
    var cached = null;
    var cachedEtag = null;

    try {
      var raw = localStorage.getItem(LS_DATA);
      if (raw) cached = JSON.parse(raw);
      cachedEtag = localStorage.getItem(LS_ETAG);
    } catch (e) { /* storage unavailable */ }

    function fetchFresh(background) {
      var req = new XMLHttpRequest();
      req.open('GET', INDEX_URL, true);
      if (background && cachedEtag) req.setRequestHeader('If-None-Match', cachedEtag);
      req.onload = function () {
        if (req.status === 304) return; // cache still valid
        if (req.status === 200) {
          try {
            var data = JSON.parse(req.responseText);
            var etag = req.getResponseHeader('ETag');
            try {
              localStorage.setItem(LS_DATA, req.responseText);
              if (etag) localStorage.setItem(LS_ETAG, etag);
            } catch (e) { /* storage full — continue without caching */ }
            onData(data);
          } catch (e) {
            if (!background) console.warn('[vextreme-v2] Failed to parse index.json', e);
          }
        } else if (!background) {
          console.warn('[vextreme-v2] index.json returned HTTP ' + req.status);
        }
      };
      req.onerror = function () {
        if (!background) console.warn('[vextreme-v2] Failed to fetch index.json');
      };
      req.send();
    }

    if (cached) {
      onData(cached);          // serve immediately from cache
      fetchFresh(true);        // background revalidation
    } else {
      fetchFresh(false);       // cold load — block until ready
    }
  }

  // Arc priority and display metadata are pre-computed by build-index.js.
  // node.arcKeys in index.json are already in priority order — no tables needed here.

  // ── getLatticeView ────────────────────────────────────────────────────────────

  function getLatticeView(slug, index) {
    var node = index.slugMap[slug];
    if (!node) return null;

    var sortedKeys = node.arcKeys; // pre-sorted by priority in build-index.js

    var arcViews = [];

    for (var i = 0; i < sortedKeys.length; i++) {
      var arcName  = sortedKeys[i];
      var sections = index.arcMap[arcName];
      if (!sections || !sections.length) continue;

      // Flatten all sections to a single ordered slug list
      var flatSlugs = [];
      var sectionForSlug = null;
      for (var s = 0; s < sections.length; s++) {
        var sec = sections[s];
        for (var j = 0; j < sec.slugs.length; j++) {
          flatSlugs.push(sec.slugs[j]);
        }
        if (sec.slugs.indexOf(slug) >= 0) {
          sectionForSlug = sec;
        }
      }

      var pos = flatSlugs.indexOf(slug);
      if (pos < 0 || !sectionForSlug) continue;

      var prevSlug = flatSlugs[pos - 1] || null;
      var nextSlug = flatSlugs[pos + 1] || null;

      var meta = (index.arcMeta && index.arcMeta[arcName]) || { title: arcName, url: '#', renderMode: 'dots' };

      arcViews.push({
        arcName:     arcName,
        arcMeta:     meta,
        renderMode:  meta.renderMode || 'dots',
        sectionLabel:sectionForSlug.label,
        position:    pos + 1,
        total:       flatSlugs.length,
        prevSlug:    prevSlug,
        nextSlug:    nextSlug,
        prevUrl:     prevSlug ? urlFromSlug(prevSlug) : null,
        nextUrl:     nextSlug ? urlFromSlug(nextSlug) : null
      });
    }

    return { node: node, arcs: arcViews };
  }

  // ── Renderer registry ─────────────────────────────────────────────────────────
  //
  // Each renderer is a function: (arcView) → HTML string for one arc row.
  // arcView shape:
  //   { arcName, arcMeta: { title, url }, renderMode, sectionLabel,
  //     position, total, prevUrl, nextUrl }
  //
  // To add a render mode: register a new function here. The core never changes.
  // Unknown modes fall back to 'dots' with a one-time console warning.

  var _warnedModes = {};

  var RENDERERS = {

    // dots — standard arc row: title link + section label + position + prev/next arrows
    dots: function (v) {
      var label = v.arcMeta.title + ' · ' + v.sectionLabel;
      var prev  = v.prevUrl ? '<a href="' + v.prevUrl + '" class="arc-nav-arrow">← prev</a>'
                            : '<span class="arc-nav-arrow disabled">← prev</span>';
      var next  = v.nextUrl ? '<a href="' + v.nextUrl + '" class="arc-nav-arrow">next →</a>'
                            : '<span class="arc-nav-arrow disabled">next →</span>';
      return '<div class="arc-nav-row">'
        + '<div class="arc-nav-label"><a href="' + v.arcMeta.url + '">' + label + '</a></div>'
        + '<div class="arc-nav-right">'
        + '<span class="arc-nav-counter">' + v.position + ' / ' + v.total + '</span>'
        + '<div class="arc-nav-arrows">' + prev + next + '</div>'
        + '</div></div>';
    },

    // position — for meta/timeline arcs where section label alone is enough context;
    // shows arc title + numeric position only, no section label in the header link.
    position: function (v) {
      var prev = v.prevUrl ? '<a href="' + v.prevUrl + '" class="arc-nav-arrow">← prev</a>'
                           : '<span class="arc-nav-arrow disabled">← prev</span>';
      var next = v.nextUrl ? '<a href="' + v.nextUrl + '" class="arc-nav-arrow">next →</a>'
                           : '<span class="arc-nav-arrow disabled">next →</span>';
      return '<div class="arc-nav-row arc-nav-row--position">'
        + '<div class="arc-nav-label"><a href="' + v.arcMeta.url + '">' + v.arcMeta.title + '</a></div>'
        + '<div class="arc-nav-right">'
        + '<span class="arc-nav-counter">' + v.position + ' / ' + v.total + '</span>'
        + '<div class="arc-nav-arrows">' + prev + next + '</div>'
        + '</div></div>';
    }

  };

  function renderArcRow(v) {
    var renderer = RENDERERS[v.renderMode];
    if (!renderer) {
      if (!_warnedModes[v.renderMode]) {
        console.warn('[vextreme-v2] Unknown renderMode "' + v.renderMode + '" on arc "' + v.arcName + '" — falling back to dots');
        _warnedModes[v.renderMode] = true;
      }
      renderer = RENDERERS.dots;
    }
    return renderer(v);
  }

  // ── Render ────────────────────────────────────────────────────────────────────

  function renderArcNav(lattice, mountEl) {
    if (!lattice || !lattice.arcs.length) {
      mountEl.innerHTML = '';
      return;
    }

    var rows = '';
    for (var i = 0; i < lattice.arcs.length; i++) {
      rows += renderArcRow(lattice.arcs[i]);
    }

    mountEl.innerHTML = '<div class="arc-nav">'
      + rows
      + '<div class="arc-nav-current">You Are Here: ' + lattice.node.title + '</div>'
      + '</div>';
  }

  // ── Mount ─────────────────────────────────────────────────────────────────────

  function mount() {
    var slug    = detectSlug();
    var mountEl = document.getElementById('arcNavMount');
    if (!slug || !mountEl) return;

    loadIndex(function (index) {
      var lattice = getLatticeView(slug, index);
      renderArcNav(lattice, mountEl);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount);
  } else {
    mount();
  }

}());

// [VXG RealForever]
