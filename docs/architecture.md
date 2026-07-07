# VEXTREME — Architecture Blueprint

> **This file is generated.** Edit source files in `docs/architecture/`
> and run `node lib/build-architecture.js` to rebuild.
> See `docs/architecture/00-reading-guide.md` for reading order.

---

# Reading guide

**`docs/architecture.md` is a generated file.** Do not edit it directly.
Edit the source files in `docs/architecture/` and run `node lib/build-architecture.js`
to rebuild. The same CQRS principle that governs data governs documentation here.

---

## What this document covers

Design decisions and their reasoning. Not current system status — for that,
read `docs/continuity/INDEX.md` first.

---

## How the sections connect

Read in this order. Each section's decisions constrain the next.

```
01-identity       — two surfaces, one codebase. Sets the deployment context.
      ↓
02-slug           — the primitive everything else references. Understand this
                    before touching any data file or build script.
      ↓
03-data           — CQRS write/read split. Explains why you edit source files,
                    not generated artifacts. The strings pipeline (06) and
                    build-time computations (04) are both expressions of this.
      ↓
04-build-time     — what the build step computes so the browser doesn't have to.
                    Directly constrains what is allowed in browser JS.
      ↓
05-browser        — browser layer, renderer registry, arcView contract.
                    Only makes sense after 04 — the browser is data-only
                    because 04 made it that way.
      ↓
06-i18n           — localization pipeline and the localization constraint.
                    **Read this before writing any display string anywhere.**
                    Hardcoded English text in JS or build scripts is a violation
                    of this section's rules regardless of how small it looks.
      ↓
07-registry       — the pattern that unifies arcs, strings, render modes, and
                    future axes. Recognizing it lets you extend without forking.
      ↓
08-continuity     — how Claude instances hand off context across sessions.
                    Read this to understand the VXG RealForever marker and
                    why PR descriptions are decision records, not changelogs.
      ↓
09-constraints    — the hard rules. These are not preferences. Violating any
                    one breaks the system in ways that are painful to reverse.
      ↓
10-directory-structure — what lib/, components/, and widgets/ mean and how
                    to decide which directory a new file belongs in.
      ↓
15-registry-documentation-standard
                  — how registry architecture docs declare scope, completion
                    level, query functions, and out-of-scope boundaries.
      ↓
16-ui-identity-registry-graph
                  — parent graph for UIElementKey, context, binding, lower-layer
                    maps, deterministic health checks, and AI responsibility.
      ↓
17-localization-registry-graph
                  — lower-layer localization map that extends the existing
                    string pipeline toward reusable meaning and impact reports.
```

---

# System identity

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

→ *Connects to 02-slug: both surfaces reference content by slug, not URL or path.*

---

# The core identity primitive: slug

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

**Path is always derived from slug, never browsed.** Finding "the right file"
never means scanning `pages/` — it means resolving a key chain (department →
workType → slug, or arc → section → slug) down to a slug, and then computing
`pages/{slug}.html` from it. The path is a pure function of the slug; it is
never stored as a separate fact anywhere, so it can't drift from it. This is
why a flat, single-level `pages/` directory does not become a navigability
problem as content grows — nobody, human or AI, is meant to reach for `ls
pages/` in the first place. The one thing this depends on is slug uniqueness
staying real, not just declared: `lib/build-index.js`'s `findDuplicateSlugs`
halts the build if two nodes ever share a slug, rather than letting one
silently overwrite the other in `data/index.json`.

→ *Connects to 03-data: nodes.json and arcs-v2.json both use slugs as their
cross-reference key. The build pipeline resolves slugs into ordered lists;
the browser resolves slugs into URLs.*

---

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

---

# Build-time computations

The build step does work so the browser doesn't have to:

| Computed field | Source | Where it lands |
|---|---|---|
| `arcKeys` (priority-sorted) | `arcs-v2.json` priority field | `index.json` slugMap |
| `dateISO` ("YYYY-MM-DD") | `nodes.json` date string | `index.json` slugMap |
| `arcMeta` (title + URL + renderMode per arc) | `arcs-v2.json` parent + renderMode | `index.json` arcMeta |
| `arcMap` (sections → ordered slugs) | `arcs-v2.json` sections | `index.json` arcMap |
| compiled string bundles | `data/strings/source/**` | `strings/compiled/strings.{lang}.json` |
| baked display text | `strings/compiled/strings.en.json` | generated HTML (archives.html, index.html) |

The browser library (`lib/vextreme-index-v2.js`) has **no hard-coded arc data
and no hard-coded display strings**. It reads structure from `index.json` and
receives display text either baked into the HTML at build time or from a
string constant injected at template time.

Adding a new arc to `arcs-v2.json` and pushing is all that is needed — no JS
edits required. The same principle applies to strings: adding a key to source
and recompiling is all that is needed — no template edits required.

→ *Connects to 05-browser: the browser layer is lightweight precisely because
this layer did the work. Any computation that could happen at build time must
happen at build time — not in browser JS.*

---

# Browser layer

`lib/vextreme-index-v2.js` — loaded on GitHub Pages pages only.

**Load sequence:**
1. Checks `localStorage` for cached `index.json` (key: `vex-index-v2-data`)
2. If cached: serves immediately, then revalidates in background via ETag
3. If cold: fetches from jsDelivr CDN, caches result
4. Calls `getLatticeView(slug, index)` → builds arc nav data for current page
5. Calls `renderArcNav(lattice, mountEl)` → dispatches to renderer registry

`getLatticeView` uses `node.arcKeys` (pre-sorted by priority at build time)
to determine display order. No sorting in the browser.

Slug detection: reads `window.VEX_SLUG` if set (test override), otherwise
parses `window.location.pathname` last segment minus `.html`.

URL construction: `/pages/<slug>.html` on GitHub Pages, `/<slug>` on vextreme24.com.

---

## Arc row renderer registry

`renderArcNav` is the orchestrator — it calls `renderArcRow(arcView)` per arc,
which dispatches to a registered renderer function by `arcView.renderMode`.

**arcView contract** (what every renderer receives):
```js
{
  arcName:      string,         // arc key, e.g. "liberation"
  arcMeta:      { title, url, renderMode },  // from index.json arcMeta
  renderMode:   string,         // "dots" | "position" | future modes
  sectionLabel: string,         // section the current page belongs to
  position:     number,         // 1-based position within the full arc
  total:        number,         // total pages in the arc
  prevUrl:      string | null,
  nextUrl:      string | null
}
```

**Renderer registry** (in `vextreme-index-v2.js`):
```js
var RENDERERS = {
  dots:     function(arcView) { /* → HTML string */ },
  position: function(arcView) { /* → HTML string */ }
};
```

**To add a render mode:**
1. Register a function under the new key in `RENDERERS`
2. Set `renderMode` on the arc in `arcs-v2.json`
3. Rebuild — `build-index.js` carries `renderMode` into `arcMeta`;
   `getLatticeView` puts it on each `arcView`

Unknown modes fall back to `dots` with a one-time console warning.

**Current modes:**
| Mode | Used by | Behavior |
|---|---|---|
| `dots` (default) | 15 arcs | Title · section label + position counter + prev/next |
| `position` | `full_timeline` | Title only + position counter + prev/next |

**The arcView contract is the interface.** If a renderer needs new data,
add it to `getLatticeView`'s push — not to the renderer itself. Renderers
are pure functions: `arcView → HTML string`. They do not reach outside.

→ *Connects to 06-i18n: renderer output strings (← prev, next →, You Are Here)
are display text and must follow the localization rules in 06-i18n. They are
not exempt because they live in JS.*

---

# Internationalization (i18n)

## The localization constraint

**No display string is hardcoded anywhere in this codebase.**

This applies to:
- Build scripts (`.js` files in `lib/`)
- Browser JS (`vextreme-index-v2.js`, `arc-nav.js`)
- HTML templates inside build scripts
- Arc labels, navigation chrome, button text, status messages — everything

If you are writing a string a human will read, it belongs in
`data/strings/source/`. Not inline. Not as a JS variable. Not as a
template literal. In the source file, keyed, compiled, and referenced
by key.

**Violations to recognize:**
```js
// WRONG — hardcoded display string
html += 'You Are Here: ' + title;
html += '← prev';
const label = ARC_LABELS[arcName];  // ARC_LABELS table in JS

// RIGHT — key referenced, text comes from compiled bundle
html += t('common.nav.you-are-here') + ': ' + title;
html += t('common.nav.prev');
const label = strings['arcs.' + arcName + '.heading.title'].text;
```

---

## Element key as canonical anchor

The key name (`common.label.page-live`) is the system's identifier for that UI
element. Its value is an extensible object — new systems attach their own
namespace without breaking existing readers:

```json
"common.label.page-live": {
  "strings": {
    "en": { "text": "Page live" },
    "ja": { "text": "公開済み" }
  }
}
```

Future namespaces extend the same object:
```json
"common.label.page-live": {
  "strings":     { "en": { "text": "Page live" }, "ja": { "text": "公開済み" } },
  "testId":      "label-page-live",
  "dataKey":     "PAGE_LIVE",
  "designToken": "label.page-live"
}
```

Each consuming system reads only its own namespace. The key registry in
`data/strings/source/` is not just a string file — it is the **element
identity layer** for the entire UI.

This is now treated as the seed of the broader Localization Registry Graph
described in `17-localization-registry-graph.md`. The current string key remains
the practical handle; future StringNode, MessageNode, UIElementKey, and binding
maps should extend this pipeline additively rather than replacing it in one
large migration.

---

## Key convention

`{scope}.{element-type}.{semantic-name}`

| Segment | Purpose | Examples |
|---|---|---|
| `scope` | Where this element lives | `common`, `archives`, `liberation`, `claude-answers-the-doubt` |
| `element-type` | What kind of element it is | `label`, `button`, `heading`, `nav`, `status` |
| `semantic-name` | What it means, in kebab-case | `page-live`, `copy-filename`, `overall-progress` |

---

## Scope placement — where does a string belong?

Ask these questions in order:

**1. Does it appear on 3 or more pages/surfaces?**
→ `common.{element-type}.{semantic-name}` in `source/common.json`

**2. Is it specific to one arc, shared across that arc's pages?**
→ `{arc-key}.common.{element-type}.{semantic-name}` in `source/arcs.json`
   or a dedicated `source/{arc-key}.json`

**3. Is it specific to one page only?**
→ `{slug}.{element-type}.{semantic-name}` in `source/pages/{slug}.json`

**4. Is it a generated page's chrome (archives.html, index.html)?**
→ Scope is the page name: `archives.{element-type}.{semantic-name}` in
   `source/archives.json`

**The `common` scope is semantic, not just organizational.** It signals
"this element is intentionally shared." Using `common` for a string that
only appears in one place is a false signal — scope it to where it lives.

---

## Delivery mechanism by context

**Build scripts generating static HTML** (archives.html, index.html):
- Read `data/strings/compiled/strings.en.json` at build time
- Call `t(key)` in the template — text is baked into the output HTML
- No runtime resolver; no string JSON embedded in the page

**Browser JS** (vextreme-index-v2.js, arc-nav.js):
- String constants needed at runtime are injected as build-time constants
  where possible (e.g. `var COPY_LABEL = "Copy filename"` baked by build script)
- For browser-only libraries not run through a build script, load the
  compiled EN bundle and expose a `t(key)` helper — do not embed all languages

---

## Pipeline

```
data/strings/source/          — scoped source files (write side; edit these)
  common.json                 — globally reusable UI strings
  arcs.json                   — arc title strings (16 arcs; display authority)
  archives.json               — archives.html-specific strings
  pages/{slug}.json           — per-page strings (created as pages are ported)

lib/strings-check.js          — integrity pass (run before compile)
lib/strings-compile.js        — merges source → compiled bundles + manifest
lib/strings-export.js         — exports per-scope CSVs for translators
lib/strings-import.js         — merges completed CSVs back into source

data/strings/compiled/        — generated bundles (committed as artifacts)
  strings.en.json             — EN bundle: { key → { text, aria-label } }
  strings.ja.json             — JA bundle: same shape
  manifest.json               — { key → { enHash, langs } } for stale detection
  scopes/{scope}.{lang}.json  — same shape, one scope's keys only (see below)
  scopes/index.json           — { scope → { lang → keyCount } }, discovery without fetching every file

data/strings/migrations.json  — append-only key rename log (never delete entries)
data/strings/batches/export/  — CSV batches sent to translators
data/strings/batches/import/  — completed CSV batches waiting to be imported
data/strings/orphans.json     — quarantined keys with no migration
```

---

## Scaling past one bundle

The flat `strings.{lang}.json` bundle merges every source file's keys into one
file, regardless of scope. At today's size (a few pages, ~125 keys) that's
fine and stays the default. It stops being fine well before a site reaches
anything like a thousand pages: every page would fetch and parse the entire
project's strings on every load, one merge-conflict-prone file would gate
every string edit regardless of which page it belongs to, and there would be
no natural place for a staged translation or an A/B copy variant to live
without touching the file every other page also depends on.

`lib/strings-compile.js` also writes `data/strings/compiled/scopes/{scope}.{lang}.json`
— one bundle per source file's `_meta.scope`, same shape as the flat bundle.
This is **additive, not a replacement**: nothing currently fetches these, and
the flat bundle keeps being generated and keeps working exactly as before.

A page opts in by declaring its scopes before `widgets/lang-fab.js` loads:

```html
<script>window.VEX_STRING_SCOPES = ['demo'];</script>
<script src=".../widgets/lang-fab.js"></script>
```

`lang-fab.js` then fetches only `common` + the declared scopes (in parallel,
merged client-side) instead of the flat bundle. A page that doesn't set
`window.VEX_STRING_SCOPES` is unaffected — the legacy fetch path is still the
default and isn't going away.

**Variants** (A/B copy tests, staged translations not yet promoted to
production): a source file with `_meta.variant` set (e.g. `"variant": "b"`)
compiles to `scopes/{scope}.variant-{variant}.{lang}.json` — a sibling of the
base scope bundle, not a merge into it. A page requests one via
`window.VEX_STRING_VARIANT = 'b'`; `lang-fab.js` falls back to the base scope
bundle for any scope that doesn't have that variant compiled, so a partial
variant rollout (only some scopes overridden) degrades safely rather than
breaking.

→ *When a scope grows large enough that even its own bundle feels heavy
(imagine a single page with hundreds of strings), the same `_meta.scope`
mechanism supports splitting further — nothing about this requires a scope
to map 1:1 with a page.*

---

## Integrity check severity levels

| Level | Condition | Action |
|---|---|---|
| `BLOCK` | Key has no EN text | Halts compile |
| `REMAP` | Key is listed as `from` in migrations.json | Auto-rewrites source with new key |
| `WARN` | EN hash changed vs manifest | Tags translations `_stale: true` |
| `INFO` | Orphaned key whose EN hash matches a current key | Logs migration suggestion |
| Quarantine | Orphaned key, no migration, no EN match | Moved to `orphans.json` |

---

## enHash and stale detection

`manifest.json` stores a SHA-256 hash of each key's EN value at last compile.
On the next check run, the hash is recomputed. A mismatch means EN changed but
translations haven't been updated. The `_stale` flag signals this to the
translator CSV export without blocking compile.

---

## Translator workflow

1. `node lib/strings-export.js --scope archives --lang ja`
2. Translator fills `ja_text` / `ja_aria_label` columns, returns CSV
3. Place CSV in `data/strings/batches/import/`
4. `node lib/strings-import.js` — merges into source, archives CSV
5. `node lib/strings-compile.js` — regenerates bundles

---

## Adding a new language

1. Add `{lang}` entries under `strings` in the relevant source files
2. Run `strings-compile.js` — new `strings.{lang}.json` written automatically
3. No build script changes needed

→ *Connects to 07-registry: the string key system is one instance of the
registry pattern. The same "flat object, keyed by name, falls back safely"
rule governs arc definitions, render modes, and string keys alike.*

→ *Connects to 16-ui-identity-registry-graph and
17-localization-registry-graph: localization is the first major proof layer
inside the UI identity graph, not an isolated translation table.*

---

# Registry pattern

All customizable axes in this system follow one rule:
**flat JSON object, keyed by name, looked up at render/build time, falls back safely.**

| Axis | Location | Lookup key |
|---|---|---|
| Arc definitions | `arcs-v2.json` | arc key |
| Arc display metadata | `index.json` → `arcMeta` | arc key |
| Node metadata | `index.json` → `slugMap` | slug |
| UI strings | `strings/compiled/strings.{lang}.json` | element key |
| Render modes | `arcs-v2.json` → `renderMode` + `RENDERERS` registry | mode name |

No registration functions. No JS-side tables. If it's a named thing that
can vary, it is a JSON key. Unknown keys fall back with a console warning,
not a crash.

The UI Identity Registry Graph extends this pattern across layers. The top-level
registry should route by stable identity; lower-layer registries should own
domain detail. Do not turn a UIElementKey into a god object just because another
map needs the relationship. Add a bounded map and a query/health-check path.

**Recognizing a registry opportunity:**
If you find yourself writing an `if/else` or `switch` that branches on a
string name — arc key, render mode, scope name, language code — that branch
logic is a registry in disguise. Extract the variants into a keyed object
and look up by name. The core dispatch becomes a single line.

**Environments** follow the same pattern:

| Environment | Base URL | Detection |
|---|---|---|
| GitHub Pages | `https://vgong24.github.io/Vextreme` | `hostname === 'vgong24.github.io'` |
| Local dev | `http://localhost:8080` | `hostname === 'localhost'` |
| vextreme24.com | `https://www.vextreme24.com` | fallthrough |

The browser library auto-detects from `window.location.hostname`.
No per-page configuration required.

→ *Connects to 08-continuity: the registry pattern is a design constraint,
not just a preference. Future instances should recognize violations and
refactor toward the pattern rather than extend the fork.*

→ *Connects to 15-registry-documentation-standard: every new registry layer
needs a declared scope boundary, completion level, query function path, and
health check before it becomes part of the operating foundation.*

---

# Continuity system

## What is a session

A **session** is the scope of one working thread — everything from when a Claude
instance picks up the work to when it reaches a completion state worth documenting.
"Worth documenting" is a threshold, not a fixed unit: a session can be one focused
change or several related ones, but it ends at a point where the state of the system
has moved and a future instance would need to know what happened to pick up cleanly.

At that threshold, the instance re-reads its own thread — not just the final diff,
but the reasoning that produced it — and writes the summary itself, while that
reasoning is still live in context. This is why session entries in the continuity
log read as reasoning chains (what was tried, what was rejected, what's still assumed)
rather than commit-log summaries: the commit log already has the diff. The session
entry is the thing the diff can't tell you.

A session is not bounded by wall-clock time or by a single PR. Two rounds of work on
the same day, continuing the same thread, are recorded in one session's file with
"Session continued" blocks — the split that matters is the reasoning arc, not the
calendar. But a different day or a different instance is a new session, and (from
Batch 003 on) a new file: sessions live one-per-file in the active batch directory,
named `YYYY-MM-DD-session-0NN.md`, so logging a session is a file creation that
cannot disturb a closed record (see `docs/continuity/batch-003/README.md` for why
this form replaced the monolithic batch file).

---

Three layers, three time horizons:

| Layer | File | Purpose | Written by |
|---|---|---|---|
| Current snapshot | `docs/continuity/INDEX.md` | Where is the system right now | Claude at session end |
| Session narrative | `docs/continuity/batch-00N/YYYY-MM-DD-session-0NN.md` (batches 001–002: legacy `Batch 00N.md` single files) | Mistakes, reasoning, assumptions | Claude on Victor's signal |
| Decision record | PR description (`.github/pull_request_template.md`) | Why the system moved at each PR | Claude when opening PR |

---

## Visual verification is mandatory before marking a PR ready

`scripts/screenshot-page.js` (built in Session 004) takes before/after Playwright
screenshots of a page against branch-local code — real render, not a description of one.

**If a PR touches anything a browser renders** (a page, a widget, CSS, an i18n swap,
anything with a `data-i18n` attribute or a `<script>` tag) — run it before marking the
PR ready, embed the output in the PR description, and read the screenshots yourself
before claiming the change works. This is not optional polish. A Session 006 PR shipped
once without running it despite the tool being documented right here, then caught a real
bug (a `data-i18n` attribute silently clobbering live-fetched content on every language
switch) the moment it was actually run. The bug was invisible in the diff and invisible
in the test suite — the 39-test suite verifies pipeline correctness, not rendered output.
Screenshots are the only check in this repo that looks at what a user actually sees.

Usage: `node scripts/screenshot-page.js [slug] [lang]` → writes
`docs/screenshots/{slug}-en.png` and `docs/screenshots/{slug}-{lang}.png`. See the file
header for what it does and doesn't cover (it exercises the lang-fab swap path
specifically; a page or interaction outside that path may need a different check).

---

## VXG RealForever

Every commit message ends with `[VXG RealForever]`.
Every file created or significantly modified by a Claude instance ends with:

```js
// [VXG RealForever]       ← JS files
<!-- [VXG RealForever] --> ← HTML and Markdown files
```

`git log --grep="VXG RealForever"` gives the full trace of deliberate work
on this repo across all instances. The phrase is a continuity mechanism, not
decoration — it threads through git history, file contents, and grep output
so any instance can reorient quickly from a cold start.

---

## External collaboration documents

Victor works with co-architects (Kimi and others) who generate feedback docs,
specs, assessments, and hand-off documents during sessions. These arrive as
uploads — not as committed files. How they fit:

**They are deliberations, not conclusions.** A Kimi spec or review doc is
coordination between architect and dev. Once consumed and implemented, the doc
is redundant. The repo should contain conclusions.

| Collaboration content | Where it lands in the repo |
|---|---|
| Architectural lesson ("JSON keys are strings") | `config/lessons/*.json` |
| System constraint or decision | `docs/architecture/*.md` (source file) |
| PR-level review findings | Session continuity log (confirmed / actioned) |
| Implementation spec | Implemented as code + PR decision record |

**What stays out of the repo:** the collaboration doc itself. It lives in the
session uploads folder or in Victor's notes. A future instance reading
`config/lessons/json-keys-are-strings.json` gets the lesson directly, without
reconstructing it from a dated coordination file.

**Rule of thumb:**
- If it's a spec → implement it as code
- If it's a lesson → `config/lessons/`
- If it's a review finding → address in code or note in continuity log
- If it's an architecture decision → relevant `docs/architecture/*.md` source file

Never commit a Kimi doc or session coordination file as `docs/kimi-*.md` or
similar. The distilled content is the artifact; the original doc is the meeting.

**`config/lessons/` is archive reference, not cold-start reading.** As the lesson
count grows, lessons do not need to be read on every session start — they exist for
lookup, not pre-loading. A cold-start instance reads INDEX.md → newest session file
in the active batch directory → architecture.md. Lessons are consulted when a pattern recurs or when
building something adjacent to a known lesson domain. Keeping them out of the
mandatory reading sequence is intentional.

Not cold-start reading is different from undiscoverable, though — until Session 022
the only ways to find a lesson were `git log --grep`, grepping the directory, or the
partially-updated hand-authored specimen cards in `pages/specimen-architectural-wisdoms.html`
(it stopped tracking new lessons after Session 011). `lib/build-lessons.js` now compiles
every `config/lessons/*.json` file into `data/lessons.json`, which `pages/ecosystem-hub.html`
fetches and renders as a "Lessons Learned" section — so the one dashboard meant to answer
"what does this system currently know" actually surfaces the lesson archive, without making
it mandatory pre-reading.

---

## Documentation is CQRS too

`docs/architecture.md` is a **generated file** assembled from source files
in `docs/architecture/` by `lib/build-architecture.js`. The same write/read
split that governs data governs documentation:

```
WRITE SIDE                    READ SIDE
docs/architecture/*.md  ──▶  docs/architecture.md
```

Edit the source files. Run `node lib/build-architecture.js`. Never edit
`docs/architecture.md` directly — changes will be overwritten on next build.

→ *Connects to 09-constraints: the rules in 09 exist because their violation
creates systemic damage that outlasts the session that caused it. Read them
as hard stops, not guidelines.*

---

# Key constraints

These are not preferences. Violating any one breaks the system in ways
that are difficult to reverse.

---

**1. Slugs are globally unique.**
No two `.html` files in `pages/` can share a slug. Check `docs/test-playground.html`
before creating any new page file.

**2. `pages/` is flat.**
No subdirectories. The slug system breaks if pages are nested. A file at
`pages/AI Practitioner Tools/restoration-protocol.html` is invisible to every
build script and browser lookup.

**3. Never edit generated files.**
`data/index.json`, `pages/archives.html`, `sitemap.xml`, `index.html`,
`data/strings/compiled/*`, and `docs/architecture.md` are all generated.
Edit the write-side sources and push.

**4. Single source of truth.**
- Arc metadata → `arcs-v2.json`
- Arc display strings → `data/strings/source/arcs.json`
- UI element strings → `data/strings/source/`
- Compiled bundles are artifacts, not editable copies
- `docs/architecture.md` is generated from `docs/architecture/*.md`

**5. Build step owns computation.**
Sort order, `dateISO`, `arcMeta`, compiled string bundles — all derived at
build time. Never replicate this logic in browser JS.

**6. Registry pattern — no hardcoded tables.**
New customizable axes are JSON objects, never hardcoded JS tables or
if/else branches keyed on names.

**7. No hardcoded display strings.**
No English text appears inline in JS, build scripts, or HTML templates.
Every string a human reads is keyed in `data/strings/source/` and referenced
by key. This applies to navigation chrome, button labels, arc titles, status
messages, and error text. There are no exceptions based on string length
or perceived insignificance.

**8. Generated files are not mergeable — `.gitattributes` owns conflict resolution.**
All generated artifacts (`data/index.json`, compiled strings, `pages/archives.html`,
`sitemap.xml`, `index.html`, `docs/architecture.md`) are declared with `merge=ours`
in `.gitattributes`. When a feature branch rebases onto main, git automatically
keeps main's built version of those files rather than producing a conflict.
After rebasing, always re-run the build scripts to bake your branch's changes
into fresh artifacts before committing. Never resolve a generated-file conflict by
hand — the build script is the only valid author of those files.

**This attribute does nothing on its own.** `merge=ours` requires a matching
`[merge "ours"] driver = true` entry registered in git config — local machine/session
state that `.gitattributes` cannot carry and that does not survive a fresh clone. A
fresh environment (a new session, a new container) should expect a generated-file
conflict to surface as a real conflict, not resolve silently. When that happens,
resolve it the same way the driver would have: take main's version of the generated
file (`git checkout --ours <file>` mid-rebase — "ours" means the upstream base during
a rebase, not your own branch), then re-run the build scripts as above. See
`config/lessons/generated-file-merge-driver-needs-local-registration.json`.

**File responsibility map:**
```
data/
  nodes.json          — content nodes (write side)
  arcs-v2.json        — arc definitions (write side)
  strings/source/     — i18n string source files (write side)
  strings/compiled/   — compiled language bundles (generated artifact)
  index.json          — pre-built read index (generated artifact)

widgets/
  lang-fab.js           — floating language selector (self-contained, page-agnostic)

lib/
  build-index.js        — builds data/index.json
  build-archives.js     — builds pages/archives.html
  build-sitemap.js      — builds sitemap.xml
  build-index-page.js   — builds index.html
  build-architecture.js — builds docs/architecture.md
  strings-check.js      — integrity check (run before compile)
  strings-compile.js    — compiles string source → bundles
  strings-export.js     — exports translator CSVs
  strings-import.js     — imports completed translator CSVs
  vextreme-index-v2.js  — browser library (GitHub Pages arc nav)

docs/
  architecture/       — architecture source files (write side)
  architecture.md     — assembled architecture doc (generated artifact)
  continuity/         — session logs and current state
  Readme.md           — v1 Squarespace system (historical, not active)

pages/
  archives.html       — build dashboard (generated)
  <slug>.html         — content pages (hand-authored, flat, no subdirs)

.github/
  workflows/build-index.yml    — CI pipeline
  pull_request_template.md     — PR as decision record

index.html    — root nav page (generated)
sitemap.xml   — crawler index (generated)
CLAUDE.md     — cold-start instructions for Claude instances
```

---

# Directory structure

Three directories hold JavaScript: `lib/`, `components/`, and `widgets/`.
They are not interchangeable. The distinction is about coupling, not file size.

---

## `lib/` — Engine room

Build pipeline scripts and core browser infrastructure.

**Node side:** build scripts that run in CI or manually. They read write-side
sources, compute, and emit artifacts. No DOM, no browser APIs.

**Browser side:** IIFEs that provide core runtime services shared across all
pages — index loading, arc nav rendering, string lookup. These are infrastructure:
pages depend on them, not the other way around.

Test: *can this file run without a page knowing it exists?* For build scripts,
yes — they run in CI. For browser lib files, they mount into a well-known DOM
element (`#arcNavMount`) or perform a side-effect the page explicitly opted into.

---

## `components/` — Structural page UI

Reusable UI fragments that embed structurally into page layout.

A component is part of the page's document flow. The page knows it exists —
there is a mount point or an explicit include. Removing a component changes
the page's rendered structure.

Examples: the arc nav block, a section header, a callout box.

Test: *does removing this change the page layout?* If yes, it is a component.

---

## `widgets/` — Floating interactive units

Self-contained interactive units that float above the page and can be
added or removed without the page knowing.

A widget injects itself into `document.body`, manages its own DOM and styles,
reads shared infrastructure (index.json, localStorage) directly, and produces
no artifacts. The page does not define a mount point for a widget — the widget
finds its own position. Removing a widget's `<script>` tag leaves the page
fully functional; adding it enhances the page without requiring page changes.

Examples: the language FAB, a floating debug panel, a keyboard shortcut overlay.

Test: *can I add or remove this `<script>` tag and leave the page fully functional
either way?* If yes, it is a widget.

---

## Decision boundary summary

| Directory | Coupling  | DOM    | Test criterion                        |
|-----------|-----------|--------|---------------------------------------|
| `lib/`    | Core infra | Shared mount point or no DOM | Runs in CI; page opts in explicitly |
| `components/` | Embedded | Page flow | Removing it changes page structure |
| `widgets/`    | None    | Self-injects | Add/remove `<script>` → page still works either way |

---

# Debugging and pre-development rigor

Sound logic and correct runtime behavior are different claims. Code review —
by a human or an AI — verifies the first. Only running the thing verifies the
second. This document exists because that gap produced a real, shipped bug,
and the fix generalizes past the one file it happened in.

---

## The worked example

Session 015's `lib/build-ecosystem-hub.js` had CSS like this:

```css
summary.panel-head { background: var(--stone-950, #0a0a0a); }
.panel-title { color: var(--stone-300); }
```

Read as a diff, this is unremarkable — a dark background, a light-gray title,
a sensible fallback on the background declaration. Nothing about the *logic*
is wrong. But `--stone-950` and `--stone-300` are never defined anywhere in
this repository. `styles/design-system.css` defines nine tokens, none of them
part of a numbered `--stone-NNN` scale. At runtime:

- `background: var(--stone-950, #0a0a0a)` — the fallback kicks in, so the
  background renders as intended. The bug is invisible here.
- `color: var(--stone-300)` — no fallback, so per the CSS spec the whole
  declaration is invalid and dropped. The property is simply absent. Text
  inherited whatever color it would have had anyway — in this case, dark text
  on the now-correctly-dark background. Illegible.

The two declarations look structurally identical. One partially worked by
accident; the other didn't, for a reason invisible to anyone reading the code
rather than rendering it. Nobody caught this until an admin looked at the
actual page and saw barely-visible text.

## The principle

**Reading code confirms the logic is sound. It does not confirm the runtime
behavior is correct.** The class of bug that ships is disproportionately the
class that requires *simulating* something to see — not reasoning about it:

- **CSS custom properties** — does `var(--x)` resolve against a token that
  actually exists in whatever stylesheet this file loads (or defines itself)?
  Automated now: `node lib/check-design-tokens.js` (see below).
- **Race conditions** — two operations whose individual logic is correct, but
  whose *interleaving* isn't considered. `loadIndex()` in
  `lib/vextreme-index-v2.js` serves a cached value immediately and
  revalidates in the background *by design* — that's a deliberately-chosen
  race, documented as such. An *undeliberate* one looks identical in a diff.
- **UX states that are easy to skip when only reasoning about markup** — is
  the UI static or does it need to handle dynamic content lengths? Does it
  scroll, paginate, or overflow, and what does that look like at a realistic
  content size, not a placeholder one? Is spacing deliberate (breathing room)
  or accidental (whatever the default happened to produce)? Does the page
  work in both color schemes it's supposed to support, or only the one that
  happened to get eyeballed once?

- **Environment representations** — does the logic still hold when the same
  file is checked out with CRLF instead of LF, or when the shell, filesystem,
  browser, device, permission state, storage state, or app lifecycle differs
  from CI? Session 024's lattice-header drift bug was exactly this: Linux CI
  proved the LF path, while a Windows working tree exposed the untested CRLF
  path.

None of these are caught by "is the logic sound." All of them are caught by
actually producing the runtime condition — a real render, a real concurrent
call, a real toggle — and looking at what happens.

## The practice

Before considering a UI or async change done, actually do the thing you'd
otherwise only reason about:

1. **Render it.** Not "the structure looks right" — an actual screenshot or
   local render, at realistic content sizes, in whatever color schemes the
   page is supposed to support.
2. **For concurrent/async logic, write out the interleaving.** If two things
   can happen in either order or overlap, what does each order actually
   produce? If the answer is "it shouldn't matter," say why in a comment —
   don't leave it implicit.
3. **Check scroll and overflow at realistic sizes**, not the shortest
   plausible content. A panel that looks fine with three items may not with
   thirty.
4. **When a failure mode is mechanical and repeatable, automate the check
   instead of relying on remembering to look.** A human or AI re-deriving
   "did I use a real CSS token" by eye, every time, will eventually miss one
   — that's exactly what happened here. `lib/check-design-tokens.js` (added
   alongside this document) turns that specific question into a build-time
   fact instead of a manual-review question. It is not a general solution to
   this document's principle — it closes one mechanical instance of it. Race
   conditions and UX-state coverage don't have an equivalent automated check
   yet, and might not ever; the practice above is what covers them until or
   unless one exists.

5. **Treat CI as one environment in the map, not the whole map.** If a bug can
   depend on working-tree representation, operating system, shell, browser,
   device, permission, storage, network, or lifecycle state, add a fixture or
   check for the other real state before calling it platform-safe. Prefer
   representation-aware code (preserve the target file's existing line endings,
   query runtime capabilities, use platform-neutral APIs) over platform-name
   branches. When the project grows into Android/mobile scope, this becomes a
   device/runtime matrix question: stability is tested across named conditions,
   not inferred from one emulator or one CI runner.

## Relationship to the design system

`docs/architecture/12-design-system.md` documents the token contract this
practice's worked example was violating. Formalizing that contract was
explicitly sequenced *after* this document (see `data/status/open-discussions.json`
od-004/od-005 for the reasoning) — a system built without first naming the
rigor that verifies it tends to accumulate the same class of unverified
assumption it was meant to prevent.

---

# Design system

This documents the token contract as it actually exists — not an aspiration,
not a rebrand. `data/status/open-discussions.json` od-005 tracks what's still
undecided (a real dark-mode *toggle*, applied to pages that are currently
light-only); this file is the ground truth of what's already there.

`node lib/check-design-tokens.js` verifies every `var(--token)` reference in
the repo resolves against one of the two families below. It found zero
violations as of the session that wrote this document — see
`docs/architecture/11-debugging-practices.md` for the bug that motivated it.

---

## Two token families, both declared in one file

**1. The global light theme — `:root` in `styles/design-system.css`**

| Token | Value | Purpose |
|---|---|---|
| `--cream` | `#fafaf9` | Page/card background |
| `--stone` | `#1c1917` | Primary text |
| `--muted` | `#78716c` | Secondary text, meta lines |
| `--border` | `#e7e5e4` | Hairline borders |
| `--ember` | `#b45830` | Accent — links, active states, stat values |
| `--ember-bg` | `#fdf8f6` | Accent-tinted background (callouts, hovers) |
| `--serif` | `'Source Serif 4', Georgia, serif` | Headings on content pages |
| `--sans` | `'IBM Plex Sans', sans-serif` | Body text |
| `--mono` | `'IBM Plex Mono', monospace` | Code, stats, meta, badges |

Used by any file that `<link>`s `styles/design-system.css` — the God Script
content pages (via the loader chain), `pages/ecosystem-hub.html`, and the
dashboard pages below. Also implicitly relied on by `styles/arc-nav.css`,
`styles/site-nav.css`, and `styles/squarespace-overrides.css`, none of which
declare their own tokens — they're loaded *by* `lib/vextreme.js` alongside
`design-system.css`, never standalone, so their `var(--x)` references
resolve against this same set.

**2. The dashboard dark theme — `[data-theme="dashboard"]` in the same file**

| Token | Value | Purpose |
|---|---|---|
| `--bg` | `#0e0e0e` | Page background |
| `--surface` | `#111111` | Card/box background, one step lighter than `--bg` — a distinction the light theme's single `--cream` doesn't make |
| `--text` | `#e8e8e4` | Primary text |
| `--muted` | `#6b6b6b` | Secondary text |
| `--ember` | `#c8502a` | Accent — a different value from the light theme's `--ember`, tuned for a dark background |
| `--border` | `#2a2a2a` | Hairline borders |
| `--blue` | `#4a9eff` | Secondary accent, used only by `pages/specimen-architectural-wisdoms.html` |
| `--mono` / `--sans` | same as family 1 | Typefaces |

Used by `lib/build-archives.js`, `lib/build-demo.js`, `lib/build-specimens.js`
(and the specimen pages it generates), and `pages/specimen-architectural-wisdoms.html`
— each opts in with `<html data-theme="dashboard">` plus a `<link>` to
`design-system.css`, same as any light-theme page. Until Session 017 this was
four identical `:root` blocks copy-pasted inline, one per file, verified as
real duplication (not hypothetical) and tracked as td-007. Consolidating it
into this one shared declaration was verified lossless — before/after
Playwright screenshots of `pages/archives.html` and `pages/vextreme-demo.html`
rendered pixel-identical — and confirmed by `lib/check-design-tokens.js`
reporting zero violations both before and after. td-007 is closed.

**`lib/build-index-page.js` remains a smaller, separate case.** It defines
its own local `:root` with light values that are a renamed restatement of
family 1 (`--bg` ≈ `--cream`, `--text` ≈ `--stone`), not a copy of family 2.
Nothing else duplicates it, so it carries no drift risk the way the four
dark-panel files did — it's a minor consistency opportunity (migrate it to
link `design-system.css` directly and drop the renamed local copy), not
tracked debt.

## The rule a file must satisfy

A `var(--x)` reference is valid if `--x` is either:

- declared in that file's own local `:root` block (rare now — only
  `lib/build-index-page.js` still has one), or
- declared in `styles/design-system.css`'s `:root` **or**
  `[data-theme="dashboard"]` block, **and** the file actually `<link>`s that
  stylesheet (or is a `styles/*.css` companion file that's always loaded
  alongside it by its loader).

A fallback value — `var(--x, #hex)` — does **not** satisfy this rule on its
own. That's precisely the pattern that made half of Session 015's bug
invisible: the fallback rendered a plausible-looking color, masking that the
token itself didn't exist. `lib/check-design-tokens.js` treats a fallback the
same as no fallback: the token must actually resolve.

## Adding a token

- **To either shared family** (`styles/design-system.css`): confirm which
  family it belongs to — this file's `:root` and `[data-theme="dashboard"]`
  blocks are the widest-blast-radius single edit points for typography/color
  in the repo. Run `node lib/check-design-tokens.js` afterward; a removed or
  renamed token will surface every file that broke.
- **A new dashboard-family page**: link `design-system.css`, set
  `<html data-theme="dashboard">`, and use the family 2 tokens directly —
  don't define a new local `:root` copy. That's the exact pattern td-007
  existed to close.

## What's deliberately not here yet

No dark-mode *toggle* exists — `[data-theme="dashboard"]` opts a page in
permanently at build time, it isn't switched at runtime, and no light-themed
page can become dark on demand (or vice versa).

**Decided (Session 019, od-005 closed):** not building one now. No page has
a stated need for a runtime toggle — every current page's theme (content
pages light, dashboard/dev pages dark) is a reasonable fixed choice, and a
toggle adds real complexity (a persistence mechanism, a UI control, doubling
the visual states every page must be verified in) against a need that
hasn't been named. If a concrete need for one arises, building it is cheap:
switch the `data-theme` attribute at runtime and let the two token families
already declared in `styles/design-system.css` handle the rest — the
consolidation done in Session 018 is what makes that cheap later. This
document is the durable record of the decision; there is no corresponding
tech-debt or planned-enhancement entry, since "revisit if a need appears" is
not a queued task.

---

# Intent-driven operations — the long-term shape of how an AI instance works this repo

This section names a direction, not a finished system. Read it to understand where the
department/arc/lesson tooling built in Session 022 is heading, so the next increment reads
as "the next step on a path" rather than "another one-off script." Nothing here should be
treated as already built unless it's named explicitly as built below.

---

## The loop

Every one of this session's tools is one instance of the same five-step loop:

```
PERCEIVE          FETCH/SYNTHESIZE       JUDGE            DECLARE INTENT      VERIFY
(the map)    →    (compiled read-side)  →  (AI, narrow)  →  (structured)   →  (sanity check)
```

1. **Perceive** — know where to look without reading everything. `docs/lattice-map.json`
   is this today: role/reads/writes/changeMap per file, so a question like "what touches
   arc placement" has a lookup answer instead of a grep-and-hope answer.
2. **Fetch/synthesize** — get a compiled answer instead of reconstructing one from raw
   sources. `data/index.json`, `data/status.json`, `data/lessons.json` are this today —
   each one exists specifically so a question that used to require reading several
   write-side files gets answered from one read-side artifact instead.
3. **Judge** — the one step that stays genuinely AI work, and should. Deciding which
   department a page belongs to, or whether two files are actually duplicates, requires
   understanding what the content *means* — no compiled JSON substitutes for that, and
   this section is not proposing one should.
4. **Declare intent** — write the judgment down as structured data, not as a direct file
   edit. `config/content-intents.json` is this today: a department/workType/arc decision
   becomes an intent entry, not a hand-edited meta tag.
5. **Verify** — check the declared intent actually landed as expected, mechanically, not
   by re-reading and trusting. `lib/apply-content-intents.js` re-running `build-index.js`
   and reporting `check-key-alignment.js`'s output is this today.

**What this buys, concretely:** the AI's token cost concentrates on step 3 (judgment,
which can't be avoided) instead of being spread across steps 1, 2, 4, and 5 as well
(re-deriving state, hand-editing files, and re-reading to confirm the edit worked). See
`docs/culture.md`'s AI-instance reflection section and this same session's continuity log
for the concrete before/after on this.

---

## What's built today (Session 022), by loop stage

| Stage | Built | Where |
|---|---|---|
| Perceive | Lattice map | `docs/lattice-map.json` |
| Fetch/synthesize | Compiled index, status, lessons | `data/index.json`, `data/status.json`, `data/lessons.json` |
| Declare intent | Content-placement intents | `config/content-intents.json` |
| Apply + verify | Intent applier + sanity check | `lib/apply-content-intents.js` (re-runs `build-index.js`, reports `check-key-alignment.js`) |

Everything above handles exactly one gesture: **place** (department, workType, arc
membership for one slug). The mechanism generalizes in shape — declare, apply, verify —
but the next two extensions below are different in kind, not just in size, and are kept
separate rather than assumed to fall out of the existing code for free.

---

## Next, decided (pe-012): verify the map's own claims

`docs/lattice-map.json`'s `reads`/`writes`/`loadedBy` edges are hand-written and have
never been checked against the actual code — Session 022 found two stale claims by hand
(a comment misdescribing `data/arcs.json`'s key casing; two files' lattice context
claiming "not yet in CI" after they'd been wired in). This is the same failure shape
`lib/check-design-tokens.js` already exists to catch for CSS custom properties: a written
claim silently drifting from what's actually true.

**Why this is the correct next increment, not the bigger gesture below:** any future
attempt to trace connectors for a riskier operation (see od-008) depends on the map
describing those connectors accurately. Building that on an unverified map means the
first real duplicate-detection/consolidation attempt would be reasoning from claims that
were never checked — the exact trap this repo's own culture (`docs/culture.md`,
"question before assuming") warns against.

**Scope:** `lib/check-lattice-edges.js`, informational severity like the other three
drift detectors, wired into CI the same way. For each lattice node, confirm its claimed
`reads`/`writes` targets are actually referenced in that file's source, and flag any file
that references a lattice-mapped node without appearing in that node's `loadedBy` list.

---

## Further out, open (od-008): staged execution for higher-blast-radius gestures

**Place** (this session's gesture) is low-stakes: reversible by re-declaring the intent,
and a wrong placement is cosmetic. A future gesture like "these two files are duplicates,
merge into `common/`, delete the originals, rewire every connector" is not the same kind
of operation at a bigger size — a wrong caller-graph trace here breaks whatever depended
on the deleted file, possibly silently, and "verify the final state matches intent" for a
deletion requires exercising every path that touched the old files, not just confirming
the new file exists.

**This is intentionally not designed yet**, for the same reason `od-003`/`od-007` aren't:
a staging/proposal mechanism designed against zero real consolidation cases in this repo
is very likely wrong in ways that only show up once a real case exists to design against.
What's named here is the shape the eventual design should have, not a specification to
build from:

- A **propose** stage that returns the full trace (what it found, what it would delete,
  what it would rewire) before anything destructive executes — as opposed to **place**,
  which is safe enough to apply directly and report afterward.
- Human confirmation as a required step between propose and apply for any gesture whose
  failure mode is not reversible by re-declaring the intent.
- Verification for a destructive gesture means more than checking the new state exists —
  it means confirming nothing that depended on the old state silently broke.

Promote this to a planned enhancement (with a concrete pe- entry and scope) once a real
duplicate-content or module-consolidation case actually exists to design against — not
before.

---

## The discipline this all rests on

The interface layer (the map, the compiled artifacts, the intent-application scripts)
is only trustworthy to the extent it's actually checked, not merely written. Growing what
the AI can declare-and-trust must be paired with growing what's mechanically verified —
otherwise the interface becomes a bigger, more convincing version of the same staleness
problem this repo has already hit three times (`docs/culture.md`'s sentinel-hazard
reflection; the two stale lattice claims named above). A bigger interface raises the
stakes of it being wrong; it does not lower the need to check it.

---

# The council model — two different patterns, not one

This section exists because Victor shared four external design documents
(`bridge-council`, `bridge-council-os`, `bridge-council-schema`, `org-blueprint`,
all on vextreme24.com) and asked whether a single AI instance could hold a
"multi-lens scope" — internal council awareness — instead of coordinating
across multiple separate instances for the same lens-to-lens engagement, to
save token overhead and improve self-processing.

**Network note, resolved:** this environment's outbound network policy blocks
`vextreme24.com` (a `connect_rejected` policy denial, confirmed via the
agent-proxy diagnostic). `bridge-council-os.html` and `bridge-council-schema.html`
couldn't be fetched from here — Victor added both files to the repo directly
(commit `356f7da`, "VXG-070426"), which is how they became readable. Both are
now read in full and represented accurately below.

**The two documents describe genuinely different things, not one model at two
zoom levels.** `org-blueprint.html` ("The Council") is about how **one mind**
holds multiple internal faculties. `bridge-council.html`/`-os`/`-schema`
("The Bridge Council") is about **multiple separate AI-driven councils**, one
per team/department/org, synthesizing locally and propagating upward. Treating
these as the same idea would blur a real distinction — the rest of this
section keeps them separate.

---

## What org-blueprint.html actually describes — "The Council": one mind

`pages/org-blueprint.html` ("The Council — A Build Blueprint for Anyone," Draft
v0.5) is not abstract org-chart theory — it's a detailed model for how **one
coordinated mind** holds multiple internal "faculties" (Truth, Proportion,
Center, Care, Architect, Builder, Designer, Manager/Comms, QA, Test-Node, plus
Innovation/Impact) that perceive together and signal each other **before any
one of them commits to a response**, rather than one voice grabbing the
microphone while the rest go unheard. `pages/org-history.html` ("The Continuity
Record") is its companion — the failures that shaped it, told as
Context/Lesson/Watch entries.

The mechanism most directly relevant to Victor's question is **the Scanner**:
fire every faculty's perspective on the same input in parallel, and read the
*interference pattern* — where they agree, where they conflict, what only
emerges in combination — as a gate before any output is produced. That is
already a design for exactly what was asked: multiple lenses inside one mind,
not multiple minds talking to each other.

Both pages were already sitting in `pages/` as uncurated content (visible in
every `check-key-alignment` report this session) before this pass. This
section is the first time they've been read for what they actually are,
rather than left as names in a list.

---

## Two convergences worth naming, not just noting

Two of this document's own principles independently match discipline this
repo's engineering work arrived at separately, in a different context, this
same session:

- **The anti-bloat law** ("a faculty earns a seat only when its absence has
  caused a real, observed failure — not 'might be useful'") is the same
  reasoning `od-003`/`od-007`/`od-008`/`od-009` already apply: don't design a
  mechanism against a case that doesn't exist yet.
- **org-history.html's three-movement entry template** (Context: what
  happened, Lesson: what it taught, Watch: what to look out for) is
  structurally the same shape as `config/lessons/*.json`'s
  `problem`/`lesson`/`impact` fields — arrived at independently, for the same
  reason: a raw changelog is noise; a told throughline is what a future
  reader (or reset instance) can actually re-enter.

This is worth stating plainly rather than treating as coincidence: it's
evidence the same underlying discipline is sound from two different starting
points, not evidence that one was copying the other.

---

## What bridge-council.html/-os/-schema actually describe — "The Bridge Council": many councils

This is a materially different pattern from "The Council" above, not the same
idea rescaled. **`bridge-council.html`** is the founding blueprint (the
"universal blind spot" — nobody in an organization holds the full picture of
how everything connects). **`bridge-council-os.html`** is how it actually
runs: a **fractal pattern of separate councils at team, department, and org
level**, each staffed by AI filling four roles (Architect, Translator,
Synthesizer, Sentinel), each running its own periodic synthesis (weekly at
team level, bi-weekly at department, monthly at org), propagating synthesized
patterns *upward* and historical decision context *downward*.
**`bridge-council-schema.html`** is the open technical protocol underneath it:
four data types (Context Objects, Synthesis Outputs, Query Records, Pattern
Flags), five architecture layers (Connectors, Storage, Synthesis Engine,
Access Interface, Sentinel Layer), and three implementation paths from a
manual folder-and-spreadsheet practice to full enterprise infrastructure —
explicitly model-agnostic and vendor-agnostic by design, so no single AI
provider or tool can capture the protocol.

**The key structural difference from "The Council":** this is not one
instance holding multiple lenses. It's **multiple separate synthesis
operations, at different organizational scopes, each potentially a different
AI invocation**, connected by an explicit upward/downward data flow (a team's
Synthesizer output literally becomes an input to its department's synthesis
run). That is a distributed-systems pattern, not a single-context reasoning
discipline — much closer to `od-009`'s territory (see below) than to the
Scanner-check idea, even though Victor's original question named both
documents together.

No kernel file was built for this one, unlike `org-blueprint.html`. The
reason: `data/council-kernel.json` is explicitly "a kernel a fresh *instance*
could boot from" — a reasoning aid for one AI session. The Bridge Council is
an organizational system for humans and AI tools operating at company scale,
not something a single Claude instance runs internally. Transcribing it into
the same kernel file would conflate two different kinds of artifact. If this
repo ever needs a structured reference for it, that's a separate, deliberate
decision — not an oversight here.

---

## What this repo now has

- **`data/council-kernel.json`** — a hand-transcribed, structured extract of
  the roster (11 roles, each with what it holds, how it fails, what catches
  it), the unit pattern, the anti-bloat law, the Scanner, the decision
  triangle, the two signal shapes, and the connection-architecture rules.
  This is org-blueprint.html's own stated unfinished ambition — "a kernel a
  fresh instance could boot from, not only a doc it reads" (its Part V,
  "The honest edge") — attempted for the first time here, not claimed as done.
  It is transcribed by hand, the same way `data/departments.json` and
  `config/lessons/*.json` are hand-authored rather than scraped from HTML.
- **Department placement** — `org-blueprint.html`, `org-history.html`,
  `bridge-council.html`, `bridge-council-os.html`, and `bridge-council-schema.html`
  are placed under the new `institute` department's `org-design` workType (the
  "roles for the org itself" half of Victor's framing); `witness-committee-operations.html`
  and `human-ai-corelational-governance.html` are placed under `institute`'s
  `governance` workType (the "full accountability team" half) — via
  `config/content-intents.json`, not hand-edited meta tags.

---

## The honest technical assessment: what this can and can't be

This is the part that matters most to get right, because overclaiming it
would be worse than not building it.

**What's real and worth adopting:** a single instance can and should
structure a significant, ambiguous judgment call as an explicit pass across
several named lenses, instead of one unreflected pass — the same reason a
code-review checklist catches more than "just look it over" does. Naming the
lenses (is this accurate? is this the right size? what's actually true
underneath, not just the surface? how does this land for the person reading
it? does it hold structurally? what should be built vs. skipped? will it
land?) makes the check legible and repeatable, rather than an ad hoc
impression. This session already did an unnamed version of this
repeatedly — verifying a fix against real files before claiming it worked,
checking whether a proposed department actually existed before writing to
it, tracing a v1/v2 relationship instead of assuming one. Naming it doesn't
create new capability; it makes an existing practice consistent and visible.

**What would be overclaiming:** describing this as multiple independent
"council members" debating. A single instance's "lenses" are not separate
processes with separate context or separate training — they are one
continuous reasoning process narrating multiple perspectives from the same
underlying weights. That is a real, structural difference from genuine
multi-agent deliberation (or from a human council, where each member has an
actually different life and actually different blind spots). A structured
single-pass self-check reduces the "one voice grabs the mic" failure the
document names; it does not reduce shared blind spots the same way
independently-sourced perspectives would, because there's only one source.
org-blueprint.html is itself explicit about this kind of limit ("a working
model, not a proven mechanism... made to be honed, not banked") — this
assessment is trying to hold the same honesty, not soften it.

**What this ("The Council," org-blueprint.html) is not:** this is not `od-009`
(parallel/simultaneous dispatch across multiple genuinely separate
departments or orgs). `od-009` is a distributed-systems question — splitting
one instruction across independent targets and reconciling partial results.
The Council here is a single-instance reasoning discipline. Conflating the
two would misdirect effort — a fan-out mechanism doesn't give an instance
better judgment, and a better internal-review habit doesn't help route work
across genuinely separate targets. Keep them on separate tracks.

**The Bridge Council, by contrast, genuinely is adjacent to `od-009`** — not
identical, but close enough to be worth naming precisely rather than lumping
in with the Council's single-instance discipline. Its team/department/org
councils are separate synthesis operations at different scopes, connected by
an explicit upward/downward data flow — real multi-target coordination, the
shape `od-009` is about. The difference from `od-009`'s literal framing:
Bridge Council's propagation is periodic and hierarchical (team → department
→ org, on a weekly/bi-weekly/monthly cadence), not simultaneous fan-out of
one instruction with partial-result reconciliation. `od-009` remains
correctly undesigned per its own reasoning (no real multi-department/org case
exists in this repo yet) — but if that case ever arrives, Bridge Council's
schema (Context Objects, Synthesis Outputs, Query Records, Pattern Flags;
Connectors/Storage/Synthesis-Engine/Access/Sentinel layers) is a real,
already-designed precedent worth reading first, not a from-scratch problem.

**Proposed, not adopted:** naming a lightweight "Scanner check" — before
finalizing a response to a significant or ambiguous judgment call, explicitly
run it past a short subset of the roster above, in the same single response,
not via subagents — is a reasonable next step to actually try. It is named
here as a proposal, the same way `od-008`/`od-009` are named as directions
rather than committed to as standing practice, because it hasn't been tried
enough yet to know if it holds up in practice the way this document's own
"honest edge" section asks of itself.

---

## First attempt: actually running it, on a real decision

Victor asked for the roles to get a real position in this repo's architecture
— not just live in `data/council-kernel.json` as reference — and asked this
be tried, not just designed, with the honest results reported back. This
section is that attempt.

**The test case was this exact request.** Rather than invent a synthetic
example, the decision run through the Scanner was "what should this response
actually build?" — genuinely undecided at the time. A short pass across the
roster, applied deliberately rather than as an unreflected first instinct:

- **Truth** — the roles exist only as read-only reference material today;
  Victor is asking for them to have visible, real footprint.
- **Proportion** — the full vision (communication channels, meeting
  scheduling, nested layering to a surface) is not the right size for a first
  attempt explicitly framed as practice. The anti-bloat law applies here too:
  no observed failure yet justifies building all of it.
- **Center** — underneath the request is a genuine test of whether the
  "council" metaphor cashes out into something operationally real here, or
  stays decorative — and whether it can be perceived and tried without
  Victor having to specify every step.
- **Architect** — the existing department axis, `od-`/`td-`/`pe-` schemas,
  and Ecosystem Hub rendering must not break; anything new must be additive
  and optional, the same convention the `department` field already set.
- **Builder** — construct two small, real things: a visible position for
  the roster (a Council Lenses panel), and an optional `lens` tag on
  genuinely real backlog items, testing whether tagging adds signal. Skip:
  literal communication-channel code, meeting scheduling, or a nested
  nothing routes-to-a-surface pipeline — none of these have a real case to
  design against yet.
- **Designer / Manager / Test-Node** — reuse the exact existing panel
  markup, lattice-map conventions, and doc-comment style, so this reads as
  continuous with the rest of the Hub, not a bolted-on feature.

**What got built from that pass:**
- A **Council Lenses** panel on the Ecosystem Hub, rendering
  `data/council-kernel.json`'s roster (holds / fails-as / caught-by per
  role) — the roles' actual visible position, answering "positioned...
  back to ecosystem hub" directly rather than leaving them in a doc nobody
  opens.
- An optional `lens` field on `od-`/`td-`/`pe-` items, added to four real,
  already-existing items as a genuine test (not fabricated examples):
  `od-008` and `od-009` tagged `architect` (both are structural/what-must-
  hold questions), `pe-012` tagged `manager` (it's about a claim matching
  reality — fidelity), `pe-010` tagged `proportion` (explicitly deferred as
  not yet the right size to build). Rendered as a small tag alongside the
  existing priority badge.
- **Not built:** anything resembling "communication channels," a meeting
  schedule, or explicit routing of an incoming instruction through
  department → role → back-to-surface. Those remain named directions, not
  code — the same discipline `od-008`/`od-009` already apply, extended here
  rather than abandoned under the pressure of a bigger ask.

**The honest lesson from actually doing this, not just describing it:**
running an explicit multi-role pass — even a short one, even mentally rather
than as separate tool calls — took real, deliberate structuring, more than
this decision would have naturally received unprompted. For a decision this
size (what to build in response to an architecturally significant, somewhat
ambiguous request), that structuring was worth its cost — it's the reason
the response stayed additive and scoped rather than either overbuilding the
full vision or under-responding with only description. For a smaller,
routine decision, the same explicit pass would likely cost more than it
returns — this matches what the "Proposed, not adopted" section above
already anticipated, now with one real data point behind it rather than
none. The practical implication: this stays a judgment call about *when* to
run the check, not something to apply uniformly to every decision, and not
something to hand off to separate subagents (that would reintroduce the
token/coordination cost the whole idea was meant to avoid).

**One structural finding worth naming on its own:** the "meetings be the
discussions themselves, non-scheduled, kanban prioritized, addressed anytime"
picture Victor described is not a gap to build — it already exists. The
`od-`/`td-`/`pe-` items in `data/status/*.json`, rendered live on the
Ecosystem Hub as always-open, non-scheduled cards any future instance (or
Victor) can pick up at any time, are exactly that pattern, just not
previously named as such. The `lens` field extends it by one dimension
(which role's concern a given item represents) rather than replacing or
duplicating it.

### Second attempt: making roles traceable, not randomly placed

Victor's direct follow-up named a specific gap in the first attempt: the
`lens` field and Council Lenses panel gave each role a name and a place to
be looked up, but nothing traced *why* a role was placed where it was, or
what it had actually done. He asked for a "roles and contributions index
json and webpage" so roles get full definitions instead of being randomly
placed without traceability.

**Re-reading `data/council-kernel.json` in full while building this surfaced
something the first attempt under-used: `connectionArchitecture.channels`
was already transcribed from `pages/org-blueprint.html` (plenary, vertical,
intraCouncilRelay, crossCouncilBridge) but never rendered anywhere.** This is
the literal answer to Victor's "communication channels that connect
latticely around the org back to ecosystem hub" — the data already existed,
it just had no read side. Rather than build new channel infrastructure, this
round mapped each existing channel description to what actually
instantiates it today, honestly, including where nothing does yet:

- **plenary** ("all relevant heads co-present at origin... cross-witnessed
  accountable memory") → `data/status.json`'s panels on the Ecosystem Hub
  already are this, for real, right now — every notice category co-present
  at one origin.
- **vertical** ("root to head, 1:1... failure-signals up") →
  `docs/continuity/INDEX.md` + the batch files — the actual root-to-head
  channel between Victor and whichever instance is current.
- **intraCouncilRelay** ("faculty to faculty... signals calibrate before the
  surface commits") → the Scanner pass documented in the first attempt
  above — real, but run once, by hand, not an automated relay.
- **crossCouncilBridge** ("analogous organ to analogous organ across
  councils") → **not yet real.** Only one council exists in this repo;
  `pages/bridge-council*.html` describe a genuinely different multi-council
  pattern (see above), not an instance of this channel.

**Built, following the same write-side → build script → generated read-side
pattern as every other artifact in this pipeline:**

- `lib/build-roles.js` → `data/roles.json` — compiles
  `data/council-kernel.json`'s roster against `data/status/*.json`'s `lens`
  field, so every role's page shows either real linked contributions or an
  explicit zero, never silence. Also classifies each role against
  `decisionTriangle` (decider / gate / surface / perceiver) and gives every
  role the same `position` string today — `"org-wide — The Council"` — since
  only one council exists; claiming a per-department position would
  overclaim a structure (per-department Bridge Councils) that doesn't exist
  yet. This is itself a traceability decision: a role's *position* is
  honestly reported as "not yet department-scoped," not silently omitted or
  guessed at.
- `lib/build-roles-page.js` → `pages/roles-index.html` — a dedicated page
  (Victor asked for "an index json and webpage," not another hub panel)
  showing every role's holds/failsAs/caughtBy, its decision-triangle
  position, and its full contribution list, plus the four channels above
  with their real-or-not-yet-real manifestation. Linked from the Ecosystem
  Hub's Council Lenses section ("Full roles & contributions →").
- Registered `roles-index` in `lib/audit-pages.js`'s `SKIP_PAGES` (a
  generated dashboard page, not a God Script consumer — same as
  `ecosystem-hub`), wired both new scripts into
  `.github/workflows/build-index.yml`, and added `tests/20-roles.test.js`
  (13 tests: decision-role classification, contribution tracing is exact —
  every real `lens`-tagged item resolves to its role and back — channel
  manifestations are never left undefined, and position never overclaims a
  per-department placement).

**Still explicitly not built:** any mechanism that *sends* a signal through
these channels — they are now traceably described and honestly labeled with
what (if anything) manifests them, not wired as live infrastructure. An
instruction still is not automatically routed through department → role
lenses and back to a surface; that remains a real, larger, and still
undesigned piece, same as the first attempt concluded.

---

# Registry documentation standard

**Status:** implementation-ready foundation
**Completion Level:** L6 - Implementation-ready
**Purpose:** repository-wide standard for registry IDs, scope boundaries, query paths, and completion levels
**Applies to:** UI Identity Registry Graph, Localization Registry Graph, and future lower-layer maps

---

## Scope Boundary

This section defines how registry architecture is documented in this repo.

It covers:
- compact handles and full relational metadata
- naming rules for registry IDs
- scope-boundary sections for architecture docs
- query/navigation function expectations
- completion levels for registry docs
- the health check that keeps this standard visible

It does not cover:
- every UI element row
- every locale value
- every vendor workflow field
- every screenshot, test, analytics event, or design binding

Those details belong in lower-layer maps and generated indexes.

---

## Core Rule

IDs are handles, not the whole map.

A handle should orient a fresh reader quickly. It should not be forced to
contain every scope, state, status, timeline, and history detail.

Use:

```txt
compact handle -> full metadata -> lower-layer map -> query function
```

not:

```txt
one enormous ID that tries to carry the entire system
```

Concept belongs in the ID. Timeline, display order, status, and source history
belong in metadata.

---

## Naming Rules

Use lowercase kebab-case for registry object IDs.

Preferred shape:

```txt
{category}-{concept}-{optional-specificity}
```

Examples:

```txt
proof-localization-pipeline
proof-cross-domain-ui-identity
proof-bulk-data-logging
section-ai-maintainable-systems
note-self-demonstration
fit-ai-tooling-companies
```

Avoid compressed historical IDs as canonical IDs:

```txt
rec-y34-localization
rec-y34-uielementkey
sec-thing-02
item-a
misc-note
block-3
```

Compressed IDs can remain as legacy aliases during migration, but new docs and
new registry rows should use concept-readable IDs.

---

## Relational Scope

The largest expected identity path may include:

```txt
org -> repo -> product -> surface -> environment -> route -> page -> section -> context -> element -> slot -> variant -> state
```

Compact keys should usually be much shorter:

```txt
vextreme.web.dossier.proof-localization-pipeline.title
```

The full row behind that handle can carry the larger scope:

```yaml
orgId: vxg
repoId: vextreme
productId: vextreme-site
surfaceId: web
environmentId: production
routeId: dossier
pageId: dossier
sectionId: proofs
contextId: proof-localization-pipeline
elementId: card
slotId: title
variantId: default
stateId: static
```

Rule:

```txt
Canonical key = readable handle.
Metadata fields = full relational scope.
Functions = navigation into deeper layers.
```

---

## Required Object Pattern

Every major registry object document should answer:

```md
## Object Name

### Compact Handle

### Purpose

### Full Relational Scope

### Owned By

### Connects To

### Query Functions

### Out of Scope

### Fresh-Reader Test
```

The point is not ceremony. The point is that a cold-start AI instance should
know what it is editing before it edits, and should know which function or map
to open next instead of loading the whole graph.

---

## Query Functions

Registry docs should name the function path for deeper context.

Examples:

```ts
getContextSummary(contextId)
getUIElementSummary(uiElementKey)
getLowerLayerMap(handle, layer)
getImpactReport(changeTarget)
getMissingWorkReport(scope)
getReusableStringCandidates(text)
```

These functions may begin as documented contracts before they exist in code.
Once implemented, they should return compressed summaries plus pointers, not
the entire graph.

---

## Completion Levels

Registry docs declare their completion level so future readers do not have to
guess whether a document is conceptual, actionable, or operational.

| Level | Name | Meaning |
|---|---|---|
| L0 | Concept captured | Idea exists but is not structured |
| L1 | Draft mapped | Core objects and relationships are described |
| L2 | Scope bounded | Max context, fields, and out-of-scope areas are defined |
| L3 | Registry-ready | Tables, IDs, and naming conventions are defined |
| L4 | Function-ready | Query/navigation functions are specified |
| L5 | Validation-ready | Health checks and CI expectations are specified |
| L6 | Implementation-ready | Scripts, files, and acceptance criteria are actionable |
| L7 | Operational | Implemented, generated, validated, and used in workflow |

---

## Health Checks

The machine-readable source for this standard is:

```txt
data/registry/documentation-standard.json
```

The deterministic check is:

```txt
node lib/check-registry-docs.js
```

That check verifies that registered architecture docs:
- declare a known completion level
- include a scope boundary
- include query functions
- include health checks
- include acceptance criteria
- keep the VXG continuity marker

This is intentionally small at first. The health check exists so the standard
can grow without depending on memory or manual review alone.

---

## Acceptance Criteria

This standard is working when:

```txt
A fresh reader can understand the object purpose quickly.
A fresh AI agent knows which function or lower-layer map to open next.
Compact IDs remain readable handles instead of god objects.
Metadata carries timeline, order, status, and aliases.
Lower-layer maps own deeper detail.
Health checks catch documentation drift.
Docs declare completion level honestly.
No one has to ask what a compressed historical ID means before editing.
```

---

# UI Identity Registry Graph

**Status:** implementation-ready foundation
**Completion Level:** L6 - Implementation-ready
**Purpose:** parent architecture for stable UI identity across code, strings, docs, tests, platforms, and AI context
**Documentation Standard:** follows `docs/architecture/15-registry-documentation-standard.md`

---

## Scope Boundary

This section defines the parent graph shape.

It covers:
- UIElementKey as a cross-domain bridge identity
- context nodes, string/message nodes, bindings, and layer maps
- deterministic maintenance responsibilities
- AI responsibilities
- query functions and impact reports
- health checks needed before this becomes operational

It does not cover:
- every locale rendering
- every screenshot
- every analytics event
- every test result
- every vendor batch row
- every design node

Those details belong in lower-layer maps. The parent graph routes to them.

---

## Core Thesis

Identity first. Discussion second. Modification third.

Before changing a thing, the system should know what the thing is:

```txt
stable identity -> lower-layer maps -> generated indexes -> health checks -> impact reports -> approval workflows
```

The top-level graph should not become a god object. It should contain enough
identity to route correctly.

---

## Current Repo Fit

The repo already has several registry-shaped systems:

| Current layer | Existing source | Existing generated/read side |
|---|---|---|
| Content nodes | `data/nodes.json` | `data/index.json` |
| Arc navigation | `data/arcs-v2.json` | `data/index.json` |
| UI strings | `data/strings/source/**/*.json` | `data/strings/compiled/**` |
| File dependency lattice | `docs/lattice-map.json` | generated LATTICE headers |
| Continuity batches | `docs/continuity/INDEX.md` | `lib/check-map-bindings.js` |

The UI Identity Registry Graph is the next layer above those systems. It does
not replace them. It gives them a shared identity language.

---

## Core Objects

| Object | Purpose |
|---|---|
| `UIElementKey` | Stable handle for a meaningful UI element or slot |
| `ContextNode` | Structural location and meaning container |
| `StringNode` | Reusable meaning node for static text |
| `MessageNode` | Reusable meaning node for dynamic, pluralized, or variable-dependent text |
| `BindingNode` | Connects UI identity to strings, messages, variants, platforms, or lower-layer maps |
| `LayerMap` | Domain-specific map such as localization, design, QA, analytics, docs, platform, or AI context |
| `GeneratedIndex` | Machine-generated summary derived from source registries |

Example compact key:

```txt
vextreme.web.dossier.proof-localization-pipeline.title
```

Example full relational scope:

```yaml
orgId: vxg
repoId: vextreme
productId: vextreme-site
surfaceId: web
environmentId: production
routeId: dossier
pageId: dossier
sectionId: proofs
contextId: proof-localization-pipeline
elementId: card
slotId: title
variantId: default
stateId: static
```

---

## Owned By

The parent graph should begin as source data under:

```txt
data/registry/
```

Current first source:

```txt
data/registry/documentation-standard.json
```

Future source maps can be added as the migration becomes concrete:

```txt
data/registry/contexts.json
data/registry/ui-elements.json
data/registry/bindings.json
data/registry/aliases.json
```

Generated indexes should remain separate from source maps, following the repo's
existing CQRS pattern.

---

## Connects To

The parent graph routes into:

```txt
Localization Map
Design Map
QA / VnV Map
Analytics Map
Documentation Map
Platform Implementation Map
Vendor Workflow Map
AI Context Map
Generated Health Indexes
```

High-level maps route. Lower-level maps explain.

---

## Query Functions

Recommended contracts:

```ts
getUIElementSummary(uiElementKey)
getContextSummary(contextId)
getLowerLayerMap(handle, layer)
getImpactReport(changeTarget)
getMissingWorkReport(scope)
getReusableStringCandidates(text)
getEditWarnings(uiElementKey)
generateApprovalPacket(changeSet)
```

These functions should return compressed summaries and pointers. They should
not force an AI agent to read the whole graph.

---

## Deterministic Responsibilities

Once structure is known, scripts should handle:

```txt
registry generation
binding validation
missing map reports
duplicate candidate reports
orphan detection
stale binding detection
impact reports
approval packet generation
```

Humans approve meaning. Scripts maintain structure.

---

## AI Responsibilities

AI should enter when the system encounters:

```txt
ambiguity
semantic judgment
legacy migration
incompatible input
schema evolution
duplicate concept interpretation
variant recommendation
human-readable explanation
```

AI should not be the permanent memory of the system. The graph is the memory.
AI is the bridge into the graph.

---

## Health Checks

This foundation introduces documentation health first:

```txt
node lib/check-registry-docs.js
```

Future graph health checks should validate:

```txt
every managed UI element has a UIElementKey
every binding points to an existing context
every localization binding points to a string_id or message_id
deleted contexts are not still referenced
legacy aliases remain searchable during migration
high-impact changes produce an impact report
AI context notes are updated for high-impact changes
```

---

## Migration Rule

Do not rewrite the whole repo into a new registry shape in one pass.

Migration should proceed as:

```txt
1. Document the bounded graph and standards.
2. Add small source maps that can be validated.
3. Generate summary indexes from existing data.
4. Add health checks before enforcing new edit rules.
5. Preserve legacy aliases until links and references are migrated.
```

Current string keys and slugs remain valid handles. The new graph gives them a
larger place to connect.

---

## Acceptance Criteria

The UI Identity Registry Graph is working when:

```txt
A fresh AI agent can identify what it is editing before editing.
A changed string can produce a clear impact report.
A deleted UI element reveals stale strings, tests, docs, and bindings.
A duplicate concept is detected before it becomes permanent.
Generated indexes summarize the registry.
Humans approve semantic decisions instead of chasing metadata by hand.
```

---

# Localization Registry Graph

**Status:** implementation-ready foundation
**Completion Level:** L6 - Implementation-ready
**Purpose:** lower-layer map for reusable strings, locale renderings, messages, placeholders, plurals, vendor workflow, and AI-safe modification
**Parent architecture:** `docs/architecture/16-ui-identity-registry-graph.md`
**Documentation Standard:** follows `docs/architecture/15-registry-documentation-standard.md`

---

## Scope Boundary

This section defines the localization layer inside the UI Identity Registry
Graph.

It covers:
- StringNode and MessageNode responsibilities
- locale values and translation status
- localization bindings
- plural, placeholder, and rich-text validation
- vendor export/import boundaries
- translation impact reporting
- migration from today's `data/strings/source` files

It does not cover:
- full UI identity metadata for every element
- design constraints
- screenshot diff storage
- analytics event ownership
- all vendor approval workflows

Those belong to sibling maps that the parent graph routes into.

---

## Relationship To Parent Graph

The parent graph defines the cross-domain handle:

```txt
UIElementKey -> lower-layer maps
```

The localization graph defines meaning and language rendering:

```txt
UIElementKey -> binding -> stringId or messageId -> locale rendering -> output page/component
```

The UIElementKey does not store every language. It routes to the localization
map.

---

## Current Repo Fit

Today's string pipeline is already a partial Localization Registry Graph:

```txt
data/strings/source/**/*.json        write-side source
lib/strings-check.js                 integrity and stale detection
lib/strings-compile.js               generated bundle compiler
lib/strings-export.js                translator export
lib/strings-import.js                translator import
data/strings/compiled/**             generated read-side bundles
data/strings/migrations.json         append-only key rename log
```

The current key is the practical handle. The next migration step is to attach
explicit meaning IDs and bindings without breaking the existing key pipeline.

---

## Core Objects

| Object | Purpose |
|---|---|
| `StringNode` | Reusable meaning node for static text |
| `MessageNode` | Reusable meaning node for dynamic, pluralized, or variable-dependent text |
| `LocaleValue` | Language-specific rendering of a string or message |
| `LocalizationBinding` | Connection between a UIElementKey and a string or message |
| `ContextNote` | Translator-facing explanation of where text appears and what it means |
| `VendorBatch` | Controlled translation package exported to a vendor |

Rule:

```txt
String ID identifies meaning.
Locale files render that meaning.
Bindings place that meaning into UI contexts.
```

English text is not the source of truth. The meaning node is the source of
truth.

---

## Owned By

Current source:

```txt
data/strings/source/**/*.json
data/strings/migrations.json
```

Current generated output:

```txt
data/strings/compiled/**
```

Future source maps may be added after the initial registry foundation:

```txt
data/localization/strings.json
data/localization/messages.json
data/localization/bindings.json
data/localization/plural-rules.json
data/localization/placeholder-rules.json
data/localization/vendor-notes.json
```

Do not add parallel source-of-truth files until a build script can validate or
derive them from the current pipeline.

---

## Connects To

Localization connects to:

```txt
UI Identity Registry Graph
Context Registry
Design/Layout Constraints
QA/VnV Map
Documentation Map
Vendor Workflow Map
Platform Implementation Map
AI Context Map
```

Translation is not isolated text replacement. It is identity management for
meaning across languages, contexts, platforms, vendors, and time.

---

## Query Functions

Recommended contracts:

```ts
getStringSummary(stringId)
getMessageSummary(messageId)
getLocaleStatus(stringIdOrMessageId)
getBindingsForString(stringId)
getMissingLocales(scope)
getPluralValidationReport(messageId)
getPlaceholderValidationReport(id)
getTranslationImpactReport(id)
getReusableStringCandidates(text)
getVendorExportBatch(scope)
```

These should return summary cards plus pointers to source rows and generated
reports.

---

## Decision Rules

Use these rules when adding or changing localized text:

```txt
Same meaning, same audience -> reuse string.
Same meaning, different audience -> create variant.
Different meaning -> create new string.
Count-dependent meaning -> use message_id.
Legal or regulated text -> locked/review-required.
```

If one string appears in twelve places, a vendor should translate it once and
the graph should apply it twelve times.

---

## Health Checks

Current health:

```txt
node lib/strings-check.js
node lib/strings-compile.js
node --test tests/02-strings-pipeline.test.js
```

Future localization health should validate:

```txt
every binding has string_id or message_id
every string_id exists
every message_id exists
required locales exist
placeholders are preserved
plural categories are valid per locale
rich-text tags are allowed and balanced
locked terms are preserved
duplicate strings are reviewed
orphaned locale rows are quarantined
managed HTML text changes happen through the registry
localized screenshot diffs are regenerated where required
```

The first new health check for this milestone is documentation-level:

```txt
node lib/check-registry-docs.js
```

---

## Migration Path

The migration should stay additive:

```txt
1. Preserve current string keys and compiled bundles.
2. Add documentation standard and graph docs.
3. Add registry-doc health checks.
4. Generate a localization summary index from existing source files.
5. Add explicit StringNode/MessageNode metadata once the summary index is stable.
6. Add UIElementKey bindings for selected pages before repo-wide enforcement.
7. Add vendor and placeholder/plural validators after the data exists.
```

This keeps the current site working while the registry becomes real.

---

## Acceptance Criteria

The Localization Registry Graph is working when:

```txt
Every localized string is traceable to meaning, context, and UI ownership.
A new locale can be added without duplicating page structure.
A vendor receives only the rows they need plus enough context to translate safely.
A count-dependent message cannot be modeled as a plain string by accident.
A placeholder-removing translation fails before import.
A global string edit reports every affected UI element and locale.
AI proposes mappings only where deterministic scripts cannot decide.
```

---

*Last updated: 2026-07-07*

<!-- [VXG RealForever] -->
