# Data architecture (CQRS pattern)

The system uses a Command Query Responsibility Segregation pattern:

```
WRITE SIDE (source of truth — edit these)        READ SIDE (artifacts — never edit directly)
─────────────────────────────────────────        ─────────────────────────────────────────
data/nodes.json        ──┐                       data/index.json        (slugMap + arcMap + arcMeta)
data/arcs-v2.json      ──┼── build pipeline ──▶  pages/archives.html   (build dashboard)
data/strings/source/** ──┘                       sitemap.xml            (crawler index)
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

`data/strings/source/` — scoped UI string source files. Each key is an element
identifier whose value is an extensible object. See 06-i18n for the full pipeline.

**Build pipeline** (runs automatically via GitHub Actions on push to main):
```
lib/strings-compile.js   → data/strings/compiled/strings.{lang}.json
lib/build-index.js       → data/index.json
lib/build-archives.js    → pages/archives.html
lib/build-sitemap.js     → sitemap.xml
lib/build-index-page.js  → index.html
```

Trigger paths: `data/nodes.json`, `data/arcs-v2.json`, `data/strings/**`,
`lib/strings-compile.js`, `lib/build-*.js`, `pages/**`

**Read side files** are committed artifacts — they exist in the repo so GitHub
Pages can serve them without a build step at request time. Never edit them
directly. Change the write-side sources and push; the pipeline rebuilds.

**Section ordering** — arcs have two modes:

*Explicit* — narrative/editorial order. Slugs listed exactly in `arcs-v2.json`.
This encodes authorial intent — the system cannot auto-derive story sequence.

*Chronological* — auto-sorted by `dateISO`. Used by `full_timeline` sections
with `dateRange` boundaries. Adding a new dated node automatically places it
in the correct position on next build.

→ *Connects to 04-build-time: the build pipeline is where write-side data
becomes the read-side structures the browser consumes. Understanding what
gets computed there is what keeps the browser layer clean.*

<!-- [VXG RealForever] -->
