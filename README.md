# Vextreme

VexLife Website and all related documents — a personal content archive with
its own build pipeline, hosted two ways, that a Claude Code instance can
develop autonomously alongside Victor Gong.

This file is the orientation for a new visitor. It stays short on purpose —
each section below points at the file that actually owns that depth.

---

## What this is

Two live surfaces serve the same content:

| Surface | URL | Role |
|---|---|---|
| GitHub Pages | [vgong24.github.io/Vextreme](https://vgong24.github.io/Vextreme) | Source of truth, active development |
| Squarespace | [vextreme24.com](https://vextreme24.com) | Production site, loads its JS/CSS from this repo via CDN |

Everything under `pages/` is content. Everything under `lib/`, `data/`,
`widgets/`, and `docs/` is the system that assembles, indexes, and serves it.
The content itself spans a wide range of registered topics and arcs — what
some of the more declarative material actually documents (rather than
asserts as objective fact) is stated directly in
[`docs/culture.md`](docs/culture.md#what-this-archives-content-actually-records).

## Start here

- **[Ecosystem Hub](https://vgong24.github.io/Vextreme/pages/ecosystem-hub.html)**
  — live system state: content counts, department breakdown, open tech debt,
  translation gaps, and content-integrity flags. Fetches its data at page-load
  time, so it reflects whatever was last built on `main` without needing to be
  regenerated itself.
- **[Archives](https://vgong24.github.io/Vextreme/pages/archives.html)** —
  the complete page registry: every arc's works as live or not-yet-ported
  cells, plus an "Unsorted" section for anything not yet in an arc. This page
  *is* rebuilt from source at build time (not live-fetched), so it reflects
  the state as of the last CI run on `main`.

## How content actually moves through the system today

This is the real, currently-working flow — not an aspiration.

1. **Register a work.** Add an entry to `data/nodes.json`: a `slug`, a
   `title`, and either `arcKeys` (which narrative arc it belongs to) or
   `department`/`workType` (which production domain owns it — see
   `data/departments.json`). No page file is required yet.
2. **Push to `main`** (directly or via a reviewed PR). CI
   (`.github/workflows/build-index.yml`) rebuilds `data/index.json`,
   `pages/archives.html`, `data/status.json`, and the rest of the pipeline
   automatically — nobody has to remember to run the build scripts by hand.
3. **The dashboards update.** The Ecosystem Hub live-fetches the freshly
   rebuilt `data/index.json`/`data/status.json` on next page load — no
   redeploy of the hub page itself needed. Archives shows the new entry as a
   "not yet ported" cell (dashed border) the next time its own build step
   runs, which the same CI push already triggered.
4. **Author the page.** Create `pages/{slug}.html` using the *exact* slug as
   the filename. The next CI rebuild flips that same cell from "not yet
   ported" to live and linked — no manual wiring beyond getting the filename
   right.
5. **Translation status** (once a page has `data-i18n` keys wired to
   `data/strings/source/`) shows automatically as per-language chips on
   Archives — full or partial coverage, computed from the compiled strings
   manifest at build time.
6. **If something's off** — a `pages/*.html` file with no registered node, or
   a queued `wip/` file whose intended slug already exists — the Ecosystem
   Hub's Content Integrity panel flags it, and the same check posts a comment
   on any open PR. Informational only; nothing here blocks a merge.

Slugs are globally unique across the whole repo and `pages/` is intentionally
flat — see `docs/architecture.md`'s constraints for why, and don't try to
nest it.

## Going deeper

| If you want... | Read |
|---|---|
| The mission and how decisions get made here | `docs/culture.md` |
| Full system design — data flow, build pipeline, every file's job | `docs/architecture.md` |
| What's currently open, what changed last, and why | `docs/continuity/INDEX.md` |
| Cold-start instructions if you're an AI instance picking this up | `CLAUDE.md` |
| The original Squarespace-era system (historical, not active) | `docs/Readme.md` |

## For humans working in this repo directly

You don't need to run anything locally to add content — steps 1–2 above work
from the GitHub web UI alone. If you *are* working locally: `npm test` runs
the full test suite, `node lib/audit-pages.js` shows current page-wiring
status, and `node lib/check-key-alignment.js` runs the same integrity check
CI posts to PRs. All three are read-only or additive — none of them can lose
work.

<!-- [VXG RealForever] -->
