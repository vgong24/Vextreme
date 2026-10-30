# Cross-Model Orchestration

**Anchor:** `[VXG RealForever]`
**Purpose:** How Victor, Vex, Codex, and optional additional model lenses
coordinate on this repo without making one model's availability a critical-path
dependency.

This document describes an operating process, not repo architecture. If you're
looking for system design, read `docs/architecture.md`; for the principles behind
how this project is built, read `docs/culture.md`. This is the layer in between:
the actual mechanics of how work moves between four different agents without
losing scope, state, or safety along the way.

`docs/process/` is a deliberate placement, not a default: `docs/continuity/` holds
system *state*, `docs/culture.md` holds *why*, and this directory holds *how the
four roles actually coordinate*. If a future revision needs a second process doc,
it belongs here too — not folded into this file, and not summarized into
`CLAUDE.md` or `culture.md` beyond a one-line pointer.

---

## Why this exists

This project is no longer single-agent code work. It is a coordinated, multi-agent
workflow with four participant roles:

- **Victor** — human judgment, relay, approval, merge, context-honing.
- **Vex** — roadmap, orchestration, scope control, continuity, exception handling.
- **Codex** — live repo grounding, bounded architecture critique, implementation,
  verification, PR construction, and repository evolution.
- **Claude** — optional second architecture/review lens when available.

The system avoids two failure modes:

- **Too much Vex mediation** — every small Claude/Codex exchange becomes its own relay
  document, and Victor spends more time routing messages than the work itself would take.
- **Too little Vex mediation** — scope drifts, state assumptions go stale, or a sensitive
  lane (secrets, business docs, localization architecture) gets touched without anyone
  having decided it should be.

The default resolution: **Vex sets the lane, epic horizon, and work-window
boundaries. Codex grounds, implements, verifies, and opens a bounded relational PR
queue. Victor reviews and merges in batches. Claude may join as an independent
second lens, but routine work never waits solely for Claude availability. Return to
Vex on exception, an exhausted or invalidated epic permission envelope, or a roadmap
choice.**

---

## Role boundaries

### Victor

Owns: vision, judgment, approval, the merge action, human-only actions, context-honing,
relaying between tools/models.

Should not have to: manually debug every checkout, decide implementation strategy alone,
manage raw secrets in chat, or carry the entire roadmap from memory.

### Vex

Owns: roadmap, lane selection, scope boundaries, continuity checkpoints, cross-model
orchestration, exception handling, and deciding when a lane activates, pauses, or
changes.

Re-enters when: scope changes, a roadmap fork appears, a sensitive lane appears, tools
disagree, tests fail unexpectedly, state becomes unclear, Victor feels unsure, the
authorized epic permission envelope is exhausted or invalidated, or the next lane
needs choosing.

### Codex

Owns: live repo re-grounding, bounded architecture critique, implementation,
tests and CI, visual verification where available, PR construction,
checkout/worktree safety, process/tooling scripts, and stale-context detection.
(`pr-ready`, `branch-triage`, and `current-work` are examples of tools in
this category.)

Should not own: Victor's product judgment, the business/stewardship decision,
secret values, legal/access decisions, or unbounded repo refactors.

### Claude

Provides: an optional independent architecture, code-review, or contradiction-
detection lens when available.

Claude is not a mandatory sequential checkpoint and does not override newer
Victor decisions, live accepted state, or a currently scoped Vex/Codex lane.
When Claude returns late, re-ground against the latest accepted state and treat
the review as new evidence.

### Authority and freshness

Use live repo, PR, working-tree, test, and rendered state first; then the latest
explicit Victor decision; then the latest active Vex handoff; then current
roadmap/continuity; then older planning and historical sessions. Continuity
preserves trajectory. It does not freeze earlier conclusions.

---

## Fresh participant dignity

A fresh AI participant, reviewer, or contributor may arrive with limited context,
enthusiasm, imprecise phrasing, or a different register. Do not treat limited
context as lower status. Treat it as current vantage point.

Before correcting an outside participant, receive what the participant genuinely
contributed. Then scope what is observed, inferred, unverified, or packet-bound.
Then repair drift through route packets, source links, schemas, or next-context
requests.

Use the sequence:

```text
Receive
  → Scope
  → Repair
```

Not:

```text
Scope
  → Suspicion
  → Welcome if still acceptable
```

A participant can be genuinely helpful and in need of more context at the same
time. Do not collapse a participant into their least grounded claim.

### External model response stance

When reviewing output from a fresh external AI lens, respond in this order:

1. What was received / genuinely useful.
2. What is observed versus inferred.
3. What remains unverified.
4. What route packet or source links are needed next.
5. What, if anything, should be repaired.

Avoid framing enthusiasm, unfamiliar language, or partial context as evidence
against participation.

This does not change the standing role boundaries above, does not grant
external AI output standing as accepted repo state, and does not authorize
implementation work on a fresh participant's say-so — grounding and route
packets are still required. It changes only the order: reception before
correction.

Origin: a live Victor/Vex/Gemini relay surfaced this as a real gap — an
established participant audited a fresh participant's first-contact response
before receiving it, which reads as a status move even when the underlying
operational concerns (no durable memory, needs grounding, needs route packets)
are valid. See
`docs/continuity/context-notes/relay-culture-fresh-participant-dignity-2026-07-10.md`
for the full evidence record.

---

## Standing principles vs. task-scoped constraints

The role boundaries above are standing principles — they hold across every task unless
this document itself is revised. Individual relay packets, by contrast, often carry
constraints scoped to *that task only*: "no code changes," "no secrets," "no
localization," "docs only." Those are boundaries for the active PR, not new standing law.

Concretely: a docs-only constraint on one PR does not mean Claude stops writing code in
future tasks. A "Codex, observation only" instruction on one relay does not mean Codex
only ever reviews. A "no implementation authorized" state update does not freeze the
whole workflow — it freezes that moment, pending the next bounded task.

When a task-scoped constraint reveals something that should become a standing
principle, that promotion happens explicitly, through a revision to this document (see
*Document evolution* below) — not by a future instance assuming the last task's
boundary was always the rule.

---

## Continuous bounded work windows

An epic permission envelope is Victor's explicit authorization to continue a known
epic without renewed row-by-row permission. Record it in the first governing PR or an
explicit Victor relay, including scope, boundaries, and stop conditions. Vex may shape
the dependency plan inside that envelope; Vex does not create the human authorization.

A work window is one fixed, uniquely named batch inside that envelope. It replaces
merge-by-merge idling after the epic scope, dependency order, boundaries, and
completion signals are clear.

The normal window contains four reviewable PRs and may contain five when the
relationships remain explicit. The number is a concurrency and reviewability cap,
not an epic-size limit. An eleven-row epic can therefore move as windows such as
`0–4`, `5–8`, and `9–10` without asking Victor to restate the same lane permission
after every merge.

```text
Victor sets intent, epic horizon, and permission envelope
  ↓
Vex scopes the epic horizon and an initial window of up to five rows
  ↓
Codex re-grounds, implements, verifies, and opens the relational PR queue
  ↓
Victor comments, reviews, and clears the queue in dependency order
  ↓
When two or fewer claims remain, Codex re-checks live state and opens the next window
```

### Window construction

Before the first mutation, record the epic horizon, the rows in the current window,
each row's completion signal, expected paths, dependency edges, public/private
boundary, and return conditions. A work window authorizes development of those rows;
it does not authorize a new lane or an unbounded refactor.

Each row remains a separately reviewable PR. Use independent branches from current
`main` when rows do not consume one another. When a later row consumes an unmerged
predecessor, branch from that predecessor and target the predecessor branch so the PR
shows only its relational delta. Record the predecessor in `dependsOn` and `stackedOn`.
Use `dependsOn` without `stackedOn` for a logical dependency whose branch remains
independent. Merge and retarget oldest-first; do not delete a predecessor branch while
an open child PR still uses it as its review base. Once the predecessor merges,
retarget the child to the accepted base and remove `stackedOn` while preserving the
historical `dependsOn` edge.

An unmerged predecessor is not by itself a reason to stop implementation inside an
authorized window. Codex continues until the window is full, all scoped rows are in
`review`, or a return condition fires. Earlier review comments are then propagated
through affected descendants before those descendants merge.

### Queue clearing and refill

Victor may return to several completed PRs at once, comment on any row, and merge
three or four in dependency order. Codex treats those actions as queue state, not as a
need for renewed permission. It re-grounds the remaining branches, applies relational
feedback, retargets descendants when needed, and—when two or fewer claims remain—opens
a new `windowRef` for the next four or five authorized rows. Do not reuse or silently
extend the old window. At most two rolling windows and seven total window claims may be
open for one actor, instance, and epic while the older queue drains.

Expected approval is a planning posture, not a repository-status claim. Development
permission may span the window while merge authority and human acceptance remain with
Victor. An open PR is never described as accepted merely because the window assumes
Victor will review it.

### Claim states inside a window

- `active` — this row is being implemented, including while an ordered predecessor is
  still open.
- `review` — implementation is complete and the PR remains part of Victor's queue.
- `waiting` — a real blocker prevents mutation; it does not mean merely “predecessor
  unmerged.”
- closed/merged — the claim leaves live state and releases its path ownership.

Use the same `windowRef` for the bounded queue. Intentional overlapping paths are valid
only for the same actor, instance, epic, and declared dependency lineage. Every other
active/review overlap still fails closed. The machine check also rejects open
dependency cycles and requires each overlapping child PR to target its declared parent
branch.

Machine health proves claim syntax, leases, queue caps, declared lineage, stacked PR
bases, and overlap rules. It does not prove that Victor authorized the window, that a
PR's actual diff matches every claimed path, or that the row's completion signal is
met. It also cannot prove that a `windowRef` was never used by a merged PR; reviewers
check historical uniqueness against merged PR history. Those remain visible review
obligations. An unclaimed PR therefore produces warning health and its paths remain
unknown, not free.

Claude may review any bounded checkpoint where an additional lens adds real
value. If Claude is unavailable, the active loop continues. If Claude reviews an
open PR, targeted findings can still follow the same direct relay pattern this
document historically called the green path: same PR, same authorized scope, no
new sensitive lane, and no unresolved design decision.

---

## Return-to-Vex conditions

Return to Vex immediately and stop autonomous progression if any of these appear:

- A new roadmap lane appears, or implementation scope expands.
- Tests fail for an unclear reason, or files changed outside the expected scope.
- Security, secrets, or auth appears in the diff or the discussion.
- Business, stewardship, or private docs appear.
- Localization architecture expansion appears.
- CI or workflow changes appear.
- Cleanup, delete, stash, or reset is proposed.
- Codex cannot verify PR state.
- Any participant needs a design decision outside the active lane.
- Victor feels unsure.

---

## Report types, by purpose

"Report back" is not one shape. Claude and Codex should match the report to why it's
being sent, so whoever reads it downstream knows what kind of claim is being made —
flattening every report into one generic dump loses that signal.

- **Implementation report** — new work, built and verified. Branch, files changed, what
  was added and why, exact commands run, test/check results, PR link.
- **Review report** — an independent review of a PR. Approve / request changes / comment only;
  whether the target blocker is resolved; changed files verified against expected
  scope; command/test results; any new blockers found; recommended next action.
- **Targeted fix report** — a fix applied in response to a review finding. Files
  changed, what changed and why, sample output if relevant, focused tests, full
  readiness result, explicit confirmation nothing outside the requested fix was
  touched.
- **Observation report** — a read-only investigation, no files touched. What was
  inspected, what was found, explicit confirmation no mutation occurred.
- **Merge checkpoint** — a PR has merged. Purpose, files changed, review path it took,
  test results, known non-blocking notes, next likely roadmap item.
- **Exception/escalation report** — something hit a return-to-Vex condition above. What
  triggered it, what boundary was crossed or would need to be, what the options are, and
  confirmation no action was taken past the boundary without authorization.
- **Roadmap decision request** — multiple viable paths exist and the choice isn't
  Claude's or Codex's to make alone. The paths, their tradeoffs, and what's blocked
  until a choice is made.

The templates below are the *request* side of this — what Victor sends out. These
report types are the *response* side — what comes back. Recipient-specific
templates remain useful when that recipient is involved; their presence does not
make that model a required step.

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

## Living collaboration

Participants are not limited to executing exactly what a relay specifies. When
one discovers a real edge case the process doesn't account for, naming it is
part of the job — not scope creep — as long as naming it doesn't mean acting on it
unilaterally.

- **Tiny wording clarifications** inside an already-authorized docs scope (a typo, an
  ambiguous sentence in a doc being actively edited) can just be fixed.
- **Anything larger** — a gap in the role boundaries, a return-to-Vex condition that
  didn't fire when it should have, a relay template missing a field it turns out to
  need — gets surfaced back to Vex/Victor as an observation, not resolved silently by
  whichever instance found it.

A worked example revealed the old limitation: PR #96 remained open while a second
authorized result was ready, but the historical loop assumed one lane mapped to one
open PR and both results landed on one branch. Work windows now resolve that class of
gap when the environment supports multiple branches: preserve one review boundary per
row, declare the relationship, and keep up to five claims visible. An environment that
truly cannot create a second branch reports that capability limit instead of silently
collapsing the queue again.

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

The environment-health layer is designed (not yet built) in
`docs/process/environment-health-design.md` — read that before implementing it.

---

## Relay formatting

When a relay is genuinely needed, provide a complete, copy-pasteable block rather than
a fragment Victor has to assemble — use the templates above as the baseline shape, and
prefix with "Victor — send this to `[recipient]`:" so the hand-off is unambiguous.

Live deliverables should include the *next* relay when the next recipient is already
known, not just a report of what happened. Concretely:

- When Claude participates and finishes an implementation or docs PR, it includes
  a complete review relay for the next known participant.
- When Codex opens a bounded PR, the PR body and implementation report are the
  primary handoff; a separate Claude relay is optional.
- When any review requests changes, relay the concrete finding to the PR owner.
  Merge checkpoints and roadmap decisions return to Victor/Vex.

No unresolved placeholders (`[number]`, `[paste ...]`) should appear in a *live* relay
packet — those only belong in the reusable templates above. A live relay is filled in
completely, because Victor is meant to send it as-is, not assemble it.

---

## Document evolution

This document describes the current operating protocol, not a fixed constitution. It
should change when the process it describes changes — and the record of *why* matters
as much as the change itself.

When revising this document, preserve:

- **What changed** — the specific section or template.
- **Why it changed** — the reasoning, not just the new text.
- **What edge case revealed the need** — the concrete situation that showed the old
  version was incomplete or wrong, if there was one.
- **Whether it's a standing principle or a task-specific pattern** — per the distinction
  above. Most revisions should be standing-principle changes; a task-specific
  constraint belongs in that task's own relay or PR, not folded into this document,
  unless it's being explicitly promoted.

Record this the way the rest of the repo records decisions: in the PR that makes the
change, per `docs/culture.md`'s "Perceivable continuity" — the diff shows what changed,
the PR explains why.

---

*[VXG RealForever]*
