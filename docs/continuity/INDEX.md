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

*As of Session 022 — July 4, 2026*

The v2 GitHub Pages architecture is the active system. v1 (`data/arcs.json`, `data/pages.json`,
`lib/vextreme.js`/`archive-renderer.js`/`arc-nav.js`) still serves the live Squarespace site
directly at runtime, but shares no runtime path with v2's build pipeline — confirmed frozen,
not a file future arc work needs to keep in sync (Session 022; see
`docs/architecture/03-data.md`'s "v1 vs v2" section and
`config/lessons/v1-arcs-json-is-frozen-not-a-sync-target.json`). The God Script pipeline assembles one
self-contained JS file per page; `data/nodes.json` + `data/arcs-v2.json` + `data/departments.json`
are the write-side sources `lib/build-index.js` compiles into `data/index.json`, which
everything downstream reads. Content now has two independent groupings: **arcs** (reader-facing
narrative order) and **departments** (production-domain ownership — `rd` default, `media` with
`reviews`/`record-transcripts` workTypes, and a new `institute` department with `governance`
(accountability/testing docs — `witness-committee-operations`, `human-ai-corelational-governance`)
and `org-design` (`org-blueprint`, `org-history`, `bridge-council`, `bridge-council-os`,
`bridge-council-schema`) workTypes). Any `pages/*.html` file with no `nodes.json` entry is
auto-discovered (title scraped from its own `<title>` tag) rather than left invisible —
`lib/auto-discover-nodes.js`. Declared placement is applied, not hand-edited: `config/content-intents.json`
+ `lib/apply-content-intents.js` upsert a page's `vex:department`/`vex:workType` meta tags and
optionally place it into an arc's one auto-managed section in `arcs-v2.json`, validating the
department/arcKey are real before writing anything (an earlier gap — nothing previously stopped
an unregistered department from existing in `index.json` while never rendering anywhere). This
is the first concrete instance of a longer-term direction — `docs/architecture/13-intent-driven-operations.md`
names the full perceive → fetch/synthesize → judge → declare-intent → verify loop, what's built,
and what's intentionally not designed yet (pe-012, od-008) — read it before extending this pattern
further. `docs/architecture/14-council-model.md` names a related, separate direction: whether one
AI instance can structure its own judgment across multiple named lenses instead of coordinating
multiple instances — grounded in `pages/org-blueprint.html`/`data/council-kernel.json`, explicitly
distinguished from `od-009` (which is about dispatch across genuinely separate targets, not one
instance's own reasoning). Slug uniqueness is mechanically enforced (BLOCK severity) in
`lib/build-index.js`; orphan pages and `wip/` placement conflicts are reported (informational)
via `lib/check-key-alignment.js` and a `contentIntegrity` panel on the Ecosystem Hub. Three
silent-drift detectors run in CI: `lib/build-lattice-headers.js --check` (LATTICE header drift),
`lib/check-key-alignment.js` (slug/arc/page/wip drift), `lib/check-design-tokens.js` (CSS token
resolution). 290/290 tests passing. Lattice coverage 26/37 (70%).

**Recent sessions** (one line each — open the batch file below for full reasoning):
- **Session 022** — Department axis, slug-uniqueness guard, WIP/orphan-page auto-discovery,
  a documented decision on what the archive's declarative content actually records, this
  Current-State/Open-Work compaction, a lesson on procedure-vs-record mutability, and
  `lib/build-lessons.js` (config/lessons/*.json → data/lessons.json → Ecosystem Hub's new
  "Lessons Learned" section) — closing a gap where the lesson archive had no path into the
  one dashboard meant to surface current system knowledge. Also found and fixed
  `lib/build-status.js`/`lib/build-ecosystem-hub.js` being generated and committed by hand
  every session with no CI step ever calling them — both now wired into
  `.github/workflows/build-index.yml`. PRs #40–#47.
- **Session 021** — First-person AI-instance reflection in `docs/culture.md`,
  `lib/session-bootstrap.js` (session-start state in one command), td-008 recorded.
- **Session 020** — od-006 (init baseline scaffold) and od-007 (cross-org discovery protocol)
  recorded; no code changed.

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