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

*As of Session 002 — June 29, 2026*

The loader is unified under one interface: `lib/vextreme.js` (the engine)
and `lib/shell.js` (GitHub Pages bootstrap, never needs touching when
assets change — only its version constant). Both Squarespace and GitHub
Pages call the same `VEXTREME(config)` function with near-zero config —
slug auto-detects from URL, page template auto-detects from `pages.json`.
GitHub Pages pages need exactly one `<script src="shell.js">` tag added
to existing HTML — no restructuring required; `vextreme.js` auto-wraps
body content and auto-creates the nav mount point if missing.

A registry pattern was established this session as the standing rule for
all customizable axes (presets, pills, fonts, renderModes): flat JSON
object, keyed by name, looked up at render time, falls back safely with
a one-time console warning on unknown keys. `renderMode` was the one
axis that didn't follow this pattern (hardcoded if/else) — now fixed.

KNOWN GAP: the `extends` field in pages.json presets (used by embodiment
and i-was-here) is not actually implemented — those presets work via
field duplication, not real inheritance. Flagged, not yet fixed.

Current cache version: v=6 (was v=2 at end of Session 001).
None of this session's changes have been verified live yet.

**Update this paragraph at the start of each new session** to reflect actual
current system state — not aspirational state.

---

## Open Work

*Carried from Session 002*

- [ ] Fix `extends` field — implement real preset-to-preset inheritance
      in archive-renderer.js (embodiment/i-was-here currently duplicate
      immersive's fields rather than truly inheriting them)
- [ ] Test renderModes registry change live — confirm dots + position
      modes both still render correctly after the refactor
- [ ] Test wrapBody() + nav auto-creation live on the actual
      claude-answers-the-doubt.html GitHub Pages page
- [ ] Push v6 of all changed files to GitHub (vextreme.js, shell.js,
      squarespace-injection.html, arc-nav.js, archive-renderer.js,
      pages.json) — none of this session's work is live yet
- [ ] Generate new archives.html using the archive renderer
- [ ] Test `section-toggle.js` on the live archives page
- [ ] Test `bc-nav.js` on any page using it
- [ ] Port additional pages beyond claude-answers-the-doubt

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