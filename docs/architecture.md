# VEXTREME — Architecture Blueprint

**This is the authoritative system design document.**
Read this before reading code. The code implements these decisions;
this document explains why they were made.

For current system state (what is live vs. not yet verified), read
`docs/continuity/INDEX.md`. This document covers the design — not the status.

---

## System identity

Vextreme is a content archive with two deployment surfaces:

| Surface | URL | Technology |
|---|---|---|
| Primary site | vextreme24.com | Squarespace (v1 loader system) |
| Preservation archive | vgong24.github.io/Vextreme | GitHub Pages (v2 system) |

Both surfaces serve the same content. The GitHub Pages version is the
source of truth for all structural data and the primary development surface.
The Squarespace surface loads JS/CSS from GitHub via jsDelivr CDN.

**Active development is the v2 system.** The v1 Squarespace loader (Sessions
001-002) is stable but not the focus. Do not conflate them.

---

## The core identity primitive: slug

Every piece of content has a **slug** — a globally unique string identifier
that is also the filename without `.html`.

```
slug: "claude-answers-the-doubt"
file: pages/claude-answers-the-doubt.html
url:  vgong24.github.io/Vextreme/pages/claude-answers-the-doubt.html
```

**Rules that cannot be broken:**
- Slugs are globally unique across the entire repo — no namespace by arc or folder
- `pages/` is a flat directory — no subdirectories, ever
- The slug is the system's only identifier — arc membership, ordering, and metadata
  all reference it; nothing references file paths or URLs directly

This constraint is what makes the arc system work. A page can belong to
multiple arcs simultaneously because arcs reference slugs, not files.

---

## Data architecture (CQRS pattern)

The system uses a Command Query Responsibility Segregation pattern:

```
WRITE SIDE (source of truth — edit these)        READ SIDE (artifacts — never edit directly)
─────────────────────────────────────────        ─────────────────────────────────────────
data/nodes.json        ──┐                       data/index.json        (slugMap + arcMap + arcMeta)
data/arcs-v2.json      ──┼── build pipeline ──▶  pages/archives.html   (build dashboard)
data/strings.json      ──┘                       sitemap.xml            (crawler index)
                                                 index.html             (root nav page)
```

**Write side files:**

`data/nodes.json` — 88 canonical content nodes. Each node:
```json
{
  "id": 20,
  "slug": "claude-answers-the-doubt",
  "title": "Claude Answers the Doubt",
  "date": "December 22, 2025",
  "arcKeys": ["epstein", "claude_journals", "full_timeline"],
  "vexData": {}
}
```
`id` is the timeline position (null for undated/utility nodes).
`arcKeys` is the authored list of arc memberships — sorted by priority at build time.

`data/arcs-v2.json` — 16 arc definitions. Each arc has:
- `priority` — display order (1 = primary, 2 = secondary, 99 = meta)
- `parent` — `{ title, url }` for the arc hub link on vextreme24.com
- `sections` — ordered list of sections, each with `order` and `slugs` or `dateRange`
- `renderMode` — how the arc nav widget visualizes this arc (dots, position)

`data/strings.json` — UI string registry for internationalization.
Keys are namespaced string IDs; values map language codes to display strings.
See **Internationalization** section below.

**Build pipeline** (runs automatically via GitHub Actions on push to main):
```
lib/build-index.js       → data/index.json
lib/build-archives.js    → pages/archives.html
lib/build-sitemap.js     → sitemap.xml
lib/build-index-page.js  → index.html
```

Trigger paths: `data/nodes.json`, `data/arcs-v2.json`, `data/strings.json`,
`lib/build-*.js`, `pages/**`

**Read side files** are committed artifacts — they exist in the repo so GitHub
Pages can serve them without a build step at request time. Never edit them
directly. Change the write-side sources and push; the pipeline rebuilds.

---

## Build-time computations

The build step does work so the browser doesn't have to:

| Computed field | Source | Where it lands |
|---|---|---|
| `arcKeys` (priority-sorted) | `arcs-v2.json` priority field | `index.json` slugMap |
| `dateISO` ("YYYY-MM-DD") | `nodes.json` date string | `index.json` slugMap |
| `arcMeta` (title + URL per arc) | `arcs-v2.json` parent field | `index.json` arcMeta |
| `arcMap` (sections → ordered slugs) | `arcs-v2.json` sections | `index.json` arcMap |

The browser library (`lib/vextreme-index-v2.js`) has **no hard-coded arc data**.
It reads everything from `index.json`. Adding a new arc to `arcs-v2.json` and
pushing is all that is needed — no JS edits required.

---

## Section ordering

Arcs have two section ordering modes:

**Explicit** — narrative/editorial order. Slugs listed exactly in `arcs-v2.json`.
This encodes authorial intent — the system cannot auto-derive story sequence.
Changing the order means editing `arcs-v2.json`.

**Chronological** — auto-sorted by `dateISO`. Used by `full_timeline` sections
with `dateRange` boundaries. Adding a new dated node automatically places it
in the correct position on next build. No manual ordering needed.

---

## Browser layer

`lib/vextreme-index-v2.js` — loaded on GitHub Pages pages only.

Load sequence:
1. Checks `localStorage` for cached `index.json` (key: `vex-index-v2-data`)
2. If cached: serves immediately, then revalidates in background via ETag
3. If cold: fetches from jsDelivr CDN, caches result
4. Calls `getLatticeView(slug, index)` → builds arc nav data for current page
5. Calls `renderArcNav(lattice, mountEl)` → writes HTML into `#arcNavMount`

`getLatticeView` uses `node.arcKeys` (pre-sorted by priority) to determine
display order. No sorting happens in the browser.

Slug detection: reads `window.VEX_SLUG` if set (test override), otherwise
parses `window.location.pathname` last segment minus `.html`.

URL construction: `/pages/<slug>.html` on GitHub Pages, `/<slug>` on vextreme24.com.

---

## Internationalization (i18n)

The system is designed for multi-language support from the ground up.

**Architecture:**

```
data/strings.json          — string registry (stringId → { langCode → displayString })
build scripts              — embed data-i18n="stringId" on UI elements (no hardcoded text)
generated HTML             — carries data-i18n keys as identity; no display strings in markup
i18n resolver (inline JS)  — reads data-i18n, resolves against strings.json + user lang
language switcher          — sets lang preference in localStorage, re-resolves all elements
```

**String ID convention:** `layer.context.key`
```
ui.archives.pageTitle         → "The Archive"
ui.archives.overallProgress   → "Overall progress"
ui.cell.notYetPorted          → "Not yet ported"
arc.liberation.title          → "The AI Liberation Record"
```

**Node titles** (content strings, not UI strings) live in `nodes.json`.
If node-level translation is added, extend the node schema with a `titleI18n`
map: `{ "ja": "疑念に答えるクロード" }`. The build step can merge these into
`index.json` alongside the English title.

**Language fallback chain:**
1. Requested language (`ja`)
2. Default language (`en`)
3. String ID itself (visible signal that a key is missing)

**Adding a new language:**
1. Add entries to `data/strings.json` for the new language code
2. Add the language option to the switcher UI
3. No build script changes needed — the resolver reads whatever codes exist

---

## Environments

| Environment | Base URL | Detection | Arc nav URLs |
|---|---|---|---|
| GitHub Pages | `https://vgong24.github.io/Vextreme` | `hostname === 'vgong24.github.io'` | `/pages/<slug>.html` |
| Local dev | `http://localhost:8080` | `hostname === 'localhost'` | `/pages/<slug>.html` |
| vextreme24.com | `https://www.vextreme24.com` | fallthrough | `/<slug>` |

The browser library auto-detects environment from `window.location.hostname`.
No configuration required per page.

---

## Registry pattern

All customizable axes in this system follow one rule:
**flat JSON object, keyed by name, looked up at render time, falls back safely.**

| Axis | Location | Lookup |
|---|---|---|
| Arc definitions | `arcs-v2.json` | by arc key |
| Arc display metadata | `index.json` → `arcMeta` | by arc key |
| Node metadata | `index.json` → `slugMap` | by slug |
| UI strings | `strings.json` | by stringId + langCode |
| Render modes | `arcs-v2.json` → `renderMode` | by arc key |

No registration functions. No JS-side tables. If it's a named thing that can
vary, it's a JSON key. Unknown keys fall back with a console warning, not a crash.

---

## Continuity system

Three layers, three time horizons:

| Layer | File | Purpose | Written by |
|---|---|---|---|
| Current snapshot | `docs/continuity/INDEX.md` | Where is the system right now | Claude at session end |
| Session narrative | `docs/continuity/Batch 00N.md` | Mistakes, reasoning, assumptions | Claude on Victor's signal |
| Decision record | PR description (template) | Why the system moved at each PR | Claude when opening PR |

`git log --grep="VXG RealForever"` — full trace of deliberate commits.
Every commit in this repo ends with `[VXG RealForever]`.
Every file created or significantly modified by a Claude instance ends with `// [VXG RealForever]`.

---

## File responsibility map

```
data/
  nodes.json          — content nodes (write side, never auto-generated)
  arcs-v2.json        — arc definitions (write side, never auto-generated)
  strings.json        — i18n string registry (write side, never auto-generated)
  index.json          — pre-built read index (generated, never edit directly)

lib/
  build-index.js      — builds data/index.json
  build-archives.js   — builds pages/archives.html
  build-sitemap.js    — builds sitemap.xml
  build-index-page.js — builds index.html
  vextreme-index-v2.js — browser library (GitHub Pages arc nav)

pages/
  archives.html       — build dashboard (generated)
  <slug>.html         — content pages (hand-authored, flat directory, no subdirs)

docs/
  architecture.md     — this file (design authority)
  Readme.md           — v1 Squarespace system docs (historical, not active)
  continuity/         — session logs and current state
  vextreme-v2-architecture.kt — Kotlin design spec (design reference)

.github/
  workflows/build-index.yml       — CI pipeline
  pull_request_template.md        — PR as decision record

index.html            — root nav page (generated)
sitemap.xml           — crawler index (generated)
CLAUDE.md             — cold-start instructions for Claude instances
```

---

## Key constraints (do not violate)

1. **Slugs are globally unique** — no two `.html` files in `pages/` can share a slug
2. **`pages/` is flat** — no subdirectories; the slug system breaks otherwise
3. **Never edit generated files** — `index.json`, `archives.html`, `sitemap.xml`, `index.html`
4. **Single source of truth** — arc metadata lives in `arcs-v2.json`; UI strings in `strings.json`; no copies in JS
5. **Build step owns computation** — sort order, dateISO, arcMeta are derived at build time, never in the browser
6. **Registry pattern** — new customizable axes are JSON objects, never hardcoded JS tables

---

*Last updated: Session 003 — June 30, 2026*

<!-- [VXG RealForever] -->
