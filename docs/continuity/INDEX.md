# VEXTREME — Continuity Index

**Read this file first. Always.**

This is the entry point for any AI instance (or human) continuing work on
this codebase. It tells you where you are, what's open, and where to go next.
It is maintained by convention — each session updates the Current State section
and the Open Work list before closing.

---

## If you are arriving cold

1. Read **Current State** below — one paragraph on where the system stands
2. Read **Open Work** — what was unfinished when the last session ended
3. Open the current batch file (listed under **Batch Registry**) and read
   the most recent session entry
4. Cross-reference `docs/README.md` for architecture decisions and load order
5. Use `docs/test-playground.html` (slug: `test-playground`) to verify the
   live system before touching anything

Do not start new work without reading the most recent session. Do not assume
the system is in the state described in the README — the README documents
intent, the continuity log documents reality.

---

## Current State

*As of Session 016 — July 2, 2026*

**Session 016 addition:** No code changed — a queued-for-later directive from Victor was written down as two
new entries in `data/status/open-discussions.json` rather than left only in conversation history. od-004:
adopt a debugging/pre-development rigor practice — simulate runtime behavior and edge cases (race conditions,
UX states, dark/light mode) before trusting that sound-looking logic means correct output; grounded in
Session 015's own `--stone-950` CSS bug as the worked example (clean logic, but the defect only existed at
runtime). od-005: formalize `styles/design-system.css`'s implicit 9-token contract into a documented,
extensible, self-verifying design system — explicitly scoped as depending on od-004 first. Both left open;
5 open discussions total now. 189/189 tests passing (unchanged).

**Session 015 addition:** Fixed a real, user-visible bug in `pages/ecosystem-hub.html` — the System
Health panels rendered with near-invisible text because the CSS referenced `--stone-950`/`--font-mono`
tokens that `styles/design-system.css` never defines. Rewritten to use the site's real tokens (`--stone`,
`--muted`, `--border`, `--cream`, `--ember`, `--mono`), with regression tests locking in the fix. Added a
5th status category, `openDiscussions` (`data/status/open-discussions.json`) — architectural questions
recognized but not yet decided, distinct from techDebt/enhancements. `data/status/narrative.json` is a new
hand-authored "state of the ecosystem" synthesis, updated by whichever Claude instance runs an architecture
review — the deliberate alternative to wiring a live LLM call into the build pipeline (reasoned through in
od-002; would introduce a CI secret, cost, and non-determinism this repo has avoided everywhere else). Lattice
coverage (`docs/lattice-map.json` nodes vs. total eligible files) is now a computed, visible stat: 14/32.
`lib/build-status.js` and `lib/build-ecosystem-hub.js` added as lattice nodes (20 total). 189/189 tests passing.

**Session 014 addition:** `docs/lattice-map.json` is now a true CQRS write side — `lib/build-lattice-headers.js`
generates the LATTICE header block inside every eligible node's own file from the JSON, so the two
can no longer drift apart by hand-editing one and forgetting the other. `node lib/build-lattice-headers.js
--check` reports drift without writing; `tests/11-lattice-headers.test.js` runs that check as part of
standard CI. Building this surfaced that Session 013's own lattice pattern had already drifted one
session in (3 of 6 eligible mapped files had no header at all) and that 2 files referenced elsewhere
in the map as `loadedBy` targets had no node of their own — both fixed. Two self-inflicted bugs during
authoring (a literal `*/` closing a block comment early, and the tool's own self-describing JSON entry
confusing its own marker search) are now defended against with a `sanitizeForComment()` guard and
regression-tested. Coverage is 18 of ~45+ lib/widgets files; remaining expansion tracked as pe-009.
171/171 tests passing.

**Session 013 addition:** God Script architecture is operational for 7 pages. LATTICE pattern
introduced: file-level `role/reads/writes/loaded-by/tested-by/CHANGE MAP` headers on the 5
highest-traffic lib files, plus `docs/lattice-map.json` — a centralized 14-node dependency
graph for lateral navigation ("what else breaks?") before depth navigation ("how does this
work?"). `sw-register.js` is now a unified feature registry `default: true` core module
(pe-007) — every God Script page activates the SW without explicit viewmodel entries.
`docs/culture.md` codifies the mission and operating principles (read before CLAUDE.md).
`lib/audit-pages.js` is the canonical wiring-status tool (`node lib/audit-pages.js`).
`lib/vextreme-index-v2.js` (v2 arc nav widget) now has VEX_STRINGS_EN fast path and clear
cross-references to `lib/arc-nav.js` (v1 Squarespace-era, not for God Script pages). 5 LATTICE
integrity tests added. 149/149 tests passing. PR #31 merged.

**Session 012 addition:** `data/status.json` is a new generated CQRS artifact at the same
layer as `index.json` — machine-readable operational state across four notice categories:
translation debt (auto-generated from strings manifest, demo fixture gaps marked intentional),
tech debt, planned enhancements, and unverified assumptions (all hand-authored in
`data/status/*.json`). `lib/build-status.js` assembles them. `pages/ecosystem-hub.html`
is the first consumer: a developer dashboard that live-fetches `index.json` + `status.json`
and renders content map stats, page registry with GitHub source links + copy-slug buttons,
and four expandable health panels. 23 new tests in `tests/10-build-status.test.js`.
142/142 tests passing. PR #26 merged (Session 011 continuity log + batch fix + lessons
scalability policy). PR #27 CI green. See Session 012 in Batch 002 for slug rename blast
radius analysis (7 layers touched, missing HTML dead link scanner tracked as td-003).

**Session 011 addition:** The God Script architecture is complete and generating output.
`lib/build-vextreme.js` assembles one IIFE per page into `dist/vextreme-{slug}.js`,
setting `window.VEX_VIEWMODEL`, `window.VEX_STRINGS_EN`, `window.VEX_STRING_SCOPES`,
`window.VEX_STRING_CATEGORY`, and inlining feature widget source — one HTTP request per
page, EN strings already inlined, JA fetched lazily. `widgets/fab-lang.js` (renamed from
lang-fab.js) skips the EN fetch when `window.VEX_STRINGS_EN` is already set by a God
Script. `lib/build-sw.js` generates `sw.js` at repo root: cache-first SW, git-hash-keyed
cache name (`vextreme-v1-{hash}`), HTML never cached, old caches auto-deleted on activate.
`manifest.json` enables PWA installability (icons not yet committed). `lib/check-key-alignment.js`
+ CI workflow post a non-blocking alignment table on every PR (88 nodes, 16 arcs, zero drift
on first run). `config/lessons/` now holds 4 distilled lessons from recent architectural
sessions. `pages/specimen-architectural-wisdoms.html` added as a 4-card architectural
decisions specimen. 119/119 tests passing. PRs #23, #24, #25 all merged.

**Session 010 addition:** All semantic constants in the build pipeline, strings pipeline,
and browser widget are now defined in `lib/vex-config.js` — the single source of truth.
`Category`, `Language`, `Scope`, `CDN_BASE`, path-derivation functions (`scopeRelPath`,
`scopeUrl`, `flatBundleUrl`), `Path`, and `WindowGlobal` are all exported from one file.
All 8 build scripts and the strings pipeline import from it. `widgets/lang-fab.js`
(a browser IIFE, cannot `require()`) inlines the values as named local vars. The duplicate
`scopeRelPath` function that existed in three places is now canonical in vex-config.js.
15 new tests in `tests/05-vex-config.test.js` include grep audits that will fail CI if
a future commit reintroduces standalone `'demo'` or `'ja'` magic strings in build scripts.
54/54 tests passing. PR #20 merged. Zero behavior change. See Session 010 in the active
batch file for full reasoning including the PR sequencing toward the slug-driven end state.

**Session 009 addition:** Compiled scope bundles are now organized by content lifecycle
category under `scopes/{category}/` subdirectories, derived deterministically from
`_meta.category` on string source files and `window.VEX_STRING_CATEGORY` on pages.
Four categories: `system` (common strings, always loaded), `production` (real content
pages, default), `demo` (architecture reference pages), `staging` (reserved). Path
derivation is symmetric — `lib/strings-compile.js` and `widgets/lang-fab.js`'s
`scopeUrl()` apply the same rule, so paths are inspectable in the filesystem without
any runtime lookup. PR #19 merged. See Session 009 in the active batch file
for the full reasoning including the three options evaluated and Kimi's co-architect
input on scalability preparation.

**Session 008 addition:** New `pages/specimens.html` dashboard + 3 specimen fixture
pages (`specimen-full-translation`, `specimen-partial-translation`,
`specimen-smallest-miss`), generated by `lib/build-specimens.js` from
`data/specimens.json`. Each isolates one localization state and pairs it with a
process-map diagram of the pipeline stage that produces or catches that state (test
suite / screenshot verification / strings-check). The smallest-miss specimen's staleness
flag is real — triggered live via a real two-compile `strings-check.js` run, not
hand-written. Linked from `vextreme-demo.html` ("see it in a minute, not a pitch") and
back. Screenshot verification caught a real scope-declaration bug before this was marked
done — see Session 008 in the active batch file.

**Session 007 addition:** `lib/strings-compile.js` now writes per-scope compiled bundles
(`data/strings/compiled/scopes/{scope}.{lang}.json`) alongside the existing flat
`strings.{lang}.json` bundle — additive, not a replacement. A page opts in by declaring
`window.VEX_STRING_SCOPES` before `widgets/lang-fab.js` loads, fetching only its own
scope(s) + `common` instead of every string in the project. `pages/vextreme-demo.html` is
the first (and currently only) adopter. Also defines a variant/staging-file convention
(`_meta.variant` on a source file) for A/B copy tests or in-progress translations that
shouldn't touch production strings until explicitly requested. See
`docs/architecture/06-i18n.md`, "Scaling past one bundle," and Session 007 in the active
batch file for the full reasoning — including a process note about commit messages not
being a push channel to Claude the way PR comments are.

**Session 006 addition:** New client-facing demo page `pages/vextreme-demo.html`
(generated by `lib/build-demo.js`) — architecture explanation, a Vextreme-vs-conventional
comparison table, a section that live-fetches `data/index.json` in the browser to prove
the stats aren't hardcoded, and links to `archives.html` (in-progress) and
vextreme24.com (production) as an explicit before/after pair. Reachable via a new
`widgets/demo-fab.js` orb next to the existing lang-fab. `docs/architecture/08-continuity.md`
now formally defines "session." Not yet verified live in a browser — see Session 006 in
the active batch file for the full open-work list.

**Session 005 addition:** `pages/archives.html` now tracks localization status
(not just porting status) per slug, rendered as language chips ("full" vs "partial"
coverage) next to each ported cell, plus a per-language localized-count stat in
site-meta. Logic lives in `lib/build-archives.js`, right next to the pre-existing
`ported` state check — reads `data/strings/compiled/manifest.json` for per-key
language coverage, no new data files or pipeline stages. See Session 005 in the
active batch file for the full reasoning, including a docs/reality divergence
flagged in `06-i18n.md`'s page-scope key convention (`pages.` prefix in use;
not what the doc describes).

**The foundation is complete.** Sessions 001-002 built the Squarespace loader system
(still in repo, not actively developed). Sessions 003-004 built the full v2 GitHub
Pages system. The next phase is content — adding HTML pages and wiring them into
the established infrastructure.

**v2 system components (all active):**
- `data/nodes.json` — 88 canonical content nodes, write-side source of truth
- `data/arcs-v2.json` — 16 arc definitions with priority, sections, and parent URLs
- `lib/build-index.js` — builds `data/index.json` (slugMap + arcMap + arcMeta + supportedLangs)
- `lib/build-archives.js` — builds `pages/archives.html`
- `lib/build-sitemap.js` — builds `sitemap.xml`
- `lib/build-index-page.js` — builds `index.html`
- `lib/vextreme-index-v2.js` — browser library: arc nav rendering
- `widgets/lang-fab.js` — browser widget: floating language selector FAB
- `data/strings/source/` — i18n string sources (write side)
- `data/strings/compiled/` — compiled EN + JA bundles (generated)
- `scripts/screenshot-page.js` — Playwright visual verification utility
- `.github/workflows/build-index.yml` — CI pipeline
- `lib/vex-config.js` — named constants + path-derivation functions, single source of truth for all semantic strings
- `.github/workflows/test.yml` — 54-test suite on every PR (39 pipeline + 15 vex-config)

**Session 004 additions (merged to main, PRs #12 and #13):**
- `widgets/lang-fab.js` — transparent round FAB, iOS scroll-wheel flag picker, reads
  `supportedLangs` from index.json, only shows when 2+ languages available, swaps
  `[data-i18n]` elements on select, persists to localStorage
- `supportedLangs` in index.json — derived at build time from compiled strings directory
- `docs/architecture/10-directory-structure.md` — formal definitions of lib/ vs components/ vs widgets/
- `data-i18n` attributes on layers 01–05 of claude-answers-the-doubt, full EN + JA translations,
  intentional missing-key on layer.04.qa.04.answer to test fallback behavior
- `scripts/screenshot-page.js` — Playwright screencrawler: local server + CDN interception +
  before/after screenshots. PR descriptions now include visual comparison tables.

**Verified via screenshot (Playwright):** FAB mounts, scroll wheel opens, language swap
works on layers 01–05, layers 06–07 stay English (no data-i18n = no swap), missing-key
shows key string not crash. Screenshots committed to docs/screenshots/.

**Not yet verified live:** archives.html auto-rebuild, index.html root nav on github.io.

**IMPORTANT for arriving instances:** Do not conflate v1 Squarespace system (Sessions 001-002)
with v2 GitHub Pages system (Sessions 003-004+). Active development is v2. The next work
is adding content pages — infrastructure is ready.

**Update this paragraph at the start of each new session** to reflect actual current
system state — not aspirational state.

---

## Open Work

*Updated Session 016 — July 2, 2026*

**v2 system (active):**
- [ ] od-004: debugging/pre-development rigor practice — write the doc, consider a var()-usage verification script (Session 016)
- [ ] od-005: formalize design-system.css's token contract — document existing 9 tokens first, depends on od-004 (Session 016)
- [x] Fixed illegible ecosystem-hub.html panels — CSS referenced undefined `--stone-950`/`--font-mono` tokens; rewritten to use styles/design-system.css's real tokens, regression-tested (Session 015)
- [x] Added `openDiscussions` status category — architectural questions recognized but not yet decided; data/status/open-discussions.json, 3 entries (Session 015)
- [x] Added data/status/narrative.json — session-authored "state of the ecosystem" synthesis, the deliberate alternative to a live LLM call in the build pipeline (see od-002) (Session 015)
- [x] Lattice coverage now computed and shown as a stat on ecosystem-hub.html (14/32); lib/build-status.js + lib/build-ecosystem-hub.js added as lattice nodes, 20 total (Session 015)
- [ ] od-001/od-002/od-003 are open — no action expected until explicitly picked up (Session 015)
- [x] LATTICE headers are now generated, not hand-maintained — `lib/build-lattice-headers.js` writes each eligible node's header from `docs/lattice-map.json`; `--check` mode + `tests/11` enforce zero drift in CI (Session 014)
- [x] Closed 2 lattice reference gaps — `lib/audit-pages.js`, `lib/check-key-alignment.js` added as nodes (were `loadedBy` targets with no entry of their own); 3 files that were mapped but missing a header (`build-sw.js`, `fab-lang.js`, `sw-register.js`) now have one (Session 014)
- [ ] pe-009: expand LATTICE coverage past 18 nodes — lib/build-status.js, lib/logger.js, lib/logger-codes.js next (Session 014)
- [x] LATTICE pattern — LATTICE + CHANGE MAP headers on 5 highest-traffic lib files; `docs/lattice-map.json` 14-node dependency graph; 5 LATTICE integrity tests (Session 013, PR #31)
- [x] pe-007: Unified FEATURES registry in build-vextreme.js — `default: true/false` per entry; sw-register.js activated as core module; Feature.SW + Feature.ARC_NAV constants in vex-config.js (Session 013, PR #31)
- [x] God Script wiring — 5 more HTML pages wired to God Scripts; VEX_SUPPORTED_LANGS added to assembly; ecosystem-hub God Script generated (Session 013, PR #31)
- [x] docs/culture.md — mission, operating principles, culture of development (Session 013, PR #31)
- [x] lib/audit-pages.js — canonical page wiring status tool (Session 013, PR #31)
- [ ] Activate arc-nav for `claude-answers-the-doubt` — add 'arc-nav' to viewmodel, confirm arcNavMount div, rebuild (Session 013, pe-002)
- [ ] Investigate `restoration-protocol` — on shell.js (v1 path); needs content audit before porting (Session 013)
- [x] System health manifest — `data/status.json` CQRS artifact, `data/status/*.json` write-side sources, `lib/build-status.js` assembler, `pages/ecosystem-hub.html` dashboard (Session 012, PR #27)
- [ ] Wire `lib/build-status.js` into CI — `data/status.json` must rebuild automatically when `data/status/*.json` or `data/strings/compiled/manifest.json` changes (Session 012)
- [ ] `lib/check-link-integrity.js` — HTML internal dead link scanner for CI (td-003, Session 012)
- [ ] Verify `pages/ecosystem-hub.html` on GitHub Pages — live fetches of index.json + status.json not yet confirmed (Session 012)
- [ ] Create PWA icons (`icons/icon-192.png`, `icons/icon-512.png`) — requires image generation; PWA installability blocked until done (Session 011)
- [x] Wire `sw-register.js` into all God Script pages — activated as `default: true` core module (Session 013, PR #31)
- [ ] Wire `node lib/build-vextreme.js` + `node lib/build-sw.js` into CI — both still require manual runs (Session 011)
- [ ] Add string bundle for `specimen-architectural-wisdoms` — no localization yet; blocks God Script assembly (Session 011)
- [ ] Port `restoration-protocol` to God Script — currently skipped in audit-pages (Session 011)
- [x] PR #25 — Service Worker + PWA manifest, `lib/build-sw.js`, `sw.js`, `manifest.json`, `widgets/sw-register.js` (Session 011)
- [x] PR #24 — God Script assembler (`lib/build-vextreme.js`), key alignment check, `config/lessons/`, `specimen-architectural-wisdoms.html` (Session 011)
- [x] PR #23 — `buildViewmodel` in `lib/build-index.js`, `data/viewmodels.json`, `tests/07-viewmodel.test.js` (Session 011)
- [x] Named constants in `lib/vex-config.js` — `Category`, `Language`, `Scope`, `CDN_BASE`, `scopeRelPath`, zero magic strings in build pipeline (Session 010, PR #20)
- [x] `_meta.category` system — scope bundles under `scopes/{category}/`, deterministic path derivation, `window.VEX_STRING_CATEGORY` on pages (Session 009, PR #19)
- [x] specimens.html dashboard + 3 specimen pages, each pairing a localization state with the pipeline mechanism that catches it (Session 008)
- [ ] Consider a documented "always include this scope" mechanism for shared-scope pages instead of relying on every page to remember to list it manually (Session 008, caught a real bug this way)
- [x] Per-scope compiled string bundles + opt-in scoped fetch in lang-fab.js — additive, `vextreme-demo` is the first adopter (Session 007)
- [ ] Migrate `claude-answers-the-doubt.html` / `restoration-protocol.html` to `window.VEX_STRING_SCOPES` now that the path is proven (Session 007)
- [ ] Verify scoped fetch against the real post-merge CDN (Session 007)
- [ ] Exercise the variant/staging-file convention with a real A/B copy test or draft translation (Session 007)
- [x] Test suite — 39 tests, 4 pipeline-based files, CI workflow (PR #9, merged)
- [x] Structured logger — `lib/logger.js`, `lib/logger-codes.js`, all call sites (PR #10, merged)
- [x] lang-fab widget — floating flag selector, iOS scroll wheel, supportedLangs from build (PR #12, merged)
- [x] i18n on layers 01–05 of claude-answers-the-doubt — EN + JA, missing-key test (PR #13, merged)
- [x] Screenshot tooling — `scripts/screenshot-page.js`, Playwright CDN interception, visual PR comparisons
- [x] archives.html localization status tracking — per-slug/per-lang chips, full vs partial (Session 005)
- [x] Client-facing demo page + demo-fab orb — `pages/vextreme-demo.html`, `lib/build-demo.js`, `widgets/demo-fab.js` (Session 006)
- [x] "Session" formally defined in `docs/architecture/08-continuity.md` (Session 006)
- [ ] Missing-key fallback: show EN text instead of raw key string when translation absent
- [ ] `strings-check` enhancement: audit HTML for translatable elements missing `data-i18n`
- [ ] Reconcile `06-i18n.md` page-scope key convention doc with actual `pages.` prefix in use (Session 005)
- [ ] Verify localized-count stat / legend rendering once a second target language exists (Session 005)
- [ ] Verify archives.html GitHub Actions auto-rebuild works on next push to main
- [ ] Verify index.html root nav page renders correctly on vgong24.github.io/Vextreme
- [ ] Screenshot-verify vextreme-demo.html — layout, live index.json fetch resolving, demo-fab/lang-fab not colliding (Session 006)
- [ ] Native-speaker review of `data/strings/source/demo.json` JA text (Session 006)
- [ ] If a second orb is ever needed, generalize demo-fab/lang-fab into a real radial-menu widget instead of stacking one-off siblings (Session 006)
- [ ] Port HTML pages — each page added to pages/ triggers auto-rebuild of all artifacts (active focus)
- [ ] Wire up `window.VEXTREME_LOGGER` consumer when monitoring/analytics is desired
- [ ] Build "recent shifts" section on index.html

**v1 system (Squarespace — lower priority, not abandoned):**
- [ ] Fix `extends` field in archive-renderer.js (embodiment/i-was-here preset inheritance)
- [ ] Test renderModes registry change live
- [ ] Test wrapBody() + nav auto-creation on claude-answers-the-doubt.html GitHub Pages
- [ ] Test section-toggle.js and bc-nav.js on live pages

**Update this list at the end of each session** — check off completed items,
add new ones discovered during the session.

---

## Batch Registry

Sessions are grouped in batches of 10. When a batch file reaches 10 entries,
create the next batch file and update this registry.

| Batch | File | Sessions | Status |
|---|---|---|---|
| 001 | `docs/continuity/Batch 001.md` | 001–010 | closed |
| 002 | `docs/continuity/Batch 002.md` | 011–020 | active |

**Active batch:** `docs/continuity/Batch 002.md`

When starting a new session: open the active batch file, scroll to the bottom,
append your session block using the template at the bottom of the batch file.

When a batch reaches 10 sessions:
1. Create `docs/continuity/batch-00N.md` using the batch template below
2. Add it to this registry table
3. Update **Active batch** to point to the new file

---

## System quick-reference

*For when you need the answer fast without reading everything*

| Question | Answer |
|---|---|
| Where is arc data? | `data/arcs.json` — all arcs, sections, entry slugs |
| Where is environment config? | `data/environments.json` — base URLs per deployment context |
| Where is display data? | `data/pages.json` — presets, per-slug token overrides |
| Where is the loader? | `docs/squarespace-injection.html` — paste into Squarespace footer |
| Current cache version | `?v=2` — increment when lib/component files change |
| How do I test live? | Create page at slug `test-playground`, paste `docs/test-playground.html` |
| How do I add a page? | Add slug to `data/arcs.json`, optional entry in `data/pages.json` |
| How do I add a new arc? | Add arc object to `data/arcs.json`, increment cache version |
| Fonts loaded globally? | Yes — via header injection, no per-page font tags needed |
| Does every page need a per-page block? | No — URL auto-detection covers standard pages |
| What broke last time? | See most recent session in active batch file |

---

## Continuity rules

These rules exist so the log stays useful as it grows. Follow them.

**Reading rules:**
- Always read INDEX.md first
- Read the most recent session in the active batch before starting work
- You do not need to read old batches unless debugging something historical

**Writing rules:**
- Append only — never edit a prior session entry
- One session block per working session, regardless of length
- If a session is a continuation of the prior one (same day, same thread),
  note that in the Context on Arrival field rather than creating a new session
- Update **Current State** and **Open Work** in this file at session end
- Include the Claude thread link — it is the primary source of reasoning

**Batch rules:**
- Maximum 10 sessions per batch file
- When a batch is full, create the next batch and update the registry here
- Batch files are named `batch-001.md`, `batch-002.md` etc. — zero-padded
- Do not merge or split batches after creation

**What to log:**
- Files created or modified (with one-line description of what changed)
- Mistakes — specific, with cause and fix
- Assumptions — both confirmed and unconfirmed
- Open work at session end
- Thread link and instance/model info

**What not to log:**
- Blow-by-blow of what commands were run
- Content of files (that's what the files are for)
- Speculation about future sessions
- Anything you wouldn't want a future instance to treat as factual

---

## New batch template

```markdown
# VEXTREME — Continuity Batch 00N
# Sessions 0NN–0NN

[← Batch 00N-1](batch-00N-1.md)

---

## Session 0NN

**Date:** YYYY-MM-DD
**Time:** approximate range
**Thread:** https://claude.ai/share/...
**Instance:** Claude [model] ([interface])
**Working with:** [name]
**Continues from:** Session 0NN — [one line]

### Context on arrival

### Files created or modified

| File | What changed |
|---|---|
| | |

### What was built and why

### Mistakes made

### Assumptions that held

### Assumptions that need verification

### Open work at session end

- [ ] item

### State of the system at session end
```

---

*Last updated: Session 016 — July 2, 2026*

<!-- [VXG RealForever] -->