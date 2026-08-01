/**
 * VEXTREME — widgets/vex-institutional.js
 *
 * Runtime chrome for the institutional page surface (pages/vextreme-home.html,
 * pages/vex-support.html). Three small jobs, deliberately in one file because
 * they share the same "the page is already correct without me" contract:
 *
 *   1. Theme    — swaps <html data-theme> between "foundation" (dark, the
 *                 emotional home) and "foundation-light", persisting the
 *                 choice. Both values are real declared token families in
 *                 styles/design-system.css, so nothing here computes a color.
 *   2. Language — applies a compiled string bundle to every [data-i18n]
 *                 element, using the same key/bundle contract as
 *                 widgets/fab-lang.js.
 *   3. Routes   — upgrades a support route to a live action ONLY when
 *                 data/support-routes.json says it is genuinely ACTIVE and
 *                 supplies a real url.
 *
 * WHY THIS IS NOT widgets/fab-lang.js
 * -----------------------------------
 * The string contract is reused verbatim — same [data-i18n] attributes, same
 * data/strings/compiled/scopes/{category}/{scope}.{lang}.json bundles, same
 * "missing key leaves the element's authored English alone" fallback. What is
 * not reused is fab-lang's presentation and delivery: it mounts a fixed
 * translucent-white flag orb sized for the archive surface, and it resolves
 * every bundle against a hard-coded jsDelivr @main base. Neither fits here.
 * These pages are a standalone institutional surface Victor can host or hand
 * to someone as one file plus its assets, they are monochrome by design, and
 * they must render correctly from a local checkout and from GitHub Pages
 * before anything reaches a CDN. So this widget resolves bundles by relative
 * path first and falls back to the CDN, and it renders a native <select> —
 * the platform already gets keyboard and screen-reader behaviour right for
 * language choice, and a custom scroll wheel would be re-deriving that.
 *
 * The contract that actually matters — the keys and the compiled bundles — has
 * exactly one owner (data/strings/source/, lib/strings-compile.js). This file
 * is a second reader of it, not a second source of truth.
 *
 * NOTHING HERE IS LOAD-BEARING
 * ----------------------------
 * The page is complete, readable, and honest with JavaScript disabled:
 * English is authored directly into the markup, dark is the default theme
 * from the <html data-theme="foundation"> attribute, and every payment route
 * renders its real pending state as static markup. This widget can only ever
 * add a language, add a light mode, or open a route that a data file says is
 * genuinely open. It can never take the page's meaning away.
 *
 * Self-contained IIFE. No globals exported, no framework, no build step.
 */

(function () {
  'use strict';

  var CDN_BASE = 'https://cdn.jsdelivr.net/gh/vgong24/vextreme@main';
  var LS_LANG  = 'vex-lang';   // shared with widgets/fab-lang.js on purpose:
                               // a visitor's language choice should survive
                               // moving between the institutional pages and
                               // the archive, not reset at the boundary.
  var LS_THEME = 'vex-inst-theme';

  var LANG_DEFAULT  = 'en';
  var THEME_DARK    = 'foundation';
  var THEME_LIGHT   = 'foundation-light';
  var URL_LANG_PARAM = 'lang';

  var LANG_NAMES = {
    en: 'English',
    ja: '日本語',
    zh: '中文'
  };

  // Bundle path rule — mirrors scopeRelPath() in lib/vex-config.js and the
  // identical rule in widgets/fab-lang.js. If that rule changes, all three
  // must change together or every fetch 404s.
  function scopeRelPath(scope, category) {
    var cat  = (scope === 'common') ? 'system' : (category || 'production');
    var segs = scope.split('.');
    return [cat].concat(segs.slice(0, -1), segs[segs.length - 1]).join('/');
  }

  function config() {
    return {
      scopes:   window.VEX_STRING_SCOPES || [],
      category: window.VEX_STRING_CATEGORY || 'production',
      // Relative prefix from this page back to the repo root. Set by the page
      // itself because only the page knows how deep it sits.
      root:     window.VEX_INST_ROOT || '../'
    };
  }

  function fetchJSON(url) {
    return fetch(url, { credentials: 'omit' }).then(function (res) {
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return res.json();
    });
  }

  // Relative first, CDN second. A local checkout and a GitHub Pages deploy
  // both resolve the relative path; the CDN fallback only matters if these
  // files are ever embedded somewhere that isn't serving the repo.
  function fetchWithFallback(relPath) {
    var cfg = config();
    return fetchJSON(cfg.root + relPath).catch(function () {
      return fetchJSON(CDN_BASE + '/' + relPath);
    });
  }


  // ── 1. Theme ────────────────────────────────────────────────────────────────

  function storedTheme() {
    try {
      var v = localStorage.getItem(LS_THEME);
      return (v === THEME_LIGHT || v === THEME_DARK) ? v : null;
    } catch (e) { return null; }
  }

  function applyTheme(theme, btn) {
    document.documentElement.setAttribute('data-theme', theme);
    if (btn) btn.setAttribute('aria-pressed', theme === THEME_LIGHT ? 'true' : 'false');
    try { localStorage.setItem(LS_THEME, theme); } catch (e) {}
  }

  function initTheme() {
    var btn = document.querySelector('[data-vex-theme-toggle]');
    var initial = storedTheme();

    // No stored choice: dark is this surface's home mode, but a visitor who
    // has told their OS they prefer light has already expressed a preference
    // and should not have to state it twice.
    if (!initial) {
      var prefersLight = window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches;
      initial = prefersLight ? THEME_LIGHT : THEME_DARK;
    }
    applyTheme(initial, btn);

    if (!btn) return;
    btn.hidden = false;
    btn.addEventListener('click', function () {
      var next = document.documentElement.getAttribute('data-theme') === THEME_LIGHT ? THEME_DARK : THEME_LIGHT;
      applyTheme(next, btn);
    });
  }


  // ── 2. Language ─────────────────────────────────────────────────────────────

  function urlLang() {
    try { return new URLSearchParams(location.search).get(URL_LANG_PARAM); }
    catch (e) { return null; }
  }

  // Same rule as fab-lang.js: the default language is the absence of the
  // param, so a shared link for the common case stays clean and any other
  // language is explicit and reproducible for whoever receives the link.
  function syncUrlLang(lang) {
    try {
      var params = new URLSearchParams(location.search);
      if (lang === LANG_DEFAULT) params.delete(URL_LANG_PARAM);
      else params.set(URL_LANG_PARAM, lang);
      var search = params.toString();
      var next = location.pathname + (search ? '?' + search : '') + location.hash;
      if (next !== location.pathname + location.search + location.hash && history.replaceState) {
        history.replaceState(null, '', next);
      }
    } catch (e) {}
  }

  function loadBundles(lang) {
    var cfg    = config();
    var scopes = cfg.scopes.slice();
    if (scopes.indexOf('common') === -1) scopes.unshift('common');

    return Promise.all(scopes.map(function (scope) {
      var rel = 'data/strings/compiled/scopes/' + scopeRelPath(scope, cfg.category) + '.' + lang + '.json';
      // A missing bundle for one scope must not take the whole page down —
      // the untranslated elements simply keep their authored English.
      return fetchWithFallback(rel).catch(function () { return {}; });
    })).then(function (parts) {
      var merged = {};
      parts.forEach(function (part) {
        Object.keys(part).forEach(function (k) { merged[k] = part[k]; });
      });
      return merged;
    });
  }

  function applyStrings(strings) {
    var els = document.querySelectorAll('[data-i18n]');
    for (var i = 0; i < els.length; i++) {
      var entry = strings[els[i].getAttribute('data-i18n')];
      // A key with no entry in this language keeps whatever the markup
      // already says. That is the whole missing-translation fallback: the
      // reader sees English, never an empty element or a raw key.
      if (entry && entry.text) els[i].textContent = entry.text;
    }
    // aria-label falls back to the key's text when the entry has no dedicated
    // aria-label. A key that says the same thing in both places should only
    // have to say it once in the source registry.
    var labelled = document.querySelectorAll('[data-i18n-aria]');
    for (var j = 0; j < labelled.length; j++) {
      var a = strings[labelled[j].getAttribute('data-i18n-aria')];
      var label = a && (a['aria-label'] || a.text);
      if (label) labelled[j].setAttribute('aria-label', label);
    }

    // alt is its own attribute, not aria-label. Putting aria-label on an <img>
    // that already has alt gives a screen reader two competing names for the
    // same image; translating the alt is what was actually wanted.
    var described = document.querySelectorAll('[data-i18n-alt]');
    for (var k = 0; k < described.length; k++) {
      var d = strings[described[k].getAttribute('data-i18n-alt')];
      if (d && d.text) described[k].setAttribute('alt', d.text);
    }
  }

  function setLang(lang, select) {
    document.documentElement.setAttribute('lang', lang);
    if (select) select.value = lang;
    syncUrlLang(lang);
    try { localStorage.setItem(LS_LANG, lang); } catch (e) {}

    if (lang === LANG_DEFAULT) {
      // English is authored into the markup, so returning to it is a reload
      // of what is already there rather than a fetch. Re-applying the EN
      // bundle keeps a second switch (ja → en) correct without a round trip
      // through the network for content the page already shipped with.
      return loadBundles(LANG_DEFAULT).then(applyStrings).catch(function () {});
    }
    return loadBundles(lang).then(applyStrings).catch(function () {});
  }

  function initLang() {
    var select = document.querySelector('[data-vex-lang-select]');
    if (!select) return;

    var available = Array.prototype.map.call(select.options, function (o) { return o.value; });

    var lang = urlLang();
    if (!lang || available.indexOf(lang) === -1) {
      try { lang = localStorage.getItem(LS_LANG); } catch (e) { lang = null; }
    }
    if (!lang || available.indexOf(lang) === -1) lang = LANG_DEFAULT;

    select.hidden = false;
    var label = document.querySelector('[data-vex-lang-label]');
    if (label) label.hidden = false;

    select.addEventListener('change', function () { setLang(select.value, select); });

    // Only do work on load if the effective language is not what the markup
    // already says. Landing on the English page in English costs no fetch.
    if (lang !== LANG_DEFAULT) setLang(lang, select);
    else select.value = LANG_DEFAULT;

    // Language names are endonyms and are not themselves translated — a
    // reader looking for their own language looks for it written the way
    // they write it, not the way the current page's language spells it.
    Array.prototype.forEach.call(select.options, function (o) {
      if (LANG_NAMES[o.value]) o.textContent = LANG_NAMES[o.value];
    });
  }


  // ── 3. Support routes ───────────────────────────────────────────────────────

  // A route is upgraded to a live action only when the data file says ACTIVE
  // and hands over a real url string. Every other state — including a route
  // that names a candidateUrl it has not verified — leaves the static pending
  // markup exactly as authored. There is deliberately no branch here that can
  // construct a destination; the url is used or it is not.
  function initRoutes() {
    var blocks = document.querySelectorAll('[data-vex-route]');
    if (!blocks.length) return;

    fetchWithFallback('data/support-routes.json').then(function (cfg) {
      var byId = {};
      (cfg.routes || []).forEach(function (r) { byId[r.routeId] = r; });

      Array.prototype.forEach.call(blocks, function (block) {
        var route = byId[block.getAttribute('data-vex-route')];
        if (!route || route.status !== 'ACTIVE') return;
        if (typeof route.url !== 'string' || !route.url) return;

        var action = block.querySelector('[data-vex-route-action]');
        if (!action) return;

        var live = document.createElement('a');
        live.className = 'vex-btn';
        live.href = route.url;
        live.rel = 'noopener';
        live.textContent = action.getAttribute('data-vex-route-active-label') || action.textContent;
        action.replaceWith(live);

        var pending = block.querySelector('[data-vex-route-pending]');
        if (pending) pending.hidden = true;
      });
    }).catch(function () {
      // Route config unreachable — the authored pending state is already
      // correct and already on screen. Nothing to do, nothing to report to
      // the visitor.
    });
  }


  // ── Mount ───────────────────────────────────────────────────────────────────

  function mount() {
    initTheme();
    initLang();
    initRoutes();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount);
  } else {
    mount();
  }
}());

// [VXG RealForever]
