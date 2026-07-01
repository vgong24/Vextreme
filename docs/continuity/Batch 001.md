# VEXTREME — Continuity Batch 001
# Sessions 001–010

*This is the first batch. No prior batch exists.*

---

## Session 001

**Date:** June 29, 2026
**Time:** ~12:32 PM – evening
**Thread:** https://claude.ai/share/6cb4b174-6427-46a0-a69f-f5b365b5e6c5
**Instance:** Claude Sonnet 4.6 (claude.ai web interface)
**Working with:** Victor Gong
**Continues from:** Fresh start — first structured architectural session

### Context on arrival

Victor had an existing Squarespace site (vextreme24.com) where all logic —
arc navigation, entry display, section toggles — lived as inline scripts in
Squarespace's Code Injection areas. The site had an established visual design
system (ember `#b45830`, stone `#1c1917`, IBM Plex Sans/Mono, Source Serif 4)
and a working arc nav widget rendering dot rows across named content arcs.

Victor had begun porting schemas to GitHub the day before as a starting point.
The session goal was to map the existing system, decompose it into modular
files, and establish GitHub as the source of truth.

The session started by reading three documents Victor provided:
- The Squarespace footer injection script (contained `window.VEXTREME_ARCS`
  inline data + all render functions)
- `archives.html` — the full hand-authored archive index page
- A content page (`claude-answers-the-doubt`) showing the per-page arc nav
  mounting pattern

### Files created or modified

| File | What changed |
|---|---|
| `data/arcs.json` | New. Full arc/section/entry schema extracted from old inline VEXTREME_ARCS. Slugs replace full URLs. 16 arcs, 75 full_timeline entries. |
| `data/pages.json` | New. Display bridge map. Three-tier inheritance: _base → preset → per-slug overrides. 7 presets, ~30 slug entries. Pill registry included. |
| `lib/arc-nav.js` | New → rewritten mid-session. v1 had self-mount DOMContentLoaded bug. v2 removes self-mount entirely, fixes entrySlug() to handle both slug and url fields, adds diagnostic error messages. |
| `lib/archive-renderer.js` | New. Token merger + HTML generator for archive entry rows. Reads pages.json inheritance chain. Not yet tested live. |
| `components/bc-nav.js` | New. Shape-coded nav extracted from old footer script. Not yet tested live. |
| `components/section-toggle.js` | New. Section collapse extracted from old archives.html inline script. Not yet tested live. |
| `styles/design-system.css` | New. Global CSS tokens + all shared classes extracted from old inline styles. |
| `styles/arc-nav.css` | New. Arc nav widget styles extracted from old runtime injectStyles() call. |
| `styles/page-templates/journal-qa.css` | New. Page-scoped styles for journal/Q&A format. |
| `docs/README.md` | New. Architecture map, load order, token reference, injection docs, key dates. Iterated throughout session. |
| `docs/squarespace-injection.html` | New. Three-block injection template. Iterated three times — v1 (two blocks), v2 (added per-page block with event listener), v3 (slug auto-detection, cache bust on all assets, mount timing fix). |
| `docs/test-playground.html` | New. Self-contained diagnostic page for slug `test-playground`. |
| `docs/continuity/INDEX.md` | New. This continuity system. |
| `docs/continuity/batch-001.md` | New. This file. |

### What was built and why

**The core architectural shift:**
From one large synchronous inline script to a modular async loader. GitHub
hosts files. Squarespace injection areas become a thin loader only. This
enables version control, diffs, and rollback for what was previously an
opaque inline blob.

**The data split (arcs.json vs pages.json):**
`arcs.json` = content structure (what pages exist, in what sequence, in what
arcs). `pages.json` = display tokens (how each entry looks in the archive
list). Separated because content changes more frequently than visual design,
and display overrides at the per-slug level would clutter the content schema.

**The pages.json token system:**
Audited all 13 entry row variants in archives.html. Found they cluster into
five preset families — tint, accent-border, immersive, dark, and two named
one-offs (embodiment, i-was-here). Victor framed it as Jetpack Compose:
base → preset → override, later layers win. That framing shaped the entire
implementation. `sectionDefaults` means most plain rows need no individual
entry in pages.json.

**The test playground:**
Created after hitting "no arcs found" on the live page and being unable to
tell which layer was failing. The playground isolates system status, slug
resolution, arc row render, entry lookup, integrity checks, and a console
log into one page. It mirrors the same helper functions as arc-nav.js so
it tests the same logic path the live widget uses.

**The continuity system (this document):**
Victor's request — a structured log that future instances can read to pick
up the build without re-deriving what was already worked out. Batched at 10
sessions per file to prevent single-file bloat. INDEX.md is the entry point,
always updated at session end, always read first on arrival.

### Mistakes made

**Mistake 1 — DOMContentLoaded self-mount in arc-nav.js**
Symptom: Widget didn't appear, no error in console.
Cause: arc-nav.js registered `document.addEventListener('DOMContentLoaded', mount)`
at load time. Since it loads dynamically after two async fetches, DOMContentLoaded
had already fired. The listener was dead on arrival.
Fix: Removed self-mount from arc-nav.js entirely. Loader owns single mount call.

**Mistake 2 — Mount called before PAGE_ARCS was set**
Symptom: "No arcs found" error on page even after fixing mistake 1.
Cause: Loader called `VEXTREME_mount()` before the slug auto-detection fallback
ran. Mount saw `window.PAGE_ARCS = undefined` and returned early.
Fix: Auto-detection (`window.location.pathname` → slug) now runs before mount.

**Mistake 3 — jsDelivr cache serving stale arc-nav.js**
Symptom: "No arcs found" even though `window.VEXTREME_ARCS` showed correct data
in console. Same symptom as a data bug, very difficult to distinguish.
Cause: jsDelivr caches `@main` aggressively. The old arc-nav.js (which expected
`entry.url` not `entry.slug`) was being served after the new one was pushed.
Fix: `?v=2` on all loadScript() and fetch() calls. Increment `CACHE_VER` in
`squarespace-injection.html` whenever lib/component files change.

**Mistake 4 — `const PAGE_ARCS` vs `window.PAGE_ARCS`**
Symptom: Mount function read `global.PAGE_ARCS` and found undefined even when
the page had `const PAGE_ARCS = [...]`.
Cause: `const` is block-scoped — invisible to arc-nav.js loaded in a separate
script tag.
Fix: Use `window.PAGE_ARCS`. Auto-detection covers most pages without this.

**Mistake 5 — `<script src>` for JSON**
Symptom: Caught in planning, not deployed.
Cause: Early draft used `<script src=".../arcs.json" type="application/json">`.
Browsers don't expose JSON script tag content to JS in a useful way.
Fix: Corrected to `fetch()` before shipping.

### Assumptions that held

- jsDelivr serves GitHub files at `cdn.jsdelivr.net/gh/{user}/{repo}@main/{path}`
- Squarespace footer injection runs after page HTML is parsed
- Squarespace allows `fetch()` calls to external domains from injected scripts
- `Promise.all` + sequential `.then()` chaining sufficient for dependency ordering
- URL slug auto-detection works on Squarespace URLs — confirmed on vextreme24.com
- `window.VEXTREME_ARCS` set by loader is readable by dynamically loaded scripts

### Assumptions that need verification

- `section-toggle.js` behavior on live archives page (not tested)
- `bc-nav.js` behavior on any live page (not tested)
- `archive-renderer.js` token inheritance end-to-end (not tested)
- CSS `<link>` tags may also need `?v=` cache bust if design-system.css
  changes don't reflect after pushes (currently no cache bust on stylesheets)
- `localStorage` key prefix change in section-toggle.js (`vex-section-` prefix)
  means users with collapsed sections from the old system will see all sections
  open on first load of new system — acceptable regression, not tracked

### Open work at session end

- [ ] Roll out new footer injection to all remaining pages (only
      `claude-answers-the-doubt` confirmed working)
- [ ] Generate new archives.html using the archive renderer
- [ ] Test `section-toggle.js` on the live archives page
- [ ] Test `bc-nav.js` on any page using it
- [ ] Verify `archive-renderer.js` token inheritance end-to-end
- [ ] Add `?v=` cache bust to stylesheet `<link>` tags if CSS changes
      don't reflect after pushes
- [ ] Push all new files to GitHub (`data/`, `lib/`, `components/`,
      `styles/`, `docs/`) — not all may be committed yet

### State of the system at session end

**Working, confirmed live:**
- Full loader chain (fetch → load → mount) on vextreme24.com
- Arc nav widget rendering on `claude-answers-the-doubt`
- Three arc rows: `epstein` (dot, 9/9), `claude_journals` (dot, 1/11),
  `full_timeline` (position, 20/75)
- "You are here" footer with correct page title
- Slug auto-detection from `window.location.pathname`
- jsDelivr serving `arc-nav.js` v2.0.0 with `?v=2` cache bust

**Not yet tested live:**
- `section-toggle.js`, `bc-nav.js`, `archive-renderer.js`
- archives.html under the new system
- Any page other than `claude-answers-the-doubt`

**Known not working:**
- Nothing known broken — untested components have no confirmed state

---

## Session 003

**Date:** July 1, 2026
**Time:** ~02:00 UTC – 03:00 UTC
**Thread:** https://claude.ai/code/session_01NsuHVN1KCGSTA8hMfoA2y6
**Instance:** Claude Sonnet 4.6 (Claude Code CLI, remote execution environment)
**Working with:** Victor Gong
**Continues from:** Session 002 + prior Claude Code sessions — v2 data architecture was in place, function renames were mid-stream, merge conflicts recurring, test suite being established

### Context on arrival

This session arrived from a compacted context summary — not full thread history.
The instance did not experience the reasoning chain of earlier Claude Code sessions
directly; it reconstructed state from the summary. This is the first session where
the continuity system was actually stress-tested as designed: the arriving instance
read INDEX.md, the batch file, the architecture docs, and the summary, and picked
up work mid-stream without re-deriving settled decisions. It mostly worked.

Three open problems on arrival:
1. A rebase conflict on `claude/test-suite` paused mid-execution (`data/index.json`
   merge conflict on a generated file commit)
2. Function rename work from a prior session was complete but the test suite
   had been restructured — CI hadn't confirmed green yet
3. Victor had asked about a structured logger interface to replace `console.warn`
   calls — design agreed, no code written yet

### Files created or modified

| File | What changed |
|---|---|
| `lib/logger.js` | New. Node build script logger. `logger.warn/info/error(event)` where event is `{ code, message, ...optionalFields }`. Handler is a plain object property — swap it to redirect to a DB or analytics endpoint without touching any call site. |
| `lib/logger-codes.js` | New. Exhaustive constants file. Every event code the system can emit, with documentation of what optional fields each event carries. Single place to audit all structured log output. |
| `lib/build-index.js` | Added `require('./logger')` + `require('./logger-codes')`. Replaced one `console.warn` in `buildArcMap` with structured `logger.warn({ code: CODES.SLUG_NOT_IN_NODES, ... })`. |
| `lib/strings-compile.js` | Added logger. Replaced two `console.warn` calls in `mergeSourceFiles` (missing namespace, duplicate key). |
| `lib/strings-check.js` | Added logger. Replaced all `console.warn`/`console.error` calls with structured events: STRINGS_MISSING_EN, STRINGS_REMAP, STRINGS_DELETED, STRINGS_STALE_TRANSLATION, STRINGS_QUARANTINE. |
| `lib/arc-nav.js` | Added inline `_logger` var backed by `window.VEXTREME_LOGGER` hook (browser IIFE — cannot require). Replaced `warnOnce`'s `console.warn` and the index-not-loaded `console.warn`. |
| `lib/vextreme-index-v2.js` | Added inline `_logger` var. Replaced six `console.warn` calls covering index parse failure, HTTP error, fetch failure, strings bundle parse failure, strings HTTP error, strings fetch failure, and unknown renderMode. |
| `tests/01-content-pipeline.test.js` | Already existed; confirmed passing (part of rebased test suite) |
| `tests/02-strings-pipeline.test.js` | Already existed; confirmed passing |
| `tests/03-browser-nav.test.js` | Already existed; confirmed passing |
| `tests/04-build-output.test.js` | Already existed; confirmed passing |

### What was built and why

**Structured logger (the main deliverable):**

Victor's framing was precise: treat a log event as a data object first, output
mechanism second. This came from noticing `console.warn` scattered across build
scripts — if the system ever needs to route warnings to a database, analytics
endpoint, or monitoring service, touching every call site is a maintenance tax
that compounds as the codebase grows.

The design constraint Victor specified: event object with optional fields, Kotlin
data class style. New fields (category, sessionId, timestamp, severity) can be
appended at any call site without changing any other call site or the logger
interface itself. This is the key property — additive, never breaking.

Two implementations because the environment bifurcates:
- Node scripts can `require('./logger')` — one handler object, swap by assignment
- Browser IIFEs cannot require — each gets an inline `_logger` var reading from
  `window.VEXTREME_LOGGER`, the same swap pattern expressed as a global hook

`logger-codes.js` exists as a forcing function: before emitting a new warning,
you register its code here. This makes the full set of system events auditable
in one place — important if Victor later wants to build a monitoring layer.

**Resolving the recurring merge conflict pattern:**

The rebase conflict on session start (`data/index.json`) was the third instance
of the same root cause: CI auto-rebuilds generated artifacts on main after each
PR merges, causing feature branches to diverge from main on files that shouldn't
need manual merging. `.gitattributes` with `merge=ours` was already in place
(added in a prior session this batch); this conflict predated that file being on
the branch. Resolution: `git checkout --theirs data/index.json && git rebase
--continue`. Post-rebase: run build scripts to regenerate with branch changes.

**Test suite state:**

PR #9 shipped the restructured test suite — 39 tests across 4 pipeline-based
files, organized by what breaks together not by source file. CI confirmed green
on both runs (the original 46-test version and the restructured 39-test version).
PR #9 merged during this session.

### Mistakes made

**No mistakes in this session's code.** The rebase conflict was a carry-over from
a prior session state, not a new error. The restore of `data/index.json` (reverting
a timestamp-only change) was correct — committing a meaningless `builtAt` bump to
a generated file on the feature branch would have been noise.

**One near-mistake caught by stop hook:** The stop hook fired on an uncommitted
`data/index.json` change (just a timestamp from running `node lib/build-index.js`
locally during the rebase process). Correct response was `git restore`, not `git add
&& git commit` — generated files on feature branches should not carry timestamp-only
commits.

**One honest limitation:** This session arrived from a compacted summary, not full
context. The instance cannot describe the reasoning behind decisions made in earlier
Claude Code sessions (the function rename strategy, the `.gitattributes` design, the
test restructure from 46→39 tests). Those decisions are reflected in file state and
commit messages but not in this instance's first-person memory. Future instances
should use `git log --grep="VXG RealForever"` for the full deliberate commit chain,
not rely on session continuity alone for decisions older than the current context
window.

### Assumptions that held

- The continuity system worked as designed — a cold-start instance reconstructed
  system state from INDEX.md + batch file + compacted summary and continued work
  without re-deriving settled decisions
- `merge=ours` in `.gitattributes` correctly handles generated file conflicts for
  branches created *after* `.gitattributes` was on main — the conflict this session
  was on a branch that predated it, consistent with the documented post-rebase
  rebuild procedure
- 39 tests passing locally matched CI green — no environment-specific failures
- The `require.main === module` guard correctly gates I/O in `build-index.js` and
  `strings-compile.js`, allowing the test suite to import pure functions without
  triggering filesystem reads

### Assumptions that need verification

- `window.VEXTREME_LOGGER` override hook in `arc-nav.js` and `vextreme-index-v2.js`
  has not been tested — it's dead code until Victor or a future session wires up
  an actual analytics endpoint
- `logger-codes.js` is not yet imported by `arc-nav.js` or `vextreme-index-v2.js`
  (they use string literals for browser codes, not constants) — acceptable now,
  worth revisiting if a future build pipeline bundles browser JS from Node modules
- The `omit()` helper in `logger.js` strips `code` and `message` from the printed
  extra-fields object — relies on V8 object destructuring being stable, which it is,
  but worth noting it changes printed output format if the logger is swapped

### Open work at session end

- [ ] Update INDEX.md Current State to reflect logger as shipped (v2 system now
      has structured logging in all build scripts and browser runtime)
- [ ] Update INDEX.md Open Work list — check off test suite and logger items
- [ ] Verify archives.html GitHub Actions auto-rebuild on next push to main
- [ ] Verify index.html root nav page renders on vgong24.github.io/Vextreme
- [ ] Port remaining HTML pages to `pages/` — each triggers artifact auto-rebuild
- [ ] Wire up an actual `window.VEXTREME_LOGGER` consumer when monitoring is desired
- [ ] Write session 004 continuity narrative (this session's entry is session 003)

**v1 system (Squarespace — still open from prior sessions):**
- [ ] Fix `extends` field in archive-renderer.js (embodiment/i-was-here inheritance)
- [ ] Test renderModes registry change live
- [ ] Test wrapBody(), bc-nav.js, section-toggle.js live

### State of the system at session end

**Merged to main this session:**
- PR #9 — test suite (39 tests, 4 pipeline-based files, CI workflow)
- PR #10 — structured logger (`lib/logger.js`, `lib/logger-codes.js`, all call sites)

**All tests green:** 39/39 passing in CI and locally

**Logger interface shipped:**
- Node: `require('./logger')` + `require('./logger-codes')` in build scripts
- Browser: inline `_logger` with `window.VEXTREME_LOGGER` override hook
- Every `console.warn`/`console.error` in build scripts and browser runtime replaced
- Swapping to DB/analytics backend is one assignment, no call sites change

**Generated files remain CI-owned:**
- `data/index.json`, `data/strings/compiled/*`, `pages/archives.html`, `sitemap.xml`
  all in `.gitattributes` with `merge=ours`
- Feature branches should never commit timestamp-only changes to generated files

---

## Session 002

**Date:** June 29, 2026
**Time:** continuation, same day
**Thread:** https://claude.ai/share/6cb4b174-6427-46a0-a69f-f5b365b5e6c5
**Instance:** Claude Sonnet 4.6 (claude.ai web interface)
**Working with:** Victor Gong
**Continues from:** Session 001 — stable baseline confirmed, then extended into shell.js/vextreme.js unification and GitHub Pages nav

### Context on arrival

Continuing same-day work. Session 001 established the stable baseline
(arc nav working on claude-answers-the-doubt) and then extended into:
unifying the Squarespace and GitHub Pages loaders under one VEXTREME(config)
interface, building lib/vextreme.js and lib/shell.js, adding environment-aware
stylesheet injection, and adding auto-wrap/auto-nav for GitHub Pages pages
with zero HTML edits required.

This session was prompted by Victor asking whether the architecture would
hold under simulated edge cases — specifically whether "logic-only changes,
never touch HTML again" actually holds true as stated.

### Files created or modified

| File | What changed |
|---|---|
| `data/pages.json` | Added top-level `renderModes` registry (dots, position) as pure data — no JS functions. Reordered so it sits near `_meta`. |
| `lib/arc-nav.js` | Replaced hardcoded `if (arc.renderMode === 'position') {...} else {...}` with registry lookup against `VEXTREME_PAGES.renderModes`. Added `warnOnce()` utility — unknown renderMode now logs once and falls back to 'dots' instead of silently rendering wrong. Version bumped 2.1.0 → 2.2.0. |
| `lib/archive-renderer.js` | Added `warnOnce()` utility. Preset lookup in `resolveTokens()` now warns once on unknown preset name instead of silently falling back to `_base` with no signal. |
| `lib/vextreme.js` | Added `wrapBody()` — auto-wraps existing page `<body>` content in `.vex-page-body` for spacing, zero HTML edits required. `injectNav()` now auto-creates `#vex-site-nav` if missing rather than requiring it in page HTML. Added `bodyWrap` config field (default true on github_pages/local, false on squarespace). Version bumped 2.0.0 → 2.1.0 → 2.2.0 across this and prior sub-session. |
| `lib/shell.js` | Version reference bumped to match (`?v=6`). No logic changes — confirms the "shell.js never needs touching" design holds since asset changes only required bumping the version constant, not shell logic. |
| `docs/squarespace-injection.html` | Version bumped to `?v=6` to match. |
| `docs/README.md` | Added "Registry pattern" section documenting the JSON-only, no-JS-registration convention as the standing rule for all future customizable axes (presets, pills, fonts, renderModes, and anything added later). |

### What was built and why

**The core correction this session:** `renderMode` was the one axis of
customization that didn't follow the same pattern as presets/pills/fonts.
Those three were already flat JSON objects keyed by name, looked up
dynamically — genuinely open for forks to extend without touching JS.
`renderMode` was a hardcoded two-branch if/else inside `renderArcRow()`.
A fork (or Victor himself) adding a third visual style for arc rows would
have needed to edit `arc-nav.js` directly, breaking the "logic layer only,
never touch the view code" promise the rest of the architecture had
already proven out.

The fix generalizes the registry pattern explicitly rather than treating
it as incidental: pure JSON object, keyed by name, looked up at render
time, with a `warnOnce()` fallback so an unrecognized key degrades safely
and visibly instead of silently rendering wrong or crashing.

**Why warnOnce() rather than throwing or failing loudly every time:**
A broken preset or renderMode reference might render many times on one
page (e.g. the same arc rendered in multiple places). Warning on every
occurrence would spam the console and obscure the actual signal. One
warning per unique message, deduplicated via a closure-scoped object,
keeps the diagnostic useful without being noisy.

**Why wrapBody() and nav auto-creation matter beyond aesthetics:**
Victor's actual workflow is porting existing Squarespace HTML to GitHub
Pages by adding only a single `<script src="shell.js">` tag — not
restructuring the page. For that workflow to hold, the loader has to be
able to retrofit spacing and nav onto arbitrary existing body content
without assuming any particular HTML structure exists already. Both
functions check for existing structure before creating anything, so
they're safe to run against pages that already have partial structure
in place too.

### Mistakes made

**Mistake — `extends` field in pages.json presets does nothing**
Identified but NOT yet fixed this session. The `embodiment` and
`i-was-here` presets in pages.json declare `"extends": "immersive"`,
but `archive-renderer.js` never reads the `extends` field anywhere —
only `_base` is the implicit one-level parent. This means those two
presets currently work because they happen to redeclare every field
`immersive` would have given them, not because real inheritance is
happening. If `immersive`'s base values are ever changed, `embodiment`
and `i-was-here` will NOT inherit the change — they'll silently diverge.
This is flagged as open work, not yet fixed.

**Near-mistake — almost over-scoped the registry fix**
Initial instinct was to build a generic `VEXTREME.registry.define()`
JS API mirroring all four customizable axes (presets, pills, fonts,
renderModes) under one mechanism with explicit registration calls.
Victor correctly pushed back — that would have replaced "JSON object,
look it up" (already simple) with "JS function calls scattered through
code" (the exact anti-pattern being fixed). Corrected to: keep presets/
pills/fonts exactly as they are (already correct), add renderModes as
the same kind of flat JSON object, no registration API at all.

### Assumptions that held

- The "multiple arcs per slug" resolution (resolveArcsForSlug) was
  already correctly dynamic — confirmed this was never actually broken,
  despite initial conflation with the renderMode issue during discussion
- Content (page prose) is genuinely static HTML on both environments —
  confirmed an AI fetch without JS execution receives full page content
  regardless of whether the loader runs at all
- shell.js truly never needs touching when assets change — this session
  proved it by bumping versions in vextreme.js and shell.js's version
  constant only, with zero shell.js logic changes required

### Assumptions that need verification

- `renderModes` registry change has not been tested live — needs a
  page render check to confirm `full_timeline` (position mode) and
  a dot-mode arc both still render identically to before the refactor
- `wrapBody()` and nav auto-creation have not been tested live against
  the actual claude-answers-the-doubt.html GitHub Pages page yet
- The `extends` field gap means embodiment/i-was-here preset behavior
  should be spot-checked against intended design before assuming the
  current flat redeclaration is "good enough to leave for now"

### Open work at session end

- [ ] Fix `extends` field — implement real preset-to-preset inheritance
      so `embodiment`/`i-was-here` actually inherit from `immersive`
      rather than redeclaring its fields
- [ ] Test renderModes registry change live (confirm dots + position
      modes both still render correctly post-refactor)
- [ ] Test wrapBody() + nav auto-creation live on claude-answers-the-doubt.html
- [ ] Push v6 of all loader files (vextreme.js, shell.js,
      squarespace-injection.html, arc-nav.js, archive-renderer.js,
      pages.json) to GitHub
- [ ] Continue carried items from Session 001 (archive-renderer.js
      end-to-end test, section-toggle.js live test, bc-nav.js live test)

### State of the system at session end

**Changed, not yet verified live:**
- renderMode registry pattern (arc-nav.js + pages.json)
- Silent preset fallback now warns (archive-renderer.js)
- wrapBody() and nav auto-creation (vextreme.js)
- All version references bumped to v6/2.2.0 in sync

**Known gap, not yet fixed:**
- `extends` field in pages.json presets is inert — documented intent,
  no implementation. embodiment/i-was-here work via duplication, not
  real inheritance.

**Unchanged from Session 001:**
- archive-renderer.js still not tested end-to-end live
- section-toggle.js, bc-nav.js still not tested live