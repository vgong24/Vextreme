# Vextreme Design Foundation — How to Consume This Package

**Audience: an AI assistant (or developer) building interfaces, sites, or mockups for Vextreme.**
Read this file first. It tells you what every file *is*, how the files *relate*, and how to
*use* them so anything you build is on-brand without re-inventing the system.

---

## 0. TL;DR — the 30-second contract

1. **Load `styles.css` once.** It `@import`s all three token files. Every color, font, space,
   radius, and easing you use must be a `var(--token)` from those files — never a raw hex,
   px font-size, or one-off color.
2. **Theme by attribute.** The page defaults to **dark**. Add `data-theme="light"` to any
   element (or `<html>`) to switch that subtree to light. Never hard-code black/white — use the
   semantic tokens (`--text-primary`, `--bg-canvas`, …) and theming is automatic.
3. **The logo strokes with `currentColor`.** Drop the SVG inline and set `color:` on it (or let
   it inherit `--text-primary`). It turns white on dark, black on light with zero extra files.
4. **Copy, don't link cross-project.** When building a new thing, copy the token files + the logo
   into that project and reference them locally.
5. **Learn each component from its `.prompt.md`**, use its `.card.html` as a live example, and
   its `.d.ts` for the exact props.

---

## 1. What this package is

A **brand + design system**, not an app. It gives you:

- **Design tokens** (the source of truth): color, type, spacing/radii/motion.
- **A global stylesheet** that wires the tokens to sensible element defaults.
- **A component library** (React `.jsx`) with types, usage prompts, and specimens.
- **Guideline specimens** — small standalone HTML cards that show each foundation visually.
- **UI-kit examples** — two full-page compositions that show the system assembled end-to-end.
- **The logo**, as one theme-adaptive SVG.

Everything is plain CSS + React + HTML. No build step required to *read* or *copy* from it.

---

## 2. File map — what each thing means

```
styles.css                  ← ENTRY POINT. @imports the 3 token files + sets body/link/theme defaults.
                              Load this (or the 3 token files) before anything else.

tokens/                     ← THE SOURCE OF TRUTH. Change design here, everything downstream follows.
  colors.css                  Neutral ramp (gray-0..9), absolute black/white, and SEMANTIC roles
                              (--bg-*, --text-*, --border-*, --accent-*, --status-*). Dark values in
                              :root; light values re-authored under [data-theme='light'] (NOT a naive invert).
  typography.css              3 font families (serif/sans/mono) + a role scale you apply as a whole
                              `font:` shorthand: --text-display/h1/h2/h3, --text-body*, --text-label,
                              --text-caption, --text-mono-*. Plus --tracking-* letter-spacing tokens.
  spacing.css                 --space-1..9 (4→96px), --radius-sm/md/lg/full, --border-w[-strong],
                              --measure (reading width), --ease-standard, --duration-*.

assets/logo/
  vextreme-mark.svg           THE logo. Single continuous stroke (an incomplete "G" whose two ends are
                              the feet of a crossing "X", with a "V" nested at centre). stroke="currentColor"
                              → recolors with the `color` it inherits. viewBox 0 0 120 120.

components/                 ← COMPONENT LIBRARY. Grouped by purpose. Each group has a .card.html specimen.
  core/     Button, Badge
  forms/    Input, Select, Checkbox, Switch
  layout/   Card
  navigation/ Tabs
  overlays/ Dialog, Tooltip
  For EACH component, four files:
    Name.jsx          React source (the real implementation; uses the tokens via var()).
    Name.d.ts         TypeScript prop signature — the contract. Read this to know exact props/enums.
    Name.prompt.md    HOW + WHEN to use it, in prose. Read this FIRST for a component.
    <group>.card.html A rendered specimen of the whole group — open it to SEE the components.

guidelines/                 ← VISUAL SPECIMENS (standalone HTML, each linked to ../styles.css).
                              These are "show me" references, not shippable UI. Open them to see the
                              system rendered. Files: colors-dark/light/ramp/status, type-editorial/
                              product/technical, spacing, borders, brand-mark, brand-wordmark.
  Brand Mark.dc.html          The interactive logo "drawing board" (has tweak controls + stroke-order
                              overlay). This is the DESIGN SOURCE for the mark; the shipped asset is the
                              flattened currentColor version in assets/logo/.

ui_kits/                    ← FULL-PAGE EXAMPLES. This is where you "map intent → assembled example."
  covenant/                   A MARKETING / editorial page (serif display voice, hero, mission). Look
                              here when building landing/marketing/brand pages.
  workbench/                  An APPLICATION shell (sidebar nav, product/mono voices, dense chrome). Look
                              here when building app UI / dashboards / tools.

readme.md                   Human-facing project notes + provenance.
SKILL.md                    Skill manifest (how this is invoked as a reusable skill).
AI-GUIDE.md                 ← YOU ARE HERE.

uploads/ , scraps/          Working artifacts (original hand-drawn sketches, screenshots). PROVENANCE
                              ONLY — do not ship these; they're how the mark was designed, not assets.
```

---

## 3. How the files relate (the mental model)

```
                       tokens/*.css   ← edit design intent HERE
                            │
                     styles.css  (imports tokens + element defaults)
                            │
        ┌───────────────────┼───────────────────────┐
        │                   │                        │
  components/*.jsx     guidelines/*.html        ui_kits/*  (examples)
  (consume tokens)     (show one token group)   (show everything assembled)
        │
   Name.prompt.md  →  how/when       (read first)
   Name.d.ts       →  exact props    (read to wire it)
   Name.jsx        →  implementation (read to restyle/extend)
   group.card.html →  live specimen  (open to see it)
```

- **Tokens are upstream of everything.** Components, guidelines, and UI kits all resolve to the same
  `var(--…)`. Restyle the brand by editing tokens; do not patch colors downstream.
- **Guidelines** = one concept shown in isolation. **UI kits** = many concepts shown together.
  When in doubt about *composition/rhythm*, read a UI kit; about a *single token/component*, read a
  guideline or that component's files.

---

## 4. Consumption recipes (intent → files to read → what to do)

**"Build a Vextreme marketing/landing page"**
→ Read `ui_kits/covenant/` for structure + voice. Copy `styles.css` + `tokens/` + `assets/logo/`.
Use `--font-serif` display scale for headlines, `--text-body-lg` for lede, generous `--space-8/9`.

**"Build a Vextreme app / dashboard / tool"**
→ Read `ui_kits/workbench/`. Use `--font-sans` for UI, `--font-mono` (`--text-mono-*`) for metadata/
state. Dense spacing (`--space-3/4`), low radius (`--radius-md`). Pull real components from `components/`.

**"I need a button / input / dialog / etc."**
→ Open `components/<group>/<Name>.prompt.md` (how/when) → `<Name>.d.ts` (props) → copy `<Name>.jsx`.
See it live in `components/<group>/<group>.card.html`.

**"Place the logo"**
→ Inline `assets/logo/vextreme-mark.svg`; set `style="color: var(--text-primary)"` (or any color).
Never use it as an external `<img>` if you need it to recolor — an `<img>` can't inherit `currentColor`.

**"Make it work in light mode"**
→ Do nothing special. Use semantic tokens only. Put `data-theme="light"` on the container you want light.

**"Change the brand color / a font"**
→ Edit `tokens/colors.css` or `tokens/typography.css`. Everything re-flows. Don't touch downstream files.

---

## 5. Rules & guardrails (the non-negotiables)

- **Only semantic tokens in UI.** Reach for `--text-primary`, `--bg-surface`, `--border-subtle`,
  `--accent-bg`, etc. Use the raw ramp (`--gray-4`) only when defining new semantic tokens.
- **Type is applied as a whole `font:` shorthand** (`font: var(--text-h2)`), then optionally a
  `--tracking-*`. Don't set `font-size`/`font-family` à la carte.
- **Sharp-vs-fluid grammar.** Structural chrome (cards, inputs, controls) stays low-radius and
  architectural (`--radius-sm/md`). Only the brand mark's enclosing gesture is allowed to be fluid.
- **Status colors are for state, never decoration.** `--status-*` only communicates success/caution/
  critical/info — never as accents or fills for their own sake.
- **Dark is the emotional home; light is authored, not inverted.** Trust the tokens; don't hand-tune
  per mode.
- **Motion:** transitions use `--ease-standard` with `--duration-fast/base`. Keep it restrained.

---

## 6. Fastest start

```html
<!doctype html>
<html>            <!-- omit data-theme = dark; add data-theme="light" for light -->
  <head><link rel="stylesheet" href="styles.css"></head>
  <body>
    <!-- everything below now inherits the Vextreme foundation -->
  </body>
</html>
```

That's it. Load `styles.css`, then build with tokens, components, and the UI-kit examples as your
reference. When you need to know *how* something is meant to be used, the answer is in that item's
`.prompt.md` or the matching `guidelines/` / `ui_kits/` example.
