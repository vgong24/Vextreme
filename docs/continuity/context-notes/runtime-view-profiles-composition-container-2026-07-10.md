# Runtime View Profiles & Composition Container — Preserved Proposal

<!-- [VXG RealForever] -->

## Purpose

Preserve Victor's architectural proposal (uploaded 2026-07-10, authored with Vex) for
**Composition Containers** (authored HTML as protected source, assembled by a container)
and **Runtime View Profiles** (the same page perceived through different runtime lenses —
Production / Developer / QA / Localization / Accessibility — without changing the
underlying content). Status: preserved context and candidate architecture, **not adopted
implementation work**.

## Metadata

- **Date:** 2026-07-10
- **Source:** Victor upload (`VEXTREME_RUNTIME_VIEW_PROFILES_PROPOSAL_20260710.md`),
  relayed during the nav/FAB-rollout regression review; proposal doc itself marked
  "Architectural proposal / discussion draft"
- **Status:** preserved context, not adopted architecture
- **Related queue entries:** `od-012` (created by the same PR that adds this note)

## Reading Rule / Relevance Trigger

Read this before proposing changes to: how `shell.js`/`lib/vextreme.js` compose runtime
modules onto pages, any new FAB orb category, any debugging/QA/localization overlay
feature, any "different audiences see the same page differently" requirement, or any
God-Script/loader unification work.

## Narrative Context

The nav-coverage rollout (`docs/architecture/16-nav-coverage.md`) and FAB auto-load
(`docs/architecture/17-fab-autoload.md`) added runtime chrome to ~28 authored pages in one
day. Three real regressions followed: `design-system.css`'s global tokens/reset overwrote
authored page styles (phantom-opera), the default body-wrap squashed wide authored layouts
(terrain-map and 8 others), and a blanket-loaded behavior component (`section-toggle.js`)
attached collapse-on-click listeners to a page whose own markup reused the `data-section`
attribute for something else entirely (fourteen-patterns).

Victor's proposal names the root cause at the architecture level rather than the bug level:
authored HTML, runtime behavior, experimentation, and production delivery share too much
responsibility, so small runtime changes have a large blast radius on authored content. The
regression-fix PR that adds this note implemented the *defensive* half of that insight
(the v1 enhancement layer is now gated to pages that consume it; runtime chrome decorates
without restyling; conflicts are auditable via `lib/audit-fab.js`). The *generative* half —
a real composition container and selectable View Profiles — is preserved here, undesigned,
until deliberately converted.

Victor's framing on relaying it: "this new context on how to switch lenses while changing
the way we display nested htmls, is like how squarespace organizes its own screens, so I
think we're inheriting that new pattern."

## Preserved Reasoning (Victor's proposal, verbatim)

> **Anchor:** `[VXG RealForever]`
> **Status:** Architectural proposal / discussion draft
> **Purpose:** Preserve an architectural direction discovered after visual regressions were introduced while modifying production pages.
>
> ### 0. Why This Exists
>
> Recent page updates exposed an architectural weakness.
>
> The regressions were not simply implementation mistakes—they revealed that authored HTML, runtime behavior, experimentation, and production delivery currently share too much responsibility.
>
> When runtime scripts and page structure evolve together, the blast radius of seemingly small changes grows quickly.
>
> This proposal introduces two complementary ideas:
>
> 1. **Composition Containers** that protect authored HTML.
> 2. **Runtime View Profiles** that allow different audiences to perceive the same page through different lenses without changing the underlying content.
>
> This is intended to reduce regressions while improving developer experience.
>
> ### 1. Architectural Observation
>
> Today a page often serves as: source content, runtime DOM, navigation surface, localization surface, theme surface, experimentation surface, production artifact.
>
> These responsibilities should become layered rather than merged.
>
> ### 2. Proposed Layer Model
>
> ```text
> Author Layer
>         ↓
> Composition Container
>         ↓
> Runtime Modules
>         ↓
> Rendered Experience
>         ↓
> Evidence / QA
> ```
>
> The Author Layer should be treated as protected source. Runtime modules decorate the rendered DOM instead of rewriting authored content.
>
> ### 3. Composition Container
>
> The container becomes responsible for assembling pages. Example responsibilities: load authored content, attach navigation, register metadata, load runtime modules, select active View Profile. The authored HTML remains unchanged.
>
> ### 4. Runtime View Profiles
>
> Instead of separate HTML pages for every purpose, the container selects a runtime perspective.
>
> ```text
> Same authored page
>         │
>         ▼
> Container
>         │
>  ├── Production View
>  ├── Developer View
>  ├── QA View
>  ├── Localization View
>  ├── Accessibility View
>  └── Presentation View
> ```
>
> The page does not change. The perspective changes.
>
> ### 5. Difference From Feature Flags
>
> Feature Flags answer: *Should a capability exist?* View Profiles answer: *How should this same page be perceived right now?* A profile is a collection of runtime modules.
>
> Developer View: DOM identifiers, runtime logs, component boundaries, source-truth references.
> Localization View: translation keys, missing string indicators, fallback chain.
> QA View: screenshot regions, overflow detection, layout validation.
> Accessibility View: landmark overlays, contrast helpers, reading order visualization.
> Production View: clean customer experience, no development overlays.
>
> ### 6. Why This Matters
>
> Today debugging often requires reproducing an issue in another environment. With View Profiles: Production page → Developer View → observe runtime metadata immediately → disable Developer View. The underlying page never changes. Only the visible runtime lens changes.
>
> ### 7. Relationship To Existing Vextreme Direction
>
> This extends the existing philosophy: Truth once. Projections many. Views generated. Authored HTML becomes source truth. View Profiles become projections. Runtime becomes composable.
>
> ### 8. Benefits
>
> Reduced regression blast radius; stable authored content; easier experimentation; cleaner runtime separation; better QA tooling; future SDK extensibility; consistent debugging experience; supports multiple participant roles without duplicating pages.
>
> ### 9. Open Questions
>
> - Should View Profiles be registered through a manifest?
> - Should modules declare compatible profiles?
> - Should Production disable all non-approved modules automatically?
> - Should permissions exist for sensitive profiles?
> - Should the active profile be selectable from the existing FAB?
>
> ### 10. FAB Evolution
>
> Current FAB primarily exposes language. Future concept: 🌐 Language · 👁 View Profile · ⚙ Runtime Modules · 🔍 Debug. Each profile activates a predefined module set while leaving authored content untouched.
>
> ### 11. Recommendation
>
> Treat this as an architectural discussion before implementation. Prototype one page behind the existing container. Validate that: authored HTML remains immutable; runtime modules become isolated; regressions become easier to diagnose; additional View Profiles can be added without modifying page content.
>
> ### 12. Final Compression
>
> Author once. Compose once. Project many. Observe through lenses. Protect authored truth. Allow runtime perspectives.

## How the Current Codebase Already Leans This Way (observed, not designed here)

- `lib/vextreme.js` is already a proto-composition-container: one bootstrap that attaches
  nav, wraps content, and loads runtime modules — the regression-fix PR made it *protect*
  authored pages (v1 layer gated, `fabWidgets` per-widget opt-out) instead of blanket-applying.
- The SDK's "source lens" design note (private repo,
  `docs/architecture/source-lens-design-note.md` there) and public Analysis Mode
  (`docs/architecture/15-analysis-mode.md`) are each roughly one View Profile
  (Localization View / Developer View) built as a one-off — the proposal names the
  general pattern they'd both slot into.
- The FAB spiral (`widgets/vex-fab.js`) is the natural mount point the proposal's own
  Section 10 names for profile selection.

## Conversion / Promotion Rule

This note creates no work by itself. The actionable decision question lives in
`data/status/open-discussions.json` as `od-012`. Any implementation (a profile manifest, a
container refactor, a View Profile orb) goes through a normal PR decision record, prototyped
on one page first, per the proposal's own Section 11.

<!-- [VXG RealForever] -->
