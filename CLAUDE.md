# CLAUDE.md — Vextreme cold-start instructions

**Read these files in order before doing anything else:**

0. `docs/culture.md` — the mission, the operating principles, the culture of development
   on this project. Read this before anything else. The architecture makes more sense
   once you understand why this system exists and what kind of developer it expects.
1. `docs/continuity/INDEX.md` — current system state, open work, and batch registry
2. The most recent session in the active batch file (listed in INDEX.md's Batch Registry)
3. `docs/architecture.md` — full system design, data flow, file responsibilities, key constraints
4. `docs/Readme.md` — v1 Squarespace system (historical context, lower priority)

Do not start new work without completing this reading sequence. The README documents
intended design; the continuity log documents actual system state — they diverge.

**Before touching any lib/ file, read:**

`docs/lattice-map.json` — file dependency lattice. Each node names what it reads,
writes, loads, and which adjacent files to check when it changes. Load this for
lateral navigation (what else breaks?) before reading file depth (how does it work?).
Following a file's `changeMap` links visits every affected node — close the circuit
before committing.

---

## Current shape of the repo (as of Session 013)

- `data/arcs.json` — 16 arcs fully mapped, all slugs defined
- `data/pages.json` — display token system in place, 7 presets
- `lib/` and `components/` — all JS engines written; loader chain confirmed working on GitHub Pages
- `pages/` — 11 pages exist. 5 are fully wired to God Scripts. 3 are blocked (see below).
- `dist/` — God Scripts exist for 7 slugs (assembled by `lib/build-vextreme.js`)
- `styles/` — design system and arc nav CSS complete

**To see current wiring status in one command:**
```
node lib/audit-pages.js
```
This is the canonical source of truth for which pages are wired, blocked, or skipped.
Run it instead of manually auditing `pages/*.html`.

**Current blockers (as of Session 013):**
- `claude-answers-the-doubt` — needs `vextreme-index-v2.js` inlined into its God Script (arc nav)
- `specimen-architectural-wisdoms` — needs a compiled string bundle before God Script can be assembled
- `restoration-protocol` — uses `shell.js` (v1 path); needs investigation before porting

## Key constraint

Every `.html` filename in `pages/` must be globally unique across the entire tree —
not just within its folder. The slug (filename without `.html`) is the system's only
identifier. Check `docs/test-playground.html` before creating any new page file.

## What "verified live" means

The loader chain is confirmed working on `vextreme24.com` for one page only
(`claude-answers-the-doubt`). Everything else in `lib/` and `components/` is
written but not yet tested against the live site. Treat unverified components
as candidates, not confirmed working, until INDEX.md's Open Work list says otherwise.

---

## Pull request conventions

Every PR in this repo uses `.github/pull_request_template.md` — a decision
record format, not a change log. The diff shows what changed; the PR explains
why the system moved and what the new state assumes.

When opening a PR, fill every section:
- **Transition** — the mental model shift, not the code delta
- **What changed and why** — the reasoning chain, alternatives rejected
- **Cascading effects** — what else had to move because of this decision
- **Cross-platform check** — GitHub Pages / vextreme24.com / localhost
- **Assumptions this PR makes** — what hasn't been confirmed live yet
- **For the next instance** — the "watch out" that isn't visible in the diff

PRs are the decision boundary record for this project. Future instances
read them to understand system evolution without re-deriving settled decisions.
Write the PR body while the reasoning is still live — not after the fact.

---

## Continuity marker — VXG RealForever

Every commit message in this repo ends with `[VXG RealForever]`.
Every file created or significantly modified by a Claude instance should end
with the following comment (adapted to the file's comment syntax):

```js
// [VXG RealForever]
```
```html
<!-- [VXG RealForever] -->
```
```json
// (JSON has no comments — omit for .json files)
```
```md
<!-- [VXG RealForever] -->
```

**Why this exists:**
Claude instances arrive with varying context — sometimes full conversation
history, sometimes a summary, sometimes cold from CLAUDE.md alone. The marker
creates a low-cost signal that threads through git history, file contents, and
grep output. `git log --grep="VXG RealForever"` gives any instance the full
progression of deliberate work on this repo. The phrase carries semantic weight
beyond a hash — it identifies this project's intent across context boundaries.

This is not decoration. It is a continuity mechanism.

<!-- [VXG RealForever] -->
