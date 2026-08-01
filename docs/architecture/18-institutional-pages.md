# Institutional pages

## The distinction this chapter exists to name

Until now every file in `pages/` was the same kind of thing: a record. A node
in `data/nodes.json`, a member of an arc, a consumer of a God Script, a row in
the archive. The system had one page shape because it had one purpose — keep
the content perceivable.

`pages/vextreme-home.html` and `pages/vex-support.html` are a second kind.
They do not hold a piece of the archive. They describe the institution that
holds it: what Vextreme is, what it is for, and how the work behind it can be
supported. Victor's own framing when asking for them:

> it's like not contents for the institution, but it's part of the institution

That is a real distinction and it needs a real boundary, because the two kinds
want opposite things from almost every mechanism in this repo.

---

## The `vex-` / `vextreme-` naming prefix

An institutional page's slug carries a prefix naming what it is:

```text
vextreme-home.html    the institution describing itself
vex-support.html      how the work is supported
```

Records carry no prefix — they are named for their content
(`the-victor-pattern`, `origins-of-proof`). The slug is still the system's only
identifier and still globally unique (`docs/architecture/02-slug.md` is
unchanged); the prefix is a naming convention on top of that, not a second
namespace or a directory. One flat `pages/` directory remains the rule.

The prefix earns its place by being visible in the one place a cold reader
actually looks: an `ls` of `pages/`. Without it, an institutional surface is
indistinguishable from a record until someone opens the file.

---

## What an institutional page opts out of, and why

| Mechanism | Records | Institutional pages | Why |
|---|---|---|---|
| `data/nodes.json` entry | yes | **no** | They are not archive content, so they must not appear in the archive index, `sitemap.xml`'s content listing, or an arc. |
| Arc membership | yes | **no** | Arcs are reader-facing narrative order over the record. An institutional page has no place in a narrative it is not part of. |
| God Script (`dist/vextreme-{slug}.js`) | yes | **no** | The God Script injects arc nav, the spiral FAB group, and the archive's chrome. That chrome belongs to the archive surface and would read as broken on a monochrome institutional page. |
| `SKIP_PAGES` in `lib/audit-pages.js` | no | **yes** | Without an entry they report as false blockers (no `pages.{slug}` bundle, no God Script) and as uncurated orphans. The skip reason states the real cause. |
| String scope | `pages.{slug}` | `institution` | A non-`pages.` scope is also what keeps `lib/build-vextreme.js` from assembling a God Script nothing loads: it resolves the default `pages.{slug}` bundle, finds none, and skips. |
| Token family | light `:root` or `[data-theme="dashboard"]` | `[data-theme="foundation"]` | See below. |
| Runtime chrome | `widgets/fab-*.js` via the shell | `widgets/vex-institutional.js` | One `<script>`, no loader chain, no CDN dependency for first render. |

The through-line: an institutional page is **self-contained**. It is two
stylesheets, one optional widget, and its own markup. It renders correctly from
a local checkout, from GitHub Pages, and from a directory someone copied
somewhere else. That portability is the point — these are the pages Victor
hands to a person, not the pages the archive assembles for itself.

---

## The third token family

`styles/design-system.css` now declares three families, not two
(`docs/architecture/12-design-system.md` documents families 1 and 2):

```text
:root                          light archive surface     (--cream, --stone, --ember, …)
[data-theme="dashboard"]       dark dev/dashboard        (--bg, --surface, --text, …)
[data-theme="foundation"]      institutional, dark       (--bg-canvas, --text-primary, …)
[data-theme="foundation-light"] institutional, light     ramp override only
```

Family 3 is the Vextreme Design Foundation Victor supplied: black-and-white as
identity, a cool blue-tinted neutral ramp as structure, no decorative accent
hue, status hues reserved strictly for evidentiary state, and three type voices
(editorial serif, product sans, technical mono).

Two details worth knowing before editing it:

- **Both attribute values match the same declaration block.** Every shared
  token — type, spacing, radii, motion, and the semantic roles themselves — is
  declared once under `[data-theme="foundation"], [data-theme="foundation-light"]`.
  Light mode then re-declares only the ten ramp steps beneath it; the semantic
  roles resolve through `var(--gray-N)` indirection and re-derive for free.
  Matching only `[data-theme="foundation"]` in that first block would leave
  every semantic token undefined in light mode, because the two attribute
  values are mutually exclusive on one element.
- **It is declared centrally, not per page.** Two pages hand-copying one token
  block is exactly the drift shape td-007 already closed for the four
  dashboard files. `styles/vex-institutional.css` declares no colors, type, or
  spacing of its own; if a value is missing there, it belongs in the family.

`node lib/check-design-tokens.js` covers all three families without changes —
`extractRootTokens()` reads every `--name:` declaration in `design-system.css`
regardless of selector, so family 3's tokens became global the moment they were
declared there.

---

## Localization

Institutional pages use the same localization contract as everything else:
`data-i18n` attributes, keys registered in `data/strings/source/`, compiled by
`lib/strings-compile.js` into scope bundles. Nothing about the write side is new.

What is new is the scope shape. The two pages share one scope, `institution`
(category `system`), rather than one `pages.{slug}` scope each, because they
share their chrome, their four alignments, and their project lineage verbatim —
duplicating those keys per page would mean translating the same sentence twice
and letting the two copies drift. `docs/architecture/06-i18n.md` explicitly
allows this: *"nothing about this requires a scope to map 1:1 with a page."*

Keys follow `institution.{surface}.{element-type}.{semantic-name}`, where
surface is `common`, `home`, or `support` — the same shape `arcs.json` already
uses for `{arc-key}.common.{element}.{name}`.

### Deliberate partial translation

`institution.support.story.*` — Victor's first-person testimony — carries **en
only**, while every other key on the page carries en/ja/zh. This is a decision,
not a gap:

The canon supplies that passage as *"Spoken by Victor, written by Vex."* The
institution's standing rule is that a translation is an attributed projection
of an original, never a replacement for it. Publishing an unreviewed machine
translation of a person's testimony under that byline would break the exact
rule the page is explaining. So the passage stays in English, the surrounding
`lang="en"` tells assistive technology and browser translation prompts the
truth, and `institution.common.label.translation-pending` says so where a
reader will actually see it.

The existing missing-key fallback does the rest: an element whose key has no
entry in the selected language keeps its authored English. That is the same
mechanism partial JA coverage has always relied on — here it is being used
on purpose rather than tolerated.

---

## Route state is data, not markup

`data/support-routes.json` holds the state of each support route. The page
renders every route's honest pending state as **static markup** — that is what
a visitor with JavaScript disabled sees, and it is the correct default.
`widgets/vex-institutional.js` upgrades a route to a live action only when the
data file says `status: "ACTIVE"` **and** supplies a real `url` string.

Two properties follow from that shape, and both are the reason for it:

1. **Turning a route on is a data edit, not an HTML edit.** No layout logic
   moves when a payment destination changes.
2. **An unverified destination cannot reach a visitor.** A route with a `null`
   url has no branch that renders a button. `candidateUrl` is deliberately a
   different field name from `url` precisely so that a URL recorded for
   verification cannot be rendered by accident.

The same file records what is deliberately *not* published — the withheld
capacity figures and the historical Stripe links — with the reason attached, so
a future instance finds the decision rather than re-deriving it and guessing
differently.

---

## Verification

`node scripts/screenshot-institutional.js [slug] [lang]` renders both pages
across 1440 / 768 / 320 px, both themes, and every language their own
`<select>` offers, into `docs/screenshots/`.

It exists alongside `scripts/screenshot-page.js` rather than replacing it:
that script drives the archive's language FAB (`#vex-lang-fab-btn`, then a
`.vex-lang-item` flag), which these pages do not have. Pointing it at them
produces two identical English screenshots plus a "FAB button not found"
warning — a false pass that looks like verification. Two surfaces with two
interaction models get two harnesses; they share the local-server and
CDN-interception approach, which is the part worth keeping identical.

The harness scrolls the full page and awaits every image before shooting.
A `fullPage` screenshot does **not** trigger `loading="lazy"` images below the
fold, so without that step the support imagery renders as empty grey frames —
a harness bug that reads convincingly as a layout bug. This was found by
looking at the first render, which is the argument
`docs/architecture/11-debugging-practices.md` makes, applied here.

---

## Adding another institutional page

1. Name it with the `vex-` or `vextreme-` prefix; confirm the slug is globally
   unique across `pages/`.
2. Add a `SKIP_PAGES` entry in `lib/audit-pages.js` with a real reason.
3. Add its keys to `data/strings/source/institution.json` under a new surface
   segment; run `node lib/strings-check.js && node lib/strings-compile.js`.
4. Link `styles/design-system.css` and `styles/vex-institutional.css`; set
   `<html data-theme="foundation">`; do not declare a local `:root`.
5. Author English directly into the markup and add `data-i18n` to every visible
   string. The page must be complete and honest with JavaScript disabled.
6. Add it to `INSTITUTIONAL_SLUGS` in `scripts/screenshot-institutional.js` and
   render it before opening the PR.

→ *Connects to 12-design-system (the token families this extends), 06-i18n (the
string contract this reuses), and 16-nav-coverage (an institutional page must
still be reachable from, and able to reach, somewhere).*

<!-- [VXG RealForever] -->
