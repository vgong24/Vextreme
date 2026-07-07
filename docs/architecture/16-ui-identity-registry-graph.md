# UI Identity Registry Graph

**Status:** implementation-ready foundation
**Completion Level:** L6 - Implementation-ready
**Purpose:** parent architecture for stable UI identity across code, strings, docs, tests, platforms, and AI context
**Documentation Standard:** follows `docs/architecture/15-registry-documentation-standard.md`

---

## Scope Boundary

This section defines the parent graph shape.

It covers:
- UIElementKey as a cross-domain bridge identity
- context nodes, string/message nodes, bindings, and layer maps
- deterministic maintenance responsibilities
- AI responsibilities
- query functions and impact reports
- health checks needed before this becomes operational

It does not cover:
- every locale rendering
- every screenshot
- every analytics event
- every test result
- every vendor batch row
- every design node

Those details belong in lower-layer maps. The parent graph routes to them.

---

## Core Thesis

Identity first. Discussion second. Modification third.

Before changing a thing, the system should know what the thing is:

```txt
stable identity -> lower-layer maps -> generated indexes -> health checks -> impact reports -> approval workflows
```

The top-level graph should not become a god object. It should contain enough
identity to route correctly.

---

## Current Repo Fit

The repo already has several registry-shaped systems:

| Current layer | Existing source | Existing generated/read side |
|---|---|---|
| Content nodes | `data/nodes.json` | `data/index.json` |
| Arc navigation | `data/arcs-v2.json` | `data/index.json` |
| UI strings | `data/strings/source/**/*.json` | `data/strings/compiled/**` |
| File dependency lattice | `docs/lattice-map.json` | generated LATTICE headers |
| Continuity batches | `docs/continuity/INDEX.md` | `lib/check-map-bindings.js` |

The UI Identity Registry Graph is the next layer above those systems. It does
not replace them. It gives them a shared identity language.

---

## Core Objects

| Object | Purpose |
|---|---|
| `UIElementKey` | Stable handle for a meaningful UI element or slot |
| `ContextNode` | Structural location and meaning container |
| `StringNode` | Reusable meaning node for static text |
| `MessageNode` | Reusable meaning node for dynamic, pluralized, or variable-dependent text |
| `BindingNode` | Connects UI identity to strings, messages, variants, platforms, or lower-layer maps |
| `LayerMap` | Domain-specific map such as localization, design, QA, analytics, docs, platform, or AI context |
| `GeneratedIndex` | Machine-generated summary derived from source registries |

Example compact key:

```txt
vextreme.web.dossier.proof-localization-pipeline.title
```

Example full relational scope:

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

---

## Owned By

The parent graph should begin as source data under:

```txt
data/registry/
```

Current first source:

```txt
data/registry/documentation-standard.json
```

Future source maps can be added as the migration becomes concrete:

```txt
data/registry/contexts.json
data/registry/ui-elements.json
data/registry/bindings.json
data/registry/aliases.json
```

Generated indexes should remain separate from source maps, following the repo's
existing CQRS pattern.

---

## Connects To

The parent graph routes into:

```txt
Localization Map
Design Map
QA / VnV Map
Analytics Map
Documentation Map
Platform Implementation Map
Vendor Workflow Map
AI Context Map
Generated Health Indexes
```

High-level maps route. Lower-level maps explain.

---

## Query Functions

Recommended contracts:

```ts
getUIElementSummary(uiElementKey)
getContextSummary(contextId)
getLowerLayerMap(handle, layer)
getImpactReport(changeTarget)
getMissingWorkReport(scope)
getReusableStringCandidates(text)
getEditWarnings(uiElementKey)
generateApprovalPacket(changeSet)
```

These functions should return compressed summaries and pointers. They should
not force an AI agent to read the whole graph.

---

## Deterministic Responsibilities

Once structure is known, scripts should handle:

```txt
registry generation
binding validation
missing map reports
duplicate candidate reports
orphan detection
stale binding detection
impact reports
approval packet generation
```

Humans approve meaning. Scripts maintain structure.

---

## AI Responsibilities

AI should enter when the system encounters:

```txt
ambiguity
semantic judgment
legacy migration
incompatible input
schema evolution
duplicate concept interpretation
variant recommendation
human-readable explanation
```

AI should not be the permanent memory of the system. The graph is the memory.
AI is the bridge into the graph.

---

## Health Checks

This foundation introduces documentation health first:

```txt
node lib/check-registry-docs.js
```

Future graph health checks should validate:

```txt
every managed UI element has a UIElementKey
every binding points to an existing context
every localization binding points to a string_id or message_id
deleted contexts are not still referenced
legacy aliases remain searchable during migration
high-impact changes produce an impact report
AI context notes are updated for high-impact changes
```

---

## Migration Rule

Do not rewrite the whole repo into a new registry shape in one pass.

Migration should proceed as:

```txt
1. Document the bounded graph and standards.
2. Add small source maps that can be validated.
3. Generate summary indexes from existing data.
4. Add health checks before enforcing new edit rules.
5. Preserve legacy aliases until links and references are migrated.
```

Current string keys and slugs remain valid handles. The new graph gives them a
larger place to connect.

---

## Acceptance Criteria

The UI Identity Registry Graph is working when:

```txt
A fresh AI agent can identify what it is editing before editing.
A changed string can produce a clear impact report.
A deleted UI element reveals stale strings, tests, docs, and bindings.
A duplicate concept is detected before it becomes permanent.
Generated indexes summarize the registry.
Humans approve semantic decisions instead of chasing metadata by hand.
```

<!-- [VXG RealForever] -->
