# Data architecture (CQRS pattern)

The system uses a Command Query Responsibility Segregation pattern:

```
WRITE SIDE (source of truth — edit these)        READ SIDE (artifacts — never edit directly)
─────────────────────────────────────────        ─────────────────────────────────────────
data/nodes.json        ──┐                       data/index.json        (slugMap + arcMap + arcMeta)
data/arcs-v2.json      ──┼── build pipeline ──▶  pages/archives.html   (build dashboard)
data/strings/source/** ──┘                       sitemap.xml            (crawler index)
                                                 index.html             (root nav page)
                                                 dist/vextreme-{slug}.js (God Scripts, one per page)
                                                 sw.js                  (Service Worker, pre-caches dist/)

data/status/tech-debt.json         ──┐
data/status/planned-enhancements.json ──┼── lib/build-status.js ──▶  data/status.json
data/status/assumptions.json       ──┘
data/strings/compiled/manifest.json ─┘                              (system health manifest)
```

**Write side files — content pipeline:**

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

**Write side files — system health pipeline:**

`data/status/tech-debt.json` — hand-authored list of structural decisions deferred.
Each item: `{ id, title, priority, description, addedSession }`.

`data/status/planned-enhancements.json` — long-horizon items with no session endpoint.
Each item: `{ id, title, priority, description, addedSession }`.

`data/status/assumptions.json` — claims from PR records not yet confirmed live.
Each item: `{ id, claim, priority, context, addedSession }`.

`data/strings/compiled/manifest.json` — also an input to `build-status.js` for auto-detecting
string keys missing translations. Demo-category scope keys (under `scopes/demo/`) are marked
`intentional: true` and excluded from `totalOpen`.

`lib/build-status.js` — assembles `data/status.json` from the three hand-authored write-side
sources plus the manifest. Run manually: `node lib/build-status.js`. Not yet in CI.
Exports pure functions for testing: `buildTranslationNotices`, `buildStatusRollup`, `countOpen`.

`data/status.json` — generated system health manifest at the same CQRS layer as `index.json`.
Structure: `{ _meta: { totalOpen, commit, generated }, notices: { translation, techDebt, enhancements, assumptions } }`.
First consumer: `pages/ecosystem-hub.html` (developer dashboard, runtime fetch).

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
