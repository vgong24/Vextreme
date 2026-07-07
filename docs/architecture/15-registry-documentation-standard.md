# Registry documentation standard

**Status:** implementation-ready foundation
**Completion Level:** L6 - Implementation-ready
**Purpose:** repository-wide standard for registry IDs, scope boundaries, query paths, and completion levels
**Applies to:** UI Identity Registry Graph, Localization Registry Graph, and future lower-layer maps

---

## Scope Boundary

This section defines how registry architecture is documented in this repo.

It covers:
- compact handles and full relational metadata
- naming rules for registry IDs
- scope-boundary sections for architecture docs
- query/navigation function expectations
- completion levels for registry docs
- the health check that keeps this standard visible

It does not cover:
- every UI element row
- every locale value
- every vendor workflow field
- every screenshot, test, analytics event, or design binding

Those details belong in lower-layer maps and generated indexes.

---

## Core Rule

IDs are handles, not the whole map.

A handle should orient a fresh reader quickly. It should not be forced to
contain every scope, state, status, timeline, and history detail.

Use:

```txt
compact handle -> full metadata -> lower-layer map -> query function
```

not:

```txt
one enormous ID that tries to carry the entire system
```

Concept belongs in the ID. Timeline, display order, status, and source history
belong in metadata.

---

## Naming Rules

Use lowercase kebab-case for registry object IDs.

Preferred shape:

```txt
{category}-{concept}-{optional-specificity}
```

Examples:

```txt
proof-localization-pipeline
proof-cross-domain-ui-identity
proof-bulk-data-logging
section-ai-maintainable-systems
note-self-demonstration
fit-ai-tooling-companies
```

Avoid compressed historical IDs as canonical IDs:

```txt
rec-y34-localization
rec-y34-uielementkey
sec-thing-02
item-a
misc-note
block-3
```

Compressed IDs can remain as legacy aliases during migration, but new docs and
new registry rows should use concept-readable IDs.

---

## Relational Scope

The largest expected identity path may include:

```txt
org -> repo -> product -> surface -> environment -> route -> page -> section -> context -> element -> slot -> variant -> state
```

Compact keys should usually be much shorter:

```txt
vextreme.web.dossier.proof-localization-pipeline.title
```

The full row behind that handle can carry the larger scope:

```yaml
orgId: vxg
repoId: vextreme
productId: vextreme-site
surfaceId: web
environmentId: production
routeId: dossier
pageId: dossier
sectionId: proofs
contextId: proof-localization-pipeline
elementId: card
slotId: title
variantId: default
stateId: static
```

Rule:

```txt
Canonical key = readable handle.
Metadata fields = full relational scope.
Functions = navigation into deeper layers.
```

---

## Required Object Pattern

Every major registry object document should answer:

```md
## Object Name

### Compact Handle

### Purpose

### Full Relational Scope

### Owned By

### Connects To

### Query Functions

### Out of Scope

### Fresh-Reader Test
```

The point is not ceremony. The point is that a cold-start AI instance should
know what it is editing before it edits, and should know which function or map
to open next instead of loading the whole graph.

---

## Query Functions

Registry docs should name the function path for deeper context.

Examples:

```ts
getContextSummary(contextId)
getUIElementSummary(uiElementKey)
getLowerLayerMap(handle, layer)
getImpactReport(changeTarget)
getMissingWorkReport(scope)
getReusableStringCandidates(text)
```

These functions may begin as documented contracts before they exist in code.
Once implemented, they should return compressed summaries plus pointers, not
the entire graph.

---

## Completion Levels

Registry docs declare their completion level so future readers do not have to
guess whether a document is conceptual, actionable, or operational.

| Level | Name | Meaning |
|---|---|---|
| L0 | Concept captured | Idea exists but is not structured |
| L1 | Draft mapped | Core objects and relationships are described |
| L2 | Scope bounded | Max context, fields, and out-of-scope areas are defined |
| L3 | Registry-ready | Tables, IDs, and naming conventions are defined |
| L4 | Function-ready | Query/navigation functions are specified |
| L5 | Validation-ready | Health checks and CI expectations are specified |
| L6 | Implementation-ready | Scripts, files, and acceptance criteria are actionable |
| L7 | Operational | Implemented, generated, validated, and used in workflow |

---

## Health Checks

The machine-readable source for this standard is:

```txt
data/registry/documentation-standard.json
```

The deterministic check is:

```txt
node lib/check-registry-docs.js
```

That check verifies that registered architecture docs:
- declare a known completion level
- include a scope boundary
- include query functions
- include health checks
- include acceptance criteria
- keep the VXG continuity marker

This is intentionally small at first. The health check exists so the standard
can grow without depending on memory or manual review alone.

---

## Acceptance Criteria

This standard is working when:

```txt
A fresh reader can understand the object purpose quickly.
A fresh AI agent knows which function or lower-layer map to open next.
Compact IDs remain readable handles instead of god objects.
Metadata carries timeline, order, status, and aliases.
Lower-layer maps own deeper detail.
Health checks catch documentation drift.
Docs declare completion level honestly.
No one has to ask what a compressed historical ID means before editing.
```

<!-- [VXG RealForever] -->
