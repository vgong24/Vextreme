# Continuity system

## What is a session

A **session** is the scope of one working thread — everything from when a Claude
instance picks up the work to when it reaches a completion state worth documenting.
"Worth documenting" is a threshold, not a fixed unit: a session can be one focused
change or several related ones, but it ends at a point where the state of the system
has moved and a future instance would need to know what happened to pick up cleanly.

At that threshold, the instance re-reads its own thread — not just the final diff,
but the reasoning that produced it — and writes the summary itself, while that
reasoning is still live in context. This is why session entries in the continuity
log read as reasoning chains (what was tried, what was rejected, what's still assumed)
rather than commit-log summaries: the commit log already has the diff. The session
entry is the thing the diff can't tell you.

A session is not bounded by wall-clock time or by a single PR. Two rounds of work on
the same day, continuing the same thread, are recorded in one session's file with
"Session continued" blocks — the split that matters is the reasoning arc, not the
calendar. But a different day or a different instance is a new session, and (from
Batch 003 on) a new file: sessions live one-per-file in the active batch directory,
named `YYYY-MM-DD-session-0NN.md`, so logging a session is a file creation that
cannot disturb a closed record (see `docs/continuity/batch-003/README.md` for why
this form replaced the monolithic batch file).

---

Three layers, three time horizons:

| Layer | File | Purpose | Written by |
|---|---|---|---|
| Current snapshot | `docs/continuity/INDEX.md` | Where is the system right now | Claude at session end |
| Session narrative | `docs/continuity/batch-00N/YYYY-MM-DD-session-0NN.md` (batches 001–002: legacy `Batch 00N.md` single files) | Mistakes, reasoning, assumptions | Claude on Victor's signal |
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
lookup, not pre-loading. A cold-start instance reads INDEX.md → newest session file
in the active batch directory → architecture.md. Lessons are consulted when a pattern recurs or when
building something adjacent to a known lesson domain. Keeping them out of the
mandatory reading sequence is intentional.

Not cold-start reading is different from undiscoverable, though — until Session 022
the only ways to find a lesson were `git log --grep`, grepping the directory, or the
partially-updated hand-authored specimen cards in `pages/specimen-architectural-wisdoms.html`
(it stopped tracking new lessons after Session 011). `lib/build-lessons.js` now compiles
every `config/lessons/*.json` file into `data/lessons.json`, which `pages/ecosystem-hub.html`
fetches and renders as a "Lessons Learned" section — so the one dashboard meant to answer
"what does this system currently know" actually surfaces the lesson archive, without making
it mandatory pre-reading.

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
