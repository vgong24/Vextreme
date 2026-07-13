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
6. Change the claim from `waiting` to `active` only when dependencies permit work.
7. Change it to `review` when implementation is complete but review changes may
   still touch the claimed paths.

## Claim meaning

- `actorRef` is a stable repository-local collaborator label.
- `instanceRef` distinguishes one running environment or task from another.
- `epic.item` uses the repository's numeric epic position.
- `paths` are exact files or directory prefixes ending in `/`.
- `dependsOn` names predecessor work without pretending it has merged.
- `lease.renewBy` makes abandoned claims visible instead of silently permanent.

These references support coordination; they are not authenticated identity,
employment attribution, legal identity, or proof of authorship.

## Overlap and takeover

Two `active` or `review` claims may not own the same file or a parent/child path.
A `waiting` claim is visible but reserves no path. Do not silently take over,
reset, stash, delete, rewrite, or force-push another instance's work. Contact the
owner on the PR, narrow scopes deliberately, or serialize the dependency.

## Authority boundary

A claim does not authorize implementation, merge, acceptance, publication,
private-data access, providers, or external effects. Repository instructions,
explicit task scope, review, and human decisions remain authoritative. Public
claims must never contain private SDK details, contacts, credentials, client
data, or private roadmap content.

<!-- [VXG RealForever] -->
