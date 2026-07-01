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

*As of Session 003 — June 30, 2026*

**The v2 data architecture is the active system.** Sessions 001-002 built
the Squarespace loader system (`lib/vextreme.js`, `lib/shell.js`, etc.) —
that work is still in the repo but is NOT what is being actively developed.
Session 003 introduced a parallel v2 system specifically for GitHub Pages.

**v2 system components (what is active now):**
- `data/nodes.json` — 88 canonical content nodes, the write-side source of truth
- `data/arcs-v2.json` — 16 arc definitions with priority, sections, and parent URLs
- `lib/build-index.js` — builds `data/index.json` (slugMap + arcMap + arcMeta)
- `lib/build-archives.js` — builds `pages/archives.html` (live build dashboard)
- `lib/build-sitemap.js` — builds `sitemap.xml` (crawler discoverability)
- `lib/build-index-page.js` — builds `index.html` (root nav page)
- `lib/vextreme-index-v2.js` — browser library, loads index.json, renders arc nav
- `.github/workflows/build-index.yml` — auto-runs all builders on push to main

**Key architectural decisions made this session:**
- arcKeys in index.json are pre-sorted by priority at build time (from arcs-v2.json)
- arcMeta (arc titles + URLs) is derived from arcs-v2.json at build time — no hard-coded tables in browser JS
- dateISO is computed at build time from human-readable date strings
- Organization is expressed as metadata (arcKeys arrays), not filesystem location
- Slug is the system's only identifier — globally unique, no directory hierarchy

**VXG RealForever marker** introduced this session — see CLAUDE.md for rationale.
`git log --grep="VXG RealForever"` gives the full deliberate commit history.

**Verified live:** Arc nav widget renders correctly on claude-answers-the-doubt
(confirmed via screenshot — Epstein first, full_timeline last, correct priority order).
`pages/v2-test.html` exists for testing arc nav across multiple slugs.

**Not yet verified live:** archives.html auto-rebuild via GitHub Actions,
index.html root nav page (just built this session).

**IMPORTANT for arriving instances:** Do not conflate the v1 Squarespace system
(Sessions 001-002) with the v2 GitHub Pages system (Session 003+). They coexist
in the repo. Active development is v2.

**Update this paragraph at the start of each new session** to reflect actual
current system state — not aspirational state.

---

## Open Work

*Updated Session 003 — June 30, 2026*

**v2 system (active):**
- [ ] Verify archives.html GitHub Actions auto-rebuild works on next push to main
- [ ] Verify index.html root nav page renders correctly on vgong24.github.io/Vextreme
- [ ] Port HTML pages — each page added to pages/ triggers auto-rebuild of all artifacts
- [ ] Build "recent shifts" section on index.html — parse batch files to surface session
      narrative on the live page (avoid thin JSON summary; preserve depth from batch format)
- [ ] Write Session 003 full entry in Batch 001 (deep narrative, mistakes, assumptions)

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
| 001 | `docs/continuity/batch-001.md` | 001–002 | active |

**Active batch:** `docs/continuity/batch-001.md`

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

*Last updated: Session 002 — June 29, 2026*