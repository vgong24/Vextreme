# Context Note — Vextreme Design Foundation (Claude Design package)

**Status:** preserved candidate deliverable, not adopted architecture
**Source:** Victor, working directly with Claude Design (a from-scratch brand/design-system
build — no existing codebase or Figma was attached to that session; only two screenshots of
an unrelated prior project structure and a hand-drawn "VXG" logo draft were used as tonal
input, not copied structurally)
**Delivered:** 2026-07-12, as a zipped Claude Skill package
**Placed:** `docs/continuity/context-notes/vextreme-design-foundation-2026-07-12/` (this note's
sibling directory — same date stem, note is the map, directory is the territory)
**Read this note when:** touching `docs/architecture/12-design-system.md`, `styles/design-system.css`,
or any decision about Vextreme's visual identity, palette, typography, or component library —
before assuming the current light-only cream/stone/ember system is the only or final answer.

---

## What this is

A complete, standalone brand + design system, structured as an installable Claude Skill
(`SKILL.md` front matter: `name: vextreme-design`, `user-invocable: true`). Not a page, not a
patch to the live system — a full parallel foundation: design tokens (color/type/spacing),
a global stylesheet, a React component library (Button, Badge, Input, Select, Checkbox, Switch,
Card, Tabs, Dialog, Tooltip — each with `.jsx` + `.d.ts` + `.prompt.md` + a live `.card.html`
specimen), guideline specimens (color/type/spacing/brand-mark HTML pages), a theme-adaptive
logo (`assets/logo/vextreme-mark.svg`, single continuous stroke, `currentColor`), and two
full-page UI-kit examples — `ui_kits/covenant/` (a marketing/editorial composition) and
`ui_kits/workbench/` (a product/application shell).

Read `AI-GUIDE.md` inside the package first — it is written for exactly this situation (an AI
assistant deciding how to use the package), with a file map, a consumption-recipe table, and
non-negotiable rules (semantic tokens only, no raw hex/px, theme by `data-theme` attribute, the
logo strokes with `currentColor` and must stay inline SVG not `<img>`). `readme.md` carries the
brand-grammar reasoning (sharp-vs-fluid motif, three type voices, dark-as-home/light-as-authored)
and the open questions the design session left unresolved (no accent hue chosen yet; only two of
five planned UI-kit views built — Map, Localization, Code Terrain, Replay, and Test Console are
named as "tell me which to do next," not started).

## Why this is a context note, not a merge

This is a **second, different visual language** from what the live repo currently ships:

| | Live system (`styles/design-system.css`, `docs/architecture/12-design-system.md`) | This package |
|---|---|---|
| Default mode | Light only, no toggle (od-005, closed: no page has a stated need) | Dark is home; light is a separately-authored re-derivation, not an invert |
| Palette | Cream/stone/ember — one warm accent hue | Pure black & white identity; status hues only for evidentiary state, never branding |
| Type | Source Serif 4 / IBM Plex Sans / IBM Plex Mono | Three voices named Editorial/Product/Technical — same three-family shape, different actual faces (not yet cross-checked font-by-font against the live `--serif`/`--sans`/`--mono` tokens) |
| Scope | CSS custom properties consumed directly by static HTML pages | Same token approach, but paired with a full React component library — this repo currently ships no React anywhere |

Neither is "wrong" — they were built at different times, by different processes, and this
package's own `readme.md` says plainly there was no existing codebase or brand doc to reconcile
against when it was built. That reconciliation — does this replace family 1 in
`design-system.css`, extend it, or stay a separate skill used only for new prototypes — is a
real decision nobody has made yet. `pages/vextreme-covenant.html` (Session 034, same day) was
built against the *current live* token family, deliberately, before this package existed in the
working tree; it has not been reconciled against this package's `ui_kits/covenant/` composition,
which is a different treatment of the same brief.

## Narrative context

Victor uploaded Vex's Covenant-page handoff first (Session 034). While that page was being
built, reviewed, and opened as PR #128, Victor separately worked with Claude Design to build an
actual brand foundation from scratch — the repo had never had one; `docs/architecture/12-design-system.md`
documents tokens that exist, but nobody had done original brand work (logo, type voice,
component library) before this. Victor flagged, delivering this package mid-thread, that recent
placement of new work (branch naming in particular — see the open item below) hasn't been
cleanly mapping back to an origin point a cold-start instance would find, and said a parallel PR
is already underway to restructure how new things get placed. Given that, this note deliberately
does the minimum: preserve the package with enough map to be found and understood, without
inventing a new structural convention that might collide with what that parallel PR defines.

**A deliberate limitation of this placement, named rather than hidden:** every other entry in
`docs/continuity/context-notes/` is a single flat `.md` file — `lib/check-map-bindings.js`'s own
inline documentation encodes that assumption ("context-notes/ gains non-note .md files beyond
README.md" is the drift condition it names). This note introduces the first *package-shaped*
context note — a directory of source files sitting beside the flat notes, not one more `.md`
file. It does not trip that detector (confirmed: `node lib/check-map-bindings.js` passes with
this directory present — the check only lists `.md` files at the top level of `context-notes/`
and a subdirectory doesn't match that filter), but it is a new shape the detector's own
documentation doesn't yet describe. If the parallel structural PR Victor mentioned defines a
better home for external multi-file deliverables, this package should move there and this note
should redirect rather than silently keep two homes.

## What this note is not

Not a decision to adopt this palette, these components, or this logo. Not a claim that
`pages/vextreme-covenant.html` or any other live page should be restyled to match it. Not an
authorization to install this as a real Claude Skill (`.claude/skills/`) for this project — that
is a plausible future use the package's own structure supports, named here as an option, not
done here.

## Conversion path (per `CONTEXT-NOTES.md`'s own rule)

Promote specific pieces only through a scoped PR, same as any other context note:

- **Accepted design decision** (adopt the palette/type/logo, in whole or reconciled with family 1)
  → `docs/architecture/12-design-system.md` + `styles/design-system.css`, with the old-vs-new
  reconciliation made explicit (this is not a drop-in replace; family 1 is load-bearing across
  every God Script page today).
- **Open decision question** ("should Vextreme have a dark-as-home identity system, and how does
  it relate to od-005's closed light-only decision?") → `data/status/open-discussions.json`, if
  Victor wants it tracked as a live queue item rather than left here until someone picks it up.
- **The unresolved brand questions the package itself names** (no accent hue chosen; icon set
  substitution — Lucide — flagged but not confirmed; three unbuilt UI-kit views) → carry forward
  into whichever PR does the adoption; they are not this repo's open items yet, they are the
  design session's.

## Checked before placing this note

- No existing `od-`/`pe-`/`td-` entry in `data/status/*.json` (either repo) references a design
  system refresh, brand refresh, or this package — confirmed by direct search, not assumed.
- No context note prior to this one covers design/brand work.
- The Vextreme-SDK private roadmap (`docs/private-continuity/CURRENT-ROADMAP.md`) does not
  reference this package or design-system work under any name searched.
- **Nobody is currently assigned to this** — there is no assignee/owner field convention
  anywhere in this repo's status schemas (`open-discussions.json`, `planned-enhancements.json`,
  `tech-debt.json` — checked directly; ownership here is tracked through session narrative and
  the Victor/Vex/Codex loop, not a field). Victor's recollection that the roadmap already
  contained this did not hold up against a direct check — recorded plainly rather than silently
  corrected, per this repo's own Article II energy: don't let a claim outrun its evidence.

<!-- [VXG RealForever] -->
