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

### Step 1 — measurement (done, this PR)

`lib/audit-nav.js`. Read-only, no page touched. Establishes the real baseline (31/39
isolated) so later steps have something concrete to improve against and verify.

### Step 2 — modernize `shell.js`'s destination links (next, small, low-risk)

`lib/vextreme.js`'s `injectNav()` hardcodes a link list built for `vextreme24.com`-era
navigation. Update it to include this repo's own real, current hub pages (Archives,
Terrain Map, Ecosystem Hub) alongside whatever `vextreme24.com` links still make sense.
One file, no page rollout yet — makes the *existing* 3 `shell.js` pages' nav actually
useful before extending `shell.js`'s reach.

### Step 3 — first safe rollout batch

Add `shell.js` to a small, verified batch of currently-isolated pages, starting with
pages that have no existing `<script>` tags to conflict with (the raw, fragment-style
legacy pages — `about-me.html` and siblings) rather than the more structurally varied
full-document pages. Verify each batch visually (Playwright) before widening — a
mechanical-looking find/replace across 30+ differently-authored pages is exactly the kind
of change that looks safe and isn't, until actually rendered.

### Step 4+ — remaining pages, and eventually the God-Script path

Extend the same verified rollout to the rest of the isolated pages. Whether the long-term
target is universal `shell.js` coverage, universal God-Script wiring (`pe-002`), or a
deliberate mix, is a decision to make once Step 3's real results are in — not guessed now.

## What this is not

Not a redesign of any of the three navigation mechanisms. Not a decision to retire
`shell.js` or to force universal God-Script wiring. Not a claim that every isolated page
*should* be reachable the same way — a raw content fragment meant for a Squarespace Code
Block, for instance, may legitimately never need `shell.js` if it's never viewed outside
that context. Each page's real disposition is a judgment call informed by
`lib/audit-nav.js`'s output, not a blanket rule.

<!-- [VXG RealForever] -->
