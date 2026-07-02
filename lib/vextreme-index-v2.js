/**
 * VEXTREME — lib/vextreme-index-v2.js
 *
 * THE arc nav widget for the v2 architecture (God Script + GitHub Pages).
 * Supersedes lib/arc-nav.js, which was the v1 Squarespace-era script and
 * reads from the old VEXTREME_ARCS / arcs.json format — do not use that
 * one for new pages.
 *
 * Loads data/index.json (pre-built by lib/build-index.js), caches in
 * localStorage with stale-while-revalidate via ETag, renders arc nav
 * into #arcNavMount.
 *
 * Inlined into God Scripts via the FEATURES registry in lib/build-vextreme.js
 * (Feature.ARC_NAV, srcDir: LIB_DIR). Opt-in per viewmodel — pages that list
 * 'arc-nav' in their features[] array get this widget baked in.
 *
 * Works in two load contexts:
 *   1. God Script pages (dist/vextreme-{slug}.js): the God Script sets
 *      window.VEX_STRINGS_EN before this file runs. loadStrings() reads
 *      that directly — no CDN fetch for arc nav chrome strings.
 *   2. Non-God-Script pages (shell.js + vextreme.js): no VEX_STRINGS_EN set;
 *      loadStrings() falls back to the localStorage cache or CDN fetch of
 *      data/strings/compiled/strings.en.json.
 *
 * Zero effect on vextreme24.com — that site does not load this file.
 */

(function () {
  'use strict';

  var VERSION    = '1.0.0';

  // Structured logger — swap handler to redirect to analytics:
  //   window.VEXTREME_LOGGER = { warn: e => myAnalytics.track(e.code, e) };
  var _logger = (window.VEXTREME_LOGGER) || {
    warn:  function(e) { console.warn('[' + e.code + ']', e.message, e); },
    error: function(e) { console.error('[' + e.code + ']', e.message, e); },
  };
  var CDN_BASE   = 'https://cdn.jsdelivr.net/gh/vgong24/vextreme@main';
  var INDEX_URL  = CDN_BASE + '/data/index.json?v=' + VERSION;
  var STRINGS_URL = CDN_BASE + '/data/strings/compiled/strings.en.json?v=' + VERSION;
  var LS_DATA    = 'vex-index-v2-data';
  var LS_ETAG    = 'vex-index-v2-etag';
  var LS_STRINGS = 'vex-strings-en';

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
            if (!background) _logger.warn({ code: 'INDEX_PARSE_FAILED', message: 'Failed to parse index.json', error: e });
          }
        } else if (!background) {
          _logger.warn({ code: 'INDEX_HTTP_ERROR', message: 'index.json returned HTTP ' + req.status, status: req.status });
        }
      };
      req.onerror = function () {
        if (!background) _logger.warn({ code: 'INDEX_FETCH_FAILED', message: 'Failed to fetch index.json' });
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

  // ── Strings loading (EN bundle, same cache pattern as index) ────────────────

  var _strings = {};

  function getString(key) {
    var entry = _strings[key];
    return (entry && entry.text) || key;
  }

  function loadStrings(onReady) {
    // God Script fast path — EN strings already inlined by build-vextreme.js.
    // Arc nav chrome keys (common.nav.prev/next, common.label.you-are-here) are
    // in the 'common' scope which God Scripts always include. Skip all fetches.
    if (window.VEX_STRINGS_EN && typeof window.VEX_STRINGS_EN === 'object') {
      _strings = window.VEX_STRINGS_EN;
      onReady();
      return;
    }

    try {
      var cached = localStorage.getItem(LS_STRINGS);
      if (cached) {
        _strings = JSON.parse(cached);
        onReady();
        // Background revalidation — update cache silently
        var req = new XMLHttpRequest();
        req.open('GET', STRINGS_URL, true);
        req.onload = function () {
          if (req.status === 200) {
            try {
              _strings = JSON.parse(req.responseText);
              localStorage.setItem(LS_STRINGS, req.responseText);
            } catch (e) { /* ignore parse errors in background */ }
          }
        };
        req.send();
        return;
      }
    } catch (e) { /* storage unavailable */ }

    var req = new XMLHttpRequest();
    req.open('GET', STRINGS_URL, true);
    req.onload = function () {
      if (req.status === 200) {
        try {
          _strings = JSON.parse(req.responseText);
          try { localStorage.setItem(LS_STRINGS, req.responseText); } catch (e) {}
        } catch (e) { _logger.warn({ code: 'STRINGS_PARSE_FAILED', message: 'Failed to parse strings bundle', error: e }); }
      } else {
        _logger.warn({ code: 'STRINGS_HTTP_ERROR', message: 'strings bundle returned HTTP ' + req.status, status: req.status });
      }
      onReady();
    };
    req.onerror = function () {
      _logger.warn({ code: 'STRINGS_FETCH_FAILED', message: 'Failed to fetch strings bundle — UI text will fall back to keys' });
      onReady();
    };
    req.send();
  }

  // Arc priority and display metadata are pre-computed by build-index.js.
  // node.arcKeys in index.json are already in priority order — no tables needed here.

  // ── buildArcNavData ────────────────────────────────────────────────────────────

  function buildArcNavData(slug, index) {
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
    dots: function (arcView) {
      var label    = arcView.arcMeta.title + ' · ' + arcView.sectionLabel;
      var prevText = getString('common.nav.prev');
      var nextText = getString('common.nav.next');
      var prev  = arcView.prevUrl ? '<a href="' + arcView.prevUrl + '" class="arc-nav-arrow" aria-label="' + getString('common.nav.prev') + '">' + prevText + '</a>'
                                  : '<span class="arc-nav-arrow disabled" aria-hidden="true">' + prevText + '</span>';
      var next  = arcView.nextUrl ? '<a href="' + arcView.nextUrl + '" class="arc-nav-arrow" aria-label="' + getString('common.nav.next') + '">' + nextText + '</a>'
                                  : '<span class="arc-nav-arrow disabled" aria-hidden="true">' + nextText + '</span>';
      return '<div class="arc-nav-row">'
        + '<div class="arc-nav-label"><a href="' + arcView.arcMeta.url + '">' + label + '</a></div>'
        + '<div class="arc-nav-right">'
        + '<span class="arc-nav-counter">' + arcView.position + ' / ' + arcView.total + '</span>'
        + '<div class="arc-nav-arrows">' + prev + next + '</div>'
        + '</div></div>';
    },

    // position — for meta/timeline arcs where section label alone is enough context;
    // shows arc title + numeric position only, no section label in the header link.
    position: function (arcView) {
      var prevText = getString('common.nav.prev');
      var nextText = getString('common.nav.next');
      var prev = arcView.prevUrl ? '<a href="' + arcView.prevUrl + '" class="arc-nav-arrow" aria-label="' + getString('common.nav.prev') + '">' + prevText + '</a>'
                                 : '<span class="arc-nav-arrow disabled" aria-hidden="true">' + prevText + '</span>';
      var next = arcView.nextUrl ? '<a href="' + arcView.nextUrl + '" class="arc-nav-arrow" aria-label="' + getString('common.nav.next') + '">' + nextText + '</a>'
                                 : '<span class="arc-nav-arrow disabled" aria-hidden="true">' + nextText + '</span>';
      return '<div class="arc-nav-row arc-nav-row--position">'
        + '<div class="arc-nav-label"><a href="' + arcView.arcMeta.url + '">' + arcView.arcMeta.title + '</a></div>'
        + '<div class="arc-nav-right">'
        + '<span class="arc-nav-counter">' + arcView.position + ' / ' + arcView.total + '</span>'
        + '<div class="arc-nav-arrows">' + prev + next + '</div>'
        + '</div></div>';
    }

  };

  function renderArcRow(arcView) {
    var renderer = RENDERERS[arcView.renderMode];
    if (!renderer) {
      if (!_warnedModes[arcView.renderMode]) {
        _logger.warn({ code: 'UNKNOWN_RENDER_MODE', message: 'Unknown renderMode — falling back to dots', renderMode: arcView.renderMode, arcName: arcView.arcName });
        _warnedModes[arcView.renderMode] = true;
      }
      renderer = RENDERERS.dots;
    }
    return renderer(arcView);
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
      + '<div class="arc-nav-current"><span class="arc-nav-current-label">' + getString('common.label.you-are-here') + '</span>: ' + lattice.node.title + '</div>'
      + '</div>';
  }

  // ── Mount ─────────────────────────────────────────────────────────────────────

  function mountArcNav() {
    var slug    = detectSlug();
    var mountEl = document.getElementById('arcNavMount');
    if (!slug || !mountEl) return;

    // Load strings and index in parallel; render when both are ready.
    var stringsReady = false;
    var indexData    = null;

    function tryRender() {
      if (!stringsReady || !indexData) return;
      var lattice = buildArcNavData(slug, indexData);
      renderArcNav(lattice, mountEl);
    }

    loadStrings(function () { stringsReady = true; tryRender(); });
    loadIndex(function (index) { indexData = index; tryRender(); });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mountArcNav);
  } else {
    mountArcNav();
  }

}());

// [VXG RealForever]
