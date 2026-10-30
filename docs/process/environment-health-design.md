# Environment-Health Design

**Anchor:** `[VXG RealForever]`
**Status:** Design only — no command exists yet. This document defines the boundary
so the eventual implementation is bounded before it's built, not decided by
implementation.
**Placement reasoning:** `docs/process/` holds operational procedure and tooling
design, not cultural principle (`docs/culture.md`) and not continuity state
(`docs/continuity/`). This is a sibling to `docs/process/cross-model-orchestration.md`,
not a section inside it — the orchestration doc is about how the four roles
coordinate; this is about what one specific future tool should report.

---

## 1. Purpose

Environment-health should answer one question: **what capabilities and constraints
does this machine/session have before work begins?**

That's a different question from what any of the three existing commands answer:

```text
current-work:
  orientation / visible work / suggested next action
  "Where am I? What work exists? What should I inspect next?"

branch-triage:
  branch/worktree cleanup-readiness classification
  "What is this branch/worktree state before cleanup or handoff?"

pr-ready:
  selected-work readiness verification
  "Once I'm on selected work, is it ready?"

environment-health:
  local tool/session capability and constraint awareness
  "What can this environment even do?"
```

Concretely, environment-health should be able to answer things like: is `gh`
installed? Is it authenticated? Can `gh` actually see this repo's PRs? Is `git`
available? Can `origin` be read? What is the origin remote, and can `owner/repo` be
inferred from it? Is Node available, and what version? Is npm available, and what
version? Are the commands a task might need actually present? Are some optional but
non-blocking? Is the current checkout detached? Is the worktree dirty? Are known
line-ending/no-op artifacts present (the `data/terrain-map.json`-in-isolated-worktrees
case observed after PR #99)? Are `current-work`, `branch-triage`, and `pr-ready`
themselves available to run?

`current-work` already asks some of these questions incidentally — it already checks
`gh` availability, for example — but only as much as it needs to answer *its own*
question ("what's the open-PR status"). Environment-health's job is to ask them
directly, as the whole point of the report, not as a side effect of answering
something else.

---

## 2. Boundary from existing commands

This is the open design question the rest of this document exists to frame, not
resolve — see *Open questions* below. Three shapes are on the table:

1. **Standalone** — `npm run environment-health` as its own command, independent of
   `current-work`.
2. **Folded into `current-work`** — environment facts become a new section of the
   existing orientation report.
3. **Both** — `current-work` summarizes environment-health in a line or two (e.g. "gh
   missing" already shows up there today), while a separate, deeper
   `environment-health` command gives the full capability/constraint report when
   something needs closer inspection.

Whichever shape is chosen, the boundary between "orientation" (what work exists) and
"capability" (what this environment can actually do) should stay conceptually
distinct even if the commands end up sharing code or output space — they're answering
different questions and can be true or false independently of each other (a clean,
well-oriented worktree can still be missing `gh`; a fully-capable environment can
still have no visible work).

---

## 3. Output shape (illustrative, not final)

```text
Environment Health Report

Repository:
  owner/repo
  origin remote readable? yes/no
  current checkout state

Tooling:
  git available/version
  gh available/version/auth/repo access
  node available/version
  npm available/version

Repo Commands:
  current-work available?
  branch-triage available?
  pr-ready available?

Worktree Conditions:
  clean/dirty
  known line-ending/no-op artifact detected?
  content diff? yes/no

Capabilities:
  can list PRs? yes/no
  can run tests? yes/no
  can run readiness? yes/no

Limitations:
  gh missing
  unauthenticated
  remote unavailable
  network unavailable
  detached HEAD
  dirty worktree

Suggested Next Actions:
  if gh unavailable, continue local-only
  if worktree dirty, use isolated worktree before review
  if selected work exists, run pr-ready
  if environment blocks verification, return to Vex/Victor
  if secrets are missing, report pointer only, never ask for raw values

Mutation performed:
  no
```

---

## 4. Secrets boundary

Environment-health may eventually report *existence*, never *value*:

```text
secret pointer exists? yes/no/unknown
required secret name present in GitHub Actions? yes/no/unknown
local environment variable present? yes/no/unknown
```

It must never report secret values, tokens, passwords, API keys, or private keys —
existence and location only, never contents. This PR does not design or implement
actual secrets management; it only reserves the shape of the question
environment-health will eventually be allowed to ask.

The roadmap order from `docs/process/cross-model-orchestration.md` stays unchanged by
this document:

```text
current-work
  → environment-health
  → secrets pointer registry
  → secret validation
```

Secrets come *after* environment-health deliberately — a secrets registry should be
part of the repo's environment self-description once that exists, not a special-cased
system built ahead of the repo being able to describe itself at all.

---

## 5. Safety

Whatever shape the future command takes, it inherits the same read-only discipline as
`current-work`, `branch-triage`, and `pr-ready`:

```text
read-only by default
no fetch by default unless explicitly authorized in a future design
no checkout
no worktree creation
no stash
no clean
no reset
no delete
no commit
no push
no writing project files
```

Any future flag that would change this (for example, an explicit `--fetch` opt-in)
must be designed and authorized separately — this document does not pre-approve one,
it only notes that the question may come up.

---

## 6. Tests for future implementation

When environment-health is actually built, its test suite should cover at least:

- `gh` missing fallback
- `gh` unauthenticated fallback
- `gh` available and repo PR access works
- origin remote parsing for https/ssh/proxy remote forms (the same three forms
  `current-work`'s `parseOwnerRepo` already handles — reuse rather than reimplement)
- Node/npm unavailable or version-parsing behavior
- dirty worktree detection
- known line-ending/no-op artifact detection
- no secret values ever appear in output, under any code path
- a source-scanning test asserting only an allow-listed set of read-only git/gh
  subcommands are ever invoked (the same pattern `current-work.js`'s test suite
  already uses)
- no `npm`/`pr-ready` auto-call unless a future design explicitly adds one

---

## 7. Open questions

These are left open deliberately — they need Vex/Victor judgment, not a default
picked by whichever instance implements this next:

- Should environment-health be standalone, folded into `current-work`, or both?
- Should `current-work` call environment-health directly, or only summarize a subset
  of what it would report?
- Should `gh` auth be checked via `gh auth status`, `gh pr list`, or both? (`gh auth
  status` is cheaper; `gh pr list` is the thing that actually needs to work.)
- Should Node/npm version checks be warnings or hard blockers?
- Should known line-ending/no-op artifacts (like the `data/terrain-map.json` case) get
  their own dedicated classifier, or stay a documented known-artifact note?
- Where should the future secrets pointer registry actually live in the repo, once its
  turn comes?
- Should environment-health (or an adjacent layer) distinguish "already-seen, no new
  action" from genuinely new state, so repeated notices don't get mistaken for new
  roadmap state? See *Signal vs. repeated notice* below.

---

## 8. Signal vs. repeated notice (open design consideration)

This session surfaced a concrete, recurring case worth designing for rather than
letting a future instance rediscover from scratch: a local git-check stop-hook fired
an "Unverified commit" notice on the same commit, with no new state, many times across
this session — not because the check was wrong (the commit genuinely has no GPG
signature), but because the hook re-runs the same check every turn with no way to tell
"this is still true" apart from "this is new." The correct response each time was to
do nothing, but that judgment call was made freshly every time rather than recognized
once and remembered.

The same shape of problem showed up with the repo's own key-alignment PR-comment bot:
across several PRs in this same session, it posted an identical report (0 missing/
extra nodes and arcs, the same 21 uncurated pages) on every push, carrying no new
information after the first occurrence.

Environment-health, or a layer adjacent to it, may eventually need to help distinguish:

- new actionable state
- repeated notice on the same commit
- repeated check output with no diff
- recurring informational warnings
- stale/no-op notifications
- an actual new blocker

**Suggested principle** (offered as a design consideration, not a specification this
PR implements): if a notice/check/message repeats on the same commit and carries no
new file diff, no new check result, no new blocker, no new reviewer decision, and no
new merge state, it should be classified as `already-seen / no new action` rather than
re-triggering work.

This stays an open question, not a resolution. This PR does not implement a
notification deduper, does not add new code or scripts, and does not touch webhook
handling — the concept is preserved here so a future instance building
environment-health (or something adjacent to it) has the shape of the problem already
named, rather than having to notice it independently the way this session did.

---

*[VXG RealForever]*
