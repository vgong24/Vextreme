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
  -> docs/ingestion/workmaps/...json
     cumulative scanner-first semantic map

later, after consolidation:
  source evidence
     -> wip/<slug>.html when an active unplaced draft is actually desired
     -> pages/<slug>.html when canonical page projection is accepted
     -> another destination-native class when appropriate
     -> authorized private storage when protection requires it
```

The source-evidence layer is intentionally **not** scanned as active page/WIP runtime. This prevents preservation breadth from manufacturing localization/analysis activation before placement decisions exist.

## Boundaries

- Raw authenticated/provider source is not published.
- Explicitly protected/non-public derived source is not published by default.
- Derived source HTML is preservation/intake evidence, not automatically canonical Vextreme page source.
- Existing canonical nodes, arcs, content intents, current page implementations, generated roots and developer tools are not overwritten.
- Promotion to `wip/**` or `pages/**`, canonical localization, arc curation, replacement/alias decisions, merge, and publication remain later effects.
- Batch order and SHA lineage are retained so a later consolidation worker can read work-map/receipts first and open HTML only when deeper evidence is required.

## Current continuation

Parts 012–022 are repository-materialized on draft PR #162. R022 brings the cumulative breadth state to 178 observed pages: 106 public-safe routed source-evidence HTML files, one protected Part-022 source represented metadata-only, eleven per-part receipts, and the cumulative R022 scanner map.

<!-- [VXG RealForever] -->
