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

<!-- [VXG RealForever] -->
