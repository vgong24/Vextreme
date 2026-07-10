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

### Step 5+ — remaining pages, and eventually the God-Script path

22 pages remain isolated. Whether the long-term target is universal `shell.js` coverage,
universal God-Script wiring (`pe-002`), or a deliberate mix, is a decision to make once
more of the rollout's real results are in — not guessed now.

## What this is not

Not a redesign of any of the three navigation mechanisms. Not a decision to retire
`shell.js` or to force universal God-Script wiring. Not a claim that every isolated page
*should* be reachable the same way — a raw content fragment meant for a Squarespace Code
Block, for instance, may legitimately never need `shell.js` if it's never viewed outside
that context. Each page's real disposition is a judgment call informed by
`lib/audit-nav.js`'s output, not a blanket rule.

<!-- [VXG RealForever] -->
