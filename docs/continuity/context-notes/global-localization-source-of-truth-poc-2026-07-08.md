<!--
  VEXTREME — Context Note
  Registered in docs/continuity/CONTEXT-NOTES.md. Status: north-star/pattern-draft,
  not adopted architecture in full. See docs/continuity/batch-003/2026-07-08-session-027.md
  for what was actually built from this (a small additive pilot, not this document's
  full scope).
-->

## Wrapper — how this note relates to what's actually in the repo (added Session 027)

Victor uploaded `GLOBAL_LOCALIZATION_SOURCE_OF_TRUTH_POC.md` (below, preserved in full) asking
whether it "made sense" against the live repo. The review found real value in its core pattern
(canonical vs. observed identity, pointer-indexes-not-duplicated-records, query→hydrate→project)
but flagged that, as literally scoped — `/localization/` next to `data/strings/`, `/scripts/`
next to `lib/`, 18 scripts, cross-platform/vendor/design-ID indexes, a guarded source-code
auto-rewrite tool — it repeated PR #69's exact structural risk (a full parallel system proposed
beside working infrastructure) at a considerably larger scale, and designed for platforms
(iOS/Android/Figma/QA tools) that don't exist in this repo.

Victor relayed Vex's confirmation and a narrowed build plan across two follow-up documents
(both preserved in full below): the POC stays north-star context, not a literal build order;
`pe-014` remains a separate, code/build-symbol-scoped domain; the actual build target is a tiny
additive canonical/observed identity overlay on the *existing* `data/strings/` pipeline, piloted
on one real page (`victor-methodology-presentation`). That pilot is what actually shipped —
`lib/discover-string-identity.js`, `lib/build-string-identity-index.js`,
`lib/check-string-identity.js` — see Session 027's own continuity file for what was built, what
was found (the canonical/observed split already existed unindexed in the page's own HTML), and
what remains deliberately deferred (query/projection UI, HTML review page, change-history panel,
approval-signoff ledger, platform-rehydration adapters — all named in the addendum below as real
future direction, none built yet).

Everything below is preserved verbatim, in the order it was authored, per this repo's own
context-note convention (preserved reasoning, not flattened) and per the documents' own explicit
instruction to keep the full scalable architecture visible even though implementation stayed
small.

---

# Document 1 — GLOBAL_LOCALIZATION_SOURCE_OF_TRUTH_POC.md (as uploaded)

# Global Localization Source-of-Truth POC
## Git-Native Dimensional Map, Bidirectional Identity Registry, Queryable Projections, and Screenshot-Aware Navigation

**Anchor:** `[VXG RealForever]`
**Checkpoint time:** 1:00 AM, July 8, 2026
**Authoring context:** Victor Gong + Vex architectural planning session
**Document purpose:** Relayable POC architecture for Claude/Codex/AI implementation handoff
**Status:** Full scalable POC design, not a minimum viable product

---

## 0. Executive Summary

This POC defines a **global localization source-of-truth system** that stays as close to GitHub as possible while providing database-like search, relationship visibility, generated outputs, screenshot traversal, and identity-alignment support across platforms, projects, languages, design, QA, and source code.

The central idea is:

```text
Truth once.
Pointers many.
Views generated.
Caches selective.
Scripts reduce mechanical risk.
Humans govern semantic authority.
```

This system is not merely a localization spreadsheet. It is a **dimensional identity registry** that can answer questions such as:

- Where is this English string used?
- Which Chinese translation corresponds to this UI element?
- Which screenshots show this element?
- Which platforms have misaligned IDs for this same conceptual element?
- Which string IDs are duplicates or fragmented across systems?
- Which source files need to change if the canonical ID changes?
- Which vendor packet should be generated for a specific page, section, language, or status?
- Which QA screenshots should be reviewed for layout risk after translation?
- Which code/design/test IDs all point to the same user-facing element?

The system is intentionally Git-native first. GitHub can serve as the visible, reviewable ledger. Build scripts provide database-like behavior by generating pointer indexes, query outputs, validation reports, schema migrations, and cached projections. A database/API remains an optional later migration path, not a day-one requirement.

---

## 1. Problem Statement

Most localization systems store translated strings but fail to preserve the full relationship context around those strings.

Typical systems can answer:

```text
string_id → translated text
```

But they often struggle to answer:

```text
string_id → canonical UI element → platform usages → source files → screenshots → QA status → design ID → VnV/test ID → alignment status
```

This creates recurring organizational problems:

1. **String drift** — the same meaning appears under different IDs across systems.
2. **Platform fragmentation** — Android, iOS, Web, Figma, QA, and vendor tools use different identifiers for what is conceptually the same element.
3. **Screenshot disconnection** — screenshots are used as visual aids, but they do not become traversable identity evidence.
4. **Developer relay overhead** — translation tools may show screenshots, but changing IDs or source code still requires a separate manual relay back to engineering.
5. **Lost context between tools** — vendors, QA, designers, and engineers each hold partial context.
6. **AI cold-start cost** — AI coding tools must rediscover relationships unless the repository exposes them explicitly.

The goal of this POC is to build a source-of-truth system where localization, identity alignment, screenshots, and source-code impact can engage through the same map.

---

## 2. Core Architecture Principle

The system should not permanently store every possible output.

Instead, it stores **canonical relationship truth once**, then generates the requested view.

```text
Canonical Registry
        ↓
Generated Pointer Indexes
        ↓
Query Engine
        ↓
Projection Builder
        ↓
CSV / QA Report / Screenshot Packet / Runtime Bundle / Code Impact Report
```

The output is not the source of truth. The output is a **projection**.

---

## 3. Primary Design Goals

### 3.1 GitHub-native first

The system should remain close to GitHub because Git provides version history, pull request review, diff visibility, accountability, AI-readable context, deterministic generated artifacts, rollback, commit receipts, and low infrastructure cost.

The architecture should behave like a database without requiring database infrastructure on day one.

### 3.2 Queryable from many entry points

A user should be able to begin from any known ID or category:

```text
canonicalElementId
currentElementId
canonicalStringId
currentStringId
legacyId
pageSlug
sectionId
contentNodeKey
language
status
platform
project
screenshotId
designId
testId
sourceFile
vendorBatch
```

The system resolves the input into the surrounding context.

### 3.3 Preserve canonical and observed identities separately

The system must distinguish:

```text
canonical identity
  = what the organization agrees this element/string should be called

observed/current identity
  = what a specific system currently calls it
```

This prevents the registry from hiding misalignment.

### 3.4 Generated outputs, not permanent spreadsheet truth

CSV files, vendor packets, QA reports, and screenshot lists should be generated from query configurations. They may be cached when useful, but they are not the authority.

### 3.5 Support ID alignment and source-code change

The system should eventually do more than export strings. It should help detect and align IDs, including source-code impact paths.

This is where the POC becomes stronger than ordinary localization screenshot tools.

---

## 4. Mental Model

The system has five major layers:

```text
1. Canonical Truth Layer
   Full relationship records live here.

2. Pointer Index Layer
   Lightweight lookup maps point into canonical records.

3. Query Layer
   Users/tools request context from any supported entry point.

4. Projection Layer
   Outputs are generated as CSV/table/report/runtime bundles.

5. Governance + Validation Layer
   Scripts handle mechanical checks; humans approve semantic decisions.
```

---

## 5. Core Data Model

### 5.1 Canonical Element Record

The central record is the canonical UI/content element.

```json
{
  "canonicalElementId": "dossier.header.thesis",
  "canonicalStringId": "pages.victor-methodology-presentation.header.thesis",
  "semanticRole": "Header thesis statement for the Victor methodology dossier",
  "domain": "pages",
  "surfaceKey": "victor-methodology-presentation",
  "contentNodeKey": "header",
  "fieldKey": "thesis",
  "placement": {
    "sectionId": "page-dossier-root",
    "legacyId": "DOSSIER-ROOT",
    "elementPath": "header > .thesis",
    "sourceFile": "pages/victor-methodology-presentation.html"
  },
  "languages": {
    "en": {
      "text": "Finding every place people are forced to assume — and replacing each with a map that makes the assumption safe.",
      "status": "source"
    },
    "zh-CN": {
      "text": "找出所有人们被迫依靠假设的地方——用一张地图取代每一个假设，让它变得可靠。",
      "status": "approved",
      "reviewedBy": "Victor",
      "updatedAt": "2026-07-08"
    }
  },
  "observedUsages": [
    {
      "platform": "web",
      "project": "vextreme",
      "currentElementId": "page-dossier-root.header.thesis",
      "currentStringId": "pages.victor-methodology-presentation.header.thesis",
      "status": "aligned",
      "sourceFile": "pages/victor-methodology-presentation.html",
      "screenshotRefs": [
        "screenshots/web/victor-methodology-presentation/header.zh-CN.png"
      ]
    }
  ],
  "workflow": {
    "alignmentStatus": "aligned",
    "translationStatus": "approved",
    "riskLevel": "low",
    "notes": []
  }
}
```

---

## 6. Current String Syntax Categories

The current `data-i18n` syntax in the sample HTML follows this structure:

```text
domain.surfaceKey.contentNodeKey.fieldKey
```

Example:

```text
pages.victor-methodology-presentation.header.thesis
```

Breakdown:

| Segment | Category | Example |
|---|---|---|
| 1 | `domain` | `pages` |
| 2 | `surfaceKey` / `pageSlug` | `victor-methodology-presentation` |
| 3 | `contentNodeKey` / group | `header` |
| 4 | `fieldKey` | `thesis` |

The dotted key is not merely a string. It is a generated address composed of queryable categories.

---

## 7. Nested Map vs Flat Key

A flat dotted key is useful for HTML `data-i18n`, CSV export, and runtime lookup.

But as source truth, it loses category visibility.

Preferred model:

```text
Nested / canonical source model
  → preserves category hierarchy

Flat dotted key
  → generated address / runtime lookup / CSV projection
```

Source side:

```text
pages
  victor-methodology-presentation
    header
      thesis
```

Projection side:

```text
pages.victor-methodology-presentation.header.thesis
```

Both are useful. The nested model is the terrain. The dotted key is the address.

---

## 8. Bidirectional Identity Registry

The system should support both forward and reverse traversal.

Forward traversal:

```text
canonicalElementId
  → canonicalStringId
  → languages
  → observed usages
  → screenshots
  → source files
```

Reverse traversal:

```text
any known ID
  → reverseIdentityIndex
  → canonicalElementId
  → full context
```

This supports the original “get key from value” design:

```text
known current value
  ↓
find owning canonical key
  ↓
retrieve full dimensional context
```

The optimized version uses prebuilt reverse indexes rather than scanning every record each time.

---

## 9. Registry Container Design

Use one registry container with multiple internal maps.

```text
LocalizationIdentityRegistry
│
├── canonicalElementMap
│   canonicalElementId → full relationship context
│
├── reverseIdentityIndex
│   any observed/current/legacy ID → canonicalElementId
│
├── queryIndexes
│   page/platform/language/status/etc. → canonicalElementId[]
│
├── schemaMetadata
│   schema version, source hashes, generation time
│
└── projections
    generated CSV / QA / screenshot / runtime outputs
```

The maps are conceptually separate but belong to one registry system.

---

## 10. Avoiding Redundancy

The canonical map stores full truth. Indexes only store references.

Bad pattern:

```text
byPage stores full records
byLanguage stores full records
byStatus stores full records
```

Good pattern:

```text
byPage → [canonicalElementId]
byLanguage → [canonicalElementId]
byStatus → [canonicalElementId]
```

Then the query engine hydrates records:

```text
index result IDs
  ↓
canonicalElementMap[id]
  ↓
output selected fields
```

Principle:

```text
Duplicate references, not records.
```


---

## 11. Queryable Categories

The POC should support query categories such as:

| Query category | Example query | Result |
|---|---|---|
| by full string ID | `pages.victor-methodology-presentation.header.thesis` | Full canonical context |
| by canonical element ID | `dossier.header.thesis` | Full canonical context |
| by current element ID | `page-dossier-root.header.thesis` | Canonical owner + usage |
| by current string ID | `picture_title_main` | Canonical owner + mismatch status |
| by page | `victor-methodology-presentation` | All strings/elements on page |
| by section | `section-proofs` | All section strings |
| by prefix/group | `proof` | All proof-related records |
| by field | `title`, `body`, `result` | Matching field records |
| by language | `zh-CN` | Strings with Chinese values |
| by missing language | `ja` missing | Missing Japanese report |
| by status | `needs_alignment` | Alignment worklist |
| by platform | `ios` | iOS observed usages |
| by screenshot | `screenshot.web.vmp.header.zh-CN` | Elements captured in screenshot |
| by design ID | Figma node ID | Canonical element context |
| by test ID | VnV test ID | Traceability context |
| by source file | HTML/JS file path | All related records |
| by vendor batch | batch ID | Vendor packet context |

---

## 12. Projection Types

The system should generate views on demand.

### 12.1 CSV localization table

```text
page_slug
section_id
canonical_element_id
current_element_id
canonical_string_id
current_string_id
field_key
en
zh-CN
ja
status
notes
```

### 12.2 Vendor packet

Includes only selected languages, source text, context notes, screenshots, and approval requirements.

### 12.3 QA screenshot packet

Groups screenshots by page, language, element, and layout-risk status.

### 12.4 Misalignment report

Shows canonical identities with current platform IDs that do not match the approved source of truth.

### 12.5 Missing translation report

Shows all required strings missing a selected language.

### 12.6 Runtime language bundle

Generates the key-value object consumed by the website or app runtime.

### 12.7 Source-code impact report

Shows which files, IDs, and runtime bundles would change if an ID alignment action is applied.

---

## 13. Screenshot-Aware Navigation

Screenshots should not be passive attachments. Screenshots should become traversable evidence nodes.

A screenshot can hold:

```json
{
  "screenshotId": "screenshot.web.vmp.header.zh-CN",
  "path": "screenshots/web/victor-methodology-presentation/header.zh-CN.png",
  "platform": "web",
  "language": "zh-CN",
  "pageSlug": "victor-methodology-presentation",
  "capturedElements": [
    "dossier.header.eyebrow",
    "dossier.header.thesis",
    "dossier.header.id-line",
    "dossier.header.stamp"
  ],
  "layoutRisk": {
    "status": "needs_review",
    "reason": "stamp layout differs between English and Chinese"
  }
}
```

This enables traversal:

```text
screenshot
  → captured elements
  → canonical string IDs
  → translations
  → source files
  → platform usages
  → alignment status
```

This is one of the key improvements over tools that only show screenshots as static translation context.

---

## 14. How This Can Be Better Than Applanga-Like Workflows

The goal is not only to provide screenshots for translators.

The larger goal is to let the screenshot, string, element identity, source code, and platform IDs all participate in one nervous system.

Typical localization screenshot workflow:

```text
screenshot shown to translator
  ↓
translator edits string
  ↓
developer separately receives issue
  ↓
developer manually changes code / ID / placement
```

Proposed Vextreme-style workflow:

```text
screenshot selected
  ↓
captured element resolved
  ↓
canonical identity loaded
  ↓
current platform IDs compared
  ↓
translation/status/source impact shown
  ↓
alignment action proposed
  ↓
source-code change path generated
  ↓
PR/test/QA packet generated
```

The system supports not only translation, but ID alignment and source-code traceability.

---

## 15. Script Capability Stack

This POC explicitly names scripts by capability so an implementation AI can see what needs to exist and why.

### 15.1 Extraction script — `extract-i18n-from-html.js`

Purpose:

- scan HTML files,
- find `data-i18n`,
- capture visible English,
- capture placement path,
- capture section/container IDs,
- capture legacy IDs,
- emit candidate canonical records.

Input:

```text
pages/**/*.html
```

Output:

```text
localization/source/extracted-candidates.json
```

### 15.2 Canonical registry builder — `build-canonical-localization-registry.js`

Purpose:

- merge approved source records,
- preserve canonical IDs,
- attach observed usages,
- normalize fields,
- emit canonical registry.

Input:

```text
localization/source/*.json
```

Output:

```text
localization/generated/canonical-registry.json
```

### 15.3 Index builder — `build-localization-indexes.js`

Purpose:

- generate pointer indexes from canonical records,
- build reverse identity maps,
- build category indexes.

Indexes generated:

```text
byCanonicalElementId
byCanonicalStringId
byCurrentElementId
byCurrentStringId
byLegacyId
byPage
bySection
byContentNode
byField
byLanguage
byMissingLanguage
byPlatform
byProject
byStatus
byScreenshotId
byDesignId
byTestId
bySourceFile
```

Input:

```text
canonical-registry.json
```

Output:

```text
localization/generated/indexes.json
```

### 15.4 Query engine — `query-localization.js`

Purpose:

- accept query configuration,
- resolve IDs through indexes,
- hydrate canonical records,
- return structured result.

Example query:

```json
{
  "input": "pages.victor-methodology-presentation.header.thesis",
  "inputType": "auto",
  "languages": ["en", "zh-CN"],
  "includeScreenshots": true,
  "includeAlignment": true
}
```

### 15.5 Projection builder — `build-localization-projection.js`

Purpose:

- convert query results into human-facing outputs.

Supported outputs:

```text
CSV
JSON
Markdown report
HTML report
runtime bundle
QA screenshot packet
vendor packet
source-code impact report
```

### 15.6 Runtime bundle builder — `build-language-bundles.js`

Purpose:

- generate runtime translation bundles,
- ensure only approved/allowed strings ship,
- support fallback rules.

Output:

```text
dist/i18n/en.json
dist/i18n/zh-CN.json
dist/i18n/ja.json
```

### 15.7 Screenshot mapping script — `build-screenshot-evidence-map.js`

Purpose:

- associate screenshots with page/language/platform/context,
- optionally ingest screenshot metadata,
- connect screenshots to captured canonical element IDs.

Output:

```text
localization/generated/screenshot-map.json
```

### 15.8 Alignment detector — `detect-identity-misalignment.js`

Purpose:

- compare current IDs against canonical IDs,
- detect duplicate current IDs,
- detect canonical collisions,
- flag platform-specific drift.

Output:

```text
localization/reports/misaligned-identities.json
```

### 15.9 Missing translation detector — `detect-missing-translations.js`

Purpose:

- find missing language values,
- find incomplete plural/variant sets,
- find untranslated fallback strings.

Output:

```text
localization/reports/missing-translations.csv
```

### 15.10 Layout-risk detector — `detect-layout-risk.js`

Purpose:

- compare text length ratios,
- detect risky scripts/locales,
- detect likely overflow,
- flag screenshot review.

Output:

```text
localization/reports/layout-risk.json
```

### 15.11 Placeholder validator — `validate-placeholders.js`

Purpose:

- ensure placeholders are preserved,
- ensure HTML tags are allowed,
- ensure ICU/plural arguments match.

Examples:

```text
{name}
{count}
%s
<code>
<strong>
```

### 15.12 Schema validator — `validate-localization-schema.js`

Purpose:

- validate source records against schema,
- fail on required field absence,
- warn on deprecated fields,
- detect unknown categories.

Input:

```text
localization/schema/localization-registry.schema.json
```

### 15.13 Schema migrator — `migrate-localization-schema.js`

Purpose:

- upgrade old registry records to new schema versions,
- preserve old IDs as aliases,
- produce migration report.

Example:

```text
v1 → v2
```

### 15.14 Drift validator — `validate-generated-localization.js`

Purpose:

- check whether generated indexes/projections are stale,
- compare source hash to generated hash,
- fail CI if generated outputs are out of date.

### 15.15 Collision detector — `detect-identity-collisions.js`

Purpose:

- detect one current ID mapped to multiple canonical IDs,
- detect one string ID used with conflicting English source,
- detect duplicate canonical IDs.

### 15.16 Semantic review queue generator — `build-semantic-review-queue.js`

Purpose:

- surface possible duplicates,
- surface risky merges,
- surface ambiguous canonical identity matches,
- produce human review packet.

Important: this script should not silently merge semantic records.

### 15.17 Source-code impact planner — `build-source-impact-report.js`

Purpose:

- list files that must change if a canonical ID/string ID alignment is applied,
- show before/after IDs,
- generate PR checklist.

### 15.18 Apply-approved-alignment script — `apply-approved-identity-alignment.js`

Purpose:

- only after human approval,
- update source code IDs/string IDs,
- update registry,
- regenerate bundles/indexes,
- create change report.

This should be guarded and never run silently.


---

## 16. Script Chain

The full build chain may look like:

```text
extract-i18n-from-html
        ↓
validate-localization-schema
        ↓
migrate-localization-schema if needed
        ↓
build-canonical-localization-registry
        ↓
build-localization-indexes
        ↓
detect-identity-collisions
        ↓
detect-identity-misalignment
        ↓
detect-missing-translations
        ↓
validate-placeholders
        ↓
detect-layout-risk
        ↓
build-screenshot-evidence-map
        ↓
build-language-bundles
        ↓
build-localization-projection
        ↓
validate-generated-localization
```

For PRs:

```text
source change
  ↓
extract
  ↓
validate
  ↓
rebuild indexes
  ↓
generate reports
  ↓
screenshot diff / QA packet
  ↓
review
```

---

## 17. Con → Mitigation → Remaining Con Matrix

| Con / Risk | Script or Process Mitigation | Remaining Concern |
|---|---|---|
| Indexes drift from source truth | `build-localization-indexes.js` + drift validator | Builder must match schema |
| Schema evolves | schema validator + migrator | Migration may need semantic review |
| Duplicate IDs | collision detector | Human decides intended canonical owner |
| Missing translations | missing translation detector | Translator/reviewer must fill/approve |
| Placeholder mismatch | placeholder validator | Complex grammar may need expert review |
| Layout overflow | layout-risk detector + screenshot QA | Visual approval still human |
| Similar strings duplicated | semantic review queue | Human decides whether meaning is same |
| Canonical identity mismatch | misalignment detector | Human or governance approval required |
| Source code needs ID updates | source impact report + guarded apply script | Risky changes need PR review |
| Vendor handoff drift | generated vendor packets | Vendor may need context clarification |
| Cached projections stale | source hash + generated hash check | CI must be enforced |
| Too many query paths | pointer indexes generated from source | Query UX needs design |
| Git merge conflicts | split source files + deterministic generation | High-concurrency editing may require DB later |
| Role permissions | CODEOWNERS / PR review / future UI roles | True live permission model may need service |
| Translation quality | checks + review packet | Human language authority required |

---

## 18. When Scripts Are Enough

Scripts are good for mechanical concerns:

```text
extract
validate
migrate
build
index
detect
compare
generate
report
fail CI
```

Scripts are not enough for semantic or governance concerns:

```text
Should these two strings be merged?
Who has authority to approve Chinese?
Is this translation culturally correct?
Should this ID be canonical?
Should this platform adopt the shared ID now?
```

Rule:

```text
If the con is mechanical, script it.
If the con is semantic, surface it.
If the con is organizational, govern it.
```

---

## 19. Git-Native vs Database

### 19.1 Why stay Git-native first

Git is preferred for this POC because:

- source truth is visible,
- changes are reviewable,
- AI can read the repository,
- generated artifacts can be checked,
- history is preserved,
- infra is minimal,
- PRs become decision records.

This gives “database behavior without database infra.”

### 19.2 What Git-native can support

```text
structured JSON source
generated pointer indexes
query scripts
projection builders
schema validation
migration scripts
CI gates
cached reports
runtime bundles
```

### 19.3 When database becomes justified

A database becomes justified when the organization needs:

- live multi-user editing,
- fine-grained permissions,
- very high query volume,
- non-technical UI editing,
- transactions,
- external tool access through APIs,
- very large data sets,
- real-time collaboration.

Until then:

```text
Git as ledger.
Indexes as acceleration.
Functions as query layer.
Projections as views.
Database optional.
```

---

## 20. Suggested Repository Structure

```text
/localization
  /source
    canonical-elements.json
    strings.json
    language-values.json
    screenshot-evidence.json
    identity-aliases.json

  /schema
    localization-registry.schema.json
    localization-registry.v1.json
    localization-registry.v2.json

  /migrations
    migrate-v1-to-v2.js

  /generated
    canonical-registry.json
    indexes.json
    screenshot-map.json
    projection-manifest.json
    runtime-bundles/
      en.json
      zh-CN.json
      ja.json

  /reports
    missing-translations.csv
    misaligned-identities.json
    layout-risk.json
    semantic-review-queue.md
    source-impact-report.md

  /queries
    page-victor-methodology-en-zh.json
    proof-records-zh-CN.json
    misaligned-ios.json

/scripts
  extract-i18n-from-html.js
  validate-localization-schema.js
  migrate-localization-schema.js
  build-canonical-localization-registry.js
  build-localization-indexes.js
  query-localization.js
  build-localization-projection.js
  build-language-bundles.js
  build-screenshot-evidence-map.js
  detect-identity-misalignment.js
  detect-missing-translations.js
  detect-layout-risk.js
  validate-placeholders.js
  validate-generated-localization.js
  detect-identity-collisions.js
  build-semantic-review-queue.js
  build-source-impact-report.js
  apply-approved-identity-alignment.js
```

---

## 21. Query Configuration Shape

```json
{
  "queryName": "proof-records-zh-CN",
  "filters": {
    "pageSlug": "victor-methodology-presentation",
    "contentNodePrefix": "proof",
    "status": ["approved", "needs_review"]
  },
  "languages": ["en", "zh-CN"],
  "include": {
    "canonicalElementId": true,
    "currentElementId": true,
    "canonicalStringId": true,
    "currentStringId": true,
    "placement": true,
    "screenshots": true,
    "alignmentStatus": true,
    "notes": true
  },
  "output": {
    "format": "csv",
    "path": "localization/reports/proof-records-zh-CN.csv"
  }
}
```

---

## 22. Query Resolution Logic

### 22.1 Resolve context from any ID

```text
inputId
  ↓
auto-detect or search reverseIdentityIndex
  ↓
canonicalElementId
  ↓
canonicalElementMap[canonicalElementId]
  ↓
hydrate related records
  ↓
return context
```

### 22.2 Search by category

```text
query category
  ↓
queryIndexes[category][value]
  ↓
canonicalElementIds[]
  ↓
canonical records hydrated
  ↓
projection generated
```

### 22.3 Screenshot traversal

```text
screenshotId
  ↓
byScreenshotId index
  ↓
canonicalElementIds captured in screenshot
  ↓
string IDs + language values + source files
  ↓
alignment report / QA context
```

---

## 23. Edge Cases to Consider Early

### 23.1 One English string used by multiple canonical elements

Example:

```text
"Continue"
```

May appear in different contexts and should not always share one string ID.

Need:

```text
semantic reuse policy
context required flag
possible duplicate report
```

### 23.2 One canonical element has multiple current string IDs

This indicates fragmentation.

Need:

```text
needs_alignment status
source impact report
approval before merge
```

### 23.3 One current ID maps to multiple canonical elements

This is a collision.

Need:

```text
collision detector
fail or high-risk review
```

### 23.4 Translation differs by context

Same English may require different translation depending on UI role.

Need:

```text
context-specific translation support
do not over-merge
```

### 23.5 Language has variants

Example:

```text
zh-CN
zh-TW
formal/informal
short/long
gendered/plural
```

Need language object, not flat text only.

### 23.6 Pluralization

Need ICU-like variants:

```json
{
  "one": "{count} file",
  "other": "{count} files"
}
```

For languages without plural distinction, still validate required fallback.

### 23.7 Placeholder preservation

If English contains `{count}`, translation must preserve compatible placeholder.

### 23.8 HTML/markup preservation

Strings containing `<code>`, `<strong>`, or inline HTML must be validated.

### 23.9 Screenshot language mismatch

Screenshot claims `zh-CN`, but rendered page still shows English fallback.

Need screenshot QA detection or manual flag.

### 23.10 Moved element

Element moves from header to footer but retains canonical identity.

Need placement history:

```text
same canonicalElementId
new placement path
same translation history
```

### 23.11 Deleted element

Need tombstone record or deprecation status, not immediate deletion.

### 23.12 Renamed canonical ID

Need alias preservation and migration.

### 23.13 Vendor sends translation for old ID

Reverse aliases should resolve old ID to canonical ID if safe.

### 23.14 Generated file manually edited

Need generated-file warning and drift check.

### 23.15 Git merge conflicts

Split source files by page/domain/language to reduce collisions.

### 23.16 AI-generated mistaken merge

Semantic review queue should prevent silent canonical merges.

---

## 24. Stability Then Navigation Capacity

The first stable milestone is:

```text
source records
  → generated indexes
  → queryable projections
```

After stability, expand navigation capacity:

```text
screenshots become traversable nodes
source files become traversable nodes
platform IDs become traversable nodes
design IDs become traversable nodes
test IDs become traversable nodes
vendor batches become traversable nodes
PRs become traversable decision records
```

The long-term direction is a localization nervous system where every artifact can lead to its surrounding context.

---

## 25. Implementation Phases

### Phase 0 — Map and naming agreement

- Confirm canonical terms.
- Confirm source/projection boundaries.
- Confirm first page sample.
- Confirm schema v1.

Deliverables:

```text
architecture doc
schema draft
Lucidchart process map
```

### Phase 1 — Extract from sample HTML

- Parse `data-i18n`.
- Extract English text.
- Capture placement.
- Emit candidate records.

Scripts:

```text
extract-i18n-from-html.js
validate-localization-schema.js
```

### Phase 2 — Build canonical registry

- Approve canonical element IDs.
- Attach canonical string IDs.
- Preserve legacy/current IDs.

Scripts:

```text
build-canonical-localization-registry.js
detect-identity-collisions.js
```

### Phase 3 — Build pointer indexes

- Generate reverse identity index.
- Generate query indexes.

Scripts:

```text
build-localization-indexes.js
validate-generated-localization.js
```

### Phase 4 — Query + CSV projection

- Query by page, section, string ID, proof group, language.
- Output CSV with selected columns.

Scripts:

```text
query-localization.js
build-localization-projection.js
```

### Phase 5 — Language bundle generation

- Generate runtime bundles.
- Validate placeholder and missing translations.

Scripts:

```text
build-language-bundles.js
detect-missing-translations.js
validate-placeholders.js
```

### Phase 6 — Screenshot evidence map

- Register screenshots.
- Link screenshots to captured canonical element IDs.
- Query screenshot → context.

Scripts:

```text
build-screenshot-evidence-map.js
detect-layout-risk.js
```

### Phase 7 — Misalignment detection

- Compare current IDs across platforms.
- Generate alignment reports.
- Plan source-code impact.

Scripts:

```text
detect-identity-misalignment.js
build-source-impact-report.js
```

### Phase 8 — Guarded source-code alignment

- Apply approved canonical ID/string ID changes.
- Regenerate indexes and runtime bundles.
- Produce PR report.

Scripts:

```text
apply-approved-identity-alignment.js
validate-generated-localization.js
```

### Phase 9 — Scale and optional database migration

- Evaluate if Git-native system is enough.
- Add database only if workflow pressure requires it.

---

## 26. POC Success Criteria

The POC succeeds when it can:

1. Extract at least one page’s localization strings from HTML.
2. Store canonical records once.
3. Generate pointer indexes.
4. Resolve a current string ID back to canonical context.
5. Query by page/section/group/language/status.
6. Generate English + Chinese CSV projection.
7. Attach screenshot evidence.
8. Traverse screenshot → elements → strings → source file.
9. Detect at least one simulated misalignment.
10. Generate a source-code impact report for an approved alignment.
11. Validate schema and generated output freshness.
12. Clearly distinguish mechanical automation from human semantic approval.

---

## 27. AI Handoff Instructions

An AI implementation agent should not start by writing UI.

Start with source truth and scripts.

Suggested order:

```text
1. Define schema v1.
2. Create canonical source folder.
3. Build extractor for sample HTML.
4. Build canonical registry generator.
5. Build pointer index generator.
6. Build query function.
7. Build CSV projection.
8. Add validation and drift checks.
9. Add screenshot evidence model.
10. Add misalignment detector.
11. Add source impact report.
12. Only then consider UI.
```

Do not duplicate full records across indexes.

Do not let generated projections become source truth.

Do not silently merge semantic duplicates.

Do not apply source-code alignment without approval.

---

## 28. Client-Facing Summary

This POC creates a Git-native localization source of truth that behaves like a lightweight database without requiring database infrastructure at the start. Canonical records store the full relationship context once. Generated indexes allow fast search from any known ID, language, page, platform, screenshot, or status. Outputs such as CSVs, QA packets, runtime bundles, and source-code impact reports are generated as projections. Screenshots become traversable evidence nodes rather than passive attachments. The system can expose ID misalignment across platforms and eventually support approved source-code alignment, making it stronger than localization tools that only hand screenshots to translators and relay issues manually to developers.

---

## 29. Compression

```text
Git stores the ledger.
Canonical records hold truth.
Indexes hold pointers.
Queries hydrate context.
Projections generate views.
Screenshots become traversable evidence.
Scripts handle mechanical complexity.
Humans approve semantic authority.
Database migration stays optional.
```

---

## 30. Final Principle

The system is not only for translating strings.

It is for preserving the full identity and relationship context of every localized user-facing element, so humans, AI agents, translators, designers, QA, and engineers can all traverse the same source of truth from their own entry point.

---

# Document 2 — CLAUDE_RELAY_LOCALIZATION_POC_CLARIFICATION.md (as uploaded)

# Claude Relay — Localization Dimensional Map Clarification + Additive Pilot Plan

**Anchor:** `[VXG RealForever]`
**Timestamp context:** 1:34 PM, July 8, 2026
**Purpose:** Relayable conversational context from Victor + Vex back to Claude
**Status:** Clarification and narrowed implementation direction after Claude reviewed `GLOBAL_LOCALIZATION_SOURCE_OF_TRUTH_POC.md`

---

## 0. Direct answer to Claude

Claude, your read is correct.

The prior `GLOBAL_LOCALIZATION_SOURCE_OF_TRUTH_POC.md` should **not** be treated as a literal replacement for `pe-014`, and it should **not** be built as the full 18-script parallel system right now.

The intended use is closer to your third interpretation:

```text
The document is a dimensional source-truth design pattern
that should inform how we think about source-truth systems generally,
especially localization/UI identity,
not a direct handoff saying “build all of this now.”
```

So the answer is:

```text
Do not replace pe-014.
Do not build the full parallel localization system.
Preserve the full document as context/north-star.
Extract the smallest real additive pilot from it.
Apply that pilot to the existing live strings pipeline.
```

---

## 1. Scope clarification

The POC doc is not literally `pe-014`.

From Victor/Vex side, the relationship is:

```text
pe-014
  = code/build symbol source-truth scope
  = VEX_SUPPORTED_LANGS, CACHE_NAME, builtAt, exported functions, debug-facing build/runtime symbols

Localization POC doc
  = translation/UI-element identity source-truth scope
  = canonical elements, observed IDs, string IDs, screenshots, language values, cross-context identity alignment
```

They share a **pattern**:

```text
canonical truth
  vs.
observed/current usage

source records
  vs.
generated indexes/projections

mechanical scripts
  vs.
semantic/governance review
```

But they are different domains.

Therefore, the localization POC should be treated as a **companion/north-star pattern**, not as the next literal `pe-014` implementation.

---

## 2. Agreement with Claude’s major critique

Claude’s warning is valid:

> As written, the POC risks becoming a full parallel system beside the existing working localization pipeline.

That is not the intended next move.

The correct next move is not:

```text
/localization/source/
/localization/schema/
/localization/generated/
/scripts/18-new-files
/dist/i18n/{lang}.json
```

if those duplicate or compete with:

```text
data/strings/source/
data/strings/compiled/
lib/strings-*.js
data/strings/migrations.json
existing runtime string pipeline
```

The POC doc was deliberately expansive to preserve the full scalable architecture, but implementation should **not** jump to that full scope.

The repo has already demonstrated the right discipline elsewhere: build against real cases, not imagined future integrations.

---

## 3. Corrected implementation posture

The implementation posture should be:

```text
Preserve the full POC as context.
Build only the smallest real slice.
Extend existing infrastructure.
Do not fork source truth.
Do not create a competing runtime bundle path.
Do not design for platforms/tools that do not exist yet.
```

In other words:

```text
North-star document:
  full scalable localization identity architecture

Current build target:
  tiny additive identity overlay on existing live strings pipeline
```

---

## 4. Recommended pilot target

Claude suggested the right first target:

```text
data/strings/source/pages/victor-methodology-presentation.json
```

Reason:

- it has real keys,
- real English and Chinese content,
- real `data-i18n` usage,
- a real live page,
- a real screenshot pair/context,
- proof records with meaningful hierarchy,
- enough complexity to test the pattern,
- but not so much scope that it becomes a parallel platform.

This should be the first pilot surface.

---

## 5. Pilot goal

The pilot should prove only this pattern:

```text
existing string key
  → canonical/observed identity metadata
  → generated pointer index
  → queryable projection
```

Not:

```text
multi-platform localization platform
```

Not:

```text
automatic source-code rewrite system
```

Not:

```text
new database/API/runtime bundle architecture
```

---

## 6. Minimal additive capability set

The first pilot should include only these capabilities:

### 6.1 Canonical vs observed identity overlay

For a small subset or all keys in `victor-methodology-presentation`, add or derive metadata that can say:

```text
canonicalElementId:
  the stable conceptual identity

observedStringId/currentStringId:
  the existing live data-i18n key

observedPlacement:
  where the key appears in the HTML/source

legacyId:
  preserved HTML/data legacy alias if present

status:
  aligned / needs_review / candidate / unresolved
```

### 6.2 Pointer index generation

Generate lightweight pointer indexes only.

Example indexes:

```text
byCanonicalElementId
byStringId
bySection
byLegacyId
byField
byStatus
```

These indexes must contain references only, not duplicate full records.

### 6.3 Query → hydrate → project

Add a small query capability:

```text
input string ID / section / proof group / canonical element ID
  → resolve canonical records
  → hydrate from source
  → output markdown/CSV/table
```

### 6.4 Validation

Add validation that checks:

```text
all indexed string IDs exist in the real source strings file
no duplicate canonical IDs unless explicitly allowed
generated index is current
no full duplicated records inside indexes
```

### 6.5 Report, not auto-apply

If misalignment is found, generate a report only.

No auto-rewrite.

---

## 7. What not to build yet

Do **not** build these from the prior POC yet:

```text
byPlatform
byDesignId
byTestId
vendor packet system
cross-platform alignment
database/API layer
guarded source-code auto-apply
multi-platform screenshot ingestion
large schema migration framework
18-script ecosystem
```

Those remain in the north-star context, but they should not be implemented until real cases exist.

Especially do not build:

```text
apply-approved-identity-alignment.js
```

right now.

Claude is right that this enters higher-blast-radius territory and belongs near the repo’s staged/proposal execution concerns, not the first localization identity pilot.

---

## 8. Suggested minimal file strategy

Claude should decide the final naming based on current repo conventions, but the additive shape could be something like:

```text
data/strings/source/pages/victor-methodology-presentation.json
  existing live source strings

data/strings/identity/pages/victor-methodology-presentation.json
  additive canonical/observed identity metadata

data/strings/compiled/identity-index.json
  generated pointer index

data/strings/reports/identity-alignment-victor-methodology-presentation.md
  generated report
```

If `data/strings/identity/` feels like a new parallel domain, use a name closer to existing conventions.

The key requirement is:

```text
Do not duplicate the string source truth.
Only add identity metadata and generated pointer indexes.
```

---

## 9. Minimal script set

Instead of 18 scripts, start with 3 or 4.

### 9.1 `extract-string-identity-candidates.js`

Purpose:

- parse one HTML page,
- find `data-i18n`,
- capture DOM placement,
- capture nearby section IDs,
- capture `data-legacy-id`,
- emit candidate identity metadata.

This should produce a reviewable candidate file/report, not canonical truth.

### 9.2 `build-string-identity-index.js`

Purpose:

- read existing source strings,
- read approved identity metadata,
- generate pointer indexes.

Generated indexes may include:

```text
byStringId
byCanonicalElementId
bySection
byLegacyId
byField
byStatus
```

### 9.3 `validate-string-identity-index.js`

Purpose:

- ensure generated indexes point to real source keys,
- ensure indexes contain pointers only,
- detect duplicate or conflicting canonical IDs,
- detect stale generated output.

### 9.4 Optional: `query-string-identity.js`

Purpose:

- allow basic query configuration,
- hydrate records,
- output markdown/CSV/table.

This can also be delayed if the generated report is enough for first pass.

---

## 10. First vertical slice

Use `victor-methodology-presentation`.

Example slice:

```text
pages.victor-methodology-presentation.proof-localization-pipeline.title
  ↓
existing source string
  ↓
identity metadata
  ↓
canonicalElementId
  ↓
section/proof placement
  ↓
generated byProof/bySection/byStringId indexes
  ↓
query output:
      canonical element
      string ID
      English
      Chinese
      placement
      status
      notes
```

This proves the pattern without building the full system.

---

## 11. How the screenshot idea should be handled now

Screenshots should stay in scope as a design direction, but not as a full screenshot platform yet.

For first pilot, it is enough to support a simple optional field:

```json
{
  "screenshotRefs": [
    "screenshots/victor-methodology-presentation/zh-CN/header.png"
  ]
}
```

No OCR, no visual detection, no full screenshot ingestion engine.

The first screenshot goal is:

```text
string/element context can link to screenshot evidence
```

not:

```text
screenshots become fully navigable UI database
```

That can come later after the identity overlay works.

---

## 12. How this relates to Vextreme self-reference

Victor’s intention remains:

```text
Vextreme should localize itself
while using the localization identity system
to observe and improve its own structure.
```

But the practical first version should be modest:

```text
Vextreme page strings
  → identity overlay
  → pointer indexes
  → queryable report
```

Only after that works should we expand to:

```text
screenshots as navigable nodes
source-code impact reports
approved ID alignment workflows
multi-platform identity mapping
```

---

## 13. Updated phased plan

### Phase A — Preserve

Keep the full POC doc as contextual design/north-star.

Do not implement full scope.

### Phase B — Inspect current pipeline

Claude should inspect:

```text
data/strings/source/pages/victor-methodology-presentation.json
data/strings/migrations.json
lib/strings-*.js
data/strings/compiled/
the live HTML page using those keys
```

Goal: understand existing live pipeline before adding anything.

### Phase C — Add identity overlay

Create the smallest additive metadata layer for canonical/observed identity.

### Phase D — Generate pointer index

Build generated pointer indexes.

### Phase E — Validate drift

Add validation so generated identity indexes cannot silently drift from source strings.

### Phase F — Query/report

Generate one report or table that proves:

```text
query by proof group
query by string ID
query by section
```

### Phase G — Screenshot refs

Attach minimal screenshot refs, no full screenshot engine yet.

### Phase H — Reassess

Only after the pilot is real should we decide whether to expand toward the larger localization POC.

---

## 14. Key principle for Claude implementation

The highest-value pattern to preserve from the POC is not the number of scripts.

It is:

```text
canonical vs observed
+
pointer indexes, not duplicated records
+
query hydrate project
+
mechanical scripts / semantic review boundary
```

Everything else should be pulled in only when a real case demands it.

---

## 15. Direct response to Claude’s final question

Claude asked:

> Does that match what you and Vex were aiming at, or is there a specific piece of this you want built as-is regardless?

Answer:

```text
Yes, your recommended narrowing matches the intended direction.

We do not want the full 18-script system built as-is right now.

We want the full document preserved as context,
but the implementation should extract the smallest real additive pilot:
canonical/observed identity overlay + generated pointer index + query/report,
applied to the existing Vextreme string pipeline,
starting with victor-methodology-presentation.
```

---

## 16. Suggested next Claude task

If moving forward, the next concrete task for Claude is:

```text
Inspect the current strings pipeline and propose the smallest additive file/script plan
for a canonical/observed identity overlay on
data/strings/source/pages/victor-methodology-presentation.json.

Do not implement yet unless the plan clearly:
1. extends existing infrastructure,
2. avoids a parallel source of truth,
3. stores full truth once,
4. generates pointer indexes only,
5. avoids auto-applying source-code rewrites,
6. uses the current page as the first real vertical slice.
```

---

## 17. Compression

```text
The POC doc is north-star context, not a literal build order.
pe-014 remains code/build-symbol scoped.
Localization identity is a related but separate domain.
Do not create a parallel system.
Start with one real page in the existing strings pipeline.
Add canonical/observed identity metadata.
Generate pointer indexes.
Query/hydrate/project.
Report misalignment; do not auto-apply.
Expand only after real cases justify it.
```

---

# Document 3 — VEX_RELAY_TO_CLAUDE_LOCALIZATION_IDENTITY_PILOT_ADDENDUM.md (as uploaded)

# Vex Relay to Claude — Localization Identity Pilot Approval + Rehydration / Review / Ledger Addendum

**Anchor:** `[VXG RealForever]`
**Timestamp context:** July 8, 2026
**Relay purpose:** Continue the localization dimensional-map handoff after Claude inspected the real strings pipeline and proposed the smallest additive pilot.
**Current posture:** Approve Claude’s narrowed build plan, with one identity-shape adjustment, while preserving the fuller future direction: regeneration, reviewable outputs, change reports, visible HTML result views, change history, and accountability signoff ledger.

---

## 0. Direct Answer to Claude

Claude, your narrowed plan is the correct next build direction.

Yes: build the additive pilot, not the full parallel localization system.

The implementation should activate what already exists in the repo:

```text
data/strings/source/pages/victor-methodology-presentation.json
+
the live HTML page’s id / data-legacy-id / data-i18n structure
```

The pilot should prove:

```text
existing string key
  → identity metadata
  → generated pointer index
  → readable grouped context / report
```

It should **not** yet build the full 18-script north-star system, cross-platform database, screenshot engine, vendor platform, or source-code auto-rewrite flow.

---

## 1. Agreement With Claude’s Inspection

Claude’s inspection found the right seam:

> The canonical/observed split already exists in this exact page, unindexed.

The page already has:

```text
HTML id / section identity
data-legacy-id / legacy identity
data-i18n / string identity
```

This means we do not need to invent a new source-truth system yet.

We can begin by indexing and surfacing relationships already latent in the current code.

This is the correct “safe wedge” because it:

1. Extends existing infrastructure.
2. Avoids a parallel source of truth.
3. Stores full truth once.
4. Generates pointer indexes only.
5. Avoids auto-applying source-code rewrites.
6. Stays scoped to `victor-methodology-presentation`.

---

## 2. Identity Shape Adjustment Before Build

Claude proposed this kind of identity block:

```json
{
  "identity": {
    "canonicalElementId": "REC-Y0-ORGMAP",
    "fieldKey": "title",
    "section": "proof-organization-knowledge-map",
    "status": "aligned"
  }
}
```

The direction is right, but the shape should preserve identity roles more explicitly.

`REC-Y0-ORGMAP` is valuable, but because it appears as `data-legacy-id`, we should avoid silently collapsing:

```text
legacy identity
current semantic element identity
canonical pilot identity
string identity
```

into one unnamed field.

A safer first shape is:

```json
{
  "identity": {
    "canonicalElementId": "proof-organization-knowledge-map",
    "legacyElementId": "REC-Y0-ORGMAP",
    "contentNodeKey": "proof-organization-knowledge-map",
    "fieldKey": "title",
    "status": "aligned"
  }
}
```

This treats the semantic HTML element / content node as the pilot canonical identity while preserving the legacy ID as an alias.

If repo conventions suggest `data-legacy-id` should be treated as the canonical seed, then use this variant:

```json
{
  "identity": {
    "canonicalElementId": "REC-Y0-ORGMAP",
    "canonicalSource": "html.data-legacy-id",
    "currentElementId": "proof-organization-knowledge-map",
    "contentNodeKey": "proof-organization-knowledge-map",
    "fieldKey": "title",
    "status": "aligned"
  }
}
```

Either version is acceptable.

The non-negotiable principle is:

```text
Do not collapse legacy ID and current semantic element ID into one unnamed identity.
Preserve both.
```

---

## 3. Naming Preference

Prefer `contentNodeKey` over `section` if it fits the existing repo vocabulary.

Reason: the same level can represent more than strict sections.

Examples:

```text
header
section-proofs
proof-localization-pipeline
footer
fit-platform-devex
note-self-demonstration
```

Some are sections, some are records, some are cards/groups.

`contentNodeKey` is more general and preserves future relational scope.

If existing repo conventions strongly prefer `section`, use repo convention, but conceptually the category is broader than section.

---

## 4. Approved Minimal Script Plan

The three-script plan is approved.

```text
lib/discover-string-identity.js
lib/build-string-identity-index.js
lib/check-string-identity.js
```

### 4.1 `lib/discover-string-identity.js`

Posture:

```text
proposal/report only
no auto-write
no canonical approval
```

Purpose:

- parse the live HTML,
- discover `data-i18n`,
- discover nearby `id`,
- discover `data-legacy-id`,
- capture content node / placement structure,
- cross-reference against existing source string keys,
- produce candidate identity blocks or a review report.

This should behave like a discover/proposal tool, not an authoritative writer.

### 4.2 `lib/build-string-identity-index.js`

Posture:

```text
generated pointer index only
no full duplicated records
```

Purpose:

- read committed identity metadata,
- generate `data/strings/compiled/identity-index.json`,
- include pointer indexes such as:

```text
byCanonicalElementId
byStringId
byContentNodeKey
byLegacyElementId
byField
byStatus
```

Indexes should point to string keys. They should not duplicate full source records.

### 4.3 `lib/check-string-identity.js`

Posture:

```text
informational/reporting
no rewrite capability
```

Purpose:

- confirm every indexed key resolves to a real source key,
- detect duplicate/conflicting canonical IDs,
- detect stale generated index,
- detect missing identity blocks,
- detect identity blocks whose referenced HTML IDs no longer exist.

This matches the repo’s existing detector/check posture.

---

## 5. Query / Projection Posture

A full query engine can be deferred.

For this pilot, `identity-index.json` plus a readable report is enough.

The first proof should be:

```text
source key
  → identity block
  → generated index
  → grouped readable context
```

Example output shape:

```text
canonicalElementId: proof-localization-pipeline
legacyElementId: REC-Y34-LOCALIZATION
field keys:
  - year
  - title
  - body
  - metric
  - metric-label
languages:
  - en
  - zh
status:
  aligned
source:
  data/strings/source/pages/victor-methodology-presentation.json
```

The query layer can become richer later.

---

## 6. Screenshot Scope for This Pilot

Agree with Claude’s narrower screenshot proposal.

Use page-level screenshot refs for now.

Example:

```json
{
  "_meta": {
    "screenshotRefs": [
      "docs/screenshots/victor-methodology-presentation-en.png",
      "docs/screenshots/victor-methodology-presentation-zh.png"
    ]
  }
}
```

Do not invent per-section screenshot evidence if only page-level screenshots exist.

The first screenshot goal is only:

```text
identity context can point to real screenshot evidence
```

not:

```text
build a full screenshot-navigation platform
```

Per-section screenshot evidence, screenshot crops, bounding boxes, and visual traversal can come later when real assets exist.

---

## 7. New Addendum: Regeneration / Rehydration Must Be Preserved as Future Direction

There is an important future capability from Victor’s prior localization experience that should be preserved in the architecture, even if not implemented in the first pilot.

The system should eventually support the ability to take platform/source inputs, map them into the registry, and then regenerate the platform-expected output files.

This is not just translation export.

This is **platform-specific string rehydration**.

The historical hard case came from manually mapping:

```text
3 platforms:
  - Android
  - iOS
  - Receiver

8 languages

Worst-case structure differences:
  - bold / italic markup
  - new lines
  - special characters vs encoded equivalents
  - ellipses alignment
  - hyphen / string-break behavior
  - Android tags
  - iOS constant-based structures
  - Receiver static spacing / line-break constraints
  - Receiver DOM-like string reconstruction
```

The key lesson:

```text
Canonical language value is not always the final deliverable.
The system must be able to rebuild the final platform string into the shape each platform expects.
```

This future layer can be named:

```text
Platform-Specific String Rehydration Adapter
```

or shorter:

```text
Platform String Rehydration
```

The eventual flow:

```text
original platform files
  ↓
ingest / extract strings and formatting structure
  ↓
map into canonical identity + language values + formatting intent
  ↓
review / approve
  ↓
rehydrate back into platform-specific output shape
  ↓
generate changed files for review
```

This is a future design requirement, not an instruction to build cross-platform output now.

For the current Vextreme page pilot, the equivalent smaller idea is:

```text
existing source string file
  ↓
identity metadata and index
  ↓
generated report / compiled index
  ↓
existing compile/check behavior remains untouched
```

But the design should not forget the eventual need to regenerate original or platform-specific files after ingestion.

---

## 8. New Addendum: Reviewable Output After Input

The system should eventually support a full review loop:

```text
user/project provides source files
  ↓
system ingests and maps them
  ↓
system outputs proposed normalized/canonical records
  ↓
system regenerates expected output artifacts
  ↓
user reviews what changed and where
  ↓
approved changes enter source truth
  ↓
generated outputs become reviewable PR artifacts
```

In other words, the system should not only absorb inputs.

It should reflect them back.

The user should be able to see:

```text
What did I give the system?
What did the system detect?
What did it map?
What did it change?
Where did it change it?
What output did it regenerate?
Who approved the result?
```

This matters because trust requires visible transformation, not hidden automation.

For now, the pilot can approximate this through reports only:

```text
discover-string-identity report
identity-index generated file
check-string-identity report
```

Later, this becomes a richer review interface.

---

## 9. New Addendum: “What Changed Where” Report

Any future transformation should generate a change report.

The change report should answer:

```text
changed item
old value
new value
source file
generated file
reason
script that made/suggested the change
approval status
approver
timestamp
```

Example future report row:

```json
{
  "changeId": "chg-2026-07-08-001",
  "type": "identity-metadata-added",
  "stringKey": "pages.victor-methodology-presentation.proof-localization-pipeline.title",
  "canonicalElementId": "proof-localization-pipeline",
  "legacyElementId": "REC-Y34-LOCALIZATION",
  "file": "data/strings/source/pages/victor-methodology-presentation.json",
  "reason": "discovered from HTML id + data-legacy-id adjacency",
  "suggestedBy": "lib/discover-string-identity.js",
  "approvedBy": "Victor",
  "status": "approved"
}
```

For the current pilot, this can be a markdown report rather than a database ledger.

Suggested report path:

```text
data/strings/reports/string-identity-victor-methodology-presentation.md
```

or wherever Claude believes fits existing repo conventions.

---

## 10. New Addendum: Final HTML Review View

After the pilot stabilizes, a useful next layer would be a generated HTML review page.

Purpose:

- show the results of the filter/query process,
- show the user’s inputs reflected back,
- show grouped/stacked identity relationships,
- show generated index output in human-readable form,
- show last changes and approvals.

Potential generated page:

```text
pages/string-identity-review.html
```

or repo-conventional equivalent.

This page should not become source truth.

It is a projection.

Possible sections:

```text
1. Query / filter input summary
2. Matching canonical/content nodes
3. String keys and language values
4. Legacy/current/canonical identity relationships
5. Screenshot refs
6. Generated pointer indexes
7. Recent change history
8. Approval/signoff ledger
9. Next navigable context handles
```

This would let users see their inputs reflected in the system.

Example filter:

```text
page = victor-methodology-presentation
contentNodeKey = proof-localization-pipeline
language = zh
status = aligned
```

HTML output could show:

```text
You filtered by:
  page: victor-methodology-presentation
  content node: proof-localization-pipeline
  language: zh
  status: aligned

Matched:
  REC-Y34-LOCALIZATION / proof-localization-pipeline

Fields:
  year
  title
  body
  metric
  metric-label

Available translations:
  en
  zh

Evidence:
  page screenshot refs
  source file refs
```

This is a future projection layer, not the first script.

---

## 11. New Addendum: Stacked Context Visibility

The review view should support stacked context where needed.

Meaning: if a user queries a string key, the system should be able to show nested surrounding context rather than a single flat row.

Example stack:

```text
Page
  victor-methodology-presentation

Content node
  proof-localization-pipeline

Legacy ID
  REC-Y34-LOCALIZATION

Field
  title

String key
  pages.victor-methodology-presentation.proof-localization-pipeline.title

Languages
  en
  zh

Evidence
  source file
  screenshot refs

Generated indexes
  byStringId
  byContentNodeKey
  byLegacyElementId
  byStatus
```

This matters because relationship visibility is the product.

The system should not only answer the query; it should show where the answer lives in the surrounding map.

---

## 12. New Addendum: Recent Change History

The future HTML review page should include a visible recent activity panel.

Start simple:

```text
show latest 10 changes
```

Then allow:

```text
pagination
scrolling
filter by file
filter by approver
filter by script
filter by status
```

This does not need to be built in the first pilot.

But the architecture should preserve enough information to support it later.

For current pilot, a simple generated markdown report can include:

```text
Recent identity generation/check events
Latest changed keys
Latest approval notes if any
```

The key idea:

```text
People should be able to inspect the history of engagement,
not only the current final state.
```

---

## 13. New Addendum: Accountability Signoff Ledger

As the system matures, it should include an accountability ledger for human approval.

This does not need database infrastructure at first.

Git commits and PRs can serve as the initial ledger.

A future explicit ledger can contain:

```json
{
  "approvalId": "appr-2026-07-08-001",
  "changeId": "chg-2026-07-08-001",
  "approvedBy": "Victor",
  "role": "source-truth owner",
  "approvedAt": "2026-07-08T13:34:00-07:00",
  "approvalType": "identity metadata acceptance",
  "notes": "Accepted HTML id as canonical pilot identity and preserved data-legacy-id as alias."
}
```

Initial Git-native version:

```text
PR review
commit message
generated report
CODEOWNERS/reviewer if applicable
```

Future richer version:

```text
data/strings/reports/approval-ledger.json
or
data/strings/identity/approval-ledger.json
```

Only add an explicit ledger when a real approval workflow requires it.

For now, Claude can preserve the concept in reports and PR notes.

---

## 14. Updated Build Approval

Claude can build the narrowed pilot now.

Build only:

```text
identity metadata embedded in existing page source file
generated pointer index
discover/proposal script
build index script
check script/report
optional page-level screenshot refs
```

Do not build yet:

```text
full query engine
full HTML review UI
platform rehydration adapters
source-code auto-rewrite
approval ledger database
multi-platform screenshot navigation
vendor packet system
```

But keep these future directions visible in documentation/report comments where helpful.

---

## 15. Requested Claude Build Report After Implementation

After building, please report:

1. Exact files changed.
2. Whether existing string compile/check behavior remained untouched.
3. The final identity metadata shape used.
4. The generated index shape.
5. Any ambiguity discovered between `id`, `data-legacy-id`, and `data-i18n`.
6. Whether generated-file drift is checked.
7. Whether the report clearly shows candidate/accepted identity relationships.
8. Whether screenshot refs were added at honest page-level granularity only.
9. Whether anything risks becoming a parallel source of truth.
10. Any next-smallest follow-up after this pilot.

---

## 16. Future Direction Map

The build sequence should now be understood as:

```text
Current build:
  Existing string source
    → embedded identity metadata
    → pointer index
    → check/report

Next possible build:
  readable query/projection report
    → generated HTML review page

Later:
  change history panel
    → last 10 changes
    → paging/scrolling

Later:
  approval/signoff ledger
    → PR/commit-backed first
    → explicit ledger only if needed

Later:
  platform-specific rehydration adapters
    → regenerate original/platform files after ingestion

Much later:
  broader cross-platform identity alignment
    → only after real platform cases exist
```

---

## 17. Compression

```text
Claude’s narrowed plan is approved.
Build the additive pilot inside the existing strings pipeline.
Preserve both semantic HTML id and data-legacy-id.
Generate pointer indexes only.
Report, don’t rewrite.
Use page-level screenshot refs honestly.
Do not build the full localization platform yet.

Future direction:
The system should eventually ingest source files,
map them into canonical identity,
regenerate expected output artifacts,
show what changed where,
render reviewable HTML result views,
display recent change history,
and preserve accountability signoff.
But those are next layers, not the first blast radius.
```

---

## 18. Final Principle

The pilot should prove that Vextreme can activate identity relationships already present in its own strings and HTML without forking its source truth.

The larger architecture remains:

```text
Inputs are ingested.
Relationships are mapped.
Outputs are regenerated.
Changes are reported.
Review views make the transformation visible.
Human signoff preserves accountability.
Git remains the first ledger.
```

The current pilot is the first safe proof of that pattern.

<!-- [VXG RealForever] -->
