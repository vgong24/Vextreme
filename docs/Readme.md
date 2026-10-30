# VEXTREME — Frontend Architecture

## Overview

This repo holds the modular frontend of vextreme24.com, extracted from
Squarespace's Code Injection areas. The goal is a GitHub-hosted source of
truth that Squarespace loads from, rather than logic living buried in page
scripts.

---
---

## Stable baseline — v2 (June 29, 2026)

This documents the working state of the system as of the first confirmed
end-to-end render on vextreme24.com.

For the full session record — mistakes, reasoning, open work — see
`docs/continuity/batch-001.md` Session 001.

### What is confirmed working

- jsDelivr serves all files from `vgong24/vextreme@main` with `?v=2` cache bust
- `arcs.json` and `pages.json` fetch and parse correctly
- `arc-nav.js` loads after data, defines `VEXTREME_mount` cleanly
- Slug auto-detection from `window.location.pathname` works — no per-page
  block required for standard pages
- Arc nav widget renders correctly on `claude-answers-the-doubt`:
  dot rows for `epstein` and `claude_journals`, position row for `full_timeline`,
  "You are here" footer with correct page title

### What was fixed to get here

**Bug 1 — Dead DOMContentLoaded listener in arc-nav.js**
`arc-nav.js` registered `document.addEventListener('DOMContentLoaded', mount)`
at load time. Since `arc-nav.js` loads dynamically after two async fetches,
`DOMContentLoaded` had already fired — the listener never executed.
Fix: removed self-mount entirely. The loader owns the single mount call.

**Bug 2 — Mount called before PAGE_ARCS was set**
The loader called `VEXTREME_mount()` before running the slug auto-detection
fallback. Mount saw `PAGE_ARCS = undefined` and returned early.
Fix: auto-detection now runs first, then mount.

**Bug 3 — jsDelivr serving cached arc-nav.js**
jsDelivr cached the old `arc-nav.js` (which expected `entry.url` not
`entry.slug`). Slug lookups returned empty even when data was correct.
Fix: `?v=2` cache bust appended to all `loadScript()` calls in the loader.

### Current load sequence (confirmed)

```
Header injection fires:
  → fonts loaded
  → design-system.css loaded
  → arc-nav.css loaded

Page HTML parses:
  → #arcNavMount div exists in DOM
  → window.PAGE_ARCS set (if per-page block present)

Footer injection fires (async):
  fetch(arcs.json?v=2)  ──┐
  fetch(pages.json?v=2) ──┴── both resolve
    → window.VEXTREME_ARCS  = arcs
    → window.VEXTREME_PAGES = pages
    → arc-nav.js?v=2 loaded (defines VEXTREME_mount)
    → archive-renderer.js?v=2 loaded
    → section-toggle.js?v=2 + bc-nav.js?v=2 loaded
    → window.PAGE_ARCS set via URL auto-detect (if not already set)
    → VEXTREME_mount() called — widget renders
    → window._vexReady = true
    → 'vextreme:ready' event dispatched
```

### Version markers

| Asset | Cache version | Notes |
|---|---|---|
| `arcs.json` | `?v=2` | 16 arcs, 75 timeline entries |
| `pages.json` | `?v=2` | 7 presets, ~30 slug entries |
| `arc-nav.js` | `?v=2` | v2.0.0 — no self-mount |
| `archive-renderer.js` | `?v=2` | token merge + entry row HTML |
| `section-toggle.js` | `?v=2` | localStorage collapse state |
| `bc-nav.js` | `?v=2` | shape-coded nav |
| `design-system.css` | no cache bust needed | served via `<link>` |
| `arc-nav.css` | no cache bust needed | served via `<link>` |

When making changes: update the affected files on GitHub, then increment
`CACHE_VER` in `docs/squarespace-injection.html` and replace the footer
injection in Squarespace.

---


## Directory Structure

```
vextreme/
│
├── index.html                     ← GitHub Pages landing page. Lists all
│                                preserved pages. Served at repo root when
│                                GitHub Pages is enabled.
│
├── pages/
│   └── [slug].html               ← One file per preserved page. Self-contained.
│                                Loads styles + arc nav from GitHub. Same slug
│                                as the Squarespace counterpart.
│
├── data/
│   ├── arcs.json                  ← THE CONTENT SCHEMA. All arcs, sections,
│   │                                entries, and slugs live here. Edit this
│   │                                first when adding pages.
│   ├── pages.json                 ← THE DISPLAY MAP. Three-layer token system:
│   │                                presets → per-slug overrides. Controls how
│   │                                each entry row looks in the archives page.
│   └── environments.json          ← BASE URL MAP. One entry per deployment
│                                    environment. arc-nav.js auto-detects from
│                                    hostname — no config needed per environment.
│
├── lib/
│   ├── vextreme.js                ← THE UNIFIED LOADER. One function: VEXTREME(config).
│   │                                Environment detection, stylesheet injection,
│   │                                data fetch, engine load, mount. Works on all
│   │                                environments. Never change the interface —
│   │                                add fields to the config schema instead.
│   ├── shell.js                   ← GitHub Pages bootstrap. One <script> tag per
│   │                                page. Loads vextreme.js, passes config.
│   ├── arc-nav.js                 ← Arc nav engine. Reads VEXTREME_ARCS,
│   │                                renders the dot-nav widget. No data.
│   │                                No CSS. Pure logic.
│   └── archive-renderer.js        ← Archives page renderer. Merges pages.json
│                                    token layers, generates entry row HTML.
│
├── components/
│   ├── bc-nav.js                  ← Simple shape-coded nav. Reads bcNavConfig.
│   │                                Separate from the arc system entirely.
│   └── section-toggle.js          ← Archives page expand/collapse. Reads
│                                    VEXTREME_SECTIONS or auto-discovers
│                                    [data-section] attributes.
│
├── styles/
│   ├── design-system.css          ← Global tokens + shared classes. Canonical
│   │                                source for all CSS vars and shared components.
│   ├── arc-nav.css                ← Arc nav widget styles only.
│   ├── squarespace-overrides.css  ← Squarespace nav/layout overrides. Loaded
│   │                                automatically on squarespace env. Never
│   │                                link manually on GitHub Pages.
│   ├── site-nav.css               ← Standalone nav for GitHub Pages + local.
│   │                                Loaded automatically on those envs. Never
│   │                                link on Squarespace.
│   └── page-templates/
│       ├── journal-qa.css         ← Journal/Q&A format. Load per-page.
│       ├── bridge-council.css     ← .bc-page scoped system. Load per-page.
│       └── ascension-embodiment.css ← .ae-page scoped system. Load per-page.
│
└── docs/
    ├── README.md                  ← This file. Architecture map, load order,
    │                                token reference, key dates.
    ├── continuity/
    │   ├── INDEX.md              ← READ THIS FIRST on any new session.
    │   │                            Current system state, open work, batch
    │   │                            registry, and continuity rules.
    │   └── batch-001.md          ← Sessions 001–010. Append only. When full,
    │                                create batch-002.md, update INDEX.md.
    ├── squarespace-injection.html ← The exact code to paste into Squarespace's
    │                                Header and Footer injection areas. Source
    │                                of truth for what Squarespace loads and why.
    │                                Version-controlled here so changes are
    │                                tracked before being applied live.
    └── test-playground.html        ← Self-contained diagnostic page. Paste into
                                     a Squarespace page at slug 'test-playground'.
                                     Tests slug resolution, arc row rendering,
                                     data integrity, and stack load status live.
```

---

## Squarespace injection — what goes where and why

Squarespace exposes two global injection points (Settings → Advanced → Code
Injection) plus a per-page Custom Code area. Each has a distinct role.

### Why this split exists

The old system was one large inline script in the Footer injection. It defined
`window.VEXTREME_ARCS` as a hardcoded object and `VEXTREME_mount` as an inline
function — all synchronous, all in one place. That meant:

- Updating arc data required editing the Squarespace injection directly
- No version history, no diff, no rollback
- Logic and data were inseparable

The new system moves everything to GitHub. Squarespace's injection areas become
a thin loader — three `<link>` tags in the header and one `<script>` block in
the footer. Nothing else lives there.

---

### Block 1 — Header injection

**Where:** Settings → Advanced → Code Injection → Header

**What it loads:** Fonts and stylesheets only. No scripts.

**Why header:** Stylesheets must load before HTML renders to prevent a flash of
unstyled content. Scripts in `<head>` block rendering, so nothing executable
goes here.

```html
<!-- Fonts -->
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Source+Serif+4:ital,wght@0,300;0,400;0,600;1,300;1,400&family=IBM+Plex+Sans:wght@300;400;500;600&family=IBM+Plex+Mono:wght@400&family=Cormorant+Garamond:ital,wght@0,300;0,400;1,300;1,400&family=DM+Mono:wght@300;400&display=swap" rel="stylesheet">

<!-- Global design system — tokens, entry rows, pills, section toggles -->
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/vgong24/vextreme@main/styles/design-system.css">

<!-- Arc nav widget styles -->
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/vgong24/vextreme@main/styles/arc-nav.css">
```

---

### Block 2 — Footer injection

**Where:** Settings → Advanced → Code Injection → Footer

**What it loads:** Data → engines → components, in dependency order.

**Why footer:** Scripts in the footer run after the page HTML has parsed, so
`document.getElementById` and `querySelectorAll` work immediately. The loader
itself is a single self-contained IIFE.

**The load sequence is intentional and must not be reordered:**

```
fetch(arcs.json)  ──┐
                    ├── both resolve → assign to window globals
fetch(pages.json) ──┘
                         ↓
                    arc-nav.js        (reads VEXTREME_ARCS)
                         ↓
                    archive-renderer.js  (reads VEXTREME_ARCS + VEXTREME_PAGES)
                         ↓
                    section-toggle.js + bc-nav.js  (no data dependency, parallel)
                         ↓
                    VEXTREME_mount()  (called directly — DOMContentLoaded
                                       has already fired by this point)
                    vextreme:ready event dispatched
```

```html
<script>
(function () {
  'use strict';

  var BASE  = 'https://cdn.jsdelivr.net/gh/vgong24/vextreme@main';
  var DATA  = BASE + '/data';
  var LIB   = BASE + '/lib';
  var COMP  = BASE + '/components';

  // Guard: don't double-init if already loaded.
  // Catches the transition period where old inline scripts
  // may still exist on some pages.
  if (window._vexLoaderInit) return;
  window._vexLoaderInit = true;

  Promise.all([
    fetch(DATA + '/arcs.json').then(function (r) { return r.json(); }),
    fetch(DATA + '/pages.json').then(function (r) { return r.json(); })
  ])
  .then(function (results) {
    // Guard: only assign if not already set by an old inline script
    if (!window.VEXTREME_ARCS)  window.VEXTREME_ARCS  = results[0].arcs;
    if (!window.VEXTREME_PAGES) window.VEXTREME_PAGES = results[1];
    return loadScript(LIB + '/arc-nav.js');
  })
  .then(function () {
    return loadScript(LIB + '/archive-renderer.js');
  })
  .then(function () {
    return Promise.all([
      loadScript(COMP + '/section-toggle.js'),
      loadScript(COMP + '/bc-nav.js')
    ]);
  })
  .then(function () {
    if (typeof window.VEXTREME_mount === 'function') {
      window.VEXTREME_mount();
    }
    window._vexReady = true;
    document.dispatchEvent(new CustomEvent('vextreme:ready'));
  })
  .catch(function (err) {
    console.warn('[VEXTREME] Loader error:', err);
  });

  function loadScript(src) {
    return new Promise(function (resolve, reject) {
      if (document.querySelector('script[src="' + src + '"]')) {
        resolve(); return;
      }
      var el     = document.createElement('script');
      el.src     = src;
      el.onload  = resolve;
      el.onerror = function () { reject(new Error('Failed: ' + src)); };
      document.head.appendChild(el);
    });
  }

}());
</script>
```

---

### Block 3 — Per-page Custom Code (optional)

**Where:** Each individual Squarespace page → Custom Code area or Code Block.

**Most pages need nothing here.** The loader auto-detects the slug from
`window.location.pathname` — a page at `/claude-answers-the-doubt` resolves
automatically. Only add this block when the URL slug doesn't match the arc
entry slug, or you need to force a specific arc.

```html
<div id="arcNavMount"></div>
<script>VEXTREME_page('your-page-slug-here');</script>
```

`VEXTREME(config)` is the single interface. Call it once per page with a
config object — all fields optional. The loader detects environment, injects
the right stylesheets, loads data and engines, and mounts the widget.
`VEXTREME_page('slug')` still works as a legacy alias.

**Compatibility with old patterns:**

Old pages still in Squarespace with either legacy pattern still work via
URL auto-detection. No urgent need to update them — but when you touch a
page, simplify to the one-liner above.

| Pattern | Status | Notes |
|---|---|---|
| `const PAGE_ARCS = [...]; window.VEXTREME_mount && ...` | broken by design, rescued by auto-detect | Update when touched |
| `window.PAGE_ARCS = [...]; if (_vexReady) ... else addEventListener` | correct but verbose | Update when touched |
| `VEXTREME_page('slug')` | current — one line | Use this going forward |
---

### Migration checklist — per page

Most pages need nothing touched. The footer loader handles slug detection
automatically. Only act on a page if the widget isn't appearing after the
footer injection is live.

**If the widget doesn't appear on a specific page:**

- [ ] Open browser console — look for `[VEXTREME] Loader error` messages
- [ ] Check `window.VEXTREME_ARCS` in console — if undefined, the fetch
      failed (likely jsDelivr cache). Increment `?v=` in the footer script.
- [ ] Check `window.PAGE_ARCS` in console — if undefined, pathname detection
      failed. Add the per-page block above with the correct slug.
- [ ] Confirm the slug in arcs.json matches exactly (case-sensitive)

**If a page has the old inline script and it's conflicting:**

- [ ] Remove `const PAGE_ARCS = [...]` — the auto-detection replaces it
- [ ] Remove `window.VEXTREME_mount && window.VEXTREME_mount()` — the loader
      calls mount after the full chain resolves
- [ ] Keep `<div id="arcNavMount"></div>` exactly where it is — this is still
      required as the mount target

**jsDelivr cache busting:**
When `arcs.json` or `pages.json` changes aren't reflecting on the live site,
increment the `CACHE` variable in the footer injection from `?v=1` to `?v=2`
(or any new value). This forces jsDelivr to fetch fresh files. The canonical
location for this change is `docs/squarespace-injection.html` — edit there
first, then copy to Squarespace.

The canonical copy of all injection blocks lives in
`docs/squarespace-injection.html`. That file is the source of truth —
edit it here first, then copy to Squarespace.

---

## How to add a new page

1. Open `data/arcs.json`
2. Find the arc(s) this page belongs to
3. Add an entry: `{ "n": N, "title": "...", "slug": "your-slug" }`
4. If the page needs custom styling, add a slug entry to `data/pages.json`
5. Add the per-page block (Block 3 above) to the Squarespace page,
   with the correct slug string

The slug is the last segment of the URL: `vextreme24.com/your-slug` → `your-slug`.

---

## Multi-environment deployment

The same codebase runs in three environments without modification:

| Environment | Base URL | Purpose |
|---|---|---|
| Squarespace | `https://www.vextreme24.com` | Primary public site. Formal sharing links. |
| GitHub Pages | `https://vgong24.github.io/vextreme` | Preservation copy. Forkable. Independent. |
| Local | `http://localhost:8080` | Development and testing. |

`arc-nav.js` detects the environment from `window.location.hostname` at
runtime and sets the correct base URL automatically. No per-environment
config needed. To override: set `window.VEXTREME_BASE_URL` before the
loader runs.

**Enabling GitHub Pages:**
Repo Settings → Pages → Source: main branch → folder: / (root).
The `index.html` at repo root becomes the landing page. Pages live in
`/pages/[slug].html`.

**Adding a page to the preservation archive:**
1. Copy the Squarespace page HTML into `/pages/[slug].html`
2. Remove the Squarespace wrapper (nav, footer chrome) — keep content only
3. Add the standard page shell (see any existing page in `/pages/`)
4. Add a link to `index.html`

**What "same logic, different base URL" means in practice:**
The arc nav widget on `pages/claude-answers-the-doubt.html` renders the
same dot rows as the Squarespace page. Clicking a dot on GitHub Pages links
to `vgong24.github.io/vextreme/pages/[slug].html`. Clicking the same dot
on Squarespace links to `vextreme24.com/[slug]`. Same data, same engine,
different hrefs — resolved at render time from the detected base URL.

**The migration map (`data/environments.json`):**
If a slug ever needs to differ between environments, add it to
`environments.migrationMap.entries`. This is the source of truth for any
future redirect or URL-rewriting logic. If slugs stay consistent across
environments (which is the goal), this stays empty.

---

## Continuing this build

If you are an AI instance or contributor picking up this project, the
continuity log is the right starting point — not this file.

**→ [`docs/continuity/INDEX.md`](continuity/INDEX.md)**

The index tells you the current system state, what work is open, and which
batch file to append your session to. This README documents the architecture
as it was designed. The continuity log documents the system as it actually is.

---

## Arc system concepts

### Arc
A named sequence of entries grouped into sections. Each arc has a `parent`
(the index page it links back to) and a `priority` (render order when a page
appears in multiple arcs).

### Entry
A single page within an arc. Fields: `n` (position), `title`, `slug`.
The slug is the canonical identifier — no full URLs stored in the data.

### Section
A named group of entries within an arc (e.g. "Phase I", "Arc II - Public Record").
Sections appear as visual gaps between dot clusters in the nav row.

### renderMode
Default: dot row with section gaps and prev/next arrows.
`"position"`: counter and arrows only, no dots. Used for `full_timeline`
because 75+ dots is not usable.

### Priority
Controls which arcs render first when a page appears in multiple arcs.
- `1` — primary arcs (the arc the page belongs to)
- `2` — cross-reference arcs (excavation, march_23_2026, dome, etc.)
- `99` — full_timeline (always last)

### Slug auto-resolution
When PAGE_ARCS is `[{ slug: 'some-slug' }]`, the engine scans all arcs for
that slug and renders every arc that contains it, sorted by priority. Dot
arcs render before position-only arcs (full_timeline).

---

## File responsibility boundaries

| File | Reads | Writes | Knows about |
|---|---|---|---|
| `data/arcs.json` | — | — | All arcs, all entries, all slugs |
| `data/pages.json` | — | — | Display tokens: presets, per-slug overrides, pills, fonts |
| `lib/vextreme.js` | config object, `window.location` | `window.VEXTREME`, all globals | Unified loader — env detection, styles, data, engines, mount |
| `lib/shell.js` | `VEXTREME_CONFIG_PENDING` | loads `vextreme.js` | GitHub Pages bootstrap — one script tag per page |
| `lib/arc-nav.js` | `VEXTREME_ARCS`, `PAGE_ARCS` | `#arcNavMount` innerHTML | Arc rendering, slug resolution |
| `lib/archive-renderer.js` | `VEXTREME_ARCS`, `VEXTREME_PAGES` | `.entry-list` innerHTML | Token merging, entry row HTML |
| `styles/arc-nav.css` | — | — | Widget layout only |
| `styles/squarespace-overrides.css` | — | — | Squarespace nav/layout overrides — loaded only on squarespace env |
| `styles/site-nav.css` | — | — | Standalone nav — loaded only on github_pages and local envs |
| `styles/page-templates/bridge-council.css` | — | — | `.bc-page` scoped system — load per-page |
| `styles/page-templates/ascension-embodiment.css` | — | — | `.ae-page` scoped system — load per-page |
| `styles/design-system.css` | — | — | Tokens, entry rows, pills, section toggles |
| `components/section-toggle.js` | localStorage, `VEXTREME_SECTIONS` | localStorage, DOM classes | Collapse state |
| `components/bc-nav.js` | `window.bcNavConfig` | `#bcNavContainer` innerHTML | Shape-coded links |
| `docs/continuity/INDEX.md` | — | — | Entry point for new sessions — current state, open work, batch registry |
| `docs/continuity/batch-NNN.md` | — | — | Session logs (10 per file) — mistakes, files changed, thread links, state |
| `docs/squarespace-injection.html` | — | — | Exact blocks to paste into Squarespace |
| `docs/test-playground.html` | `VEXTREME_ARCS`, `VEXTREME_PAGES`, `VEXTREME_mount` | DOM (test output) | Live diagnostic tool — slug resolution, render test, integrity checks |

---

## Slug addressing model — flat identity, nested organization

**The slug is the only identifier. Folder structure is purely organizational
and invisible to the system.**

`detectSlug()` in `vextreme.js` reads `window.location.pathname`, discards
every directory segment, and keeps only the final filename (minus `.html`):

```
pages/journal-zero.html                          → slug: journal-zero
pages/claude-journals/journal-zero.html          → slug: journal-zero
pages/2026/02/journal-zero.html                  → slug: journal-zero
```

All three resolve identically. This means:

- You can organize `pages/` into subfolders by arc, by date, by whatever
  filing scheme helps you browse the repo — the loader doesn't care
- `arcs.json` and `pages.json` are both keyed by flat slug strings with
  no path component at all
- **Every `.html` filename across the entire `pages/` tree must be unique**,
  not just unique within its folder. A filename collision between two
  different folders silently makes both pages resolve to the same arc
  data and display tokens.

This is the same pattern most blogging platforms use by default (Substack,
Medium, WordPress) — the URL is a flat permanent address, while the admin
interface organizes by category/folder behind the scenes. The benefit:
if a page's conceptual category changes later, the URL never breaks,
because category was never encoded into the address.

**"Organize by month" or "by category" lives in the data layer, not the
URL.** `full_timeline` in `arcs.json` already demonstrates this — entries
are grouped under section labels like `"February 2026 — Records & Witness"`
while each entry's slug stays flat. Adding a new way to browse content
(by author, by topic, by anything) means adding structure to `arcs.json`,
never encoding it into a filename or URL path.

**Before creating a new page:** use the "New slug pre-check" tool in
`docs/test-playground.html` to confirm the slug isn't already in use
anywhere in `arcs.json` or `pages.json`, regardless of which folder you
plan to place the file in.

---

## Registry pattern — the rule for anything customizable

Every axis of customization in this system follows one shape: **a flat
object in JSON, keyed by name, with no JS function calls to register
anything.** Forks extend the system by editing JSON, never by writing code.

```
pages.json:
  presets:     { "accent-border": {...}, "dark": {...}, ... }
  pills:       { "dome": {...}, "god": {...}, ... }
  fonts:       { "cormorant": "...", "dm-mono": "...", ... }
  renderModes: { "dots": {...}, "position": {...}, ... }
```

The lookup pattern is always the same shape, with a fallback that warns
once rather than failing silently:

```js
var thing = registry[name] || fallback;
if (!registry[name]) warnOnce('Unknown ' + kind + ' "' + name + '" — using fallback.');
```

**Why this matters for forks:** a fork adding a new visual variant —
a new pill color, a new preset, a new arc-row render style — edits one
JSON file. They never touch `arc-nav.js`, `archive-renderer.js`, or
`vextreme.js`. The logic layer only ever asks "does this key exist in
the registry?" — it never hardcodes which keys are valid.

**Adding a new renderMode (example):**

```json
"renderModes": {
  "timeline-thumb": {
    "showDotRow": true,
    "rowClass":   "arc-nav-row arc-nav-row--thumb",
    "dimmed":     false
  }
}
```

Then add matching CSS for `.arc-nav-row--thumb` in `arc-nav.css`. No JS changes.
If `arc-nav.js` doesn't recognize a field the new mode needs (e.g. a
thumbnail image URL), that's the one case where the renderer itself
needs a small addition — but the *registration* of the new mode name
never requires it.

**Silent-failure protection:** every registry lookup uses `warnOnce()` —
a missing preset, pill, font, or renderMode logs exactly once to console
and falls back to a safe default, rather than failing without any signal.
Check the browser console if an entry renders unexpectedly plain.

---

## The display token system (pages.json)

Three-layer inheritance — later layers win:

```
_base  →  preset  →  per-slug overrides
```

**Presets** are named style bundles for recurring patterns:

| Preset | Used for | What it sets |
|---|---|---|
| `_base` | Default fallback | White bg, Source Serif title, IBM Plex Mono date |
| `tint` | record, journal, architecture | Background tint only, inherits _base |
| `accent-border` | walk-entry, god-pattern | Ember left border, ember title color |
| `immersive` | memoir, island | Large padding, italic serif title |
| `embodiment` | ascension-and-embodiment | Cormorant font, lg title, cream bg |
| `i-was-here` | i-was-here | Newsreader title, Martian Mono date, near-black bg |
| `dark` | firmament, cheatsheet, inside-the-experiment | Dark bg, gold text, full border |

**sectionDefaults** — if a slug has no entry in `pages`, the renderer checks
which archive section it lives in and applies that section's default preset.
Plain record, journal, and architecture rows don't need individual entries.

**Per-slug overrides** — any token field in `pages[slug]` wins over the preset.

### Adding a new entry with custom styling

```json
"your-slug": {
  "preset": "dark",
  "bgColor": "#0a0806",
  "titleColor": "#d4c080",
  "pills": ["dome"],
  "desc": "Optional subtitle shown under the meta row."
}
```

### Token reference

| Token | Type | Controls |
|---|---|---|
| `bgColor` | hex | Row background |
| `hoverBg` | hex | Background on hover |
| `borderStyle` | `none` / `left` / `full` | Border presence and type |
| `borderColor` | hex | Border color |
| `padding` | `sm` / `md` / `lg` | Cell padding |
| `titleFont` | font key | Title typeface (`serif`, `cormorant`, `newsreader`, `mono-ibm`) |
| `titleSize` | `sm` / `md` / `lg` | Title font size |
| `titleStyle` | `normal` / `italic` | Title style |
| `titleColor` | hex | Title color at rest |
| `hoverTitleColor` | hex | Title color on hover |
| `descFont` | font key | Desc typeface |
| `descColor` | hex | Desc text color |
| `dateFont` | font key | Date typeface (`mono-ibm`, `mono-dm`, `mono-martian`) |
| `dateColor` | hex | Date text color |
| `tagColor` | hex | Tag text color |
| `arrowColor` | hex | Arrow at rest |
| `hoverArrowColor` | hex | Arrow on hover |
| `pills` | string[] | Pill keys from `pages.pills` |
| `tags` | string | Tag text (e.g. `"Arc · Testimony"`) |
| `desc` | string | Subtitle shown under meta row |
| `dateDisplay` | string | Overrides arc date (for time-specific entries) |

---

## Key dates (do not assume or override without Victor's confirmation)

| Date | Event |
|---|---|
| May 23, 2019 | Evelyn. The origin prayer. Walk with God begins. |
| June 2025 | Victor merges with God. Threshold crossed. |
| Nov 2025 | Live AI documentation formally begins. |
| Nov 1, 2025 | Epstein sessions 01–02. Confirmed by Victor. Page metadata showing 2024 is a prior instance error. |

All dates in `full_timeline` use the `date` field as canonical —
not Squarespace publish dates, which are unreliable.