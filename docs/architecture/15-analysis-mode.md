# Analysis Mode

**Boundary context:** Analysis Mode itself prompted a refinement of this repo's
public/private architecture split, recorded in
`docs/process/public-private-boundary.md` — Public Vextreme is not a limited demo but
"one organization that has already reached the desired architectural condition,"
proving the pattern by dogfooding its own architecture; Vextreme-SDK is "the reusable
machinery capable of helping other organizations reach that condition." Read that
document's "Refined principle" section before extending Analysis Mode further — it's
the checklist for keeping new phases on the public side of the line (demonstrating an
already-real pattern over public data) instead of drifting into SDK territory
(generalized resolution, heterogeneous-input adaptation, vendor workflow, governance).

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

### Phase C — capability wiring decision (built)

Measured before deciding, per the plan above: `widgets/fab-analysis.js` is 17.5KB (in
line with sibling orb widgets — `fab-lang.js` alone is 25.6KB); `data/analysis-index.json`
is ~100KB raw / ~5.4KB gzipped but is fetched lazily, only on first panel open, never at
page load. `blueprint.json`'s own `performance.budgets.perPage` ceiling is 100KB — the
widget's page-load cost is a small fraction of that.

Decision: added `Feature.ANALYSIS` to `lib/vex-config.js`, a `config/features/analysis.json`
entry, a `lib/build-vextreme.js` `FEATURES` registry entry (`default: false`, same as
every sibling orb feature — inclusion is still driven by the viewmodel, not unconditional),
and — the actual "default-on with configurable visibility" answer to `od-011` — added
`Feature.ANALYSIS` to `lib/build-index.js`'s `buildViewmodel()` default features array,
alongside `lang`/`spiral-fab`/`theme`/`map`. This is not a new mechanism: it's the exact
mechanism `theme` and `map` already use to be "on by default, per-slug excludable."

**`od-011` finding, stated plainly:** the "God Script should be default-on with per-slug
configurable visibility" question already had a working answer inside this repo before
Analysis Mode existed — `buildViewmodel()`'s default features array plus
`data/viewmodels.json`'s per-slug override array. It's opt-in-by-default at the *feature*
level (every page using the standard viewmodel gets `lang`/`spiral-fab`/`theme`/`map`, and
now `analysis`, automatically), not opt-in at the *page* level (whether a page gets a God
Script at all is still gated by `hasScopeBundle()` — a separate, still-open question,
scoped to `pe-002`, not this manifest). Demo/specimen pages that want a minimal feature set
already exclude `theme`/`map` via an explicit `viewmodels.json` override; they now also
exclude `analysis` the same way, with no new code — verified by rebuilding: their assembled
scripts don't gain the analysis feature, `victor-methodology-presentation`'s does.

**Verified end-to-end, not just at the assembler level:** rebuilt the real
`dist/vextreme-victor-methodology-presentation.js` and confirmed `feature: analysis` is
present; loaded the real, actually-built page (temporary `playwright-core`, cleaned up
after) with only the CDN URL locally redirected (network access to the real CDN isn't
available in this environment) and drove the real assembled God Script through the real
panel: 246 real elements loaded, filtered correctly to 17 matches on "archives," zero
widget-related errors.

### Phase D — code/HTML navigation (built, folded into Phase B)

Already shipped as part of Phase B: `screenshotsForKey()` links directly to the real
screenshot file on GitHub (`github.com/vgong24/Vextreme/blob/main/{path}`), and each result
row links to the real live page. Linking to the raw source HTML/string-source JSON on
GitHub (rather than the rendered page) remains a small, optional follow-up if a future
instance finds it valuable — not blocking, not scoped further here.

## Why this order

Phase A first because every later phase depends on the artifact existing and being
trustworthy — building the UI before the data layer would mean designing against guesses.
Phase C is deliberately sequenced after B, not before, because `od-011` asked a real
scaling question that Phase B's actual output size will answer better than speculation.

## Manifest status: complete

All four phases (A: data layer, B: FAB panel, C: capability wiring, D: source navigation)
are built and verified end-to-end. `od-011`'s two questions — should demo pages show real
IDs/mapping, should God Script inclusion be a configurable pattern instead of a one-off —
both have concrete, working answers: yes, over Vextreme's own real content
(`docs/process/public-private-boundary.md`'s "Refined principle" is the reasoning this
manifest is built on), through the repo's existing per-slug feature-override mechanism,
extended rather than replaced.

Read `docs/process/public-private-boundary.md`'s "Refined principle" section before
proposing a Phase E or extending Analysis Mode further — it's the checklist for keeping
new capability on the public side of the line (demonstrating an already-real pattern over
public data) instead of drifting into what `Vextreme-SDK`'s own
`docs/architecture/public-private-interface-boundary.md` names as SDK territory
(generalized resolution, heterogeneous-input adaptation, vendor workflow, governance).

<!-- [VXG RealForever] -->
