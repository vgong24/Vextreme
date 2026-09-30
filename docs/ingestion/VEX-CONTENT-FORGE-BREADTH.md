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

Parts 012–023 are repository-materialized on draft PR #162. R023 brings the cumulative breadth state to **190 observed pages**: **118 public-safe routed source-evidence HTML files**, one protected Part-022 source represented metadata-only, twelve per-part receipts, and the cumulative R023 scanner map.

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
