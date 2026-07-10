# Analysis Mode

## The decision

Victor asked (2026-07-10) for something bigger than a fixed sanitized-output demo page:
a live, searchable, exportable, growing interface — "add an HTML to be mappable, then
returned in full and exportable in different languages or formats upon a UI interface" —
plus screenshot-to-code navigation, plus a per-element reverse-usage view, surfaced through
a FAB-triggered panel like the existing language/theme/map orbs, not a separate page. He
named this "Lane 1" (L7 demo fidelity: real IDs, real mapping, no private exposure) and
"Lane 2" (God Script default-wiring/capability config) together, and asked Claude to lead,
decide, plan as a manifest, and build sequentially — "we're our own client."

**The decision: build this entirely inside the public Vextreme repo, over Vextreme's own
real content — not as a synthetic demo of the private SDK.**

This resolves the tension both lanes were circling without weakening either boundary:

- Vextreme's own compiled string bundles already are a real canonical-ID system.
  `docs/architecture/06-i18n.md` says it outright: "The key registry in
  `data/strings/source/` is not just a string file — it is the element identity layer for
  the entire UI." Every key (`common.label.page-live`, `pages.victors-recap-arc-1.hero`,
  etc.) already has real per-language values across `en`/`ja`/`zh` (`data/index.json`'s
  `supportedLangs`).
- `lib/trace-string-usage.js` already computes reverse usage (`scanUsages`, `traceKey`,
  `tracePage`, `findOrphanUsages`, `findUnusedKeys`) — real forward/reverse mapping,
  today, CLI/stdout-only.
- `lib/build-terrain-map.js`'s `findScreenshots()` already indexes real per-slug,
  per-language screenshots (`docs/screenshots/{slug}-{lang}.png`, written by
  `scripts/screenshot-page.js`) — real screenshot-to-content mapping, today.
- `lib/strings-export.js` already exports per-scope CSV batches — real export, today,
  CLI-only.

None of this is synthetic and none of it requires touching the private SDK. What's
missing is a unified, interactive, browser-facing surface tying these four already-real
pieces together — that's what Analysis Mode is. The private SDK's actual commercial-depth
implementation (resolver algorithms, vendor packet internals, client-specific data) stays
exactly as private as it already is; this is a parallel, independently-real instance of the
*pattern* (canonical ID, forward/reverse map, misalignment/missing-value detection,
screenshot evidence, export), proven live on public data instead of performed on a fixture.
That is the public/private "diff of meaning": the pattern is what's valuable to show: the
private implementation is what stays hidden, and showing the pattern working for real is
more convincing than a sanitized narrative ever was.

This also answers Lane 2 concretely instead of abstractly: Analysis Mode becomes a real,
motivated test case for the God-Script/FEATURES-registry capability-configuration question
(`od-011`) — built once, its actual cost (index size, fetch weight) tells us whether
default-on or per-slug opt-in is the right answer, rather than deciding blind.

## What stays out of scope

- No live call to the private Vextreme-SDK repo, ever.
- No private schema field names as public vocabulary.
- No client data.
- Platform scope is web only, matching Victor's own framing ("platform (currently just
  web)") — no native/mobile surface implied or promised.
- Export formats start with the CSV shape `strings-export.js` already produces; other
  formats (Applanga-style, etc.) are a named future phase, not this one — see Phase B below.

## Manifest of work

Sequential, one PR-sized phase at a time, same cadence as the localization product's
L1-L7 rounds. Each phase is independently mergeable and independently useful.

### Phase A — data layer (this PR)

`lib/build-analysis-index.js`: a new build script, pure-function-tested, that composes
the outputs of `trace-string-usage.js` (reused, not duplicated — `scanUsages`, `traceKey`,
`findOrphanUsages`, `findUnusedKeys`) and `build-terrain-map.js`'s `findScreenshots()` into
one browser-fetchable artifact, `data/analysis-index.json`: every key's canonical id,
present/missing languages, which page(s) reference it, and per-slug screenshot
availability. Same CQRS shape as `data/terrain-map.json` (write-side script, deterministic,
no live compute) — nothing renders yet.

Known limitation, recorded honestly: staleness detection (EN text changed since a
translation was last touched) is not included in Phase A — `manifest.json` stores an
`enHash` per key but the `_stale` comparison itself lives in `strings-check.js`'s run-time
logic, not as a persisted field. Wiring that in is a small, separate follow-up once Phase A
is live, not blocking it.

### Phase B — Analysis Mode FAB + panel (built, this PR)

`widgets/fab-analysis.js`, following the exact mount-into-`#vex-spiral-group` contract
`fab-lang.js`/`fab-map.js`/`fab-theme.js` already use (see `widgets/vex-fab.js`'s own
docstring — "a new orb is a new small widget... this file does not need to change"). Opens
a slide-out panel, not a new page: search by key or page slug substring; a result list
showing each key's language coverage (present/missing), every page that references it as a
clickable link, and a screenshot link when one exists for a referencing page (linking to the
real file under `docs/screenshots/` on GitHub); a CSV export button downloading the
currently-filtered result set client-side (Blob download, no server round-trip).

**Scoped honestly, not silently bigger than it is:** the CSV export is the coverage/mapping
table (key, present/missing languages, referencing pages) — not translated text bodies.
`data/analysis-index.json` doesn't carry string text (only `manifest.json`'s `enHash`, not
the text itself), so full-text export would mean a second fetch layer (compiled scope
bundles) not built here. Verified live via a local Playwright pass (temporary
`playwright-core` install, cleaned up after, per this repo's own documented friction note):
real search/filter against the real 246-element index, language badges, page links,
screenshot links, empty-state handling, and a real CSV download all confirmed working
end-to-end against this repo's actual data — not a mock.

`data/analysis-index.json` is fetched lazily on first panel open, not at page load — this
matters for Phase C below, not just performance hygiene.

### Phase C — capability wiring decision (after B ships and its real cost is known)

Add `analysis` to `lib/vex-config.js`'s `Feature` enum and `lib/build-vextreme.js`'s
`FEATURES` registry. Decide default-on vs. per-slug opt-in using Phase B's actual measured
`data/analysis-index.json` fetch weight, not a guess — this is `od-011`'s real answer,
derived instead of debated.

### Phase D — code/HTML navigation (stretch, may fold into B)

From a search result, link to the real source: `pages/{slug}.html` and
`data/strings/source/pages/{slug}.json` on GitHub (public repo, already browsable — no new
infrastructure needed, just a URL template).

## Why this order

Phase A first because every later phase depends on the artifact existing and being
trustworthy — building the UI before the data layer would mean designing against guesses.
Phase C is deliberately sequenced after B, not before, because `od-011` asked a real
scaling question that Phase B's actual output size will answer better than speculation.

<!-- [VXG RealForever] -->
