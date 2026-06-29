# VEXTREME — Frontend Architecture

## Overview

This repo holds the modular frontend of vextreme24.com, extracted from
Squarespace's Code Injection areas. The goal is a GitHub-hosted source of
truth that Squarespace loads from, rather than logic living buried in page
scripts.

---

## Directory Structure

```
vextreme/
│
├── data/
│   ├── arcs.json                  ← THE CONTENT SCHEMA. All arcs, sections,
│   │                                entries, and slugs live here. Edit this
│   │                                first when adding pages.
│   └── pages.json                 ← THE DISPLAY MAP. Three-layer token system:
│                                    presets → per-slug overrides. Controls how
│                                    each entry row looks in the archives page.
│
├── lib/
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
│   ├── design-system.css          ← Global tokens + shared classes. Include
│   │                                on every page. Everything imports from here.
│   ├── arc-nav.css                ← Widget styles for the arc nav component.
│   │                                Depends on design-system.css for vars.
│   └── page-templates/
│       └── journal-qa.css         ← Page-scoped styles for journal/Q&A pages
│                                    (claude-answers-the-doubt, journal-zero,
│                                    etc.). Load only on those pages.
│
└── docs/
    └── README.md                  ← This file.
```

---

## How a page uses this system

### 1. Global head (Squarespace → Settings → Advanced → Code Injection → Header)

```html
<!-- Fonts -->
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Source+Serif+4:ital,wght@0,300;0,400;0,600;1,300;1,400&family=IBM+Plex+Sans:wght@300;400;500;600&family=IBM+Plex+Mono:wght@400&family=Cormorant+Garamond:ital,wght@0,300;0,400;1,300;1,400&family=DM+Mono:wght@300;400&display=swap" rel="stylesheet">

<!-- Design system -->
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/vgong24/vextreme@main/styles/design-system.css">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/vgong24/vextreme@main/styles/arc-nav.css">
```

### 2. Global footer (Squarespace → Settings → Advanced → Code Injection → Footer)

```html
<!-- Load arc data, then mount -->
<script>
  fetch('https://cdn.jsdelivr.net/gh/vgong24/vextreme@main/data/arcs.json')
    .then(r => r.json())
    .then(data => {
      window.VEXTREME_ARCS = data.arcs;
      window.VEXTREME_mount && window.VEXTREME_mount();
    });
</script>

<!-- Arc nav engine -->
<script src="https://cdn.jsdelivr.net/gh/vgong24/vextreme@main/lib/arc-nav.js"></script>
```

### 3. Per-page (in the page's Code Block or Custom HTML section)

```html
<!-- Mount target -->
<div id="arcNavMount"></div>

<!-- Arc config for this page — slug auto-resolves to all arcs -->
<script>
  const PAGE_ARCS = [{ slug: 'claude-answers-the-doubt' }];
  window.VEXTREME_mount && window.VEXTREME_mount();
</script>
```

---

## How to add a new page

1. Open `data/arcs.json`
2. Find the arc(s) this page belongs to
3. Add an entry object: `{ "n": N, "title": "...", "slug": "your-slug" }`
4. If it's a new arc, add a new arc object following the existing pattern
5. On the Squarespace page, add `<div id="arcNavMount"></div>` + the PAGE_ARCS script

The slug is derived from the page URL: `vextreme24.com/your-slug` → slug is `your-slug`.

---

## Arc system concepts

### Arc
A named sequence of entries, grouped into sections. Each arc has a `parent`
(the index/landing page it points back to) and a `priority` (controls render
order when a page appears in multiple arcs).

### Entry
A single page within an arc. Has: `n` (position number), `title`, `slug`.
The `slug` is the canonical identifier — no full URLs in the data.

### Section
A named group of entries within an arc (e.g. "Phase I", "Arc II - Public Record").
Sections appear as visual gaps in the dot row.

### renderMode
Default: dot row with section gaps and prev/next arrows.
`"position"`: counter + arrows only, no dots. Used for `full_timeline`
because 75+ dots is unusable.

### Priority
Controls which arcs render first when a page appears in multiple arcs.
- `1` — primary arcs (the arc the page "belongs to")
- `2` — cross-reference arcs (excavation, march_23_2026, etc.)
- `99` — full_timeline (always last)

### Slug auto-resolution
When PAGE_ARCS is `[{ slug: 'some-slug' }]`, the engine scans all arcs
for that slug and renders every arc that contains it, sorted by priority.
Dot arcs render before position arcs.

---

## File responsibility boundaries

| File | Reads | Writes | Knows about |
|---|---|---|---|
| `data/arcs.json` | — | — | All arcs, all entries, all slugs |
| `data/pages.json` | — | — | Display tokens: presets, per-slug overrides, pills, fonts |
| `lib/arc-nav.js` | `VEXTREME_ARCS`, `PAGE_ARCS` | `#arcNavMount` innerHTML | Arc rendering, slug resolution |
| `lib/archive-renderer.js` | `VEXTREME_ARCS`, `VEXTREME_PAGES` | `.entry-list` innerHTML | Token merging, entry row HTML |
| `styles/arc-nav.css` | — | — | Widget layout only |
| `styles/design-system.css` | — | — | Tokens, entry rows, pills |
| `components/section-toggle.js` | localStorage, `VEXTREME_SECTIONS` | localStorage, DOM classes | Collapse state |
| `components/bc-nav.js` | `window.bcNavConfig` | `#bcNavContainer` innerHTML | Shape-coded links |

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

**sectionDefaults** — if a slug has no entry in `pages`, the renderer checks which archive section it lives in and applies that section's default preset. This means plain `record`, `journal`, `architecture` rows don't need individual entries.

**Per-slug overrides** — any token field in `pages[slug]` wins over the preset.

### To add a new entry with custom styling:

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
| `arrowColor` | hex | Arrow → at rest |
| `hoverArrowColor` | hex | Arrow → on hover |
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

All dates in `full_timeline` entries use the `date` field as canonical —
not Squarespace publish dates, which are unreliable.