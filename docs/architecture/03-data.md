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

**v1 vs v2 — two arc files that look related but share no runtime path.**
`data/arcs.json` and `data/pages.json` are the v1 system's write-side sources —
read only by `lib/vextreme.js`, `lib/archive-renderer.js`, and `lib/arc-nav.js`,
which serve the live Squarespace site (`vextreme24.com`) directly at runtime via
`fetch()`. They are not inputs to the v2 build pipeline above, and `lib/build-*.js`
never reads either file. `data/arcs.json` uses the same snake_case arc keys as
`data/arcs-v2.json` (not kebab-case — a stale comment in `lib/build-archives.js`
claimed otherwise until Session 022; kebab-case is only the i18n string-key
naming convention `ARC_KEY_MAP` translates into, unrelated to either arcs file),
but a different per-arc schema: `sections[].entries[]` (each `{n, title, slug}`,
carrying its own titles) instead of v2's flat `sections[].slugs[]` (titles come
from `nodes.json` instead). Diffing every arc's slug set between the two files
(Session 022) found zero drift on every explicit-order arc — the two have been
hand-kept in parallel, not by any mechanism. Since v1 is deprecated and receives
no new Squarespace content going forward (confirmed directly, Session 022), this
is not an active risk requiring a parity check — but it means `data/arcs.json`
should be treated as frozen, not as a file that stays in sync with future
`arcs-v2.json` edits. See `config/lessons/v1-arcs-json-is-frozen-not-a-sync-target.json`.

**Content-placement intents.** `config/content-intents.json` extends the
`vex:department`/`vex:workType` meta-tag pattern to arc membership:
`{ id, slug, department?, workType?, arcKey?, status }`. `lib/apply-content-intents.js`
applies each `status:"pending"` entry — upserting the meta tags on the target
page and, if `arcKey` is set, adding the slug to that arc's one auto-managed
section in `arcs-v2.json` (removing it from any other arc's auto section
first, so re-declaring a placement moves it rather than duplicating it) —
then marks it applied. It never writes into a hand-curated section; arc
curation (position within a narrative arc) stays a human act, same as
department/workType's registry-default fallback already works for
undeclared pages. After applying, it re-runs `lib/build-index.js` (the real
duplicate-slug BLOCK gate) and reports `lib/check-key-alignment.js`'s output
as the sanity check — the same verification every other content change here
goes through.

→ *Connects to 04-build-time: the build pipeline is where write-side data
becomes the read-side structures the browser consumes. Understanding what
gets computed there is what keeps the browser layer clean.*

<!-- [VXG RealForever] -->
