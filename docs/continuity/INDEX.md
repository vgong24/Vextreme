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

*As of Session 022 (continued) — July 5, 2026*

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
`lib/check-key-alignment.js` and a `contentIntegrity` panel on the Ecosystem Hub. Three
silent-drift detectors run in CI: `lib/build-lattice-headers.js --check` (LATTICE header drift),
`lib/check-key-alignment.js` (slug/arc/page/wip drift), `lib/check-design-tokens.js` (CSS token
resolution). 319/319 tests passing. Lattice coverage 29/40 (73%).

**Recent sessions** (one line each — open the batch file below for full reasoning):
- **Session 022 (continued, wip/ drafts)** — Victor added `wip/victor-methodology-presentation.html`
  directly and found zero automated mapping. Built the initial-mapping-on-insertion +
  reconcile-not-error-on-move pattern described above: `discoverWipDrafts`, `scanWipHtmlDrafts`,
  a new `contentIntegrity` notice, and `lib/detect-wip-promotions.js`'s git-rename-based PR notice.
- **Session 022 (continued, council lenses + roles)** — Re-perceived Victor's "role positioning /
  communication channels / kanban discussions / instruction routing" ask across two rounds: a
  `lens` field + Council Lenses panel, then `data/roles.json`/`pages/roles-index.html`'s full
  traceability layer. Recorded the honest lessons and `od-010` in `docs/architecture/14-council-model.md`.
- **Session 022** — Department axis, slug-uniqueness guard, WIP/orphan-page auto-discovery,
  `lib/build-lessons.js` (config/lessons/*.json → data/lessons.json → Ecosystem Hub's "Lessons
  Learned" section), and wiring `lib/build-status.js`/`lib/build-ecosystem-hub.js` into CI. PRs #40–#47.

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

---

## Open Work

*Updated Session 022 — July 4, 2026*

This list holds only genuinely open items — things nobody has done yet, not a running log of
what shipped. A completed item is removed here the same session it ships, not kept and checked
off forever; its record already lives in the batch file and (for od-/td-/pe- items) in
`data/status/*.json`. If you're looking for "what happened in Session 014," open the batch file,
not this list.

**Genuinely open:**
- [ ] The "Scanner check" named in `docs/architecture/14-council-model.md` (a single-instance structured self-check across named lenses before a significant judgment call) is a **proposal, not adopted practice** — Victor should review the honest-limits framing there before any future instance treats it as standing doctrine.
- [ ] pe-012 — `lib/check-lattice-edges.js`: verify `docs/lattice-map.json`'s claimed reads/writes/loadedBy edges against actual code (Session 022; see `docs/architecture/13-intent-driven-operations.md` for why this is the decided next step)
- [ ] od-008 — staged/proposal execution for higher-blast-radius content gestures (consolidation, deletion, connector rewiring) — intentionally not designed yet, blocked on pe-012 and on a real case existing to design against (Session 022)
- [ ] od-009 — parallel/simultaneous instruction dispatch across multiple departments or orgs, instead of today's one-at-a-time processing — intentionally not designed yet, no real multi-department/multi-org case exists to design against (Session 022)
- [ ] od-010 — fractal expansion of the continuity/lessons memory pattern into per-department standing memory, plus an audit for other single-scope foundational structures never checked for the same expansion — intentionally not built yet, no department generates enough independent history to need its own cell (Session 022)
- [ ] `lib/build-lattice-headers.js` structural fix — replace comment-embedded sentinel markers with a real `const VEX_LATTICE = {...}` statement + a validating `LatticeNode` class; design agreed (Session 021), not yet built
- [ ] pe-011 — collapse `lib/build-archives.js` onto `data/index.json` instead of independently re-deriving from `nodes.json`/`arcs-v2.json` (Session 022)
- [ ] pe-010 — dedicated transcript-library dashboard; distinguish `ported` from God-Script-wired in `departmentMap` (Session 022)
- [ ] pe-009 (remaining) — `strings-export.js`, `strings-import.js`, legacy widget copies, `shell.js`, `vextreme.js`, `archive-renderer.js` still unmapped in the lattice
- [ ] od-001 — should the per-scope JA bundling strategy change before a 3rd language is added?
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

Sessions are grouped in batches of 10. When a batch file reaches 10 entries,
create the next batch file and update this registry.

| Batch | File | Sessions | Status |
|---|---|---|---|
| 001 | `docs/continuity/Batch 001.md` | 001–010 | closed |
| 002 | `docs/continuity/Batch 002.md` | 011–020 | closed |
| 003 | `docs/continuity/Batch 003.md` | 021–030 | active |

**Active batch:** `docs/continuity/Batch 003.md`

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
- **"Append only" applies to the batch files, not to this file's Current State / Open Work.**
  A batch file session entry, once written, is never edited by a later session — that's the
  append-only historical record. This file's Current State and Open Work sections are the
  opposite: **replace, don't append.** Session 022 compacted both after they'd grown to a
  full paragraph per session back to Session 004 and a checklist of everything ever shipped
  since Session 005 — exactly the failure mode this rule exists to prevent. Rewrite the
  Current State paragraph to describe *now*; keep at most 3 "Recent sessions" one-liners;
  remove Open Work items the session they ship rather than checking them off and leaving them.
- One session block per working session, regardless of length (in the batch file)
- If a session is a continuation of the prior one (same day, same thread),
  note that in the Context on Arrival field rather than creating a new session
- Update **Current State** and **Open Work** in this file at session end — by replacing, not appending
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

*Last updated: Session 022 — July 4, 2026*

<!-- [VXG RealForever] -->