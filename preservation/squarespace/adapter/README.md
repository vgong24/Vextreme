# Preservation adapter — worker contract

This is the bounded implementation target for a future worker/AI instance. It is not yet an instruction to migrate the site.

## Input

A directory or ZIP containing saved HTML source captures, optionally accompanied by screenshots and a route hint file.

The adapter must not require a human to open each Squarespace Code Block.

## Required outputs

For every input page:

- immutable input fingerprint (SHA-256);
- inferred original route/canonical URL when present;
- extracted authored blocks as derived files;
- complete static dependency inventory;
- downloaded/localized recoverable dependencies;
- original→local URL mapping;
- page→page route edges;
- page→asset edges;
- unresolved dependency list with reason;
- classification of repository-owned vs host-owned vs external navigation dependencies;
- derived portable page;
- runtime-observed network inventory;
- offline qualification result.

## Discovery requirements

Static discovery must inspect:

- `src`, `srcset`, `href`, `poster`, `data-*` URL-bearing attributes;
- `<style>` and downloaded CSS, including `url(...)` and `@import`;
- `<script src>`, inline script URL literals, `fetch()`, dynamic script/style creation, iframe assignments, and obvious URL constructors;
- inline SVG references such as `use[xlink:href]`;
- root-relative links separately from remote assets;
- protocol-relative URLs such as `//assets.squarespace.com/...`.

Runtime discovery must use a real browser against localhost and record outgoing requests. It should be able to exercise declared page-specific scenarios rather than assuming first paint is sufficient.

## Rewrite policy

Never mutate the raw source.

Derived portable pages may rewrite recoverable remote dependencies to local paths, but every rewrite must be reversible through the manifest.

Internal route paths should normally remain semantically identical so that a local server can resolve:

```text
/bridge-council
/the-victor-pattern
/the-victor-pattern-transcript
...
```

## Offline qualification

A page is not `LOCALIZED_COMPLETE` merely because HTML opens.

Minimum disposition vocabulary:

```text
CAPTURED_RAW
STATIC_INVENTORY_COMPLETE
LOCALIZED_PARTIAL
LOCALIZED_COMPLETE
RUNTIME_QUALIFIED
OFFLINE_QUALIFIED
BLOCKED_REMOTE_SERVICE
UNRESOLVED_DEPENDENCY
```

For interactive fixtures, qualification should include representative behavior, not only status 200.

Examples:

- topology: graph positions, selection, resize, browser-state behavior;
- transcript: all sets, previous/next/ticks, deep links, localized document panels;
- navigation: root-relative routes resolve between captured pages.

## Security / privacy gate

Rendered source captured while authenticated can include account/editor metadata. The worker must detect at minimum obvious authenticated Squarespace context and refuse to publish raw input into the public repository.

Safe public artifacts are:

- redacted/sanitized fixtures;
- hashes/fingerprints;
- dependency manifests with sensitive query values removed if necessary;
- authored source already intentionally public in this repository;
- architecture and verification records.

Raw authenticated captures belong in local/private preservation storage until sanitized.
