/**
 * VEXTREME — widgets/lang-fab.js
 *
 * Floating language-selector button. Reads supportedLangs from the pre-built
 * index.json (same CDN URL used by vextreme-index-v2.js). Shows only when
 * 2 or more languages are available. Opens an iOS-style scroll wheel of emoji
 * flags; picking a flag swaps all [data-i18n] elements on the page and persists
 * the choice to localStorage.
 *
 * Self-contained IIFE — no global exports, no framework dependencies.
 * Add as a <script> tag at the bottom of any page that uses arc nav.
 */

(function () {
  'use strict';

  var VERSION    = '1.0.0';
  var CDN_BASE   = 'https://cdn.jsdelivr.net/gh/vgong24/vextreme@main';
  var INDEX_URL  = CDN_BASE + '/data/index.json?v=' + VERSION;
  var LS_LANG    = 'vex-lang';
  var LS_DATA    = 'vex-index-v2-data';

  var _logger = (window.VEXTREME_LOGGER) || {
    warn:  function(e) { console.warn('[' + e.code + ']', e.message, e); },
    error: function(e) { console.error('[' + e.code + ']', e.message, e); },
  };

  // ── Lang → flag emoji map ────────────────────────────────────────────────────

  var LANG_FLAGS = {
    en: '🇺🇸',
    ja: '🇯🇵',
    es: '🇪🇸',
    fr: '🇫🇷',
    de: '🇩🇪',
    pt: '🇧🇷',
    zh: '🇨🇳',
    ko: '🇰🇷',
    ar: '🇸🇦',
    hi: '🇮🇳',
  };

  function flagFor(lang) {
    return LANG_FLAGS[lang] || '🏳';
  }

  // ── Index loading (reads cache first, same key as vextreme-index-v2.js) ──────

  function loadSupportedLangs(onReady) {
    try {
      var raw = localStorage.getItem(LS_DATA);
      if (raw) {
        var cached = JSON.parse(raw);
        if (cached.supportedLangs && cached.supportedLangs.length) {
          onReady(cached.supportedLangs);
          return;
        }
      }
    } catch (e) { /* storage unavailable */ }

    var req = new XMLHttpRequest();
    req.open('GET', INDEX_URL, true);
    req.onload = function () {
      if (req.status === 200) {
        try {
          var data = JSON.parse(req.responseText);
          onReady(data.supportedLangs || ['en']);
        } catch (e) {
          _logger.warn({ code: 'LANG_FAB_INDEX_PARSE_FAILED', message: 'Failed to parse index.json for lang list' });
          onReady(['en']);
        }
      } else {
        _logger.warn({ code: 'LANG_FAB_INDEX_HTTP_ERROR', message: 'index.json returned HTTP ' + req.status, status: req.status });
        onReady(['en']);
      }
    };
    req.onerror = function () {
      _logger.warn({ code: 'LANG_FAB_INDEX_FETCH_FAILED', message: 'Failed to fetch index.json for lang list' });
      onReady(['en']);
    };
    req.send();
  }

  // ── Strings loading ──────────────────────────────────────────────────────────
  //
  // Default: fetch the flat strings.{lang}.json bundle — every string in the
  // project, same as before this scope split existed. This is still the
  // correct default for a small page count and stays fully supported.
  //
  // Opt-in: a page that sets window.VEX_STRING_SCOPES = ['pages.my-slug'] (or
  // any list of scope names — see data/strings/compiled/scopes/index.json for
  // what exists) before this script loads gets only those scopes plus
  // 'common', fetched in parallel and merged client-side. This is the path a
  // large page count should move onto over time — see
  // docs/architecture/06-i18n.md, "Scaling past one bundle." Both paths ship
  // the same bundle shape ({ key: { text, aria-label } }), so applyLang()
  // below doesn't need to know which one was used.
  //
  // A page can also opt into a variant/staging bundle for one of its scopes
  // via window.VEX_STRING_VARIANT = 'b' (matches a source file's _meta.variant,
  // e.g. for an A/B copy test) — only scopes that actually have that variant
  // compiled fall back to the base scope bundle silently.

  var _langStrings = {};

  function fetchJSON(url, onDone) {
    var req = new XMLHttpRequest();
    req.open('GET', url, true);
    req.onload = function () {
      if (req.status === 200) {
        try { onDone(null, JSON.parse(req.responseText)); }
        catch (e) { onDone(e); }
      } else {
        onDone(new Error('HTTP ' + req.status));
      }
    };
    req.onerror = function () { onDone(new Error('network error')); };
    req.send();
  }

  function loadStringsForLang(lang, onReady) {
    var scopes = window.VEX_STRING_SCOPES;

    if (!scopes || !scopes.length) {
      // Legacy / default path — unchanged behavior.
      var url = CDN_BASE + '/data/strings/compiled/strings.' + lang + '.json?v=' + VERSION;
      fetchJSON(url, function (err, data) {
        if (err) {
          _logger.warn({ code: 'LANG_FAB_STRINGS_FETCH_FAILED', message: 'Failed to fetch strings for ' + lang, lang: lang, error: String(err) });
        } else {
          _langStrings = data;
        }
        onReady();
      });
      return;
    }

    // Scoped path — always include 'common', dedupe, fetch each scope bundle
    // (falling back to the base scope if a requested variant isn't compiled),
    // merge into one flat object so applyLang() sees no difference.
    var variant = window.VEX_STRING_VARIANT;
    var wanted = scopes.indexOf('common') === -1 ? ['common'].concat(scopes) : scopes.slice();
    var merged = {};
    var remaining = wanted.length;

    if (!remaining) { onReady(); return; }

    wanted.forEach(function (scope) {
      var name = variant ? scope + '.variant-' + variant : scope;
      var url  = CDN_BASE + '/data/strings/compiled/scopes/' + name + '.' + lang + '.json?v=' + VERSION;

      fetchJSON(url, function (err, data) {
        if (err && variant) {
          // Requested variant not compiled for this scope — fall back to base.
          var baseUrl = CDN_BASE + '/data/strings/compiled/scopes/' + scope + '.' + lang + '.json?v=' + VERSION;
          fetchJSON(baseUrl, function (baseErr, baseData) {
            if (!baseErr) Object.keys(baseData).forEach(function (k) { merged[k] = baseData[k]; });
            else _logger.warn({ code: 'LANG_FAB_STRINGS_HTTP_ERROR', message: 'scope bundle missing for ' + scope, lang: lang, scope: scope });
            if (--remaining === 0) { _langStrings = merged; onReady(); }
          });
          return;
        }
        if (err) {
          _logger.warn({ code: 'LANG_FAB_STRINGS_HTTP_ERROR', message: 'scope bundle missing for ' + scope, lang: lang, scope: scope });
        } else {
          Object.keys(data).forEach(function (k) { merged[k] = data[k]; });
        }
        if (--remaining === 0) { _langStrings = merged; onReady(); }
      });
    });
  }

  // ── i18n swap ────────────────────────────────────────────────────────────────

  function applyLang(lang) {
    loadStringsForLang(lang, function () {
      var els = document.querySelectorAll('[data-i18n]');
      for (var i = 0; i < els.length; i++) {
        var key   = els[i].getAttribute('data-i18n');
        var entry = _langStrings[key];
        if (entry && entry.text) {
          els[i].textContent = entry.text;
        }
      }
      try { localStorage.setItem(LS_LANG, lang); } catch (e) {}
    });
  }

  // ── FAB DOM + styles ─────────────────────────────────────────────────────────

  function injectStyles() {
    var css = [
      '#vex-lang-fab {',
      '  position: fixed;',
      '  top: 16px;',
      '  right: 16px;',
      '  z-index: 9999;',
      '  font-family: inherit;',
      '}',
      '#vex-lang-fab-btn {',
      '  width: 44px;',
      '  height: 44px;',
      '  border-radius: 50%;',
      '  border: none;',
      '  background: rgba(255,255,255,0.18);',
      '  backdrop-filter: blur(6px);',
      '  -webkit-backdrop-filter: blur(6px);',
      '  font-size: 24px;',
      '  cursor: pointer;',
      '  display: flex;',
      '  align-items: center;',
      '  justify-content: center;',
      '  box-shadow: 0 2px 8px rgba(0,0,0,0.12);',
      '  transition: background 0.2s;',
      '  line-height: 1;',
      '  padding: 0;',
      '}',
      '#vex-lang-fab-btn:hover { background: rgba(255,255,255,0.32); }',
      '#vex-lang-wheel {',
      '  position: absolute;',
      '  top: 52px;',
      '  right: 0;',
      '  width: 60px;',
      '  height: 160px;',
      '  overflow: hidden;',
      '  display: none;',
      '  border-radius: 12px;',
      '  background: rgba(255,255,255,0.15);',
      '  backdrop-filter: blur(10px);',
      '  -webkit-backdrop-filter: blur(10px);',
      '  box-shadow: 0 4px 24px rgba(0,0,0,0.18);',
      '}',
      '#vex-lang-wheel.open { display: block; }',
      '#vex-lang-wheel-mask {',
      '  position: absolute;',
      '  inset: 0;',
      '  pointer-events: none;',
      '  z-index: 2;',
      '  background: linear-gradient(',
      '    to bottom,',
      '    rgba(255,255,255,0.55) 0%,',
      '    transparent 30%,',
      '    transparent 70%,',
      '    rgba(255,255,255,0.55) 100%',
      '  );',
      '}',
      '#vex-lang-wheel-track {',
      '  position: absolute;',
      '  inset: 0;',
      '  overflow-y: scroll;',
      '  scroll-snap-type: y mandatory;',
      '  -webkit-overflow-scrolling: touch;',
      '  scrollbar-width: none;',
      '}',
      '#vex-lang-wheel-track::-webkit-scrollbar { display: none; }',
      '.vex-lang-item {',
      '  height: 52px;',
      '  display: flex;',
      '  align-items: center;',
      '  justify-content: center;',
      '  font-size: 28px;',
      '  scroll-snap-align: center;',
      '  cursor: pointer;',
      '  transition: opacity 0.15s;',
      '  line-height: 1;',
      '}',
      '.vex-lang-item:hover { opacity: 0.7; }',
      '.vex-lang-item:first-child { margin-top: 54px; }',
      '.vex-lang-item:last-child  { margin-bottom: 54px; }',
    ].join('\n');

    var style = document.createElement('style');
    style.textContent = css;
    document.head.appendChild(style);
  }

  function buildFAB(langs, currentLang) {
    var container = document.createElement('div');
    container.id = 'vex-lang-fab';

    var btn = document.createElement('button');
    btn.id = 'vex-lang-fab-btn';
    btn.setAttribute('aria-label', 'Select language');
    btn.textContent = flagFor(currentLang);

    var wheel = document.createElement('div');
    wheel.id = 'vex-lang-wheel';

    var mask = document.createElement('div');
    mask.id = 'vex-lang-wheel-mask';

    var track = document.createElement('div');
    track.id = 'vex-lang-wheel-track';

    for (var i = 0; i < langs.length; i++) {
      (function (lang) {
        var item = document.createElement('div');
        item.className = 'vex-lang-item';
        item.textContent = flagFor(lang);
        item.setAttribute('data-lang', lang);
        item.setAttribute('title', lang);
        item.addEventListener('click', function () {
          btn.textContent = flagFor(lang);
          wheel.classList.remove('open');
          if (lang !== currentLang) {
            currentLang = lang;
            applyLang(lang);
          }
        });
        track.appendChild(item);
      })(langs[i]);
    }

    wheel.appendChild(mask);
    wheel.appendChild(track);
    container.appendChild(btn);
    container.appendChild(wheel);

    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      wheel.classList.toggle('open');
    });

    document.addEventListener('click', function () {
      wheel.classList.remove('open');
    });

    return container;
  }

  // ── Mount ─────────────────────────────────────────────────────────────────────

  function mount() {
    loadSupportedLangs(function (langs) {
      if (!langs || langs.length < 2) return;

      var savedLang = 'en';
      try { savedLang = localStorage.getItem(LS_LANG) || 'en'; } catch (e) {}
      if (langs.indexOf(savedLang) < 0) savedLang = langs[0];

      injectStyles();
      var fab = buildFAB(langs, savedLang);
      document.body.appendChild(fab);

      // Apply persisted lang on load (skip if already English — avoids a
      // pointless fetch when no preference has been set)
      if (savedLang !== 'en') applyLang(savedLang);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount);
  } else {
    mount();
  }

}());

// [VXG RealForever]
