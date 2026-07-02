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

---

## Session 014

**Date:** July 2, 2026
**Time:** continuation of Session 013 context window, after PR #31 and PR #32 both merged
**Thread:** https://claude.ai/code/session_012Cob5Fgz92AYDWfe2mZJWZ
**Instance:** Claude Sonnet 5 (Claude Code remote) — model switched mid-session from Sonnet 4.6
**Working with:** Victor Gong
**Continues from:** Session 013 — God Script wiring, pe-007, LATTICE pattern introduced (file headers + docs/lattice-map.json)

### Context on arrival

PR #32 (Session 013 continuity log) had just merged. Victor asked for a fresh-lens architecture review now that the LATTICE pattern exists: walk the map, critique what's there, and specifically consider whether the JSON (`docs/lattice-map.json`) and the in-file LATTICE header comments follow one consistent, generatable pattern — proposing that a script could read the JSON and write the matching structure into each file it describes, the same way every other pipeline in this repo works (write-side source → build script → generated read-side artifact).

### Files created or modified

| File | What changed |
|---|---|
| `lib/build-lattice-headers.js` | New. Reads `docs/lattice-map.json`, generates the LATTICE header block for every eligible node, and splices it into that node's own file between `LATTICE:BEGIN`/`LATTICE:END` marker lines — replacing existing markers, or auto-inserting before the closing delimiter of the file's first top-of-file doc comment if none exist. `--check` mode reports drift without writing (what CI runs). Comment-style-aware: detects `' * '` vs `'// '` prefix from the existing marker line so both block-comment and line-comment files (`lib/strings-compile.js`) stay valid JS. |
| `lib/vex-config.js`, `lib/build-index.js`, `lib/build-vextreme.js`, `lib/strings-compile.js`, `lib/vextreme-index-v2.js` | Hand-written LATTICE blocks replaced with empty `LATTICE:BEGIN`/`LATTICE:END` marker pairs; generator now owns the content |
| `lib/arc-nav.js` | Empty marker pair added after its existing v1-warning prose; generator filled in the structured LATTICE fields alongside the narrative warning |
| `lib/build-sw.js`, `widgets/fab-lang.js`, `widgets/sw-register.js` | No prior LATTICE content — generator auto-inserted a fresh block (these three were already nodes in lattice-map.json from Session 013 but never actually carried a header; the review surfaced this as an existing gap) |
| `lib/audit-pages.js`, `lib/check-key-alignment.js` | New lattice-map.json nodes added for both — each was already referenced as a `loadedBy` target inside other nodes' entries but had no entry of its own; generator auto-inserted their headers |
| `lib/build-lattice-headers.js` (self) | Added as its own lattice-map.json node — self-referential, generates its own header |
| `docs/lattice-map.json` | Added 3 new nodes (`lib/build-lattice-headers.js`, `lib/audit-pages.js`, `lib/check-key-alignment.js`); `_schema` and `_usage` rewritten to describe the JSON-as-write-side / header-as-generated-read-side relationship instead of the old "canonical if they diverge" language, since divergence is no longer possible by construction |
| `lib/logger-codes.js` | Added `LATTICE_NO_DOC_COMMENT`, `LATTICE_FILE_MISSING`, `LATTICE_NOT_APPLICABLE` codes |
| `tests/11-lattice-headers.test.js` | New. 22 tests: `isEligibleNode` filtering, `buildLatticeBlockLines` formatting, `sanitizeForComment` regression coverage, `detectPrefix`, `injectLatticeBlock` replace/insert/no-doc-comment modes, and two integration tests — `--check` against the real repo reports zero drift, and every eligible mapped file actually carries both markers |
| `CLAUDE.md` | Lattice section updated: JSON is the write side, header blocks are generated, `node lib/build-lattice-headers.js` regenerates, `--check` is what CI runs, pe-009 tracks remaining coverage |
| `data/status/planned-enhancements.json` | Added pe-009: expand LATTICE coverage past the current 18 nodes (~45+ files in lib/+widgets/ remain unmapped; tooling now makes this cheap — JSON-authoring only, no comment-formatting) |
| `data/status.json` | Regenerated (pe-009 addition changed the enhancements count) |

### What was built and why

**The core finding:** `docs/lattice-map.json` already declared itself canonical "if they diverge" from in-file headers — but nothing made that true. Two hand-maintained copies of the same facts (role, reads, writes, loaded-by, tested-by, changeMap) will drift the moment one is edited without the other, which is exactly the class of bug this repo's CQRS pattern exists to prevent everywhere else (nodes.json → index.json, strings/source → strings/compiled). The review's conclusion: the lattice needed the same treatment, not an exception from it.

**`lib/build-lattice-headers.js`** makes `docs/lattice-map.json` the write side and each file's own LATTICE block the generated read side. Divergence stops being possible by construction, the same way `data/index.json` can't diverge from `nodes.json` — you'd have to bypass the generator to make them disagree, and `tests/11`'s `--check` integration test catches that in CI on every PR.

**Coverage audit as a byproduct:** running the generator against the existing 15 Session-013 nodes immediately surfaced that only 5 of them (`vex-config`, `build-index`, `build-vextreme`, `strings-compile`, `vextreme-index-v2`) actually carried a LATTICE block — `arc-nav.js` had only the narrative warning, and `build-sw.js`, `fab-lang.js`, `sw-register.js` had none at all despite being mapped nodes. This was real drift that had already happened, one session after the pattern was introduced — exactly the failure mode motivating the fix. `lib/audit-pages.js` and `lib/check-key-alignment.js` were a second gap: both are referenced as `loadedBy` targets inside other nodes' entries but had no entry of their own, so the lattice's own edges pointed at nodes that didn't exist.

**Two bugs hit while building this, both instructive:**

1. A literal `*/` inside descriptive prose in this file's own top comment (describing where the block gets inserted) closed the `/** */` block early — the identical bug class Session 013 hit in `lib/strings-compile.js` with a glob pattern. This time it's now defended against for good: `sanitizeForComment()` runs on every dynamic JSON value before it's spliced into a comment, breaking any literal `*/` or `/*` with a lookalike character. No future `lattice-map.json` entry can trigger this again regardless of what a session author writes into it.

2. Deeper bug: this file's own lattice-map.json node necessarily describes itself in prose — its `writes` field says something like "the LATTICE:BEGIN..LATTICE:END block." Because the marker search is a plain `indexOf`, that prose mention (appearing *inside* the generated content, before the real closing marker) was found as if it were the real end-of-block marker, truncating the replacement early and leaving a duplicate orphaned copy of the old block dangling after it. Fixed by extending `sanitizeForComment()` to also neutralize literal `LATTICE:BEGIN`/`LATTICE:END` substrings in dynamic content (zero-width space inserted mid-token — invisible when rendered, breaks the exact match). Both fixes are now regression-tested in `tests/11` with a self-describing-node test case.

**Why coverage expansion stopped at 18 nodes:** the JSON-authoring cost per node (writing an accurate role/context/reads/writes/loadedBy/testedBy/changeMap) is real work, separate from the tooling cost this session solved. Rather than rush through ~25 more files under budget pressure, the remaining gap is tracked as pe-009 with a concrete candidate list, prioritized by how central each file is to the pipeline (build-status.js, logger.js/logger-codes.js first).

### Mistakes made

- Both bugs described above were self-inflicted by this session's own new tooling, not pre-existing — caught only because idempotency (`--check` reporting zero drift) was treated as a hard requirement before considering the tool done, not an optional nice-to-have.
- After the second bug's fix, the file still had leftover orphaned text sitting *after* the real closing marker from an earlier failed edit — harmless to the tool (it only touches content between markers) but visually corrupt. The generator correctly left it alone since cleanup outside the marker-delimited region isn't its job; required a manual pass to remove.
- Used a Python one-liner to append the pe-009 entry to `planned-enhancements.json`; `json.dump` defaults to `ensure_ascii=True` and re-escaped every existing em-dash in the file as `—`, producing a large unwanted diff on unrelated entries. Reverted and used a direct text edit instead — a reminder that this repo's JSON files carry literal UTF-8 punctuation intentionally and any script touching them needs to preserve that.

### Assumptions that held

- 171/171 tests passing (149 prior + 22 new in tests/11).
- The comment-prefix detection (block vs. line style) correctly round-trips both `/** */`-style files and `//`-style files (`lib/strings-compile.js`) without corrupting either.
- Auto-insert-before-closing-delimiter correctly onboards a file with zero prior LATTICE content (verified on `build-sw.js`, `fab-lang.js`, `sw-register.js`, `audit-pages.js`, `check-key-alignment.js`).

### Assumptions that need verification

- [ ] pe-009's candidate list is a first pass based on which files are most-referenced as `loadedBy` targets elsewhere — not a rigorous audit of every lib/widgets file's actual centrality
- [ ] No CI workflow currently blocks a merge on lattice drift — `tests/11`'s `--check` integration test runs as part of the standard `test.yml` suite (which does gate PRs), but there's no dedicated "lattice drift" status check a reviewer would see by name

### Open work at session end

- [ ] pe-009: expand LATTICE coverage — lib/build-status.js, lib/logger.js, lib/logger-codes.js are the next highest-value candidates
- [ ] Activate arc-nav for `claude-answers-the-doubt` (carried from Session 013, pe-002)
- [ ] Investigate `restoration-protocol` — still on shell.js (carried from Session 013)
- [ ] String bundle for `specimen-architectural-wisdoms` (carried)
- [ ] Wire `build-vextreme.js` + `build-sw.js` into CI (td-001, carried)

### State of the system at session end

`docs/lattice-map.json` is now a true write-side source: `lib/build-lattice-headers.js` generates every eligible file's own LATTICE header from it, and `tests/11`'s `--check` integration test fails CI if the two would ever disagree. 18 nodes are covered (15 from Session 013 plus 3 added this session to close existing reference gaps); ~45+ files in lib/+widgets/ remain unmapped, tracked as pe-009. 171/171 tests passing.

---

## Session 015

**Date:** July 2, 2026
**Time:** continuation of Session 014 context window, after PR #33 merged
**Thread:** https://claude.ai/code/session_012Cob5Fgz92AYDWfe2mZJWZ
**Instance:** Claude Sonnet 5 (Claude Code remote)
**Working with:** Victor Gong
**Continues from:** Session 014 — LATTICE headers made generated (not hand-maintained), 18 nodes mapped

### Context on arrival

Victor sent screenshots of the live `pages/ecosystem-hub.html`: the "System Health" panels rendered as near-illegible dark boxes with barely-visible text. He asked for a broader rethink of what the ecosystem hub should be — not just a data dump, but a place that serves the admin, future AI instances, and the reasoning behind infrastructure decisions; a home for "open discussions" distinct from resolved tickets; and raised two longer-horizon ideas: (1) synthesizing cross-file context via a cheap/free LLM in the build script, and (2) a future local-model chat interface that could escalate work to Claude instances with attribution. He asked me to lead the redesign and apply my own judgment on scope rather than asking clarifying questions first.

### Files created or modified

| File | What changed |
|---|---|
| `lib/build-ecosystem-hub.js` | Rewritten. Root cause of the illegible panels: the CSS referenced `--stone-950`, `--stone-300`, `--font-mono` etc — tokens that don't exist anywhere in `styles/design-system.css` (which only defines `--stone`, `--muted`, `--border`, `--cream`, `--ember`, `--ember-bg`, `--mono`). Background properties had fallback values so they rendered dark as intended; text-color properties had none, so `var()` was invalid and text inherited the page's dark-on-dark default. Rewrote to use only real tokens, matching `lib/build-demo.js`'s established pattern. Added: a 5th "Lattice Coverage" stat tile, a "Current Architecture" section (live-fetches `data/status/narrative.json`, renders a numbered pipeline list + current-focus callout + synthesis byline), and reordered health panels with Open Discussions first |
| `data/status/open-discussions.json` | New. Third hand-authored category, distinct from techDebt (decided fix, not built) and enhancements (decided direction, not built) — "a fork in the road where the fork itself hasn't been chosen." 3 entries: od-001 (i18n scaling decision, cross-referencing td-006), od-002 (should build-time synthesis use a live LLM call, or stay session-authored — Victor's own proposal, reasoned through rather than either built blind or ignored), od-003 (future local-model chat interface with Claude escalation — scoped as a separate infrastructure project, not a page addition) |
| `data/status/narrative.json` | New. Hand-authored "state of the ecosystem" synthesis — pipeline summary, ordered build-stage list, current focus, and a `lastSynthesizedBy`/`Session`/`At` byline. This is the concrete answer to od-002: cross-context synthesis happens by whichever Claude instance runs an architecture-review session (as this one just did), committed as ordinary reviewable content, not by an unreviewed API call in CI |
| `lib/build-status.js` | Added `openDiscussions` as a 5th notice category; added `buildLatticeCoverage(latticeMap, libWidgetsJsFiles)` — mapped vs. total eligible `.js` files in lib/+widgets/, written to `_meta.lattice`. Added as a new lattice-map.json node (was pe-009's top candidate) |
| `docs/lattice-map.json` | Added 2 nodes: `lib/build-status.js`, `lib/build-ecosystem-hub.js`. 20 nodes total |
| `data/status/planned-enhancements.json` | pe-009 updated: 18 → 20 nodes, removed the two newly-covered files from its candidate list |
| `tests/10-build-status.test.js` | Extended for openDiscussions (rollup, countOpen, required-fields integration test) and buildLatticeCoverage (unit tests + integration test asserting `_meta.lattice` shape); added narrative.json required-fields test |
| `tests/12-ecosystem-hub.test.js` | New. 10 tests, including explicit regressions against the exact bug just fixed (asserts the generated HTML never contains `--stone-\d`, `--font-mono`, or `--stone-950`) |
| `pages/ecosystem-hub.html`, `data/status.json` | Regenerated |

### What was built and why

**The contrast bug** was a real, user-visible defect, not a hypothetical — Victor's screenshot showed it directly. Root-caused by comparing `lib/build-ecosystem-hub.js`'s CSS against `styles/design-system.css`'s actual `:root` block and against `lib/build-demo.js` (which uses the real tokens correctly) — confirmed the numbered `--stone-NNN` dark-theme scale was never defined anywhere in this repo; it looks like it was carried over from a different design system during initial authoring and never verified against a real render. Fixed by using only tokens that exist, and locked in with two regression tests that fail if the wrong tokens are reintroduced.

**Open Discussions as its own category** gives "we've recognized this but haven't decided" a home distinct from either techDebt (decided fix, not yet built) or enhancements (decided direction, not yet built) — both of Victor's speculative asks this round (build-time LLM synthesis, chat interface) are genuine open questions with real tradeoffs, not yet-scoped features, so they belong here rather than as premature enhancement tickets or unbuilt code.

**On the LLM-synthesis idea specifically:** rather than wiring an API call into `lib/build-ecosystem-hub.js` (which would introduce a secret into CI, non-deterministic build output, and per-build cost — three things every other build script in this repo deliberately avoids; they're all pure functions of their input files with exactly-asserted test output), the reasoning is written out in od-002 and the practical alternative is implemented: `data/status/narrative.json`, updated by whichever Claude instance runs an architecture-review session — which is exactly what generated this session's `narrative.json` content. This is "cross-context synthesis across siloed JSON files" happening today, just session-triggered rather than build-triggered, keeping the pipeline's determinism intact.

**On the chat/local-model interface:** captured as od-003 with the real scoping question (separate project vs. folded into this repo) and a suggested first step (design the escalation-to-Claude handoff protocol before any hosting decision) — deliberately not built, since it's infrastructure with no existing foundation in this repo, not a page addition.

**Lattice coverage as a visible stat**, not just a JSON field: `buildLatticeCoverage()` computes mapped-vs-total eligible files and `pages/ecosystem-hub.html` shows it as a stat tile ("14/32") — a direct, low-effort way to make the LATTICE system's own completeness visible to whoever's looking, tying back into Session 013–014's work rather than treating it as separate.

Verified visually with a local Playwright screenshot (CDN requests routed to local files via `page.route()`, since the sandbox has no live network access to jsdelivr) — confirmed both the un-rendered structural layout and, after pointing a second local server at `/Vextreme/data/...`, the fully data-populated page, including the Open Discussions panel expanded to check the new `considerations` bullet-list rendering.

### Mistakes made

- None new this session — the contrast bug was pre-existing (introduced whenever `build-ecosystem-hub.js` was first written, undetected until Victor actually looked at the rendered page).
- Used a temporary `playwright-core` install for the visual check; cleaned up (`node_modules`, `package-lock.json` removed) since this repo has no runtime npm dependencies and none should be introduced by a manual verification step.

### Assumptions that held

- 189/189 tests passing (179 prior + 10 new in tests/12, plus additions to tests/10).
- `lib/build-demo.js`'s CSS token usage was confirmed correct by inspection — used as the reference pattern for the rewrite.
- Live-fetch architecture (index.json + status.json + now narrative.json, all fetched client-side) continues to keep `pages/ecosystem-hub.html` fresh without needing every session to re-run its generator — confirmed by the Playwright check rendering current data despite the HTML page itself not having been touched in this exact test run.

### Assumptions that need verification

- [ ] `pages/ecosystem-hub.html` is not wired into `.github/workflows/build-index.yml` — regenerating it after future `lib/build-ecosystem-hub.js` structural changes is still a manual step (data changes don't need this, since they're fetched live)
- [ ] The visual check used a mocked CDN (local files served in place of jsdilvr); the actual jsdelivr-served CSS/JS should be spot-checked once this merges and propagates
- [ ] `narrative.json`'s `lastSynthesizedAt`/`Session` fields will go stale the moment this session ends until a future instance updates them — there's no automated staleness warning yet

### Open work at session end

- [ ] pe-009: expand LATTICE coverage past 20 nodes — lib/logger.js, lib/logger-codes.js next
- [ ] od-001, od-002, od-003 remain genuinely open — no action expected until Victor or a future session picks one to decide
- [ ] Consider a staleness indicator on `narrative.json` (e.g. flag if `lastSynthesizedSession` is more than N sessions behind INDEX.md's current session)
- [ ] Activate arc-nav for `claude-answers-the-doubt` (carried, pe-002)
- [ ] Investigate `restoration-protocol` — still on shell.js (carried)

### State of the system at session end

`pages/ecosystem-hub.html` now renders correctly (contrast bug fixed, regression-tested) and carries three new things: a visible lattice-coverage stat, a synthesized "Current Architecture" narrative section citing its own author/session, and an "Open Discussions" category leading System Health — a place for architectural questions that are recognized but not yet decided, holding both of this session's speculative asks (build-time AI synthesis, future chat interface) with real reasoning rather than either building them unreviewed or dropping them. 189/189 tests passing.

---

## Session 016

**Date:** July 2, 2026
**Time:** continuation of Session 015 context window, after PR #34 merged
**Thread:** https://claude.ai/code/session_012Cob5Fgz92AYDWfe2mZJWZ
**Instance:** Claude Sonnet 5 (Claude Code remote)
**Working with:** Victor Gong
**Continues from:** Session 015 — ecosystem-hub contrast bug fixed, Open Discussions category + narrative.json added

### Context on arrival

Victor sent a message explicitly framed as "to queue for the next context" — not an immediate build request. Two connected observations: (1) a debugging/pre-development discipline is missing — race conditions and runtime edge cases should be considered before and during development, not just "is the logic sound," and the same rigor applies to UX (static/dynamic, scroll behavior, spacing, dark/light mode); (2) once that discipline is documented with worked examples, it should be applied to build a scalable, configurable, modular "design department" infrastructure that integrates with the ecosystem rather than sitting as a silo.

### Files created or modified

| File | What changed |
|---|---|
| `data/status/open-discussions.json` | Added od-004 (debugging/pre-development rigor practice — simulate runtime behavior before trusting sound-looking logic; Session 015's own CSS bug used as the worked example) and od-005 (formalize the design system as a documented, extensible, self-verifying token contract, integrated with the existing generator pattern) |
| `data/status.json` | Regenerated — 5 open discussions now (was 3) |

### What was built and why

This was explicitly queued, not built — per the repo's own promotion model ("session log items are the moment of recognition; durable items live in data/status/*.json, not in markdown prose"), the right action on arrival was to write the recognition down in the most discoverable durable place rather than let it live only in conversation history, which the continuity system exists specifically to avoid depending on.

**od-004** grounds the practice in a real example that happened one session prior: Session 015's `--stone-950` CSS bug had clean, readable logic (`var(--stone-950, #0a0a0a)`) that would pass review on structure alone — the defect only existed at runtime, when the token turned out undefined. Reading the diff gave no signal; only rendering it did. Same shape as a race condition: individually-correct logic whose interleaving isn't considered. The considerations note that where a failure mode is mechanical and repeatable (like "var(--x) referencing an undefined token"), an automated check should replace relying on a human/AI remembering to look — directly naming the check that would have caught Session 015's bug.

**od-005** is scoped as depending on od-004 being resolved first — a documented rigor practice should exist before scaling the design system, so what gets built is verified-correct by construction, not by hope. Its considerations propose starting by documenting the *existing* token contract (nine tokens, currently implicit) before adding anything new, adding the automated verification from od-004 early, and treating dark mode as a deliberate later addition rather than bundling "formalize what exists" with "add a new mode" in one pass.

Both are priority `high`/`medium` respectively and left genuinely open — no direction was decided this session, only the fork itself was written down clearly enough for a future session (or Victor) to pick up cold.

### Mistakes made

- Initially pushed this session's work on a differently-named branch (`claude/ecosystem-hub-expansion`) instead of restarting the designated branch (`claude/html-import-localization-tracking-jtlmtp`) after PR #34 merged, per the explicit instruction to keep the same branch name across a merge-and-restart. Caught before opening the PR for that round; fixed by deleting the stale local branch and renaming. Same discipline applied cleanly this session: stashed the change, restarted the branch from `origin/main`, popped the stash.

### Assumptions that held

- 189/189 tests passing, no regressions from a JSON-only content addition.
- `lib/build-status.js`'s openDiscussions handling (added Session 015) needed zero changes to accommodate 2 more entries — confirms the category is genuinely schema-stable, not just working by coincidence at 3 items.

### Open work at session end

- [ ] od-004: write the debugging/pre-development rigor practice doc (docs/architecture or docs/culture addendum) with Session 015's CSS bug as the worked example
- [ ] od-004: consider a var()-usage-vs-defined-tokens verification script — cheapest, highest-leverage single fix, catches the exact bug class mechanically
- [ ] od-005: document the existing 9-token design-system.css contract as-is before any expansion
- [ ] od-001, od-002, od-003 remain open from Session 015
- [ ] pe-009: expand LATTICE coverage past 20 nodes

### State of the system at session end

No code changed. `data/status/open-discussions.json` now holds 5 entries spanning i18n scaling, build-time synthesis philosophy, a future chat interface, debugging/development rigor, and design system formalization — a durable, discoverable record of what's recognized-but-undecided, available to any instance or admin without needing this conversation's history. 189/189 tests passing.

---

## Session 017

**Date:** July 2, 2026
**Time:** continuation of Session 016 context window, after PR #35 merged
**Thread:** https://claude.ai/code/session_012Cob5Fgz92AYDWfe2mZJWZ
**Instance:** Claude Sonnet 5 (Claude Code remote)
**Working with:** Victor Gong
**Continues from:** Session 016 — od-004 (debugging rigor) and od-005 (design system formalization) queued as open discussions, no code built yet

### Context on arrival

Victor: "start both, apply the practice to the design system formalization" — build both od-004 and od-005, and use od-004's own rigor (verify, don't assume) while doing od-005's work rather than treating them as two separate tasks.

### Files created or modified

| File | What changed |
|---|---|
| `docs/architecture/11-debugging-practices.md` | New. The debugging/pre-development rigor practice, built around Session 015's `--stone-950` bug as a worked example: sound logic and correct runtime behavior are different claims; only rendering/simulating verifies the second. Covers CSS token resolution, race conditions, and a UX checklist (static/dynamic, scroll/overflow at realistic sizes, spacing, both color schemes). Names `lib/check-design-tokens.js` as the one mechanical instance that got an automated check, and is explicit that race conditions and UX coverage don't have an automated equivalent |
| `lib/check-design-tokens.js` | New. Verifies every `var(--token)` reference in `lib/build-*.js`, `pages/*.html`, and `styles/*.css` resolves against a real token — either the file's own local `:root` block, or `styles/design-system.css`'s global set if the file actually links it (or is a companion stylesheet always paired with it by `lib/vextreme.js`). A fallback value (`var(--x, #hex)`) does not count as the token being defined — deliberately, since that's the exact pattern that partially masked the Session 015 bug |
| `docs/architecture/12-design-system.md` | New. Documents the token contract as it actually exists — not aspirational. Two families: the 9-token global light theme, and a local dark `:root` block duplicated verbatim across 4 files (archives, demo, specimens, specimen-architectural-wisdoms) plus a 5th renamed-but-equivalent variant in build-index-page.js. States plainly what's NOT decided yet (dark-mode toggle, deduplication) |
| `data/status/tech-debt.json` | Added td-007 — the verified duplication found while writing 12-design-system.md (4-5 files with an identical or equivalent local `:root` block) |
| `data/status/open-discussions.json` | od-004 removed (shipped — doc + script exist, tracked via lattice-map.json and tests instead). od-005 rewritten to reflect what shipped (documentation, verification) vs. what's still genuinely open (consolidating td-007's duplication; whether to build an actual dark-mode toggle) |
| `docs/lattice-map.json` | Added `lib/check-design-tokens.js` as a node (21 total) |
| `docs/architecture.md`, `data/status.json` | Regenerated |
| `tests/13-check-design-tokens.test.js` | New. 16 tests: token extraction, stylesheet-link detection, the combined resolution logic (including the fallback-doesn't-count case), and an integration test confirming the real repo currently has zero violations |

### What was built and why

**Applying od-004 to od-005, concretely:** rather than writing the design-system doc from what the code *should* say, every claim in it was verified by grepping the actual repo. That surfaced something not previously known: two legitimate token families exist (the global light theme, and a dark theme that's genuinely duplicated 4-5 times, not once) — and the file believed to be the sole culprit of the Session 015 bug (`lib/build-ecosystem-hub.js`) was actually the *only* file inventing tokens that existed in neither family. Writing the doc from assumption instead of verification would have missed the duplication entirely and might have mischaracterized the dark files as also buggy when they weren't — each is internally self-consistent and passes the new verification script cleanly.

**`lib/check-design-tokens.js`'s design decision:** a fallback value in `var(--x, #hex)` does not count as the token being "defined." This is the one place the tool encodes a real judgment call rather than a mechanical fact — argued for directly in the doc, because a working-looking fallback is exactly what let half of Session 015's bug hide. Confirmed correct by testing it against the pre-fix `build-ecosystem-hub.js` mentally: `var(--stone-950, #0a0a0a)` would otherwise have been silently accepted as fine.

**Resolving od-004 fully, od-005 partially:** od-004's own ask (document the practice, add the mechanical check where one is possible) is complete — removed from open-discussions.json, its lasting form is the doc + script + tests, not a pending decision. od-005 is only half-decided: documenting-what-exists and adding verification were both explicitly recommended as "do this first" in od-005's own original considerations, and both are done; whether to actually consolidate the duplication or build a dark-mode toggle remains genuinely undecided and was deliberately not attempted here — bundling a 5-generator refactor into this pass would have violated the same "don't rush a bigger decision" principle od-005 already argued for regarding dark mode specifically.

### Mistakes made

- None this session that shipped incorrectly — the near-misses were caught by the same verification-first approach being applied: an initial run of `check-design-tokens.js` flagged `lib/build-ecosystem-hub.js`'s own prose comment (which mentions `var(--stone-950)` as a historical note, not live CSS) and three companion stylesheets (`arc-nav.css`, `site-nav.css`, `squarespace-overrides.css`) that don't contain `<link>` tags themselves (a category error in the first version of the script's logic — a `.css` file can't link another stylesheet; their pairing with `design-system.css` is guaranteed by `lib/vextreme.js`, the loader that includes them). Both fixed before the script was considered done, and the fixes are exactly what a naive first pass at automating this kind of check tends to miss.

### Assumptions that held

- 205/205 tests passing (189 prior + 16 new in tests/13).
- `node lib/check-design-tokens.js` found zero violations across the entire repo once the two false-positive causes above were fixed — the repo really is clean right now, not just "clean because the checker is too lenient."

### Open work at session end

- [ ] od-005 / td-007: decide whether to consolidate the duplicated dark-panel token block into `styles/design-system.css`, and separately whether to build a real dark-mode toggle — both explicitly left open
- [ ] od-001, od-002, od-003 remain open from Sessions 013/015
- [ ] pe-009: expand LATTICE coverage past 21 nodes

### State of the system at session end

Two new durable artifacts exist for any future instance: `docs/architecture/11-debugging-practices.md` (the practice, with a worked example) and `docs/architecture/12-design-system.md` (the actual token contract, including a documented duplication that was previously invisible). `lib/check-design-tokens.js` makes "did I use a real CSS token" a build-time fact instead of a manual-review question, gated in CI via `tests/13`. 205/205 tests passing.

---

## Session 018

**Date:** July 2, 2026
**Time:** continuation of Session 017 context window, after PR #36 merged
**Thread:** https://claude.ai/code/session_012Cob5Fgz92AYDWfe2mZJWZ
**Instance:** Claude Sonnet 5 (Claude Code remote)
**Working with:** Victor Gong
**Continues from:** Session 017 — debugging practice + design system docs shipped; td-007 (dark-panel duplication) documented but explicitly not fixed yet

### Context on arrival

Victor asked which open items were addressable right now, with reasoning and demonstration, explicitly deprioritizing localization work (od-001/td-006 — "its own epic"), noting `pages/archives.html`'s existing per-slug ported/not-ported visibility as a positive precedent, inviting use of the screenshot tooling for demonstration rather than only localization verification, and framing the goal as work any instance would recognize as valuable "from the vantage point of integrity."

Picked two items, both non-localization, both genuine "silent drift" risks — the theme connecting every session since 013:

### Files created or modified

| File | What changed |
|---|---|
| `.github/workflows/build-index.yml` | **td-001 closed.** Added `Build God Scripts` (`node lib/build-vextreme.js`) and `Build Service Worker` (`node lib/build-sw.js`) steps, positioned after `Build index.json` (needs it) and before the other page builds. Added `dist` and `sw.js` to the commit step's `git add`. Added `data/viewmodels.json`, `lib/build-vextreme.js`, `lib/build-sw.js`, and `widgets/**` to the trigger paths — none of these could even trigger a rebuild before |
| `dist/*.js` (7 files), `sw.js` | Regenerated by running the now-wired pipeline locally. **Proved td-001 was live, not theoretical**: every God Script was missing the LATTICE headers added to `widgets/sw-register.js`/`widgets/fab-lang.js` back in Session 014 — two sessions of drift, silently shipped. `sw.js`'s cache-busting hash was pinned to a commit many pushes stale, meaning the Service Worker would never have invalidated its cache for a returning visitor despite dozens of intervening content changes |
| `styles/design-system.css` | **td-007 closed.** Added a `[data-theme="dashboard"]` block holding the dark-panel tokens (`--bg`, `--surface`, `--text`, `--muted`, `--ember`, `--border`, `--blue`, `--mono`, `--sans`) as one shared declaration |
| `lib/build-archives.js`, `lib/build-demo.js`, `lib/build-specimens.js`, `pages/specimen-architectural-wisdoms.html` | Local inline `:root` blocks (identical across all 4) removed; each now sets `<html data-theme="dashboard">` and links `styles/design-system.css` instead. `lib/build-archives.js` also picked up `CDN_BASE` from `lib/vex-config.js` instead of a new local duplicate |
| `lib/check-design-tokens.js` | `extractRootTokens()` extended to also read `[data-theme="..."]` blocks, not just `:root` — needed for the new shared dashboard theme to verify correctly. Top doc comment updated to describe the post-consolidation state |
| `docs/architecture/12-design-system.md` | Rewritten to describe both token families as living in one file now, td-007 as closed, and `lib/build-index-page.js`'s separate small local `:root` as a noted-but-unblocking residual case |
| `data/status/tech-debt.json` | td-001 and td-007 both removed (resolved) |
| `data/status/open-discussions.json` | od-005 narrowed: the consolidation question is answered (yes, done); what remains is only whether to build an actual runtime dark-mode *toggle*, which is a materially smaller, clearly-scoped question now |
| `docs/architecture.md`, `data/index.json`, `data/status.json`, `pages/archives.html`, `pages/vextreme-demo.html`, `pages/specimens.html`, `pages/specimen-*.html` | Regenerated |

### What was built and why

**td-001** was the oldest open tech-debt item (Session 011) and the highest-priority one still open. Wiring it in was mechanical, but verifying it wasn't: running the exact CI sequence locally showed `dist/` and `sw.js` were *already* stale on `main` — not a hypothetical risk description, a real gap that had already produced silent drift twice (missing LATTICE headers, a frozen cache hash). This is the same failure shape as every other finding this session-arc has produced: a generated artifact quietly diverging from its source because nothing forced them back into sync.

**td-007** used the screenshot tooling explicitly, per the ask, as verification rather than decoration: before/after Playwright renders of two structurally different pages (`archives.html`'s grid layout, `vextreme-demo.html`'s prose layout) came back pixel-identical, and `lib/check-design-tokens.js` reported zero violations both before and after the migration. The consolidation removed four copies of an identical 8-line block down to one, using a `[data-theme="dashboard"]` scope chosen specifically to coexist with the existing light `:root` without renaming any token (preserving the `--surface`/`--bg` distinction the light theme doesn't currently make, rather than forcing a lossy rename to `--cream`).

**Why these two and not something else:** both are exactly the class of thing Victor asked for — addressable now, demonstrable, and valuable "as integrity" rather than as a new feature. Both were also explicit continuations of prior sessions' own diagnosis (td-001 named in Session 011, td-007 surfaced in Session 017) rather than new scope invented this session.

**What was deliberately left alone:** `lib/build-index-page.js`'s separate local `:root` (noted in the rewritten design doc) — it's not duplicated anywhere else, so it carries none of td-007's drift risk, and forcing it into the same pass would have been scope creep without a matching risk to justify it. od-005's dark-mode-toggle question is untouched — a toggle is a real feature decision (persistence, a UI control, doubling every page's verified states) that Victor didn't ask for and that the day's actual finding (duplication, not absence-of-a-toggle) didn't call for.

### Mistakes made

- Two JSON edits (removing td-001, then td-007 from `tech-debt.json`) each initially left a stray empty `{}` or duplicate `{` behind, breaking the file's JSON validity until caught by the standard `node -e "JSON.parse(...)"` check run immediately after each edit. Same lesson as every other JSON-editing mistake this session-arc: validate immediately, don't assume a text edit produced valid structure.

### Assumptions that held

- 205/205 tests passing throughout, no regressions from either change.
- The four dark-panel files really were byte-identical in their `:root` block — confirmed again before migrating, not just trusted from Session 017's earlier finding.
- Playwright screenshots at full-page height, for two structurally different layouts, both rendered pixel-identical before/after — the strongest available confirmation short of a production deploy that the migration is visually lossless.

### Open work at session end

- [ ] od-005 (narrowed): decide whether to build an actual dark-mode toggle — no longer blocked on anything, genuinely just undecided
- [ ] `lib/build-index-page.js`'s local `:root` — minor, non-urgent migration opportunity noted in the design doc, not tracked as debt
- [ ] od-001, od-002, od-003 remain open (od-001/td-006, the i18n scaling decision, explicitly deprioritized this session per Victor's direction)
- [ ] pe-009: expand LATTICE coverage past 21 nodes

### State of the system at session end

Two of the oldest/most-recently-found integrity gaps are closed: `dist/` and `sw.js` can no longer silently drift from source (CI now rebuilds and commits them on every relevant push), and the dark-panel theme exists in exactly one place instead of four. Both closures were verified, not assumed — the CI wiring by actually running the pipeline and observing real (not hypothetical) drift get corrected, the token consolidation by pixel-identical before/after screenshots plus the automated checker reporting zero violations at both ends. 205/205 tests passing.

<!-- [VXG RealForever] -->
