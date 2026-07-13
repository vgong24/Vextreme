# Multi-Agent Work Coordination

**Status:** active public-repository development protocol
**Live assignment source:** machine-readable claim blocks on open pull requests

## Why this exists

Continuity history answers what happened and why. Open pull requests answer what
is changing now. A cold-start instance needs both, plus a bounded answer to who
owns which paths, where the row sits in an epic, what it depends on, and when the
claim must be renewed.

A committed active-work list would become stale when a pull request merges. The
claim therefore lives in the open PR body and disappears from the live set when
the PR closes or merges. `config/work-coordination.json` holds only the stable,
public-safe participant references and fail-closed policy.

## Cold-start flow

1. Complete the `CLAUDE.md` reading sequence.
2. Run `npm run current-work`.
3. Read every validated claim touching the paths you intend to change.
4. If GitHub state is unavailable, a lease is expired, a claim is malformed, or
   active paths overlap, stop and coordinate through the owning PR.
5. Open a draft PR with one valid claim block before mutating shared paths.
6. When Victor authorized a work window, add its `windowRef`; an ordered predecessor
   may remain open while this claim is `active`.
7. Use `waiting` only when a real dependency or exception prevents mutation.
8. Change it to `review` when implementation is complete but review changes may
   still touch the claimed paths.

## Claim meaning

- `actorRef` is a stable repository-local collaborator label.
- `instanceRef` distinguishes one running environment or task from another.
- `epic.item` uses the repository's numeric epic position.
- `windowRef` optionally groups up to five PRs in one Victor-authorized development
  interval.
- `paths` are exact files or directory prefixes ending in `/`.
- `dependsOn` names predecessor work without pretending it has merged.
- `stackedOn` names the one open predecessor branch this PR consumes; remove the
  field when the PR is independent even if it has a logical `dependsOn` edge.
- `lease.renewBy` makes abandoned claims visible instead of silently permanent.

These references support coordination; they are not authenticated identity,
employment attribution, legal identity, or proof of authorship.

## Work windows

An epic permission envelope comes from an explicit Victor decision recorded in the
governing PR or relay. A work window converts part of that stable epic awareness into
one fixed review queue with a unique `windowRef`. It normally carries four PRs and may
carry five. Each claim remains bounded to one PR and one row; the window does not turn
the epic into one large branch or grant authority outside the declared lane.

Rows may be developed before their predecessors merge when all of these hold:

- Victor authorized the epic or bounded interval;
- every PR uses the same `windowRef`, actor, instance, and epic;
- `dependsOn` declares the row order;
- a relational child uses `stackedOn` so its PR base can be checked;
- each PR remains separately reviewable;
- current live claims are healthy;
- no return-to-Vex condition has fired.

When two or fewer claims remain after Victor clears most of the queue, re-ground live
state and open the next dependency-safe batch with a new `windowRef`. Do not reuse the
old reference or require Victor to restate the same epic permission after every merge.
One actor/instance/epic may have at most two rolling windows and seven total window
claims open while the older batch drains.

## Overlap and takeover

Two `active` or `review` claims may not own the same file or a parent/child path.
The only exception is an intentional ordered stack with the same `windowRef`, actor,
instance, epic, and transitive `dependsOn` lineage. A `waiting` claim is visible but
reserves no path. Do not silently take over, reset, stash, delete, rewrite, or
force-push another instance's work. Contact the owner on the PR, narrow scopes
deliberately, or serialize the dependency.

For stacks, each open child PR's `stackedOn` must also appear in `dependsOn`, and the
child must target that predecessor branch even when the claimed paths do not overlap.
The named stacked parent must remain an open claim. After it merges, retarget the child
to its accepted base and remove `stackedOn`; keep the historical `dependsOn` edge. Open
dependency cycles are invalid. A shared window reference may not mix actors, instances,
or epics.

## Authority boundary

A claim does not authorize implementation, merge, acceptance, publication,
private-data access, providers, or external effects. Repository instructions,
explicit task scope, review, and human decisions remain authoritative. Public
claims must never contain private SDK details, contacts, credentials, client
data, or private roadmap content.

Victor may separately authorize implementation for a whole work window. That
permission envelope allows continuous PR development without converting the claims
themselves into authority. Victor still owns merge and acceptance, and a new lane,
sensitive boundary, or expanded epic requires a new decision.

`npm run current-work` validates coordination evidence, not the permission source or
the implementation itself. It cannot prove that Victor authorized a named window,
that actual changed files match the claim, or that completion criteria are satisfied.
Review those against the recorded permission envelope and PR diff. An unclaimed PR is
warning health with unknown ownership; its paths are never inferred free.
Because live claims disappear on merge, reviewers must also confirm a new `windowRef`
has not been reused by searching merged PR history; open-state validation cannot prove
historical uniqueness.

<!-- [VXG RealForever] -->
