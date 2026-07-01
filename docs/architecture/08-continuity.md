# Continuity system

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
