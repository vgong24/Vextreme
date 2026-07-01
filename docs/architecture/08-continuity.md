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

<!-- [VXG RealForever] -->
