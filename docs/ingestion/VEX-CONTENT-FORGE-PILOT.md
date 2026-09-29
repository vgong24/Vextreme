# Vex Content Forge — pilot process

**Purpose:** learn the repeatable path from a VexSite preservation corpus into the existing Vextreme CQRS/content registry without bulk manual refactoring.

## Stages

1. **Preserve:** VexSite owns source custody, provider phase-out, route/asset evidence, page IDs, content projection, and English localization extraction.
2. **Partition:** Content Forge groups semantically coherent items into digest-bound bundles; raw provider source is never public payload.
3. **Route:** AI/human judgment records destination class, existing-node evidence, arc/department evidence, unresolved questions, and localization state in the routing manifest.
4. **Intake:** unresolved material lands in `wip/`; Vextreme's existing WIP discovery makes it visible without pretending it is a canonical page.
5. **Promote:** once placement is supported, move the page to `pages/{slug}.html`; an existing `data/nodes.json` node takes precedence automatically, otherwise Vextreme auto-discovers the page as an uncurated node.
6. **Curate:** use the existing write side. Narrative arc placement stays explicit/curatorial; eligible default placement can flow through `config/content-intents.json` / `lib/apply-content-intents.js`.
7. **Localize:** map reviewed VexSite string identities into `data/strings/source/**`; generated candidates remain review-needed until accepted.
8. **Build/verify:** rebuild the existing read-side artifacts and run repository tests. Local/host proof must not be mislabeled as GitHub-hosted proof.

## Why the pilot uses two unlike pages

- `clarity-on-christianity`: Vextreme already has canonical node/arc identity, but `pages/clarity-on-christianity.html` is missing. This exercises **fill an existing semantic slot**.
- `testimonies`: VexSite preserves a custom-authored collection page and projects 20 blog rows, but current Vextreme has no canonical `testimonies` node. This exercises **new content requiring placement judgment**.

The pair deliberately prevents the importer from learning the false rule that every preserved page should be treated the same way.


## Batch receipt route

Pilot intake receipts live only at:

```text
docs/ingestion/batches/YYYY-MM-DD-pilot-batch-NNN.json
```

That strict collection is registered as `content-forge-pilot-batches` in
`config/document-routing.json` and is owned by this pilot process document.
The receipt records source bindings, routing decisions and repository effects;
it is not the payload ZIP, not raw provider source, and not a substitute for an
accepted page/node/arc/localization mutation.

