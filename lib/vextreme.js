/**
 * VEXTREME — lib/vextreme.js
 * v2.2.0 (internal revision)
 *
 * SYSTEM STATUS — v1/shell.js era loader.
 *
 * This file is the pre-God-Script loader. It is still used by pages that have
 * not yet been ported to the God Script architecture (e.g. claude-answers-the-doubt).
 * It is NOT the current v2 architecture direction.
 *
 * For the v2 system, read these files instead:
 *   lib/build-vextreme.js     — God Script assembler (builds dist/vextreme-{slug}.js)
 *   lib/vextreme-index-v2.js  — v2 arc nav browser library (mounts into #arcNavMount)
 *   widgets/fab-lang.js       — language FAB (works in both systems)
 *
 * The v2 architecture ("God Script") loads one pre-assembled IIFE per page
 * (dist/vextreme-{slug}.js) that inlines the viewmodel, EN strings, and feature
 * widgets. No shell.js required. See lib/build-vextreme.js for the assembler.
 *
 * This file is kept because existing pages still depend on it via shell.js.
 * Port pages to God Scripts to retire it. Open work: INDEX.md "Port existing
 * HTML pages to God Script."
 *
 * ──────────────────────────────────────────────────────────────────────────────
 * v1/shell.js USAGE — the simplest form:
 *
 *   <div id="arcNavMount"></div>
 *   <script src=".../shell.js?v=4"></script>
 *
 *   Slug detected from URL. Template detected from pages.json (v1 data file).
 *   Environment detected from hostname. Everything else is default.
 *
 * WHEN YOU NEED TO OVERRIDE (rare):
 *
 *   VEXTREME({ slug: 'different-slug' });           // slug doesn't match URL
 *   VEXTREME({ arcNav: false });                    // suppress arc nav
 *   VEXTREME({ debug: true });                      // log load sequence
 *   VEXTREME({ baseUrl: 'https://...' });           // fork pointing at own repo
 *
 * CONFIG SCHEMA — all fields optional:
 *
 *   slug      string   Page slug. Auto-detected from URL pathname if omitted.
 *   env       string   Force environment. Auto-detected from hostname if omitted.
 *                      Values: 'squarespace' | 'github_pages' | 'local'
 *   template  string   Override page-template CSS. Auto-detected from pages.json
 *                      if omitted. Keys: 'journal-qa' | 'bridge-council' | 'ae'
 *   nav       boolean  Inject site nav. Default: true on github_pages/local,
 *                      false on squarespace (SS provides its own nav).
 *   bodyWrap  boolean  Wrap existing body content in .vex-page-body for
 *                      consistent max-width, padding, margins. Default:
 *                      true on github_pages/local, false on squarespace
 *                      (Squarespace's own template already provides this).
 *   arcNav    boolean  Inject arc nav widget. Default: true.
 *   fab       boolean  Auto-load the spiral-FAB widget set (vex-fab.js +
 *                      fab-lang.js + fab-theme.js + fab-map.js). Default:
 *                      true on github_pages/local, false on squarespace —
 *                      same gate as nav/bodyWrap. A page never needs its
 *                      own <script> tags for these; shell.js is the one
 *                      place this is wired. fab-demo.js and fab-analysis.js
 *                      are deliberately not included — see loadFabWidgets().
 *   fabWidgets object   Per-widget opt-out within the FAB set, e.g.
 *                      { theme: false } to skip fab-theme.js specifically
 *                      (for a page that already manages document.documentElement's
 *                      data-theme itself) while still getting lang/map.
 *                      Default: {} (everything cfg.fab enables loads).
 *   baseUrl   string   CDN base URL. Default: vgong24/vextreme@main on jsDelivr.
 *                      Override when forking the repo.
 *   cacheVer  string   Cache-bust suffix. Default: '?v=4'.
 *   debug     boolean  Log each load step to console. Default: false.
 *
 * DATA FILES (v1 — different from v2 data layer):
 *   data/arcs.json    — v1 arc definitions (NOT data/arcs-v2.json)
 *   data/pages.json   — v1 per-slug template/token overrides (NOT data/viewmodels.json)
 *
 * KNOWN TECH DEBT:
 *   injectNav() contains hardcoded English display strings — violates architecture
 *   rule 7 (no hardcoded display strings). Pre-dates the rule's codification.
 *   Fix: move nav labels into data/strings/source/ and reference by key.
 *   Tracked: data/status/tech-debt.json.
 */

(function (global) {
  'use strict';

  var VERSION = '2.2.0';

  // ─────────────────────────────────────────────────────────
  // CONSTANTS
  // ─────────────────────────────────────────────────────────

  var DEFAULT_BASE  = 'https://cdn.jsdelivr.net/gh/vgong24/vextreme@main';
  // Must match shell.js's VEXTREME_VER — bump both together (shell.js's own
  // header says so, and tests/41 now enforces it). v6→v7: the FAB-autoload
  // change shipped without a bump, so CDN/browser caches kept serving the
  // pre-FAB vextreme.js and the FAB never appeared on production pages.
  // v7→v8: runtime chrome now composes through a reserved nav action rail,
  // so the shared loader, nav stylesheet, and spiral widget must travel as
  // one cache-coherent release.
  var DEFAULT_CACHE = '?v=8';

  var FONT_BASE = 'https://fonts.googleapis.com/css2?';

  // Font families available as extras beyond the base set.
  // Base (Source Serif 4, IBM Plex Sans/Mono) always loads.
  var FONT_EXTRAS = {
    cormorant: 'family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300;1,400',
    'dm-mono': 'family=DM+Mono:wght@300;400'
  };

  var FONT_BASE_QUERY = 'family=Source+Serif+4:ital,wght@0,300;0,400;0,600;1,300;1,400'
    + '&family=IBM+Plex+Sans:wght@300;400;500;600'
    + '&family=IBM+Plex+Mono:wght@400';

  // Template key → CSS path (relative to BASE)
  var TEMPLATE_MAP = {
    'journal-qa':     'styles/page-templates/journal-qa.css',
    'bridge-council': 'styles/page-templates/bridge-council.css',
    'ae':             'styles/page-templates/ascension-embodiment.css'
  };

  // Environment-specific stylesheets
  var ENV_STYLES = {
    squarespace:  ['styles/squarespace-overrides.css'],
    github_pages: ['styles/site-nav.css'],
    local:        ['styles/site-nav.css']
  };

  var NAV_ENVS = ['github_pages', 'local'];


  // ─────────────────────────────────────────────────────────
  // DETECTION
  // ─────────────────────────────────────────────────────────

  function detectEnv() {
    var host = global.location && global.location.hostname;
    if (!host)                                        return 'squarespace';
    if (host === 'vgong24.github.io')                 return 'github_pages';
    if (host === 'localhost' || host === '127.0.0.1') return 'local';
    return 'squarespace';
  }

  function detectSlug() {
    var path = global.location && global.location.pathname;
    if (!path) return '';
    // Strip .html extension for GitHub Pages file-based URLs
    return path.replace(/\/$/, '').split('/').pop().replace(/\.html$/, '');
  }

  // Read template from pages.json data after it's loaded.
  // Returns null if the slug has no template entry — no CSS loaded.
  function detectTemplate(slug) {
    var pages = global.VEXTREME_PAGES && global.VEXTREME_PAGES.pages;
    if (!pages || !pages[slug]) return null;
    return pages[slug].template || null;
  }


  // ─────────────────────────────────────────────────────────
  // CONFIG RESOLUTION
  // All fields have defaults. Nothing throws on missing fields.
  // ─────────────────────────────────────────────────────────

  function resolveConfig(raw) {
    raw = raw || {};
    var env = raw.env || detectEnv();
    return {
      slug:     raw.slug     || detectSlug(),
      env:      env,
      template: raw.template || null,   // null = read from pages.json after load
      nav:      raw.nav      !== false && NAV_ENVS.indexOf(env) !== -1,
      bodyWrap: raw.bodyWrap !== false && NAV_ENVS.indexOf(env) !== -1,
      arcNav:   raw.arcNav   !== false,
      fab:      raw.fab      !== false && NAV_ENVS.indexOf(env) !== -1,
      fabWidgets: raw.fabWidgets || {},
      baseUrl:  (raw.baseUrl || DEFAULT_BASE).replace(/\/$/, ''),
      cacheVer: raw.cacheVer || DEFAULT_CACHE,
      debug:    raw.debug    === true
    };
  }


  // ─────────────────────────────────────────────────────────
  // UTILITIES
  // ─────────────────────────────────────────────────────────

  function loadStyle(href) {
    if (document.querySelector('link[href="' + href + '"]')) return;
    var el = document.createElement('link');
    el.rel  = 'stylesheet';
    el.href = href;
    document.head.appendChild(el);
  }

  function loadScript(src) {
    return new Promise(function (resolve) {
      if (document.querySelector('script[src="' + src + '"]')) {
        resolve(); return;
      }
      var el     = document.createElement('script');
      el.src     = src;
      el.onload  = resolve;
      el.onerror = function () {
        console.warn('[VEXTREME] Failed to load: ' + src);
        resolve(); // resolve not reject — chain continues
      };
      document.head.appendChild(el);
    });
  }

  function log(cfg, msg) {
    if (cfg.debug) console.log('[VEXTREME v' + VERSION + ']', msg);
  }


  // ─────────────────────────────────────────────────────────
  // FONT INJECTION
  // Base fonts always load. Extra fonts only if needed by template.
  // ─────────────────────────────────────────────────────────

  var TEMPLATE_FONTS = {
    'ae':             ['cormorant', 'dm-mono'],
    'bridge-council': [],
    'journal-qa':     []
  };

  function injectFonts(template) {
    if (document.querySelector('link[href*="fonts.googleapis.com"]')) return;

    var pc1 = document.createElement('link');
    pc1.rel = 'preconnect'; pc1.href = 'https://fonts.googleapis.com';
    document.head.insertBefore(pc1, document.head.firstChild);

    var pc2 = document.createElement('link');
    pc2.rel = 'preconnect'; pc2.href = 'https://fonts.gstatic.com';
    pc2.setAttribute('crossorigin', 'anonymous');
    document.head.insertBefore(pc2, document.head.firstChild);

    var extras  = (template && TEMPLATE_FONTS[template]) || [];
    var families = [FONT_BASE_QUERY];
    extras.forEach(function (key) {
      if (FONT_EXTRAS[key]) families.push(FONT_EXTRAS[key]);
    });

    loadStyle(FONT_BASE + families.join('&') + '&display=swap');
  }


  // ─────────────────────────────────────────────────────────
  // BODY WRAPPER
  // Auto-wraps existing page content in .vex-page-body for spacing
  // (max-width, padding, margins). Zero HTML edits required — this
  // runs on whatever content already exists in <body> at call time.
  //
  // Only runs on github_pages and local — Squarespace already provides
  // its own content width and spacing via its template, and wrapping
  // would conflict with Squarespace's own layout containers.
  //
  // SAFE TO RUN MULTIPLE TIMES: checks for existing wrapper first.
  // SAFE WITH EXISTING #vex-site-nav / #arcNavMount: both are excluded
  // from the wrap and stay as direct children of <body> — nav sits
  // above the wrapped content, arc nav can sit inside or outside
  // depending on where it appears in the original HTML.
  // ─────────────────────────────────────────────────────────

  function wrapBody(cfg) {
    if (!cfg.bodyWrap) return;
    if (document.querySelector('.vex-page-body')) return; // already wrapped

    var body = document.body;
    var nav  = document.getElementById('vex-site-nav');

    // Collect all body children except the nav mount point.
    // Everything else — including #arcNavMount wherever it sits —
    // gets moved inside the new wrapper, preserving original order.
    var toWrap = [];
    Array.prototype.forEach.call(body.children, function (child) {
      if (child.id === 'vex-site-nav') return;
      if (child.tagName === 'SCRIPT') return; // leave scripts in place
      toWrap.push(child);
    });

    if (!toWrap.length) return;

    var wrapper = document.createElement('div');
    wrapper.className = 'vex-page-body';

    // Insert wrapper right before the first element being moved,
    // so position in the document stays visually equivalent.
    body.insertBefore(wrapper, toWrap[0]);
    toWrap.forEach(function (el) { wrapper.appendChild(el); });
  }


  // ─────────────────────────────────────────────────────────
  // NAV INJECTION
  // Only runs on github_pages and local. Squarespace has its own nav.
  // Nav links are defined here — update when top-level structure changes.
  //
  // ZERO-TOUCH: if #vex-site-nav doesn't exist in the page HTML, one
  // is created and inserted as the first child of <body>. Pages never
  // need to add the mount div manually.
  // ─────────────────────────────────────────────────────────

  function alignNavToViewport(el) {
    if (!global.getComputedStyle || !document.body) return;
    var bodyStyle = global.getComputedStyle(document.body);
    var number = function (value) { return parseFloat(value) || 0; };
    var top = number(bodyStyle.marginTop) + number(bodyStyle.paddingTop);
    var left = number(bodyStyle.marginLeft) + number(bodyStyle.paddingLeft);
    var right = number(bodyStyle.marginRight) + number(bodyStyle.paddingRight);

    // The nav is global chrome, while body spacing belongs to the authored
    // page. Cancel that spacing on the nav element only; never rewrite body.
    el.style.marginTop = top ? (-top) + 'px' : '0';
    el.style.marginLeft = left ? (-left) + 'px' : '0';
    el.style.marginRight = right ? (-right) + 'px' : '0';
  }

  function injectNav(cfg) {
    if (!cfg.nav) return;

    var el = document.getElementById('vex-site-nav');
    if (!el) {
      el = document.createElement('div');
      el.id = 'vex-site-nav';
      document.body.insertBefore(el, document.body.firstChild);
    }

    // Real destinations this repo actually has today, in addition to the
    // original vextreme24.com links (kept unchanged — real, live pages,
    // not stale). Terrain Map / Ecosystem Hub didn't exist when this list
    // was first authored; added per docs/architecture/16-nav-coverage.md
    // Step 2 — additive only, nothing removed, so this stays exactly as
    // useful as before for any existing embed of this nav.
    var links = [
      { label: 'Archives',       href: '/Vextreme/index.html' },
      { label: 'Terrain Map',    href: '/Vextreme/pages/terrain-map.html' },
      { label: 'Ecosystem Hub',  href: '/Vextreme/pages/ecosystem-hub.html' },
      { label: 'Direct Contact', href: 'https://www.vextreme24.com/direct-contact' },
      { label: 'AI Tools',       href: 'https://www.vextreme24.com/ai-practitioner-tools' },
      { label: 'vextreme24.com', href: 'https://www.vextreme24.com' }
    ];

    var desktopLinks = links.map(function (l) {
      return '<li><a class="vex-nav-link" href="' + l.href + '">' + l.label + '</a></li>';
    }).join('');

    var mobileLinks = links.map(function (l) {
      return '<li><a class="vex-nav-mobile-link" href="' + l.href + '">' + l.label + '</a></li>';
    }).join('');

    el.innerHTML = '<nav class="vex-nav" id="vex-nav">'
      + '<div class="vex-nav-inner">'
      + '<a class="vex-nav-title" href="/Vextreme/index.html">Vex Life</a>'
      + '<ul class="vex-nav-links">' + desktopLinks + '</ul>'
      + '<button class="vex-nav-toggle" aria-label="Toggle menu" '
      + 'onclick="document.getElementById(\'vex-nav\').classList.toggle(\'vex-nav--open\')">'
      + '<span class="vex-nav-toggle-icon">'
      + '<span></span><span></span><span></span>'
      + '</span></button>'
      + '<div class="vex-nav-actions" id="vex-nav-actions" aria-label="Page tools"></div>'
      + '</div>'
      + '<div class="vex-nav-mobile">'
      + '<ul class="vex-nav-mobile-links">' + mobileLinks + '</ul>'
      + '</div>'
      + '</nav>';

    alignNavToViewport(el);
    if (!el._vexViewportAlignmentBound) {
      global.addEventListener('resize', function () { alignNavToViewport(el); });
      el._vexViewportAlignmentBound = true;
    }

    log(cfg, 'Nav injected');
  }


  // ─────────────────────────────────────────────────────────
  // FAB WIDGETS (v2)
  // Auto-loads the current spiral-FAB feature set: widgets/vex-fab.js (the
  // shared trigger + #vex-spiral-group container) followed by
  // widgets/fab-lang.js, widgets/fab-theme.js, widgets/fab-map.js, each
  // nesting its own orb into the group vex-fab.js creates. This is what
  // pages/victor-methodology-presentation.html demonstrates as the current,
  // complete FAB set (confirmed by reading its own assembled God Script).
  //
  // Order is load-bearing, matching lib/build-vextreme.js's own FEATURES
  // registry comment: vex-fab.js must create #vex-spiral-group before the
  // others look for it. Each widget already handles "DOMContentLoaded
  // already fired" defensively (checks document.readyState, mounts
  // immediately if not 'loading' — same pattern this file's own VEXTREME()
  // entry point uses), so sequencing the *script loads* one after another
  // (waiting for each onload before requesting the next) is sufficient to
  // guarantee mount() order — no separate event-ordering trick needed.
  //
  // fab-demo.js is deliberately NOT included: deprecated per fab-map.js's
  // own header comment ("not widgets/fab-demo.js's older 'architecture
  // demo' concept... the terrain map itself demonstrates the architecture
  // better"). fab-analysis.js is deliberately NOT included either — it
  // depends on a real, page-specific data/analysis-index.json entry most
  // standalone pages don't have; it stays an explicit per-page opt-in via
  // the God-Script build system, not a blanket auto-load here.
  //
  // Independent of the rest of this file's own data (arcs.json/pages.json)
  // — none of these widgets read anything vextreme.js itself loads — so
  // this fires immediately, in parallel with the main chain, rather than
  // waiting on it.
  //
  // Only runs on github_pages and local, same gate as nav/bodyWrap. SAFE
  // TO RUN MULTIPLE TIMES: loadScript() itself dedupes by exact src, so a
  // page that (against the intent above) still hand-authors one of these
  // tags won't get a true double-mount as long as the src string matches
  // exactly — but the real fix for that case is removing the hand-authored
  // tag, not relying on this dedupe.
  //
  // PER-WIDGET OPT-OUT (cfg.fabWidgets): fab-theme.js's own mount() applies
  // its saved/default theme to document.documentElement unconditionally on
  // load (real behavior, checked directly in its own source, not assumed) —
  // a real conflict for any page that already manages document.documentElement's
  // data-theme itself, whether via its own working toggle (different
  // localStorage key, so the two would desync) or a static non-dark/light
  // value like data-theme="dashboard" that fab-theme.js's mount would
  // silently overwrite the instant it runs. VEXTREME({ fabWidgets: { theme:
  // false } }) (or lang/map: false, same shape) disables one widget while
  // keeping the rest — same escape hatch nav/bodyWrap/arcNav already have,
  // scoped to the individual orb instead of the whole FAB set.
  // ─────────────────────────────────────────────────────────

  function loadFabWidgets(cfg) {
    if (!cfg.fab) return Promise.resolve();

    var BASE = cfg.baseUrl;
    var VER  = cfg.cacheVer;
    var want = cfg.fabWidgets || {};

    var chain = loadScript(BASE + '/widgets/vex-fab.js' + VER);
    if (want.lang !== false) {
      chain = chain.then(function () { return loadScript(BASE + '/widgets/fab-lang.js' + VER); });
    }
    if (want.theme !== false) {
      chain = chain.then(function () { return loadScript(BASE + '/widgets/fab-theme.js' + VER); });
    }
    if (want.map !== false) {
      chain = chain.then(function () { return loadScript(BASE + '/widgets/fab-map.js' + VER); });
    }
    return chain.then(function () { log(cfg, 'FAB widgets loaded'); });
  }


  // ─────────────────────────────────────────────────────────
  // MAIN LOADER
  // ─────────────────────────────────────────────────────────

  function run(cfg) {
    if (global._vexLoaderInit) return;
    global._vexLoaderInit = true;

    var BASE = cfg.baseUrl;
    var VER  = cfg.cacheVer;

    log(cfg, 'Init — env:' + cfg.env + ' slug:' + cfg.slug);

    // 1. Fonts — inject early, load in parallel with everything else
    //    Template not known yet (pages.json not loaded), use base fonts.
    //    Template-specific fonts added after data loads if needed.
    injectFonts(null);

    // 2. Shared v1 styles — GATED, no longer blanket-injected here.
    //    design-system.css carries a universal reset, :root tokens
    //    (--muted, --border, --ember, --mono, ...) and a global body
    //    typography rule. Injected as a <link> appended to <head>, it lands
    //    AFTER an authored page's own inline <style> and wins the cascade at
    //    equal specificity — which silently overwrote authored pages' own
    //    token values and body styles the moment shell.js reached them
    //    (found as a real regression on phantom-opera-meta-review.html:
    //    --muted collided, body font/color/line-height clobbered). It now
    //    loads inside step 6 below, only for pages that actually consume the
    //    v1 design system: a pages.json template entry or an #arcNavMount.
    //    Authored pages keep their own styles untouched — runtime chrome
    //    (nav, FAB) decorates the page, it does not restyle it.

    // 3. Environment styles — non-blocking, parallel
    var envStyles = ENV_STYLES[cfg.env] || [];
    envStyles.forEach(function (path) { loadStyle(BASE + '/' + path + VER); });
    log(cfg, 'Env styles injected');

    // 3b. Global chrome mount — nav must exist before the FAB widget loads
    //     so vex-fab.js can mount into #vex-nav-actions instead of claiming
    //     an unrelated fixed top-right coordinate. Pages without nav retain
    //     the widget's standalone fixed-position fallback.
    injectNav(cfg);

    // 3c. FAB widgets — non-blocking, parallel, independent of the data
    //     fetch chain below (see loadFabWidgets()'s own header comment).
    loadFabWidgets(cfg);

    // 4. Expose env globally
    global.VEXTREME_ENV    = cfg.env;
    global.VEXTREME_BASE   = BASE;
    global.VEXTREME_CONFIG = cfg;

    // 5. Fetch data
    Promise.all([
      fetch(BASE + '/data/arcs.json'  + VER).then(function (r) { return r.json(); }),
      fetch(BASE + '/data/pages.json' + VER).then(function (r) { return r.json(); })
    ])

    // 6. Assign globals, resolve template from data, load the v1
    //    enhancement layer ONLY for pages that consume it
    .then(function (results) {
      if (!global.VEXTREME_ARCS)  global.VEXTREME_ARCS  = results[0].arcs;
      if (!global.VEXTREME_PAGES) global.VEXTREME_PAGES = results[1];
      log(cfg, 'Data loaded — ' + Object.keys(global.VEXTREME_ARCS).length + ' arcs');

      // Resolve template: config override → pages.json → null
      var template = cfg.template || detectTemplate(cfg.slug);

      // A page is a v1-system consumer if it has a pages.json template entry
      // or an #arcNavMount. Only those pages get the v1 enhancement layer:
      // design-system.css / arc-nav.css (global tokens + reset that would
      // otherwise clobber authored pages' own styles — see the step 2
      // comment above) and the v1 behavior scripts (arc-nav.js,
      // archive-renderer.js, section-toggle.js, bc-nav.js). The behavior
      // gating is not just a perf nicety: section-toggle.js auto-discovers
      // ANY [data-section] attribute on the page and attaches
      // collapse-on-click listeners to it — a real hijack found on
      // fourteen-patterns...html, whose own sticky sub-nav uses
      // data-section for a completely different purpose. Authored pages
      // never asked for that behavior; now they don't get it.
      var isV1Consumer = !!(template || document.getElementById('arcNavMount'));

      if (!isV1Consumer) {
        log(cfg, 'v1 layer skipped — no template entry, no #arcNavMount (authored page, styles protected)');
        return;
      }

      loadStyle(BASE + '/styles/design-system.css' + VER);
      loadStyle(BASE + '/styles/arc-nav.css'        + VER);
      log(cfg, 'v1 shared styles injected');

      if (template && TEMPLATE_MAP[template]) {
        loadStyle(BASE + '/' + TEMPLATE_MAP[template] + VER);
        log(cfg, 'Template style injected: ' + template);

        // Now inject any template-specific extra fonts
        var extraFonts = TEMPLATE_FONTS[template] || [];
        if (extraFonts.length) {
          // Check if font link already covers these
          var existing = document.querySelector('link[href*="fonts.googleapis.com"]');
          if (existing) {
            // Rebuild with extras if not already present
            var href = existing.href;
            var needRebuild = extraFonts.some(function (k) {
              return FONT_EXTRAS[k] && href.indexOf(FONT_EXTRAS[k]) === -1;
            });
            if (needRebuild) {
              var families = [FONT_BASE_QUERY];
              extraFonts.forEach(function (k) {
                if (FONT_EXTRAS[k]) families.push(FONT_EXTRAS[k]);
              });
              loadStyle(FONT_BASE + families.join('&') + '&display=swap');
            }
          }
        }
      }

      // v1 behavior scripts — sequential (arc-nav before archive-renderer,
      // matching the original chain), then components in parallel.
      return loadScript(BASE + '/lib/arc-nav.js' + VER)
        .then(function () {
          log(cfg, 'arc-nav.js loaded');
          return loadScript(BASE + '/lib/archive-renderer.js' + VER);
        })
        .then(function () {
          return Promise.all([
            loadScript(BASE + '/components/section-toggle.js' + VER),
            loadScript(BASE + '/components/bc-nav.js'         + VER)
          ]);
        });
    })

    // 9. Mount
    .then(function () {
      log(cfg, 'Components loaded');

      // Set PAGE_ARCS from resolved slug
      if (cfg.arcNav && cfg.slug) {
        global.PAGE_ARCS = [{ slug: cfg.slug }];
      }

      // Wrap existing content in .vex-page-body for spacing
      wrapBody(cfg);
      log(cfg, 'Body wrapped: ' + cfg.bodyWrap);

      // Mount arc nav widget
      if (cfg.arcNav && typeof global.VEXTREME_mount === 'function') {
        global.VEXTREME_mount();
        log(cfg, 'Arc nav mounted — slug: ' + cfg.slug);
      }

      // Signal ready
      global._vexReady = true;
      document.dispatchEvent(new CustomEvent('vextreme:ready', { detail: cfg }));
      log(cfg, 'Ready');
    })

    .catch(function (err) {
      console.warn('[VEXTREME] Loader error:', err);
    });
  }


  // ─────────────────────────────────────────────────────────
  // PUBLIC INTERFACE
  // ─────────────────────────────────────────────────────────

  /**
   * VEXTREME(config?)
   *
   * Call once per page. All fields optional.
   * Most pages need no arguments at all.
   */
  global.VEXTREME = function (config) {
    var cfg = resolveConfig(config);
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function () { run(cfg); });
    } else {
      run(cfg);
    }
  };

  // Legacy aliases — still work
  global.VEXTREME_page = function (slug) { global.VEXTREME({ slug: slug }); };

}(window));
