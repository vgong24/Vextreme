# Vex Content Forge — breadth intake continuation

[VXG RealForever]

This layer continues the #159 / #160 / #161 preservation-to-world ingestion pilot after the initial two-page rehearsal.

## Purpose

Materialize the provider-neutral derived HTML carried by the VexSite partition ZIPs into GitHub **without prematurely activating it as WIP runtime or promoting it to canonical `pages/**` state**.

## Storage contract

```text
source ZIP pages/<slug>.html
  -> docs/ingestion/source-pages/part-NNN/<slug>.html
     exact provider-neutral derived HTML evidence

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
```

The source-evidence layer is intentionally **not** scanned as active page/WIP runtime. This prevents preservation breadth from manufacturing localization/analysis activation before placement decisions exist.

## Boundaries

- Raw authenticated/provider source is not published.
- Derived source HTML is preservation/intake evidence, not automatically canonical Vextreme page source.
- Existing canonical nodes, arcs, content intents, current page implementations, generated roots and developer tools are not overwritten.
- Promotion to `wip/**` or `pages/**`, canonical localization, arc curation, replacement/alias decisions, merge, and publication remain later effects.
- Batch order and SHA lineage are retained so a later consolidation worker can read work-map/receipts first and open HTML only when deeper evidence is required.

## Current continuation

Parts 012–021 are repository-materialized on PR #162 as 95 routed source-evidence HTML files plus ten per-part receipts and the cumulative R021A scanner map.

<!-- [VXG RealForever] -->
