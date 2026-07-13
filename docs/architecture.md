# VEXTREME — Architecture Blueprint

> **This file is generated.** Edit source files in `docs/architecture/`
> and run `node lib/build-architecture.js` to rebuild.
> See `docs/architecture/00-reading-guide.md` for question routing and reading order.

---

# Reading guide

**`docs/architecture.md` is a generated projection.** Do not edit it directly.
Edit the numbered sources in `docs/architecture/`, run
`node lib/build-architecture.js`, and verify with
`node lib/check-architecture-integrity.js`.

Architecture records design decisions and their reasoning. For current work,
accepted state, and the active continuity batch, start with
`docs/continuity/INDEX.md` instead.

---

## Route by question

Read the smallest source that answers the question. The trigger column names
the moment when that source becomes required context. Every numbered source,
including this guide, must appear exactly once in this table; CI checks that
coverage and also checks the generated projection byte-for-byte.

| Source | Question answered | Read when / trigger |
|---|---|---|
| `docs/architecture/00-reading-guide.md` | Which architecture source should I read first? | Before opening multiple chapters or changing the corpus structure. |
| `docs/architecture/01-identity.md` | Which public surfaces share this codebase and deployment context? | Before changing domains, deployment, canonical URLs, or surface identity. |
| `docs/architecture/02-slug.md` | What is the canonical identity primitive? | Before adding or renaming content, routes, node IDs, or data references. |
| `docs/architecture/03-data.md` | Which files are sources and which are generated read models? | Before editing data, generated artifacts, compilers, or projections. |
| `docs/architecture/04-build-time.md` | What must be computed before browser execution? | Before moving logic between build scripts, JSON outputs, and browser code. |
| `docs/architecture/05-browser.md` | What may the browser layer render or compute? | Before changing renderers, `arcView`, page bootstraps, or browser data flow. |
| `docs/architecture/06-i18n.md` | How do display strings and language bundles remain valid? | Before writing any user-visible string or changing string compilation. |
| `docs/architecture/07-registry.md` | When should a new behavior extend a registry instead of fork logic? | Before adding an arc, renderer, language, mode, or other extensible axis. |
| `docs/architecture/08-continuity.md` | How is reasoning handed off and what counts as completion evidence? | Before session handoff, PR closeout, visual verification, or continuity edits. |
| `docs/architecture/09-constraints.md` | Which system rules are non-negotiable? | Before any architectural change or exception proposal. |
| `docs/architecture/10-directory-structure.md` | Where should a new engine, component, or widget file live? | Before creating or moving implementation files. |
| `docs/architecture/11-debugging-practices.md` | How should a failure be reproduced and traced before editing? | Before diagnosing a bug or proposing a speculative fix. |
| `docs/architecture/12-design-system.md` | Which tokens and style boundaries govern visual work? | Before adding colors, spacing, typography, or reusable UI styling. |
| `docs/architecture/13-intent-driven-operations.md` | How should intent map to deterministic operations and proof? | Before designing agent-facing commands, automation, or operational workflows. |
| `docs/architecture/14-council-model.md` | Which council pattern exists and which similarly named pattern is different? | Before changing roles, departments, council pages, or cross-council language. |
| `docs/architecture/15-analysis-mode.md` | How does Analysis Mode discover, bundle, and expose content? | Before changing analysis search, indexing, feature flags, or the analysis UI. |
| `docs/architecture/16-nav-coverage.md` | How is navigation coverage kept complete across public pages? | Before adding a page, changing shared nav, or diagnosing a missing nav surface. |
| `docs/architecture/17-fab-autoload.md` | How are FAB widgets discovered and loaded through the shared shell? | Before adding a FAB, changing autoload rules, or editing shell bootstrap behavior. |

---

## Dependency reading order

For a broad architectural change, read in numeric order. Each decision narrows
the choices available to the chapters that follow.

```text
01 identity -> 02 slug -> 03 data -> 04 build-time -> 05 browser
            -> 06 i18n -> 07 registry -> 08 continuity -> 09 constraints
            -> 10 directories -> 11 debugging -> 12 design system
            -> 13 operations -> 14 council -> 15 analysis
            -> 16 navigation -> 17 FAB autoload
```

Question routing is preferred for bounded work; the full sequence is for work
whose effects cross several of those boundaries.

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

`data/terrain-map.json` — same CQRS split again, one layer up: `lib/build-terrain-map.js`
computes every mapped lattice node's real status/debts/reads/writes plus a deterministic
lifecycle-stage layout (`stageOf`: source → generate → utilities → check → output → runtime,
replacing an earlier folder-based grid) and two role-lens tags per node (`engineerFocus`,
`auditorFocus` — naming-pattern heuristics over real fields, explicitly not a designed
taxonomy). `pages/terrain-map.html` is hand-authored once and live-fetches this JSON, same as
`ecosystem-hub.html` fetches `status.json`. Its read side is a fractal zoom-level ladder
(system → stage → node, each level snapping the camera to its own full framing on entry,
exiting always stepping back exactly one level rather than to the top) reached after a round
of Artifact POCs tested the interaction model live before anything landed in the repo — see
`docs/culture.md`. Off-lens nodes recede rather than disappear (`reveal state, never skip nor
hide`, the same principle the Archives-visibility regression established). This pair is a
candidate reference pattern for any future "role-scoped navigable map over the lattice" —
the lens/stage split is generic, not terrain-map-specific.

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

## Arc-chunked bundling pilot (Session 025, resolving od-001/td-006)

Session 013 flagged a real question before the site ever added a third
language: the per-scope-combo model above issues one parallel fetch per
scope on every language switch. At 2 languages and a few dozen nodes that's
fine. td-006 named the ceiling explicitly and set a hard gate: **decision
must be made before adding a third language; do not design the third
language's pipeline on the current per-scope-combo model.**

Session 025 needed a real third language (`zh`, for a bilingual engineering
dossier) and resolved the question with a **scoped pilot**, not a full
migration:

- `data/arcs-v2.json` supports an opt-in `"bundlingStrategy": "arc-chunked"`
  field per arc. Arcs that don't set it are completely unaffected — the
  per-scope-combo path above keeps being the default for the other 16 arcs.
- `lib/build-arc-bundles.js` (new) writes one
  `data/strings/compiled/arcs/{arcId}.{lang}.json` per language, for every
  opted-in arc — the union of every member slug's scope bundles, merged once
  at build time instead of an N-way runtime fetch.
- `lib/build-vextreme.js` emits `window.VEX_STRING_ARC_BUNDLE = "{arcId}"`
  for a slug whose arc opted in. `widgets/fab-lang.js` checks this global
  *before* the scope-fan-out path — one fetch, not N, when it's set.
- `lib/build-sw.js` precaches the opted-in arcs' bundle URLs, bounded to
  (opted-in arcs × their languages) — not proportional to site size.

Today's only opted-in arc is `victor_dossier`. This proves the alternative
td-006 named actually works end to end (build script → runtime fetch →
SW precache), without forcing every other page's assembly through an
unproven, whole-site migration for a change one new page motivated. Migrating
a second arc means adding one field to its `data/arcs-v2.json` entry — the
mechanism already generalizes; only the *scope* of adoption is one arc.

**Known limitation, recorded honestly, not hidden:** `supportedLangs` in
`data/index.json` is site-wide, computed from the flat `strings.{lang}.json`
bundle (any lang with at least one key, anywhere). Adding `zh` content to one
page makes 🇨🇳 selectable on *every* page site-wide, including ones with zero
zh translations. This degrades safely — `fab-lang.js`'s `data-i18n` swap
leaves an element's original (English) text untouched when a key has no
entry for the selected language, the same missing-key fallback every other
page already relies on for partial JA coverage — but a user can still pick a
language that visibly does nothing on most pages. Making `supportedLangs`
page-aware, or hiding the FAB entry for languages a given page has zero keys
for, is unbuilt follow-up work, not a hidden defect.

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

# Analysis Mode

**Boundary context:** Analysis Mode itself prompted a refinement of this repo's
public/private architecture split, recorded in
`docs/process/public-private-boundary.md` — Public Vextreme is not a limited demo but
"one organization that has already reached the desired architectural condition,"
proving the pattern by dogfooding its own architecture; Vextreme-SDK is "the reusable
machinery capable of helping other organizations reach that condition." Read that
document's "Refined principle" section before extending Analysis Mode further — it's
the checklist for keeping new phases on the public side of the line (demonstrating an
already-real pattern over public data) instead of drifting into SDK territory
(generalized resolution, heterogeneous-input adaptation, vendor workflow, governance).

## The decision

Victor asked (2026-07-10) for something bigger than a fixed sanitized-output demo page:
a live, searchable, exportable, growing interface — "add an HTML to be mappable, then
returned in full and exportable in different languages or formats upon a UI interface" —
plus screenshot-to-code navigation, plus a per-element reverse-usage view, surfaced through
a FAB-triggered panel like the existing language/theme/map orbs, not a separate page. He
named this "Lane 1" (L7 demo fidelity: real IDs, real mapping, no private exposure) and
"Lane 2" (God Script default-wiring/capability config) together, and asked Claude to lead,
decide, plan as a manifest, and build sequentially — "we're our own client."

**The decision: build this entirely inside the public Vextreme repo, over Vextreme's own
real content — not as a synthetic demo of the private SDK.**

This resolves the tension both lanes were circling without weakening either boundary:

- Vextreme's own compiled string bundles already are a real canonical-ID system.
  `docs/architecture/06-i18n.md` says it outright: "The key registry in
  `data/strings/source/` is not just a string file — it is the element identity layer for
  the entire UI." Every key (`common.label.page-live`, `pages.victors-recap-arc-1.hero`,
  etc.) already has real per-language values across `en`/`ja`/`zh` (`data/index.json`'s
  `supportedLangs`).
- `lib/trace-string-usage.js` already computes reverse usage (`scanUsages`, `traceKey`,
  `tracePage`, `findOrphanUsages`, `findUnusedKeys`) — real forward/reverse mapping,
  today, CLI/stdout-only.
- `lib/build-terrain-map.js`'s `findScreenshots()` already indexes real per-slug,
  per-language screenshots (`docs/screenshots/{slug}-{lang}.png`, written by
  `scripts/screenshot-page.js`) — real screenshot-to-content mapping, today.
- `lib/strings-export.js` already exports per-scope CSV batches — real export, today,
  CLI-only.

None of this is synthetic and none of it requires touching the private SDK. What's
missing is a unified, interactive, browser-facing surface tying these four already-real
pieces together — that's what Analysis Mode is. The private SDK's actual commercial-depth
implementation (resolver algorithms, vendor packet internals, client-specific data) stays
exactly as private as it already is; this is a parallel, independently-real instance of the
*pattern* (canonical ID, forward/reverse map, misalignment/missing-value detection,
screenshot evidence, export), proven live on public data instead of performed on a fixture.
That is the public/private "diff of meaning": the pattern is what's valuable to show: the
private implementation is what stays hidden, and showing the pattern working for real is
more convincing than a sanitized narrative ever was.

This also answers Lane 2 concretely instead of abstractly: Analysis Mode becomes a real,
motivated test case for the God-Script/FEATURES-registry capability-configuration question
(`od-011`) — built once, its actual cost (index size, fetch weight) tells us whether
default-on or per-slug opt-in is the right answer, rather than deciding blind.

## What stays out of scope

- No live call to the private Vextreme-SDK repo, ever.
- No private schema field names as public vocabulary.
- No client data.
- Platform scope is web only, matching Victor's own framing ("platform (currently just
  web)") — no native/mobile surface implied or promised.
- Export formats start with the CSV shape `strings-export.js` already produces; other
  formats (Applanga-style, etc.) are a named future phase, not this one — see Phase B below.

## Manifest of work

Sequential, one PR-sized phase at a time, same cadence as the localization product's
L1-L7 rounds. Each phase is independently mergeable and independently useful.

### Phase A — data layer (this PR)

`lib/build-analysis-index.js`: a new build script, pure-function-tested, that composes
the outputs of `trace-string-usage.js` (reused, not duplicated — `scanUsages`, `traceKey`,
`findOrphanUsages`, `findUnusedKeys`) and `build-terrain-map.js`'s `findScreenshots()` into
one browser-fetchable artifact, `data/analysis-index.json`: every key's canonical id,
present/missing languages, which page(s) reference it, and per-slug screenshot
availability. Same CQRS shape as `data/terrain-map.json` (write-side script, deterministic,
no live compute) — nothing renders yet.

Known limitation, recorded honestly: staleness detection (EN text changed since a
translation was last touched) is not included in Phase A — `manifest.json` stores an
`enHash` per key but the `_stale` comparison itself lives in `strings-check.js`'s run-time
logic, not as a persisted field. Wiring that in is a small, separate follow-up once Phase A
is live, not blocking it.

### Phase B — Analysis Mode FAB + panel (built, this PR)

`widgets/fab-analysis.js`, following the exact mount-into-`#vex-spiral-group` contract
`fab-lang.js`/`fab-map.js`/`fab-theme.js` already use (see `widgets/vex-fab.js`'s own
docstring — "a new orb is a new small widget... this file does not need to change"). Opens
a slide-out panel, not a new page: search by key or page slug substring; a result list
showing each key's language coverage (present/missing), every page that references it as a
clickable link, and a screenshot link when one exists for a referencing page (linking to the
real file under `docs/screenshots/` on GitHub); a CSV export button downloading the
currently-filtered result set client-side (Blob download, no server round-trip).

**Scoped honestly, not silently bigger than it is:** the CSV export is the coverage/mapping
table (key, present/missing languages, referencing pages) — not translated text bodies.
`data/analysis-index.json` doesn't carry string text (only `manifest.json`'s `enHash`, not
the text itself), so full-text export would mean a second fetch layer (compiled scope
bundles) not built here. Verified live via a local Playwright pass (temporary
`playwright-core` install, cleaned up after, per this repo's own documented friction note):
real search/filter against the real 246-element index, language badges, page links,
screenshot links, empty-state handling, and a real CSV download all confirmed working
end-to-end against this repo's actual data — not a mock.

`data/analysis-index.json` is fetched lazily on first panel open, not at page load — this
matters for Phase C below, not just performance hygiene.

### Phase C — capability wiring decision (built)

Measured before deciding, per the plan above: `widgets/fab-analysis.js` is 17.5KB (in
line with sibling orb widgets — `fab-lang.js` alone is 25.6KB); `data/analysis-index.json`
is ~100KB raw / ~5.4KB gzipped but is fetched lazily, only on first panel open, never at
page load. `blueprint.json`'s own `performance.budgets.perPage` ceiling is 100KB — the
widget's page-load cost is a small fraction of that.

Decision: added `Feature.ANALYSIS` to `lib/vex-config.js`, a `config/features/analysis.json`
entry, a `lib/build-vextreme.js` `FEATURES` registry entry (`default: false`, same as
every sibling orb feature — inclusion is still driven by the viewmodel, not unconditional),
and — the actual "default-on with configurable visibility" answer to `od-011` — added
`Feature.ANALYSIS` to `lib/build-index.js`'s `buildViewmodel()` default features array,
alongside `lang`/`spiral-fab`/`theme`/`map`. This is not a new mechanism: it's the exact
mechanism `theme` and `map` already use to be "on by default, per-slug excludable."

**`od-011` finding, stated plainly:** the "God Script should be default-on with per-slug
configurable visibility" question already had a working answer inside this repo before
Analysis Mode existed — `buildViewmodel()`'s default features array plus
`data/viewmodels.json`'s per-slug override array. It's opt-in-by-default at the *feature*
level (every page using the standard viewmodel gets `lang`/`spiral-fab`/`theme`/`map`, and
now `analysis`, automatically), not opt-in at the *page* level (whether a page gets a God
Script at all is still gated by `hasScopeBundle()` — a separate, still-open question,
scoped to `pe-002`, not this manifest). Demo/specimen pages that want a minimal feature set
already exclude `theme`/`map` via an explicit `viewmodels.json` override; they now also
exclude `analysis` the same way, with no new code — verified by rebuilding: their assembled
scripts don't gain the analysis feature, `victor-methodology-presentation`'s does.

**Verified end-to-end, not just at the assembler level:** rebuilt the real
`dist/vextreme-victor-methodology-presentation.js` and confirmed `feature: analysis` is
present; loaded the real, actually-built page (temporary `playwright-core`, cleaned up
after) with only the CDN URL locally redirected (network access to the real CDN isn't
available in this environment) and drove the real assembled God Script through the real
panel: 246 real elements loaded, filtered correctly to 17 matches on "archives," zero
widget-related errors.

### Phase D — code/HTML navigation (built, folded into Phase B)

Already shipped as part of Phase B: `screenshotsForKey()` links directly to the real
screenshot file on GitHub (`github.com/vgong24/Vextreme/blob/main/{path}`), and each result
row links to the real live page. Linking to the raw source HTML/string-source JSON on
GitHub (rather than the rendered page) remains a small, optional follow-up if a future
instance finds it valuable — not blocking, not scoped further here.

## Why this order

Phase A first because every later phase depends on the artifact existing and being
trustworthy — building the UI before the data layer would mean designing against guesses.
Phase C is deliberately sequenced after B, not before, because `od-011` asked a real
scaling question that Phase B's actual output size will answer better than speculation.

## Manifest status: complete

All four phases (A: data layer, B: FAB panel, C: capability wiring, D: source navigation)
are built and verified end-to-end. `od-011`'s two questions — should demo pages show real
IDs/mapping, should God Script inclusion be a configurable pattern instead of a one-off —
both have concrete, working answers: yes, over Vextreme's own real content
(`docs/process/public-private-boundary.md`'s "Refined principle" is the reasoning this
manifest is built on), through the repo's existing per-slug feature-override mechanism,
extended rather than replaced.

Read `docs/process/public-private-boundary.md`'s "Refined principle" section before
proposing a Phase E or extending Analysis Mode further — it's the checklist for keeping
new capability on the public side of the line (demonstrating an already-real pattern over
public data) instead of drifting into what `Vextreme-SDK`'s own
`docs/architecture/public-private-interface-boundary.md` names as SDK territory
(generalized resolution, heterogeneous-input adaptation, vendor workflow, governance).

---

# Nav Coverage

## The problem, stated by Victor (2026-07-10)

"we don't have a fully visible 'Header' either on all of these htmls, so i can never
navigate to like the 'main index' or the map through FABs that haven't been displayable
on any html in Vextreme yet."

Confirmed with real numbers, not assumption: `node lib/audit-nav.js` (see its own header
for methodology) found **31 of 39 pages are dead ends** — no static link to any hub page,
no `shell.js`, no God-Script FAB navigation. A visitor who lands on one of these pages has
no way to discover the rest of the system exists. This includes `terrain-map.html` — the
system's own health/dependency dashboard — and both SDK demo pages built this session
(`sdk-identity-demo.html`, `localization-source-truth-demo.html`).

## Why this happened

Three independent navigation mechanisms exist in this repo, each real and working, none
reaching most pages:

1. **Static hub links** — a page's own raw HTML links directly to a hub destination
   (`index.html`, `archives.html`, `ecosystem-hub.html`, `terrain-map.html`). Only the
   generated hub pages themselves have this baked into their own renderer output —
   `archives`, `ecosystem-hub`, `roles-index`, and the two "demo" pages that happen to
   link to one hub each (`specimens`, `vextreme-demo`). No hand-authored content page has
   any of it.
2. **`shell.js` (v1)** — a real, working loader that injects a genuine site-nav bar
   (`lib/vextreme.js`'s `injectNav()` — title link, Archives/Direct Contact/AI Tools/
   vextreme24.com links, mobile-responsive toggle). Only 3 pages reference it
   (`claude-answers-the-doubt`, `restoration-protocol`, `specimen-architectural-wisdoms`)
   — and its hardcoded link list itself is stale (points at `vextreme24.com` pages, not
   this repo's own real Terrain Map/Ecosystem Hub/Analysis Mode).
3. **God Script FAB navigation (v2)** — `spiral-fab` + orb widgets (`map`, `analysis`,
   `theme`, `lang`). Real, rich, and the actively-developed system — but only reaches a
   page that is both assembled *and* wired, which today is exactly one page
   (`victor-methodology-presentation`).

None of the three was ever the wrong idea. Each was built for a real, narrower purpose
and never extended to be the site's baseline. Nothing here is a bug in any one of them —
it's a gap between them.

## Rollout plan

Sequential, same discipline as Analysis Mode's own manifest — measure before deciding,
smallest safe increment first, verify before scaling up.

### Step 1 — measurement (done)

`lib/audit-nav.js`. Read-only, no page touched. Established the real baseline (31/39
isolated) so later steps have something concrete to improve against and verify.

### Step 2 — modernize `shell.js`'s destination links (done)

`lib/vextreme.js`'s `injectNav()` hardcoded a link list built for `vextreme24.com`-era
navigation. Added this repo's own real, current hub pages (Archives, Terrain Map,
Ecosystem Hub) alongside the existing `vextreme24.com` links, additive only. Made the
*existing* 3 `shell.js` pages' nav actually useful before extending `shell.js`'s reach.

### Step 3 — first safe rollout batch (done)

Added `shell.js` to 6 pages with zero pre-existing `<script>` tags to conflict with —
`about-me`, `bridge-council`, `bridge-council-os`, `bridge-council-schema`,
`investor-archetype-simulation`, `witness-committee-operations` — deliberately excluding
`connect.html`, `human-ai-corelational-governance.html`, and `origins-of-proof.html` from
this batch even though `lib/audit-nav.js` also flags them isolated, since each already has
its own `<script>` tag(s) that need individual review before adding a second loader, not
a blind extension of this batch. Verified two structurally different pages
(`about-me.html`, a raw fragment; `witness-committee-operations.html`, a full document
with its own pre-existing dark-mode toggle) via Playwright — both render the modernized
nav correctly, zero conflicts with existing page elements, zero errors. Real result:
**14/39 pages navigable, up from 8/39.**

### Step 4 — the 3 deferred pages, individually reviewed (done)

Read each of `connect.html`, `human-ai-corelational-governance.html`, and
`origins-of-proof.html`'s existing `<script>` block(s) before touching anything, per Step 3's
own deferral note. `connect.html` (fragment, a copy-button handler and an accordion
persistence handler, both single-init-guarded) and `human-ai-corelational-governance.html`
(full document, a section-scroll sticky sub-nav and its own light/dark theme toggle scoped to
`<html>`) both verified cleanly with `shell.js`'s default settings via Playwright — nav
injected, body wrap applied, no console errors, no visual conflicts.

`origins-of-proof.html` did **not** verify cleanly with defaults: it's a full document whose
own `#op-root` layout is intentionally wide (`--op-page-width: 1100px`), and `shell.js`'s
default body-wrap (`max-width: 720px`) squashed it to ~640px — a real, measured layout
break, not a guess. Fixed using `shell.js`'s own documented override mechanism:
`window.VEXTREME_OVERRIDE = { bodyWrap: false }` declared before the `shell.js` script tag,
disabling only the auto-wrap while keeping the nav injection. Re-verified: `#op-root` back to
its full 1280px width, nav present, no conflicts.

**Real bug found during this verification, out of scope to fix here:** a real scroll test
(not just "element exists at page load") showed `.vex-nav`'s `position: sticky` never
actually keeps the nav pinned during scroll, on *any* page using `shell.js` — including
already-merged pages from Step 3, not just this batch. Root cause: `#vex-site-nav`, the
wrapper `injectNav()` creates, is sized to exactly its sticky child's height, leaving no
room for the sticky behavior to engage. Recorded as `td-010` in
`data/status/tech-debt.json` rather than fixed inline, since it's a pre-existing, site-wide
CSS issue unrelated to which pages get `shell.js` added — bundling an unrelated fix into a
rollout PR would blur what each change is actually for.

Real result: **17/39 pages navigable, up from 14/39** (`node lib/audit-nav.js`).

### Step 5 — zero-script-tag batch from the remaining 22 (done)

Of the 22 remaining isolated pages, 5 turned out to be genuine zero-byte placeholder files
(`accountability-test-01`, `accountability-test-01-b`, `how-to-invest-in-trust-and-integrity`,
`instance-thread-logs`, `summary-of-value`) — confirmed via `git log --follow`, created empty
in a prior commit alongside real siblings (e.g. `accountability-test-02`) and never written.
Not given `shell.js`: a nav bar on a page with no other content isn't fixing a real dead-end,
it's decorating an empty file. Excluded from this batch and from the isolated-page count's
practical target, though `lib/audit-nav.js` still (correctly) reports them isolated — the tool
measures navigability, not content-readiness, on purpose.

Of the rest, 4 had zero pre-existing `<script>` tags — the same safe-first criterion Step 3
used — and got `shell.js` after individual `max-width` checks (all comfortably under or near
`.vex-page-body`'s 720px cap, verified via Playwright, no layout conflicts):
`accountability-test-02`, `covenant-architect-accord`, and this session's own two SDK demo
pages, `localization-source-truth-demo` and `sdk-identity-demo` — previously landable only by
direct link, now discoverable from the nav's own hub trail.

Real result: **21/39 pages navigable, up from 17/39** (`node lib/audit-nav.js`).

### Step 6 — pages with pre-existing `<script>` tags, individually reviewed (done)

Read all 8 non-`specimen-*` pages from Step 5's named list individually — same discipline
Step 4 gave `origins-of-proof.html` — before adding anything:

- **5 verified clean with `shell.js` defaults:** `org-blueprint`, `org-history`,
  `phantom-opera-meta-review`, `terrain-map`, `the-testimony-of-victor-gong` — each already
  had one or two small, self-contained inline scripts (link-population from a config object,
  a theme toggle, the terrain-map dashboard's own data-fetch renderer) with `max-width`s at or
  under 760px, no conflicts.
- **3 needed `bodyWrap: false`, same fix as `origins-of-proof.html`:**
  `fourteen-patterns-of-accountability-avoidance-mapped-against-the-ten-commandments`
  (`--page-width: 1300px`), `the-victor-pattern` (`--max-width: 1300px`, its own interactive
  witness-map visualization), and `the-victor-pattern-transcript` (`--vp-page-width: 1180px`,
  fragment-style like `about-me.html` — script tags appended at end of file, not before a
  `</body>` it doesn't have). All three re-verified at full designed width after the override.

**Real bonus found during review, not just risk:** `the-testimony-of-victor-gong.html`
already had a dormant `<div id="arcNavMount">` and its own `window.VEXTREME_mount()` call —
authored for the v1 arc-nav system but never activated, since no loader script was ever added
to the page and the call silently no-ops without one. `lib/vextreme.js` loads `lib/arc-nav.js`
unconditionally (not gated on a template), so adding `shell.js` here didn't just fix the
top-nav dead end — it activated real, already-authored arc navigation
(`data/arcs.json`'s `victors_record` arc, confirmed present) for the first time. Verified via
Playwright: `#arcNavMount` renders a real arc-nav box, not empty.

**Left out of this batch, deliberately:** `v2-test` (a dev fixture for arc-nav testing, not a
real content page, per `lib/audit-pages.js`'s own description) and the 4 `specimen-*` pages —
those already carry real v2 FAB widgets (`lang-fab.js`/`fab-lang.js` +
`demo-fab.js`/`fab-demo.js`, not a God Script's full 3-tag include pattern as earlier assumed;
that description was corrected during this review) and a static "← Back to specimens" link.
Adding `shell.js`'s top nav alongside an already-present FAB orb system is a different,
untested combination from every page in Steps 3-6 so far — deserves its own check, not folded
into this batch.

One inconclusive finding, not filed as tech debt: `the-victor-pattern-transcript.html` (a raw
fragment with no `<head>`/charset declaration) rendered visible mojibake in local
verification — confirmed caused by the local Python test server omitting a `charset` in its
`Content-Type` header (`curl -sI` showed plain `text/html`, no `charset=utf-8`), not
necessarily present on the real GitHub Pages deployment, which likely sends an explicit UTF-8
charset. Not fixed or filed here since it couldn't be confirmed as a real, live bug — noted so
a future instance with real GitHub Pages access can check rather than re-discover the same
question.

Real result: **29/39 pages navigable, up from 21/39** (`node lib/audit-nav.js`).

**Post-merge visual correction (2026-07-10):** Step 6's "verified clean" label
was too broad for `terrain-map` and `phantom-opera-meta-review`. Source-width
inspection missed two authored composition contracts: terrain is a viewport
application whose height must subtract the injected nav, and Phantom's hero is
full-bleed even though its reading column is 720px. The first shell rollout
therefore clipped terrain by one nav height and reduced Phantom's hero to 640px.
Once FAB v7 was forced past CDN cache, rendered hit-testing also showed the FAB
covering desktop nav links, the mobile hamburger, and Phantom's House Lights
control. The corrected geometry and shared action-rail contract are recorded in
`docs/architecture/17-fab-autoload.md` Addendum 2 with screenshots. Future
"verified clean" claims for runtime chrome require rendered rectangles and hit
targets, not width grep alone.

### Step 7 — the 4 specimen pages, FAB-widget compatibility checked and unified (done)

**Superseded by `docs/architecture/17-fab-autoload.md`**: the per-page fix described below
(individually hand-adding `vex-fab.js`/`fab-lang.js` script tags) was replaced by making
`lib/vextreme.js` auto-load the full FAB set for any page that already includes `shell.js`
— no per-page widget `<script>` tags needed anymore, anywhere. Kept below for the real
history of how the gap was found; see `17-fab-autoload.md` for the current, durable fix and
a real bug that per-page approach ran into (CI silently reverting the hand-edit on
generated pages).

Read all 4 `specimen-*` pages' existing v2 FAB widget wiring before touching anything.
Corrected an assumption from the Step 6 PR body along the way: these don't use a God
Script's 3-tag include pattern — 3 of the 4 (`specimen-full-translation`,
`specimen-partial-translation`, `specimen-smallest-miss`) loaded the older, standalone
`widgets/lang-fab.js` + `widgets/demo-fab.js` pair directly, pre-unification; the fourth
(`specimen-architectural-wisdoms`) loaded the newer `widgets/fab-lang.js` +
`widgets/fab-demo.js` pair — but *without* `widgets/vex-fab.js`, the actual "spiral" trigger
those newer widgets are meant to nest into (per the "Session 025 FAB unification" comment in
`fab-lang.js`'s own header). All 4 were therefore running their orbs in the same degraded
standalone-fallback mode, missing the real high-level container.

Caught directly by Victor mid-rollout: "there should be a 'spiral one'... theres always a
'high level container' and sub features underneath, we never duplicate a category." Fixed
properly, not just visually verified around: `widgets/vex-fab.js` added to all 4 pages
(confirmed via `lib/build-vextreme.js`'s own `FEATURES` registry that it must load *before*
`fab-lang.js`/`fab-theme.js`/`fab-map.js` — their `DOMContentLoaded` handlers fire in
registration order, and `vex-fab.js` has to create `#vex-spiral-group` first). The 3 pages on
the legacy `lang-fab.js`/`demo-fab.js` pair were migrated to the current `fab-lang.js`/
`fab-demo.js` pair — confirmed behaviorally identical via direct diff (same
`VEX_STRING_SCOPES`/`VEX_STRING_CATEGORY` contract, same `DOMContentLoaded` → `mount()`
pattern) before swapping, not assumed compatible. `widgets/fab-demo.js` itself has no
spiral-group awareness by design (it's a simple, permanent standalone orb offset next to the
lang orb, per its own header comment) — the "never duplicate a category" fix applies to the
language-switcher orb, which now genuinely nests, not to the demo-link orb, which was never
meant to.

Verified via Playwright after the fix, not assumed: `#vex-spiral-group` exists, the language
orb is a real DOM child of it (not a same-named element floating outside), the spiral trigger
opens correctly, and `shell.js`'s top nav bar renders with zero visual or positional conflict
against the now-unified spiral trigger + orb pair.

**Real finding, addressed:** all 4 pages set `max-width`/`margin: 0 auto`/`padding` directly
on `<body>` itself (860px for 3 of them, 920px for `specimen-architectural-wisdoms`) — a
different authoring pattern from every other page in this rollout, which used an inner
wrapper element instead. Since `injectNav()` inserts `#vex-site-nav` as `body`'s first
child, `body`'s own padding applied to the nav too, and — with `shell.js`'s default
`bodyWrap: true` — its own `.vex-page-body` wrapper (another 44px of top padding, another
720px max-width) stacked on top of `body`'s own padding, roughly doubling top whitespace
and narrowing already-reasonable content further than necessary. Fixed the same way as the
wide-layout pages in Steps 4 and 6: `window.VEXTREME_OVERRIDE = { bodyWrap: false }`,
letting each page's own pre-existing width/padding system stand alone. Re-verified: clean,
single-padding layout, full designed width, no orb overlap, on all 4.

Real result: **33/39 pages navigable, up from 29/39** (`node lib/audit-nav.js`).

### What's left, deliberately out of scope

6 pages remain isolated: `accountability-test-01`, `accountability-test-01-b`,
`how-to-invest-in-trust-and-integrity`, `instance-thread-logs`, `summary-of-value` (the 5
empty placeholders confirmed in Step 5 — real dead files, not real dead ends) and `v2-test`
(a dev fixture for arc-nav testing, not real content, per `lib/audit-pages.js`'s own
description). None of the six are a rollout target as currently scoped — if any of them
ever gets real content, it should get the same individual review every other page in this
rollout got, not a blind default. Whether the long-term target beyond this rollout is
universal `shell.js` coverage, universal God-Script wiring (`pe-002`), or a deliberate mix,
remains a decision to make with real usage data, not guessed now.

## What this is not

Not a redesign of any of the three navigation mechanisms. Not a decision to retire
`shell.js` or to force universal God-Script wiring. Not a claim that every isolated page
*should* be reachable the same way — a raw content fragment meant for a Squarespace Code
Block, for instance, may legitimately never need `shell.js` if it's never viewed outside
that context. Each page's real disposition is a judgment call informed by
`lib/audit-nav.js`'s output, not a blanket rule.

---

# FAB Auto-Load: shell.js Becomes the One Bootstrap for Nav *and* FAB

## The problem, stated by Victor (2026-07-10)

Mid-`16-nav-coverage.md` rollout, reviewing a screenshot: *"i think your using the wrong
'fab', there should be a 'spiral one' which is like the 'latest fab system interface
intro'... theres always a 'high level container' and sub features underneath, we never
duplicate a category."*

That correction led to a real, working fix for 4 specimen pages (see `16-nav-coverage.md`
Step 7): each got `widgets/vex-fab.js` (the spiral trigger + `#vex-spiral-group` container)
plus `widgets/fab-lang.js`, hand-added as individual `<script>` tags per page.

Victor's follow-up caught the deeper issue: *"the simplest path is 'add what should be
common via script, and inject script through simplicity so that the automations can work
with whats provided'... so we don't have to duplicate work to fixing multiple htmls but
just 1 script while other htmls already hold that bond to a process. Like the script
should add the 'header + fab + any feature accessible' long term."*

Hand-adding 2-5 widget `<script>` tags per page, repeated across every page that wants the
current FAB set, is exactly the duplication he named — and it already had a real failure
mode (below) proving the point.

## What already existed, and what was missing

`lib/vextreme.js` (`shell.js`'s loader) already auto-provides nav and body-wrap from one
script tag — no page hand-authors its own nav HTML. There was no equivalent for the v2
spiral-FAB system: every page wanting `vex-fab.js` + `fab-lang.js` + `fab-theme.js` +
`fab-map.js` had to list all four itself. The only place these got assembled automatically
was `lib/build-vextreme.js`'s God Script build — a heavier process requiring per-slug
string-scope/viewmodel configuration most standalone pages don't have.

## The fix: `lib/vextreme.js` auto-loads the FAB set

`loadFabWidgets(cfg)`, wired into `run()`'s main loader chain, fires independently of the
rest of the loader (none of these widgets read anything `vextreme.js` itself fetches) and
loads, in this exact order — order is load-bearing, `vex-fab.js` must create
`#vex-spiral-group` before the others look for it:

```
widgets/vex-fab.js  → widgets/fab-lang.js → widgets/fab-theme.js → widgets/fab-map.js
```

Gated the same way `nav`/`bodyWrap` already are (`cfg.fab`, default `true` on
`github_pages`/`local`, `false` on `squarespace`). A page never needs its own `<script>`
tags for these — `shell.js` is now the one place this is wired, for nav and FAB alike.

**`widgets/fab-demo.js` is deliberately not included** — deprecated per `fab-map.js`'s own
header comment ("not `widgets/fab-demo.js`'s older 'architecture demo' concept... the
terrain map itself demonstrates the architecture better"). Per Victor's own instruction:
"you can remove the fab-demo as deprecated and focus on the fullest feature."

**`widgets/fab-analysis.js` is deliberately not included** — it depends on a real,
page-specific `data/analysis-index.json` entry most standalone pages don't have; it stays
an explicit per-page opt-in via the God-Script build system, not a blanket auto-load.

## A real bug this fix caught, not just a cleanup

Before finding the right fix, the specimen pages' first patch (individually adding
`vex-fab.js`/`fab-lang.js` script tags per page) was **silently reverted by CI within
about a minute of merging.** `pages/specimen-*.html` and `pages/specimens.html` are
generated by `lib/build-specimens.js`, auto-run and auto-committed by
`.github/workflows/build-index.yml` on every push/PR (`git add ... pages/specimen-*.html
...`). The hand-edited `<script>` tags weren't in the generator's own template
(`widgetScripts()`, then still emitting the old `lang-fab.js`+`demo-fab.js` pair) — so the
next CI run regenerated the files from that stale template and clobbered the manual fix,
with nobody noticing until this investigation traced `git log` on the affected files.

This is exactly the situation Victor asked to be checked directly: *"i just wanna make
sure you're ensuring the architecture is auto adding the additions right, theres no ai
manually adding a correction into an html but checking that there is automated script
processes."* The honest answer at that point was no — and the fix is the same as the
broader one: edit the generator (`lib/build-specimens.js`'s `pageShell()`/
`stringScopeGlobals()`), not the generated HTML, so the change survives every future
CI-triggered regeneration.

## A real conflict this fix had to design around

`widgets/fab-theme.js`'s own `mount()` unconditionally applies its saved/default
`"light"`/`"dark"` value to `document.documentElement`'s `data-theme` attribute on load
(confirmed by reading its source, not assumed). Two real conflicts, found by systematically
grepping every `shell.js`-including page for `data-theme`/`localStorage` theme references,
not spot-checked:

- **The specimen/dashboard pages** (`specimens.html` + the 3 generated specimens +
  `specimen-architectural-wisdoms.html`) set `<html data-theme="dashboard">` — a static CSS
  variant selector (`styles/design-system.css`'s own `[data-theme="dashboard"]` block, per
  `fab-theme.js`'s own header comment naming that exact convention), not a dark/light toggle
  state. `fab-theme.js` mounting would silently overwrite it to `"light"`/`"dark"` on load,
  breaking the dashboard visual identity the instant the page loaded.
- **`human-ai-corelational-governance.html`** and **`phantom-opera-meta-review.html`** each
  already have their own real, working dark/light toggle that also targets
  `document.documentElement`'s `data-theme` — different localStorage keys
  (`vxg-theme`/none vs. `fab-theme.js`'s `vex-theme`) and different conventions (explicit
  both-states vs. attribute-removal-for-light) than `fab-theme.js`'s own. Two toggles
  fighting over one shared attribute, desynced from load.

`origins-of-proof.html`'s own toggle scopes `data-theme` to `#op-root`, not
`document.documentElement` — confirmed safe, no conflict, no override needed.

### The fix: `fabWidgets`, a per-widget opt-out

`VEXTREME({ fabWidgets: { theme: false } })` (same shape for `lang`/`map`) skips one widget
in the auto-loaded set while keeping the rest — `vex-fab.js` (the spiral container itself)
always loads when `cfg.fab` is true. Applied to the 5 pages above via
`window.VEXTREME_OVERRIDE = { fabWidgets: { theme: false } }` (the 4 specimen/dashboard
pages, via the generator template so it survives regeneration) or added directly (the 2
pages with their own real toggle, hand-authored, no generator to fix instead).

## What this doesn't solve

- `fab-theme.js` itself still unconditionally applies its own theme on every page that
  doesn't explicitly opt out — a more general fix (e.g., skip applying if
  `document.documentElement` already has a non-`"light"`/`"dark"` `data-theme` value on
  mount) would help future pages with a similar convention avoid needing an explicit
  per-page override, but that's a behavior change to a shared, actively-used widget file —
  a bigger, separate decision, not made here.
- No systematic detector for this class of conflict exists — `lib/audit-nav.js` and
  `lib/audit-pages.js` check navigability and God-Script wiring respectively, neither
  checks FAB-widget nesting correctness or `data-theme` convention collisions. Found here by
  manual, systematic grep across every `shell.js`-including page — worth a real audit
  script if this pattern recurs, not built here.

## Verified, not assumed

Local Playwright verification against 6 real pages spanning every scenario: two
`data-theme="dashboard"` pages (confirmed attribute preserved, not clobbered), two pages
with their own working toggle (confirmed unaffected, no desync), two plain pages (confirmed
all three sub-widgets — lang, theme, map — actually nest inside `#vex-spiral-group`, not
just present somewhere in the DOM). Zero `fab-demo.js` orbs found on any page, confirming
the deprecation holds everywhere, not just where explicitly checked.

## Addendum (2026-07-10, same day): three real regressions found after the rollout shipped

Victor reported all three from the live site; each traced to a real root cause and fixed
in the follow-up regression PR. Recorded here because each one is a lesson about what this
architecture does when runtime chrome meets authored pages:

1. **Authored styles overwritten (phantom-opera-meta-review).** `vextreme.js`
   blanket-injected `design-system.css` on every `shell.js` page — a universal reset,
   `:root` tokens (`--muted`, `--border`, `--ember`, `--mono`…) and a global `body`
   typography rule. Appended as a `<link>` after the page's own inline `<style>`, it wins
   the cascade at equal specificity and silently replaced authored token values and body
   styles. Worse, blanket-loaded `section-toggle.js` auto-discovers ANY `[data-section]`
   attribute and attaches collapse-on-click listeners — a real behavior hijack on
   `fourteen-patterns…html`, whose own sub-nav uses `data-section` for something else.
   **Fix:** the whole v1 enhancement layer (`design-system.css`, `arc-nav.css`,
   `arc-nav.js`, `archive-renderer.js`, `section-toggle.js`, `bc-nav.js`) is now gated to
   pages that actually consume the v1 system — a `pages.json` template entry or an
   `#arcNavMount`. Authored pages get chrome (nav, FAB, `site-nav.css` — all class-scoped),
   never a restyle. This is the defensive half of the Runtime View Profiles /
   Composition Container proposal (`od-012`,
   `docs/continuity/context-notes/runtime-view-profiles-composition-container-2026-07-10.md`):
   runtime modules decorate authored content, they do not rewrite it.

2. **The FAB never appeared on production (cache).** The FAB-autoload change shipped
   without bumping the cache version — `shell.js` still requested `vextreme.js?v=6`, and
   jsDelivr/browser caches kept serving the pre-FAB build indefinitely. `shell.js`'s own
   header says `VEXTREME_VER` and `DEFAULT_CACHE` must be bumped together; nobody did.
   **Fix:** both bumped to `?v=7`, and `tests/41` now enforces the sync so a mismatch fails
   CI instead of relying on someone remembering. Note the propagation reality: jsDelivr
   caches `@main` refs for up to ~12 hours — after any merge that changes runtime JS, the
   live site lags until the CDN refreshes (or a manual purge via `purge.jsdelivr.net`).

3. **Wide authored layouts squashed (terrain-map and 8 others).** The default 720px
   body-wrap constrained pages whose own layouts are wider — including patterns the earlier
   rollout's manual checks missed: widths routed through arbitrary-named custom properties
   (`org-blueprint`'s `--maxw: 1160px`) and viewport-relative layouts (`terrain-map`'s
   `max-width:60%`). **Fix:** `bodyWrap: false` on all 9 flagged pages, found by the new
   `lib/audit-fab.js` (below), not by hand.

**The auditor (`lib/audit-fab.js`)** makes all three regression classes script-perceptible
— per Victor's direct ask: "i was hoping for pattern recognition so that honing could be
script perceptible." It checks every `shell.js` page for: authored widths beyond the wrap
cap (px, var()-routed, or viewport-relative) without `bodyWrap:false`; document-level
`data-theme` management without `fabWidgets:{theme:false}`; and hand-authored FAB widget
tags (now duplication — the auditor also caught `claude-answers-the-doubt` and
`restoration-protocol` still carrying legacy `lang-fab.js`/`demo-fab.js` tags, which under
autoload would have produced double language orbs; both cleaned). `tests/42` pins the
whole `pages/` tree at zero findings, so reintroducing any known-conflict pattern fails CI.

Also fixed alongside: `fab-lang.js` now mounts with a single language (previously hid
itself below 2) — per Victor: "the language even if just 1, should still be there." The
orb is part of the consistent FAB chrome; with one language the wheel simply shows the
current language.

## Addendum 2 (2026-07-10): global chrome needs owned geometry, not shared coordinates

The v7 regression repair correctly protected authored styles and made the FAB
autoload cache-coherent, but rendered comparison found a separate composition
gap. Nav, spiral FAB, mobile hamburger, and page-owned controls all independently
claimed the top-right corner:

- At 1035px, the closed FAB covered `vextreme24.com`; opened, it covered that
  link plus `AI Tools`.
- At 390px, the FAB and hamburger occupied the same rectangle. Hit-testing the
  hamburger returned `#vex-spiral-trigger`.
- Phantom's House Lights button overlapped both nav and FAB and hit-tested the
  nav instead of the button.
- Terrain's app still measured 100vh below a 61px nav (`bottom: 1021` in a
  960px viewport), clipping its lower controls.
- Phantom still received the generic 720px wrapper, reducing its full-width
  hero to 640px even though the authored-style gate preserved its colors.

The v8 contract assigns those surfaces instead of offsetting them ad hoc:

1. `injectNav()` creates `#vex-nav-actions` before FAB scripts load.
2. `vex-fab.js` mounts into that rail when present. Its trigger remains at the
   rail's right edge while the group expands left in normal flex layout.
3. Headerless/God-Script pages retain the original fixed top-right fallback.
   The methodology presentation therefore keeps its existing authored layout.
4. Page-owned fixed controls opt into the separate below-nav lane with
   `data-vex-page-action`; the shell does not move or restyle their DOM.
5. The nav cancels authored body margin/padding on `#vex-site-nav` only, so
   global chrome reaches viewport edges without changing the raw page body.

The terrain map now consumes exactly the viewport remaining below nav, and the
Phantom page opts out of prose wrapping while lending its own palette aliases to
the class-scoped nav. Rendered evidence:

- [`terrain-runtime-chrome-action-rail.png`](../screenshots/terrain-runtime-chrome-action-rail.png)
- [`terrain-runtime-chrome-mobile-open.png`](../screenshots/terrain-runtime-chrome-mobile-open.png)
- [`phantom-runtime-chrome-dark.png`](../screenshots/phantom-runtime-chrome-dark.png)

This does **not** make the FAB universal across every public HTML surface yet.
Current delivery is 28 shell pages plus one God-Script page; ten `pages/*.html`
surfaces still have neither path. Global rollout is the next bounded PR after
this composition contract is accepted. Analysis traversal, view profiles, and
cross-page string navigation remain product direction, not completed behavior.

---

<!-- [VXG RealForever] -->
