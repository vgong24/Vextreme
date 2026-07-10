/* VEXTREME God Script — victor-methodology-presentation
 * Assembled by lib/build-vextreme.js
 * DO NOT EDIT — regenerate with: node lib/build-vextreme.js
 */

(function () {
  'use strict';

  /* Per-page viewmodel — baked in at build time */
  window.VEX_VIEWMODEL          = {"category":"production","template":"page","scopes":["pages.victor-methodology-presentation"],"features":["lang","spiral-fab","theme","map","analysis"]};

  /* EN strings — inlined at build time, no fetch on default language */
  window.VEX_STRINGS_EN         = {"common.nav.prev":{"text":"← prev","aria-label":"Previous page"},"common.nav.next":{"text":"next →","aria-label":"Next page"},"common.label.you-are-here":{"text":"You Are Here"},"common.nav.archives":{"text":"Archives","aria-label":"View full archive"},"common.nav.primary-site":{"text":"vextreme24.com","aria-label":"Go to primary site"},"common.nav.github":{"text":"GitHub","aria-label":"View source on GitHub"},"common.nav.full-archive":{"text":"Full archive →","aria-label":"View full archive"},"common.button.copy-filename":{"text":"Copy filename","aria-label":"Copy filename to clipboard"},"common.button.copied":{"text":"Copied!","aria-label":"Filename copied to clipboard"},"common.label.site-title":{"text":"Vextreme"},"common.label.page-live":{"text":"Page live"},"common.label.not-yet-ported":{"text":"Not yet ported"},"common.label.slug":{"text":"Slug"},"common.status.pages-live":{"text":"{ported, plural, one {# of {total} page live} other {# of {total} pages live}}"},"common.status.remaining":{"text":"{count, plural, one {# remaining} other {# remaining}}"},"common.status.built-on":{"text":"Built {date}"},"pages.victor-methodology-presentation.header.eyebrow":{"text":"Engineering Dossier · 2021–2026 · DOC-ID: VG-DOSSIER-v2.1"},"pages.victor-methodology-presentation.header.thesis":{"text":"Finding every place people are forced to assume — and replacing each with a map that makes the assumption safe."},"pages.victor-methodology-presentation.header.id-line":{"text":"Senior Software Engineer II · Dexcom (medical devices, 5 years) · Lean Six Sigma Green Belt · AI-collaboration systems architect"},"pages.victor-methodology-presentation.header.stamp-big":{"text":"×6"},"pages.victor-methodology-presentation.header.stamp-small":{"text":"PROVEN"},"pages.victor-methodology-presentation.section-proofs.heading":{"text":"One method, six proofs"},"pages.victor-methodology-presentation.section-proofs.intro":{"text":"Across five years at a medical-device company — where software quality carries regulatory and patient-safety weight — the same engineering move was applied to six different problems at increasing scale. Each time, manual work done \"at the surface\" was replaced by a maintained map that structurally connects layers, so systems cannot silently drift apart."},"pages.victor-methodology-presentation.proof-organization-knowledge-map.year":{"text":"YEARS 1–5 · LIVE"},"pages.victor-methodology-presentation.proof-organization-knowledge-map.title":{"text":"Mapping the organization itself — the living map"},"pages.victor-methodology-presentation.proof-organization-knowledge-map.body":{"text":"Arrived to no map: no channels connecting Android developers, no forums, no directory of where anything lived. Built the human infrastructure first — a biweekly Android forum with open sharing and bug/innovation lunch-and-learns; a Confluence mapping the org (repos, documentation, dashboards including VnV testing tools); direct developer access to testing tools so engineers debug immediately instead of consuming another person's time; and later, XML→Jetpack Compose migration guides and an inherit-the-base UI doctrine that eliminated inconsistent reimplementations. Not a one-time artifact: a live page, appended and maintained across the full five years — early entries like the org map, late entries like the Compose guides, one continuously current source. Communication built audience-first — including a \"3D\" board of the fragment/navgraph hierarchy, each layer showing its responsibility and connections as a scannable pattern."},"pages.victor-methodology-presentation.proof-organization-knowledge-map.result":{"text":"The methodology's origin and its endurance test in one: a map of people and knowledge, kept alive for five years."},"pages.victor-methodology-presentation.proof-bulk-data-logging.year":{"text":"YEAR 1"},"pages.victor-methodology-presentation.proof-bulk-data-logging.title":{"text":"Analytics that cannot drift — BulkDataLogging"},"pages.victor-methodology-presentation.proof-bulk-data-logging.body":{"text":"Replaced hand-written analytics code at every screen with one central map (ScreenName / ScreenMapper / ButtonName / MetaData) covering display, click, duration, and entry events. Delete a UI element and its logging entry goes with it — analytics and UI are structurally bound."},"pages.victor-methodology-presentation.proof-bulk-data-logging.result":{"text":"Medical-grade event logging with structural integrity, org-wide."},"pages.victor-methodology-presentation.proof-bidirectional-translation-traceability.year":{"text":"YEAR 2"},"pages.victor-methodology-presentation.proof-bidirectional-translation-traceability.title":{"text":"Translations navigable in both directions"},"pages.victor-methodology-presentation.proof-bidirectional-translation-traceability.body":{"text":"Extended the mapping principle to localization: every string traceable from code to every language and back, across Android, iOS, and design — \"where is this text used?\" answered structurally instead of by tribal memory."},"pages.victor-methodology-presentation.proof-bidirectional-translation-traceability.result":{"text":"Foundation for the localization transformation below."},"pages.victor-methodology-presentation.proof-compound-safety-bug-map.year":{"text":"MID"},"pages.victor-methodology-presentation.proof-compound-safety-bug-map.title":{"text":"The compound bug nobody could reproduce"},"pages.victor-methodology-presentation.proof-compound-safety-bug-map.body":{"text":"A missing low-glucose alert — patient-safety critical — was caused by two interacting defects across three teams' systems, one of which erased the evidence of the other. Resolution required first building the missing cross-system map by hand, instrumenting SDK-level code, and extracting reproduction steps inside a one-day window before the only witness left on vacation. Root cause: database indexes built without a wrapping @Transaction — an invisible absence."},"pages.victor-methodology-presentation.proof-compound-safety-bug-map.result":{"text":"The terrain map let senior architects perceive system relationships nobody had seen. Fix shipped; lesson institutionalized."},"pages.victor-methodology-presentation.proof-localization-pipeline.year":{"text":"YEARS 3–4"},"pages.victor-methodology-presentation.proof-localization-pipeline.title":{"text":"Localization: 6 months → 2 weeks"},"pages.victor-methodology-presentation.proof-localization-pipeline.body":{"text":"Through Dexcom-sponsored Lean Six Sigma work, unified fragmented Android/iOS string structures and re-architected the translation pipeline — then engineered the paid vendor tool out of the loop entirely with a single source of truth that regenerates all documents reproducibly, byte-identical, because every condition was mapped rather than assumed."},"pages.victor-methodology-presentation.proof-localization-pipeline.metric":{"text":"6 mo → 2 wk"},"pages.victor-methodology-presentation.proof-localization-pipeline.metric-label":{"text":"lean cycle time — on-paper value in the millions"},"pages.victor-methodology-presentation.proof-cross-domain-ui-identity.year":{"text":"YEARS 3–4"},"pages.victor-methodology-presentation.proof-cross-domain-ui-identity.title":{"text":"The organizational join key — UIElementKey"},"pages.victor-methodology-presentation.proof-cross-domain-ui-identity.body":{"text":"Engineering, UX design, and quality testing each held IDs meaningful only inside their own silo. One composite identity — UIElementKey(platform, project, language, stringId, vnvTestId, uxDesignId) — resolved every discipline to the same UI element. Map first, align second: no team forced to change upfront. With the key live, the pipeline inverted: design issues keys upstream, platforms align by protocol, verification proceeds on a guaranteed assumption. Cross-discipline traceability — audit-grade in a regulated industry."},"pages.victor-methodology-presentation.proof-cross-domain-ui-identity.result":{"text":"Reconciliation disappeared as a phase. Teams run parallel over a shared spine."},"pages.victor-methodology-presentation.proof-source-of-truth-relay.year":{"text":"YEAR 5"},"pages.victor-methodology-presentation.proof-source-of-truth-relay.title":{"text":"PenSDK: the method applied to time itself"},"pages.victor-methodology-presentation.proof-source-of-truth-relay.body":{"text":"For an insulin-pen product where event order is safety-relevant: state changes flow through one SourceOfTruthRelay that derives and broadcasts truth so concurrent readers structurally cannot hold contradictory realities. Coroutines became ID-mapped, first-class tasks with scoped kill-switches — making a complex partner-SDK refresh cycle surgically manageable. Composes natively with Jetpack Compose."},"pages.victor-methodology-presentation.proof-source-of-truth-relay.result-tag":{"text":"Legacy"},"pages.victor-methodology-presentation.proof-source-of-truth-relay.result":{"text":"Deliberately developed the team in these practices — before departure, they problem-solved independently with the culture intact. The practices outlived the practitioner."},"pages.victor-methodology-presentation.section-throughline.band":{"text":"Analytics can't drift from UI. Translations can't orphan from screens. Localization can't fragment across platforms. Concurrent readers can't contradict each other. And now: AI instances can't re-introduce mistakes that were already corrected."},"pages.victor-methodology-presentation.section-ai-maintainable-systems.heading":{"text":"The sixth application: AI-maintainable systems"},"pages.victor-methodology-presentation.section-ai-maintainable-systems.p1":{"text":"Every organization adopting AI coding tools is hitting the same wall: AI-generated work decays, because nothing preserves institutional knowledge between sessions. A new AI instance starts cold and re-introduces assumptions that were corrected months ago — the same disease as every fragmentation above, at the largest scale yet: context itself."},"pages.victor-methodology-presentation.section-ai-maintainable-systems.p2":{"text":"The public working demonstration applies the five-times-proven method to this problem: a repository where CI self-maintains its own indexes; pull requests function as decision records (assumptions, cascading effects, notes for the next reader — human or AI); scaling ceilings are documented with migration paths before they're hit; and any fresh AI session bootstraps full context in one command. The escalation culture built with the human team — hard problems routed early, resolutions written back into shared knowledge — transcribed into architecture."},"pages.victor-methodology-presentation.section-adoption-implications.heading":{"text":"What adoption changes"},"pages.victor-methodology-presentation.section-adoption-implications.intro":{"text":"For an organization, this architecture is not a documentation style — it relocates where reliability comes from: out of individual vigilance and tribal memory, into structure that validates itself."},"pages.victor-methodology-presentation.section-adoption-implications.engineering-label":{"text":"Engineering:"},"pages.victor-methodology-presentation.section-adoption-implications.engineering":{"text":"drift stops being a discipline problem. When analytics, strings, tests, and design resolve through one identity, divergence becomes structurally impossible rather than manually policed — and change review shifts from recalling impact to reading a computed impact report."},"pages.victor-methodology-presentation.section-adoption-implications.localization-label":{"text":"Localization & product:"},"pages.victor-methodology-presentation.section-adoption-implications.localization":{"text":"a new language becomes new rows, not duplicated pages. Vendors translate a meaning once and the graph applies it everywhere it is bound; plural, placeholder, and layout rules are validated per locale automatically."},"pages.victor-methodology-presentation.section-adoption-implications.quality-label":{"text":"Quality & compliance:"},"pages.victor-methodology-presentation.section-adoption-implications.quality":{"text":"every change produces its impact report before it lands, and traceability from test to design intent to translation is audit-grade by construction. In regulated industries, that is the difference between proving compliance and reconstructing it."},"pages.victor-methodology-presentation.section-adoption-implications.ai-label":{"text":"AI adoption:"},"pages.victor-methodology-presentation.section-adoption-implications.ai":{"text":"agents stop re-deriving context. The graph is the memory; AI is the bridge into it — onboarding a fresh agent costs a query, not a repository read, and corrected mistakes stay corrected across sessions, tools, and vendors."},"pages.victor-methodology-presentation.section-adoption-implications.leadership-label":{"text":"Leadership:"},"pages.victor-methodology-presentation.section-adoption-implications.leadership":{"text":"the localization precedent above — six months to two weeks — is what this class of change does to cycle time. The same mechanics apply wherever teams currently reconcile by meeting instead of by map."},"pages.victor-methodology-presentation.section-adoption-implications.closing-note":{"text":"This document is itself the first artifact managed under the standard it describes: its record identifiers follow the concept-ID naming standard, legacy IDs are preserved as aliases, and the English and Chinese content regenerate from a single bilingual source. The proof of concept is the page."},"pages.victor-methodology-presentation.section-audience-fit.heading":{"text":"Where this fits"},"pages.victor-methodology-presentation.fit-platform-devex.title":{"text":"Platform & Developer Experience"},"pages.victor-methodology-presentation.fit-platform-devex.body":{"text":"Building the maps and pipelines that let large teams move in parallel without drift."},"pages.victor-methodology-presentation.fit-ai-tooling-companies.title":{"text":"AI tooling companies"},"pages.victor-methodology-presentation.fit-ai-tooling-companies.body":{"text":"A design-partner profile: has hit and documented the failure modes these products exist to solve."},"pages.victor-methodology-presentation.fit-regulated-industries.title":{"text":"Regulated industries adopting AI"},"pages.victor-methodology-presentation.fit-regulated-industries.body":{"text":"Medical-device background plus audit-grade, decision-record practices — a rare intersection."},"pages.victor-methodology-presentation.fit-process-transformation.title":{"text":"Process transformation"},"pages.victor-methodology-presentation.fit-process-transformation.body":{"text":"Lean Six Sigma-validated: a measured 6-month → 2-week cycle reduction with cross-team adoption."},"pages.victor-methodology-presentation.note-self-demonstration.lead":{"text":"This dossier practices its own method."},"pages.victor-methodology-presentation.note-self-demonstration.body":{"text":"Every record above carries a stable ID (proof-bulk-data-logging, proof-cross-domain-ui-identity…), named for concepts per the repository Registry Documentation Standard, with legacy IDs preserved as aliases, so any reader — human or AI, in English or Chinese — can reference, quote, or ask about an exact record without ambiguity. Identity first; discussion second."},"pages.victor-methodology-presentation.footer.line":{"text":"Victor Gong · Dossier v2.1 · Created July 4, 2026 · DOC-ID: VG-DOSSIER-v2.1"},"pages.victor-methodology-presentation.footer.reference-note":{"text":"References & repository walkthrough available on request"},"pages.victor-methodology-presentation.footer.stamp-word":{"text":"ON"},"pages.victor-methodology-presentation.footer.stamp-label":{"text":"THE RECORD"}};

  /* Scope + category globals for fab-lang compatibility */
  window.VEX_STRING_SCOPES    = ["pages.victor-methodology-presentation"];
  window.VEX_STRING_CATEGORY  = "production";
  window.VEX_SUPPORTED_LANGS  = ["en","ja","zh"];

  /* Arc-chunked bundling pilot (od-001/td-006) — one fetch per language
     instead of an N-way scope fan-out. fab-lang.js checks this first. */
  window.VEX_STRING_ARC_BUNDLE = "victor_dossier";


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
  var VERSION    = '2.0.3';
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
      if (!langs || langs.length < 2) return;
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


/* === feature: theme (fab-theme.js) === */
/**
 * VEXTREME — widgets/fab-theme.js
 *
 * Dark/light theme toggle orb. Persists the choice to localStorage and sets
 * document.documentElement's data-theme attribute — the same attribute
 * convention styles/design-system.css already uses for its
 * [data-theme="dashboard"] block, generalized to a plain "dark"/"light"
 * value any page's own CSS can key off.
 *
 * Honest scope note: this ships the real toggle MECHANISM (persisted state,
 * the attribute, an icon that reflects current state) — it does not itself
 * add [data-theme="dark"] CSS overrides to the ~100+ content pages that each
 * hand-author their own inline :root token block rather than sharing
 * styles/design-system.css. A page with no dark-theme CSS of its own simply
 * shows no visible change when toggled; the toggle is still real and
 * correctly persisted, so a page that DOES add dark CSS later needs zero
 * JS changes to pick it up. Retrofitting per-page dark CSS is a separate,
 * much larger task — not attempted here.
 *
 * Mounts an orb into #vex-spiral-group if present (Session 025's FAB
 * unification — see widgets/vex-fab.js), else falls back to its own
 * top-level fixed-position button for standalone/pre-spiral-fab use.
 *
 * Self-contained IIFE — no global exports, no framework dependencies.
 *
 * LATTICE:BEGIN — generated by lib/build-lattice-headers.js from docs/lattice-map.json. Do not hand-edit; edit the JSON and regenerate.
 *   role      : dark/light theme toggle orb — sets document.documentElement's data-theme attribute, persists to localStorage
 *   reads     : localStorage (vex-theme — persisted preference)
 *               document.documentElement's data-theme attribute (current state)
 *   writes    : document.documentElement's data-theme attribute
 *               localStorage (vex-theme)
 *   loaded-by : lib/build-vextreme.js (inlined as theme feature in God Scripts)
 *               tests/08-build-vextreme.test.js
 *   tested-by : tests/08-build-vextreme.test.js
 *
 *   CHANGE MAP — if you touch X here, also check:
 *     per-page dark CSS added to any page:
 *       - no JS change needed here — the mechanism already sets data-theme="dark"/"light" on <html>; a page's own CSS keys off that attribute
 * LATTICE:END
 */

(function () {
  'use strict';

  var LS_THEME = 'vex-theme';

  function currentTheme() {
    var t = document.documentElement.getAttribute('data-theme');
    return (t === 'dark') ? 'dark' : 'light';
  }

  function iconFor(theme) {
    return theme === 'dark' ? '🌙' : '☀️';
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    try { localStorage.setItem(LS_THEME, theme); } catch (e) { /* storage unavailable */ }
  }

  function injectStandaloneStyles() {
    var css = [
      '#vex-theme-fab {',
      '  position: fixed;',
      '  top: 16px;',
      '  right: 120px;',
      '  z-index: 9999;',
      '}',
      '#vex-theme-fab-btn {',
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
      '}',
      '#vex-theme-fab-btn:hover { background: rgba(255,255,255,0.32); }',
    ].join('\n');
    var style = document.createElement('style');
    style.textContent = css;
    document.head.appendChild(style);
  }

  function injectGroupOrbStyles() {
    var css = [
      '.vex-orb {',
      '  width: 40px;',
      '  height: 40px;',
      '  border-radius: 50%;',
      '  border: none;',
      '  flex: 0 0 auto;',
      '  background: rgba(255,255,255,0.18);',
      '  backdrop-filter: blur(6px);',
      '  -webkit-backdrop-filter: blur(6px);',
      '  font-size: 18px;',
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
      '.vex-orb:hover { background: rgba(255,255,255,0.32); }',
    ].join('\n');
    var style = document.createElement('style');
    style.textContent = css;
    document.head.appendChild(style);
  }

  function mount() {
    var saved = 'light';
    try { saved = localStorage.getItem(LS_THEME) || 'light'; } catch (e) {}
    applyTheme(saved);

    var group = document.getElementById('vex-spiral-group');

    var btn = document.createElement('button');
    btn.setAttribute('aria-label', 'Toggle dark / light theme');
    btn.setAttribute('title', 'Toggle theme');
    btn.textContent = iconFor(saved);

    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      var next = currentTheme() === 'dark' ? 'light' : 'dark';
      applyTheme(next);
      btn.textContent = iconFor(next);
    });

    if (group) {
      injectGroupOrbStyles();
      btn.className = 'vex-orb';
      btn.id = 'vex-theme-orb';
      group.appendChild(btn);
      return;
    }

    // Standalone fallback — no #vex-spiral-group on this page.
    injectStandaloneStyles();
    btn.id = 'vex-theme-fab-btn';
    var container = document.createElement('div');
    container.id = 'vex-theme-fab';
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


/* === feature: map (fab-map.js) === */
/**
 * VEXTREME — widgets/fab-map.js
 *
 * Orb linking to pages/terrain-map.html — the system-health/dependency map,
 * not widgets/fab-demo.js's older "architecture demo" concept (Session 025:
 * the demo page is becoming outdated as the real production system — the
 * terrain map itself — demonstrates the architecture better than a
 * condensed stand-in page).
 *
 * Mounts an orb into #vex-spiral-group if present (Session 025's FAB
 * unification — see widgets/vex-fab.js), else falls back to its own
 * top-level fixed-position button for standalone/pre-spiral-fab use.
 *
 * Self-contained IIFE — no global exports, no framework dependencies.
 *
 * LATTICE:BEGIN — generated by lib/build-lattice-headers.js from docs/lattice-map.json. Do not hand-edit; edit the JSON and regenerate.
 *   role      : orb linking to pages/terrain-map.html
 *   reads     : (none)
 *   writes    : (none)
 *   loaded-by : lib/build-vextreme.js (inlined as map feature in God Scripts)
 *               tests/08-build-vextreme.test.js
 *   tested-by : tests/08-build-vextreme.test.js
 *
 *   CHANGE MAP — if you touch X here, also check:
 * LATTICE:END
 */

(function () {
  'use strict';

  var MAP_URL = 'https://vgong24.github.io/Vextreme/pages/terrain-map.html';

  function injectStandaloneStyles() {
    var css = [
      '#vex-map-fab {',
      '  position: fixed;',
      '  top: 16px;',
      '  right: 68px;',
      '  z-index: 9999;',
      '}',
      '#vex-map-fab-btn {',
      '  width: 44px;',
      '  height: 44px;',
      '  border-radius: 50%;',
      '  border: none;',
      '  background: rgba(255,255,255,0.18);',
      '  backdrop-filter: blur(6px);',
      '  -webkit-backdrop-filter: blur(6px);',
      '  font-size: 18px;',
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
      '#vex-map-fab-btn:hover { background: rgba(255,255,255,0.32); }',
    ].join('\n');
    var style = document.createElement('style');
    style.textContent = css;
    document.head.appendChild(style);
  }

  function injectGroupOrbStyles() {
    // Shared .vex-orb rule — safe to inject redundantly if fab-theme.js
    // already did (identical CSS text, same specificity, no conflict).
    var css = [
      '.vex-orb {',
      '  width: 40px;',
      '  height: 40px;',
      '  border-radius: 50%;',
      '  border: none;',
      '  flex: 0 0 auto;',
      '  background: rgba(255,255,255,0.18);',
      '  backdrop-filter: blur(6px);',
      '  -webkit-backdrop-filter: blur(6px);',
      '  font-size: 18px;',
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
      '.vex-orb:hover { background: rgba(255,255,255,0.32); }',
    ].join('\n');
    var style = document.createElement('style');
    style.textContent = css;
    document.head.appendChild(style);
  }

  function mount() {
    var group = document.getElementById('vex-spiral-group');

    var btn = document.createElement('a');
    btn.href = MAP_URL;
    btn.setAttribute('aria-label', 'Terrain map — system health & dependencies');
    btn.setAttribute('title', 'Terrain map');
    btn.textContent = '🗺️';

    if (group) {
      injectGroupOrbStyles();
      btn.className = 'vex-orb';
      btn.id = 'vex-map-orb';
      group.appendChild(btn);
      return;
    }

    // Standalone fallback — no #vex-spiral-group on this page.
    injectStandaloneStyles();
    btn.id = 'vex-map-fab-btn';
    var container = document.createElement('div');
    container.id = 'vex-map-fab';
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


/* === feature: analysis (fab-analysis.js) === */
/**
 * VEXTREME — widgets/fab-analysis.js
 *
 * Analysis Mode — search/browse panel over data/analysis-index.json
 * (lib/build-analysis-index.js, docs/architecture/15-analysis-mode.md Phase B).
 * Not a demo of the private Vextreme SDK: this is a real, live interface over
 * this repo's own real canonical string IDs, real per-language coverage, real
 * page cross-references, and real screenshots — the same pattern the private
 * SDK's localization product proves, dogfooded on public content instead of
 * shown as a fixture.
 *
 * Search filters by key substring or page slug substring. Each result shows:
 * languages present/missing, every page that references the key, and a
 * screenshot link when one exists for a referencing page. "Export CSV"
 * downloads the currently-filtered result set client-side (Blob download,
 * no server round-trip) — this exports the coverage/mapping table (key,
 * pages, languages present/missing), not translated text bodies. Full-text
 * export is a named fast-follow, not silently implied here — see
 * docs/architecture/15-analysis-mode.md.
 *
 * data/analysis-index.json is fetched lazily on first panel open, not on
 * page load — Phase C (God-Script capability-config decision, od-011) uses
 * this file's real measured fetch weight to decide default-on vs. per-slug
 * opt-in, so this widget must not force that cost onto every page load
 * before that decision is made.
 *
 * Mounts an orb into #vex-spiral-group if present (widgets/vex-fab.js), else
 * falls back to its own top-level fixed-position button, same contract as
 * every other orb widget in this system (see widgets/fab-map.js).
 *
 * Self-contained IIFE — no global exports, no framework dependencies.
 *
 * LATTICE:BEGIN — generated by lib/build-lattice-headers.js from docs/lattice-map.json. Do not hand-edit; edit the JSON and regenerate.
 *   role      : Analysis Mode orb + panel — searches data/analysis-index.json, exports the visible result set as CSV
 *   reads     : data/analysis-index.json via CDN (lazy fetch, first panel open only)
 *   writes    : (none)
 *   loaded-by : lib/build-vextreme.js (inlined as analysis feature in God Scripts, default viewmodel via lib/build-index.js buildViewmodel())
 *               tests/08-build-vextreme.test.js
 *               tests/37-fab-analysis.test.js
 *   tested-by : tests/37-fab-analysis.test.js
 *
 *   CHANGE MAP — if you touch X here, also check:
 *     data/analysis-index.json schema changed (supportedLangs/elements/pages/summary shape):
 *       - lib/build-analysis-index.js (the write side -- must stay in sync)
 *       - filterElements()/screenshotsForKey()/toCSV() here read this shape directly
 *     default features array in lib/build-index.js buildViewmodel() changed:
 *       - this widget's inclusion on default-viewmodel pages changes with it
 *       - tests/07-viewmodel.test.js, tests/08-build-vextreme.test.js (FAB SYSTEM default-feature-count assertions)
 * LATTICE:END
 */

(function () {
  'use strict';

  var CDN_BASE   = 'https://cdn.jsdelivr.net/gh/vgong24/vextreme@main';
  var INDEX_URL  = CDN_BASE + '/data/analysis-index.json';

  var _logger = (window.VEXTREME_LOGGER) || {
    warn:  function(e) { console.warn('[' + e.code + ']', e.message, e); },
    error: function(e) { console.error('[' + e.code + ']', e.message, e); },
  };

  var _data = null;      // fetched analysis-index.json, once loaded
  var _loading = false;
  var _loadError = null;

  // ── Pure computation ─────────────────────────────────────────────────────────

  // filterElements — case-insensitive substring match against the key itself
  // or any page slug that references it. Empty query returns everything
  // (bounded by the caller's own render limit, not here).
  function filterElements(elements, query) {
    var q = (query || '').trim().toLowerCase();
    if (!q) return Object.keys(elements).sort();
    return Object.keys(elements).filter(function (key) {
      if (key.toLowerCase().indexOf(q) !== -1) return true;
      var usedIn = elements[key].usedIn || [];
      for (var i = 0; i < usedIn.length; i++) {
        if (usedIn[i].toLowerCase().indexOf(q) !== -1) return true;
      }
      return false;
    }).sort();
  }

  // screenshotsForKey — every {slug, lang, path} triple available for any
  // page this key is used on, via the pages index (not duplicated per-key —
  // analysis-index.json intentionally doesn't repeat screenshot data on
  // every element, only per page).
  function screenshotsForKey(key, elements, pages) {
    var usedIn = (elements[key] && elements[key].usedIn) || [];
    var shots = [];
    usedIn.forEach(function (relPath) {
      var slug = relPath.replace(/^pages\//, '').replace(/\.html$/, '');
      var page = pages[slug];
      if (!page || !page.screenshots) return;
      Object.keys(page.screenshots).forEach(function (lang) {
        shots.push({ slug: slug, lang: lang, path: page.screenshots[lang] });
      });
    });
    return shots;
  }

  // toCSV — coverage/mapping export for a given key list. Explicitly not
  // translated text — see file header. Columns: key, inManifest, langs,
  // missingLangs, usedIn (pipe-separated within a cell).
  function toCSV(keys, elements) {
    function esc(v) {
      var s = String(v == null ? '' : v);
      if (s.indexOf(',') !== -1 || s.indexOf('"') !== -1 || s.indexOf('\n') !== -1) {
        return '"' + s.replace(/"/g, '""') + '"';
      }
      return s;
    }
    var lines = ['key,inManifest,langs,missingLangs,usedIn'];
    keys.forEach(function (key) {
      var el = elements[key];
      lines.push([
        esc(key),
        esc(el.inManifest),
        esc((el.langs || []).join('|')),
        esc((el.missingLangs || []).join('|')),
        esc((el.usedIn || []).join('|')),
      ].join(','));
    });
    return lines.join('\n');
  }

  // ── Data loading ──────────────────────────────────────────────────────────────

  function loadIndex(onReady) {
    if (_data) { onReady(_data); return; }
    if (_loading) return; // a second click while a fetch is in flight is a no-op; onReady already queued by the first caller's render path
    _loading = true;

    var req = new XMLHttpRequest();
    req.open('GET', INDEX_URL, true);
    req.onload = function () {
      _loading = false;
      if (req.status === 200) {
        try {
          _data = JSON.parse(req.responseText);
          onReady(_data);
        } catch (e) {
          _loadError = 'Failed to parse analysis-index.json';
          _logger.warn({ code: 'ANALYSIS_FAB_PARSE_FAILED', message: _loadError });
          onReady(null);
        }
      } else {
        _loadError = 'analysis-index.json returned HTTP ' + req.status;
        _logger.warn({ code: 'ANALYSIS_FAB_HTTP_ERROR', message: _loadError, status: req.status });
        onReady(null);
      }
    };
    req.onerror = function () {
      _loading = false;
      _loadError = 'Failed to fetch analysis-index.json';
      _logger.warn({ code: 'ANALYSIS_FAB_FETCH_FAILED', message: _loadError });
      onReady(null);
    };
    req.send();
  }

  // ── Panel DOM + styles ───────────────────────────────────────────────────────

  var MAX_RESULTS = 40; // render cap — real repos can have hundreds of keys; the search box narrows before rendering everything

  function injectStyles() {
    var css = [
      '#vex-analysis-fab { position: relative; font-family: inherit; }',
      '#vex-analysis-fab.vex-standalone { position: fixed; top: 16px; right: 120px; z-index: 9999; }',
      '#vex-analysis-panel {',
      '  display: none;',
      '  position: absolute;',
      '  top: 52px;',
      '  right: 0;',
      '  width: min(360px, 90vw);',
      '  max-height: 70vh;',
      '  overflow: hidden;',
      '  display: none;',
      '  flex-direction: column;',
      '  border-radius: 12px;',
      '  background: rgba(255,255,255,0.92);',
      '  backdrop-filter: blur(10px);',
      '  -webkit-backdrop-filter: blur(10px);',
      '  box-shadow: 0 4px 24px rgba(0,0,0,0.18);',
      '  font-size: 13px;',
      '  color: #1c1917;',
      '}',
      '#vex-analysis-panel.open { display: flex; }',
      '#vex-analysis-header { display: flex; gap: 6px; padding: 10px; border-bottom: 1px solid rgba(0,0,0,0.08); }',
      '#vex-analysis-search {',
      '  flex: 1; border: 1px solid rgba(0,0,0,0.15); border-radius: 6px; padding: 6px 8px;',
      '  font-size: 13px; font-family: inherit;',
      '}',
      '#vex-analysis-export {',
      '  border: none; border-radius: 6px; padding: 6px 10px; font-size: 12px; cursor: pointer;',
      '  background: rgba(180,88,48,0.12); color: #b45830; font-weight: 600;',
      '}',
      '#vex-analysis-export:hover { background: rgba(180,88,48,0.22); }',
      '#vex-analysis-export:disabled { opacity: 0.4; cursor: default; }',
      '#vex-analysis-results { overflow-y: auto; padding: 6px 10px 10px; }',
      '#vex-analysis-summary { padding: 4px 10px 8px; font-size: 11px; opacity: 0.65; }',
      '.vex-analysis-row { padding: 8px 0; border-bottom: 1px solid rgba(0,0,0,0.06); }',
      '.vex-analysis-row:last-child { border-bottom: none; }',
      '.vex-analysis-key { font-family: monospace; font-size: 11.5px; word-break: break-all; }',
      '.vex-analysis-langs { margin-top: 3px; }',
      '.vex-analysis-lang-badge {',
      '  display: inline-block; font-size: 10px; font-weight: 600; padding: 1px 5px; border-radius: 4px;',
      '  margin-right: 4px; background: rgba(22,163,74,0.12); color: #16a34a;',
      '}',
      '.vex-analysis-lang-badge.missing { background: rgba(217,119,6,0.12); color: #d97706; }',
      '.vex-analysis-usedin { margin-top: 3px; font-size: 11px; opacity: 0.7; }',
      '.vex-analysis-usedin a { color: #b45830; text-decoration: none; }',
      '.vex-analysis-usedin a:hover { text-decoration: underline; }',
      '.vex-analysis-empty { padding: 16px 4px; font-size: 12px; opacity: 0.6; text-align: center; }',
    ].join('\n');
    var style = document.createElement('style');
    style.textContent = css;
    document.head.appendChild(style);
  }

  function renderResults(container, keys, elements, pages, summaryEl) {
    container.innerHTML = '';

    if (_loadError) {
      var errEl = document.createElement('div');
      errEl.className = 'vex-analysis-empty';
      errEl.textContent = 'Could not load the analysis index. Try again shortly.';
      container.appendChild(errEl);
      summaryEl.textContent = '';
      return;
    }

    summaryEl.textContent = keys.length + ' match' + (keys.length === 1 ? '' : 'es') +
      (keys.length > MAX_RESULTS ? ' (showing first ' + MAX_RESULTS + ')' : '');

    if (!keys.length) {
      var empty = document.createElement('div');
      empty.className = 'vex-analysis-empty';
      empty.textContent = 'No matches.';
      container.appendChild(empty);
      return;
    }

    keys.slice(0, MAX_RESULTS).forEach(function (key) {
      var el = elements[key];
      var row = document.createElement('div');
      row.className = 'vex-analysis-row';

      var keyEl = document.createElement('div');
      keyEl.className = 'vex-analysis-key';
      keyEl.textContent = key;
      row.appendChild(keyEl);

      var langsEl = document.createElement('div');
      langsEl.className = 'vex-analysis-langs';
      (el.langs || []).forEach(function (l) {
        var b = document.createElement('span');
        b.className = 'vex-analysis-lang-badge';
        b.textContent = l;
        langsEl.appendChild(b);
      });
      (el.missingLangs || []).forEach(function (l) {
        var b = document.createElement('span');
        b.className = 'vex-analysis-lang-badge missing';
        b.textContent = l + ' missing';
        langsEl.appendChild(b);
      });
      row.appendChild(langsEl);

      var usedEl = document.createElement('div');
      usedEl.className = 'vex-analysis-usedin';
      if (el.usedIn && el.usedIn.length) {
        var shots = screenshotsForKey(key, elements, pages);
        var shotBySlug = {};
        shots.forEach(function (s) { shotBySlug[s.slug] = shotBySlug[s.slug] || []; shotBySlug[s.slug].push(s); });

        el.usedIn.forEach(function (relPath, i) {
          var slug = relPath.replace(/^pages\//, '').replace(/\.html$/, '');
          var link = document.createElement('a');
          link.href = 'https://vgong24.github.io/Vextreme/pages/' + slug + '.html';
          link.target = '_blank';
          link.rel = 'noopener';
          link.textContent = slug;
          usedEl.appendChild(link);
          if (shotBySlug[slug] && shotBySlug[slug].length) {
            usedEl.appendChild(document.createTextNode(' ('));
            shotBySlug[slug].forEach(function (s, j) {
              var shotLink = document.createElement('a');
              shotLink.href = 'https://github.com/vgong24/Vextreme/blob/main/' + s.path;
              shotLink.target = '_blank';
              shotLink.rel = 'noopener';
              shotLink.textContent = '📷' + s.lang;
              usedEl.appendChild(shotLink);
              if (j < shotBySlug[slug].length - 1) usedEl.appendChild(document.createTextNode(' '));
            });
            usedEl.appendChild(document.createTextNode(')'));
          }
          if (i < el.usedIn.length - 1) usedEl.appendChild(document.createTextNode(', '));
        });
      } else {
        usedEl.textContent = 'not referenced by any scanned page';
      }
      row.appendChild(usedEl);

      container.appendChild(row);
    });
  }

  function downloadCSV(keys, elements) {
    var csv = toCSV(keys, elements);
    var blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'vextreme-analysis-export.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }

  function buildPanel() {
    var panel = document.createElement('div');
    panel.id = 'vex-analysis-panel';

    var header = document.createElement('div');
    header.id = 'vex-analysis-header';

    var search = document.createElement('input');
    search.id = 'vex-analysis-search';
    search.type = 'search';
    search.placeholder = 'Search key or page…';

    var exportBtn = document.createElement('button');
    exportBtn.id = 'vex-analysis-export';
    exportBtn.type = 'button';
    exportBtn.textContent = 'Export CSV';
    exportBtn.disabled = true;

    header.appendChild(search);
    header.appendChild(exportBtn);

    var summary = document.createElement('div');
    summary.id = 'vex-analysis-summary';

    var results = document.createElement('div');
    results.id = 'vex-analysis-results';

    panel.appendChild(header);
    panel.appendChild(summary);
    panel.appendChild(results);

    var currentKeys = [];

    function refresh() {
      if (!_data) return;
      currentKeys = filterElements(_data.elements, search.value);
      renderResults(results, currentKeys, _data.elements, _data.pages, summary);
      exportBtn.disabled = currentKeys.length === 0;
    }

    search.addEventListener('input', refresh);
    exportBtn.addEventListener('click', function () {
      if (!_data || !currentKeys.length) return;
      downloadCSV(currentKeys, _data.elements);
    });
    panel.addEventListener('click', function (e) { e.stopPropagation(); });

    return { panel: panel, refresh: refresh, summary: summary };
  }

  function mount() {
    injectStyles();

    var group = document.getElementById('vex-spiral-group');

    var container = document.createElement('div');
    container.id = 'vex-analysis-fab';

    var btn = document.createElement('button');
    btn.setAttribute('aria-label', 'Analysis mode — search strings, coverage, and pages');
    btn.setAttribute('title', 'Analysis mode');
    btn.setAttribute('aria-expanded', 'false');
    btn.textContent = '🔍';

    var built = buildPanel();

    if (group) {
      btn.className = 'vex-orb';
      btn.id = 'vex-analysis-orb';
      container.appendChild(btn);
      container.appendChild(built.panel);
      group.appendChild(container);
    } else {
      container.className = 'vex-standalone';
      btn.id = 'vex-analysis-fab-btn';
      container.appendChild(btn);
      container.appendChild(built.panel);
      document.body.appendChild(container);
    }

    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      var open = built.panel.classList.toggle('open');
      btn.setAttribute('aria-expanded', String(open));
      if (!open) return;

      if (!_data && !_loadError) {
        built.summary.textContent = 'Loading…';
      }
      loadIndex(function () {
        built.refresh();
      });
    });

    document.addEventListener('click', function (e) {
      if (built.panel.contains(e.target) || btn.contains(e.target)) return;
      built.panel.classList.remove('open');
      btn.setAttribute('aria-expanded', 'false');
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount);
  } else {
    mount();
  }

}());

// [VXG RealForever]


}());