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

<!-- [VXG RealForever] -->
