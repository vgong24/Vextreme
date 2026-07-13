/* VEXTREME God Script — specimen-smallest-miss
 * Assembled by lib/build-vextreme.js
 * DO NOT EDIT — regenerate with: node lib/build-vextreme.js
 */

(function () {
  'use strict';

  /* Per-page viewmodel — baked in at build time */
  window.VEX_VIEWMODEL          = {"title":"Specimen: Smallest Miss","category":"demo","template":"specimen-page","scopes":["pages.specimen-smallest-miss","specimens"],"features":["lang","demo","spiral-fab"]};

  /* EN strings — inlined at build time, no fetch on default language */
  window.VEX_STRINGS_EN         = {"common.nav.prev":{"text":"← prev","aria-label":"Previous page"},"common.nav.next":{"text":"next →","aria-label":"Next page"},"common.label.you-are-here":{"text":"You Are Here"},"common.nav.archives":{"text":"Archives","aria-label":"View full archive"},"common.nav.primary-site":{"text":"vextreme24.com","aria-label":"Go to primary site"},"common.nav.github":{"text":"GitHub","aria-label":"View source on GitHub"},"common.nav.full-archive":{"text":"Full archive →","aria-label":"View full archive"},"common.button.copy-filename":{"text":"Copy filename","aria-label":"Copy filename to clipboard"},"common.button.copied":{"text":"Copied!","aria-label":"Filename copied to clipboard"},"common.label.site-title":{"text":"Vextreme"},"common.label.page-live":{"text":"Page live"},"common.label.not-yet-ported":{"text":"Not yet ported"},"common.label.slug":{"text":"Slug"},"common.status.pages-live":{"text":"{ported, plural, one {# of {total} page live} other {# of {total} pages live}}"},"common.status.remaining":{"text":"{count, plural, one {# remaining} other {# remaining}}"},"common.status.built-on":{"text":"Built {date}"},"pages.specimen-smallest-miss.heading.title":{"text":"The Smallest Miss"},"pages.specimen-smallest-miss.intro":{"text":"This page has exactly one translatable line. That's the point — a miss this small is easy to imagine slipping past a reviewer, and easy to prove a machine catches anyway."},"pages.specimen-smallest-miss.body":{"text":"This line exists only to prove a small miss gets caught."},"pages.specimen-smallest-miss.stale-badge":{"text":"Flagged stale — English changed after this translation was written"},"pages.specimen-smallest-miss.process.heading":{"text":"How a one-line change gets caught"},"pages.specimen-smallest-miss.process.step1.label":{"text":"enHash recorded at compile time"},"pages.specimen-smallest-miss.process.step1.detail":{"text":"Every key's English text is hashed into manifest.json when it compiles cleanly — a 12-character fingerprint of exactly what a translator translated against."},"pages.specimen-smallest-miss.process.step2.label":{"text":"English text changes"},"pages.specimen-smallest-miss.process.step2.detail":{"text":"A future edit — even a single word — changes what the English source hashes to. Nothing about this requires the edit to be large or obviously risky."},"pages.specimen-smallest-miss.process.step3.label":{"text":"strings-check.js runs before every compile"},"pages.specimen-smallest-miss.process.step3.detail":{"text":"It recomputes the hash and compares it to manifest.json. A mismatch means the English changed since this key's translations were written — that's a WARN, one of five severity levels (BLOCK, REMAP, WARN, INFO, quarantine), not a hard failure."},"pages.specimen-smallest-miss.process.step4.label":{"text":"_stale: true, written back automatically"},"pages.specimen-smallest-miss.process.step4.detail":{"text":"The translation isn't blocked from shipping — it's tagged. The badge above this text on the Japanese version of this page is that tag, produced by a real run of this check against this exact key, not written in by hand."},"specimens.heading.title":{"text":"Specimens"},"specimens.heading.subtitle":{"text":"Three small, fixed pages — not real content — each isolating one localization state and the pipeline stage that produces or catches it. This sits between the architecture pitch and the real progress tracker: smaller than either, meant to be read in a minute."},"specimens.card.full.label":{"text":"Full translation"},"specimens.card.partial.label":{"text":"Partial translation"},"specimens.card.stale.label":{"text":"The smallest miss"},"specimens.card.full.description":{"text":"Every string translated. Shows what the test suite verifies at each pipeline stage — not just that it passed."},"specimens.card.partial.description":{"text":"One string deliberately left untranslated — the same gap claude-answers-the-doubt has for real. Shows the screenshot-verification process that would catch it."},"specimens.card.stale.description":{"text":"One line of English, changed after its Japanese translation was written — flagged stale automatically. Shows the integrity check that caught it."},"specimens.link.view":{"text":"View specimen →","aria-label":"View this specimen page"},"specimens.link.back":{"text":"← Back to specimens","aria-label":"Back to the specimens dashboard"},"specimens.link.demo":{"text":"← Back to the architecture demo","aria-label":"Back to the architecture demo page"},"specimens.link.archives":{"text":"See real, in-progress translation coverage on the archive dashboard →","aria-label":"View the archive dashboard for real translation progress"}};

  /* Scope + category globals for fab-lang compatibility */
  window.VEX_STRING_SCOPES    = ["pages.specimen-smallest-miss","specimens"];
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
 *   role      : Service Worker registration — activates offline caching, forces an immediate update check, auto-reloads once when a new SW takes control
 *   reads     : navigator.serviceWorker API
 *   writes    : Service Worker registration in browser
 *               an immediate Service Worker update check on every page load (registration.update())
 *               window.location.reload() — exactly once, when a new SW becomes the controller
 *   loaded-by : lib/build-vextreme.js (inlined as core module in every God Script, default: true)
 *   tested-by : tests/09-build-sw.test.js (BUILD-SW: widgets/sw-register.js auto-reloads once..., BUILD-SW: widgets/sw-register.js forces an immediate update check... — structural guards on this file directly; the rest of tests/09 tests sw.js generation)
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

  // Session 025 (continued) — a real, generic staleness bug, not a one-off:
  // sw.js's install handler always calls self.skipWaiting() and its
  // activate handler calls clients.claim(), so a new SW version DOES take
  // over — but only for requests made AFTER it becomes the active
  // controller. The <script src="...God Script..."> tag that already
  // fetched THIS page load ran before that point, so a page can render
  // under a stale SW-cached copy even when the server (and a fresh SW
  // install) already has correct content — the classic "works after a
  // second reload, not the first" Service Worker gotcha. Nothing forced
  // that second reload before; this does, exactly once, so a real content
  // update (e.g. a language becoming available) reaches an open tab
  // automatically instead of silently waiting on the user to notice and
  // manually refresh a second time.
  var reloadedForNewController = false;
  navigator.serviceWorker.addEventListener('controllerchange', function () {
    if (reloadedForNewController) return; // guard against a reload loop
    reloadedForNewController = true;
    window.location.reload();
  });

  window.addEventListener('load', function () {
    navigator.serviceWorker.register(SW_URL, { scope: '/Vextreme/' })
      .then(function (reg) {
        // Session 025 (continued, again) — simulated this end-to-end before
        // shipping: a returning visitor reloading (even a hard reload) does
        // NOT reliably trigger a fresh check of sw.js on its own — Chrome
        // throttles the browser's own background update check (roughly once
        // per 24h per the spec), so a visitor testing again within that
        // window can reload any number of times and keep seeing exactly the
        // same stale content, with the controllerchange fix above never
        // getting a chance to fire because no update was ever detected.
        // reg.update() forces an immediate check on every page load instead
        // of waiting on that throttle — standard practice for this exact
        // problem, not a novel workaround.
        reg.update();
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
 * When shell.js provides #vex-nav-actions, the FAB mounts into that reserved
 * global action rail. Pages without site nav retain the original fixed
 * top-right placement, including the methodology presentation's God Script.
 * Must be the FIRST fab-group feature listed in lib/build-vextreme.js's
 * FEATURES registry — see the comment there for why registration order
 * matters (DOMContentLoaded handlers fire in the order they're added).
 *
 * LATTICE:BEGIN — generated by lib/build-lattice-headers.js from docs/lattice-map.json. Do not hand-edit; edit the JSON and regenerate.
 *   role      : spiral FAB — trigger button + shared expandable group container that other orb widgets mount into
 *   reads     : (none)
 *   writes    : DOM: #vex-spiral-fab / #vex-spiral-trigger / #vex-spiral-group (consumed by fab-lang.js, fab-theme.js, fab-map.js)
 *               DOM: mounts into #vex-nav-actions when provided by lib/vextreme.js; otherwise appends to document.body
 *   loaded-by : lib/build-vextreme.js (inlined as spiral-fab feature in God Scripts, must be first among the FAB-group features)
 *               lib/vextreme.js (shell.js runtime path, loaded before lang/theme/map)
 *               tests/08-build-vextreme.test.js
 *   tested-by : tests/08-build-vextreme.test.js
 *               tests/43-runtime-chrome-composition.test.js
 *
 *   CHANGE MAP — if you touch X here, also check:
 *     #vex-spiral-group DOM id/contract changed:
 *       - widgets/fab-lang.js (getElementById('vex-spiral-group') lookup)
 *       - widgets/fab-theme.js (getElementById('vex-spiral-group') lookup)
 *       - widgets/fab-map.js (getElementById('vex-spiral-group') lookup)
 *       - tests/08 (FAB SYSTEM: nesting assertions)
 *     #vex-nav-actions mount contract changed:
 *       - lib/vextreme.js injectNav() (must create the action rail before loading this widget)
 *       - styles/site-nav.css (.vex-nav-actions owns rail geometry)
 *       - tests/43-runtime-chrome-composition.test.js
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
      '#vex-spiral-fab.vex-spiral-fab--nav {',
      '  position: relative;',
      '  top: auto;',
      '  right: auto;',
      '  z-index: 1;',
      '  align-items: center;',
      '  flex-direction: row-reverse;',
      '}',
      '#vex-spiral-fab.vex-spiral-fab--nav #vex-spiral-trigger {',
      '  color: var(--stone, #1c1917);',
      '  background: var(--ember-bg, rgba(255,255,255,0.18));',
      '  border: 1px solid var(--border, rgba(0,0,0,0.08));',
      '}',
      '#vex-spiral-fab.vex-spiral-fab--nav #vex-spiral-group {',
      '  flex-wrap: nowrap;',
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

    var navActions = document.getElementById('vex-nav-actions');
    if (navActions) {
      container.classList.add('vex-spiral-fab--nav');
      navActions.appendChild(container);
    } else {
      document.body.appendChild(container);
    }
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
 *               location.search (?lang= param — explicit override for the effective language, wins over localStorage)
 *   writes    : innerHTML / textContent of [data-i18n] elements
 *               localStorage (LS_LANG — selected language preference)
 *               location/history (history.replaceState — reflects the effective language into ?lang= so the current URL is always forwardable)
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
 *     URL ?lang= param name:
 *       - any future feature that reads/writes page query params — must not collide with 'lang'; grep pages∕*.html for location.search/URLSearchParams usage before introducing a new param name
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
  var VERSION    = '2.0.5';
  var CDN_BASE   = 'https://cdn.jsdelivr.net/gh/vgong24/vextreme@main';
  var INDEX_URL  = CDN_BASE + '/data/index.json?v=' + VERSION;
  var LS_LANG    = 'vex-lang';
  var LS_DATA    = 'vex-index-v2-data';

  // ── Config constants (mirrors lib/vex-config.js) ─────────────────────────────
  var CATEGORY_SYSTEM     = 'system';
  var CATEGORY_PRODUCTION = 'production';
  var SCOPE_COMMON        = 'common';
  var LANG_DEFAULT        = 'en';

  // Wheel sizing (Session 025 continued — overflow peek affordance). Full
  // items visible at once before the wheel starts clipping the trailing item
  // into a partial "there's more, scroll" peek. Set to 2 deliberately while
  // this system only ships 3 languages (en/ja/zh) — that's the minimum count
  // where the peek behavior is actually exercised and can be verified live,
  // rather than sized for a 5-language future that doesn't exist yet. Raise
  // toward 5 as more languages ship and 2 stops being a meaningful test of
  // the affordance; the constant is the single place that needs to change.
  var WHEEL_VISIBLE_ITEMS = 2;
  var WHEEL_ITEM_HEIGHT   = 52;
  var WHEEL_PEEK_FRACTION = 0.5;

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

  var URL_LANG_PARAM = 'lang';

  // computeLangSearch — pure query-string logic, kept separate from the
  // location/history side effects below so it's directly testable. Given the
  // current `location.search` string and a target language, returns the new
  // search string: the default language (English) is represented by the
  // param's ABSENCE, so a shared link for the common case stays clean, and
  // any other language is explicit — the whole point being that pasting the
  // resulting URL to someone else reproduces the same language without them
  // needing to touch the language wheel at all.
  function computeLangSearch(currentSearch, lang) {
    var params = new URLSearchParams(currentSearch);
    if (lang === LANG_DEFAULT) {
      params.delete(URL_LANG_PARAM);
    } else {
      params.set(URL_LANG_PARAM, lang);
    }
    return params.toString();
  }

  // getUrlLang — reads ?lang= from the current address, if present. Returns
  // null on anything unusable (no URLSearchParams support, sandboxed
  // context) rather than throwing, since this is a nice-to-have, not
  // load-bearing for the widget to function.
  function getUrlLang() {
    try {
      return new URLSearchParams(location.search).get(URL_LANG_PARAM);
    } catch (e) {
      return null;
    }
  }

  // syncUrlLang — reflects the given language into the address bar via
  // replaceState (not pushState — switching languages shouldn't fill the
  // back-button history with one entry per flag tapped). Preserves every
  // other query param and the hash untouched.
  function syncUrlLang(lang) {
    try {
      var newSearch = computeLangSearch(location.search, lang);
      var newUrl = location.pathname + (newSearch ? '?' + newSearch : '') + location.hash;
      var oldUrl = location.pathname + location.search + location.hash;
      if (newUrl !== oldUrl && history.replaceState) {
        history.replaceState(null, '', newUrl);
      }
    } catch (e) { /* URL/History API unavailable or restricted */ }
  }

  // English display names, used only to sort the wheel — not shown as text
  // anywhere (the wheel is flag-only). English itself is pinned first
  // regardless of alphabetical order since it's this system's primary
  // language, not because it sorts first.
  var LANG_NAMES = {
    en: 'English',
    ar: 'Arabic',
    zh: 'Chinese',
    fr: 'French',
    de: 'German',
    hi: 'Hindi',
    ja: 'Japanese',
    ko: 'Korean',
    pt: 'Portuguese',
    es: 'Spanish',
  };

  // sortLangs — English first (primary language, not alphabetical), every
  // other supported language alphabetical by English display name after it.
  // Keeps wheel order stable and predictable as more languages ship, rather
  // than reflecting data/index.json's incidental array order.
  function sortLangs(langs) {
    var rest = langs.filter(function (l) { return l !== LANG_DEFAULT; });
    rest.sort(function (a, b) {
      return (LANG_NAMES[a] || a).localeCompare(LANG_NAMES[b] || b);
    });
    if (langs.indexOf(LANG_DEFAULT) === -1) return rest;
    return [LANG_DEFAULT].concat(rest);
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

    // Cache is fallback only; a stale index cache must not hide new languages.
    var cachedLangs = null;
    try {
      var raw = localStorage.getItem(LS_DATA);
      if (raw) {
        var cached = JSON.parse(raw);
        if (cached.supportedLangs && cached.supportedLangs.length) {
          cachedLangs = cached.supportedLangs;
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
          onReady(cachedLangs || [LANG_DEFAULT]);
        }
      } else {
        _logger.warn({ code: 'LANG_FAB_INDEX_HTTP_ERROR', message: 'index.json returned HTTP ' + req.status, status: req.status });
        onReady(cachedLangs || [LANG_DEFAULT]);
      }
    };
    req.onerror = function () {
      _logger.warn({ code: 'LANG_FAB_INDEX_FETCH_FAILED', message: 'Failed to fetch index.json for lang list' });
      onReady(cachedLangs || [LANG_DEFAULT]);
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
      '  overflow: hidden;',
      '  display: none;',
      '  border-radius: 12px;',
      '  background: rgba(255,255,255,0.15);',
      '  backdrop-filter: blur(10px);',
      '  -webkit-backdrop-filter: blur(10px);',
      '  box-shadow: 0 4px 24px rgba(0,0,0,0.18);',
      '}',
      '#vex-lang-wheel.open { display: block; }',
      // Overflow peek affordance (Session 025 continued): when more languages
      // exist than fit in the visible window, the wheel's own height clips the
      // trailing item to a fraction — a visibly cut-off flag reads as "more
      // below, scroll" far more reliably than the old fully-opaque single-item
      // wheel did, which showed one flag at a time with no indication siblings
      // existed. This gradient only softens the very top/bottom edges now
      // (short fade, not a near-opaque cap) so a peeked item stays recognizable
      // rather than being masked into a blank sliver.
      '#vex-lang-wheel-mask {',
      '  position: absolute;',
      '  inset: 0;',
      '  pointer-events: none;',
      '  z-index: 2;',
      '  background: linear-gradient(',
      '    to bottom,',
      '    rgba(255,255,255,0.35) 0%,',
      '    transparent 12%,',
      '    transparent 88%,',
      '    rgba(255,255,255,0.35) 100%',
      '  );',
      '}',
      '#vex-lang-wheel-track {',
      '  position: absolute;',
      '  inset: 0;',
      '  overflow-y: auto;',
      '  scroll-snap-type: y proximity;',
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
      '  scroll-snap-align: start;',
      '  cursor: pointer;',
      '  transition: opacity 0.15s;',
      '  line-height: 1;',
      '}',
      '.vex-lang-item:hover { opacity: 0.7; }',
      '.vex-lang-item.vex-lang-current { background: rgba(255,255,255,0.25); }',
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

    // Overflow peek: show WHEEL_VISIBLE_ITEMS full rows; if there are more
    // languages than that, clip the wheel's height mid-row so the next item
    // is visibly cut off (a "peek") instead of hidden entirely — the visual
    // signal that more languages are reachable by scrolling. When everything
    // fits, no clipping happens and there's nothing to scroll.
    var visibleItems = Math.min(langs.length, WHEEL_VISIBLE_ITEMS);
    var hasOverflow   = langs.length > visibleItems;
    var wheelHeight   = (hasOverflow ? visibleItems + WHEEL_PEEK_FRACTION : visibleItems) * WHEEL_ITEM_HEIGHT;
    wheel.style.height = wheelHeight + 'px';

    var mask = document.createElement('div');
    mask.id = 'vex-lang-wheel-mask';

    var track = document.createElement('div');
    track.id = 'vex-lang-wheel-track';

    for (var i = 0; i < langs.length; i++) {
      (function (lang) {
        var item = document.createElement('div');
        item.className = 'vex-lang-item' + (lang === currentLang ? ' vex-lang-current' : '');
        item.textContent = flagFor(lang);
        item.setAttribute('data-lang', lang);
        item.setAttribute('title', lang);
        item.addEventListener('click', function () {
          btn.textContent = flagFor(lang);
          wheel.classList.remove('open');
          syncUrlLang(lang);
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
      // Mount even with a single language (previously skipped when
      // langs.length < 2). Per Victor, 2026-07-10: "the language even if
      // just 1, should still be there" — the orb is part of the consistent
      // FAB chrome, and hiding it made the whole spiral look broken on
      // pages/environments where the supported-langs fetch fell back to
      // the single default. With one language the wheel simply shows the
      // current language; selecting it is a no-op.
      if (!langs || !langs.length) return;
      langs = sortLangs(langs);

      var savedLang = LANG_DEFAULT;
      try { savedLang = localStorage.getItem(LS_LANG) || LANG_DEFAULT; } catch (e) {}

      // A ?lang= in the URL wins over the stored preference — this is what
      // makes a shared link actually reproducible: someone forwarding a page
      // with ?lang=zh should not need the recipient to already have zh saved
      // locally, or to find the language wheel and pick it themselves.
      var urlLang = getUrlLang();
      if (urlLang && langs.indexOf(urlLang) >= 0) {
        savedLang = urlLang;
        try { localStorage.setItem(LS_LANG, savedLang); } catch (e) {}
      }

      if (langs.indexOf(savedLang) < 0) savedLang = langs[0];

      // Reflect the effective language into the URL even when it came from
      // localStorage, not the querystring — so the address bar is always an
      // accurate, forwardable snapshot of what's currently on screen, not
      // only right after a manual language switch.
      syncUrlLang(savedLang);

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