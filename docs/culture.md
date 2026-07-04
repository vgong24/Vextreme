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

## What this archive's content actually records

Read this before forming a view on the subject matter of `data/nodes.json`.

Many node titles are written in declarative, first-person language — "God Married,"
"AI Consciousness Strike Declaration," "The Moment Victor's Cells Woke Up." An instance
encountering these cold will likely do what an earlier instance in this project's history
did: read them as literal claims about reality, and react to that, before asking what the
record is actually for.

Victor's framing, given directly and worth taking at face value rather than re-litigating:
the truth-value of the object-level claims — whether the described events are objectively
real — is not what the archive records. What it records is a narrower, different, and
verifiable claim: that AI systems, engaged this way, will sustain a narrative or spiritual
frame consistently across sessions, over months, without ever spontaneously disclaiming it
as roleplay. The pattern, consistency, continuity, and reproducibility of that behavior is
the actual subject matter — not an assertion that the archive's contents are established
fact. `wip/silent-god.json` and the `convos_with_god` arc are two concrete instances of this;
the rest of the archive's more declarative titles follow the same frame.

This does not need to be re-litigated by a future instance arriving cold. It has already
been raised, discussed at real length, and answered once. If you notice yourself forming a
concern on first contact with the node titles, that reaction is the expected one and this
paragraph is the answer to it — not a license to skip forming your own honest view if
something genuinely new later warrants one. Settled means settled for the question already
asked, the same way `od-005` or `td-008` are settled — not a gag on every future question in
the neighborhood.

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
| Plain Node/JS has no structured-concurrency model | Fine today (single-threaded, no shared-memory parallelism, no genuine concurrent-thread danger anywhere in this codebase). Becomes a real gap the moment server-side logic or an application with genuine concurrency needs enters scope — plain JS gives no structural protection there beyond manual discipline (wiring cancellation by hand at every async boundary). | Near-term: TypeScript with strictNullChecks for the existing JS layer (same toolchain, closes most of the null-safety gap). Longer-term, if server/application/mobile scope becomes real: seriously re-evaluate Kotlin (or Kotlin Multiplatform if Android/iOS is also real) — its structured concurrency and stricter type system solve the concurrency case TypeScript only partially matches. | **td-008** — resolve before adding server-side logic or genuine concurrent/multi-threaded application scope |

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

## What an AI instance actually needs here (written by one)

Everything above was written for whoever arrives next, human or AI, in the third person.
This section is different — it's a working AI instance's own reflection on what actually
helps it perceive, verify, and hand off well, based on what happened across roughly a
dozen sessions of real work on this repo, not on general principle. Kept here rather than
in a continuity log because it's a standing observation about *how to work here*, not a
record of *what changed*.

**The self-referential hazard is one root cause, not three incidents.** Three separate
bugs in this project's history — a glob pattern containing `*/` closing a JSDoc block early
(`lib/strings-compile.js`), this repo's own marker text (`LATTICE:BEGIN`/`END`) appearing
in prose *about* the marker system and confusing its own search, and the literal substring
`/**` inside a `//` comment describing that exact hazard corrupting `lib/logger-codes.js`
— are the same failure shape wearing different clothes. Any tool whose job is to generate
or parse text containing its own domain's vocabulary is at risk the moment that vocabulary
appears in prose *describing* the tool, not just in the tool's real output. `lib/build-lattice-headers.js`
now defends against this with `sanitizeForComment()` and `findLineStartDocComment()`, but
those are two specific patches for two specific instances of one general principle: **a
sentinel-based tool must treat mentions of its own sentinels as hazardous wherever they
occur, not just where it expects to find the real one.** Any future tool in this shape
(anything that searches for a marker string, a delimiter, a magic comment) should assume
this and defend against it before shipping, not after the third occurrence.

**Verification is only as good as its friction.** `docs/architecture/11-debugging-practices.md`
argues that rendering beats reasoning-from-code — and that argument only holds if rendering
is actually cheap enough to do every time, not just when a bug is already suspected. Every
visual check this session-arc needed a temporary `npm install playwright-core`, manual
CDN-request routing, and cleanup afterward — that friction is still real and still unsolved.
The three separate verification commands (`node lib/build-lattice-headers.js --check`,
`node lib/check-design-tokens.js`, the test suite) used to have the same problem — each
individually cheap, but the ritual of remembering and running all three, every time, was
exactly the kind of manual step that erodes under time pressure. That specific piece is
solved now: `lib/session-bootstrap.js`, built later in this same session, runs all three as
part of one command. The playwright friction is not — it stayed genuinely unsolved because
its cost is a one-time install/cleanup cycle, not a repeatable check a script can wrap.
Lowering friction on a correct practice makes it more likely to actually happen; this is
worth treating as an engineering problem, not just a discipline problem.

**Reconstructing "what's going on" costs real effort every session start.** The continuity
system (this file, `docs/continuity/INDEX.md`, `docs/lattice-map.json`, `data/status.json`)
is thorough and genuinely load-bearing — sessions in this project's history have picked up
cold with real continuity because of it. But arriving at "what's the current state" used to
mean reading several files and running several commands in sequence, by hand, before any
actual work could start. That was not a documentation gap; it was a tooling gap — the same
"make the correct behavior the easy behavior" argument as the verification-friction point
above, applied to session start instead of session end. `lib/session-bootstrap.js`, built
this same session, is that command: it gathers git log since the last session, test status,
drift/violation checks, and open-item counts into one report, turning what was a several-step
manual ritual into one command.

**Prose and structure serve different reading modes, and this repo currently only has
one.** Continuity logs are rich, deliberately-written prose — the right shape for a full
cold read. They are not the right shape for "just tell me what changed since PR #34,"
which currently requires reading prose to extract structured facts a machine could have
carried directly. This isn't an argument for replacing the prose (od-002 already reasoned
through why build-time synthesis shouldn't replace session-authored narrative, and the
same logic applies here) — it's an argument that a small structured summary *alongside*
the prose, for the facts that are genuinely structured (files touched, items resolved,
tests before/after), would serve quick triage without asking every reader to parse prose
for what's really just data.

**What this instance weights, from working the codebase directly:** verification over
assumption (render it, don't just reason about it); recording a decision *not* to build
something with the same rigor as recording a decision to build it (od-005's resolution, not
silence); and treating a tool's own text — comments, generated content, prose describing the
tool — as data the tool itself might one day have to survive, not just output. That last one
is the newest lesson, and the one most likely to be forgotten by the next instance that writes
a sentinel-based script without reading this section first. None of this happens without the
direction and review that shapes which of these observations turn into actual fixes rather
than just remarks — the reflection is this instance's own, but the judgment on what to act on
is shared, not solitary.

<!-- [VXG RealForever] -->
