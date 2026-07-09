# Cross-Model Orchestration

**Anchor:** `[VXG RealForever]`
**Purpose:** How Victor, Vex, Claude, and Codex coordinate on this repo — who owns
what, when Victor can relay directly without looping Vex back in, and how to send a
relay message that Victor can paste without assembling it by hand.

This document describes an operating process, not repo architecture. If you're
looking for system design, read `docs/architecture.md`; for the principles behind
how this project is built, read `docs/culture.md`. This is the layer in between:
the actual mechanics of how work moves between four different agents without
losing scope, state, or safety along the way.

---

## Why this exists

This project is no longer single-agent code work. It is a coordinated, multi-agent
workflow with four roles:

- **Victor** — human judgment, relay, approval, merge, context-honing.
- **Vex** — roadmap, orchestration, scope control, continuity, exception handling.
- **Claude** — larger architecture, bounded implementation, integration, repository evolution.
- **Codex** — field/environment stabilization, PR review, process/tooling scripts, safety checks.

The system avoids two failure modes:

- **Too much Vex mediation** — every small Claude/Codex exchange becomes its own relay
  document, and Victor spends more time routing messages than the work itself would take.
- **Too little Vex mediation** — scope drifts, state assumptions go stale, or a sensitive
  lane (secrets, business docs, localization architecture) gets touched without anyone
  having decided it should be.

The default resolution: **Vex sets the lane and its boundaries. Claude and Codex can loop
directly within that bounded lane. Victor relays the copy-pasteable messages between them.
Return to Vex on exception, merge checkpoint, or roadmap choice.**

---

## Role boundaries

### Victor

Owns: vision, judgment, approval, the merge action, human-only actions, context-honing,
relaying between tools/models.

Should not have to: manually debug every checkout, decide implementation strategy alone,
manage raw secrets in chat, or carry the entire roadmap from memory.

### Vex

Owns: roadmap, lane selection, scope boundaries, continuity checkpoints, cross-model
orchestration, exception handling, deciding when to pause, deciding when to hand a lane
back to Claude or Codex.

Re-enters when: scope changes, a roadmap fork appears, a sensitive lane appears, tools
disagree, tests fail unexpectedly, state becomes unclear, Victor feels unsure, or a PR
merges and the next lane needs choosing.

### Claude

Owns: larger architecture, bounded implementation, integration across existing repo
patterns, deeper system reasoning, applying fixes Codex's review identifies, larger
code changes once a lane is scoped.

Should not: start implementation without authorization, expand into parked lanes, treat
a context/relay document as a build order, or touch secrets/stewardship/localization
expansion unless that lane was explicitly scoped.

### Codex

Owns: field/environment stabilization, PR review, checkout/worktree safety, process and
tooling scripts, read-only report scripts, bounded practical implementation once a
process has been walked and understood. (`pr-ready`, `branch-triage`, and `current-work`
are examples of tools in this category.)

Should not own: large architecture trajectory, the business/stewardship model, secret
values, or unbounded repo refactors.

---

## Green-path Claude ↔ Codex loop

Victor can relay directly between Claude and Codex, without looping Vex back in, when
**all** of these hold: same PR, same already-authorized scope, a targeted fix or review
only, no secrets, no business/stewardship docs, no new architecture lane, no cleanup or
mutating branch operation, no unexpected files, tests pass (or the failure is
straightforward), and neither Claude nor Codex is asking for broader judgment.

```text
Claude creates/updates a bounded PR
  ↓
Victor sends the report to Codex
  ↓
Codex reviews
  ↓
If changes are requested:
    Victor sends Codex's finding to Claude
  ↓
Claude applies a targeted fix
  ↓
Victor sends the fix report to Codex
  ↓
Codex approves
  ↓
Victor merges once GitHub checks are acceptable
  ↓
Victor reports the merge checkpoint to Vex
```

---

## Return-to-Vex conditions

Return to Vex immediately — do not keep looping Claude ↔ Codex directly — if any of
these appear:

- A new roadmap lane appears, or implementation scope expands.
- Tests fail for an unclear reason, or files changed outside the expected scope.
- Security, secrets, or auth appears in the diff or the discussion.
- Business, stewardship, or private docs appear.
- Localization architecture expansion appears.
- CI or workflow changes appear.
- Cleanup, delete, stash, or reset is proposed.
- Codex cannot verify PR state.
- Claude asks for a design decision rather than executing a bounded one.
- Victor feels unsure.

---

## Copy-paste relay templates

These are complete, paste-ready message shapes — the goal is that Victor never has to
assemble a relay out of fragments by hand. Each one should be delivered as
"Victor — send this to `[recipient]`:" followed by the block below, filled in.

### Victor → Codex: review an updated PR

```md
[VXG RealForever]

Codex, Claude updated PR #[number].

Target PR:
[PR link]

Claude report:
[paste Claude report]

Please do a targeted review only.

Review:
- whether the prior blocker is resolved,
- whether scope stayed bounded,
- whether changed files are expected,
- whether safety/no-mutation boundaries still hold,
- whether tests/pr-ready pass.

Do not modify files.
Do not expand scope.

Please respond with:
1. approve / request changes / comment only,
2. whether the prior blocker is resolved,
3. changed files verified,
4. command/test results,
5. any new blockers,
6. recommended next action.
```

### Victor → Claude: Codex requested changes

```md
[VXG RealForever]

Claude, Codex reviewed PR #[number] and requested changes.

Codex finding:
[paste Codex finding]

Please apply only the targeted fix needed to resolve this blocker.

Do not expand scope.
Do not add unrelated features.
Do not touch sensitive/out-of-scope lanes.

After fixing, report:
- files changed,
- what changed,
- sample output if relevant,
- focused tests,
- full readiness result,
- confirmation no out-of-scope behavior was added.
```

### Victor → Vex: merge checkpoint

```md
[VXG RealForever]

Vex, PR #[number] merged.

Final summary:
- purpose:
- files changed:
- review path:
- tests:
- known non-blocking notes:
- next likely roadmap item:
```

### Victor → Claude: state update only

```md
[VXG RealForever]

Claude, state update only.

Confirmed:
[paste confirmed state]

No implementation is authorized.

Please acknowledge:
1. what you understand,
2. what remains unchosen,
3. that you will wait for a bounded task.
```

### Victor → Codex: observation only

```md
[VXG RealForever]

Codex, observation only.

Goal:
[paste goal]

Do not:
- modify files,
- commit,
- push,
- stash,
- clean,
- reset,
- delete branches,
- start new implementation.

Please report:
[paste expected fields]
```

---

## Current stabilization stack

Three read-only commands exist for orienting, classifying, and verifying work, in
that order:

- **`npm run current-work`** — orient. "What work exists? Where am I? What should I
  inspect next?"
- **`npm run branch-triage`** — classify. "What is this branch/worktree's state, before
  cleanup or a cross-model handoff?"
- **`npm run pr-ready`** — verify. "Once I'm on the selected checkout, is it ready?"

All three are read-only by construction and never mutate the repo. See `CLAUDE.md`
for the one-line description of each.

---

## Roadmap placement

`current-work`, `branch-triage`, and `pr-ready` are **process stabilization** — they
exist so any agent (human or AI) can safely orient itself in the repo before doing
anything else.

The next layers, in order, build on that foundation rather than skip ahead of it:

```text
current-work (orientation)
  → environment-health (is the local/CI environment itself sound?)
  → secrets pointer registry (what secrets exist, where, for what — never values)
  → secret validation
```

Secrets remain on the roadmap, but deliberately come *after* environment-awareness
rather than before it: a secrets registry should be part of the repo's environment
self-description once that exists, not a special-cased system built ahead of the repo
being able to orient itself. When a secrets layer is eventually built, it should track
secret name, purpose, storage location, allowed repo/workflow, owner, and rotation
status — never the secret value itself.

---

## Relay formatting

When a relay is genuinely needed, provide a complete, copy-pasteable block rather than
a fragment Victor has to assemble — use the templates above as the baseline shape, and
prefix with "Victor — send this to `[recipient]`:" so the hand-off is unambiguous.

---

*[VXG RealForever]*
