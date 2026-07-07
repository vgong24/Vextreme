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
3. Open the active batch directory (listed under **Batch Registry**) and read
   the newest-dated session file — filenames are `YYYY-MM-DD-session-0NN.md`,
   so the last file in `ls` order is the most recent session
4. Cross-reference `docs/README.md` for architecture decisions and load order
5. Use `docs/test-playground.html` (slug: `test-playground`) to verify the
   live system before touching anything

Do not start new work without reading the most recent session. Do not assume
the system is in the state described in the README — the README documents
intent, the continuity log documents reality.

---

## Current State

*As of Session 025 — July 7, 2026*

The v2 GitHub Pages architecture is the active system. v1 (`data/arcs.json`, `data/pages.json`,
`lib/vextreme.js`/`archive-renderer.js`/`arc-nav.js`) still serves the live Squarespace site
directly at runtime, but shares no runtime path with v2's build pipeline — confirmed frozen
(see `docs/architecture/03-data.md`'s "v1 vs v2" section). The God Script pipeline assembles one
self-contained JS file per page; `data/nodes.json` + `data/arcs-v2.json` + `data/departments.json`
are the write-side sources `lib/build-index.js` compiles into `data/index.json`, which everything
downstream reads. Content has two independent groupings: **arcs** (reader-facing narrative order)
and **departments** (production-domain ownership — `rd` default, `media`, and `institute` with
`governance`/`org-design` workTypes). Any `pages/*.html` file with no `nodes.json` entry is
auto-discovered (title scraped from its own `<title>` tag) rather than left invisible —
`lib/auto-discover-nodes.js`. Declared placement is applied, not hand-edited:
`config/content-intents.json` + `lib/apply-content-intents.js` upsert a page's
`vex:department`/`vex:workType` meta tags, validating the department/arcKey are real before
writing anything. `docs/architecture/13-intent-driven-operations.md` names the full
perceive → fetch/synthesize → judge → declare-intent → verify loop this pattern follows.
`docs/architecture/14-council-model.md` names a related, separate direction — whether one AI
instance can structure its own judgment across multiple named lenses ("The Council") instead of
coordinating multiple instances ("The Bridge Council," a genuinely different, undesigned pattern
closer to `od-009`'s territory). Two real attempts at this are built: an optional `lens` field on
backlog items + a Council Lenses panel on the Ecosystem Hub, and a full traceability layer —
`lib/build-roles.js` → `data/roles.json` / `lib/build-roles-page.js` → `pages/roles-index.html` —
tracing every role to its real contributions and mapping the kernel's connection-architecture
channels to what actually manifests them today (Ecosystem Hub panels = "plenary," continuity docs
= "vertical," "crossCouncilBridge" honestly marked not-yet-real). Communication-channel
infrastructure, meeting scheduling, and instruction-routing remain explicitly undesigned — see
`14-council-model.md`'s "First attempt"/"Second attempt" sections for the honest lessons.
`od-010` tracks a related correction: `docs/continuity/` + `config/lessons/*.json` already are a
standing-memory pattern, just not yet divided per department — logged, not built, until a
department generates enough independent history to need its own cell.

wip/ now has a second, distinct lifecycle: `wip/*.json` placeholders declare a future slug by
hand (`_meta.slug`); `wip/*.html` files (raw draft content with no destination yet) get an
**automatic** initial mapping the moment they're added — `lib/auto-discover-nodes.js`'s
`discoverWipDrafts` scrapes a title from the filename-derived slug, `lib/check-key-alignment.js`'s
`scanWipHtmlDrafts` folds it into the same collision/duplicate-intent checks as declared intents,
and `lib/build-status.js` surfaces it as a low-priority `contentIntegrity` notice — all with zero
manual mapping. When the same file later moves to `pages/{slug}.html` (same slug), nothing
tracks the old wip/ location as a persisted expectation, so nothing errors — the draft just stops
appearing next build. `lib/detect-wip-promotions.js` turns that same move into a positive PR
notice, reusing git's own rename-similarity detection (`git diff --name-status -M`) between a
PR's base and head rather than inventing custom file-identity tracking.

Slug uniqueness is mechanically enforced (BLOCK severity) in `lib/build-index.js`; orphan pages,
`wip/` placement conflicts, and `wip/` drafts are reported (informational) via
`lib/check-key-alignment.js` and a `contentIntegrity` panel on the Ecosystem Hub. Four
silent-drift detectors run in CI: `lib/build-lattice-headers.js --check` (LATTICE header drift),
`lib/check-key-alignment.js` (slug/arc/page/wip drift), `lib/check-design-tokens.js` (CSS token
resolution), and `lib/check-map-bindings.js` (pe-013, shipped Session 024 — layered-map drift:
registry ↔ files, batch registry ↔ directories, INDEX's "Last updated" ↔ newest session file).
A fifth, `lib/check-lattice-edges.js` (pe-012, shipped Session 024 continued), verifies the
lattice map's claimed reads/writes/loadedBy edges against actual code — informational at the
CLI, blocking in CI via tests/23's integration test; its first run found and fixed 22 stale
edges. 399/399 tests passing. Lattice coverage 35/46 (76%).

Session 025 added a real third language. `victor_dossier` (`pages/victor-methodology-presentation.html`)
is the first non-fixture page with a real `data/strings/source/pages/*.json` file, a real arc, and
en/zh content driven by `data-i18n` instead of two duplicated HTML files. Adding `zh` for real
collided with `td-006`'s standing gate ("do not design a 3rd language's pipeline on the current
per-scope-combo model") — resolved via a **scoped pilot**, not a full migration: an opt-in
`bundlingStrategy: "arc-chunked"` field on an arc in `data/arcs-v2.json`, a new
`lib/build-arc-bundles.js` that merges one `data/strings/compiled/arcs/{arc}.{lang}.json` per
language for opted-in arcs only, and matching branches in `lib/build-vextreme.js`,
`widgets/fab-lang.js`, and `lib/build-sw.js` — all inert for the other 16 arcs. od-001 (the
question this answers) is resolved and removed from `data/status/open-discussions.json`; td-006
is updated, not closed, since only one arc migrated. See `docs/architecture/06-i18n.md`'s
"Arc-chunked bundling pilot" section for the mechanism and its one honest known limitation
(`supportedLangs` is site-wide, so 🇨🇳 is selectable everywhere though only one page has zh
content — degrades safely via the existing missing-key-shows-EN fallback). `lib/trace-string-usage.js`
(new) answers "where is this string used?" / "what does this page use?" by cross-referencing
`data-i18n` usage against the compiled manifest, doubling as an orphan/unused-key integrity check.

Session 025 (continued) added the **terrain map** — a navigable health/dependency atlas over the
repo's own lattice, piloted first as a hand-authored Artifact (proving the interaction model: real
lattice edges, real `data/status/*.json` health, click-to-drill, a two-lens Engineer/Health-lead
toggle, a real per-language screenshot on the one node with a captured screen), then generalized
into a real self-updating feature following the same CQRS split as `data/status.json` →
`pages/ecosystem-hub.html`: `lib/build-terrain-map.js` computes a deterministic layout + health +
edges + auto-discovered screenshots into `data/terrain-map.json`; `pages/terrain-map.html` is
hand-authored once and live-fetches that JSON — adding a page, lattice node, or screenshot never
needs the HTML touched again, only a rebuild. Covers the full 44-node lattice and all 8 pages with
a real captured screenshot today.

Same day, a second continuation replaced the terrain map's navigation entirely, after a round of
Artifact POCs (portal/galaxy zoom, continuous pan/zoom field, zoom bands, a fractal level ladder)
each tested live and critiqued before the next was built — the interaction model this repo's own
`docs/culture.md` names ("prove the interaction model before committing anything"), applied to a
much bigger design surface than the original pilot. `lib/build-terrain-map.js` now computes a
lifecycle-stage layout (source → generate → utilities → check → output → runtime, replacing the
folder-grid) and two role-lens fields per node (`engineerFocus`/`auditorFocus` — a naming-pattern
heuristic, explicitly v1, rendered visibly so it can be challenged). `pages/terrain-map.html`'s
read side is now a real fractal zoom-level ladder (system → stage → node, each level snapping to
its own full framing on entry, exiting always stepping back one level, never to the top — a real
bug the POCs caught and fixed by construction), a right-docked detail panel (a true overlay
drawer, not a reserved layout column — an earlier version of this same session silently shrank
the navigable canvas by 340px at all times, caught and fixed before landing), and click-to-travel
cross-references (a Reads/Writes/Loaded-by entry that names a real file is clickable and moves the
camera there). A `Feature.MAP` "FAB back to the map" round-trip on real live pages is still named
as the natural next increment and still deliberately not built — it touches the shared `FEATURES`
registry in `lib/build-vextreme.js`, real production surface, and needs Victor's explicit
go-ahead rather than a leisure-pilot default.

The continuity system itself changed shape in Session 024: batches are now **directories of
per-session files** (`docs/continuity/batch-003/`, filenames `YYYY-MM-DD-session-0NN.md`)
instead of one monolithic markdown file per batch. Logging a session is a file creation — no
insertion anchor to miss, no closed record to disturb. Batches 001–002 remain legacy single files.
The change repairs Session 023 (Codex's July 6 context-note and perceivable-context work), whose
entries had been injected mid-file into Session 021's record.

**Recent sessions** (one line each — open the session files below for full reasoning):
- **Session 025** — Reviewed three Codex registry-graph context docs (well communicated into
  `docs/architecture/15–17`, recommended `context-notes/` as their raw-form home). Merged a
  bilingual (en/zh) engineering dossier from two duplicated HTML files into one
  `data-i18n`-driven page — the first non-fixture page with a real string source file and arc.
  Resolved od-001/td-006 with a scoped arc-chunked bundling pilot (`lib/build-arc-bundles.js`,
  opt-in per arc, only `victor_dossier` uses it) rather than a full-site migration. Built
  `lib/trace-string-usage.js` (reverse string tracer). Verified the merge with real before/after
  screenshots, not just tests. Continued: piloted, then generalized, the **terrain map** — a
  self-updating navigable atlas over the full lattice (`lib/build-terrain-map.js` →
  `data/terrain-map.json` → `pages/terrain-map.html`, live-fetched, never hand-edited again).
  Continued again, same day: replaced the terrain map's navigation with a fractal zoom-level
  ladder (system → stage → node) and role-lens layout (source → generate → check → output →
  runtime), after several Artifact POCs tested the interaction model live; fixed two real bugs
  the POCs and Playwright verification caught (level-exit skipping straight to the top instead
  of stepping back one level; a detail panel that silently reserved layout width even while
  hidden, permanently shrinking the navigable canvas).
- **Session 024** — Reviewed Session 023's misplaced batch entries (injected into Session 021's
  block, anchored to a sentinel marker instead of appended); restructured Batch 003 into
  `batch-003/` per-session files, relocated Session 023 with corrected attribution, taught
  `lib/session-bootstrap.js` the directory form, and distilled the anchor-insertion lesson.
  Continued: shipped pe-013 as `lib/check-map-bindings.js` — the fourth CI drift detector.
  Continued again: shipped pe-012 as `lib/check-lattice-edges.js` — 22 stale lattice edges
  found and fixed on its first run; the sentinel hazard bit the tool itself twice while
  building it (fresh evidence for the `const VEX_LATTICE` structural fix).
- **Session 023 (Codex)** — Context-note registry (`docs/continuity/CONTEXT-NOTES.md` +
  `context-notes/`), then "perceivable context" culture (`docs/culture.md` layered-maps section,
  pe-013 map-binding health check). PRs #63–#64. Entries originally misfiled; see Session 024.

**This section is a snapshot, not a log.** Full session-by-session reasoning — mistakes tried,
assumptions made, why a decision went one way over another — lives in the batch files (see
**Batch Registry** below), not here. Rewrite the paragraph above at the start of each session to
describe current state; don't append another dated paragraph on top of it. Keep at most the last
3 sessions as one-liners above; drop older ones from this list once they're no longer "recent" —
they're not lost, they're in the batch file where the reasoning actually lives.

**Where "what's open" actually lives:** `data/status/open-discussions.json`,
`data/status/tech-debt.json`, and `data/status/planned-enhancements.json` are the canonical,
already-pruned source for od-/td-/pe- tracked items (removed from their file once shipped) — the
Ecosystem Hub renders them live. Don't hand-copy their status into this file; point to them.

**Where large preserved context lives:** `docs/continuity/CONTEXT-NOTES.md` indexes external
or cross-session architectural discussions that may affect future decisions but are not yet
accepted architecture or active queue items. Promote specific pieces into `data/status/*.json`,
architecture docs, or lessons only through a PR decision record.

---

## Open Work

*Updated Session 025 — July 7, 2026*

This list holds only genuinely open items — things nobody has done yet, not a running log of
what shipped. A completed item is removed here the same session it ships, not kept and checked
off forever; its record already lives in the batch file and (for od-/td-/pe- items) in
`data/status/*.json`. If you're looking for "what happened in Session 014," open the batch file,
not this list.

**Genuinely open:**
- [ ] `Feature.MAP` — a live-page FAB linking back to `pages/terrain-map.html` (Session 025 continued) — the natural next increment for the terrain map, touches the shared `FEATURES` registry in `lib/build-vextreme.js` (real production surface), needs Victor's explicit go-ahead
- [ ] The "multi-navigational lens" / role-based-view idea Victor floated (Session 025 continued) — the terrain map's lens toggle is now Engineer/Auditor/All (recede-not-hide, off-lens nodes stay visible but smaller/dimmer) instead of the original Engineer/Health-lead pair; whether Victor wants true add/remove-by-lens instead (matching his own org-chart mockup screenshots, where a broader lens reveals boxes a narrower one didn't show at all) is still unconfirmed — the conservative recede behavior was a deliberate choice, not yet validated against what he actually pictured
- [ ] `Feature.MAP`'s live-page FAB (below) should also account for the terrain map's new fractal zoom-level ladder — a page's FAB linking "back to the map" needs to decide which level/stage to land the camera on, not just open the page at its default view
- [ ] The "Scanner check" named in `docs/architecture/14-council-model.md` (a single-instance structured self-check across named lenses before a significant judgment call) is a **proposal, not adopted practice** — Victor should review the honest-limits framing there before any future instance treats it as standing doctrine.
- [ ] `lib/build-lattice-headers.js` structural fix — replace comment-embedded sentinel markers with a real `const VEX_LATTICE = {...}` statement + a validating `LatticeNode` class; design agreed (Session 021), fresh motivating evidence from Session 024 (the sentinel hazard hit `check-lattice-edges.js` itself twice while building it) — recommended next foundational move, not yet built
- [ ] od-008 — staged/proposal execution for higher-blast-radius content gestures (consolidation, deletion, connector rewiring) — intentionally not designed yet, blocked on a real case existing to design against (Session 022)
- [ ] od-009 — parallel/simultaneous instruction dispatch across multiple departments or orgs, instead of today's one-at-a-time processing — intentionally not designed yet, no real multi-department/multi-org case exists to design against (Session 022)
- [ ] od-010 — fractal expansion of the continuity/lessons memory pattern into per-department standing memory, plus an audit for other single-scope foundational structures never checked for the same expansion — intentionally not built yet, no department generates enough independent history to need its own cell (Session 022)
- [ ] pe-011 — collapse `lib/build-archives.js` onto `data/index.json` instead of independently re-deriving from `nodes.json`/`arcs-v2.json` (Session 022)
- [ ] pe-010 — dedicated transcript-library dashboard; distinguish `ported` from God-Script-wired in `departmentMap` (Session 022)
- [ ] pe-009 (remaining) — `strings-export.js`, `strings-import.js`, legacy widget copies, `shell.js`, `vextreme.js`, `archive-renderer.js` still unmapped in the lattice
- [ ] Migrate a second arc to `bundlingStrategy: "arc-chunked"` — the mechanism already generalizes (Session 025); no second arc has enough traffic/language need yet to justify it
- [ ] `supportedLangs` is site-wide, not page-aware — adding `zh` to one arc (Session 025) makes 🇨🇳 selectable on every page, most of which have zero zh translations; degrades safely (missing-key falls back to EN) but is a known, undecided-on limitation, not a hidden defect. See `docs/architecture/06-i18n.md`'s "Arc-chunked bundling pilot."
- [ ] Session 023's standing decision: distill the PR-ordering rule (merge order vs. reasoning order) into `docs/culture.md` as doctrine, or leave it as preserved context — Victor has not yet said which
- [ ] Promote the three raw wip/ registry-graph docs (`registry-documentation-standard.md`, `ui-identiy-registry-graph.md`, `localization-registry-graph.md`) into `docs/continuity/context-notes/` — recommended (Session 025), not done; Victor said no rush
- [ ] od-002 — should build-time content synthesis use a live LLM call, or stay session-authored?
- [ ] od-003 — future: local/lightweight model as an admin-facing chat interface, escalating to Claude when needed
- [ ] od-006 — "init baseline" scaffold separating the reusable engine from this repo's specific content
- [ ] od-007 — cross-org discovery protocol between independent forks; blocked on od-006 by design
- [ ] `claude-answers-the-doubt` still blocked from God Script wiring — needs `vextreme-index-v2.js` inlined as a feature first (pe-002)
- [ ] `restoration-protocol` — v1 `shell.js` path, needs a content audit before porting
- [ ] `specimen-architectural-wisdoms` — no compiled string bundle yet, blocks God Script assembly;
  also its hand-authored decision cards stopped tracking new lessons after Session 011 (3 lessons
  since — sentinel-text-is-hazardous-to-itself, generated-file-merge-driver-needs-local-registration,
  procedure-and-record-need-separate-mutability-rules — have no decision-N card). Now that
  `data/lessons.json`/Ecosystem Hub covers discoverability, adding cards here is optional polish,
  not a gap — but still worth closing if this page ever gets unblocked.
- [ ] PWA icons (`icons/icon-192.png`, `icons/icon-512.png`) not committed — installability blocked (pe-001)
- [ ] `lib/check-link-integrity.js` — no HTML internal dead-link scanner in CI yet (td-003)
- [ ] Missing-key fallback: show EN text instead of the raw key string when a translation is absent
- [ ] `strings-check` enhancement: audit HTML for translatable elements missing `data-i18n`

**v1 system (Squarespace — lower priority, not abandoned):**
- [ ] Fix `extends` field in `archive-renderer.js` (embodiment/i-was-here preset inheritance)
- [ ] Test `renderModes` registry change live
- [ ] Test `wrapBody()` + nav auto-creation on `claude-answers-the-doubt.html` GitHub Pages
- [ ] Test `section-toggle.js` and `bc-nav.js` on live pages

**Update this list at the end of each session** — remove items that shipped (don't just check
them off), add genuinely new ones discovered during the session. Full history of what shipped
lives in the batch files.

---

## Batch Registry

Sessions are grouped in batches of 10. From Batch 003 onward, a batch is a
**directory of per-session files**, one file per session, named
`YYYY-MM-DD-session-0NN.md` — the date prefix makes the directory listing
chronological and lets future tooling filter sessions by time without parsing
anything. Batches 001–002 predate this form and remain single legacy files.

| Batch | File | Sessions | Status |
|---|---|---|---|
| 001 | `docs/continuity/Batch 001.md` | 001–010 | closed (legacy single file) |
| 002 | `docs/continuity/Batch 002.md` | 011–020 | closed (legacy single file) |
| 003 | `docs/continuity/batch-003/` | 021–030 | active |

**Active batch:** `docs/continuity/batch-003/`

When starting a new session: **create a new file** in the active batch directory
(`YYYY-MM-DD-session-0NN.md`, next session number) using the session template below.
Never insert into or edit an existing session file — a closed session is a closed
file. A continuation of the *current* session (same day, same thread) appends
`### Session continued` blocks inside that session's own file.

When a batch reaches 10 sessions:
1. Create the directory `docs/continuity/batch-00N/` with a `README.md` carrying
   the local rules (copy `batch-003/README.md` and adjust the session range)
2. Add it to this registry table and mark the previous batch closed
3. Update **Active batch** to point to the new directory

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
| What broke last time? | See newest-dated session file in the active batch directory |

---

## Continuity rules

These rules exist so the log stays useful as it grows. Follow them.

**Reading rules:**
- Always read INDEX.md first
- Read the newest-dated session file in the active batch directory before starting work
- The date prefix in session filenames is there for time-based filtering: "what happened
  since date X" is a filename comparison, not a content search
- You do not need to read old batches unless debugging something historical

**Writing rules:**
- **"Append only" applies to session records, not to this file's Current State / Open Work.**
  A session entry, once written, is never edited by a later session — that's the
  append-only historical record. In batch directories this rule has a physical shape:
  log a new session by **creating a new file**, never by inserting into an existing one.
  (Session 023's entries were once injected mid-file into Session 021's record by anchoring
  on a sentinel marker — the per-session-file form exists so that mistake is structurally
  impossible: file creation has no insertion anchor to miss.) This file's Current State and Open Work sections are the
  opposite: **replace, don't append.** Session 022 compacted both after they'd grown to a
  full paragraph per session back to Session 004 and a checklist of everything ever shipped
  since Session 005 — exactly the failure mode this rule exists to prevent. Rewrite the
  Current State paragraph to describe *now*; keep at most 3 "Recent sessions" one-liners;
  remove Open Work items the session they ship rather than checking them off and leaving them.
- One session file per working session, regardless of length. A different day or a
  different instance means a new session (and a new file), even mid-discussion
- If a session is a continuation of the prior one (same day, same thread),
  append a `### Session continued` block inside that session's own file rather
  than creating a new session
- Prefer `node lib/append-session-continuation.js <session-file.md> <continuation.md>`
  for same-session continuations. The VXG marker is a completion boundary/signature,
  not an insertion anchor; the helper appends at EOF and preserves the file's line
  endings.
- Update **Current State** and **Open Work** in this file at session end — by replacing, not appending
- Include the Claude thread link — it is the primary source of reasoning

**Batch rules:**
- Maximum 10 sessions per batch
- When a batch is full, create the next batch directory (with its README) and
  update the registry here
- Batch directories are named `batch-003/`, `batch-004/` etc. — zero-padded;
  session files inside are named `YYYY-MM-DD-session-0NN.md`
- Batches 001–002 are legacy single files (`Batch 001.md`, `Batch 002.md`) —
  leave them as they are; do not convert closed history
- Do not merge or split batches after creation

**What to log:**
- Files created or modified (with one-line description of what changed)
- Context notes referenced or created (map key only, not the full note)
- Mistakes — specific, with cause and fix
- Assumptions — both confirmed and unconfirmed
- Open work at session end
- Thread link and instance/model info

**What not to log:**
- Blow-by-blow of what commands were run
- Content of files (that's what the files are for)
- Full context-note bodies; link them and summarize why they matter
- Speculation about future sessions
- Anything you wouldn't want a future instance to treat as factual

---

## New session file template

Create as `docs/continuity/batch-00N/YYYY-MM-DD-session-0NN.md`:

```markdown
# VEXTREME — Continuity Batch 00N · Session 0NN

[← Session 0NN-1](YYYY-MM-DD-session-0NN-1.md) · [Batch 00N guide](README.md)

---

## Session 0NN

**Date:** YYYY-MM-DD
**Time:** approximate range
**Thread:** https://claude.ai/share/...
**Instance:** Claude [model] ([interface])
**Working with:** [name]
**Continues from:** Session 0NN — [one line]

### Context on arrival

### Context notes referenced or created

| Note | Why it matters to this session | Read deeper when |
|---|---|---|
| | | |

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

<!-- [VXG RealForever] -->
```

---

*Last updated: Session 025 — July 7, 2026*

<!-- [VXG RealForever] -->
