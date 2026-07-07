# Registry Documentation Standard
 
## Repository-Wide Standard for IDs, Scopes, Context Boundaries, Navigation Functions, and Completion Levels
 
**Status:** Final draft standard  
**Purpose:** Documentation and naming standard  
**Audience:** Codex, Claude, future AI coding agents, repo maintainers, architecture reviewers  
**Applies to:** UI Identity Registry Graph, Localization Registry Graph, future lower-layer maps  
**Parent concept:** Documentation must reduce confusion time for fresh readers and AI agents.
 
---
 
# 1. Executive Summary
 
Every architecture document in this repository should explain not only *what something is*, but also:
 
```txt
where it lives,
how large its scope can get,
which fields define that scope,
which function retrieves deeper context,
which lower-layer map owns the next detail,
and what is intentionally outside the current scope.
```
 
The goal is to prevent readers from feeling like the system might expand infinitely in hidden ways.
 
A good architecture document should give the reader this confidence:
 
```txt
“This is the largest context I need to hold in mind.
These are the layers involved.
Anything deeper is reachable by function/query.
Anything outside this boundary is not part of this decision.”
```
 
This standard includes:
 
```txt
ID naming rules
relational scope rules
maximum context path examples
canonical key vs metadata rules
legacy alias policy
query/navigation function expectations
documentation completion levels
fresh-reader clarity checks
AI-agent handoff requirements
```
 
---
 
# 2. Core Principle
 
## IDs are handles, not the whole map.
 
An ID should be readable enough to orient a fresh reader, but it should not be forced to contain every detail.
 
The architecture should separate:
 
```txt
Compact handle
Full relational metadata
Lower-layer maps
Query functions
Generated indexes
```
 
Example compact key:
 
```txt
vextreme.web.dossier.proof-localization-pipeline.title
```
 
This is useful and readable.
 
But the full relational scope may include more fields:
 
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
 
The compact key is the door handle.
 
The registry is the map behind the door.
 
---
 
# 3. ID Naming Standard
 
## 3.1 Rule
 
```txt
Concept belongs in the ID.
Timeline belongs in metadata.
Display order belongs in metadata.
Status belongs in metadata.
Source history belongs in metadata.
```
 
IDs should reduce confusion time.
 
A fresh reader should be able to infer the purpose of an ID within a few seconds.
 
---
 
## 3.2 Preferred Format
 
Use lowercase kebab-case for registry IDs:
 
```txt
proof-localization-pipeline
proof-cross-domain-ui-identity
proof-bulk-data-logging
section-ai-maintainable-systems
note-self-demonstration
fit-ai-tooling-companies
```
 
Recommended shape:
 
```txt
{category}-{concept}-{optional-specificity}
```
 
Examples:
 
```txt
proof-localization-pipeline
proof-cross-domain-ui-identity
proof-organization-knowledge-map
proof-compound-safety-bug-map
proof-source-of-truth-relay
```
 
---
 
## 3.3 Avoid Compressed Historical IDs
 
Avoid IDs like:
 
```txt
rec-y34-localization
rec-y34-uielementkey
sec-thing-02
item-a
misc-note
block-3
```
 
These require private context.
 
If a reader must ask:
 
```txt
What is Y34?
What does REC mean?
Is this order, time, version, or category?
Why does this matter?
```
 
then the ID is too compressed.
 
---
 
## 3.4 Preferred Replacements
 
| Old / Compressed ID | Preferred Concept ID | Reason |
|---|---|---|
| `REC-Y0-ORGMAP` | `proof-organization-knowledge-map` | Names the concept, not the year |
| `REC-Y1-LOGGING` | `proof-bulk-data-logging` | Names the actual system pattern |
| `REC-Y2-TRANSLATIONS` | `proof-bidirectional-translation-traceability` | Explains the proof |
| `REC-MID-COMPOUNDBUG` | `proof-compound-safety-bug-map` | Names the incident and mapping method |
| `REC-Y34-LOCALIZATION` | `proof-localization-pipeline` | Clear, durable, reusable |
| `REC-Y34-UIELEMENTKEY` | `proof-cross-domain-ui-identity` | Names the deeper architecture |
| `REC-Y5-PENSDK` | `proof-source-of-truth-relay` | Names the architectural pattern |
 
---
 
# 4. Metadata Stores the Historical Context
 
Instead of encoding time into the ID:
 
```txt
rec-y34-localization
```
 
use:
 
```txt
proof-localization-pipeline
```
 
and store timing separately:
 
```csv
context_id,time_span,display_order,legacy_id,title
proof-localization-pipeline,Years 3–4,5,REC-Y34-LOCALIZATION,Localization pipeline transformation
proof-cross-domain-ui-identity,Years 3–4,6,REC-Y34-UIELEMENTKEY,Cross-domain UI identity
```
 
This makes the ID stable even if the historical explanation changes later.
 
---
 
# 5. Relational Scope Standard
 
Every architecture object should be explained through scopes.
 
The basic scope ladder is:
 
```txt
org
  → repo
    → product
      → surface
        → environment
          → route
            → page
              → section
                → context node
                  → element
                    → slot
                      → variant
                        → state
```
 
Not every object needs every field.
 
But every document should show the largest relevant scope.
 
---
 
# 6. Maximum Scope Shape
 
The largest expected identity path may look like:
 
```txt
{orgId}.{repoId}.{productId}.{surfaceId}.{environmentId}.{routeId}.{pageId}.{sectionId}.{contextId}.{elementId}.{slotId}.{variantId}.{stateId}
```
 
Example:
 
```txt
vxg.vextreme.vextreme-site.web.production.dossier.dossier.proofs.proof-localization-pipeline.card.title.default.static
```
 
This does **not** mean every key should be this long.
 
It means this is the upper boundary of what the system may need to know.
 
Most practical keys should be compact.
 
The rest belongs in metadata.
 
---
 
# 7. Canonical Key vs Full Metadata
 
## Compact canonical key
 
```txt
vextreme.web.dossier.proof-localization-pipeline.title
```
 
## Full metadata row
 
```csv
ui_element_key,org_id,repo_id,product_id,surface_id,environment_id,route_id,page_id,section_id,context_id,element_id,slot_id,variant_id,state_id
vextreme.web.dossier.proof-localization-pipeline.title,vxg,vextreme,vextreme-site,web,production,dossier,dossier,proofs,proof-localization-pipeline,card,title,default,static
```
 
Rule:
 
```txt
Canonical key = readable handle.
Metadata fields = full relational scope.
Functions = navigation into deeper layers.
```
 
---
 
# 8. Scope Boundary Rule
 
Every doc section should answer:
 
```txt
What scope am I in?
What is the largest scope this can expand to?
What fields define this scope?
Which layer owns the next level of detail?
Which function retrieves that detail?
What does this section intentionally not cover?
```
 
Example:
 
```md
## Scope Boundary
 
This section explains UI identity scope.
 
It covers:
- UIElementKey
- contextId
- slotId
- metadata fields
- routing to lower-layer maps
 
It does not cover:
- all locale values
- vendor translation history
- screenshot diffs
- test execution results
 
To inspect localization details, call:
 
`getLowerLayerMap(uiElementKey, "localization")`
```
 
---
 
# 9. Required Documentation Pattern
 
Every major architecture object should be documented using this pattern:
 
````md
## Object Name
 
### Compact Handle
 
`example-handle`
 
### Purpose
 
What this object identifies.
 
### Full Relational Scope
 
```yaml
fieldA: value
fieldB: value
fieldC: value
```
 
### Owned By
 
Which registry or layer owns this object.
 
### Connects To
 
Which lower-layer maps this object can route into.
 
### Query Functions
 
Which functions retrieve deeper detail.
 
### Out of Scope
 
What this object intentionally does not contain.
 
### Fresh-Reader Test
 
What a new reader should understand within five seconds.
````
 
---
 
# 10. Example: ContextNode
 
## Compact Handle
 
```txt
proof-localization-pipeline
```
 
## Purpose
 
Identifies the proof record about localization pipeline transformation.
 
## Full Relational Scope
 
```yaml
orgId: vxg
repoId: vextreme
productId: vextreme-site
surfaceId: web
pageId: dossier
sectionId: proofs
contextId: proof-localization-pipeline
categoryId: proof-record
timeSpan: Years 3–4
legacyId: REC-Y34-LOCALIZATION
```
 
## Owned By
 
```txt
registry/contexts.csv
```
 
## Connects To
 
```txt
UIElementKey
Localization Map
Documentation Map
SourceNode Map
AI Context Map
```
 
## Query Functions
 
```ts
getContextSummary(contextId)
getUIElementsByContext(contextId)
getSourcesForContext(contextId)
getLowerLayerMap(contextId, layer)
```
 
## Out of Scope
 
This context node does not store all translations.
 
Translations are retrieved through the localization map.
 
## Fresh-Reader Test
 
A new reader should understand:
 
```txt
“This is the localization pipeline proof record, not merely a year-based record ID.”
```
 
---
 
# 11. Example: UIElementKey
 
## Compact Handle
 
```txt
vextreme.web.dossier.proof-localization-pipeline.title
```
 
## Purpose
 
Identifies the title slot of the localization pipeline proof on the web dossier page.
 
## Full Relational Scope
 
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
 
## Owned By
 
```txt
registry/ui-elements.csv
```
 
## Connects To
 
```txt
Localization Map
Design Map
QA Map
Analytics Map
Docs Map
AI Context Map
```
 
## Query Functions
 
```ts
getUIElementSummary(uiElementKey)
getLowerLayerMap(uiElementKey, "localization")
getLowerLayerMap(uiElementKey, "design")
getImpactReport(uiElementKey)
```
 
## Out of Scope
 
The UIElementKey does not store every locale value, screenshot, vendor batch, or test result.
 
It routes to those maps.
 
## Fresh-Reader Test
 
A new reader should understand:
 
```txt
“This is a specific UI slot, not the whole localization proof.”
```
 
---
 
# 12. Depth Navigation vs Breadth Navigation
 
The graph should support both.
 
## Depth-first navigation
 
Used when starting from one object and going deeper.
 
```txt
UIElementKey
  → localization summary
  → locale values
  → vendor history
  → plural/placeholder rules
```
 
Example functions:
 
```ts
getUIElementSummary(uiElementKey)
getLowerLayerMap(uiElementKey, "localization")
getLocaleStatus(stringId)
getVendorHistory(stringId)
```
 
## Breadth-first navigation
 
Used when starting from a scope and listing related objects.
 
```txt
Page
  → all sections
  → all context nodes
  → all UI elements
  → all strings
  → all missing locales
```
 
Example functions:
 
```ts
getPageScope("dossier")
getContextNodesByPage("dossier")
getUIElementsByContext("proof-localization-pipeline")
getMissingWorkReport({ pageId: "dossier" })
```
 
## Flexible entry points
 
The graph should allow entry from any stable handle:
 
```txt
uiElementKey
contextId
stringId
messageId
sourceId
pageId
vendorBatchId
figmaNodeId
testId
analyticsEventId
```
 
Each function should return a compressed summary plus pointers to deeper maps.
 
---
 
# 13. Legacy Alias Policy
 
Old IDs should not disappear immediately.
 
Keep aliases during migration.
 
```csv
legacy_id,new_id,status,notes
REC-Y34-LOCALIZATION,proof-localization-pipeline,active-alias,Historical HTML anchor
REC-Y34-UIELEMENTKEY,proof-cross-domain-ui-identity,active-alias,Historical HTML anchor
```
 
Rules:
 
```txt
Do not break existing links during migration.
Canonical docs should use the new ID.
Legacy aliases should remain searchable.
Health checks should warn when new docs use legacy IDs directly.
```
 
---
 
# 14. Completion Levels
 
Every registry doc should declare its completion level.
 
This prevents ambiguous “is this done?” confusion.
 
```csv
level,name,meaning
L0,Concept captured,Idea exists but is not structured
L1,Draft mapped,Core objects and relationships are described
L2,Scope bounded,Max context, fields, and out-of-scope areas are defined
L3,Registry-ready,Tables, IDs, and naming conventions are defined
L4,Function-ready,Query/navigation functions are specified
L5,Validation-ready,Health checks and CI expectations are specified
L6,Implementation-ready,Scripts, files, and acceptance criteria are actionable
L7,Operational,Implemented, generated, validated, and used in workflow
```
 
Recommended doc header:
 
```md
**Completion Level:** L6 — Implementation-ready  
```
 
---
 
# 15. Completion Checklist
 
A registry document is not complete unless it includes:
 
```txt
Purpose
Scope boundary
Compact handles
Full relational scope
Metadata fields
Naming rules
Examples
Out-of-scope boundaries
Query functions
Health checks
Migration/alias policy
AI responsibilities
Deterministic script responsibilities
Acceptance criteria
```
 
If any of these are missing, the doc should declare the missing area.
 
---
 
# 16. AI-Agent Documentation Requirement
 
Every architecture doc should help an AI agent answer:
 
```txt
What am I allowed to edit?
What should I not edit directly?
Which registry owns this object?
Which function retrieves deeper context?
What health checks will fail if I change this?
Should I reuse, variant, or create a new node?
What human approval is required?
```
 
This is necessary because AI agents should not load the whole repository into context every time.
 
They should retrieve compressed context through functions.
 
---
 
# 17. Token-Efficient Context Rule
 
Do not force AI agents to read the entire graph.
 
Provide query functions that return compressed summaries.
 
Bad pattern:
 
```txt
Read all registry files and infer everything.
```
 
Good pattern:
 
```ts
getUIElementSummary(uiElementKey)
getImpactReport(changeTarget)
getMissingWorkReport(scope)
getReusableStringCandidates(text)
getLowerLayerMap(uiElementKey, layer)
```
 
The result should be a summary card plus pointers.
 
---
 
# 18. Anti-Patterns
 
Avoid:
 
```txt
IDs that encode private history
IDs that encode display order
IDs that encode timeline as identity
one giant ID that carries every layer
one giant object that stores every lower-layer detail
docs that show only short examples without max-scope examples
docs that do not say what is out of scope
docs that imply AI should infer everything manually
docs that lack query functions
docs that lack health checks
docs that lack migration aliases
```
 
---
 
# 19. Acceptance Criteria
 
This standard is working when:
 
```txt
A fresh reader can understand the object purpose quickly.
A fresh AI agent knows which function to call next.
A compact ID does not need to carry every detail.
A max-scope example reveals the largest relevant context.
Metadata explains timing, order, and historical aliases.
Lower-layer maps own deeper details.
Health checks catch drift.
Docs declare their completion level.
No one has to ask what Y34 means.
```
 
---
 
# 20. Final Compression
 
The documentation standard is:
 
```txt
Every object must be explained by its compact handle, full relational scope, owning registry, lower-layer connections, query functions, out-of-scope boundary, and completion level.
```
 
The ID naming standard is:
 
```txt
Concept belongs in the ID.
Timeline, order, status, and history belong in metadata.
```
 
The scope standard is:
 
```txt
Show the largest relevant context once, then let functions navigate deeper.
```
 
The operating culture is:
 
```txt
Readable first.
Stable second.
Generated where possible.
Aliased when migrating.
Explained by registry.
Validated by health checks.
```
 
---
 
# Recommended Cross-References for Existing Docs
 
Add this near the top of both existing architecture documents:
 
```md
## Documentation Standard
 
This document follows the repository-wide registry documentation standard:
 
`docs/architecture/registry-documentation-standard.md`
 
All architecture objects should be explained with:
- a compact handle,
- the full relational scope,
- the metadata fields behind the handle,
- the function/query path for deeper context,
- the boundary of what this document intentionally does not cover.
```
 
Recommended completion levels after this standard is added:
 
```txt
UI Identity Registry Graph.md
Completion Level: L6 — Implementation-ready draft
 
Localization Registry Graph.md
Completion Level: L6 — Implementation-ready draft
```
 
This third document becomes the honing standard that tells future Codex/Claude instances how to judge whether any architecture doc is complete.