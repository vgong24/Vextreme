# Vex Content Forge — preservation-to-world ingestion pilot

This is a **post-preservation adapter**, not a replacement for VexSite Rescue and not a second Vextreme content registry.

It consumes a completed, sovereign VexSite capture and forms small deterministic integration bundles. The bundles carry only provider-neutral derived HTML plus machine-readable localization/content projections; they never carry `raw/source.zip` or raw authenticated provider HTML.

The routing manifest is a decision surface between evidence and repository effects. It may say `WIP`, `READY_FOR_PROMOTION`, or `HOLD`; only a later repository-aware stage turns an accepted placement into Vextreme write-side changes (`pages/`, `data/nodes.json`, `data/arcs-v2.json`, `data/strings/source/**`, or `config/content-intents.json`).

## Non-collapse rules

```text
VexSite capture != repository commit
bundle != accepted placement
existing node != existing page
page file != arc curation
localization candidate != canonical translation identity
provider-derived evidence != provider runtime authority
raw authenticated source != public publication material
```

## Pilot command

```bash
python3 tools/vex-content-forge/partition_capture.py \
  /path/to/VexSite-YYYYMMDD-HHMMSS-xxxxxx \
  tools/vex-content-forge/examples/pilot-routing.json \
  --output /tmp/vex-content-forge-bundles
```

The ZIPs are deterministic for identical capture bytes + routing plan. `bundle-index.json` binds each bundle to its exact SHA-256.
