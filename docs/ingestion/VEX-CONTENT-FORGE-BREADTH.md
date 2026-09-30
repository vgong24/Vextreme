# Vex Content Forge — breadth intake continuation

[VXG RealForever]

This layer continues the #159 / #160 / #161 preservation-to-world ingestion pilot after the initial two-page rehearsal.

## Purpose

Port the provider-neutral derived HTML carried by the VexSite partition ZIPs into GitHub **without prematurely promoting it to canonical `pages/**` state**.

The holding rule is:

```text
source ZIP pages/<slug>.html
  -> wip/<slug>.html
     when no real destination page exists yet

source ZIP pages/<slug>.html
  -> docs/ingestion/source-pages/part-NNN/<slug>.html
     when the slug already has a real page/tool/root and a wip collision would be false

plus
  -> docs/ingestion/batches/...json
     digest-bound routing/effects receipt

plus
  -> docs/ingestion/workmaps/...json
     cumulative scanner-first semantic map
```

## Boundaries

- Raw authenticated/provider source is not published.
- A derived source HTML file is preservation/intake evidence, not automatically canonical Vextreme page source.
- `wip/*.html` is the repository's existing raw-draft lifecycle and is intentionally visible to auto-discovery/status tooling.
- Existing canonical nodes, arcs, content intents, current page implementations, generated roots and developer tools are not overwritten by breadth intake.
- Promotion to `pages/**`, canonical localization, arc curation, replacement/alias decisions, merge, and publication remain later effects.
- Batch order and SHA lineage are retained so a later consolidation worker can read the work-map/receipts first and open HTML only when deeper evidence is required.

## Current continuation

The first restored breadth branch begins from PR #161 exact head
`f049f8638fc15abda7cb08c84f0b31446813fbce`
and re-materializes already-consumed Parts 012 through 021 as repository intake state.

<!-- [VXG RealForever] -->
