# Fixture intake / quarantine

Representative page captures are useful for building the adapter, but this public repository is **not** the raw evidence vault.

## Do not commit raw authenticated Squarespace source

Logged-in rendered source can contain account/editor context unrelated to the public website. A raw capture must stay local/private unless a sanitizer proves that authenticated context has been removed.

For each local fixture, preserve:

```text
original filename
capture timestamp
original route
SHA-256 of raw file
optional screenshot(s)
notes about expected behavior
sanitized fixture path, if one is produced
```

## Current representative fixture classes

| Fixture | Class | Main preservation pressure |
| --- | --- | --- |
| Home | static + remote assets | CDN image/font/CSS/JS localization; route graph |
| The Victor Pattern | local dynamic | runtime layout/interactions/state |
| The Victor Pattern Transcript | dynamic + remote documents | JavaScript-created Google Docs iframe dependencies |
| Bridge Council | source-backed template + deployed wrapper | keep deployed composition while reusing already-safe repo source |

## Sanitized fixture rule

A sanitized fixture should retain the smallest source necessary to reproduce the preservation behavior being tested while removing authenticated/editor metadata.

Good fixture examples:

- a Code Block plus a remote image reference;
- a dynamic SVG/JS page that requires browser execution;
- an iframe URL constructed in JavaScript;
- a page-template body whose CSS is a separate repository dependency;
- protocol-relative Squarespace asset URLs.

The goal is not to manufacture a cleaner website. It is to preserve enough real structure to make the adapter prove that it understands the classes observed in production.
