# 2026-09-27 — Squarespace preservation observations

This note records decisions made from representative deployed-source examples before bulk ingestion. It is intentionally descriptive rather than a migration plan.

## Example 1 — Home / normal authored page

Observed pattern:

- a large authored Code Block is present inside the rendered Squarespace source;
- inline HTML/CSS is substantially preserved;
- site navigation exposes root-relative internal routes;
- footer imagery can still point at Squarespace CDN URLs;
- shared Squarespace styles/scripts remain external;
- shared Vextreme injection is present in the deployed source but also has a repository source of truth.

Decision:

- preserve the complete rendered source as evidence;
- extract authored Code Blocks as a derived artifact, never as a substitute for the raw source;
- preserve root-relative internal links as route edges;
- localize externally hosted assets and record original URLs.

## Example 2 — The Victor Pattern topology

Repository source already exists at `pages/the-victor-pattern.html`.

Observed pattern:

- the visible topology is not a static screenshot;
- JavaScript computes positions and interactions at runtime;
- browser APIs and local state participate in behavior;
- a preview that does not execute scripts can look materially different from the real page.

Decision:

- classification: **LOCAL_DYNAMIC**;
- static parsing is necessary but insufficient;
- runtime browser qualification is mandatory;
- offline tests should exercise layout, selection/highlighting, resize behavior, and persistent browser state where present.

## Example 3 — The Victor Pattern Transcript

Repository source already exists at `pages/the-victor-pattern-transcript.html`.

Observed pattern:

- set titles, commentary, progress state, next/previous behavior, deep links, and most presentation logic are embedded locally;
- the visible document panel is an iframe whose URL is constructed in JavaScript from Google Drive document IDs;
- therefore a literal `iframe[src]` scan alone would miss a required dependency;
- a script-disabled preview can render labels/structure while leaving JS-populated body text empty.

Decision:

- classification: **DYNAMIC_REMOTE_DOCUMENTS**;
- dependency discovery must inspect JavaScript and observe runtime network activity;
- remote document corpora should be captured as separate preservation artifacts and remapped locally;
- qualification should traverse all known application states (for example all transcript sets) rather than only the initial page load.

## Example 4 — Bridge Council Protocol

The deployed page source identifies `/bridge-council` and contains two authored Code Blocks:

1. a three-link Blueprint → Operating System → Technical Schema navigation strip;
2. the Bridge Council Blueprint body.

The body explicitly says its presentation depends on Bridge Council CSS rather than carrying the complete template stylesheet inline. The authored content is already tracked at:

- `pages/bridge-council.html`
- `styles/page-templates/bridge-council.css`

The deployed page still contains Squarespace-hosted fonts, site/template CSS, runtime JS, social component assets, and the shared footer image.

Decision:

- classification: **SOURCE_BACKED_TEMPLATE + DEPLOYED_HOST_WRAPPER**;
- do not duplicate already-safe authored source just because it appears inside Squarespace;
- preserve the deployed wrapper because it records the actual host composition and historical rendering state;
- distinguish repository-owned dependencies from third-party/Squarespace dependencies;
- when localizing, prefer the repository-owned template source as the future adaptation source while retaining the deployed snapshot as provenance.

## Shared discovery: deployed Vextreme injection vs repository state

Rendered captures currently include an older deployed Vextreme loader generation, while `docs/squarespace-injection.html` on repository `main` is newer.

Decision:

- a Squarespace capture is a **timestamped deployment snapshot**, not automatically the newest Vextreme source;
- never overwrite newer repository source with older deployed injection;
- keep both identities in the manifest:
  - `deployedSourceFingerprint`
  - `repositorySourceRef`
- migration logic should reconcile them explicitly after preservation, not during emergency capture.

## Dependency classes

The adapter should emit at least these classes:

```text
INLINE_CONTENT
INTERNAL_ROUTE
REMOTE_ASSET
REMOTE_STYLESHEET
REMOTE_SCRIPT
REMOTE_FONT
REMOTE_DOCUMENT
REMOTE_MEDIA
DYNAMIC_REMOTE_DEPENDENCY
REPOSITORY_OWNED_DEPENDENCY
EXTERNAL_NAVIGATION
SQUARESPACE_RUNTIME
UNKNOWN_REMOTE
```

These are classifications, not rewrite instructions.

## Capture priority

The current priority is intentionally:

```text
1. get source into safety
2. get remote bytes into safety
3. preserve route/dependency relationships
4. prove local/offline replay
5. only then adapt into Vextreme pages/arcs
```

Do not rush steps 4–5 merely because some page source already exists in GitHub.
