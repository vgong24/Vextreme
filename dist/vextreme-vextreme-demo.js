/* VEXTREME God Script — vextreme-demo
 * Assembled by lib/build-vextreme.js
 * DO NOT EDIT — regenerate with: node lib/build-vextreme.js
 */

(function () {
  'use strict';

  /* Per-page viewmodel — baked in at build time */
  window.VEX_VIEWMODEL          = {"title":"Vextreme Demo","category":"demo","template":"page","scopes":["demo"],"features":["lang","demo","spiral-fab"]};

  /* EN strings — inlined at build time, no fetch on default language */
  window.VEX_STRINGS_EN         = {"common.nav.prev":{"text":"← prev","aria-label":"Previous page"},"common.nav.next":{"text":"next →","aria-label":"Next page"},"common.label.you-are-here":{"text":"You Are Here"},"common.nav.archives":{"text":"Archives","aria-label":"View full archive"},"common.nav.primary-site":{"text":"vextreme24.com","aria-label":"Go to primary site"},"common.nav.github":{"text":"GitHub","aria-label":"View source on GitHub"},"common.nav.full-archive":{"text":"Full archive →","aria-label":"View full archive"},"common.button.copy-filename":{"text":"Copy filename","aria-label":"Copy filename to clipboard"},"common.button.copied":{"text":"Copied!","aria-label":"Filename copied to clipboard"},"common.label.site-title":{"text":"Vextreme"},"common.label.page-live":{"text":"Page live"},"common.label.not-yet-ported":{"text":"Not yet ported"},"common.label.slug":{"text":"Slug"},"common.status.pages-live":{"text":"{ported, plural, one {# of {total} page live} other {# of {total} pages live}}"},"common.status.remaining":{"text":"{count, plural, one {# remaining} other {# remaining}}"},"common.status.built-on":{"text":"Built {date}"},"demo.heading.title":{"text":"How Vextreme Is Built"},"demo.heading.subtitle":{"text":"A live demonstration of the architecture, tests, and process behind this system — not a description of it."},"demo.section.why.heading":{"text":"Why this exists"},"demo.section.why.body":{"text":"This page exists for organizations evaluating whether their content, data, or process infrastructure can scale past its current size without a rebuild. Vextreme started as a single-page loader and grew into 88 content nodes across 16 arcs, two languages, and two deployment surfaces — without ever changing its core data model. That is the property worth demonstrating: a baseline standard that holds as scope grows, not a finished product."},"demo.section.comparison.heading":{"text":"Why this approach"},"demo.comparison.label.this-approach":{"text":"Vextreme"},"demo.comparison.label.conventional":{"text":"Conventional"},"demo.comparison.cqrs.approach":{"text":"Write side (source files) and read side (generated artifacts) are separate. Never edit a generated file."},"demo.comparison.cqrs.alternative":{"text":"Conventional alternative: hand-edit the deployed HTML/JSON directly. Works until two people edit the same generated file and the source of truth becomes ambiguous."},"demo.comparison.slug.approach":{"text":"Every piece of content is identified by a slug, not a file path or URL. Arc membership, ordering, and translation all reference the slug."},"demo.comparison.slug.alternative":{"text":"Conventional alternative: reference content by URL or folder location. Works until a reorganization breaks every link that pointed at the old path."},"demo.comparison.i18n.approach":{"text":"No display string is hardcoded anywhere in the codebase. Every string is a keyed entry in a source file, compiled into per-language bundles."},"demo.comparison.i18n.alternative":{"text":"Conventional alternative: strings written inline in templates or JS. Works until a second language is needed and every file has to be hunted through by hand."},"demo.comparison.continuity.approach":{"text":"Every working session is logged — what changed, what was assumed, what's still open — so the next contributor (human or AI) starts informed instead of re-deriving decisions."},"demo.comparison.continuity.alternative":{"text":"Conventional alternative: tribal knowledge held by whoever built it. Works until that person is unavailable and the reasoning behind a decision is gone."},"demo.section.live.heading":{"text":"Live architecture snapshot"},"demo.section.live.body":{"text":"The numbers below are not written into this page. They are fetched from data/index.json at page load, the same generated artifact every page on this site reads from."},"demo.live.label.nodes":{"text":"content nodes"},"demo.live.label.arcs":{"text":"arcs"},"demo.live.label.langs":{"text":"supported languages"},"demo.live.label.built-at":{"text":"index.json last built"},"demo.live.status.loading":{"text":"Fetching live data…"},"demo.live.status.failed":{"text":"Live fetch failed — showing build-time values instead."},"demo.section.tests.heading":{"text":"Test coverage"},"demo.section.tests.body":{"text":"39 tests across 4 files, one per pipeline stage, run in CI on every pull request: content pipeline (index build correctness), strings pipeline (compile + manifest integrity), browser navigation (arc position and adjacency logic), and build output (generated HTML structure). A change that breaks any stage fails before it reaches main."},"demo.section.specimens.heading":{"text":"Or see it in a minute, not a pitch"},"demo.section.specimens.body":{"text":"Everything above is a description of the system with live numbers attached. If you'd rather see it directly, three small fixed pages each isolate one localization state — fully translated, partially translated, and one line staled on purpose — paired with the exact pipeline stage that produces or catches that state."},"demo.link.specimens":{"text":"View the specimens →","aria-label":"View the three specimen pages"},"demo.section.gaps.heading":{"text":"Why the gaps are visible"},"demo.section.gaps.body":{"text":"The archive dashboard linked below intentionally shows unported and untranslated pages as visible gaps rather than hiding them. That is not an oversight — it is the comparison point. What you see there is the system mid-build, next to the completed state already live in production. The distance between the two is the actual, unedited progress of a scaling content system."},"demo.link.archives":{"text":"View the archive dashboard →","aria-label":"View the archive dashboard, including in-progress pages"},"demo.link.production":{"text":"View the completed state in production →","aria-label":"View the completed state on vextreme24.com"}};

  /* Scope + category globals for fab-lang compatibility */
  window.VEX_STRING_SCOPES    = ["demo"];
  window.VEX_STRING_CATEGORY  = "demo";
  window.VEX_SUPPORTED_LANGS  = ["en","ja","zh"];






/* === core: sw-register.js === */
/**
 * VEXTREME — widgets/sw-register.js
 *
 * Service Worker registration. Add ONE script tag to each page that should
 * participate in SW caching (typically all pages on GitHub Pages):
 *
 *   <script src="https://cdn.jsdelivr.net/gh/vgong24/vextreme@main/widgets/sw-register.js"></script>
 *
 * This script is intentionally tiny — registration only, no logic.
 * The SW itself (sw.js at repo root) handles all caching behaviour.
 *
 * The SW must be served from the same origin as the pages it controls.
 * On GitHub Pages: https://vgong24.github.io/Vextreme/sw.js
 *
 * LATTICE:BEGIN — generated by lib/build-lattice-headers.js from docs/lattice-map.json. Do not hand-edit; edit the JSON and regenerate.
 *   role      : Service Worker registration — activates offline caching on first page load
 *   reads     : navigator.serviceWorker API
 *   writes    : Service Worker registration in browser
 *   loaded-by : lib/build-vextreme.js (inlined as core module in every God Script, default: true)
 *   tested-by : tests/09-build-sw.test.js (tests sw.js generation, not this file directly)
 *
 *   CHANGE MAP — if you touch X here, also check:
 *     SW registration scope or path:
 *       - sw.js (must exist at the registered path)
 *       - lib/build-sw.js (generates sw.js)
 * LATTICE:END
 */

(function () {
  'use strict';

  if (!('serviceWorker' in navigator)) return;

  var SW_URL = '/Vextreme/sw.js';

  window.addEventListener('load', function () {
    navigator.serviceWorker.register(SW_URL, { scope: '/Vextreme/' })
      .then(function (reg) {
        // Registration succeeded — SW is installed or updating
        if (reg.waiting) {
          // A new SW is waiting to activate; skip waiting to update immediately.
          reg.waiting.postMessage({ type: 'SKIP_WAITING' });
        }
      })
      .catch(function (err) {
        // Registration failed — site still works, just without SW caching
        console.warn('[vextreme SW] Registration failed:', err);
      });
  });

}());

// [VXG RealForever]


/* === feature: spiral-fab (vex-fab.js) === */
/**
 * VEXTREME — widgets/vex-fab.js
 *
 * Spiral FAB — the single expandable trigger that replaces one-off,
 * separately-positioned orb widgets. Renders a trigger button (🌀) that
 * toggles a shared group container (#vex-spiral-group); other feature
 * widgets (fab-theme.js, fab-map.js, fab-lang.js) each mount their own orb
 * INTO that container on their own DOMContentLoaded handler, rather than
 * creating their own top-level fixed-position FAB. This is the "pattern for
 * expansion" Session 025 asked for: a new orb is a new small widget that
 * looks for #vex-spiral-group and appends into it if present — this file
 * does not need to change when an orb is added or removed.
 *
 * Deliberately NOT a generic "action vs expandable" component framework —
 * each orb widget still owns its own DOM/behavior/styles. This file's only
 * job is the trigger + group container + open/close state. See each orb
 * widget's own docstring for its mount-into-group contract.
 *
 * Self-contained IIFE — no global exports, no framework dependencies.
 * Works standalone as a <script> tag or bundled inside a God Script.
 * Must be the FIRST fab-group feature listed in lib/build-vextreme.js's
 * FEATURES registry — see the comment there for why registration order
 * matters (DOMContentLoaded handlers fire in the order they're added).
 *
 * LATTICE:BEGIN — generated by lib/build-lattice-headers.js from docs/lattice-map.json. Do not hand-edit; edit the JSON and regenerate.
 *   role      : spiral FAB — trigger button + shared expandable group container that other orb widgets mount into
 *   reads     : (none)
 *   writes    : DOM: #vex-spiral-fab / #vex-spiral-trigger / #vex-spiral-group (consumed by fab-lang.js, fab-theme.js, fab-map.js)
 *   loaded-by : lib/build-vextreme.js (inlined as spiral-fab feature in God Scripts, must be first among the FAB-group features)
 *               tests/08-build-vextreme.test.js
 *   tested-by : tests/08-build-vextreme.test.js
 *
 *   CHANGE MAP — if you touch X here, also check:
 *     #vex-spiral-group DOM id/contract changed:
 *       - widgets/fab-lang.js (getElementById('vex-spiral-group') lookup)
 *       - widgets/fab-theme.js (getElementById('vex-spiral-group') lookup)
 *       - widgets/fab-map.js (getElementById('vex-spiral-group') lookup)
 *       - tests/08 (FAB SYSTEM: nesting assertions)
 * LATTICE:END
 */

(function () {
  'use strict';

  var LS_OPEN = 'vex-spiral-open'; // not persisted across page loads on purpose — every page starts closed

  function injectStyles() {
    var css = [
      '#vex-spiral-fab {',
      '  position: fixed;',
      '  top: 16px;',
      '  right: 16px;',
      '  z-index: 9998;', // one below any orb's own popup (e.g. the lang wheel) so it never occludes them
      '  display: flex;',
      '  align-items: flex-start;',
      '  gap: 8px;',
      '  font-family: inherit;',
      '}',
      '#vex-spiral-trigger {',
      '  width: 44px;',
      '  height: 44px;',
      '  border-radius: 50%;',
      '  border: none;',
      '  flex: 0 0 auto;',
      '  background: rgba(255,255,255,0.18);',
      '  backdrop-filter: blur(6px);',
      '  -webkit-backdrop-filter: blur(6px);',
      '  font-size: 20px;',
      '  cursor: pointer;',
      '  display: flex;',
      '  align-items: center;',
      '  justify-content: center;',
      '  box-shadow: 0 2px 8px rgba(0,0,0,0.12);',
      '  transition: background 0.2s, transform 0.2s;',
      '  line-height: 1;',
      '  padding: 0;',
      '}',
      '#vex-spiral-trigger:hover { background: rgba(255,255,255,0.32); }',
      '#vex-spiral-trigger.open { transform: rotate(90deg); }',
      '#vex-spiral-group {',
      '  display: none;',
      '  align-items: center;',
      '  gap: 8px;',
      '  flex-wrap: wrap;',
      '  max-width: 220px;',
      '}',
      '#vex-spiral-group.open { display: flex; }',
    ].join('\n');

    var style = document.createElement('style');
    style.textContent = css;
    document.head.appendChild(style);
  }

  function mount() {
    injectStyles();

    var container = document.createElement('div');
    container.id = 'vex-spiral-fab';

    var trigger = document.createElement('button');
    trigger.id = 'vex-spiral-trigger';
    trigger.setAttribute('aria-label', 'Open menu');
    trigger.setAttribute('aria-expanded', 'false');
    trigger.textContent = '🌀';

    var group = document.createElement('div');
    group.id = 'vex-spiral-group';

    trigger.addEventListener('click', function (e) {
      e.stopPropagation();
      var open = group.classList.toggle('open');
      trigger.classList.toggle('open', open);
      trigger.setAttribute('aria-expanded', String(open));
    });

    // Click anywhere outside the group (and not on the trigger) closes it —
    // same convention widgets/fab-lang.js's own wheel already uses.
    document.addEventListener('click', function (e) {
      if (!group.classList.contains('open')) return;
      if (group.contains(e.target) || trigger.contains(e.target)) return;
      group.classList.remove('open');
      trigger.classList.remove('open');
      trigger.setAttribute('aria-expanded', 'false');
    });

    container.appendChild(trigger);
    container.appendChild(group);
    document.body.appendChild(container);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount);
  } else {
    mount();
  }

}());

// [VXG RealForever]


/* === feature: lang (fab-lang.js) === */
/**
 * VEXTREME — widgets/fab-lang.js
 *
 * Floating language-selector button. Determines the language list to offer
 * from, in order: window.VEX_SUPPORTED_LANGS (baked in at build time by
 * lib/build-vextreme.js — the ground truth for what THIS page's God Script
 * actually has), then a cached index.json blob in localStorage, then a live
 * fetch of index.json. Shows only when 2 or more languages are available.
 * Opens an iOS-style scroll wheel of emoji flags; picking a flag swaps all
 * [data-i18n] elements on the page and persists the choice to localStorage.
 *
 * God Script optimization: if window.VEX_STRINGS_EN is set (inlined at build
 * time by lib/build-vextreme.js), EN strings are used directly without a fetch.
 * JA and other languages are still fetched lazily on first switch.
 *
 * Self-contained IIFE — no global exports, no framework dependencies.
 * Works standalone as a <script> tag or bundled inside a God Script.
 *
 * Session 025 FAB unification: mounts its orb into #vex-spiral-group if
 * present (widgets/vex-fab.js's shared expandable group — real-estate
 * preference is nested, not a separate always-visible sibling FAB), else
 * falls back to the original standalone top-level fixed-position mount.
 * The wheel popup itself is unchanged either way.
 *
 * LATTICE:BEGIN — generated by lib/build-lattice-headers.js from docs/lattice-map.json. Do not hand-edit; edit the JSON and regenerate.
 *   role      : browser language switcher FAB — fetches JA/ZH scope or arc bundles, applies [data-i18n] swaps
 *   reads     : window.VEX_STRING_SCOPES
 *               window.VEX_STRING_CATEGORY
 *               window.VEX_SUPPORTED_LANGS
 *               window.VEX_STRING_ARC_BUNDLE (arc-chunked bundling pilot, checked before the scope path)
 *               data/strings/compiled/scopes/{category}/{scope}.{lang}.json via CDN
 *               data/strings/compiled/arcs/{arc}.{lang}.json via CDN (when VEX_STRING_ARC_BUNDLE is set)
 *               localStorage (LS_LANG — the selected language preference only, not fetched string content)
 *               DOM: #vex-spiral-group (widgets/vex-fab.js — Session 025 FAB unification, nests its orb there if present)
 *   writes    : innerHTML / textContent of [data-i18n] elements
 *               localStorage (LS_LANG — selected language preference)
 *   loaded-by : lib/build-vextreme.js (inlined as lang feature in God Scripts)
 *               legacy pages via direct CDN script tag (pre-God-Script pattern)
 *   tested-by : tests/08-build-vextreme.test.js (structural guard: loadSupportedLangs() must read window.VEX_SUPPORTED_LANGS)
 *
 *   CHANGE MAP — if you touch X here, also check:
 *     arc-chunked bundling pilot (VEX_STRING_ARC_BUNDLE, od-001/td-006):
 *       - lib/build-arc-bundles.js (writes the bundle this fetches)
 *       - lib/build-vextreme.js (emits the global this reads)
 *       - lib/build-sw.js (precaches the arc bundle URLs for opted-in arcs)
 *     scope bundle URL construction:
 *       - lib/strings-compile.js (must write to same path)
 *       - lib/vex-config.js scopeRelPath() (canonical rule)
 *     localStorage key format:
 *       - widgets/sw-register.js (Service Worker pre-caches these URLs)
 *       - any future offline FAB that reads cache state (pe-008)
 *     VEX_* global names read:
 *       - lib/build-vextreme.js assembleGodScript() (must emit matching global names)
 * LATTICE:END
 */

(function () {
  'use strict';

  // Auto-incremented by lib/bump-fab-version.js on every push to main (see
  // .github/workflows/build-index.yml) — do not hand-edit. It cache-busts
  // both this file's script-tag CDN URL indirectly (a version bump means a
  // new commit lands, which is the actual trigger a human/CI would purge
  // on) and, directly, the internal index.json fetch below. Session 025:
  // this constant had never been bumped since introduction, which is most
  // of why a real fix here silently didn't reach CDN-script-tag pages —
  // see docs/lattice-map.json's context note on this file for the story.
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

  // ── Index loading (God Script global first, then cache, then network) ────────
  //
  // God Script optimization: lib/build-vextreme.js bakes window.VEX_SUPPORTED_LANGS
  // in at build time (same pattern as window.VEX_STRINGS_EN) — the exact list this
  // page's God Script was actually assembled with. Checking it first means the FAB
  // never depends on a same-origin localStorage blob written by a DIFFERENT widget
  // (vextreme-index-v2.js) or a live index.json fetch that could be stale or slow —
  // both of which can silently omit a language this page genuinely has (e.g. a
  // browser that cached vex-index-v2-data before a language was added never sees
  // it added until that cache key happens to be overwritten by something else).

  function loadSupportedLangs(onReady) {
    if (window.VEX_SUPPORTED_LANGS && window.VEX_SUPPORTED_LANGS.length) {
      onReady(window.VEX_SUPPORTED_LANGS);
      return;
    }

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

    // Arc-chunked bundling pilot (od-001/td-006): one merged fetch per language
    // instead of an N-way scope fan-out. Checked before the scope path so an
    // opted-in arc never touches the per-scope fetch at all. Pages that don't
    // set this global are completely unaffected — see docs/architecture/06-i18n.md.
    var arcBundle = window.VEX_STRING_ARC_BUNDLE;
    if (arcBundle) {
      var arcUrl = CDN_BASE + '/data/strings/compiled/arcs/' + arcBundle + '.' + lang + '.json?v=' + VERSION;
      fetchJSON(arcUrl, function (err, data) {
        if (err) {
          _logger.warn({ code: 'LANG_FAB_ARC_BUNDLE_FETCH_FAILED', message: 'Failed to fetch arc bundle for ' + lang, arc: arcBundle, lang: lang, error: String(err) });
        } else {
          _langStrings = data;
        }
        onReady();
      });
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
      // Session 025 FAB unification: when mounted inside #vex-spiral-group
      // (widgets/vex-fab.js) instead of standalone, drop the fixed
      // positioning and let the group's flex layout place the orb — the
      // wheel below still anchors correctly since it's absolutely
      // positioned relative to THIS container, whichever mode is active.
      '#vex-lang-fab.vex-nested {',
      '  position: relative;',
      '  top: auto;',
      '  right: auto;',
      '  z-index: auto;',
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

      // Session 025 FAB unification: nest into the shared spiral-fab group
      // if present (widgets/vex-fab.js), else keep the original standalone
      // top-level mount — real-estate preference is nested, not sibling,
      // but standalone must keep working for any page without spiral-fab.
      var group = document.getElementById('vex-spiral-group');
      if (group) {
        fab.classList.add('vex-nested');
        group.appendChild(fab);
      } else {
        document.body.appendChild(fab);
      }

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