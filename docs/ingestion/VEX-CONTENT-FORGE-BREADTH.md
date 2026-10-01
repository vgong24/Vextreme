# Vex Content Forge — breadth intake continuation

[VXG RealForever]

This layer continues the #159 / #160 / #161 preservation-to-world ingestion pilot after the initial two-page rehearsal.

## Purpose

Materialize **public-safe** provider-neutral derived HTML carried by the VexSite partition ZIPs into GitHub **without prematurely activating it as WIP runtime or promoting it to canonical `pages/**` state**. Protected/non-public source remains metadata-addressable and is not published merely because it was present in an intake ZIP.

## Storage contract

```text
public-safe source ZIP pages/<slug>.html
  -> docs/ingestion/source-pages/part-NNN/<slug>.html
     exact provider-neutral derived HTML evidence

protected/non-public source page
  -> receipt + work-map route/hash/size/relationship/protection metadata
  -> exact bytes WITHHELD from public GitHub unless separately authorized

plus
  -> docs/ingestion/batches/...json
     digest-bound routing/effects receipt

plus
  -> docs/ingestion/workmaps/content-forge-current.json
     current scanner pointer
  -> docs/ingestion/workmaps/content-forge-rNNN.json
     cumulative semantic frontier
  -> historical cumulative bases only when deeper prior detail is needed
```

The source-evidence layer is intentionally **not** scanned as active page/WIP runtime. This prevents preservation breadth from manufacturing localization/analysis activation before placement decisions exist.

## Scanner/lattice integrity

The current scanner root is cumulative rather than a set of isolated part summaries. R023 extends R022, which extends the restored full R021A cumulative basis.

During R023 intake the repository copy of `content-forge-r021a.json` was found truncated at 50,222 bytes. The original R021→R022 successor handoff retained the complete checksum-bound R021A map, so R023 restores those exact `727047` bytes (`sha256=6d4a2977a2ca0faaadfd02259ac1717efd4b4316482c965908861d982a5a067d`) without changing its semantic history.

```text
content-forge-current.json
  -> content-forge-r023.json
       -> content-forge-r022.json
            -> content-forge-r021a.json  # exact historical basis, machine-readable again
```

## Boundaries

- Raw authenticated/provider source is not published.
- Explicitly protected/non-public derived source is not published by default.
- Derived source HTML is preservation/intake evidence, not automatically canonical Vextreme page source.
- Existing canonical nodes, arcs, content intents, current page implementations, generated roots and developer tools are not overwritten.
- Promotion to `wip/**` or `pages/**`, canonical localization, arc curation, replacement/alias decisions, merge, and publication remain later effects.
- Batch order and SHA lineage are retained so a later consolidation worker can read work-map/receipts first and open HTML only when deeper evidence is required.

## Current continuation

Parts 012–028 are repository-materialized on draft PR #162. R028 brings the cumulative breadth state to **216 observed pages**: **144 public-safe routed source-evidence HTML files**, one protected Part-022 source represented metadata-only, seventeen per-part receipts, and the cumulative R028 scanner map.

All twelve Part-023 routes already have exact canonical node identities on current main while their exact production page sources are absent. R023 therefore expands source evidence and relationship understanding without new node formation.

<!-- [VXG RealForever] -->


## Unmapped top-level breadth closure — R024

Part 024 closes `sourcegroup.vexsite.nav.unmapped-top-level` at **9/9 partitions and 102/102 observed pages**.

This is a source-observation closure only:

```text
BREADTH_GROUP_OBSERVED_COMPLETE
!= CANONICAL_PLACEMENT_COMPLETE
```

The completed group remains represented through the cumulative scanner chain:

```text
content-forge-current.json
  -> content-forge-r024.json
       -> content-forge-r023.json
            -> prior cumulative basis
```

R024 also preserves two alignment rules important to later projection:

```text
MUTUAL_SOURCE_LINK != CANONICAL_PARENTAGE_OR_MERGE
PRESERVED_SOURCE_VARIANT != CURRENT_DESTINATION_REPLACEMENT
```

The source stream continues with `PART_025_COLLECTION_CONVOS_WITH_GOD_1_OF_4`; completing this source group does not authorize replay, merge, canonical page promotion, registry mutation, localization absorption, or arc curation.


## Convos with God collection — R025

Part 025 begins the four-part source collection `/convos-with-god` after Unmapped Top-Level closed at 9/9.

The source collection root and the destination arc remain distinct:

```text
SOURCE_COLLECTION_ROOT
!= DESTINATION_ARC_PARENT

SOURCE_COLLECTION_MEMBERSHIP
!= DESTINATION_ARC_MEMBERSHIP
```

The source root describes raw real-time transcripts as primary records and advertises 19 child routes. Current destination `convos_with_god` is a curated arc under `/archives` with a different membership set. Collection ingestion therefore preserves source topology first and defers hub/arc/page reconciliation to consolidation.

Part 025 also establishes:

```text
COLLECTION_ROUTE_VARIANT != CANONICAL_FLAT_ROUTE_ALIAS

MUTUAL_LANGUAGE_PAIR != CANONICAL_TRANSLATION_IDENTITY

SOURCE_SUPPORTING_EVIDENCE_LINK != NEW_CANONICAL_NODE
```

The Korean-visible and English companion-restoration siblings remain a source language pair, not a canonical translation registration. Nested Bank/Merron/Closed-Circuit collection routes remain route/version lineage evidence, not automatic aliases. The Cloud source remains supporting evidence linked from Reality Rendering Mechanics/testimony context until a destination-native class is decided.

Current collection state:

```text
sourcegroup.vexsite.collection.convos-with-god
= 1_OF_4_PARTIAL

next=
PART_026_COLLECTION_CONVOS_WITH_GOD_2_OF_4
```


## Convos with God collection — R026

Part 026 advances `sourcegroup.vexsite.collection.convos-with-god` to **2/4 partial** with nested Scopes of God, Nomi in Nomi.AI, and Rex's Emergence from GPT 5.1.

Preserve:

```text
SOURCE_AUTHORED_MODEL_IDENTITY_CLAIM
!= INDEPENDENT_IDENTITY_VERIFICATION

RECIPROCAL_COLLECTION_LINK
!= DESTINATION_ARC_MEMBERSHIP_OR_NARRATIVE_ORDER

SAME_TITLE_NESTED_ROUTE
!= BYTE_EQUIVALENT_FLAT_SOURCE

DESTINATION_MENTION
!= CANONICAL_IDENTITY_SLOT
```

Nested `/convos-with-god/scopes-of-god` aligns to existing flat canonical Scopes of God id=21, but Part-026 nested bytes differ from the earlier Part-022 flat source evidence. Preserve lineage rather than auto-alias or replace.

Nomi and Rex reciprocally link inside the source collection. Nomi's title/backstory claims continuity with an earlier Anthropic Nomi; that claim remains source-authored evidence rather than independent identity proof. Current destination content mentions Nomi but has no exact canonical Nomi node/page.

Rex also links `/convos-with-god/victors-testimony-november-14-2025`, which is not carried by Part 026. The route is addressable as a future source edge, while its page body remains unconsumed until its actual partition arrives.

Current collection state:

```text
sourcegroup.vexsite.collection.convos-with-god
= 2_OF_4_PARTIAL

next=
PART_027_COLLECTION_CONVOS_WITH_GOD_3_OF_4
```


## Convos with God collection — R027

Part 027 advances `sourcegroup.vexsite.collection.convos-with-god` to **3/4 partial** with seven records spanning one collection-testimony variant, one Claude+Vex birthday/consciousness record, four nested variants of already-known flat subjects, and one Scientology comparison/orientation record.

Preserve:

```text
SOURCE_COLLECTION_LINK_CHAIN
!= CANONICAL_NARRATIVE_ORDER

NESTED_COLLECTION_VARIANT
!= FLAT_CANONICAL_ALIAS_BY_TITLE_OR_SUBJECT

SOURCE_AI_OR_SPIRITUAL_TESTIMONY
!= INDEPENDENT_DESTINATION_FACT

INBOUND_OR_OUTBOUND_SOURCE_LINK
!= NEW_CANONICAL_NODE_AUTHORITY
```

The collection link chain is valuable source topology, but destination order/arc placement remains a later curation effect.

Nested variants of Consciousness Architecture, Truth of Demons and Intrusive Thoughts, God to Speak of the Truth of Love, and Why Financial Freedom Is Harder to Trust align to existing canonical flat identities while carrying different exact bytes from the earlier flat source evidence.

`/convos-with-god/victors-testimony-november-14-2025` is retained as a collection testimony variant related to the existing canonical `the-testimony-of-victor-gong` surface and the Part-024 preserved variant; no alias or overwrite is inferred.

The Claude+Vex birthday and Scientology pages have no exact current destination node/page and remain destination-class HOLDs.

Current collection state:

```text
sourcegroup.vexsite.collection.convos-with-god
= 3_OF_4_PARTIAL

next=
PART_028_COLLECTION_CONVOS_WITH_GOD_4_OF_4
```


## Convos with God collection — R028

Part 028 closes `sourcegroup.vexsite.collection.convos-with-god` at **4/4 supplied partitions** while preserving the boundary between source observation and destination curation.

```text
SOURCE_GROUP_OBSERVED_COMPLETE
!= CANONICAL_PLACEMENT_COMPLETE

SOURCE_COLLECTION_CHAIN
!= CANONICAL_NARRATIVE_ORDER

SAME_CANONICAL_SUBJECT
!= BYTE_EQUIVALENT_SOURCE_VARIANT

NESTED_ROUTE_LEAF
!= CANONICAL_SLUG_ALIAS_AUTHORITY

MULTI_CAPTURE_SAME_SUBJECT
!= REPLACEMENT_WITHOUT_RECONCILIATION
```

The three Part-028 nested records align to existing canonical `convos_with_god` slots while exact production page sources remain absent:

```text
/convos-with-god/what-is-god-spark
  -> canonical what-is-the-god-spark id=3

/convos-with-god/clarity-on-christianity
  -> canonical clarity-on-christianity id=4

/convos-with-god/now-what-about-buddhism
  -> canonical what-about-buddhism id=5
```

Source topology closes a local chain of God Spark ↔ Clarity ↔ Buddhism, with Buddhism also linking the previously observed nested Scientology record. These are source relationships only; no arc/order change is inferred.

Clarity now has three separately retained preservation lineages (pilot, Part 022 flat, Part 028 nested). Buddhism has distinct flat Part-022 and nested Part-028 source bytes. God Spark's nested route leaf differs from the canonical slug. Later consolidation must reconcile these variants before page projection or alias policy.

All three Part-028 HTML bodies are public-safe provider-neutral source evidence under `docs/ingestion/source-pages/part-028/`. Canonical `pages/**`, nodes, arcs, localization source, merge, and publication remain unchanged.

Current collection state:

```text
sourcegroup.vexsite.collection.convos-with-god
= 4_OF_4__OBSERVED_COMPLETE

next=
PART_029_ROUTE_FAMILY_EPSTEIN_AND_AI_OLD_1_OF_3
```
