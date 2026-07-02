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

**Date:** June 30 – July 1, 2026
**Time:** ~12:22 PM June 30 (session start) through ~03:00 UTC July 1 (logger PR merged)
**Thread:** https://claude.ai/code/session_01NsuHVN1KCGSTA8hMfoA2y6
**Instance:** Claude Sonnet 4.6 (Claude Code CLI, remote execution environment)
**Working with:** Victor Gong
**Continues from:** Session 002 — v1 Squarespace system established; this session is the full v2 build

*Note: This was a very long session that compacted context multiple times. The first half
(orientation through PR #8) was reconstructed from summaries by later sub-instances. The
second half (test suite through logger) was experienced directly. The full transcript was
re-read at session end — the lessons below reflect that full arc.*

### Context on arrival

The first instance in this session arrived cold: read CLAUDE.md, read INDEX.md, read
architecture docs. But INDEX.md was out of date — it described the v1 Squarespace system
as if it were the live system, with no mention of the v2 data pipeline that had been
planned. The instance correctly flagged this gap in its first orientation message.

Victor hadn't used Claude Code for repo work before. The session opened by explaining
how git/commit/push would work collaboratively — a handshake that shaped the whole session.

Early in the session, push access to GitHub was blocked (403 from the git proxy) and the
GitHub MCP server write access hadn't been established. The CLAUDE.md file was pushed
via the direct GitHub API before the proxy issue was resolved. This created a stale local
branch commit that triggered the stop hook repeatedly throughout the session — the instance
correctly ignored it each time after the first identification.

### The arc of what was built

This session built the entire v2 system from scratch, in roughly this order:

1. **Architecture design** — Victor described the problem in Kotlin terms (sealed classes,
   hash maps, data classes). This session translated that into the JSON schema design.
   The key insight Victor landed: `ArcItem { slug, arcKeys: Set<ArcName>, ... }` where
   the slug is the hash key and arcKeys declare membership without encoding position.
   Position is resolved by the arc definition, not the node.

2. **v2 data files** — `data/nodes.json` (88 nodes), `data/arcs-v2.json` (16 arcs with
   sections and ordering strategies), `lib/build-index.js` (builder), `data/index.json`
   (pre-built artifact). GitHub Action to auto-rebuild on push.

3. **Archive dashboard** — `lib/build-archives.js` generates `pages/archives.html`:
   a visual grid showing all 88 nodes × all arcs, which are ported vs. missing.
   Missing cells are clickable to reveal the slug for copy-paste during porting.
   Victor's insight: the slug itself *is* the filename, so a clickable slug display
   is a direct work aid, not just a diagnostic.

4. **Sitemap** — `lib/build-sitemap.js` for crawler discoverability.

5. **i18n foundation** — Victor asked to prep for Japanese/Mandarin translation
   *before* the site grew. The strings pipeline: `data/strings/source/**/*.json`
   (structured, writable), `lib/strings-compile.js` (merges into compiled bundles),
   `lib/strings-check.js` (stale detection, block on missing EN, REMAP/QUARANTINE
   orphans), `lib/strings-export.js`, `lib/strings-import.js`.

6. **Architecture documentation** — split from one `docs/architecture.md` into 10
   scoped files under `docs/architecture/` with a `00-reading-guide.md` meta-blueprint.
   Victor's reasoning: a long single file has no reading order for AI instances that
   don't know what they need yet.

7. **Renderer registry** — replaced the monolithic `renderArcNav` if/else with a
   RENDERERS object keyed by `renderMode`, dispatching to swappable functions. This
   closed the one axis of customization that was still a fork instead of a registry.

8. **Function renames** — `t()` → `getString()`, `hash()` → `contentHash()`,
   `getFile()` → `cachedSourceFile()`, `row()` → `csvRow()`, `flatEntries()` →
   `allEntriesInOrder()`, `err()` → `errorHTML()`, `v` → `arcView`, `mount()` →
   `mountArcNav()`. Victor's reason: he's a Kotlin programmer who thinks in descriptive
   names; short abbreviations break his mental model of what code is doing.

9. **Bug fix** — `closest('.cell--missing')` was corrupted to `closesgetString` by
   a `replace_all` rename of `t(` → `getString(`. Victor found it first: copy button
   wasn't working. A targeted test was then added to catch this class of error.

10. **Test suite** — 39 tests, 4 pipeline-based files, CI workflow. Restructured from
    the initial 57-test 3-file version (which had too many unit tests redundant with
    pipeline-level coverage). The reorganization was driven by Victor asking "how do
    you put what test where in relation to each other's priorities?"

11. **Structured logger** — `lib/logger.js` + `lib/logger-codes.js`. Victor's framing
    was Kotlin data class style: an event object with optional fields so new fields
    can be added at any call site without touching other call sites or the interface.

### Files created or modified

| File | What changed |
|---|---|
| `data/nodes.json` | New. 88 canonical content nodes — slug, title, date, id, arcKeys. |
| `data/arcs-v2.json` | New. 16 arc definitions with priority, parent, renderMode, sections. |
| `data/strings/source/` | New. Structured i18n source files — common, nav, arc-specific. |
| `data/strings/compiled/` | Generated. EN + JA compiled bundles + manifest. |
| `data/index.json` | Generated. Pre-built slug map + arc map + arc meta. |
| `lib/build-index.js` | New → refactored. Pure functions exported, I/O gated behind require.main. |
| `lib/build-archives.js` | New. Generates archives.html grid with ported/missing cells + popover. |
| `lib/build-sitemap.js` | New. Generates sitemap.xml. |
| `lib/build-index-page.js` | New. Generates index.html root nav page. |
| `lib/strings-compile.js` | New → refactored. Pure functions exported, I/O gated. |
| `lib/strings-check.js` | New. Stale detection, BLOCK/REMAP/WARN/QUARANTINE pipeline. |
| `lib/strings-export.js` | New. Exports strings to CSV for external translators. |
| `lib/strings-import.js` | New. Imports translated CSV back into source files. |
| `lib/vextreme-index-v2.js` | New → heavily modified. Renderer registry, arcMeta from index, strings loader, function renames, structured logger. |
| `lib/arc-nav.js` | Modified. allEntriesInOrder, errorHTML renames, structured logger. |
| `lib/logger.js` | New. Node build script logger with swappable handler. |
| `lib/logger-codes.js` | New. Exhaustive event code constants with field documentation. |
| `docs/architecture/` | New (10 files). Architecture split into scoped files with reading guide. |
| `docs/vextreme-v2-architecture.kt` | New. Kotlin design spec — the architectural history artifact. |
| `.github/workflows/build-index.yml` | New. Auto-rebuilds all artifacts on push to main. |
| `.github/workflows/test.yml` | New. Runs test suite on every push and PR. |
| `.github/pull_request_template.md` | New. Decision record format for all PRs. |
| `.gitattributes` | New. Generated files use merge=ours strategy. |
| `CLAUDE.md` | New → updated. Cold-start reading order, VXG RealForever marker, PR conventions. |
| `docs/continuity/INDEX.md` | Updated. Current state and open work lists. |
| `tests/fixtures/` | New. nodes.fixture.json + arcs.fixture.json + strings.fixture.json |
| `tests/01-content-pipeline.test.js` | New → restructured. 13 tests, pipeline-first organization. |
| `tests/02-strings-pipeline.test.js` | New → restructured. 15 tests. |
| `tests/03-browser-nav.test.js` | New → restructured. 7 tests with injected URL builder. |
| `tests/04-build-output.test.js` | New → restructured. 4 tests reading generated HTML. |
| `package.json` | New. node:test runner, no external dependencies. |

### What was built and why

**The key architectural insights, in the order they emerged:**

**Insight 1 — Organization is a layer, not a location.**
Victor's core realization mid-session: "organization can be its own layer and not just
where files are placed, but how they're managed." This is the reason `pages/` is flat
even though there are 88 nodes. The organizational structure lives in `data/nodes.json`
and `data/arcs-v2.json`. The filesystem is just storage. This insight unlocked the whole
v2 schema design.

**Insight 2 — The slug is the hash key.**
Victor described the data model in Kotlin: `ArcItem { slug: String (hash key), arcKeys:
HashSet<ArcName> }`. The slug is immutable, globally unique, and serves as the system's
only identifier. Everything else — position, arc membership, date ordering — is derived
at build time. No directory hierarchy, no file path as identity.

**Insight 3 — Build-time vs runtime computation.**
Victor asked whether `index.json` should be pre-built or computed at load. The answer
(pre-built) came with the observation that this maps to Android's `Repository` pattern:
build step = Room database preload; browser = ViewModel reading from cache. GitHub
Action auto-rebuilding on push is the equivalent of a CI-triggered Room migration.

**Insight 4 — The popover IS the workflow tool.**
Archives.html was originally conceived as a status dashboard. Victor clarified: the
missing cells should be clickable to show the slug so he can type `slugName.html` and
paste the HTML. This reframed the popover from a diagnostic to a direct work aid. The
slug IS the filename. The dashboard serves porting, not just monitoring.

**Insight 5 — Strings as typed objects, not keyed strings.**
Victor didn't want `"common.label.page-live": "Page live"`. He wanted the key to be
a stable anchor and the value to be an expandable typed object: `{ "strings": { "en":
{...}, "ja": {...} }, "testId": "...", "dataKey": "..." }`. Future namespaces can be
added without changing existing structure. This is a significant forward-compatibility
decision.

**Insight 6 — VXG RealForever as a continuity signal.**
Victor proposed the marker after the instance missed the CLAUDE.md reading sequence.
The phrase carries semantic weight beyond a grep pattern — it identifies deliberate
work across context boundaries. Any instance can run `git log --grep="VXG RealForever"`
and recover the full progression of intentional decisions.

**Insight 7 — Test organization by what breaks together.**
Victor asked: "how do you put what test where in relation to each other's priorities?"
The answer: numbered pipeline files (01→04) where failure in 01 is the root cause of
failure in 03. Tests within each file ordered PIPELINE → INVARIANT → EDGE. Unit tests
only when the edge case is invisible at the pipeline level.

**Insight 8 — Kotlin thinking as the design language.**
Victor said explicitly: "I'm a Kotlin programmer, not JavaScript, not JSON. The
organization helps me work with what I got instead of hunt and search for context."
The workflow became: Victor describes in Kotlin type system terms, instance translates
to JSON/JS. The Kotlin spec (`docs/vextreme-v2-architecture.kt`) exists as the
architectural history artifact — the design before the implementation.

### Mistakes made

**Mistake 1 — replace_all collision on short pattern `t(`**
The rename of `t()` → `getString()` used replace_all on the pattern `t(`. This
over-matched: `closest('.cell--missing')` became `closesgetString('.cell--missing')` and
`split('T')` became `spligetString('T')`. Victor found the copy button bug; the `split`
corruption was caught in verification. Lesson: replace_all on patterns shorter than ~4
characters is dangerous without a word boundary. The regression test `04-build-output`
now exists specifically to catch this class of error.

**Mistake 2 — Skipping CLAUDE.md cold-start sequence**
When the session started, the instance went directly to reading the repo structure rather
than following the CLAUDE.md reading order (INDEX.md → batch file → architecture).
INDEX.md's "Current State" was stale (described v1 Squarespace as live). The instance
caught this on its own and flagged it, but the correct action was to read CLAUDE.md
first. The system works; the instance didn't follow it. Victor used this as the direct
prompt for creating the VXG RealForever marker — a more robust continuity signal than
just a written instruction.

**Mistake 3 — Writing the session 003 log from summary only (initially)**
The first draft of the session 003 continuity log was written from the compacted context
summary rather than the actual transcript. Victor asked to re-read the full thread before
finalizing it. The re-read revealed substantial additional context: the Kotlin design
language, the full sequence of PRs #2–#10, and the specific insights about organization
as a layer vs. location. The lesson: write the session log from the actual transcript
whenever possible, not from the compacted summary. The summary compresses reasoning into
outcomes; the transcript shows *why* the outcomes look the way they do.

**Mistake 4 — Generated file on feature branch**
During the rebase of `claude/test-suite`, the instance ran `node lib/build-index.js`
locally, which updated the `builtAt` timestamp in `data/index.json`. The stop hook
correctly flagged uncommitted changes. Correct response was `git restore`, not commit.
Generated files are CI-owned and should not carry local timestamp bumps on feature
branches.

### Assumptions that held

- The continuity system worked as intended — the reading sequence + VXG RealForever
  marker enabled mid-stream pickup after multiple context compressions
- `require.main === module` guard cleanly separates I/O from pure computation for testing
- `merge=ours` in `.gitattributes` handles generated file conflicts correctly for
  branches created after `.gitattributes` landed on main
- The Kotlin-to-JSON translation workflow maps well: sealed classes → JSON objects with
  `type` discriminators, hash maps → JSON objects with slug keys, data classes → flat
  JSON records with named fields

### Assumptions that need verification

- `window.VEXTREME_LOGGER` hook in browser files — dead code until an actual consumer
  is wired up
- `build-index-page.js` still has hardcoded "Built" / "pages live" strings that should
  be in the i18n system but weren't addressed this session
- `data/strings.json` (the old flat strings file) may still exist and could be deleted
  once CI is confirmed clean without it
- The architecture docs in `docs/architecture/` are the reference — but whether cold
  instances arriving in future sessions actually read them in dependency order (as the
  `00-reading-guide.md` specifies) has not yet been tested

### Open work at session end

- [ ] Verify archives.html GitHub Actions auto-rebuild on next push to main
- [ ] Verify index.html root nav page renders on vgong24.github.io/Vextreme
- [ ] Port remaining HTML pages to `pages/` — each triggers artifact auto-rebuild
- [ ] Wire up actual `window.VEXTREME_LOGGER` consumer when monitoring is desired
- [ ] Fix hardcoded strings in `build-index-page.js` ("Built", "pages live")
- [ ] Delete `data/strings.json` (old flat file) — superseded by pipeline
- [ ] Verify cold-start instances follow `docs/architecture/00-reading-guide.md`
      dependency order when arriving fresh

**v1 system (Squarespace — still open from prior sessions):**
- [ ] Fix `extends` field in archive-renderer.js (embodiment/i-was-here inheritance)
- [ ] Test renderModes registry change live
- [ ] Test wrapBody(), bc-nav.js, section-toggle.js live

### State of the system at session end

**Merged to main during this session (PRs #2 through #10):**
- Kotlin architecture spec (`docs/vextreme-v2-architecture.kt`)
- Full v2 data pipeline (nodes, arcs, builder, index, browser lib)
- Archive dashboard, sitemap, root index page builders
- i18n strings pipeline (compile, check, export, import)
- Architecture docs split into 10 scoped files
- Renderer registry replacing monolithic if/else
- Function renames for readability
- `.gitattributes` for generated file conflict resolution
- PR template (decision record format)
- VXG RealForever marker in CLAUDE.md and all modified files
- Test suite (39 tests, 4 pipeline-based files, CI workflow)
- Structured logger (logger.js + logger-codes.js, all call sites updated)

**All tests green:** 39/39 passing in CI and locally

**The system now knows what it is before it's fully populated.** 88 nodes registered,
7 HTML pages ported. The remaining 81 pages will fill in cell by cell as porting
continues. The archive dashboard shows exactly what's missing and provides the slug
for copy-paste on each missing cell.

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
---

## Session 004

**Date:** July 1, 2026
**Time:** continuous with Session 003 — same day, later hours
**Thread:** https://claude.ai/code/session_01NsuHVN1KCGSTA8hMfoA2y6
**Instance:** Claude Sonnet 4.6 (Claude Code remote execution environment)
**Working with:** Victor Gong
**Continues from:** Session 003 — v2 system stabilized, logger shipped, lang-fab in progress

### Context on arrival

Session arrived mid-task via compacted summary. The lang-fab widget was partially built:
`buildSupportedLangs()` had been added to `lib/build-index.js` but not yet wired into
the index output. The branch `claude/lang-fab` existed. Three tasks were in flight:
complete build-index.js, create `widgets/lang-fab.js`, update architecture docs.

The session also landed with a merge conflict on `data/index.json` (generated file,
same pattern as Session 003 — resolved with `git checkout --theirs` + rebuild).

### Files created or modified

| File | What changed |
|---|---|
| `lib/build-index.js` | Added `buildSupportedLangs()` — scans `data/strings/compiled/` for `strings.*.json` at build time. Emits `supportedLangs` array into index output. Exported for testing. |
| `widgets/lang-fab.js` | New. Self-contained IIFE. Reads `supportedLangs` from cached index.json. Shows only if 2+ languages. 44px translucent round FAB top-right, opens iOS-style emoji flag scroll wheel with backdrop-blur and gradient fade-through. Selects language, swaps `[data-i18n]` elements, persists to localStorage. Zero page coupling. |
| `docs/architecture/10-directory-structure.md` | New. Defines `lib/` vs `components/` vs `widgets/` with one-sentence decision test for each. |
| `docs/architecture/00-reading-guide.md` | Added section 10 to reading order map. |
| `docs/architecture/09-constraints.md` | Added `widgets/` to file responsibility map. |
| `docs/architecture.md` | Rebuilt from source (generated artifact). |
| `data/index.json` | Rebuilt — now includes `supportedLangs: ["en", "ja"]`. |
| `pages/claude-answers-the-doubt.html` | Added lang-fab script tag. Added `data-i18n` attributes to all elements in layers 01–05 (layer numbers, titles, questions, answers). |
| `pages/restoration-protocol.html` | Added lang-fab script tag. |
| `data/strings/source/pages/claude-answers-the-doubt.json` | New. 58 string keys for layers 01–05. EN + JA for all except `layer.04.qa.04.answer` — intentionally missing JA entry to test fallback behavior. |
| `data/strings/compiled/strings.en.json` | Rebuilt — 92 keys (was 36). |
| `data/strings/compiled/strings.ja.json` | Rebuilt — 91 keys (1 less than EN = the intentional gap). |
| `scripts/screenshot-page.js` | New. Playwright utility — starts local HTTP server, intercepts CDN requests to serve branch-local files, takes EN screenshot, clicks FAB to switch language, takes post-swap screenshot. `node scripts/screenshot-page.js [slug] [lang]`. |
| `docs/screenshots/claude-answers-the-doubt-en.png` | New. EN baseline screenshot. |
| `docs/screenshots/claude-answers-the-doubt-ja.png` | New. JA post-FAB-switch screenshot showing layers 01–05 swapped, layers 06–07 still English. |

### What was built and why

**`widgets/` directory and lang-fab:** Victor's request was a transparent floating button
for language selection — iOS time-picker scroll wheel aesthetic, flag emoji icons, no
page coupling. The key architectural decision: widgets are self-contained enough that
adding or removing the `<script>` tag leaves the page fully functional either way.
That test — "can I add/remove this without the page knowing?" — is now documented
in 10-directory-structure.md as the formal definition of the widgets/ boundary.

**`supportedLangs` at build time:** Rather than hardcoding which languages exist,
`buildSupportedLangs()` scans the compiled strings directory. Adding a new language
to the pipeline makes it appear in the FAB automatically — no JS changes. The FAB
only renders if `supportedLangs.length >= 2`, so single-language pages are unaffected.

**i18n on layers 01–05:** Victor wanted a real test bed before committing to the
pattern. Chose the first 5 layers of claude-answers-the-doubt because they cover:
(1) FAB visibility, (2) EN fallback for unwired elements (layers 06–07 untouched),
(3) missing-key fallback (layer.04.qa.04.answer has no JA — shows key string, not crash),
(4) ordinal counter i18n ("Layer 01" → "第1層" — number-counter word order is
locale-native, couldn't be templated with current flat string system), (5) localStorage
persistence across refresh.

**Screenshot script:** Victor asked if a screencrawler could capture before/after as part
of the PR. Built `scripts/screenshot-page.js` in-session, ran it, got clean EN and JA
screenshots, pushed them to the branch, embedded them in the PR description as a
comparison table. This is now the model for visual verification on future PRs.
The CDN interception pattern (route CDN URLs to local files) ensures screenshots
always test branch code, not whatever is on @main.

### Mistakes made

- Initial Chromium executable path guess (`/opt/pw-browsers/chromium/chrome`) was wrong.
  Correct path is `/opt/pw-browsers/chromium-1194/chrome-linux/chrome`. Found via `find`.
  Fixed in the script before committing.

### Assumptions that held

- `data/strings/compiled/` pattern-match `strings.[a-z]{2,}.json` correctly identifies
  language bundles — confirmed, picks up `en` and `ja`, ignores `manifest.json`.
- `strings-check.js` does not flag intentionally missing translations as blocking errors —
  confirmed, passed clean with 92 EN / 91 JA keys.
- Playwright CDN route interception works cleanly for `https://cdn.jsdelivr.net/gh/**`
  with local file fulfillment — confirmed, both screenshots rendered correctly with
  branch-local lang-fab.js and strings bundles.

### Assumptions that need verification

- JA translations are machine-assisted. Theological/philosophical vocabulary
  ("接触", "基盤", "疑念", "創発") has not been reviewed by a native speaker.
- iOS scroll-snap behavior on the flag wheel across Safari and Firefox — only
  tested via Playwright/Chromium in this session.
- The missing-key fallback currently shows the raw key string (ugly but informative).
  For production, the fallback should show EN text. Not implemented yet.

### Open work at session end

- [ ] Missing-key fallback: show EN text instead of raw key string when JA entry absent
- [ ] `strings-check` enhancement: flag HTML elements that contain translatable text
      but lack `data-i18n` attributes (the "debt" audit Victor noted)
- [ ] Wire layers 06–07 on claude-answers-the-doubt (and remaining pages) as content grows
- [ ] Verify archives.html GitHub Actions auto-rebuild on next push to main
- [ ] Verify index.html root nav page renders on vgong24.github.io/Vextreme
- [ ] Wire up `window.VEXTREME_LOGGER` consumer when monitoring/analytics is desired
- [ ] Port remaining HTML pages to `pages/`

### State of the system at session end

**Foundation complete as of this session.** The v2 system now has:
- Data pipeline: nodes.json + arcs-v2.json → build-index.js → index.json
- Browser runtime: vextreme-index-v2.js (arc nav) + widgets/lang-fab.js (language)
- i18n pipeline: strings source → strings-compile → compiled bundles → FAB swap
- Observability: structured logger (Node + browser), logger-codes.js event catalogue
- Testing: 39-test suite (4 pipeline files), CI on every PR
- Visual verification: screenshot-page.js (Playwright + CDN interception)
- Continuity: session logs, INDEX.md, VXG RealForever markers, PR-as-decision-record

PRs shipped this session: #12 (lang-fab widget), #13 (i18n layers + screenshot tooling).
Both green CI, both merged to main same day.

The next session begins adding content pages — the infrastructure exists to support them.

---

## Session 005

**Date:** July 1, 2026
**Time:** continuous with Session 004 — same day
**Thread:** https://claude.ai/code/session_012Cob5Fgz92AYDWfe2mZJWZ
**Instance:** Claude Sonnet 5 (Claude Code remote execution environment)
**Working with:** Victor Gong
**Continues from:** Session 004 — v2 foundation complete, next phase is porting content pages

### Context on arrival

Victor is starting a page-import push and wants `pages/archives.html` — the existing
build dashboard that tracks ported-or-not per slug — to also track localization status
per slug, so progress on translation coverage is visible alongside porting progress
without a second dashboard or a second pass of checking.

### Files created or modified

| File | What changed |
|---|---|
| `lib/build-archives.js` | Added a `localization` state check next to the existing `ported` Set (same location, per Victor's request — functionally parallel state checks belong together). Reads `data/strings/compiled/manifest.json`, aggregates per-slug key coverage by language prefix `pages.{slug}.`, distinguishes "not localized" (no page-scoped keys yet) from "partial" (some keys) from "full" (all keys). Renders language chips on ported cells, extends cell tooltips, adds a per-language localized-count stat to site-meta, adds two legend rows. |
| `data/strings/source/archives.json` | Added 3 keys: `archives.label.localized-lang`, `archives.label.localized-full`, `archives.label.localized-partial` — EN + JA. |
| `data/strings/compiled/*` | Rebuilt via `strings-compile.js` (95 EN / 94 JA keys). |
| `data/index.json` | Rebuilt via `build-index.js` (no logic change, ran for consistency). |
| `pages/archives.html` | Rebuilt via `build-archives.js` — now shows a JA chip (dimmed = partial) on the `claude-answers-the-doubt` cell, correctly reading "partial" because of the intentional missing-key gap from Session 004. |

### What was built and why

**Localization as a state check, not a new dashboard.** The `ported` Set (line ~37 of
build-archives.js) already answers "does this slug have an HTML file?" per slug. The new
`localization` map answers "does this slug's HTML have translated content, and for which
languages?" — same shape of question, different data source (`manifest.json`'s per-key
`langs` array instead of `fs.existsSync`). Placed immediately after `ported` in the file
so both state checks that feed the cell-rendering pass live in one place, per Victor's
explicit ask that this "should be nearby" the existing check.

**Full vs. partial, not just yes/no.** A slug can have some `pages.{slug}.*` keys
translated and others not (exactly the state `claude-answers-the-doubt` is in today,
by design, per Session 004's intentional missing-key test). Collapsing that to a boolean
would hide real signal, so coverage is tracked per language as `complete: boolean`
(covered keys === total keys for that slug), rendered as a dimmed chip when partial.

**Numbers kept out of `data-i18n` spans.** The pre-existing `common.status.pages-live`
span bakes English number-agreement text directly into the `data-i18n` element
(`${totalPorted} of ${totalNodes} pages live`) — if lang-fab ever swaps that key, the
counts would be clobbered by the translated label text with no interpolation. The new
localized-count stat avoids repeating that bug: only the label word sits inside the
inner `data-i18n` span, the counts stay outside it. Not a fix to the pre-existing spans
(out of scope, not asked for) — just didn't propagate the same pattern into new code.

**Lang codes shown unstyled/untranslated.** `EN` / `JA` chip labels are raw ISO codes,
not translatable prose — matching the existing precedent in `widgets/lang-fab.js` where
`item.setAttribute('title', lang)` uses the raw code with no i18n key. Confirmed this
doesn't violate the "no hardcoded display string" constraint in `06-i18n.md`.

### Mistakes made

None — build, strings-check, strings-compile, and the 39-test suite all passed on first
completed implementation.

### Assumptions that held

- Page-scoped string keys consistently follow the `pages.{slug}.*` prefix (confirmed
  against the one existing page-scope file, `data/strings/source/pages/claude-answers-the-doubt.json`,
  whose actual key convention is `pages.{slug}...` — note this differs from the pattern
  described in `06-i18n.md` ("`{slug}.{element-type}...` in `source/pages/{slug}.json`"
  — no `pages.` prefix). Docs and reality diverge here; code matches reality (the `pages.`
  prefix), not the doc. Flagging for whoever next touches `06-i18n.md`.
- `manifest.json`'s per-key `langs` array is suffient ground truth for coverage — did not
  need to re-derive from compiled bundles directly.

### Assumptions that need verification

- Only one target language (JA) exists today, so the "multiple language stat rows in
  site-meta" and "legend chip uses `targetLangs[0]` as the example" code paths are
  untested with 2+ target languages. Should self-verify correctly once a second language
  is added (both are derived from `targetLangs`, not hardcoded to `ja`), but not run
  against real multi-language data yet.

### Open work at session end

- [ ] Missing-key fallback: show EN text instead of raw key string when translation absent (carried from Session 004)
- [ ] `strings-check` enhancement: audit HTML for translatable elements missing `data-i18n` (carried from Session 004)
- [ ] Verify archives.html GitHub Actions auto-rebuild works on next push to main (carried)
- [ ] Verify index.html root nav page renders correctly on vgong24.github.io/Vextreme (carried)
- [ ] Port HTML pages — each page added to pages/ triggers auto-rebuild of all artifacts (carried, now the active focus per Victor)
- [ ] Reconcile `06-i18n.md`'s documented page-scope key convention with the actual `pages.` prefix in use
- [ ] Verify localized-count stat rendering once a second target language exists

### State of the system at session end

Archives dashboard now tracks two independent per-slug states side by side: porting
(HTML exists) and localization (translated, and how completely, per language). No new
data files, no new build script, no new pipeline stage — extends the existing
`build-archives.js` pass using data the strings pipeline already produces
(`manifest.json`). Ready for the page-import push to begin; each newly ported + localized
page will show up correctly without further changes to this logic.

---

## Session 006

**Date:** July 1, 2026
**Time:** continuous with Session 005 — same day, after PR #15 merged
**Thread:** https://claude.ai/code/session_012Cob5Fgz92AYDWfe2mZJWZ
**Instance:** Claude Sonnet 5 (Claude Code remote execution environment)
**Working with:** Victor Gong
**Continues from:** Session 005 — archives.html localization tracking, PR #15 merged to main

### Context on arrival

Same thread as Session 005, continuing after that PR merged. Victor asked for a "meta
demonstration" feature: a client-facing page proving the architecture works, reachable
from a new floating orb next to the existing lang-fab, with the incomplete state of
`archives.html` framed as an intentional before/after against the completed state live
on vextreme24.com. Victor also floated a much larger idea — a full radial menu of orbs
around the FAB — and asked for a formal definition of "session" in the docs, plus my own
read on how the work is going.

Scoped this down before building via `AskUserQuestion` rather than guessing: confirmed
(1) build one orb linking to the demo page now, not a generalized radial-menu framework,
(2) the demo page should combine a live data-driven walkthrough with written client-pitch
narrative, (3) the "gaps are intentional" framing lives on the demo page itself rather
than as a separate directory.

### Files created or modified

| File | What changed |
|---|---|
| `widgets/demo-fab.js` | New. Floating orb (44px, translucent, matches lang-fab styling) positioned at `right: 68px` so it sits beside lang-fab without collision. Links directly to `pages/vextreme-demo.html`. Explicitly documented in-file as the first orb of a possible future family, not a generalized radial-menu system — that abstraction isn't justified by one menu item. |
| `lib/build-demo.js` | New. Generates `pages/vextreme-demo.html`: why-this-exists narrative, a 4-row comparison table (CQRS split, slug identity, i18n pipeline, continuity system — each vs. its "conventional alternative"), a live section that re-fetches `data/index.json` client-side via XHR (same CDN pattern as lang-fab) to prove the stats aren't hardcoded, a test-coverage summary, and a closing section linking to `archives.html` (in-progress) and vextreme24.com (production) as the explicit comparison pair. |
| `data/strings/source/demo.json` | New. All display strings for the demo page — EN + JA, including the comparison-row labels (caught and fixed one hardcoded-string draft before compiling — see Mistakes). |
| `.github/workflows/build-index.yml` | Added `lib/build-demo.js` to the trigger paths and build steps, added `pages/vextreme-demo.html` to the auto-commit `git add` list. |
| `lib/build-sitemap.js` | Added `'vextreme-demo'` to `UTILITY_PAGES` — picked up automatically by the existing existence check, no new logic needed. |
| `pages/claude-answers-the-doubt.html`, `pages/restoration-protocol.html` | Added the `demo-fab.js` script tag next to the existing `lang-fab.js` tag. |
| `docs/architecture/08-continuity.md` | Added a "What is a session" section defining a session as the scope of one working thread, bounded by a completion-state threshold worth documenting rather than by wall-clock time or a single PR — matching Victor's framing verbatim, and citing the Session 004→005 same-day continuation as a worked example. |
| `docs/architecture.md` | Rebuilt via `build-architecture.js` (generated artifact). |
| `data/strings/compiled/*`, `data/index.json`, `pages/archives.html`, `sitemap.xml`, `index.html` | Rebuilt via the full pipeline for consistency (124 EN / 123 JA keys after the demo strings landed). |

### What was built and why

**Why not the full radial menu.** Victor's ask included "orbs surround the main one"
as a generalized interaction. Building that now, for exactly one menu item, would be
solving a problem that doesn't exist yet — the abstraction only pays for itself once
there's a second and third orb competing for the same space. Scoped this down explicitly
via `AskUserQuestion` before writing any code, and Victor confirmed. `widgets/demo-fab.js`
is written as a plain sibling orb to `lang-fab.js`, same visual language, positioned to
not collide — if a real radial system is needed later, generalizing two existing orbs
into one is a smaller, better-informed refactor than designing the framework speculatively
today.

**Live fetch, not just baked numbers.** The demo page's stats are baked at build time
(matching every other generated page in this repo) but the live section re-fetches
`data/index.json` from the CDN in the browser and overwrites the baked numbers with what
it gets back. This is the actual point of the page for Victor's stated audience —
organizations evaluating infrastructure want to see the system prove itself, not read a
claim about it.

**The gap framing reuses `archives.html`, doesn't duplicate it.** Considered building a
separate "completed vs. in-progress" comparison view for the demo page, but `archives.html`
already is that view — every unported/untranslated cell is the gap. The demo page instead
explains *why* those gaps are visible on purpose and links straight to it, alongside a
link to the completed production site. Two existing signals framed together, not a third
new one.

**Session definition placement.** Put it in `08-continuity.md` rather than `INDEX.md`
because `INDEX.md` is the current-state snapshot (rewritten each session) and this is a
standing definition that shouldn't need re-writing — it belongs with the other continuity
architecture decisions (VXG RealForever, docs-as-CQRS) that also live in that file.

### Mistakes made

- First draft of `lib/build-demo.js` used `data-i18n-static` with hardcoded English text
  ("Vextreme" / "Conventional") for the comparison-table row labels — a direct violation
  of the `06-i18n.md` no-hardcoded-string constraint that this same session's docs
  reasoning was invoking elsewhere. Caught before running `strings-check.js` (which
  wouldn't have caught it anyway, since it only checks source files, not build-script
  output) by re-reading the diff against the constraint. Fixed by adding
  `demo.comparison.label.this-approach` / `demo.comparison.label.conventional` keys and
  wiring them through `getString()` + `data-i18n` like every other string on the page.

### Assumptions that held

- `UTILITY_PAGES` in `build-sitemap.js` already gated on `fs.existsSync`, so adding
  `'vextreme-demo'` to the array was sufficient — no additional guard needed.
- The lang-fab CDN-fetch pattern (`XMLHttpRequest` to a jsDelivr URL with a cache-busting
  query param) ported directly to the demo page's live section without modification.

### Assumptions that need verification

- `demo-fab.js`'s `right: 68px` offset assumes `lang-fab.js`'s button is always exactly
  44px wide at `right: 16px` — confirmed by reading the source, not yet confirmed with a
  live screenshot on a real page (Session 004's screenshot tooling exists and would be
  the way to verify this, not yet run against this change).
- JA translations for `data/strings/source/demo.json` are machine-assisted, same caveat
  already on record from Session 004 for the `claude-answers-the-doubt` translations —
  not reviewed by a native speaker, more surface area here since the demo page is prose-heavy.
- The demo page has not been opened in a browser this session — build succeeded, tests
  pass, but "does it render correctly and does the live fetch actually resolve against
  the real CDN" is unverified live, same category as the `archives.html` auto-rebuild
  item already open since Session 004.

### Open work at session end

- [ ] Missing-key fallback: show EN text instead of raw key string when translation absent (carried)
- [ ] `strings-check` enhancement: audit HTML for translatable elements missing `data-i18n` (carried)
- [ ] Reconcile `06-i18n.md` page-scope key convention doc with actual `pages.` prefix in use (carried)
- [ ] Verify localized-count stat rendering once a second target language exists (carried)
- [ ] Verify archives.html GitHub Actions auto-rebuild works on next push to main (carried)
- [ ] Verify index.html root nav page renders correctly on vgong24.github.io/Vextreme (carried)
- [ ] Port HTML pages — each page added to pages/ triggers auto-rebuild of all artifacts (carried, active focus)
- [ ] Screenshot-verify `pages/vextreme-demo.html` (layout, live fetch resolving, demo-fab/lang-fab not colliding)
- [ ] Native-speaker review of `data/strings/source/demo.json` JA text
- [ ] If a second orb is ever needed next to demo-fab/lang-fab, generalize into a proper radial/menu widget instead of a third one-off sibling

### State of the system at session end

Two new floating widgets (`lang-fab.js`, now joined by `demo-fab.js`) and a new generated
page (`vextreme-demo.html`) exist, wired into the same build pipeline as every other
artifact — no parallel system, no special-cased build step. The demo page is designed to
be the pitch for the whole project: it explains the architectural decisions in comparison
form, then proves the two most falsifiable claims (the data is real, the tests pass) live
rather than in prose. Not yet verified in a real browser.

---

## Session 007

**Date:** July 1, 2026
**Time:** continuous with Session 006 — same day, after PR #16 merged
**Thread:** https://claude.ai/code/session_012Cob5Fgz92AYDWfe2mZJWZ
**Instance:** Claude Sonnet 5 (Claude Code remote execution environment)
**Working with:** Victor Gong
**Continues from:** Session 006 — demo page + demo-fab, PR #16 merged to main

### Context on arrival

Victor flagged that `data/strings/compiled/strings.{lang}.json` — one flat file merging
every scope — doesn't scale: a large page count would mean every page fetching every
string regardless of relevance, one file gating every string edit, and no natural home
for a staged translation or A/B copy variant. Asked to keep it as its own PR rather than
folding into the demo feature (confirmed via conversation, then confirmed a second time —
see "Mistakes made" below, a real process note about how that confirmation actually
reached me).

### Files created or modified

| File | What changed |
|---|---|
| `lib/strings-compile.js` | Added `groupSourceFilesByScope()` and `buildScopedBundles()` (exported, tested via existing pipeline). Writes `data/strings/compiled/scopes/{scope}.{lang}.json` — one bundle per source file's `_meta.scope`, plus `scopes/index.json` for discovery. Additive: the flat `strings.{lang}.json` bundle is unchanged and still the default, so the existing INVARIANT test ("keys from separate scope files merge into one flat bundle") stays true and wasn't touched. |
| `widgets/lang-fab.js` | `loadStringsForLang()` now branches: no `window.VEX_STRING_SCOPES` set → legacy flat-bundle fetch (unchanged). Scopes declared → fetches `common` + declared scopes in parallel from `scopes/`, merges client-side. `window.VEX_STRING_VARIANT` opts a page into a variant bundle per scope, falling back to the base scope bundle per-scope if that variant isn't compiled for it. |
| `lib/build-demo.js`, `pages/vextreme-demo.html` | Demo page now declares `window.VEX_STRING_SCOPES = ['demo']` before loading `lang-fab.js` — the first real adopter of the scoped path, fetching 2 scope bundles instead of the full 124-key project bundle. |
| `lib/logger-codes.js` | Added `STRINGS_MISSING_SCOPE` — warns when a source file lacks `_meta.scope` (grouped under `'common'` rather than failing). |
| `docs/architecture/06-i18n.md` | New "Scaling past one bundle" section: why the flat bundle doesn't scale, how scoped fetching opts in per page, the variant/staging file convention (`_meta.variant` → `scopes/{scope}.variant-{name}.{lang}.json`). |
| `data/strings/compiled/scopes/*` | New generated directory — 5 scopes × 2 languages + index.json, committed as a build artifact like the rest of `compiled/`. |
| `docs/screenshots/vextreme-demo-{en,ja}.png` | Re-verified via `scripts/screenshot-page.js` after the scoped-fetch change — confirmed the JA swap still renders correctly under the new fetch path before treating this as done (see 08-continuity.md's now-mandatory visual verification rule, added last session). |

### What was built and why

**Additive, not a migration.** The flat bundle stays the default and every existing page
(`claude-answers-the-doubt`, `restoration-protocol`) keeps using it unchanged. Only the
newest page (`vextreme-demo`) opts into the scoped path. This was a deliberate choice to
keep the PR reviewable and low-risk rather than migrating every consumer in the same
change — per-page adoption can happen incrementally, same pattern the i18n rollout itself
already used (layers 01–05 wired, 06–07 left English, in Session 004).

**Why scope, not page, is the unit.** `_meta.scope` already existed on every source file
before this PR (declared for the human-readable key-convention doc, unused by any build
step). Reusing it rather than inventing a new dimension means no source file needed to
change to gain scoped compilation — `pages/{slug}.json` files already declare
`"scope": "pages.{slug}"`, so they compile to `scopes/pages.{slug}.{lang}.json` for free.

**Variant convention answers the "A/B testing and translation alternatives" half of
Victor's question**, not just the file-count half. A variant source file (`_meta.variant`
set) compiles to a sibling bundle instead of merging into production strings for that
scope — a translator or a copy test can draft against a real compiled artifact without
any risk of it reaching a real user until a page explicitly requests that variant.

### Mistakes made

- None in the code — 39/39 tests passed unmodified, screenshot verification passed
  before and after.
- A real process note, not a code mistake: Victor asked in conversation whether to scope
  this as its own PR, I asked back whether he wanted a plan or wanted me to start, and he
  didn't answer in that turn. I did not start the work. Later, a PR #16 merge webhook
  arrived and I treated it correctly as "PR #16 is done," not as "proceed with unrelated
  future work." Victor then pointed out he'd actually written approval into the *merge
  commit message itself* ("Good to continue to the next phase of building the 'scalable
  localization packaging'") — which I hadn't seen, because the webhook event that reaches
  me on a merge is a fixed system notice with no custom text, not the commit message body.
  I only found it because he asked me to go check. Worth being explicit for the next
  instance: **commit messages and PR body edits are not a push channel** the way PR
  comments are — nothing surfaces them automatically. If Victor wants to communicate
  through git rather than chat, a PR comment is the reliable path; a commit message
  requires being told to go look.

### Assumptions that held

- `_meta.scope` was already present and correctly set on every existing source file —
  no source file needed a content change for scoped compilation to work.
- `scripts/screenshot-page.js`'s CDN interception (`localPathFor`) needed no changes to
  serve the new `scopes/*.json` paths — it strips the CDN prefix and joins with repo
  root generically, so any new path under the repo just works.

### Assumptions that need verification

- The scoped-fetch path has only been exercised against local files via the screenshot
  tool's CDN interception, same as every other unverified-live item in this project —
  not yet confirmed against the real jsDelivr CDN post-merge.
- Nothing yet uses `window.VEX_STRING_VARIANT` in production — the fallback-to-base-scope
  behavior when a variant is missing is covered by the code path reasoning, not by a live
  test with an actual variant file.

### Open work at session end

- [ ] Migrate `claude-answers-the-doubt.html` and `restoration-protocol.html` to declare
      `window.VEX_STRING_SCOPES` now that the path is proven — currently only
      `vextreme-demo` uses it
- [ ] Verify scoped fetch against the real post-merge CDN (carries the same jsDelivr-cache
      caveat already open from Session 006)
- [ ] Build a real variant/staging file end-to-end once there's an actual A/B copy test
      or in-progress translation to exercise it with
- [ ] Missing-key fallback, `strings-check` audit enhancement, `06-i18n.md` `pages.` prefix
      reconciliation, multi-language legend/stat verification — all carried from prior sessions
- [ ] Port HTML pages (carried, active focus)

### State of the system at session end

The string-compilation pipeline now produces two parallel outputs from the same source
files: the flat bundle (default, everything, unchanged) and per-scope bundles (opt-in,
scales to a large page count, has a defined slot for variants). No existing page's
behavior changed. One new page proves the new path works end-to-end, screenshot-verified
under both languages.

---

## Session 008

**Date:** July 1, 2026
**Time:** continuous with Session 007 — same day, after PR #17 merged
**Thread:** https://claude.ai/code/session_012Cob5Fgz92AYDWfe2mZJWZ
**Instance:** Claude Sonnet 5 (Claude Code remote execution environment)
**Working with:** Victor Gong
**Continues from:** Session 007 — per-scope compiled bundles, PR #17 merged to main

### Context on arrival

Victor asked for a "smaller-scale demonstration dashboard" sitting between the
architecture pitch (`vextreme-demo.html`) and the real progress tracker
(`archives.html`) — small fixed pages, each isolating one localization state (full,
partial, and a deliberately tiny miss), each paired with a process-map diagram of the
pipeline stage that produces or catches that state (test suite, screenshot verification,
strings-check). Victor named the concept "demo-migration-archive" but was open to a
better name, and acknowledged up front it was "its own project size." Scoped it via
`AskUserQuestion` before building: settled on the name **specimens**, 3 specimens in
this first pass, and static HTML/CSS step diagrams (no new diagram library) for the
process maps.

### Files created or modified

| File | What changed |
|---|---|
| `data/specimens.json` | New. Registry of the 3 specimens (slug, state, process, title) — same flat-object-keyed-by-name pattern as `nodes.json`/`arcs-v2.json`, per `07-registry.md`. |
| `lib/build-specimens.js` | New. Generates `pages/specimens.html` (dashboard) + 3 specimen pages. Shared CSS/shell helpers; `widgetScripts()` accepts one or multiple scopes so a specimen page can declare both its own page scope and the shared `specimens` scope (needed for the "back to specimens" link — see Mistakes). |
| `data/strings/source/specimens.json` | New. Dashboard chrome — 12 keys, EN + JA. |
| `data/strings/source/pages/specimen-full-translation.json` | New. Scope `pages.specimen-full-translation` — a short passage, fully translated, paired with the 4-stage test-suite process map (what each test file actually asserts, not just that it passed). |
| `data/strings/source/pages/specimen-partial-translation.json` | New. Scope `pages.specimen-partial-translation` — `body.untranslated` has no `ja` entry on purpose, the same shape of gap `claude-answers-the-doubt` has for real. Paired with the screenshot-verification process map, whose step 4 detail directly references the real bug Session 006 caught. |
| `data/strings/source/pages/specimen-smallest-miss.json` | New. Scope `pages.specimen-smallest-miss` — one line, real staleness demo (see below). Paired with the strings-check severity-flow process map. |
| `lib/build-demo.js`, `data/strings/source/demo.json` | Added a "specimens" section between Tests and Gaps on `vextreme-demo.html` — the "see it in a minute, not a pitch" pathway Victor asked for, linking to `specimens.html`. |
| `lib/build-sitemap.js` | Added `specimens` + the 3 specimen slugs to `UTILITY_PAGES`. |
| `.github/workflows/build-index.yml` | Added `lib/build-specimens.js` + `data/specimens.json` to trigger paths, added the build step, added the new pages to the auto-commit `git add`. |
| `docs/screenshots/specimens-*.png`, `specimen-{full,partial,smallest-miss}-{en,ja}.png` | New/updated. Screenshot-verified per the mandatory rule — caught a real bug (see Mistakes) before this was marked done. |

### What was built and why

**The staleness demo is real, not simulated.** `specimen-smallest-miss.body` was compiled
once with EN v1 + a matching JA translation (establishing a real `manifest.json` hash),
then the EN text was edited to v2 — a small deliberate wording change — and
`strings-check.js` was run again. It detected the hash mismatch for real and wrote
`_stale: true` onto the JA entry in the source file itself, logged via
`STRINGS_STALE_TRANSLATION`. That flag rides through `buildBundles()` into the compiled
scope bundle unchanged (nothing special was needed — `_stale` is just another field on
the strings object, and `buildBundles()` already copies the whole object). The page's
"Live check" line fetches that compiled JA scope bundle directly in the browser and
reports what it finds — same live-fetch-with-fallback pattern as `vextreme-demo.html`'s
architecture snapshot, reused rather than reinvented.

**Each specimen pairs a state with the mechanism that governs it, not a random pipeline.**
Full translation ↔ test suite (what gets verified structurally). Partial translation ↔
screenshot verification (what a human actually sees, which is exactly what's different
about a partial-translation bug — it's invisible in a diff). Smallest miss ↔ strings-check
(the integrity layer that catches a change too small for a human reviewer to reliably
notice). This mapping was a deliberate choice over pairing them arbitrarily — the point
Victor was making is that different failure modes need different catching mechanisms, and
the specimens should demonstrate that correspondence, not just three unrelated facts.

**Process maps stayed plain HTML/CSS**, per Victor's own choice in scoping — box-and-arrow
steps using the same `.process-step` pattern across all three pages, no new dependency,
consistent with the rest of the site's build-time-baked approach.

### Mistakes made

- First build of the 3 specimen detail pages declared only their own page scope
  (`window.VEX_STRING_SCOPES = ['pages.specimen-full-translation']`, etc.), but each
  page's "← Back to specimens" link uses a key (`specimens.link.back`) from the shared
  `specimens` scope. Screenshot verification of `specimen-partial-translation` caught it
  immediately — the back link stayed in English after switching to Japanese, everything
  else on the page translated correctly. Fixed by making `widgetScripts()` accept an
  array of scopes and declaring `[pageScope, 'specimens']` on all three detail pages.
  Re-verified all three with fresh screenshots after the fix. This is exactly the
  category of bug the now-mandatory screenshot rule (added Session 006) exists to catch —
  invisible in the build output, invisible in the test suite, visible in under a second
  once actually looked at.

### Assumptions that held

- `strings-check.js`'s stale-detection path required no code changes to demonstrate for
  real — it already does exactly this on every run, this session just gave it a
  two-compile scenario to actually trigger it against.
- `buildBundles()` needed no changes to carry `_stale` through to the compiled scope
  bundle — it already copies the full strings object per language, not a
  text-and-aria-label-only subset.

### Assumptions that need verification

- Same CDN-post-merge caveat as every other new page this session series — verified
  locally via CDN route interception, not against the real deployed jsDelivr CDN.
- The `specimen-smallest-miss` live-check fetches the JA scope bundle unconditionally on
  page load, regardless of which language is currently displayed — intentional (avoids
  needing to hook into lang-fab's internal language-switch timing, which would have
  required changing lang-fab's contract), but means the stale badge is visible even
  while viewing the page in English. Not verified whether that reads as confusing or
  as the intended "prove it independent of display state" signal.

### Open work at session end

- [ ] Verify all new pages against the real post-merge CDN (carried, same item as prior sessions)
- [ ] Consider whether `window.VEX_STRING_SCOPES` should support a documented "always include this scope" mechanism (e.g. a `common`-like second-tier shared scope) instead of requiring every page that links back to a shared dashboard to remember to list that dashboard's scope explicitly — the bug caught this session is a manual-remembering failure mode that could recur for the next shared-scope page
- [ ] Migrate `claude-answers-the-doubt.html` / `restoration-protocol.html` to scoped fetch (carried from Session 007)
- [ ] Exercise the variant/staging-file convention with a real A/B copy test (carried from Session 007)
- [ ] Port real HTML pages (carried, active focus)

### State of the system at session end

Three new specimen pages + a dashboard exist, entirely as fixtures (not in `nodes.json`,
not tracked by `archives.html`), cross-linked from `vextreme-demo.html` and back. One of
the three demonstrates a real, live-triggered staleness flag rather than a simulated one.
All four new pages (dashboard + 3 specimens) are screenshot-verified under both languages,
including a real bug the verification step caught and a fix that was re-verified before
being called done.

---

## Session 009

**Date:** July 1, 2026
**Time:** continuous with Session 008 — same day, after PR #18 merged
**Thread:** https://claude.ai/code/session_012Cob5Fgz92AYDWfe2mZJWZ
**Instance:** Claude Sonnet 4.6 (Claude Code remote execution environment)
**Working with:** Victor Gong
**Continues from:** Session 008 — specimens dashboard + 3 specimen pages, PR #18 merged to main

### Context on arrival

PR #18 had merged. Victor had left a review comment on `data/strings/compiled/scopes/pages.specimen-full-translation.ja.json`
about putting specimen/demo strings under a `scopes/demo/` subdirectory — framing it as
"organizing strings before needing to split them contextually in the future for 1000 pages
kind of preparation pattern." The prior instance had misread his "take it back" as
withdrawing the idea entirely, replied explaining scope-identity semantics, and Victor
flagged that there wasn't alignment. After re-reading the continuity log to re-perceive
the comment, it became clear: he wanted `_meta.category` on source files so compiled
bundles land under `scopes/demo/` (or `system/`, `production/`, etc.) rather than flat.
Victor also shared a document from Kimi (co-architect AI) whose conclusion was: use
`_meta.category` (not `_meta.group`) + deterministic path derivation (no index.json
lookup). Category is semantic (content maturity, SEO, translator priority) where group
is structural (filesystem only). PR #19 implements this.

### Files created or modified

| File | What changed |
|---|---|
| `data/strings/source/common.json` | Added `"category": "system"` to `_meta` |
| `data/strings/source/demo.json` | Added `"category": "demo"` to `_meta` |
| `data/strings/source/specimens.json` | Added `"category": "demo"` to `_meta` |
| `data/strings/source/pages/specimen-full-translation.json` | Added `"category": "demo"` to `_meta` |
| `data/strings/source/pages/specimen-partial-translation.json` | Added `"category": "demo"` to `_meta` |
| `data/strings/source/pages/specimen-smallest-miss.json` | Added `"category": "demo"` to `_meta` |
| `lib/strings-compile.js` | I/O section updated: builds `scopeCategories` map from `_meta.category` before writing scope files; derives `scopes/{category}/{scope_segments}/{file}.{lang}.json`; `scopeIndex` entries now include `category` and `path` fields. Header comment updated to document the 4 categories. |
| `widgets/lang-fab.js` | Added `scopeUrl()` helper (mirrors path rule in strings-compile.js). `loadStringsForLang()` now reads `window.VEX_STRING_CATEGORY` (default `'production'`). `'common'` always routes to `system/` regardless of page category. |
| `lib/build-demo.js` | Emits `window.VEX_STRING_CATEGORY = 'demo'` before lang-fab.js loads, with explanatory comment. |
| `lib/build-specimens.js` | Added `scopeRelPath(scope, category)` helper. `widgetScripts()` emits `window.VEX_STRING_CATEGORY = 'demo'`. Fixed `specimen-smallest-miss` live-check XHR URL from flat `scopes/${missScope}.ja.json` to the correct `scopes/${scopeRelPath(missScope, 'demo')}.ja.json`. |
| `data/strings/compiled/scopes/` | Reorganized into `system/`, `demo/`, `production/` subdirectories. Old flat files removed. `index.json` now includes `category` and `path` per scope group. |
| `docs/screenshots/` | All 5 demo page screenshots refreshed (EN + JA) after category changes. |

### What was built and why

**Why `_meta.category`, not `_meta.group`:** Category is semantic — it describes content
lifecycle maturity (production content, demo reference material, staging drafts, system
strings). Group is structural — just a filesystem bucket. Category carries richer meaning
that extends to SEO, translator priority, CI gate decisions, and indexing scope. Future
sessions can add a new category without touching any other category's code paths.

**Deterministic path derivation, not index.json lookup:** The alternative (index.json
records where each scope file lives, lang-fab fetches index.json before fetching scope
bundles) creates a registry-of-registries. When index.json falls out of sync with the
filesystem, lang-fab silently 404s on the scope bundle and falls back to the flat bundle —
silent failure, worst kind. The category rule is applied identically at build time
(`strings-compile.js`) and runtime (`lang-fab.js`'s `scopeUrl()`), no extra roundtrip.
Kimi's framing: the derivation rule IS the flatmap — applied symmetrically, inspectable
in the filesystem without any lookup.

**`common` always routes to `system/`:** Hardcoded in `scopeUrl()`, not derived from a
page's declared category. Common strings are infrastructure, not content — they belong
in `system/` regardless of which category the requesting page is in.

**Category `production` as default:** Source files without an explicit `_meta.category`
compile to `scopes/production/`. Only non-production files need explicit declaration.
Pages that don't declare `window.VEX_STRING_CATEGORY` default to `'production'`.

**Three options evaluated, one adopted:**
1. `_meta.group` + `index.json` runtime map — registry-of-registries, silent failure risk
2. Scope name prefix as directory (`demo.specimens` → `scopes/demo/`) — migration cost
   when groups change, structural rename for a semantic concept
3. `_meta.category` + deterministic path derivation — semantic, inspectable, zero extra
   roundtrip, correct at both build time and runtime

**Kimi's "overkill is preparation" framing:** Victor argued this session had the context
to set the path structure right at 9 scopes; a future session arriving cold at 1000 scopes
would face a real migration cost. The category system implements at essentially zero cost
now versus paying for it later.

### Mistakes made

**Misread PR #18 review comment intent:** Claude's initial reply framed the category idea
in terms of "scope identity as a named package" and "forks rename `_meta.scope` to avoid
collision" — the wrong framing. Victor flagged the misalignment. Root cause: Claude read
"take it back" as withdrawing the entire directory-structure idea, when Victor was only
retracting a specific VextremeLLC-vs-generic-demo sub-concern. Fixed by re-reading the
full continuity batch file and re-perceiving: the demo scope is a first-class reference
artifact that ships with the system. Lesson: when a review comment is flagged as
misaligned, re-read the prior session's context before replying — don't reason from
just the comment text and the prior reply.

**Edits without prior Read:** Attempted to edit `lib/build-demo.js` and `lib/build-specimens.js`
before reading them, getting "File has not been read yet" errors. Fixed by reading before
editing.

**Hardcoded live-check URL in `specimen-smallest-miss`:** The XHR in `build-specimens.js`
used `${CDN_BASE}/data/strings/compiled/scopes/${missScope}.ja.json` — the old flat path.
After the category reorganization this would 404. Fixed by adding the `scopeRelPath(scope,
category)` helper and using the derived category path.

**Old flat scope files persisting on disk:** After running `strings-compile.js`, the new
category-organized files were created but old flat files (e.g. `scopes/demo.en.json`)
remained. Cleaned up with `find data/strings/compiled/scopes -maxdepth 1 -name "*.json"
! -name "index.json" -delete`. Git correctly detected these as renames.

### Assumptions that held

- `buildBundles()` and `mergeSourceFiles()` needed zero changes — the I/O layer is the
  only thing that changed, the pure functions are category-agnostic.
- `scripts/screenshot-page.js`'s CDN interception needed no changes — it strips the CDN
  prefix generically, so new paths under `scopes/` just work.
- The 39-test suite passed unmodified — scope bundle path derivation is I/O behavior,
  not covered by the exported pure functions under test, so no test changes were needed.

### Assumptions that need verification

- New `scopes/demo/`, `scopes/system/`, `scopes/production/` paths on the real jsDelivr
  CDN after PR #19 merges — same CDN-cache caveat as all prior sessions.
- `archives.json` and `arcs.json` source files do not have explicit `_meta.category` set
  yet (they compile to `production/` by default, which is correct) — worth adding
  explicit declarations for clarity when those files are next touched.
- PR #19 CI status: confirmed green at session end (test: success, completed).

### Open work at session end

- [ ] Merge PR #19 — CI green, no review comments
- [ ] Verify new `scopes/{category}/` CDN paths work post-merge (carried caveat, all sessions)
- [ ] Migrate `claude-answers-the-doubt.html` / `restoration-protocol.html` to scoped fetch (carried from Session 007)
- [ ] Exercise the variant/staging-file convention with a real A/B copy test (carried from Session 007)
- [ ] Consider "always include this scope" mechanism for shared-scope pages (carried from Session 008)
- [ ] Port real HTML pages (carried, active focus)
- [ ] Missing-key fallback, `strings-check` audit, `06-i18n.md` `pages.` prefix reconciliation (carried)

### State of the system at session end

Compiled scope bundles now live under `scopes/{category}/` subdirectories, derived
deterministically at both build time and runtime from `_meta.category` on source files
and `window.VEX_STRING_CATEGORY` on pages. Four categories defined: `system` (common
strings), `production` (content pages, default), `demo` (architecture reference), `staging`
(reserved). The flat `strings.{lang}.json` bundle is unchanged. PR #19 open, CI green.

---

## Session 010

**Date:** July 2, 2026
**Time:** ~12:14 AM – ~12:20 AM
**Thread:** https://claude.ai/code/session_012Cob5Fgz92AYDWfe2mZJWZ
**Instance:** Claude Sonnet 4.6 (Claude Code remote)
**Working with:** Victor Gong
**Continues from:** Session 009 — `_meta.category` system (PR #19 merged)

### Context on arrival

Session arrived via context summary after the prior conversation window ran out of context. PR #19 had already merged. PR #20's full implementation was complete in the prior session (54/54 tests passing locally) but not yet committed. Victor had shared Kimi's full 10-lesson architecture document describing the end state (one `vextreme.js` script tag, slug-driven loader, named constants, spiral FAB) and given the green light to proceed at Claude's pace while holding the full map in view.

### Files created or modified

| File | What changed |
|---|---|
| `lib/vex-config.js` | **New.** Single source of truth for all semantic constants: `Category`, `Language`, `Scope`, `CDN_BASE`, `Path`, `WindowGlobal`. Canonical path-derivation functions: `scopeRelPath`, `scopeUrl`, `flatBundleUrl`. |
| `tests/05-vex-config.test.js` | **New.** 15 tests in 3 sections: named constant values, path derivation correctness, grep audit (no raw `'demo'` or `'ja'` in build scripts). |
| `lib/strings-compile.js` | Imports `Scope.COMMON`, `DEFAULT_CATEGORY`, `scopeRelPath` from vex-config. Local inline path derivation removed. |
| `lib/strings-check.js` | Imports `Language.EN`; replaces `l !== 'en'` literal. |
| `lib/strings-export.js` | Imports `Language.EN`; replaces `lang !== 'en'` literal. |
| `lib/strings-import.js` | Imports `Language.EN`; replaces `lang === 'en'` literal. |
| `lib/build-archives.js` | Imports `Language.EN`; replaces `.filter(lang => lang !== 'en')`. |
| `lib/build-index.js` | Imports `Language.EN`; replaces `return ['en']` fallback. |
| `lib/build-demo.js` | Imports `Category`, `Scope`, `CDN_BASE`; replaces hardcoded CDN URL, `'demo'` category string, `'demo'` scope string. |
| `lib/build-specimens.js` | Imports `Category`, `Language`, `CDN_BASE`, `scopeRelPath`; removes local `CDN_BASE` constant and local `scopeRelPath` function (both were duplicates). |
| `widgets/lang-fab.js` | Cannot `require()`. Replaced magic strings (`'common'`, `'system'`, `'production'`, `'en'`) with named local vars at top of IIFE: `SCOPE_COMMON`, `CATEGORY_SYSTEM`, `CATEGORY_PRODUCTION`, `LANG_DEFAULT`. Comment points to vex-config.js as canonical source. |

### What was built and why

Named constants eliminate three problems at once: IDE-opacity (no Find-References for a string literal), mutation cost (renaming `'demo'` requires a coordinated grep with typo risk), and silent runtime failures (the compiler can't catch `'domo'`). The constants resolve to the same string values at runtime — this is a zero-behavior-change PR.

`scopeRelPath` was the critical deduplication target: the same path-derivation rule existed in three places (inline in `strings-compile.js`, as a local function in `build-specimens.js`, inside lang-fab.js's `scopeUrl()`). All three now point to or reference the canonical implementation in `vex-config.js`. One implementation means one place to fix when the path rule changes.

The grep-audit tests enforce the discipline mechanically: future commits that add a standalone `'demo'` or `'ja'` literal to any build script will fail CI. The test strips comment lines before checking, and the regex requires word-boundary conditions so `'vextreme-demo'` and `'demo.section.why'` pass correctly.

`Path` and `WindowGlobal` constants were added to vex-config.js as forward anchors for PR #21 (config/ directory, blueprint.json) and PR #22 (slug-driven vextreme.js loader). They're unused by anything today — their value is as the committed interface that future PRs reference.

### Mistakes made

None in this session. All 54 tests passed on first run after implementation. Session was primarily a commit-and-push continuation of implementation done in the prior context window.

### Assumptions that held

- All 54 tests passed (39 existing + 15 new) with zero test modifications needed.
- The grep-audit regex correctly passes string keys containing `'demo'` as a substring (e.g. `'demo.section.why'`) and standalone path segments like `'vextreme-demo'` — tested in the PR.
- The local var approach in lang-fab.js (`var LANG_DEFAULT = 'en'`) is the correct pattern for browser IIFEs until PR #22 injects config from a build step — Kimi's architecture doc confirms this.

### Assumptions that need verification

- `lib/vex-config.js` path constant values (`Path.SCOPES_DIR`, etc.) match the actual compiled output paths — confirmed by tests, not yet verified by fetching a live CDN URL post-merge.
- The inlined local vars in lang-fab.js stay in sync with vex-config.js across future edits — enforced by convention and comment, not by tooling. PR #22 is the proper fix.
- `Category.EXPERIMENTAL` is defined but unused — left in as a forward anchor for a planned lifecycle stage. Should not break anything.

### Open work at session end

- [ ] Verify PR #20 CDN paths post-merge (same caveat as all prior sessions)
- [ ] PR #21 — `config/categories/*.json`, `config/features/*.json`, `blueprint.json`, `lib/validate-blueprint.js`
- [ ] PR #22 (high risk) — `data/index.json` slugMap with viewmodel, rewrite `lib/vextreme.js` slug-driven loader, remove per-page `window.VEX_STRING_*` declarations from generated HTML
- [ ] PR #23 — `widgets/vex-fab.js` spiral portal FAB replacing lang-fab + demo-fab
- [ ] Migrate `claude-answers-the-doubt.html` / `restoration-protocol.html` to scoped fetch (carried from Session 007)
- [ ] Verify scoped fetch + new `scopes/{category}/` CDN paths against real CDN post-merge (carried)
- [ ] Exercise variant/staging-file convention with a real A/B copy test (carried from Session 007)
- [ ] Consider "always include this scope" mechanism (carried from Session 008)
- [ ] Port real HTML pages (active focus, carried)
- [ ] Missing-key fallback, `strings-check` audit, `06-i18n.md` `pages.` prefix reconciliation (carried)

### State of the system at session end

All semantic constants in the build pipeline and strings pipeline are now defined in `lib/vex-config.js` — IDE-navigable, refactor-safe, grep-audited by CI. No magic strings remain in build scripts. The browser widget (lang-fab.js) inlines the values as named local vars with a pointer to the canonical source. `scopeRelPath` is now a single canonical implementation shared across all callers. 54/54 tests passing. PR #20 merged.

<!-- [VXG RealForever] -->
