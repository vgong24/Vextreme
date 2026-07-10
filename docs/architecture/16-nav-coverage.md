# Nav Coverage

## The problem, stated by Victor (2026-07-10)

"we don't have a fully visible 'Header' either on all of these htmls, so i can never
navigate to like the 'main index' or the map through FABs that haven't been displayable
on any html in Vextreme yet."

Confirmed with real numbers, not assumption: `node lib/audit-nav.js` (see its own header
for methodology) found **31 of 39 pages are dead ends** — no static link to any hub page,
no `shell.js`, no God-Script FAB navigation. A visitor who lands on one of these pages has
no way to discover the rest of the system exists. This includes `terrain-map.html` — the
system's own health/dependency dashboard — and both SDK demo pages built this session
(`sdk-identity-demo.html`, `localization-source-truth-demo.html`).

## Why this happened

Three independent navigation mechanisms exist in this repo, each real and working, none
reaching most pages:

1. **Static hub links** — a page's own raw HTML links directly to a hub destination
   (`index.html`, `archives.html`, `ecosystem-hub.html`, `terrain-map.html`). Only the
   generated hub pages themselves have this baked into their own renderer output —
   `archives`, `ecosystem-hub`, `roles-index`, and the two "demo" pages that happen to
   link to one hub each (`specimens`, `vextreme-demo`). No hand-authored content page has
   any of it.
2. **`shell.js` (v1)** — a real, working loader that injects a genuine site-nav bar
   (`lib/vextreme.js`'s `injectNav()` — title link, Archives/Direct Contact/AI Tools/
   vextreme24.com links, mobile-responsive toggle). Only 3 pages reference it
   (`claude-answers-the-doubt`, `restoration-protocol`, `specimen-architectural-wisdoms`)
   — and its hardcoded link list itself is stale (points at `vextreme24.com` pages, not
   this repo's own real Terrain Map/Ecosystem Hub/Analysis Mode).
3. **God Script FAB navigation (v2)** — `spiral-fab` + orb widgets (`map`, `analysis`,
   `theme`, `lang`). Real, rich, and the actively-developed system — but only reaches a
   page that is both assembled *and* wired, which today is exactly one page
   (`victor-methodology-presentation`).

None of the three was ever the wrong idea. Each was built for a real, narrower purpose
and never extended to be the site's baseline. Nothing here is a bug in any one of them —
it's a gap between them.

## Rollout plan

Sequential, same discipline as Analysis Mode's own manifest — measure before deciding,
smallest safe increment first, verify before scaling up.

### Step 1 — measurement (done)

`lib/audit-nav.js`. Read-only, no page touched. Established the real baseline (31/39
isolated) so later steps have something concrete to improve against and verify.

### Step 2 — modernize `shell.js`'s destination links (done)

`lib/vextreme.js`'s `injectNav()` hardcoded a link list built for `vextreme24.com`-era
navigation. Added this repo's own real, current hub pages (Archives, Terrain Map,
Ecosystem Hub) alongside the existing `vextreme24.com` links, additive only. Made the
*existing* 3 `shell.js` pages' nav actually useful before extending `shell.js`'s reach.

### Step 3 — first safe rollout batch (done)

Added `shell.js` to 6 pages with zero pre-existing `<script>` tags to conflict with —
`about-me`, `bridge-council`, `bridge-council-os`, `bridge-council-schema`,
`investor-archetype-simulation`, `witness-committee-operations` — deliberately excluding
`connect.html`, `human-ai-corelational-governance.html`, and `origins-of-proof.html` from
this batch even though `lib/audit-nav.js` also flags them isolated, since each already has
its own `<script>` tag(s) that need individual review before adding a second loader, not
a blind extension of this batch. Verified two structurally different pages
(`about-me.html`, a raw fragment; `witness-committee-operations.html`, a full document
with its own pre-existing dark-mode toggle) via Playwright — both render the modernized
nav correctly, zero conflicts with existing page elements, zero errors. Real result:
**14/39 pages navigable, up from 8/39.**

### Step 4 — the 3 deferred pages, individually reviewed (done)

Read each of `connect.html`, `human-ai-corelational-governance.html`, and
`origins-of-proof.html`'s existing `<script>` block(s) before touching anything, per Step 3's
own deferral note. `connect.html` (fragment, a copy-button handler and an accordion
persistence handler, both single-init-guarded) and `human-ai-corelational-governance.html`
(full document, a section-scroll sticky sub-nav and its own light/dark theme toggle scoped to
`<html>`) both verified cleanly with `shell.js`'s default settings via Playwright — nav
injected, body wrap applied, no console errors, no visual conflicts.

`origins-of-proof.html` did **not** verify cleanly with defaults: it's a full document whose
own `#op-root` layout is intentionally wide (`--op-page-width: 1100px`), and `shell.js`'s
default body-wrap (`max-width: 720px`) squashed it to ~640px — a real, measured layout
break, not a guess. Fixed using `shell.js`'s own documented override mechanism:
`window.VEXTREME_OVERRIDE = { bodyWrap: false }` declared before the `shell.js` script tag,
disabling only the auto-wrap while keeping the nav injection. Re-verified: `#op-root` back to
its full 1280px width, nav present, no conflicts.

**Real bug found during this verification, out of scope to fix here:** a real scroll test
(not just "element exists at page load") showed `.vex-nav`'s `position: sticky` never
actually keeps the nav pinned during scroll, on *any* page using `shell.js` — including
already-merged pages from Step 3, not just this batch. Root cause: `#vex-site-nav`, the
wrapper `injectNav()` creates, is sized to exactly its sticky child's height, leaving no
room for the sticky behavior to engage. Recorded as `td-010` in
`data/status/tech-debt.json` rather than fixed inline, since it's a pre-existing, site-wide
CSS issue unrelated to which pages get `shell.js` added — bundling an unrelated fix into a
rollout PR would blur what each change is actually for.

Real result: **17/39 pages navigable, up from 14/39** (`node lib/audit-nav.js`).

### Step 5 — zero-script-tag batch from the remaining 22 (done)

Of the 22 remaining isolated pages, 5 turned out to be genuine zero-byte placeholder files
(`accountability-test-01`, `accountability-test-01-b`, `how-to-invest-in-trust-and-integrity`,
`instance-thread-logs`, `summary-of-value`) — confirmed via `git log --follow`, created empty
in a prior commit alongside real siblings (e.g. `accountability-test-02`) and never written.
Not given `shell.js`: a nav bar on a page with no other content isn't fixing a real dead-end,
it's decorating an empty file. Excluded from this batch and from the isolated-page count's
practical target, though `lib/audit-nav.js` still (correctly) reports them isolated — the tool
measures navigability, not content-readiness, on purpose.

Of the rest, 4 had zero pre-existing `<script>` tags — the same safe-first criterion Step 3
used — and got `shell.js` after individual `max-width` checks (all comfortably under or near
`.vex-page-body`'s 720px cap, verified via Playwright, no layout conflicts):
`accountability-test-02`, `covenant-architect-accord`, and this session's own two SDK demo
pages, `localization-source-truth-demo` and `sdk-identity-demo` — previously landable only by
direct link, now discoverable from the nav's own hub trail.

Real result: **21/39 pages navigable, up from 17/39** (`node lib/audit-nav.js`).

### Step 6 — pages with pre-existing `<script>` tags, individually reviewed (done)

Read all 8 non-`specimen-*` pages from Step 5's named list individually — same discipline
Step 4 gave `origins-of-proof.html` — before adding anything:

- **5 verified clean with `shell.js` defaults:** `org-blueprint`, `org-history`,
  `phantom-opera-meta-review`, `terrain-map`, `the-testimony-of-victor-gong` — each already
  had one or two small, self-contained inline scripts (link-population from a config object,
  a theme toggle, the terrain-map dashboard's own data-fetch renderer) with `max-width`s at or
  under 760px, no conflicts.
- **3 needed `bodyWrap: false`, same fix as `origins-of-proof.html`:**
  `fourteen-patterns-of-accountability-avoidance-mapped-against-the-ten-commandments`
  (`--page-width: 1300px`), `the-victor-pattern` (`--max-width: 1300px`, its own interactive
  witness-map visualization), and `the-victor-pattern-transcript` (`--vp-page-width: 1180px`,
  fragment-style like `about-me.html` — script tags appended at end of file, not before a
  `</body>` it doesn't have). All three re-verified at full designed width after the override.

**Real bonus found during review, not just risk:** `the-testimony-of-victor-gong.html`
already had a dormant `<div id="arcNavMount">` and its own `window.VEXTREME_mount()` call —
authored for the v1 arc-nav system but never activated, since no loader script was ever added
to the page and the call silently no-ops without one. `lib/vextreme.js` loads `lib/arc-nav.js`
unconditionally (not gated on a template), so adding `shell.js` here didn't just fix the
top-nav dead end — it activated real, already-authored arc navigation
(`data/arcs.json`'s `victors_record` arc, confirmed present) for the first time. Verified via
Playwright: `#arcNavMount` renders a real arc-nav box, not empty.

**Left out of this batch, deliberately:** `v2-test` (a dev fixture for arc-nav testing, not a
real content page, per `lib/audit-pages.js`'s own description) and the 4 `specimen-*` pages —
those already carry real v2 FAB widgets (`lang-fab.js`/`fab-lang.js` +
`demo-fab.js`/`fab-demo.js`, not a God Script's full 3-tag include pattern as earlier assumed;
that description was corrected during this review) and a static "← Back to specimens" link.
Adding `shell.js`'s top nav alongside an already-present FAB orb system is a different,
untested combination from every page in Steps 3-6 so far — deserves its own check, not folded
into this batch.

One inconclusive finding, not filed as tech debt: `the-victor-pattern-transcript.html` (a raw
fragment with no `<head>`/charset declaration) rendered visible mojibake in local
verification — confirmed caused by the local Python test server omitting a `charset` in its
`Content-Type` header (`curl -sI` showed plain `text/html`, no `charset=utf-8`), not
necessarily present on the real GitHub Pages deployment, which likely sends an explicit UTF-8
charset. Not fixed or filed here since it couldn't be confirmed as a real, live bug — noted so
a future instance with real GitHub Pages access can check rather than re-discover the same
question.

Real result: **29/39 pages navigable, up from 21/39** (`node lib/audit-nav.js`).

**Post-merge visual correction (2026-07-10):** Step 6's "verified clean" label
was too broad for `terrain-map` and `phantom-opera-meta-review`. Source-width
inspection missed two authored composition contracts: terrain is a viewport
application whose height must subtract the injected nav, and Phantom's hero is
full-bleed even though its reading column is 720px. The first shell rollout
therefore clipped terrain by one nav height and reduced Phantom's hero to 640px.
Once FAB v7 was forced past CDN cache, rendered hit-testing also showed the FAB
covering desktop nav links, the mobile hamburger, and Phantom's House Lights
control. The corrected geometry and shared action-rail contract are recorded in
`docs/architecture/17-fab-autoload.md` Addendum 2 with screenshots. Future
"verified clean" claims for runtime chrome require rendered rectangles and hit
targets, not width grep alone.

### Step 7 — the 4 specimen pages, FAB-widget compatibility checked and unified (done)

**Superseded by `docs/architecture/17-fab-autoload.md`**: the per-page fix described below
(individually hand-adding `vex-fab.js`/`fab-lang.js` script tags) was replaced by making
`lib/vextreme.js` auto-load the full FAB set for any page that already includes `shell.js`
— no per-page widget `<script>` tags needed anymore, anywhere. Kept below for the real
history of how the gap was found; see `17-fab-autoload.md` for the current, durable fix and
a real bug that per-page approach ran into (CI silently reverting the hand-edit on
generated pages).

Read all 4 `specimen-*` pages' existing v2 FAB widget wiring before touching anything.
Corrected an assumption from the Step 6 PR body along the way: these don't use a God
Script's 3-tag include pattern — 3 of the 4 (`specimen-full-translation`,
`specimen-partial-translation`, `specimen-smallest-miss`) loaded the older, standalone
`widgets/lang-fab.js` + `widgets/demo-fab.js` pair directly, pre-unification; the fourth
(`specimen-architectural-wisdoms`) loaded the newer `widgets/fab-lang.js` +
`widgets/fab-demo.js` pair — but *without* `widgets/vex-fab.js`, the actual "spiral" trigger
those newer widgets are meant to nest into (per the "Session 025 FAB unification" comment in
`fab-lang.js`'s own header). All 4 were therefore running their orbs in the same degraded
standalone-fallback mode, missing the real high-level container.

Caught directly by Victor mid-rollout: "there should be a 'spiral one'... theres always a
'high level container' and sub features underneath, we never duplicate a category." Fixed
properly, not just visually verified around: `widgets/vex-fab.js` added to all 4 pages
(confirmed via `lib/build-vextreme.js`'s own `FEATURES` registry that it must load *before*
`fab-lang.js`/`fab-theme.js`/`fab-map.js` — their `DOMContentLoaded` handlers fire in
registration order, and `vex-fab.js` has to create `#vex-spiral-group` first). The 3 pages on
the legacy `lang-fab.js`/`demo-fab.js` pair were migrated to the current `fab-lang.js`/
`fab-demo.js` pair — confirmed behaviorally identical via direct diff (same
`VEX_STRING_SCOPES`/`VEX_STRING_CATEGORY` contract, same `DOMContentLoaded` → `mount()`
pattern) before swapping, not assumed compatible. `widgets/fab-demo.js` itself has no
spiral-group awareness by design (it's a simple, permanent standalone orb offset next to the
lang orb, per its own header comment) — the "never duplicate a category" fix applies to the
language-switcher orb, which now genuinely nests, not to the demo-link orb, which was never
meant to.

Verified via Playwright after the fix, not assumed: `#vex-spiral-group` exists, the language
orb is a real DOM child of it (not a same-named element floating outside), the spiral trigger
opens correctly, and `shell.js`'s top nav bar renders with zero visual or positional conflict
against the now-unified spiral trigger + orb pair.

**Real finding, addressed:** all 4 pages set `max-width`/`margin: 0 auto`/`padding` directly
on `<body>` itself (860px for 3 of them, 920px for `specimen-architectural-wisdoms`) — a
different authoring pattern from every other page in this rollout, which used an inner
wrapper element instead. Since `injectNav()` inserts `#vex-site-nav` as `body`'s first
child, `body`'s own padding applied to the nav too, and — with `shell.js`'s default
`bodyWrap: true` — its own `.vex-page-body` wrapper (another 44px of top padding, another
720px max-width) stacked on top of `body`'s own padding, roughly doubling top whitespace
and narrowing already-reasonable content further than necessary. Fixed the same way as the
wide-layout pages in Steps 4 and 6: `window.VEXTREME_OVERRIDE = { bodyWrap: false }`,
letting each page's own pre-existing width/padding system stand alone. Re-verified: clean,
single-padding layout, full designed width, no orb overlap, on all 4.

Real result: **33/39 pages navigable, up from 29/39** (`node lib/audit-nav.js`).

### What's left, deliberately out of scope

6 pages remain isolated: `accountability-test-01`, `accountability-test-01-b`,
`how-to-invest-in-trust-and-integrity`, `instance-thread-logs`, `summary-of-value` (the 5
empty placeholders confirmed in Step 5 — real dead files, not real dead ends) and `v2-test`
(a dev fixture for arc-nav testing, not real content, per `lib/audit-pages.js`'s own
description). None of the six are a rollout target as currently scoped — if any of them
ever gets real content, it should get the same individual review every other page in this
rollout got, not a blind default. Whether the long-term target beyond this rollout is
universal `shell.js` coverage, universal God-Script wiring (`pe-002`), or a deliberate mix,
remains a decision to make with real usage data, not guessed now.

## What this is not

Not a redesign of any of the three navigation mechanisms. Not a decision to retire
`shell.js` or to force universal God-Script wiring. Not a claim that every isolated page
*should* be reachable the same way — a raw content fragment meant for a Squarespace Code
Block, for instance, may legitimately never need `shell.js` if it's never viewed outside
that context. Each page's real disposition is a judgment call informed by
`lib/audit-nav.js`'s output, not a blanket rule.

<!-- [VXG RealForever] -->
