# Localization Registry Graph

**Status:** implementation-ready foundation
**Completion Level:** L6 - Implementation-ready
**Purpose:** lower-layer map for reusable strings, locale renderings, messages, placeholders, plurals, vendor workflow, and AI-safe modification
**Parent architecture:** `docs/architecture/16-ui-identity-registry-graph.md`
**Documentation Standard:** follows `docs/architecture/15-registry-documentation-standard.md`

---

## Scope Boundary

This section defines the localization layer inside the UI Identity Registry
Graph.

It covers:
- StringNode and MessageNode responsibilities
- locale values and translation status
- localization bindings
- plural, placeholder, and rich-text validation
- vendor export/import boundaries
- translation impact reporting
- migration from today's `data/strings/source` files

It does not cover:
- full UI identity metadata for every element
- design constraints
- screenshot diff storage
- analytics event ownership
- all vendor approval workflows

Those belong to sibling maps that the parent graph routes into.

---

## Relationship To Parent Graph

The parent graph defines the cross-domain handle:

```txt
UIElementKey -> lower-layer maps
```

The localization graph defines meaning and language rendering:

```txt
UIElementKey -> binding -> stringId or messageId -> locale rendering -> output page/component
```

The UIElementKey does not store every language. It routes to the localization
map.

---

## Current Repo Fit

Today's string pipeline is already a partial Localization Registry Graph:

```txt
data/strings/source/**/*.json        write-side source
lib/strings-check.js                 integrity and stale detection
lib/strings-compile.js               generated bundle compiler
lib/strings-export.js                translator export
lib/strings-import.js                translator import
data/strings/compiled/**             generated read-side bundles
data/strings/migrations.json         append-only key rename log
```

The current key is the practical handle. The next migration step is to attach
explicit meaning IDs and bindings without breaking the existing key pipeline.

---

## Core Objects

| Object | Purpose |
|---|---|
| `StringNode` | Reusable meaning node for static text |
| `MessageNode` | Reusable meaning node for dynamic, pluralized, or variable-dependent text |
| `LocaleValue` | Language-specific rendering of a string or message |
| `LocalizationBinding` | Connection between a UIElementKey and a string or message |
| `ContextNote` | Translator-facing explanation of where text appears and what it means |
| `VendorBatch` | Controlled translation package exported to a vendor |

Rule:

```txt
String ID identifies meaning.
Locale files render that meaning.
Bindings place that meaning into UI contexts.
```

English text is not the source of truth. The meaning node is the source of
truth.

---

## Owned By

Current source:

```txt
data/strings/source/**/*.json
data/strings/migrations.json
```

Current generated output:

```txt
data/strings/compiled/**
```

Future source maps may be added after the initial registry foundation:

```txt
data/localization/strings.json
data/localization/messages.json
data/localization/bindings.json
data/localization/plural-rules.json
data/localization/placeholder-rules.json
data/localization/vendor-notes.json
```

Do not add parallel source-of-truth files until a build script can validate or
derive them from the current pipeline.

---

## Connects To

Localization connects to:

```txt
UI Identity Registry Graph
Context Registry
Design/Layout Constraints
QA/VnV Map
Documentation Map
Vendor Workflow Map
Platform Implementation Map
AI Context Map
```

Translation is not isolated text replacement. It is identity management for
meaning across languages, contexts, platforms, vendors, and time.

---

## Query Functions

Recommended contracts:

```ts
getStringSummary(stringId)
getMessageSummary(messageId)
getLocaleStatus(stringIdOrMessageId)
getBindingsForString(stringId)
getMissingLocales(scope)
getPluralValidationReport(messageId)
getPlaceholderValidationReport(id)
getTranslationImpactReport(id)
getReusableStringCandidates(text)
getVendorExportBatch(scope)
```

These should return summary cards plus pointers to source rows and generated
reports.

---

## Decision Rules

Use these rules when adding or changing localized text:

```txt
Same meaning, same audience -> reuse string.
Same meaning, different audience -> create variant.
Different meaning -> create new string.
Count-dependent meaning -> use message_id.
Legal or regulated text -> locked/review-required.
```

If one string appears in twelve places, a vendor should translate it once and
the graph should apply it twelve times.

---

## Health Checks

Current health:

```txt
node lib/strings-check.js
node lib/strings-compile.js
node --test tests/02-strings-pipeline.test.js
```

Future localization health should validate:

```txt
every binding has string_id or message_id
every string_id exists
every message_id exists
required locales exist
placeholders are preserved
plural categories are valid per locale
rich-text tags are allowed and balanced
locked terms are preserved
duplicate strings are reviewed
orphaned locale rows are quarantined
managed HTML text changes happen through the registry
localized screenshot diffs are regenerated where required
```

The first new health check for this milestone is documentation-level:

```txt
node lib/check-registry-docs.js
```

---

## Migration Path

The migration should stay additive:

```txt
1. Preserve current string keys and compiled bundles.
2. Add documentation standard and graph docs.
3. Add registry-doc health checks.
4. Generate a localization summary index from existing source files.
5. Add explicit StringNode/MessageNode metadata once the summary index is stable.
6. Add UIElementKey bindings for selected pages before repo-wide enforcement.
7. Add vendor and placeholder/plural validators after the data exists.
```

This keeps the current site working while the registry becomes real.

---

## Acceptance Criteria

The Localization Registry Graph is working when:

```txt
Every localized string is traceable to meaning, context, and UI ownership.
A new locale can be added without duplicating page structure.
A vendor receives only the rows they need plus enough context to translate safely.
A count-dependent message cannot be modeled as a plain string by accident.
A placeholder-removing translation fails before import.
A global string edit reports every affected UI element and locale.
AI proposes mappings only where deterministic scripts cannot decide.
```

<!-- [VXG RealForever] -->
