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

<!-- [VXG RealForever] -->
