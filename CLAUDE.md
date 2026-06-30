# CLAUDE.md — Vextreme cold-start instructions

**Read these three files in order before doing anything else:**

1. `docs/continuity/INDEX.md` — current system state, open work, and batch registry
2. The most recent session in the active batch file (listed in INDEX.md's Batch Registry)
3. `docs/README.md` — architecture, load order, file responsibilities, and token reference

Do not start new work without completing this reading sequence. The README documents
intended design; the continuity log documents actual system state — they diverge.

---

## Current shape of the repo (as of Session 002)

- `data/arcs.json` — 16 arcs fully mapped, all slugs defined
- `data/pages.json` — display token system in place, 7 presets
- `lib/` and `components/` — all JS engines written, not all verified live
- `pages/` — **intentionally sparse**: only `claude-answers-the-doubt.html` exists so far.
  The arc map is complete; the HTML pages are being added progressively.
  A small `pages/` count is not a sign of breakage — it is the expected starting condition.
- `styles/` — design system and arc nav CSS complete; page-template CSS partial

## Key constraint

Every `.html` filename in `pages/` must be globally unique across the entire tree —
not just within its folder. The slug (filename without `.html`) is the system's only
identifier. Check `docs/test-playground.html` before creating any new page file.

## What "verified live" means

The loader chain is confirmed working on `vextreme24.com` for one page only
(`claude-answers-the-doubt`). Everything else in `lib/` and `components/` is
written but not yet tested against the live site. Treat unverified components
as candidates, not confirmed working, until INDEX.md's Open Work list says otherwise.
