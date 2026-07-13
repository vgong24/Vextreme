# Vextreme Design System

Vextreme is a relational software and stewardship platform: it makes complex work
perceivable, accountable, and continuable across people, tools, and AI — turning
hidden relationships, decisions, and evidence into interfaces people can navigate
and continue safely.

This is a from-scratch foundation (no existing codebase or Figma was attached —
only two reference screenshots of a prior, unrelated project structure, and a
hand-drawn draft of the "VXG" mark). Everything here was built from the brief
directly; there is no ground-truth source to reconcile against.

## Brand grammar

**Sharp vs. fluid.** The "VX" is architectural and precise — hard angles, square
caps, miter joins. Everything the "G" used to be (a literal third letterform) is
now an enclosing, spiraling gesture: continuity rather than a hard stop. That
contrast — sharp identity, fluid continuity — is the system's one recurring motif.
It shows up small elsewhere: the Switch is the one deliberately pill-shaped control
in an otherwise square-cornered form set.

**Three voices, one system.**
- *Editorial* (serif) — the Covenant, mission, major statements.
- *Product* (sans) — interface, navigation, body copy, the Workbench.
- *Technical* (mono) — metadata, evidence, provenance, test/system state.

**Black & white as identity, gray as structure.** No accent hue. Grays are a cool,
slightly blue-tinted neutral ramp (GitHub-adjacent) used only for surfaces and
borders — never as decoration. A small set of status hues (success/caution/
critical/info) exists solely for evidentiary state (test results, provenance),
not for branding.

**Dark is home, light is authored — not inverted.** Dark mode is the default,
emotional mode. Light mode re-derives its own ramp rather than flipping dark's
values, so it reads as intentional on its own.

## Sources
- Two screenshots of a differently-structured prior "Vextreme Design System"
  project (component/token counts, Squarespace + CLAUDE.md references) — used
  only as tonal context (naming conventions like "Journey," "Evidence," "Replay,"
  "Test Console"), not copied structurally.
- A hand-drawn "VXG" logo draft, refined per direction into a single
  continuous-stroke mark (G · X · V) in `assets/logo/`.
- No codebase, Figma file, or brand guideline doc was attached.

## Index
- `styles.css` — the single entry point; imports every token file below.
- `tokens/colors.css` — neutral ramp, dark/light semantics, status hues.
- `tokens/typography.css` — the three-voice type scale + Google Fonts import.
- `tokens/spacing.css` — spacing scale, radii, border widths, easing.
- `assets/logo/vextreme-mark.svg` — the mark, drawn as one unbroken stroke
  (`currentColor`, adapts to dark/light).
- `guidelines/` — foundation specimen cards (Colors, Type, Spacing, Brand).
- `components/core/` — Button, Badge.
- `components/forms/` — Input, Select, Checkbox, Switch.
- `components/layout/` — Card.
- `components/navigation/` — Tabs.
- `components/overlays/` — Dialog, Tooltip.
- `ui_kits/covenant/` — public identity surface (editorial voice, light+dark).
- `ui_kits/workbench/` — product interface surface (sidebar, cards, evidence
  panel, tabs, status).

## Content fundamentals
- Voice is confident, grounded, plain language with architectural precision —
  not hype, not cold dev-tool terseness. It should read the same to an
  executive, an engineer, or an AI reading it as a spec.
- Avoid: jargon for its own sake, founder-worship copy, unexplained symbolic
  ornament, exclamation points, emoji.
- Technical/evidentiary copy (labels, provenance, commit refs) is terse and
  exact by design — that terseness is intentional there, not a tone leak from
  elsewhere in the system.

## Iconography
No icon set was provided. The system currently uses only the Vextreme mark and
plain geometric dots/squares for state (status badges, checkboxes). If the
product needs a broader icon set (nav glyphs, file types, etc.), Lucide (MIT,
CDN-available) is the closest stroke-weight match to this system's 1.5–2.5px
architectural strokes — flagging as a substitution to confirm before adopting.

## Caveats / open questions
- The logo is the approved single-stroke mark: an incomplete G (~5% gap at
  the base) whose two ends are the feet of the crossing X, with the V nested
  at centre — all one pen path. `currentColor` handles both themes.
- No accent color was defined (kept pure B&W + status hues per your brief).
  Say the word if a single accent hue is wanted for certain moments (links,
  focus rings, primary CTAs) beyond the current invert-fill treatment.
- Two UI kits so far (Covenant public page, Workbench product surface). Map,
  Localization, Code Terrain, Replay, and Test Console views aren't built yet —
  tell me which to do next.
- Remember to set this project's file type to "Design System" in the Share
  menu so your org can browse it.
