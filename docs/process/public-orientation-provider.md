# Public orientation provider

**Status:** repository-owned public provider contract

## Purpose

`lib/public-orientation-provider.js` forms the public repository's bounded federated-orientation provider receipt. It composes two already-owned inputs without turning either one into a new state system:

```text
caller-supplied public current-work evidence
+ accepted public-safe synthetic Process Atlas projection
+ explicit observedAt
-> vextreme.orientation-provider-receipt/v1
   providerClass=PUBLIC_VEXTREME
   repositoryRef=vgong24/Vextreme
   visibility=PUBLIC
   projectionScope=PUBLIC_SAFE
   publicationAuthority=false
```

The adapter is a **composer, not an observer**. It receives evidence that has already been collected. It does not run Git, call GitHub, fetch a network, spawn a process, write a file, mutate a source, or persist state.

## Separation from the task-aware selector

`lib/select-orientation-context.js` answers a different question: which public repository maps should be read for a bounded task? That selector stays a router and never becomes the provider receipt owner.

The provider instead answers: given already-collected public repository/current-work evidence and the accepted public-safe Process Atlas semantics substrate, what content-absent repository-owned receipt can be handed to a federated resolver?

Keep these three surfaces distinct:

```text
task-aware selector
  -> routes a question to public maps

current-work evidence
  -> describes observed public repository / PR / coordination state

public orientation provider
  -> validates and composes those public facts with Process Atlas semantics
     into one effect-free provider receipt
```

## Input contract

### Public current-work evidence

The caller supplies an object whose repository identity is exactly `vgong24/Vextreme` and whose references remain inside public repository namespaces. Currentness comes from this evidence, never from the synthetic atlas.

The provider accepts current/prior/next/held references plus one current-work reference when available. `currentClaimRefs` are derived only from coordination evidence that is both live and validated. A missing, unavailable, or invalid coordination surface produces no claim refs and no authority.

`CURRENT` is not accepted merely because a caller labels evidence current. It also requires a live source ref, at least one accepted ref, and available live coordination evidence. Otherwise the provider downgrades the receipt to `UNKNOWN` and surfaces the refresh action.

### Public-safe Process Atlas

The checked-in Process Atlas fixture is a semantics substrate, not live repository work. Its nodes, titles, owners, authorities, priorities, and process states must never be reinterpreted as current Vextreme state.

Before composition, the adapter independently verifies the accepted public-safe invariants:

- schema `vextreme.process-atlas.public-safe/v1`;
- projection receipt schema `vextreme.process-atlas.projection-receipt/v1`;
- every `*Ref` / `*Refs` value remains in the `synthetic.*` namespace;
- source records remain `SOURCE_MANAGED_SYNTHETIC`;
- public node/edge counts match the actual projection;
- omitted-private counts and transformed-alias count remain zero;
- the public-safe visibility profile remains present;
- the projection receipt SHA-256 matches the canonical stable projection body with the receipt removed.

A failure in any of those checks stops receipt formation. The adapter never repairs or rewrites the atlas.

## Receipt truth

Every successful receipt is fixed to:

```text
schemaVersion=vextreme.orientation-provider-receipt/v1
providerClass=PUBLIC_VEXTREME
repositoryRef=vgong24/Vextreme
visibility=PUBLIC
projectionScope=PUBLIC_SAFE
publicationAuthority=false
privateStateRefs=[]
authorityEnvelope.state=HELD
authorityEnvelope.allowedEffectRefs=[]
relayState.executionState=TASK_STATE_UNKNOWN_DO_NOT_EXECUTE
```

Function availability is not effect authority. A public provider receipt cannot authorize source mutation, publication, cross-repository authority transfer, provider execution, or host execution.

`exactNextActionRef` may be null when current evidence is sufficient and no next action is supplied. When currentness or live coordination is insufficient, the adapter returns a bounded refresh action instead of inventing a next step.

## Source-class boundary

The output deliberately carries two source classes:

```text
synthetic.*
  -> accepted public-safe Process Atlas grammar and projection evidence

github.*.vextreme.* / work.vextreme.* / claim.vextreme.* / public.*
  -> supplied public repository and coordination evidence
```

The first class cannot establish current repository state. The second class cannot inherit synthetic authority examples. Both are content-absent references in the receipt.

## Privacy and failure behavior

The adapter is fail-closed:

- a PAT ref outside `synthetic.*` is rejected;
- a supplied repository ref outside the public Vextreme namespace is rejected;
- arbitrary extra current-work fields are rejected instead of copied through;
- unknown or unavailable live evidence yields no authority and no active capability;
- `privateStateRefs` is always empty;
- visibility and projection scope are fixed and cannot be caller-coerced;
- publication authority is always false;
- source/body text from the Process Atlas is never projected into the provider receipt.

The provider is intentionally content-absent. It transports source-addressable state needed for orientation, not page bodies, personal records, credentials, local paths, or hidden repository content.

## Determinism

The adapter does not mutate either input. Equal normalized inputs plus the same explicit `observedAt` produce the same receipt.

`observedAt` is supplied by the caller because observation time belongs to the evidence-collection boundary. The provider does not call the system clock.

## Validation

Focused proof:

```text
node --check lib/public-orientation-provider.js
node --test tests/57-public-orientation-provider.test.js
```

Repository readiness additionally runs the normal full test and PR-readiness gates. The focused matrix covers current-state separation, stale/missing evidence, PAT hash/count integrity, synthetic-only PAT refs, privacy, fixed public visibility, zero publication authority, zero effect surface, determinism, content absence, and source-class separation.

<!-- [VXG RealForever] -->
