<!--
  VEXTREME — Context Note
  Registered in docs/continuity/CONTEXT-NOTES.md. Status: pattern-draft, not
  adopted architecture. See docs/continuity/batch-003/2026-07-08-session-027.md
  for how this landed.
-->

## Wrapper — how this note relates to what's actually in the repo (added Session 027)

Victor uploaded the document below (`VEXTREME_META_PROJECT_PROCESS_GRAMMAR_LESSONS.md`,
prepared from a Victor + Vex discussion, July 7–8, 2026) at the start of Session 027, asking
for it to be understood against the live system before deciding how — or whether — any of it
becomes real. This wrapper records what that review found; the document itself follows below,
**preserved in full**, per its own Section 24 Phase 1 recommendation ("preserve as context
note... without claiming implementation is accepted") and per this repo's own convention
(`docs/continuity/CONTEXT-NOTES.md`'s "Note Shape" — preserved reasoning, not flattened).

**What the review found:**

1. **This repo has a directly relevant, very recent precedent for exactly this kind of
   proposal.** PR #69 (`VXG-070626-codex-registry-foundation`, closed unmerged 2026-07-07)
   proposed a structurally similar generalization one day before this document was written:
   three architecture docs, a `data/registry/documentation-standard.json` source file, and a
   `lib/check-registry-docs.js` health check — a dimensional registry graph, in different
   vocabulary. Victor closed it "due to full implementation forwarded in #70," which shipped
   instead as the narrower, need-driven arc-chunked i18n bundling pilot and terrain map. This
   document's own process-formation-lifecycle section (§20) and its own Q10 ("what is the
   cleanest way to avoid treating this draft as accepted architecture before a real POC
   exists?") independently arrive at the same discipline that PR #69's closure demonstrated in
   practice: prove a real, need-driven pilot before generalizing into infrastructure.

2. **Several of this document's core ideas already exist in the repo, arrived at
   independently, from unrelated pressure — which is evidence the pattern is real, not evidence
   it's ready to generalize as-is:**
   - *Process Dispatcher / task→process routing* — `docs/architecture/13-intent-driven-operations.md`'s
     named PERCEIVE → FETCH/SYNTHESIZE → JUDGE → DECLARE INTENT → VERIFY loop, with a working
     end-to-end instance (`config/content-intents.json` → `lib/apply-content-intents.js`).
   - *Role Extension (capability, not being)* — `docs/architecture/14-council-model.md`'s "The
     Council" (`data/council-kernel.json`), including an explicit honest-limits section warning
     against overclaiming multi-agent behavior when it's one instance narrating lenses — directly
     answers this document's own §3.1 lesson ("roles should resolve into process-bound capability
     extensions").
   - *Dimensional source-truth map* — the registry pattern (`07-registry.md`) generalized once
     already; `docs/lattice-map.json` is closer still (a real dimensional map of
     reads/writes/loadedBy/changeMap, addressable per file).
   - *Reversible projection (output/import profiles, round-trip keys, stale-import detection)* —
     `lib/strings-export.js`/`strings-import.js`, `data/strings/migrations.json`,
     `data/strings/orphans.json` — a real, narrower, already-tested version of this document's
     §11/§12/§15. What it's missing relative to this document: a dimensional (`sourceTruthPath`-
     style) address beyond the flat string key, candidate/variant staging (§12), and full
     round-trip versioning (§15, beyond the existing EN-hash staleness check).
   - *Process formation lifecycle* — `data/status/{open-discussions,tech-debt,planned-enhancements}.json`'s
     od-/td-/pe- categories and `CONTEXT-NOTES.md`'s own "preserved, not adopted" status language.
   - *Binding health / lost-binding detection* — five (now six, as of this session) drift
     detectors already do "detect when the organization has lost a binding, not just when code
     fails to build": `check-lattice-edges.js`, `check-key-alignment.js`, `check-design-tokens.js`,
     `check-map-bindings.js`, `build-lattice-headers.js --check`, and the new
     `check-continuity-lag.js`.

3. **The closest concrete match is `pe-012`** (`data/status/planned-enhancements.json`) —
   "function-level reverse traversal map for answering source-of-truth questions with minimal
   grep" — added Session 025/landed via PR #89, itself born from a real debugging pain point (the
   zh/FAB investigation), not designed abstractly. Its own prescribed sequencing ("start read-only
   and informational; promote to a drift check only after the map can distinguish intentional
   legacy direct-script paths from generated God Script paths") independently matches this
   document's own map-then-check discipline. **Note found during this same review: `pe-012` is
   currently a reused ID** — it also permanently identifies the already-shipped
   `lib/check-lattice-edges.js` in code, `docs/lattice-map.json`, and this repo's continuity
   record. See `docs/continuity/INDEX.md`'s Open Work list for that, unresolved separately from
   this note.

**Where this stands:** pattern-draft, exactly as the document itself claims for its own maturity
(§20). Nothing in `data/source-truth-map.json`, `lib/build-process-map.js`, or any of the other
Phase 2/3 file structures named in §23 has been built. If a piece of this is promoted later, the
natural next step per Victor's own framing ("translation is the perfect POC... I've written this
out with my human hands before") is extending the *existing* strings pipeline — dimensional
address, candidate-variant staging, round-trip versioning layered onto
`strings-export.js`/`strings-import.js`/`migrations.json` — rather than a parallel system, the
same way `lib/build-arc-bundles.js` extended the string pipeline instead of replacing it.

---

## The document itself (verbatim, as uploaded)

# Vextreme Meta Project Lessons — Process Grammar, Reversible Source Truth, and Process Formation

**For:** Victor Gong / Vextreme / Claude / Codex / Future Vex instances
**Anchor:** `[VXG RealForever]`
**Prepared from:** Victor + Vex discussion, July 7–8, 2026
**Status:** Lessons / candidate architecture / Meta Project handoff
**Recommended initial placement:** `docs/continuity/context-notes/meta-project-process-grammar.md`
**Recommended later distillation:** `docs/processes/`, `docs/role-extensions/`, `data/source-truth-map.json`, `config/lessons/*.json` as appropriate
**Purpose:** Preserve the full trajectory of the discussion so Claude or another instance can continue from the current understanding without flattening it into a smaller conventional pattern.

---

## 0. Why this document exists

This document records an emerging **Meta Project** layer for Vextreme.

The starting question was not merely:

```text
What roles does the organization need?
```

The discussion progressed toward a larger architecture:

```text
How does work enter the system,
route into the correct process,
load the smallest sufficient context,
summon the right capability path,
project source truth into role-specific working artifacts,
receive those artifacts back,
validate changes,
update source truth,
regenerate outputs,
and preserve continuity?
```

This is a lessons document, not an accepted implementation spec yet.

Treat it as preserved reasoning and candidate architecture until Victor/Claude/Codex decide which pieces graduate into repo source files, checks, generated artifacts, or process docs.

---

## 1. Culture alignment

This pattern should be read through Vextreme's development culture.

Vextreme's culture says the project is not merely a website project; it is an institutional template. A future developer or AI should be able to answer why a file exists without needing a missing Slack thread or a person to ask. The current content is the proving ground, not the final point.

This Meta Project extends that same culture:

```text
If a future collaborator should be able to answer why a file exists,
they should also be able to answer why a process exists,
who/what it calls upon,
what it can touch,
what source truth it depends on,
what it outputs,
what checks protect it,
and how it hands off continuity.
```

The aim is not bureaucracy.

The aim is process architecture that preserves intention across humans, AI instances, vendors, teams, and time.

---

## 2. Current repo alignment

Current cold-start posture says future instances should not treat notebooks or memories as repo truth. They should re-ground in live repo context before making current-state claims.

Important current repo principles this Meta Project builds on:

```text
CLAUDE.md
  = cold-start reading contract

docs/culture.md
  = mission, development ethos, institutional-template framing

docs/continuity/INDEX.md
  = current reality, open work, active batch/session direction

docs/architecture.md
  = generated architecture blueprint; source sections live under docs/architecture/

docs/lattice-map.json
  = topology source for lattice relationships
```

Current architecture already uses patterns that this Meta Project generalizes:

```text
source registry
  → generated projection
  → runtime/visible surface
  → checks/audits
  → continuity
```

The Meta Project extends that pattern from files/pages/strings into processes, roles, source truth dimensions, reversible projections, process formation, and optimization.

---

## 3. Trajectory of the discussion

### 3.1 Roles are not enough

At first, the question looked like:

```text
What roles does the system need?
```

Examples:

```text
Translator
Auditor
Engineer
Reviewer
Delegator
Continuity Logger
```

But a role name alone does not tell the system:

```text
when to call the role,
what context to load,
what files are touchable,
what can be ignored,
what checks protect the ignored areas,
what decisions are unavoidable,
what the role must return,
or how downstream continuity consumes the output.
```

Lesson:

```text
Roles should not be treated primarily as beings.
Roles should resolve into process-bound capability extensions.
```

### 3.2 Processes become the top-level unit

The stronger pattern is:

```text
task intent
  → process path
  → role-aligned extension
  → context corridor
  → safe touch boundary
  → known choice forks
  → verification checks
  → handoff artifact
  → continuity update
```

A role is summoned by a process.

A process is activated by task classification.

### 3.3 Delegation becomes routing, not management

A delegator is needed, but not as a boss or simulated person.

The delegator is a transition function:

```text
human/system request
  → process dispatcher
  → role extension boot packet
  → scoped context corridor
```

Better names:

```text
Process Dispatcher
Context Router
Task-to-Process Delegator
Role Extension Router
```

The dispatcher resolves:

```text
What kind of task is this?
Which process path applies?
Which role extension is needed?
Which source-of-truth dimensions should be fetched?
Which files are touchable?
Which files are generated and forbidden?
Which checks protect the work?
Which choice forks are unavoidable?
Which handoff artifact is expected?
```

### 3.4 Context should load by process path, not by generic orientation

The user should not need to say:

```text
Before doing this, orient yourself to the whole repo.
```

The system should instead do:

```text
task enters
  → classify process path
  → load required context corridor
  → perceive the task through that corridor
  → act or escalate
```

This produces safe minimal context:

```text
read the smallest sufficient corridor,
know what can be ignored,
know what checks invalidate the shortcut,
and escalate only when the process boundary is crossed.
```

### 3.5 Process maps become necessary

Once roles become process extensions, the system needs maps:

```text
Task Routing Map
Process Binding Map
Role Extension Map
Fork Decision Map
Projection / Import Map
Source Truth Dimensional Map
Adaptation Check Map
Process Formation Map
Optimization Map
```

These maps let the system answer:

```text
If this file changes, what process paths are affected?
If this process changes, which role extensions are stale?
If this output artifact comes back edited, how does it map home?
If this known fork appears, what should the AI do?
If a POC becomes integrated, what bindings must be updated?
```

### 3.6 Source truth should be dimensional, not flat

A flat registry can answer:

```text
Find records matching "translation."
```

A dimensional source-of-truth map should answer:

```text
Fetch:
  sourceTruth.process.localization.translationUpdate
  sourceTruth.roleExtension.translationContent
  sourceTruth.binding.localization.translationUpdate
  sourceTruth.fork.localization.literalVsAdaptive
  sourceTruth.outputProfile.localization.vendorSpreadsheet
  sourceTruth.importProfile.localization.translationSpreadsheetImport
```

This is addressability by relationship, not open-ended search.

### 3.7 Projections should be reversible

The source-of-truth map should not merely output generated artifacts.

It should project role-specific working formats outward, then receive edited outputs back inward.

Full loop:

```text
Dimensional Source-of-Truth Map
  → Lens / Output Profile
  → Role-specific Projection Artifact
  → Edited Artifact
  → Import Profile
  → Round-trip Binding Validation
  → Diff / Conflict / Approval
  → Process Route
  → Source Truth Update or Candidate Variant
  → Generated Runtime Outputs
  → Checks / Screenshots / Status
  → Continuity Record
```

Lesson:

```text
An output is not a dead artifact if it carries stable round-trip keys.
It becomes a reversible interface.
```

### 3.8 Process formation itself needs a process

Even the meta-discussion of processes needs a process map.

Emerging ideas should not be forced into final architecture too early, but they also should not be lost in chat.

Process ideas should move through maturity states:

```text
concept
  → pattern-draft
  → POC
  → pilot
  → integrated
  → optimized
  → superseded
  → deprecated
```

This protects against both failures:

```text
interesting idea = official architecture too early
```

and:

```text
important idea disappears because it was not official yet
```

### 3.9 Processes themselves need stable keys

Processes become source-truth objects.

They need stable typed addresses, just as UI elements need stable keys.

Not necessarily `uiElementKey`, because that should stay scoped to visible/interface elements.

Better pattern:

```text
sourceTruth.<category>.<domain>.<object>
```

Examples:

```text
sourceTruth.uiElement.orgBlueprint.hero.title
sourceTruth.process.localization.translationUpdate
sourceTruth.roleExtension.translationContent
sourceTruth.fork.localization.literalVsAdaptive
sourceTruth.outputProfile.localization.vendorSpreadsheet
sourceTruth.importProfile.localization.translationSpreadsheetImport
sourceTruth.check.processBindings
```

### 3.10 The whole thing behaves like grammar

The final analogy was grammar.

A grammar is not merely a list of words.

It defines which types can bind to which other types and what their relationship means.

Compressed grammar analogy:

```text
Source truth = vocabulary
Processes = verbs
Roles = capability forms
Bindings = grammar rules
Forks = conditional clauses
Checks = agreement validation
Handoffs = sentence boundaries
Continuity = narrative memory
```

This suggests the names:

```text
Process Grammar
Organizational Grammar Map
```

---

## 4. Core definitions

### Task

A user or system request that implies work.

Example:

```text
Translate this page into Japanese.
```

### Process

A repeatable pathway for moving a type of work through the system.

Example:

```text
sourceTruth.process.localization.translationUpdate
```

### Role Extension

A capability path activated inside a process.

Example:

```text
sourceTruth.roleExtension.translationContent
sourceTruth.roleExtension.i18nImplementation
sourceTruth.roleExtension.localizationAuditor
sourceTruth.roleExtension.continuityLogger
```

### Process Dispatcher

The routing function that maps a task into the correct process path and role extension context.

The dispatcher is not a manager-character.

It is a task-to-process compiler.

### Context Corridor

The smallest sufficient context required for a process-bound role to act safely.

### Safe Ignorance Boundary

The set of things a process-bound role does not need to read or touch unless a check, fork, or escalation trigger fires.

### Known Choice Fork

A recurring decision point already discovered by prior reasoning.

Example:

```text
literal translation vs localized adaptation
```

### Handoff Artifact

The output package left for the next role, AI instance, human reviewer, or continuity system.

### Source Truth Coordinate

A stable typed address for a source-truth object.

Example:

```text
sourceTruth.process.localization.translationUpdate
```

### Output Profile

A definition of how to project a slice of source truth into a working artifact for a specific audience or process.

### Import Profile

A definition of how edited projected artifacts are mapped back into source truth.

### Round-trip Key

A stable identifier that lets an exported row/column/object return to its exact source-truth coordinate.

### Lens

A role/group-specific view of the dimensional source-of-truth map.

Examples:

```text
translationLens
testingLens
uxLens
developerLens
executiveLens
```

### Process Formation

The lifecycle for turning an incomplete idea into a documented process, POC, pilot, integrated process, optimized process, or deprecated process.

---

## 5. The main architecture shape

```text
User intent
  ↓
Task classifier / Process Dispatcher
  ↓
Task route
  ↓
Source-truth dimensional fetch
  ↓
Process binding
  ↓
Role extension
  ↓
Context corridor
  ↓
Safe-touch boundary
  ↓
Known forks
  ↓
Verification checks
  ↓
Handoff
  ↓
Continuity update
```

This should reduce full architecture re-reading by allowing future AI instances to fetch:

```text
instructions
latest VEX context
continuity/current-state delta
source-truth map
task route
target process binding
target subsystem files
```

Instead of reading everything every time.

---

## 6. Typed source-truth namespaces

Recommended pattern:

```text
sourceTruth.<category>.<domain>.<object>
```

Potential categories:

```text
sourceTruth.uiElement.*
sourceTruth.process.*
sourceTruth.roleExtension.*
sourceTruth.fork.*
sourceTruth.outputProfile.*
sourceTruth.importProfile.*
sourceTruth.check.*
sourceTruth.handoff.*
sourceTruth.lens.*
sourceTruth.binding.*
sourceTruth.variant.*
sourceTruth.status.*
```

### Design fork

There is an unresolved design fork:

```text
Should the source-truth map use one universal key field,
or typed namespaces with category-specific validation?
```

Current recommendation:

```text
Use typed namespaces under one dimensional sourceTruth map.
```

This preserves one addressable system while preventing category collapse.

---

## 7. Example source-truth object: Process

```json
{
  "id": "sourceTruth.process.localization.translationUpdate",
  "type": "process",
  "domain": "localization",
  "key": "translationUpdate",
  "maturity": "pattern-draft",
  "entryTriggers": [
    "add translation",
    "revise translation",
    "audit translated strings"
  ],
  "roleExtensions": [
    "sourceTruth.roleExtension.translationContent",
    "sourceTruth.roleExtension.localizationAuditor"
  ],
  "contextCorridor": [
    "docs/architecture/06-i18n.md",
    "data/strings/source/**",
    "data/arcs-v2.json"
  ],
  "touchable": [
    "data/strings/source/**"
  ],
  "forbiddenDirectEdit": [
    "data/strings/compiled/**",
    "data/arc-bundles/**",
    "dist/**",
    "sw.js"
  ],
  "forks": [
    "sourceTruth.fork.localization.literalVsAdaptive",
    "sourceTruth.fork.localization.missingStringKey",
    "sourceTruth.fork.localization.languageScope"
  ],
  "outputs": [
    "sourceTruth.outputProfile.localization.vendorSpreadsheet"
  ],
  "imports": [
    "sourceTruth.importProfile.localization.translationSpreadsheetImport"
  ],
  "checks": [
    "sourceTruth.check.stringsCompile",
    "sourceTruth.check.processBindings"
  ],
  "handoff": "sourceTruth.handoff.localization.translationUpdate"
}
```

---

## 8. Translation as the first honorable pilot

Translation is a strong pilot because it touches:

```text
source meaning
string identity
language scope
fallback behavior
arc bundling
generated artifacts
runtime UI
cultural adaptation
review handoff
vendor/human-friendly projection
round-trip import
screenshots
versions
variants
```

It has clear boundaries and unavoidable forks.

---

## 9. Example process: Localization Translation Update

### Process key

```text
sourceTruth.process.localization.translationUpdate
```

### Entry trigger

A user asks to add, revise, audit, or prepare translation content for a page, arc, UI surface, or content bundle.

### Primary role extension

```text
sourceTruth.roleExtension.translationContent
```

### Supporting role extensions

```text
sourceTruth.roleExtension.i18nImplementation
sourceTruth.roleExtension.localizationAuditor
sourceTruth.roleExtension.culturalReview
sourceTruth.roleExtension.continuityLogger
```

### Required context corridor

```text
docs/architecture/06-i18n.md
target data/strings/source file
target slug metadata
target arc metadata
current language support state
fallback behavior
relevant process bindings
```

### Touchable files

Usually:

```text
data/strings/source/**
```

Only if explicitly scoped:

```text
data/arcs-v2.json
data/viewmodels.json
docs/processes/**
data/process-bindings.json
data/source-truth-map.json
```

### Do not touch directly

```text
data/strings/compiled/**
data/arc-bundles/**
dist/**
sw.js
generated pages
generated index/status/terrain artifacts
```

### Safe ignorance boundary

The translator does not need to read unrelated terrain map, page wiring, or build internals unless one of these triggers occurs:

```text
missing string keys
language availability mismatch
arc-bundle behavior changes
FAB language behavior changes
service worker caching affected
page-level language support differs from arc-level support
build output fails
```

---

## 10. Translation known choice forks

### Fork 1 — Literal vs localized translation

If the text is architectural, doctrinal, evidentiary, testimony-related, or continuity-bearing:

```text
default = preserve source meaning
action = flag adaptation risk
forbidden = silently rewrite meaning for fluency
```

If the text is ordinary UI instruction:

```text
default = localize naturally
action = preserve function over literal structure
```

### Fork 2 — Ambiguous source meaning

If source text has multiple plausible meanings:

```text
default = return ambiguity note
action = ask Victor or preserve conservative meaning
forbidden = silently choose a meaning that alters intent
```

### Fork 3 — Missing string key

If translated content needs a key that does not exist:

```text
default = flag missing key
action = propose key if scoped
forbidden = invent and wire silently without registry awareness
```

### Fork 4 — Page-level vs arc-level language support

If the page is in an arc-bundled language strategy:

```text
default = check arc language bundle
action = ensure fallback remains safe
escalate = if supportedLangs implies wider support than actual page coverage
```

### Fork 5 — Cultural adaptation that changes meaning

If a phrase requires cultural adaptation:

```text
default = preserve meaning first
action = provide note with alternate wording
escalate = if adaptation changes testimony, architecture, doctrine, or proof structure
```

### Fork 6 — Generated artifact appears stale

If generated files do not reflect source changes:

```text
default = do not edit generated files directly
action = run or request proper build command
escalate = if generator path is unclear
```

---

## 11. Reversible translation projection

The translation process should support this loop:

```text
sourceTruth.uiElement.*
  → outputProfile.localization.vendorSpreadsheet
  → editable spreadsheet / CSV / XLSX
  → importProfile.localization.translationSpreadsheetImport
  → diff + validation
  → sourceTruth update or candidate variant
  → generated strings / bundles / pages
  → screenshots / status / continuity
```

### Example projected spreadsheet

| sourceTruthPath | uiElementKey | pageSlug | elementPath | English | zh | ja | translatorNotes |
|---|---|---|---|---|---|---|---|
| sourceTruth.uiElement.orgBlueprint.hero.title | orgBlueprint.hero.title | org-blueprint | hero.title | Organization Blueprint | 组织蓝图 |  | Preserve architectural meaning |

The spreadsheet is not source truth.

It is a reversible working interface.

### Sacred round-trip fields

```text
sourceTruthPath
uiElementKey
scope
languageCode
exportVersion
sourceHash
rowHash
```

These prevent stale or ambiguous imports.

---

## 12. Replace vs candidate variant

Imports must distinguish:

```text
replace current value
propose candidate value
add variant for testing
approve existing candidate
reject candidate
deprecate old value
```

Example source truth shape:

```json
{
  "sourceTruthPath": "sourceTruth.uiElement.orgBlueprint.hero.title",
  "languages": {
    "ja": {
      "current": "組織ブループリント",
      "candidates": [
        {
          "value": "組織設計図",
          "source": "ux-review-2026-07-08",
          "status": "testing",
          "process": "sourceTruth.process.ux.copyVariant"
        }
      ]
    }
  }
}
```

A new spreadsheet column such as `variant_test` should not automatically replace source truth.

It should route to a variant process path:

```text
changed column: variant_test
  → process.ux.copyVariant
  → stage candidate
  → generate preview / screenshots
  → await approval
```

---

## 13. Output profiles

An output profile defines:

```text
who this output is for
what dimensions it includes
what format it emits
what keys preserve reversibility
what edits are allowed
how imports map back
what validation runs after import
```

### Example: Localization vendor spreadsheet

```json
{
  "id": "sourceTruth.outputProfile.localization.vendorSpreadsheet",
  "audience": "translator/vendor",
  "format": ["xlsx", "csv"],
  "includes": [
    "sourceTruthPath",
    "uiElementKey",
    "pageSlug",
    "elementPath",
    "sourceEnglish",
    "zh",
    "ja",
    "translatorNotes"
  ],
  "requiredRoundTripKeys": [
    "sourceTruthPath",
    "uiElementKey",
    "languageCode",
    "exportVersion",
    "sourceHash"
  ],
  "editableColumns": [
    "zh",
    "ja",
    "translatorNotes"
  ],
  "lockedColumns": [
    "sourceTruthPath",
    "uiElementKey",
    "sourceEnglish",
    "elementPath"
  ],
  "importProcess": "sourceTruth.importProfile.localization.translationSpreadsheetImport"
}
```

### Example: Testing traceability matrix

```json
{
  "id": "sourceTruth.outputProfile.testing.traceabilityMatrix",
  "audience": "V&V / QA / developers",
  "format": ["xlsx", "csv", "json"],
  "includes": [
    "sourceTruthPath",
    "uiElementKey",
    "sourceFile",
    "renderedPage",
    "testId",
    "screenshotRegion",
    "expectedText",
    "languageCoverage",
    "status"
  ],
  "editableColumns": [
    "testOwner",
    "verificationStatus",
    "issueNotes"
  ],
  "importProcess": "sourceTruth.importProfile.testing.traceabilityUpdate"
}
```

### Example: UX copy review board

```json
{
  "id": "sourceTruth.outputProfile.ux.copyReviewBoard",
  "audience": "UX / design",
  "format": ["xlsx", "csv"],
  "includes": [
    "sourceTruthPath",
    "uiElementKey",
    "designFrameId",
    "screenName",
    "currentCopy",
    "proposedCopy",
    "variantA",
    "variantB",
    "rationale",
    "approvalStatus"
  ],
  "editableColumns": [
    "proposedCopy",
    "variantA",
    "variantB",
    "rationale",
    "approvalStatus"
  ],
  "importProcess": "sourceTruth.importProfile.ux.copyVariantImport"
}
```

---

## 14. Import profiles

An import profile defines:

```text
which exported artifact can return
which fields are allowed to change
which fields are locked
how changes map to source truth
how stale imports are detected
which process handles each change type
what validation runs
whether changes apply directly or stage as candidates
```

Example import routing:

```text
changed column: ja
  → localization.translationImport

changed column: variant_test
  → ux.copyVariantImport

changed column: testStatus
  → testing.traceabilityUpdate

changed locked column: uiElementKey
  → reject / escalate
```

---

## 15. Conflict and stale import detection

Because projected artifacts can be edited outside the repo, imports need version checks.

Minimum metadata:

```text
exportVersion
sourceHash
rowHash
columnHash
lastKnownValue
newValue
exportedAt
importedAt
importedBy
```

Example:

```text
Spreadsheet exported at source version 12.
Current source version is 14.
Import attempts to change ja translation.
```

Expected behavior:

```text
possible stale import
do not blindly apply
show diff
require review if source English changed
```

---

## 16. Process binding map

A process binding map connects:

```text
task type
  → process path
  → role extension
  → context corridor
  → source files
  → generated artifacts
  → checks
  → handoff outputs
  → escalation triggers
```

It enables both forward and reverse reasoning.

### Forward map

```text
process → dependencies
```

Example:

```text
sourceTruth.process.localization.translationUpdate
  reads:
    docs/architecture/06-i18n.md
    data/strings/source/**
    data/arcs-v2.json

  touches:
    data/strings/source/**

  affects:
    data/strings/compiled/**
    data/arc-bundles/**
    dist/**
    sw.js

  checks:
    strings-compile
    build-arc-bundles
    build-vextreme
    build-sw

  handoff:
    sourceTruth.handoff.localization.translationUpdate
```

### Reverse map

```text
changed file → affected processes
```

Example:

```text
data/arcs-v2.json changed
  may affect:
    archive/index projection
    terrain map
    arc-bundled localization
    page navigation
    content grouping
    process routing for arc-scoped work
```

---

## 17. Binding health

Processes should have health states.

Possible states:

```text
healthy
stale
missing binding
orphaned process
orphaned role extension
unverified after source change
generated artifact out of sync
handoff contract missing
choice fork unhandled
escalation path missing
projection not reversible
round-trip key missing
import conflict unresolved
```

This lets the system perceive:

```text
The localization process may be stale because i18n architecture changed.
```

rather than only:

```text
A file changed.
```

---

## 18. Lost binding detection

The system should detect cases like:

```text
A process references a file that no longer exists.

A role extension references a check that no longer exists in package.json.

A boot packet says to touch data/strings/source/**,
but string architecture moved elsewhere.

A generated artifact depends on a source file,
but no process claims responsibility for updating it.

A process has a handoff output,
but no downstream process consumes it.

A task type exists,
but no process route handles it.

A known choice fork exists,
but no process defines what to do when it appears.

An output profile exports a row without a round-trip key.

An import profile allows changing a locked identity field.

A variant column is imported as a replacement without explicit approval.
```

These are organizational coordination errors, not merely code errors.

---

## 19. Suggested system checks

Potential checks:

```text
check-process-bindings
check-role-extension-bindings
check-process-source-generated-boundaries
check-process-handoff-contracts
check-task-routing-coverage
check-stale-boot-packets
check-process-forks
check-source-truth-paths
check-output-profile-roundtrip
check-import-profile-locks
check-projection-manifest-staleness
check-variant-routing
```

Purpose:

```text
Notify future AI or human collaborators when the organization has lost a process binding,
not only when the code fails to build.
```

---

## 20. Process formation lifecycle

This discussion itself is a process formation event.

It should not be treated as final implementation, but it should not be lost.

### Maturity states

```text
concept
  The idea is being discussed but not yet structured.

pattern-draft
  The idea has been described enough to preserve and relay.

POC
  The idea has a rough implementation or worked example.

pilot
  The process is being used in one bounded case.

integrated
  The process is part of normal system operation.

optimized
  The process has been refined after evidence.

superseded
  A newer process replaced it.

deprecated
  It remains historically useful but should not be used for new work.
```

### Process formation loop

```text
Meta discussion
  → pattern capture
  → process draft
  → POC / worked example
  → pilot with bounded scope
  → impact map
  → integration decision
  → binding updates
  → verification checks
  → continuity record
  → optimization / replacement cycle
```

### This document's current maturity

```text
Pattern name:
  Process Grammar + Reversible Dimensional Source Truth

Maturity:
  pattern-draft

Evidence:
  conceptual model formed
  translation pilot identified
  source truth / projection / import / process binding implications described

Missing before POC:
  concrete sourceTruth schema
  sample source truth map
  sample export spreadsheet
  sample import diff
  validation rules
  conflict handling
  source/generated update path
  screenshot/check pipeline
```

---

## 21. Optimization process path

A process architecture also needs a way to optimize and replace processes safely.

### Optimization lifecycle

```text
Identify optimization opportunity
  → map affected processes
  → map affected source-truth dimensions
  → map affected role extensions
  → identify preserved contracts
  → introduce replacement module
  → run binding checks
  → compare old vs new outputs
  → pilot behind flag / candidate path
  → promote if stable
  → deprecate old path
  → record continuity
```

### Safe replacement requires contracts

Each process/module should expose:

```text
inputs
outputs
round-trip keys
allowed side effects
generated artifacts affected
verification commands
downstream consumers
failure modes
deprecation path
```

Example:

```text
Old module:
  localization.csvExportV1

New module:
  localization.xlsxExportV2

Contract preserved:
  sourceTruthPath
  uiElementKey
  languageCode columns
  sourceHash
  importDiff format

Downstream unaffected:
  translation import process
  screenshot verification
  continuity handoff
```

---

## 22. Process grammar

This architecture can be understood like grammar.

A grammar is not merely a list of words.

It defines which types can bind to which other types and what their relationship means.

### Organizational grammar analogy

```text
Source truth = vocabulary
Processes = verbs
Roles = capability forms
Bindings = grammar rules
Forks = conditional clauses
Checks = agreement validation
Handoffs = sentence boundaries
Continuity = narrative memory
```

### Example sentence

```text
Task activates Process.
Process summons Role Extension.
Role Extension loads Context Corridor.
Context Corridor fetches Source Truth.
Source Truth projects through Output Profile.
Output Profile returns through Import Profile.
Import Profile produces Diff.
Diff routes through Verification.
Verification updates Status.
Status informs Continuity.
Continuity affects future boot context.
```

This is not just metadata.

It is syntax for organizational action.

---

## 23. Proposed file structure

Possible future files:

```text
docs/processes/
  INDEX.md
  localization.translation-update.md
  localization.translation-import.md
  ux.copy-variant.md
  testing.traceability-update.md
  terrain-map.update.md
  continuity.session-close.md
  process.formation.md
  process.optimization.md

docs/role-extensions/
  process-dispatcher.md
  translation-content-extension.md
  i18n-implementation-extension.md
  localization-auditor-extension.md
  cultural-review-extension.md
  continuity-logger-extension.md

data/source-truth-map.json
data/task-routes.json
data/process-bindings.json
data/role-extensions.json
data/process-forks.json
data/output-profiles.json
data/import-profiles.json
data/process-health.json

lib/build-process-map.js
lib/build-source-truth-map.js
lib/export-projection.js
lib/import-projection.js
lib/check-process-bindings.js
lib/check-role-extension-bindings.js
lib/check-task-routing-coverage.js
lib/check-process-forks.js
lib/check-output-profile-roundtrip.js
lib/check-import-profile-locks.js

data/process-map.json
data/source-truth-index.json
pages/process-map.html
pages/source-truth-map.html
```

This mirrors Vextreme's existing pattern:

```text
human-readable docs
+ machine-readable source registries
+ generated projections
+ checks/audits
+ visible map surfaces
```

---

## 24. Suggested implementation phases

### Phase 1 — Preserve as context note / lessons doc

Create:

```text
docs/continuity/context-notes/meta-project-process-grammar.md
```

Optionally register it in:

```text
docs/continuity/CONTEXT-NOTES.md
```

Goal:

```text
Preserve the full trajectory without claiming implementation is accepted.
```

### Phase 2 — Create first process docs

Create:

```text
docs/processes/INDEX.md
docs/processes/localization.translation-update.md
docs/processes/process.formation.md
docs/role-extensions/translation-content-extension.md
docs/role-extensions/process-dispatcher.md
```

Goal:

```text
Make the pattern readable before making it executable.
```

### Phase 3 — Define machine-readable source truth schema

Create draft:

```text
data/source-truth-map.json
```

or split:

```text
data/source-truth/processes.json
data/source-truth/role-extensions.json
data/source-truth/forks.json
data/source-truth/output-profiles.json
data/source-truth/import-profiles.json
```

Goal:

```text
Decide whether one nested map or domain-split maps are cleaner.
```

### Phase 4 — Pilot translation projection

Create a minimal source-truth sample for one existing i18n page/arc.

Build:

```text
translation export
translation import diff
round-trip key validation
replace-vs-candidate routing
```

Goal:

```text
Prove reversible projection on one honorable translation case.
```

### Phase 5 — Add checks

Start advisory, not blocking:

```text
check-source-truth-paths
check-output-profile-roundtrip
check-import-profile-locks
check-process-bindings
```

Goal:

```text
Detect lost organizational bindings without blocking too early.
```

### Phase 6 — Build visible maps

Eventually generate:

```text
data/process-map.json
pages/process-map.html
data/source-truth-index.json
pages/source-truth-map.html
```

Goal:

```text
Make process topology and source-truth dimensions visible, like Terrain Map did for repo topology.
```

---

## 25. Questions for Claude

Claude should help hone these questions before implementation:

1. Should this first live as a context note, a lessons doc, or both?
2. Should the source-truth dimensional map be one nested file or split domain files?
3. What naming convention should be used?
4. Should process docs use dot notation matching machine keys?
5. What is the smallest translation pilot that proves reversible projection without overbuilding?
6. Should `outputProfile` and `importProfile` be separate categories or two directions of one `projectionProfile`?
7. Should process-binding checks be advisory only at first?
8. How should process maturity be represented?
9. Should candidate variants live inside source truth, or in a separate proposal/staging registry?
10. What is the cleanest way to avoid treating this draft as accepted architecture before a real POC exists?

---

## 26. What Claude should preserve

Claude should preserve these lessons:

```text
1. Roles are not beings; roles are named capability extensions.
2. Processes are not checklists; processes are executable context paths.
3. Delegation is not management; delegation is task-to-process routing.
4. Onboarding is not "read everything"; onboarding is loading the smallest sufficient corridor.
5. Source truth is not a flat database; it is a dimensional map of fetchable truth paths.
6. Outputs are not dead artifacts when they carry round-trip keys; they become reversible interfaces.
7. Imports should route through processes, not overwrite source truth blindly.
8. Variants should not corrupt current values; they should stage through candidate paths.
9. Incomplete process ideas need process-formation state, not premature official status.
10. Optimizing processes requires impact maps, preserved contracts, and safe replacement paths.
11. Organizational process categories can compose like grammar.
```

---

## 27. One-line compression

```text
The Meta Project turns Vextreme from an AI-readable repository into an AI-routable organization whose source truth, process paths, role extensions, projections, imports, checks, and continuity all have stable relational addresses.
```

---

## 28. Final compression

```text
User intent
  → Task route
  → Source-truth dimensional fetch
  → Process binding
  → Role extension
  → Context corridor
  → Known forks
  → Projection / import path
  → Verification
  → Handoff
  → Continuity
```

And recursively:

```text
Emerging process idea
  → Process formation map
  → Pattern draft
  → POC
  → Pilot
  → Integration
  → Binding checks
  → Optimization path
  → Safe replacement
  → Continuity
```

Central principle:

```text
Nothing becomes official just because it sounds good.
Nothing gets lost just because it is not official yet.
```

<!-- [VXG RealForever] -->
