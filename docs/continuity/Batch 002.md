# VEXTREME — Continuity Batch 002
# Sessions 011–020

[← Batch 001](Batch%20001.md)

---

## Session 011

**Date:** July 2, 2026
**Time:** continuation of Session 010 context window
**Thread:** https://claude.ai/code/session_012Cob5Fgz92AYDWfe2mZJWZ
**Instance:** Claude Sonnet 4.6 (Claude Code remote)
**Working with:** Victor Gong
**Continues from:** Session 010 — vex-config.js constants, PR #20 merged; PR #23 (viewmodel fields) started mid-implementation

### Context on arrival

Arrived with PR #23 (viewmodel fields per slug in build-index.js) partially implemented from the prior context window. Victor had also provided two Kimi collaboration docs (hand-off notes + architectural wisdoms) to consider for the queue, plus a third doc (PR #23 key alignment feedback) with a meta-question about where to put external collaboration documents. The session completed PR #23, answered the meta-question (distill into code/lessons/PR records; never commit raw Kimi docs), then implemented PR #24 and PR #25 from the Kimi hand-off queue.

Victor authorized autonomous PR sequencing: "move at your pace as long as you perceive the full map, intention, and end state."

### Files created or modified

| File | What changed |
|---|---|
| `lib/build-index.js` | Added `buildViewmodel(slug, viewmodels)` pure function; updated `buildSlugMap` to accept optional viewmodels param and attach `viewmodel` field to each entry; updated I/O section to load viewmodels.json; updated exports |
| `data/viewmodels.json` | New. Per-slug viewmodel overrides for 6 demo/specimen slugs including `specimen-architectural-wisdoms` |
| `tests/07-viewmodel.test.js` | New. 10 tests covering buildViewmodel defaults, overrides, partial overrides; buildSlugMap viewmodel field; viewmodels.json integrity |
| `widgets/fab-lang.js` | New. Renamed from lang-fab.js (old kept for backward compat); adds VEX_STRINGS_EN shortcut at top of loadStringsForLang — skips fetch for EN if God Script already set the global |
| `widgets/fab-demo.js` | New. Renamed from demo-fab.js (old kept for backward compat); no functional change |
| `lib/build-vextreme.js` | New. God Script assembler. resolveAllSlugs, readScopeBundle, mergeScopes, assembleGodScript. Emits `dist/vextreme-{slug}.js` per page: sets VEX_VIEWMODEL, VEX_STRINGS_EN, VEX_STRING_SCOPES, VEX_STRING_CATEGORY, then inlines feature widget source |
| `dist/vextreme-*.js` | New. 6 God Scripts generated (one per slug with a viewmodel override) |
| `lib/check-key-alignment.js` | New. Compares slug/arc keys across nodes.json, arcs-v2.json, index.json. CLI with --json flag. Exports checkKeyAlignment |
| `.github/workflows/key-alignment.yml` | New. Non-blocking CI check on PRs; posts formatted alignment table as a bot comment. Required `permissions: pull-requests: write / issues: write` to avoid 403 (fixed in hotfix commit after initial push) |
| `config/lessons/multiple-files-to-god-script.json` | New. PR #24 lesson: "The build script is the assembler. The browser receives the output." |
| `config/lessons/magic-strings-to-constants.json` | New. PR #20 lesson: "The variable name is the intention. The string value is irrelevant." |
| `config/lessons/hunting-to-blueprint.json` | New. PR #22 lesson: "The blueprint is the map. The code is the territory. Read the map first." |
| `config/lessons/json-keys-are-strings.json` | New. PR #24 lesson: "JSON is string-based. Keys are strings. This is unavoidable. The mitigation is validation, not elimination." |
| `pages/specimen-architectural-wisdoms.html` | New. 4 CSS decision cards with ember/blue borders for before/after. Inline CSS (no external stylesheet — God Script will eventually inline everything). No string bundle yet. |
| `lib/logger-codes.js` | Added BUILD_MISSING_SCOPE and BUILD_MISSING_FEATURE constants |
| `docs/architecture/08-continuity.md` | Added "External collaboration documents" policy section: collaboration content distills into code, config/lessons, PR records, or docs/architecture source files — never committed as raw Kimi docs |
| `tests/08-build-vextreme.test.js` | New. 22 tests covering readScopeBundle, mergeScopes, assembleGodScript, resolveAllSlugs, checkKeyAlignment |
| `lib/build-sw.js` | New. Service Worker generator. collectDistUrls, generateSWContent, getCommitHash. Cache name = vextreme-v1-{git-short-hash} |
| `sw.js` | New. Generated artifact at repo root. 9 pre-cached URLs (6 God Scripts + 3 core assets), cache vextreme-v1-c801600 |
| `manifest.json` | New. PWA manifest. start_url and scope both /Vextreme/. Icons referenced but not yet committed. |
| `widgets/sw-register.js` | New. Tiny IIFE: registers /Vextreme/sw.js on window.load, handles reg.waiting with SKIP_WAITING postMessage |
| `tests/09-build-sw.test.js` | New. 20 tests covering collectDistUrls, generateSWContent, CORE_ASSETS, getCommitHash |

### What was built and why

**PR #23 — viewmodel fields per slug in build-index.js**
`buildViewmodel(slug, viewmodels)` is a pure function that returns a 4-field viewmodel object (category, template, scopes, features) with defaults for production pages and per-slug overrides from `data/viewmodels.json`. The override file is optional — missing or empty file returns all defaults. This is the build-time source of truth that God Scripts (PR #24) read to know what to inject per page.

**PR #24 — God Script assembler + key alignment check + config/lessons/**
`lib/build-vextreme.js` assembles one IIFE per page into `dist/vextreme-{slug}.js`. The IIFE sets four window globals (VEX_VIEWMODEL, VEX_STRINGS_EN, VEX_STRING_SCOPES, VEX_STRING_CATEGORY) and inlines the source of each feature widget the page needs. The browser receives one pre-assembled HTTP request per page; EN strings are already inlined; JA is fetched lazily on first language switch. `fab-lang.js` checks `window.VEX_STRINGS_EN` before fetching for EN, short-circuiting the network call.

Key alignment check solves a long-standing latent risk: JSON keys are strings, slug and arc key drift between nodes.json, arcs-v2.json, and index.json was invisible until `check-key-alignment.js` was written. The CI workflow posts a non-blocking alignment table on every PR. The first run showed 88 nodes, 16 arcs, zero drift — confirming the existing data was already clean.

External collaboration documents policy: Kimi docs are deliberations, not conclusions. The lesson is that a collaboration doc should never be committed as `docs/kimi-*.md`. Conclusions land as code, `config/lessons/*.json` entries, or PR decision records. The reasoning is now in `docs/architecture/08-continuity.md` so future instances don't have to re-derive it.

`specimen-architectural-wisdoms.html` is a 4-card page showing the system's key architectural transitions using the before/after CSS card pattern. No God Script yet — it sets the globals manually as inline script, same as older specimen pages.

**PR #25 — Service Worker + PWA manifest**
Cache-first SW with git-hash-keyed cache names. Every commit produces a new `CACHE_NAME`; the activate handler deletes all caches where `key !== CACHE_NAME`. HTML is never cached (checked via `accept: text/html` header). `sw.js` is a committed generated artifact — regenerate with `node lib/build-sw.js` after any change to `dist/`. The manifest enables PWA installability but lacks icons (carry item).

### Mistakes made

- **key-alignment.yml permissions missing:** Initial push got 403 when the workflow tried to post a PR comment. `actions/github-script@v7` requires `pull-requests: write` and `issues: write` at the workflow level; these were omitted from the first commit. Fixed in a hotfix commit before merging PR #24.
- **Context window exhaustion mid-session:** The prior context window ran out during PR #25 implementation (after writing tests/09-build-sw.test.js but before committing). Session 011 continued in a new context window from the summary — no work was lost, the summary was accurate.
- **Batch overflow:** Session 011 was initially appended to Batch 001 in error. Batch 001 holds sessions 001–010 (maximum 10). Session 011 was moved to this file (Batch 002) in the PR #26 follow-up commit.

### Assumptions that held

- 119/119 tests passed after all three PRs.
- Key alignment check: 88 nodes, 16 arcs, zero drift on first run — existing data was already clean.
- `collectDistUrls` gracefully returns `[]` for a missing dist/ directory — confirmed by test and implementation.
- `getCommitHash()` falls back to 'dev' when git is unavailable — confirmed by the test environment.

### Assumptions that need verification

- [ ] `sw.js` is served correctly from `/Vextreme/sw.js` on GitHub Pages — not yet confirmed live
- [ ] `icons/icon-192.png` and `icons/icon-512.png` don't exist yet — PWA installability will fail until they're committed
- [ ] SW registration is not yet wired into any HTML page — pages need `<link rel="manifest">` and `<script src=".../sw-register.js">` tags
- [ ] God Scripts in `dist/` are committed but not yet referenced by any live HTML page
- [ ] `node lib/build-vextreme.js` and `node lib/build-sw.js` must both run after any change to pages/ or data/ — not yet automated in CI

### Open work at session end

- [ ] Create PWA icons (`icons/icon-192.png`, `icons/icon-512.png`) — requires image generation tools; carry until available
- [ ] Wire sw-register.js + manifest link into all HTML pages
- [ ] Wire `node lib/build-vextreme.js` + `node lib/build-sw.js` into CI (auto-run after pages/ or data/ changes)
- [ ] Add string bundle for `specimen-architectural-wisdoms` — currently renders static HTML; no localization yet
- [ ] Port existing pages (claude-answers-the-doubt, restoration-protocol, etc.) to reference God Script instead of shell.js + lang-fab.js
- [ ] Migrate `claude-answers-the-doubt.html` / `restoration-protocol.html` to window.VEX_STRING_SCOPES (carried from Session 007)
- [ ] Verify scoped fetch + category CDN paths post-merge (carried from Session 009)
- [ ] Consider "always include this scope" mechanism (carried from Session 008)
- [ ] Missing-key fallback, strings-check audit, 06-i18n.md reconciliation (carried)

### State of the system at session end

The God Script architecture is complete and generating output. `dist/` holds 6 God Scripts (one per demo/specimen slug). `sw.js` is at repo root, pre-caching those 6 scripts plus 3 core assets under a commit-hash-keyed cache name. The build pipeline now has three layers: `build-index.js` (index.json), `build-vextreme.js` (God Scripts), `build-sw.js` (service worker). All three still require manual runs — CI automation is the next infrastructure PR. 119/119 tests passing. PRs #23, #24, #25 all merged.

---

## Session 012

**Date:** July 2, 2026
**Time:** continuation of Session 011 context window
**Thread:** https://claude.ai/code/session_012Cob5Fgz92AYDWfe2mZJWZ
**Instance:** Claude Sonnet 4.6 (Claude Code remote)
**Working with:** Victor Gong
**Continues from:** Session 011 — God Script architecture, SW, manifest; context exhausted mid-PR-#25

### Context on arrival

Arrived from a context summary covering PRs #23–#25. PR #25 (Service Worker + PWA manifest) was complete in the prior window; this session opened by confirming CI was green and writing the Session 011 continuity log as PR #26. Then Victor raised three threads: (1) batch overflow fix needed (Session 011 was initially in Batch 001), (2) `config/lessons/` scalability policy, (3) `archives.html` framing rethought — proposed "Ecosystem Hub" concept for developer-facing state dashboard.

That conversation expanded into a slug rename blast radius analysis (7 layers touched on a slug rename, missing mitigation for HTML link drift) and then into the system health manifest pattern (`data/status.json` as a CQRS read-side artifact covering four notice categories). Victor authorized implementation.

### Files created or modified

| File | What changed |
|---|---|
| `docs/continuity/Batch 001.md` | Closing note added; Session 011 removed (moved to Batch 002) |
| `docs/continuity/Batch 002.md` | Created. Session 011 entry as first block |
| `docs/continuity/INDEX.md` | Current State updated to Session 011; Open Work reconciled; Batch Registry updated to two rows |
| `docs/architecture/08-continuity.md` | Lessons scalability policy added: `config/lessons/` is archive reference, not cold-start reading |
| `docs/architecture.md` | Regenerated from source files |
| `data/status/tech-debt.json` | New. 5 hand-authored items (CI automation gap, widget backward-compat copies, no HTML dead link scanner, no slug rename script, specimen-architectural-wisdoms no string bundle) |
| `data/status/planned-enhancements.json` | New. 6 hand-authored items (PWA icons, port pages to God Scripts, spiral portal FAB, missing-key fallback, strings-check audit, slug rename tooling) |
| `data/status/assumptions.json` | New. 5 hand-authored items (SW serving on GitHub Pages, scoped CDN paths post-merge, archives rebuild, index root nav, demo stats fetch) |
| `lib/build-status.js` | New. Assembler: `buildTranslationNotices`, `buildStatusRollup`, `countOpen`. I/O section walks `scopes/demo/` recursively for fixture detection |
| `data/status.json` | New (generated artifact). 1 pending translation, 5 tech debt, 6 enhancements, 5 assumptions; totalOpen=17 |
| `lib/build-ecosystem-hub.js` | New. Generates `pages/ecosystem-hub.html` via `generateEcosystemHub()` |
| `pages/ecosystem-hub.html` | New (generated). Developer dashboard: content map stat tiles + page registry with GitHub source links + copy-slug buttons + 4 expandable health panels |
| `tests/10-build-status.test.js` | New. 23 tests covering buildTranslationNotices, buildStatusRollup, countOpen, integration against data/status.json and data/status/*.json |

### What was built and why

**PR #26 — Session 011 continuity log + batch fix + lessons scalability policy**
The Session 011 log was written in this session (first thing). After the initial push, the batch overflow was caught — Session 011 had been appended to Batch 001 which was already at 10 sessions. Fixed by truncating Batch 001 at Session 010 (adding a closure note) and creating Batch 002 with Session 011 as the first entry. The lessons scalability policy was added to `docs/architecture/08-continuity.md`: `config/lessons/` is lookup/archive reference, not mandatory cold-start reading. `docs/architecture.md` regenerated. PR #26 merged.

**Slug rename blast radius analysis (architectural discussion, no separate PR)**
The conversation about renaming `archives.html` expanded into a full analysis: a slug rename touches 7 layers — nodes.json, index.json, HTML filename, string scope keys, compiled bundles, God Script filename, internal HTML links. `check-key-alignment.js` covers the data layer (nodes/arcs/index drift) but not HTML internal link drift. This gap is now tracked as td-003 in tech-debt.json. A `lib/check-link-integrity.js` HTML dead link scanner was noted as the next CI mitigation.

Also discussed: a `_meta.renamed_from` convention for string source files so localization teams can trace key provenance through renames. Not implemented yet; noted as part of future slug rename tooling (pe-006 + td-004).

**PR #27 — System health manifest + Ecosystem Hub dashboard (23 tests)**
The promotion model: session log `- [ ]` items are the moment of recognition; durable items live in `data/status/*.json`, not in markdown prose. This separates the continuity log (reasoning) from the work queue (operational state).

Four notice categories:
- `translation` — auto-generated by `build-status.js` from strings/compiled/manifest.json; demo fixture gaps marked `intentional: true` and excluded from `totalOpen`
- `techDebt` — hand-authored JSON, structural decisions deferred
- `enhancements` — hand-authored JSON, long-horizon items with no session endpoint
- `assumptions` — hand-authored JSON, claims from PR records not yet confirmed live

`buildTranslationNotices` uses prefix matching (`key.startsWith(scope + '.')`) not string splitting — scope names have multiple dot-separated components and the last segment isn't reliably the "leaf". Demo fixture detection walks `scopes/demo/` recursively (initial non-recursive implementation missed `pages/` subdirectory).

`pages/ecosystem-hub.html` live-fetches both `index.json` and `status.json` in parallel at runtime, matching the pattern from `vextreme-demo.html`. Page Registry table includes copy-slug buttons (requires HTTPS or localhost — silently fails on `file://`) and GitHub source links to `blob/main/pages/{slug}.html`.

142/142 tests passing. PR #27 CI green.

### Mistakes made

- **Demo scope detection non-recursive on first attempt:** `fs.readdirSync(demoScopesDir).filter(f => f.endsWith('.en.json'))` only looked at top-level files; `pages/specimen-*.en.json` files are in a `pages/` subdirectory. Fixed with a recursive walk function.
- **Scope prefix derived via string splitting:** `key.split('.').slice(0,-1).join('.')` for a key like `pages.specimen-partial-translation.body.untranslated` gave `pages.specimen-partial-translation.body` instead of the correct scope prefix. Fixed with `[...demo].some(s => key === s || key.startsWith(s + '.'))`.
- **`data/status/*.json` not registered in architecture docs:** Victor caught this after the session was underway. `docs/architecture/03-data.md` had no mention of the status subsystem — the files were floating. Fixed in PR #28 (this session log).

### Assumptions that held

- 142/142 tests passed (119 prior + 23 new) with no regressions.
- Key Alignment check: 88 nodes, 16 arcs, zero drift — clean through PR #27.
- `buildStatusRollup` `totalOpen` count correctly excludes intentional translation fixtures.
- Prefix matching for scope detection correctly identifies all demo fixture keys.

### Assumptions that need verification

- [ ] `data/status.json` regeneration is not yet wired into CI — it must be manually re-run after any change to `data/status/*.json` or `data/strings/compiled/manifest.json`
- [ ] Copy-slug buttons in `ecosystem-hub.html` require HTTPS or localhost; behavior on `file://` is silent failure
- [ ] `pages/ecosystem-hub.html` live fetch of index.json + status.json not yet verified on GitHub Pages
- [ ] PR #27 not yet merged at session log write time — dependent on Victor's review

### Open work at session end

- [ ] Wire `lib/build-status.js` into CI (data/status.json must stay current automatically)
- [ ] `lib/check-link-integrity.js` — HTML dead link scanner for CI (td-003)
- [ ] `_meta.renamed_from` convention on string source files for slug rename traceability
- [ ] Update `docs/architecture/03-data.md` to register `data/status/` write side + `data/status.json` read side (addressed in this PR)
- [ ] Light/dark mode theming — premature until CSS/styling architecture is established; Victor confirmed not queued

### State of the system at session end

`data/status.json` is a generated CQRS artifact at the same layer as `index.json` — machine-readable operational state across four notice categories. `pages/ecosystem-hub.html` is the first consumer, rendering content map + page registry + system health panels from two parallel runtime fetches. `data/status/*.json` are the hand-authored write side; `lib/build-status.js` assembles them. The architecture docs gap (status subsystem not registered in 03-data.md) is fixed in this PR. 142/142 tests. PR #26 merged; PR #27 CI green, pending merge.

---

## Session 013

**Date:** July 2, 2026
**Time:** continuation of Session 012 context window, then resumed after context compression
**Thread:** https://claude.ai/code/session_012Cob5Fgz92AYDWfe2mZJWZ
**Instance:** Claude Sonnet 4.6 (Claude Code remote)
**Working with:** Victor Gong
**Continues from:** Session 012 — data/status.json CQRS artifact, ecosystem-hub dashboard, PR #27 merged

### Context on arrival

Arrived from context summary of Sessions 011-012. PR #27 was merged. A rebase was in progress on `claude/html-import-localization-tracking-jtlmtp` — 4 HTML pages had merge conflicts between main's partial change (old inline config tags) and the branch's God Script `<script src>` tags. Session opened by resolving those conflicts and continuing.

Victor raised a question mid-session: I had mentioned `arc-nav.js` didn't exist yet, but it exists in `lib/`. This revealed I had inferred the v1/v2 arc nav relationship from CLAUDE.md's blocker note rather than from file-level documentation. Victor used this as the seed for the LATTICE pattern — "map-aware development" where files carry their own nav context and a centralized lattice-map.json serves lateral navigation.

### Files created or modified

| File | What changed |
|---|---|
| `widgets/lang-fab.js` | Fix: cache strings bundle in localStorage so language persists on refresh — previous sessions cached only the selected lang key, not the bundle itself |
| `lib/vextreme-index-v2.js` | Added v2/God Script designation to header, VEX_STRINGS_EN fast path (reads global instead of fetching if already set), LATTICE + CHANGE MAP header |
| `lib/vextreme.js` | Added cross-reference note: this is the non-God-Script loader; for God Script pages use dist/vextreme-{slug}.js instead |
| `lib/build-vextreme.js` | Added VEX_SUPPORTED_LANGS to God Script assembly; added sw-register.js as `default: true` core module (pe-007 unified feature registry); added LIB_DIR constant; added srcDir support to assembly loop; added LATTICE + CHANGE MAP header |
| `pages/specimen-full-translation.html` | Wired to God Script; resolved rebase conflict |
| `pages/specimen-partial-translation.html` | Wired to God Script; resolved rebase conflict |
| `pages/specimen-smallest-miss.html` | Wired to God Script; resolved rebase conflict |
| `pages/specimens.html` | Wired to God Script; resolved rebase conflict |
| `pages/vextreme-demo.html` | Wired to God Script |
| `dist/vextreme-*.js` | All God Scripts regenerated (added VEX_SUPPORTED_LANGS, sw-register.js inline) |
| `dist/vextreme-ecosystem-hub.js` | New. Generated God Script for ecosystem-hub |
| `tests/08-build-vextreme.test.js` | Updated assertions for VEX_SUPPORTED_LANGS, sw-register.js core inclusion |
| `sw.js` | Regenerated with updated precache URL list (now includes all wired pages) |
| `docs/culture.md` | New. Development culture, mission, and operating principles. Read before CLAUDE.md — the architecture makes more sense once you understand the intention behind it |
| `lib/audit-pages.js` | New. Scans pages/ against index.json + dist/. Outputs wired/blocked/skipped table. Canonical source of truth for page wiring status: `node lib/audit-pages.js` |
| `CLAUDE.md` | Added culture.md to cold-start reading sequence (step 0); added lattice-map.json pointer after reading sequence |
| `data/status/tech-debt.json` | Added td-006: i18n multi-language scaling risk (string bundle per language, grows with each language added) |
| `data/status/planned-enhancements.json` | Added pe-007 (unified feature registry, now shipped), pe-008 (offline FAB); updated pe-002 blockedBy |
| `lib/vex-config.js` | Added Feature.SW ('sw') and Feature.ARC_NAV ('arc-nav') constants; added LATTICE + CHANGE MAP header |
| `lib/arc-nav.js` | Added v1 Squarespace-era warning to header: NOT FOR GOD SCRIPT PAGES; use lib/vextreme-index-v2.js for v2 pages |
| `lib/build-index.js` | Added LATTICE + CHANGE MAP header |
| `lib/strings-compile.js` | Added LATTICE + CHANGE MAP header |
| `docs/lattice-map.json` | New. Centralized file dependency graph: 14 nodes, each declaring role, context (the WHY), reads, writes, loadedBy, testedBy, changeMap. Lateral navigation ("what else breaks if I change X?") before depth navigation ("how does this work?") |
| `tests/10-build-status.test.js` | Added 5 LATTICE integrity tests: file exists, top-level keys, every node has required fields, every node key maps to an existing file, ≥10 nodes |

### What was built and why

**God Script wiring — 5 HTML pages**
Specimen pages (full-translation, partial-translation, smallest-miss, specimens) and vextreme-demo were wired to God Scripts. Rebase conflicts in 4 of these were resolved by keeping the God Script `<script src>` tag. VEX_SUPPORTED_LANGS was missing from assembly — added to `assembleGodScript()` so `fab-lang.js` knows which languages to offer without a separate fetch.

**SW activation via unified feature registry (pe-007)**
`sw-register.js` needed to be active on every God Script page, but the old CORE_MODULES + FEATURE_WIDGET two-structure approach made it awkward to extend. Collapsed both into a single `FEATURES` registry (keyed by Feature.*, `{ filename, default: true/false, srcDir? }`). `default: true` = always included (infrastructure); `default: false` = opt-in via `viewmodel.features[]`. This lets SW registration be `default: true` — it activates on every God Script page without appearing in every viewmodel. `srcDir` override enables lib/ files (like vextreme-index-v2.js) to appear in the registry without moving them to widgets/.

**Arc nav registry fix**
The FEATURES registry initially pointed at `widgets/arc-nav.js` (doesn't exist). Victor caught this. The correct file is `lib/vextreme-index-v2.js`. Fixed by adding `LIB_DIR` constant and `srcDir: LIB_DIR` to the arc-nav registry entry. Also discovered the `lib/vextreme-index-v2.js` widget lacked the VEX_STRINGS_EN fast path — the arc nav chrome keys (common.nav.prev/next, common.label.you-are-here) are in the 'common' scope which God Scripts always include, so the fast path skips the CDN fetch entirely.

**LATTICE pattern — file-level navigation headers + centralized map**
Victor's question ("did you have to infer that relationship?") exposed a legibility gap: `lib/arc-nav.js` is the intuitively named file but is the v1 Squarespace script. Without cross-references, any arriving instance would naturally open it first and be misled. The fix: add explicit cross-references to both files AND generalize the pattern.

LATTICE headers (`role`, `reads`, `writes`, `loaded-by`, `tested-by`, `CHANGE MAP`) were added to the 5 highest-traffic lib files. `changeMap` is the key primitive: given "I changed X," it lists every adjacent file that must also be updated. Following all changeMap links visits every affected node — closing the circuit.

`docs/lattice-map.json` centralizes this as a traversable graph. 14 nodes. The distinction: lateral navigation (what else breaks?) is a different cognitive mode from depth navigation (how does this work?). Load the lattice for lateral; read the file for depth.

**docs/culture.md**
A file Victor wanted: the mission, operating principles, and culture of development on this project. Placed as step 0 in CLAUDE.md's cold-start reading sequence — the architecture makes more sense once you understand why the system exists and what kind of developer it expects.

**lib/audit-pages.js**
Replaces the need to manually audit pages/*.html. Outputs a table: each page as wired (God Script in dist/ + referenced in HTML), blocked (God Script missing or HTML missing reference), or skipped (restoration-protocol on shell.js — V1 path). CLAUDE.md updated to reference it as canonical wiring status source.

### Mistakes made

- **arc-nav FEATURES registry pointing at non-existent file:** Initially registered `[Feature.ARC_NAV]: { filename: 'arc-nav.js', default: false }` which looks in `widgets/arc-nav.js` (doesn't exist). Victor caught it. Fix: `{ filename: 'vextreme-index-v2.js', default: false, srcDir: LIB_DIR }`.
- **JSDoc glob pattern in `/** */` comment:** Writing `data/strings/compiled/scopes/**/*.en.json` inside a block comment causes `SyntaxError: Unexpected token '*'` (the `*/` closes the comment early). Fixed by switching to explicit path notation: `data/strings/compiled/scopes/{category}/{scope}.en.json`.
- **`git rebase --continue --no-edit` invalid:** `--no-edit` is not a valid flag for `git rebase`. Used `GIT_EDITOR=true git rebase --continue` instead.
- **Had to infer v1/v2 arc nav relationship:** The CLAUDE.md blocker note was the save, not file-level documentation. Fixed by adding cross-references to both files — the intuitively named file must redirect even if it's older.

### Assumptions that held

- 149/149 tests passing (142 prior + 5 new LATTICE integrity tests + 2 updated in tests/08).
- FEATURES registry with `default: true` sw-register correctly inlines SW code into every God Script.
- VEX_STRINGS_EN fast path in vextreme-index-v2.js correctly skips CDN fetch when God Script has already set the global.
- All 14 lattice-map.json nodes resolve to existing files.

### Assumptions that need verification

- [ ] God Script pages with SW now active — need to confirm SW registers correctly on first visit and caches on second (GitHub Pages)
- [ ] arc-nav feature not yet activated for `claude-answers-the-doubt` specifically — pe-002 blocker note updated but the viewmodel.json change + rebuild hasn't happened
- [ ] `restoration-protocol` still on shell.js (v1 path) — needs investigation before porting; may require content audit before touching
- [ ] LATTICE headers and lattice-map.json cover the 5 highest-traffic files; lower-traffic files (build-archives.js, build-ecosystem-hub.js, etc.) not yet covered

### Open work at session end

- [ ] Activate arc-nav for `claude-answers-the-doubt`: add 'arc-nav' to its viewmodel in data/viewmodels.json, confirm `<div id="arcNavMount">` exists in the HTML, rebuild the God Script
- [ ] Investigate `restoration-protocol` — currently skipped in audit-pages; shell.js (v1 path); may need content audit first
- [ ] Add string bundle for `specimen-architectural-wisdoms` — no localization yet; blocked God Script assembly
- [ ] Wire `node lib/build-vextreme.js` + `node lib/build-sw.js` into CI (td-001)
- [ ] Wire `lib/build-status.js` into CI (data/status.json must regenerate automatically)
- [ ] `lib/check-link-integrity.js` — HTML dead link scanner for CI (td-003)
- [ ] Create PWA icons (icons/icon-192.png, icons/icon-512.png) — PWA installability blocked
- [ ] Verify ecosystem-hub.html on GitHub Pages (live fetch of index.json + status.json)
- [ ] Verify new God Script pages (specimens, vextreme-demo) on GitHub Pages — SW activation, language switching
- [ ] Missing-key fallback: show EN text instead of raw key string (pe-004)
- [ ] Extend LATTICE headers and lattice-map.json to lower-traffic files as they are touched

### State of the system at session end

God Script architecture is operational. 7 pages now wired (`vextreme-demo`, `ecosystem-hub`, `specimens`, 3 specimen pages, plus pre-existing demo/spec pages); `restoration-protocol` and `specimen-architectural-wisdoms` are still blocked. `sw-register.js` is now a core module (`default: true`) — every God Script page activates the SW automatically without explicit viewmodel entries. The LATTICE pattern (file headers + docs/lattice-map.json) makes the dependency graph traversable from any node. `docs/culture.md` codifies the operating intent. 149/149 tests. PR #31 merged.

<!-- [VXG RealForever] -->
