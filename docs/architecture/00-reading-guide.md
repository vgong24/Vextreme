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

<!-- [VXG RealForever] -->
