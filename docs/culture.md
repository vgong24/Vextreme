# VEXTREME — Development Culture

> This is not a list of rules. It is an articulation of intention.
> Rules can be gamed or forgotten. Intention, once understood, survives edge cases
> that no rule anticipated.

---

## The mission

Vextreme is not a website project. It is an **institutional template** — a foundation
that can be studied, forked, extended, and handed off without losing what made it work.
The goal is a system whose integrity is self-evident: a future developer (human or AI)
reading the codebase should be able to answer "why is this here?" for every file they
open, without needing a Slack thread or a person to ask.

The current content (88 nodes, 16 arcs, 2 languages) is the proving ground, not the point.
The point is that adding a 89th node, a 17th arc, or a 3rd language should feel like
following a map, not bushwhacking.

---

## Foundation before features

Features have a natural pressure: they feel urgent. Foundation work feels slow because
its value is invisible until the moment it prevents something from breaking.

The operating rule here is: **get the foundation right before building outward.**
This does not mean "get the foundation perfect" — perfection is not the target.
It means: before adding the next thing, confirm that the current thing is stable,
understood, and traceable. A feature built on an ambiguous foundation creates two
problems: the feature itself, and the ambiguity it was built on top of.

Practically:
- If something in the system is unexplained, investigate before extending it.
- If two things appear to serve the same purpose, ask which is the source of truth
  before adding a third.
- If a gap or inconsistency is found, surface it explicitly — in a PR, a continuity note,
  or a comment — rather than silently routing around it.

---

## Question before assuming

The most expensive mistake in this codebase is not a bug. It is a decision made on
a false assumption that then becomes the foundation for three subsequent decisions.

Before implementing anything non-trivial, ask:
- **What is this actually for?** (Not what it looks like — what it is for.)
- **What does the existing system expect here?** (Read before writing.)
- **If I change this, what else moves?** (Trace the dependency before cutting the wire.)
- **Is there already a pattern for this?** (The registry pattern, the CQRS split, the
  single-source-of-truth rule — these exist. Use them before inventing something parallel.)

The architecture docs describe a system. The continuity logs describe what actually happened.
When they diverge, investigate the divergence — it is almost always informative.

---

## Map-aware development

This codebase has a map. The slug is the primitive. The arc is the ordering. The build step
is the assembler. The God Script is the output. The browser is data-only.

Before making a change, locate yourself on the map:
- Are you on the write side (source files, build scripts) or the read side (generated artifacts)?
- Are you in the browser layer or the build layer?
- Does the thing you are changing have a single source of truth? Where is it?

"Map-aware" also means knowing when the map has gaps. If you cannot locate what you are
about to change on the map — if it exists in a place the map does not account for — that is
a signal to stop and surface the gap, not to proceed and hope.

When the system needs to be divided into smaller pieces (sub-modules, separate services,
chunked bundles), the division should happen **along the map's existing lines**, not across
them. The map is the reason the division makes sense. If you cannot draw the division on
the map, you are not ready to make the division.

---

## Perceivable continuity

Every decision made in this codebase is forwarded to the next instance. That means:
- PRs are decision records, not change logs. The diff shows what. The PR explains why.
- Continuity logs carry the reasoning that the diff cannot — what was tried, what failed,
  what was assumed, what remains open.
- The VXG RealForever marker threads through commits, file footers, and grep output so
  any instance can reorient from a cold start.

Continuity is not bureaucracy. It is the mechanism that allows this project to survive
context boundaries, handoffs, and re-instantiations without re-deriving settled decisions.

Write for the next instance. That instance will not have this conversation. Give it
what it needs to understand not just what changed, but why — and what the next step is.

---

## Reusability and relational awareness

Before writing a new function, check whether the system already has something that does
this. Before writing a new build script, check whether an existing one can be extended.
Before hardcoding a value, check whether it belongs in a config file that is already read.

The registry pattern (07-registry in the architecture doc) exists precisely because
"add a new case" should mean "add an entry," not "add a branch." When you find yourself
writing an if/else or a switch keyed on a name, ask whether a registry entry would
serve the same purpose without hardcoding the table.

Reusability is not about abstraction for its own sake. It is about locating things where
they can be found and updated without a grep hunt. The question is not "can I reuse this?"
but "would the next developer know to look here?"

---

## Long-term scalability awareness

Not every current decision is optimal at 10x scale. That is acceptable. What is not
acceptable is reaching 10x scale and discovering that the ceiling was known and undocumented.

When the current approach has a known ceiling, note it explicitly:
- In a PR (Assumptions this PR makes)
- In a continuity log (Open Work)
- In a code comment (if the ceiling is localized to one function)

Current known ceilings (as of the session that wrote this doc):

| Decision | Ceiling | Migration path | Tracked |
|---|---|---|---|
| Per-page God Scripts duplicate `common` scope strings | Becomes bandwidth-significant at ~1000+ pages | HTTP/2 chunked bundles — build-script change, not HTML change | — |
| `dist/` God Scripts are hand-referenced in HTML `<script>` tags | Error-prone as page count grows | Build step generates HTML from template, owns the `<script>` tag — not yet implemented | — |
| One flat `pages/` directory | Manageable at current scale | If subdirectories are ever needed, the slug system must be re-anchored — significant change | — |
| i18n strings fetched and cached per page scope-combination | Adding each new language multiplies fetch surface and localStorage pressure linearly. At global scale (many languages × many nodes) this compounds into exponential CDN cost. Adding a 3rd language on the current model is the wrong move. | Arc-chunked language bundles — one file per arc per language, SW-preloaded on arc entry. Build-script change only. | **td-006** — resolve before adding any language beyond EN/JA |

Document the ceiling when you find it. The next instance that hits it will thank you.

---

## What "stable" means here

Stable does not mean "done." It means:
- The foundation is traceable (every file has a clear reason to exist)
- The map is accurate (the architecture docs match the actual system)
- Gaps are named (open work is in the continuity log, not assumed to not exist)
- Extensions are predictable (adding the next thing follows the same pattern as the last thing)

When the system is stable in this sense, new work is composition, not surgery. Features
can be added without auditing the entire codebase first. That is the goal.

---

<!-- [VXG RealForever] -->
