/* VEXTREME God Script — specimen-partial-translation
 * Assembled by lib/build-vextreme.js
 * DO NOT EDIT — regenerate with: node lib/build-vextreme.js
 */

(function () {
  'use strict';

  /* Per-page viewmodel — baked in at build time */
  window.VEX_VIEWMODEL          = {"category":"demo","template":"specimen-page","scopes":["pages.specimen-partial-translation","specimens"],"features":["lang","demo","spiral-fab"]};

  /* EN strings — inlined at build time, no fetch on default language */
  window.VEX_STRINGS_EN         = {"common.nav.prev":{"text":"← prev","aria-label":"Previous page"},"common.nav.next":{"text":"next →","aria-label":"Next page"},"common.label.you-are-here":{"text":"You Are Here"},"common.nav.archives":{"text":"Archives","aria-label":"View full archive"},"common.nav.primary-site":{"text":"vextreme24.com","aria-label":"Go to primary site"},"common.nav.github":{"text":"GitHub","aria-label":"View source on GitHub"},"common.nav.full-archive":{"text":"Full archive →","aria-label":"View full archive"},"common.button.copy-filename":{"text":"Copy filename","aria-label":"Copy filename to clipboard"},"common.button.copied":{"text":"Copied!","aria-label":"Filename copied to clipboard"},"common.label.site-title":{"text":"Vextreme"},"common.label.page-live":{"text":"Page live"},"common.label.not-yet-ported":{"text":"Not yet ported"},"common.label.slug":{"text":"Slug"},"common.status.pages-live":{"text":"{ported, plural, one {# of {total} page live} other {# of {total} pages live}}"},"common.status.remaining":{"text":"{count, plural, one {# remaining} other {# remaining}}"},"common.status.built-on":{"text":"Built {date}"},"pages.specimen-partial-translation.heading.title":{"text":"Partial Translation"},"pages.specimen-partial-translation.intro":{"text":"One string below has no Japanese translation, on purpose. Switch languages with the orb, top right, and watch what happens to it."},"pages.specimen-partial-translation.body.translated":{"text":"This sentence has a Japanese translation, so it swaps cleanly when you switch languages."},"pages.specimen-partial-translation.body.untranslated":{"text":"This sentence does not have a Japanese translation — switching languages will show this exact English text, or the raw key, depending on whether the missing-key fallback has shipped yet."},"pages.specimen-partial-translation.process.heading":{"text":"How this gap gets caught before it ships"},"pages.specimen-partial-translation.process.step1.label":{"text":"Local server + CDN interception"},"pages.specimen-partial-translation.process.step1.detail":{"text":"scripts/screenshot-page.js starts a local HTTP server and routes CDN requests to local files, so the screenshot tests the branch's code, never whatever is already live on main."},"pages.specimen-partial-translation.process.step2.label":{"text":"EN screenshot"},"pages.specimen-partial-translation.process.step2.detail":{"text":"The page loads in its default language and Playwright captures a full-page screenshot as the baseline."},"pages.specimen-partial-translation.process.step3.label":{"text":"FAB click + language switch"},"pages.specimen-partial-translation.process.step3.detail":{"text":"Playwright clicks the lang-fab orb, selects Japanese, and waits for the strings fetch and the [data-i18n] swap to complete."},"pages.specimen-partial-translation.process.step4.label":{"text":"JA screenshot, read by a human"},"pages.specimen-partial-translation.process.step4.detail":{"text":"A second screenshot is taken and someone actually looks at it. This is how a real bug got caught in this project: a live-fetched timestamp was getting silently overwritten by a translated placeholder on every language switch — invisible in the diff, invisible to the test suite, visible in under a second here."},"specimens.heading.title":{"text":"Specimens"},"specimens.heading.subtitle":{"text":"Three small, fixed pages — not real content — each isolating one localization state and the pipeline stage that produces or catches it. This sits between the architecture pitch and the real progress tracker: smaller than either, meant to be read in a minute."},"specimens.card.full.label":{"text":"Full translation"},"specimens.card.partial.label":{"text":"Partial translation"},"specimens.card.stale.label":{"text":"The smallest miss"},"specimens.card.full.description":{"text":"Every string translated. Shows what the test suite verifies at each pipeline stage — not just that it passed."},"specimens.card.partial.description":{"text":"One string deliberately left untranslated — the same gap claude-answers-the-doubt has for real. Shows the screenshot-verification process that would catch it."},"specimens.card.stale.description":{"text":"One line of English, changed after its Japanese translation was written — flagged stale automatically. Shows the integrity check that caught it."},"specimens.link.view":{"text":"View specimen →","aria-label":"View this specimen page"},"specimens.link.back":{"text":"← Back to specimens","aria-label":"Back to the specimens dashboard"},"specimens.link.demo":{"text":"← Back to the architecture demo","aria-label":"Back to the architecture demo page"},"specimens.link.archives":{"text":"See real, in-progress translation coverage on the archive dashboard →","aria-label":"View the archive dashboard for real translation progress"}};

  /* Scope + category globals for fab-lang compatibility */
  window.VEX_STRING_SCOPES    = ["pages.specimen-partial-translation","specimens"];
  window.VEX_STRING_CATEGORY  = "demo";


/* === feature: lang (fab-lang.js) === */
/**
 * VEXTREME — widgets/fab-lang.js
 *
 * Floating language-selector button. Reads supportedLangs from the pre-built
 * index.json (same CDN URL used by vextreme-index-v2.js). Shows only when
 * 2 or more languages are available. Opens an iOS-style scroll wheel of emoji
 * flags; picking a flag swaps all [data-i18n] elements on the page and persists
 * the choice to localStorage.
 *
 * God Script optimization: if window.VEX_STRINGS_EN is set (inlined at build
 * time by lib/build-vextreme.js), EN strings are used directly without a fetch.
 * JA and other languages are still fetched lazily on first switch.
 *
 * Self-contained IIFE — no global exports, no framework dependencies.
 * Works standalone as a <script> tag or bundled inside a God Script.
 */

(function () {
  'use strict';

  var VERSION    = '1.1.0';
  var CDN_BASE   = 'https://cdn.jsdelivr.net/gh/vgong24/vextreme@main';
  var INDEX_URL  = CDN_BASE + '/data/index.json?v=' + VERSION;
  var LS_LANG    = 'vex-lang';
  var LS_DATA    = 'vex-index-v2-data';

  // ── Config constants (mirrors lib/vex-config.js) ─────────────────────────────
  var CATEGORY_SYSTEM     = 'system';
  var CATEGORY_PRODUCTION = 'production';
  var SCOPE_COMMON        = 'common';
  var LANG_DEFAULT        = 'en';

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
          onReady(data.supportedLangs || [LANG_DEFAULT]);
        } catch (e) {
          _logger.warn({ code: 'LANG_FAB_INDEX_PARSE_FAILED', message: 'Failed to parse index.json for lang list' });
          onReady([LANG_DEFAULT]);
        }
      } else {
        _logger.warn({ code: 'LANG_FAB_INDEX_HTTP_ERROR', message: 'index.json returned HTTP ' + req.status, status: req.status });
        onReady([LANG_DEFAULT]);
      }
    };
    req.onerror = function () {
      _logger.warn({ code: 'LANG_FAB_INDEX_FETCH_FAILED', message: 'Failed to fetch index.json for lang list' });
      onReady([LANG_DEFAULT]);
    };
    req.send();
  }

  // ── Strings loading ──────────────────────────────────────────────────────────
  //
  // When window.VEX_STRINGS_EN is set (God Script build-time inline), EN strings
  // are used directly — zero fetch for the default language. JA and other
  // languages are fetched lazily on first switch, same as before.
  //
  // When VEX_STRINGS_EN is absent (standalone <script> tag usage), all languages
  // fetch from CDN. Behavior is identical to pre-God-Script lang-fab.js.

  var _langStrings = {};

  function scopeUrl(scope, lang, category, variant) {
    var cat      = (scope === SCOPE_COMMON) ? CATEGORY_SYSTEM : (category || CATEGORY_PRODUCTION);
    var segments = scope.split('.');
    var dirParts = [cat].concat(segments.slice(0, -1));
    var baseName = segments[segments.length - 1] + (variant ? '.variant-' + variant : '');
    return CDN_BASE + '/data/strings/compiled/scopes/' + dirParts.join('/') + '/' + baseName + '.' + lang + '.json?v=' + VERSION;
  }

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
    // God Script optimization: EN strings inlined at build time — no fetch needed.
    if (lang === LANG_DEFAULT && window.VEX_STRINGS_EN) {
      _langStrings = window.VEX_STRINGS_EN;
      onReady();
      return;
    }

    var scopes = window.VEX_STRING_SCOPES;

    if (!scopes || !scopes.length) {
      // Legacy / default path — flat bundle fetch.
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

    // Scoped path — always include 'common', dedupe, fetch in parallel.
    var variant  = window.VEX_STRING_VARIANT;
    var category = window.VEX_STRING_CATEGORY || CATEGORY_PRODUCTION;
    var wanted   = scopes.indexOf(SCOPE_COMMON) === -1 ? [SCOPE_COMMON].concat(scopes) : scopes.slice();
    var merged   = {};
    var remaining = wanted.length;

    if (!remaining) { onReady(); return; }

    wanted.forEach(function (scope) {
      var url = scopeUrl(scope, lang, category, variant);

      fetchJSON(url, function (err, data) {
        if (err && variant) {
          var baseUrl = scopeUrl(scope, lang, category);
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

      var savedLang = LANG_DEFAULT;
      try { savedLang = localStorage.getItem(LS_LANG) || LANG_DEFAULT; } catch (e) {}
      if (langs.indexOf(savedLang) < 0) savedLang = langs[0];

      injectStyles();
      var fab = buildFAB(langs, savedLang);
      document.body.appendChild(fab);

      // Apply persisted lang on load (skip if already English — avoids a
      // pointless fetch when no preference has been set)
      if (savedLang !== LANG_DEFAULT) applyLang(savedLang);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount);
  } else {
    mount();
  }

}());

// [VXG RealForever]


/* === feature: demo (fab-demo.js) === */
/**
 * VEXTREME — widgets/fab-demo.js
 *
 * Floating orb linking to the architecture demo page (pages/vextreme-demo.html).
 * Sits next to widgets/fab-lang.js (44px, translucent, top-right) but offset
 * left of it so both can mount on the same page without overlapping.
 *
 * Self-contained IIFE — no global exports, no framework dependencies.
 * Works standalone as a <script> tag or bundled inside a God Script.
 */

(function () {
  'use strict';

  var DEMO_URL = 'https://vgong24.github.io/Vextreme/pages/vextreme-demo.html';

  function injectStyles() {
    var css = [
      '#vex-demo-fab {',
      '  position: fixed;',
      '  top: 16px;',
      '  right: 68px;',
      '  z-index: 9999;',
      '}',
      '#vex-demo-fab-btn {',
      '  width: 44px;',
      '  height: 44px;',
      '  border-radius: 50%;',
      '  border: none;',
      '  background: rgba(255,255,255,0.18);',
      '  backdrop-filter: blur(6px);',
      '  -webkit-backdrop-filter: blur(6px);',
      '  font-size: 20px;',
      '  cursor: pointer;',
      '  display: flex;',
      '  align-items: center;',
      '  justify-content: center;',
      '  box-shadow: 0 2px 8px rgba(0,0,0,0.12);',
      '  transition: background 0.2s;',
      '  line-height: 1;',
      '  padding: 0;',
      '  text-decoration: none;',
      '  color: inherit;',
      '}',
      '#vex-demo-fab-btn:hover { background: rgba(255,255,255,0.32); }',
    ].join('\n');

    var style = document.createElement('style');
    style.textContent = css;
    document.head.appendChild(style);
  }

  function mount() {
    injectStyles();

    var container = document.createElement('div');
    container.id = 'vex-demo-fab';

    var btn = document.createElement('a');
    btn.id = 'vex-demo-fab-btn';
    btn.href = DEMO_URL;
    btn.setAttribute('aria-label', 'How this is built — architecture demo');
    btn.setAttribute('title', 'How this is built');
    btn.textContent = '◉';

    container.appendChild(btn);
    document.body.appendChild(container);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount);
  } else {
    mount();
  }

}());

// [VXG RealForever]


}());