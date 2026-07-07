# UI Identity Registry Graph
 
## Repository-Level Architecture for AI-Maintainable Infrastructure
 
**Status:** Final draft mapping
**Purpose:** Parent architecture document
**Audience:** Codex, Claude, future AI coding agents, repo maintainers, architecture reviewers
**Scope:** Repository-wide identity graph, build-script maintenance, AI responsibility boundaries, traceability culture
 
---
 
# 1. Executive Summary
 
This repository is not only a website, localization system, documentation set, or AI coding experiment.
 
It is a prototype for a larger architecture:
 
> A **UI Identity Registry Graph** where every meaningful UI element, string, context, platform binding, test identity, design reference, analytics event, documentation note, and AI-context warning can be traced through stable identifiers.
 
The system’s goal is to prevent infrastructure drift.
 
Instead of forcing humans or AI agents to rediscover context repeatedly, the repository should expose:
 
```txt
stable identity
→ lower-layer maps
→ generated indexes
→ health checks
→ impact reports
→ approval workflows
```
 
The high-level architecture does **not** hold every detail directly.
 
It holds enough identity to route the reader, script, or AI agent into the correct lower-layer map.
 
---
 
# 2. Core Thesis
 
Most organizations accumulate disconnected identifiers:
 
```txt
Design has component names.
Engineering has code IDs.
Localization has string keys.
QA has test IDs.
Analytics has event names.
Docs have section anchors.
Support has article references.
AI agents have temporary session context.
```
 
Each system may work locally, but the organization loses the relationships between them.
 
This repository’s architecture treats those relationships as first-class.
 
The central idea:
 
```txt
Identity first.
Discussion second.
Modification third.
```
 
Before changing a thing, the system should know what the thing is.
 
---
 
# 3. Primary Architectural Principle
 
## High-level maps route. Lower-level maps explain.
 
The top-level graph should not become a bloated object containing every translation, screenshot, test, design node, and vendor status.
 
Instead:
 
```txt
UIElementKey
  → localization map
  → design map
  → QA map
  → analytics map
  → documentation map
  → platform map
  → AI context map
```
 
The high-level map answers:
 
```txt
What is this thing?
Where does it belong?
Which systems know about it?
Which lower-layer maps should be opened?
What is the likely impact of changing it?
```
 
The lower-layer maps answer domain-specific questions.
 
---
 
# 4. The UIElementKey
 
`UIElementKey` is the cross-domain bridge identity.
 
It identifies a meaningful UI element across systems without storing every system’s details inline.
 
Recommended shape:
 
```txt
UIElementKey(
  productId,
  surfaceId,
  pageId,
  contextId,
  elementId
)
```
 
Compact example:
 
```txt
vextreme.web.dossier.rec-y34-localization.title
```
 
Expanded example:
 
```yaml
productId: vextreme
surfaceId: web
pageId: dossier
contextId: rec-y34-localization
elementId: title
```
 
This key should answer:
 
```txt
Which product?
Which surface?
Which page?
Which context?
Which element slot?
```
 
It should **not** directly answer:
 
```txt
What are all translations?
What are all screenshots?
What are all test cases?
What are all vendor batches?
What are all analytics events?
```
 
Those are lower-layer responsibilities.
 
---
 
# 5. UIElementKey Is Not a God Object
 
A bad version would be:
 
```json
{
  "uiElementKey": "vextreme.web.dossier.rec-y34-localization.title",
  "en": "Localization: 6 months → 2 weeks",
  "zh": "本地化流程：六个月缩短到两周",
  "ja": "...",
  "figmaNode": "...",
  "testId": "...",
  "analyticsEvent": "...",
  "screenshots": [],
  "vendorBatch": "...",
  "pluralRules": {},
  "history": []
}
```
 
This becomes heavy and difficult to maintain.
 
The better version is:
 
```json
{
  "uiElementKey": "vextreme.web.dossier.rec-y34-localization.title",
  "contextId": "rec-y34-localization",
  "slot": "title",
  "stringId": "STR-LOCALIZATION-CYCLE",
  "maps": {
    "localization": "loc.STR-LOCALIZATION-CYCLE",
    "design": "design.vextreme.dossier.localization.title",
    "qa": "qa.vextreme.dossier.localization.title",
    "analytics": "analytics.vextreme.dossier.localization.title",
    "docs": "docs.localization-proof"
  }
}
```
 
The high-level object routes.
 
The lower maps explain.
 
---
 
# 6. Core Object Model
 
## 6.1 UIElementKey
 
Stable identity for a UI element or meaningful UI slot.
 
Example:
 
```txt
vextreme.web.dossier.rec-y34-localization.title
```
 
## 6.2 ContextNode
 
Structural location and meaning container.
 
Example:
 
```txt
rec-y34-localization
```
 
This is not just a DOM ID. It is a proof record inside the proofs section of the dossier page.
 
## 6.3 StringNode
 
Reusable meaning node for non-dynamic text.
 
Example:
 
```txt
STR-LOCALIZATION-CYCLE
```
 
## 6.4 MessageNode
 
Reusable meaning node for dynamic, pluralized, or variable-dependent text.
 
Example:
 
```txt
MSG-FILES-UPLOADED
```
 
## 6.5 BindingNode
 
Connects a UI element to a string, message, variant, platform, or lower-layer map.
 
Example:
 
```txt
bind.dossier.localization.title
```
 
## 6.6 LayerMap
 
Domain-specific map such as localization, design, QA, analytics, docs, platform, or AI context.
 
## 6.7 GeneratedIndex
 
Machine-generated index derived from the registries.
 
Example:
 
```txt
generated/ui-element-index.json
generated/impact-report.json
generated/orphan-report.json
```
 
---
 
# 7. Layered Architecture
 
```txt
UI Identity Registry Graph
  ├── Context Registry
  ├── UI Element Registry
  ├── Binding Registry
  ├── Localization Map
  ├── Design Map
  ├── QA / VnV Map
  ├── Analytics Map
  ├── Documentation Map
  ├── Platform Implementation Map
  ├── Vendor Workflow Map
  ├── AI Context Map
  └── Generated Health Indexes
```
 
Each layer has a different job.
 
The graph is powerful because each layer stays bounded.
 
---
 
# 8. Recommended Repository Structure
 
```txt
docs/
  architecture/
    ui-identity-registry-graph.md
    graph-query-api.md
    registry-health-checks.md
 
  localization/
    localization-registry-graph.md
    vendor-workflow.md
    plural-and-placeholder-rules.md
 
  ai/
    ai-condition-and-responsibilities.md
    ai-coding-platform-handoff.md
 
registry/
  ui-elements.csv
  contexts.csv
  categories.csv
  bindings.csv
  variants.csv
 
localization/
  strings.csv
  messages.csv
  plural-rules.csv
  placeholder-rules.csv
  vendor-notes.csv
  locales/
    en.csv
    zh.csv
    ja.csv
    es.csv
 
design/
  figma-bindings.csv
  component-map.csv
  layout-constraints.csv
 
qa/
  test-bindings.csv
  vnv-bindings.csv
  coverage-map.csv
 
analytics/
  event-bindings.csv
  screen-map.csv
  metadata-map.csv
 
docs-map/
  decision-record-bindings.csv
  support-bindings.csv
  architecture-note-bindings.csv
 
ai-context/
  edit-warnings.csv
  known-risks.csv
  prior-decisions.csv
 
generated/
  graph.json
  ui-element-index.json
  localization-index.json
  impact-report.json
  missing-work-report.json
  duplicate-candidates.json
  orphan-report.json
  health-report.json
 
scripts/
  extract-html-structure.js
  extract-strings.js
  generate-ui-index.js
  generate-localization-index.js
  detect-duplicates.js
  detect-orphans.js
  validate-bindings.js
  validate-placeholders.js
  validate-plurals.js
  validate-rich-text.js
  validate-locked-strings.js
  generate-impact-report.js
  export-vendor-batch.js
  import-vendor-batch.js
```
 
---
 
# 9. Registry Maintenance Philosophy
 
The registry should not rely on manual discipline alone.
 
The culture is:
 
```txt
Humans approve meaning.
Scripts maintain structure.
AI assists ambiguity.
CI prevents drift.
Generated reports reveal missing work.
```
 
A registry becomes heavy only when humans must manually keep it synchronized.
 
This architecture assumes:
 
```txt
Build scripts extract structure.
Generated indexes summarize relationships.
Health checks detect decay.
AI proposes mappings where ambiguity exists.
Humans approve semantic decisions.
```
 
The system must maintain itself as much as possible.
 
---
 
# 10. Deterministic System Responsibilities
 
The architecture should automatically handle:
 
```txt
registry generation
graph indexing
binding validation
missing translation reports
plural validation
placeholder validation
rich-text validation
duplicate detection
orphan detection
stale binding detection
vendor export/import checks
screenshot diffs
impact reports
approval queues
progress notifications
```
 
These are not AI responsibilities once the structure is known.
 
They are deterministic infrastructure responsibilities.
 
---
 
# 11. AI Responsibilities
 
AI is required when the system encounters:
 
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
 
AI should assist with:
 
```txt
onboarding legacy systems
mapping incompatible inputs
proposing UIElementKeys
detecting semantic duplicates
recommending variants
explaining impact reports
generating scripts
refactoring toward registry compatibility
summarizing lower-layer maps for humans
```
 
AI should not be used as the permanent memory of the system.
 
The graph is the memory.
 
AI is the bridge into the graph.
 
---
 
# 12. AI Condition
 
AI should enter only when the system cannot deterministically answer.
 
```txt
AI is required only when ambiguity, incompatibility, semantic judgment, migration, or unstructured input appears.
 
AI is not required for deterministic registry maintenance once the structure is known.
```
 
This is the central boundary.
 
---
 
# 13. Graph Query API
 
AI agents should not consume the whole graph unless necessary.
 
They should call functions that return compressed context.
 
Example functions:
 
```ts
getUIElementSummary(uiElementKey): UIElementSummary
 
getLocalizationSummary(stringId, locale?): LocalizationSummary
 
getImpactReport(changeTarget): ImpactReport
 
getMissingWorkReport(scope): MissingWorkReport
 
getReusableStringCandidates(text): Candidate[]
 
getLowerLayerMap(uiElementKey, layer): LayerSummary
 
proposeRegistryMapping(input): MappingProposal
 
generateApprovalPacket(changeSet): ApprovalPacket
 
getEditWarnings(uiElementKey): EditWarning[]
 
getOrphanReport(scope): OrphanReport
 
getDuplicateCandidates(scope): DuplicateCandidate[]
```
 
The AI should receive:
 
```json
{
  "uiElementKey": "vextreme.web.dossier.rec-y34-localization.title",
  "context": "Localization proof card title",
  "stringId": "STR-LOCALIZATION-CYCLE",
  "reuseCount": 3,
  "locales": {
    "en": "approved",
    "zh": "approved",
    "ja": "missing"
  },
  "risks": [
    "Global edit affects investor page",
    "Metric wording must remain intact"
  ],
  "recommendedAction": "Create variant if audience-specific wording is intended."
}
```
 
Not:
 
```txt
Here is the entire graph.json. Figure it out.
```
 
This preserves token efficiency.
 
---
 
# 14. Approval Loop
 
The system should separate mechanical changes from semantic decisions.
 
Mechanical changes:
 
```txt
generated index changed
missing locale detected
placeholder validation failed
orphan binding found
screenshot diff produced
```
 
Semantic decisions:
 
```txt
Is this the same concept or a new concept?
Should this wording be global or variant-specific?
Should this translation be approved?
Should this UI element be split into multiple elements?
Should this legacy ID map to an existing registry node?
```
 
Approval loop:
 
```txt
1. System detects issue or proposed change.
2. System generates compressed report.
3. AI explains the report if useful.
4. Human approves semantic decision.
5. Scripts apply deterministic updates.
6. CI validates the graph.
7. Generated indexes update.
```
 
---
 
# 15. Change Impact Workflow
 
When a string, UI element, design node, test ID, or context changes, the system should generate an impact report.
 
Example:
 
```txt
Changed:
STR-LOCALIZATION-CYCLE
 
Affected UIElementKeys:
- vextreme.web.dossier.rec-y34-localization.title
- vextreme.web.investor.localization-proof.title
- vextreme.web.ai-platform.localization-case-study.heading
 
Affected layers:
- localization
- screenshots
- docs
- vendor status
 
Recommendation:
Create variant if only investor wording should change.
Otherwise update canonical string and mark dependent translations stale.
```
 
This prevents local edits from becoming global damage.
 
---
 
# 16. Health Checks
 
Every pull request should validate:
 
```txt
UIElementKey exists for every managed element
string_id exists for every string binding
message_id exists for every plural binding
required locale values exist
placeholders are preserved
plural categories are valid per locale
rich-text tags are valid
DOM IDs are not duplicated
bindings are not orphaned
deleted contexts are not still referenced
locked strings are not changed without approval
vendor imports do not break placeholders
similar strings are not duplicated without explanation
screenshots are regenerated for localized pages
AI context notes are updated for high-impact changes
```
 
Example report:
 
```txt
Registry Health Report
 
✅ 84 UI elements valid
✅ 122 bindings valid
✅ en locale complete
⚠️ zh locale missing 2 optional strings
❌ MSG-FILES-UPLOADED missing plural branch: other
❌ STR-WELCOME-USER zh translation removed placeholder {userName}
⚠️ STR-LOCALIZATION-CYCLE reused in 3 contexts; confirm global edit
```
 
---
 
# 17. Migration Role
 
This architecture is especially valuable when migrating existing organizations into a shared graph.
 
Legacy organizations often have:
 
```txt
random locale files
inconsistent Figma names
test IDs with no conceptual mapping
analytics events invented by feature teams
support docs with different terminology
screenshots with no owning UI identity
tribal knowledge in Slack or Confluence
AI-generated code without lasting context
```
 
AI can help convert this into:
 
```txt
UIElementKey
ContextNode
StringNode
MessageNode
BindingNode
LayerMap
GeneratedIndex
```
 
AI is the migration bridge.
 
The graph becomes the maintained source of truth.
 
---
 
# 18. Anti-Patterns
 
Avoid these patterns:
 
```txt
Putting every detail into UIElementKey
Treating English text as the source of truth
Editing generated localized HTML directly
Letting AI invent new keys without registry checks
Creating duplicate strings for every page
Using plain strings for plural/count-dependent text
Relying on manual registry maintenance
Letting screenshots, tests, and docs drift separately
Treating localization as separate from UI identity
Giving AI the whole graph when a summary function would suffice
```
 
---
 
# 19. Success Criteria
 
This architecture is working when:
 
```txt
A fresh AI agent can understand what it is editing before editing.
A changed string produces a clear impact report.
A new locale can be added without duplicating pages.
A vendor can translate only what is missing.
A deleted UI element reveals stale tests, docs, analytics, and strings.
A duplicate concept is detected before it becomes permanent.
A human approves meaning decisions rather than manually chasing metadata.
The repository can explain itself through generated indexes.
```
 
---
 
# 20. Relationship to Localization
 
Localization is not the whole architecture.
 
Localization is the first major proof layer.
 
The parent architecture is:
 
```txt
UI Identity Registry Graph
```
 
The localization module is:
 
```txt
Localization Registry Graph
```
 
Relationship:
 
```txt
UIElementKey
  → stringId/messageId
  → locale rendering
  → vendor workflow
  → plural/placeholder validation
```
 
The localization document should live separately because it is a lower-layer map.
 
---
 
# 21. Final Compression
 
The final architecture is:
 
```txt
A layered UI Identity Registry Graph where UIElementKey acts as the cross-domain bridge identity, ContextNode explains structural placement, StringNode/MessageNode stores reusable meaning, BindingNode connects usage, lower-layer maps expose domain-specific detail, build scripts maintain registry health, and AI enters only for ambiguity, migration, refactoring, and explanation.
```
 
The central rule:
 
```txt
The top-level map should not contain everything.
It should contain enough to route correctly.
```
 
The operating culture:
 
```txt
Architecture manages structure.
Build scripts manage health.
Functions retrieve compressed context.
Humans approve meaning.
AI handles ambiguity, migration, refactoring, and explanation.
```
 
The purpose:
 
```txt
Make every meaningful UI element witnessable:
what it is,
where it lives,
what it says,
how it localizes,
who depends on it,
what validates it,
what documents it,
what changes affect it,
and what an AI must know before modifying it.
```