# CLAUDE.md — Vextreme cold-start instructions

**Read these files in order before doing anything else:**

0. `docs/culture.md` — the mission, the operating principles, the culture of development
   on this project. Read this before anything else. The architecture makes more sense
   once you understand why this system exists and what kind of developer it expects.
1. `docs/continuity/INDEX.md` — current system state, open work, and batch registry
2. `docs/process/multi-agent-work-coordination.md` — live ownership claims, overlap rules, and the cold-start coordination check
3. The newest-dated session file in the active batch directory (listed in INDEX.md's
   Batch Registry) — session files are named `YYYY-MM-DD-session-0NN.md`, so the last
   file in `ls` order is the most recent session
4. `docs/architecture.md` — full system design, data flow, file responsibilities, key constraints
5. `docs/Readme.md` — v1 Squarespace system (historical context, lower priority)

Do not start new work without completing this reading sequence. The README documents
intended design; the continuity log documents actual system state — they diverge.

Run `npm run current-work` before selecting or claiming work. When authenticated
GitHub CLI access is available, it reads machine-readable ownership claims from
open pull requests and reports actor, instance, epic position, dependencies,
bounded paths, leases, and overlaps. If live state is unavailable, ownership is
unknown; that is a stop condition for shared-path mutation, not permission to begin.
Open a draft PR with a valid claim before changing shared paths. A claim coordinates
work and does not grant implementation, merge, acceptance, data, or public authority.

## Expansion context notes

Some architectural discussions are too large for `CLAUDE.md` but still affect future
design decisions. Before implementing changes touching repo topology, AI workflow,
localization, notification flow, external org mapping, or slug/registry scalability, check:

- `docs/continuity/CONTEXT-NOTES.md`

That registry links large external or cross-session discussions without turning
`CLAUDE.md` into a catch-all archive. Treat listed files as preserved reasoning and
candidate architecture, not as accepted implementation work. Convert any piece into
implementation only through the normal PR decision-record process.

**Before touching any lib/ file, read:**

`docs/lattice-map.json` — file dependency lattice. Each node names what it reads,
writes, loads, and which adjacent files to check when it changes. Load this for
lateral navigation (what else breaks?) before reading file depth (how does it work?).
Following a file's `changeMap` links visits every affected node — close the circuit
before committing.

The JSON is the write side; the LATTICE block inside each covered file's own header
is a generated read side — never hand-edit text between a file's `LATTICE:BEGIN` /
`LATTICE:END` lines. Edit the JSON, then run `node lib/build-lattice-headers.js` to
regenerate the affected file's header (`--check` reports drift without writing —
this is what CI runs). Coverage is partial (18 nodes as of Session 014); see pe-009
in `data/status/planned-enhancements.json` for the expansion queue.

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

**To see which pages a visitor can actually navigate away from:**
```
node lib/audit-nav.js
```
Being wired to a God Script does not by itself mean a page is reachable from, or can reach,
anywhere else — this checks static hub links, `shell.js`, and God-Script FAB navigation
independently. As of Session 2026-07-10, 31 of 39 pages are dead ends (no way out) —
see `docs/architecture/16-nav-coverage.md` for the fuller account and rollout plan.

**Current blockers (as of Session 013):**
- `claude-answers-the-doubt` — needs `vextreme-index-v2.js` inlined into its God Script (arc nav)
- `specimen-architectural-wisdoms` — needs a compiled string bundle before God Script can be assembled
- `restoration-protocol` — uses `shell.js` (v1 path); needs investigation before porting

**Before opening or reviewing a PR, run `npm run pr-ready`** — it chains the test suite and every
drift/health check script in one command.

Use `npm run branch-triage` to inspect stale/dirty branch state before cleanup or cross-model handoff.
It is read-only and does not replace human approval for cleanup.

Use `npm run current-work` for a read-only orientation report at the start of a session — current
branch, working-tree state, gone-upstream branches, open PRs (if `gh` is available), and safe next
steps. It never mutates anything and does not run `pr-ready` for you.

For the capability-aware Victor/Vex/Codex loop, optional model-review lenses,
role boundaries, and when to return to Vex, see
`docs/process/cross-model-orchestration.md`.

The next stabilization layer, environment/tooling-capability awareness, is designed but not yet
built — see `docs/process/environment-health-design.md` before implementing `environment-health`.

Before continuing localization implementation architecture beyond what's already public, read
`docs/process/public-private-boundary.md` — high-value implementation work is meant to move to a
private repo, not build out further here.

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

**Branch / PR naming convention:**
- Git branch: `VXG-MMddyy-{instance}-{short-work-slug}`
- Epic PR title: `[Epic: <epic name>][<item index>/<known total or N>] <outcome>`
- Independent PR title: imperative/outcome title with `Epic: none` declared in the body
- Commit subject: `VXG-MMddyy: short imperative summary [VXG RealForever]`

Examples:
- Branch: `VXG-070626-codex-page-binding-health-checks`
- PR title: `[Epic: Page Health][1/N] Add screen capability projection`
- Commit: `VXG-070626: add page binding health checks [VXG RealForever]`

Use the Git-safe hyphenated form for branches; do not put `:` in the actual
branch name. Use a numeric total when the split is stable and `N` while
discovery may add rows. Do not rename merged PRs only because a later total
changes. Keep the required `[VXG RealForever]` suffix on every commit.

---

## Continuity marker — VXG RealForever

Every commit message in this repo ends with `[VXG RealForever]`.
Every file created or significantly modified by an AI instance should end
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
