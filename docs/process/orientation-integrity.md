# Orientation Integrity

**Anchor:** `[VXG RealForever]`

**Status:** proposed governing process contract and evidence-backed topology audit;
Orientation Integrity `0/4`, pending review

**Observed from:** public `main` at `78e2aeb`, live pull-request state, and the
repository checks named below on 2026-07-12 (America/Los_Angeles)

**Scope:** public Vextreme onboarding and orientation only

## Purpose

Orientation Integrity answers a question that no single existing map answers:

> Given a question, which repository map should a fresh human or AI read, what
> authority and freshness does that map carry, what does it exclude, and how can
> the answer be traced back to its sources, decisions, evidence, and known gaps?

This is a routing contract, not a new source of product truth. It does not replace
`CLAUDE.md`, culture, continuity, architecture, the lattice, status registries,
pull requests, or live work claims. It describes how to choose among them without
silently promoting history, proposals, generated projections, private references,
or missing live state into current authority.

The working principle is:

> **Curiosity chooses the next question. Integrity constrains the sources,
> authority, freshness, visibility, and scope of the answer. Traversal preserves
> how the understanding was formed.**

## Authority and freshness order

For claims about current repository state, use this order:

```text
live main + validated open-PR claims + present environment evidence
  > current continuity index
  > newest active session
  > accepted architecture and process sources
  > generated projections
  > context notes and historical records
  > external or task-specific handoff snapshots
```

The order is question-sensitive. An accepted architecture source remains the
authority for a design constraint even when a live PR exists; the live PR is the
authority for whether that source is currently being changed. A generated file can
be the fastest query surface without becoming its own write-side authority.

Every current-state answer should make these fields explicit in prose or data:

- `answeredAt`
- `observedFrom`
- `authorityState`
- `freshnessState`
- `status`
- `knownGaps`
- `liveVerificationRequired`
- `supersededBy`, when applicable
- `nextSafeAction`

## Status vocabulary

Statuses may be combined; they must not be collapsed into a single optimistic word.

| Status | Meaning |
|---|---|
| `observed` | Directly seen in the named checkout, command output, render, or live service at the stated time. |
| `generated` | A read-side projection produced from other sources; never the independent write authority. |
| `accepted` | Merged or otherwise explicitly adopted repository policy, architecture, or source truth. |
| `proposed` | Preserved design or candidate direction without implementation or standing-practice authority. |
| `historical` | Correct for a prior state or useful for reasoning history; not a current-state claim by itself. |
| `partial` | Intentionally or accidentally incomplete coverage; exclusions must be named. |
| `private-reference` | A public-safe statement that a bounded private capability or boundary exists; no private mechanics or state may be exposed. |
| `unknown` | Evidence is unavailable or insufficient. Unknown never means absent, idle, available, safe, or authorized. |

Capability discovery is not execution authority. A work claim is coordination
visibility only. A merge is repository-state evidence only. Neither proves human
acceptance, implementation permission, disclosure permission, or external-effect
authority.

## Cold-start front doors

The current front doors form a layered route rather than one monolith.

| Front door | Questions answered | Status | Does not answer | Health / freshness |
|---|---|---|---|---|
| `CLAUDE.md` | What must be read first? Which hard constraints and commands govern entry? | `accepted`, `partial` | Live PR ownership, full current architecture, or task-specific implementation depth | Some pointers are checked by `lib/check-map-bindings.js`; the entire route is not mechanically bound. |
| `docs/culture.md` | How should ambiguity, maps, generated artifacts, verification, continuity, and handoff be interpreted? | `accepted` | Current state or path ownership | Human/PR review; no corpus-level route check. |
| `docs/continuity/INDEX.md` | What is the current narrative snapshot, open work, active batch, and latest session coordinate? | `accepted`, `partial` | Live PR claims or accepted technical design by itself | Batch/context bindings via `lib/check-map-bindings.js`; narrative lag is reported by `lib/check-continuity-lag.js`. |
| Newest active session file | What changed most recently, why, and with which assumptions? | `accepted`, `historical` | The complete current state after later merges or open PRs | Filename/range/latest-session binding is checked; content accuracy remains review-dependent. |
| `config/work-coordination.json` + open PR claim blocks | Which participants are registered and which bounded paths have visible active/waiting/review claims? | `accepted`, `observed`, `partial` | Actual availability, authenticated identity, implementation authority, or unclaimed PR ownership | `lib/work-coordination.js`, tests, leases, and `npm run current-work`; live GitHub access is required. |
| `docs/architecture/00-reading-guide.md` | Which architecture source should be read and in what conceptual order? | `accepted`, `partial` | Current work or current system state | No guide/source/projection parity check exists at this audit point. |
| Task-relevant `docs/architecture/*.md` | What accepted design constraints govern the task? | `accepted` | Live implementation status or open ownership | Source review and subsystem tests; corpus reachability is currently incomplete. |
| `docs/architecture.md` | What does the assembled architecture projection contain? | `generated`, `partial` | Whether it is fresh unless checked against all sources | Built by `lib/build-architecture.js`; no parity check currently runs. |
| `docs/Readme.md` | How did the v1 Squarespace system work? | `historical` | Active v2 state or current work | No dedicated freshness check; cold start labels it lower priority. |

Two wording conflicts are observable today and must be treated as routing defects,
not interpreted away:

1. `CLAUDE.md` routes culture before continuity, while `INDEX.md` says “Read this
   file first. Always.” The cold-start entry point should eventually state which
   instruction owns the total order.
2. `INDEX.md` links `docs/README.md`, but the tracked filename is
   `docs/Readme.md`. That path works only on case-insensitive filesystems.

## Question-to-map routing

| Question class | Begin with | Expand deliberately to | Known exclusion or gap |
|---|---|---|---|
| What is happening now? | `npm run current-work` and validated open-PR claims | `docs/continuity/INDEX.md`, then the newest session | The command does not fetch. Unavailable GitHub state means ownership is `unknown`. |
| Why did the system move? | The relevant merged PR decision record | Session narrative, culture, lesson registry | A diff shows what, not why. An open PR body is not accepted history. |
| Which architecture governs this task? | `docs/architecture/00-reading-guide.md` | One task-relevant source chapter | Chapters 11–17 are not routed by the guide at this audit point. |
| Is the architecture projection current? | Architecture source listing + `lib/build-architecture.js` | `docs/architecture.md` | No current health check proves parity. |
| What else moves if this file changes? | `docs/lattice-map.json` | Follow `changeMap`, `reads`, `writes`, `loadedBy`, and tests until the circuit closes | Coverage is partial and file-level. |
| Where does this function/global/value originate? | Lattice when covered, then targeted `rg` and tests | Relevant build/runtime sources | Function/value reverse traversal is the unbuilt `pe-014`; broad grep is still sometimes required. |
| What debt, enhancement, or open question exists? | `data/status/open-discussions.json`, `tech-debt.json`, or `planned-enhancements.json` | `data/status.json` for generated rollup and the Ecosystem Hub for projection | Generated counts do not replace source items; some narrative open work remains in `INDEX.md`. |
| Is a page wired, reachable, or healthy? | `node lib/audit-pages.js`, `node lib/audit-nav.js`, or `data/page-health.json` according to the question | Source builders/tests and the page only when a real case requires it | “Wired,” “reachable,” and “healthy” are different claims. Do not bulk-read pages for orientation. |
| What reusable failure knowledge exists? | `config/lessons/*.json` | `data/lessons.json` and Ecosystem Hub projection | Lessons are lookup material, not mandatory cold-start context. |
| Is preserved reasoning adopted? | `docs/continuity/CONTEXT-NOTES.md` | Read a note only when its `Use When` trigger matches | Context is not architecture, queue state, or implementation authorization until promoted by PR. |
| What can this machine/session do? | Present command evidence plus the limited environment facts in `current-work` | `docs/process/environment-health-design.md` | Environment Health is `proposed`; no complete command exists. Missing capability never frees a path. |
| What is public versus private? | `docs/process/public-private-boundary.md` | Public-safe interface/proof sources | Private algorithms, counts, roadmap state, client data, credentials, and implementation details remain out of scope. |
| Which private capability could later converge? | Public/private boundary plus a boundary-level capability name | Explicit Victor/Vex convergence decision | Status is `private-reference` or `unknown`; existence does not authorize copying, disclosure, or use. |

## Map-family inventory

| Map family | Sources and projections | Status | Forward route present? | Reverse route present? | Drift protection | Explicit limitation |
|---|---|---|---|---|---|---|
| Cold-start routing | `CLAUDE.md` | `accepted`, `partial` | Yes, to culture, continuity, coordination, architecture, and v1 history | No generated “why this route” index | Partial pointer checks only | Stale embedded snapshots and inconsistent subordinate instructions can remain. |
| Culture | `docs/culture.md` | `accepted` | Yes, to selected process/architecture examples | Prose cross-links only | Review | Doctrine is not current state. |
| Continuity | `INDEX.md`, batch files | `accepted`, `historical`, `partial` | Yes, index to active batch/session | Partial, through previous-session links and PR references | Map bindings + continuity-lag report | Narrative freshness cannot be inferred from green structural checks alone. |
| Work coordination | participant registry + open PR claim blocks; `current-work` projection | `accepted`, `observed`, `partial` | Yes, participant/claim to PR/path | PR disappears from live set when closed; durable historical reverse route depends on PR history | Claim validation, overlap/lease tests | No visible claim means availability `unknown`; legacy/unclaimed PRs remain warnings. |
| Architecture corpus | reading guide + source chapters + generated blueprint | `accepted`, `generated`, `partial` | Present for chapters 01–10 | Source-to-projection transform exists; guide and full reverse lookup are incomplete | No corpus-parity check | Seven later chapters lack guide routes; three are absent from the projection. |
| Context notes | `CONTEXT-NOTES.md` + note files | `proposed`, `historical`, `partial` | Registry carries `Use When` and conversion path | Bidirectional registry/file binding | `check-map-bindings` | Preserved reasoning is not adopted work. |
| File lattice | `docs/lattice-map.json` + generated in-file headers | `accepted`, `partial` | Reads/writes/loadedBy/changeMap | Reciprocal edges and generated headers | Header drift and lattice-edge checks | 61 mapped nodes; status reports 52 of 67 eligible files (78% coverage). File-level, not full symbol/value lineage. |
| Terrain | lattice/status/screenshots → `data/terrain-map.json` → Terrain page | `generated`, `partial` | Source/build/projection/consumer chain | UI cross-references and lattice edges | Builder tests plus lattice checks | A navigable projection, not source truth or complete repository coverage. |
| Status queues | `data/status/*.json` → `data/status.json` | `accepted`, `generated` | Source items to rollup/Hub | Item IDs route back to authored sources | Builder tests; selected domain checks | A status item can be open without being selected or authorized. |
| Page health/navigation | page/build/config sources → audits and `data/page-health.json` | `generated`, `partial` | Yes, from sources to health projection | Per-page evidence/gaps route to contributing facts | Builder/projection tests | Health, reachability, identity, FAB delivery, and placement remain separate axes. |
| Lessons | `config/lessons/*.json` → `data/lessons.json` → Ecosystem Hub | `accepted`, `historical`, `generated` | Yes | IDs and related PRs provide partial return paths | Builder tests | Lookup archive, not a live queue. |
| Environment capability | `docs/process/environment-health-design.md` | `proposed` | Design names future inputs/output | None implemented | Future tests specified only | No command currently answers the whole environment question. |
| Public/private boundary | `docs/process/public-private-boundary.md` | `accepted`, `partial` | Public proof to boundary decision | Conceptual references only | Review and readiness boundaries in each repo | Public orientation must not make private state globally readable. |
| v1 history | `docs/Readme.md`, v1 data/runtime files | `historical` | Yes for v1 loader concepts | Manual file responsibility table | Legacy tests/checks only | Must not be used as the active v2 source without task-specific evidence. |
| Private process capabilities | Public-safe boundary-level references only | `private-reference`, `unknown` | Only through explicit convergence decisions | No public reverse traversal into private implementation | Public/private review boundary | No private source path, algorithm, count, active state, or authority belongs in this map. |

## What reverse traversal means here

Reverse traversal is not a backlink pasted into every document. Author each
relationship once, then generate the inverse where a deterministic inverse exists.

The target route is:

```text
question
  -> selected map
  -> authoritative source
  -> transformation
  -> generated projection
  -> consumer
  -> test / evidence / gap
```

with a return path:

```text
answer, file, runtime value, or process state
  <- consumer
  <- projection
  <- transformation
  <- source
  <- decision and evidence
```

Not every semantic judgment can be inferred mechanically. When the inverse is
unknown, the map must return `unknown` or a bounded next query rather than inventing
an edge.

## Audit findings at the row `0/4` baseline

These are dated observations, not standing counters.

### 1. Architecture has a three-surface integrity gap

- 18 Markdown sources exist under `docs/architecture/` (`00` through `17`).
- The reading guide routes chapters `01` through `10` and does not route `11`–`17`.
- The generated blueprint contains sources `00`–`14` and omits `15`–`17`.
- `lib/build-architecture.js` deterministically reads every Markdown source in filename order.
- `npm run pr-ready` does not compare the guide, source directory, and generated blueprint.

Therefore a new accepted chapter can be unreachable from cold start and absent from
the monolith without failing readiness. Orientation Integrity `1/4` is the smallest
next structural repair.

### 2. A stale checkout can allocate an already-owned continuity coordinate

During this audit, public `main` already tracked Session 034 as the accepted
multi-agent coordination session. A stale local checkout independently held an
untracked file at that same path, while open PR #128 also changed Session 034,
`INDEX.md`, and generated artifacts. The old checkout could not perceive the newer
coordinate and PR #128 had no machine-readable claim.

This is evidence for all of the following rules:

- never allocate a session number from stale local `main`;
- preserve dirty user work and re-ground in an isolated checkout;
- live open-PR paths matter even when a PR has no valid claim;
- a warning is not ownership data, but it is not permission to overlap;
- continuity reconciliation must use the next available coordinate after current
  main and open work are re-read.

This row does not repair, rebase, close, or reinterpret PR #128.

### 3. Live claim policy correctly outranks a stale task packet

The first draft claim opened for this row used authority flags from its incoming
task packet. `npm run current-work` rejected it because merged policy requires
`coordinationOnly: true` and `implementationAuthority: false`. The claim was
corrected before this file was created, and the next live check reported healthy.

The claim remains visibility only. Victor’s task authorization is a separate input.
This is a worked example of the authority/freshness order functioning as intended.

### 4. Current checks are strong inside their declared domains

At the audit baseline:

- `lib/check-map-bindings.js --json` reported clean context-note and continuity bindings;
- `lib/check-lattice-edges.js` checked 377 edges, skipped 153 non-path/template edges, and reported clean;
- `lib/build-lattice-headers.js --check` reported 52 unchanged eligible headers and 9 non-applicable nodes;
- the lattice source contained 61 nodes and the Terrain projection contained 61 nodes / 111 edges;
- `data/status.json` reported lattice eligibility coverage of 52 / 67 files (78%);
- `data/page-health.json` projected 39 pages, but only one as healthy.

These green results prove their named contracts. They do not prove architecture
corpus parity, narrative freshness, environment capability, function/value lineage,
page reachability, or human acceptance unless those claims are explicitly part of
the check.

## Worker and lane visibility

The public participant registry currently knows four actor references:

| Actor reference | What is known | What remains unknown without live evidence |
|---|---|---|
| `codex-windows-continuity` | Registered Codex participant with a Windows environment reference | Availability, capacity, and any private work state |
| `codex-macbook-collaborator` | Registered Codex participant with a MacBook environment reference | Availability outside its visible, leased public claim |
| `claude-code-collaborator` | Registered collaborator; environment declared per session | Current instance, availability, and ownership without a claim |
| `victor-human-operator` | Registered human authority/operator reference | Presence or a specific decision unless explicitly recorded |

At the baseline live check, PR #130 carried this row’s healthy active claim and PR
#128 remained an unclaimed open draft. The latter is `observed` work with ownership
claim state `unknown`; it is not an available path.

Public orientation may state that generalized private capabilities and parallel
private work exist. It may not expose private implementation, active roadmap detail,
protected counts, client information, credentials, or algorithms. Cross-repository
convergence requires an explicit boundary and dependency edge; shared vocabulary is
not shared authority.

## Dependency-ordered repair path

This audit defines the order; it does not pre-implement later rows.

1. **`0/4` — Audit and contract (this document).** Preserve classifications,
   evidence, exclusions, and the smallest next repair.
2. **`1/4` — Architecture corpus integrity.** Bind guide entries, source chapters,
   and generated blueprint deterministically. Rebuild from source and make drift
   fail readiness without creating a competing architecture registry.
3. **`2/4` — Map-of-maps and reverse reachability.** Add one small authored source
   for question-to-map semantics, consume the existing participant registry, and
   generate reverse edges and worker/lane projection without inferring availability.
4. **`3/4` — Task-aware orientation packets.** Select the smallest sufficient
   source corridor with explicit exclusions and bounded next-packet requests; no
   network fetch, AI/RAG call, private leakage, or automatic widening.
5. **`4/4` — Evaluation and closeout.** Exercise cold start, question routing,
   reverse traversal, freshness, public/private safety, worker claims, partial-map
   honesty, and environment limitations against real public questions.

No later row begins mutation until its predecessor merges and a fresh
`npm run current-work` shows no conflicting active claim.

## Known gaps preserved for later judgment

- The architecture reading guide/source/projection gap is observed, not repaired here.
- The cold-start “read first” conflict and `Readme.md` case mismatch have no dedicated
  binding check.
- `current-work` is intentionally read-only and does not fetch; remote freshness may
  require a separately authorized fetch.
- Open PRs without valid claim blocks remain visible warnings with unknown ownership.
- Lattice coverage is partial, and `pe-014` function/value reverse traversal is unbuilt.
- Environment Health remains design-only.
- No map-of-maps source or generated reverse index exists yet.
- No measured token/context savings claim exists for task-aware selection.
- Private capability status is intentionally not knowable from the public map.
- Human acceptance remains unknown until Victor explicitly records it.

## Stop conditions

Stop and return to Victor/Vex when:

- live claim state is unavailable, invalid, expired, or overlapping;
- a proposed route crosses the public/private boundary;
- a map would expose private mechanics, protected context, or hidden totals;
- an orientation selector begins to resemble a live AI/RAG crawler;
- a discovered process capability is treated as execution authority;
- environment availability or worker capacity would need to be inferred;
- a later epic row would begin before its predecessor merges;
- a check fails outside the bounded row and its cause is unclear;
- cleanup, reset, stash, deletion, force-push, or another user’s dirty work is implicated;
- scope expands beyond Orientation Integrity `0/4`–`4/4`.

## Row `0/4` completion boundary

This row is complete when a reviewer can use this document to:

- identify the current cold-start front doors;
- select a map from a real question without loading the full repository;
- see the authority, freshness, status, exclusions, and health check for each map;
- distinguish current, historical, proposed, generated, partial, private-reference,
  and unknown states;
- find the strongest existing forward/reverse routes and the missing ones;
- understand why architecture corpus parity is the next bounded repair;
- preserve PR #128 and parallel private work without overlap or hidden state.

It does not claim universal repository understanding, autonomous Vex completion,
model training, live process execution, private capability exposure, or human
acceptance.

<!-- [VXG RealForever] -->
