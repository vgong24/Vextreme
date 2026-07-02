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
reasoning is still live in context. This is why session entries in the batch files
read as reasoning chains (what was tried, what was rejected, what's still assumed)
rather than commit-log summaries: the commit log already has the diff. The batch
entry is the thing the diff can't tell you.

A session is not bounded by wall-clock time or by a single PR. Two sessions on the
same day, continuing the same thread, are recorded as one entry with a "continues
from" note (see Session 004 → 005 in the active batch file for an example) — the
split that matters is the reasoning arc, not the calendar.

---

Three layers, three time horizons:

| Layer | File | Purpose | Written by |
|---|---|---|---|
| Current snapshot | `docs/continuity/INDEX.md` | Where is the system right now | Claude at session end |
| Session narrative | `docs/continuity/Batch 00N.md` | Mistakes, reasoning, assumptions | Claude on Victor's signal |
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
lookup, not pre-loading. A cold-start instance reads INDEX.md → most recent batch
session → architecture.md. Lessons are consulted when a pattern recurs or when
building something adjacent to a known lesson domain. Keeping them out of the
mandatory reading sequence is intentional.

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

*Last updated: 2026-07-02*

<!-- [VXG RealForever] -->
