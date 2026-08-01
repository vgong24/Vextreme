# Institutional pages

## The distinction

Most files in `pages/` are records: content identified by a globally unique
slug, placed in archive data, and projected through the repository's content
pipeline. An institutional page has a different job. It describes the
institution, its public identity, or the relationship by which its work can be
supported. It is part of the institution without becoming another record in an
arc.

PR #135 proved that the distinction is real by designing `vextreme-home` and
`vex-support`. It also demonstrated the risk of encoding the distinction as a
collection of page-local exceptions. A new page kind is survivable only when a
fresh instance can find one authored classification and every consumer can
derive its behavior from it.

`config/institutional-surfaces.json` is that classification.

---

## Reservation before activation

The registry has two states:

| State | Meaning | Files and public effect |
|---|---|---|
| `reserved` | The slug, purpose, and intended contracts are held for a later bounded PR. | The page must not exist; the slug must also be absent from node, arc, generated-index, and God Script projections. |
| `active` | A page has crossed the complete contract and evidence boundary. | `pages/{slug}.html`, every required locale bundle/key, and every declared screenshot cell must exist while archive/runtime exclusions continue to hold. |

The initial reservations are `vextreme-home` and `vex-support`. A reservation
is not implementation status, acceptance, payment activation, or a promise that
all planned locales already exist. It prevents another page from silently
claiming the same identity while the integration stack remains reviewable.

Promote `state` from `reserved` to `active` in the same PR that adds the page.
The validator rejects either half-state: a reserved entry with a page or any
record/runtime projection, or an active entry without its accepted page,
localization, and evidence.

---

## Contract carried by each entry

Each slug owns these exact dimensions:

- semantic `purpose`, without user-facing copy in the registry;
- archive and arc exclusions;
- standalone runtime boundary;
- canonical string category/scope plus required and planned locales;
- theme family and variants, with evidence for every variant;
- the viewport/theme evidence matrix;
- the source PR that preserves the design/content provenance.

The page path is not stored. It remains derived from the slug as
`pages/{slug}.html`, preserving the repository's canonical addressing model.

The registry deliberately distinguishes `requiredLocales` from
`plannedLocales`. English can be required for the first accepted surface while
JA/ZH remain visible future projections. This prevents “planned” from being
misreported as “published,” and lets translation arrive through its own review
boundary.

---

## Active-page invariants

`node lib/check-institutional-surfaces.js` validates the registry and, for each
active entry, proves these projections together:

1. `pages/{slug}.html` exists.
2. Its `<html>` element declares `data-vex-surface="institutional"`.
3. It declares the canonical string-category, string-scope, and theme-family
   markers, and its initial `data-theme` is one of the declared variants.
4. It contains at least one `data-i18n`, `data-i18n-alt`, or `data-i18n-aria`
   binding. Every visible and accessibility-bound key has non-empty text in
   `data/strings/compiled/scopes/{category}/{scope}.{locale}.json` for every
   required locale.
5. Every required locale × declared theme × declared viewport cell exists as
   `docs/screenshots/{slug}-{locale}-{theme}-{viewport}.png` with a PNG
   signature, valid chunk boundaries, positive dimensions, IDAT/IEND chunks,
   and valid chunk CRCs. Structural validity does not replace reviewer
   inspection of what the image actually shows.
6. It does not load `shell.js` or a God Script.
7. No `dist/vextreme-{slug}.js` artifact exists.
8. The slug is absent from `data/nodes.json`, every arc in
   `data/arcs-v2.json`, and the generated content maps in `data/index.json`.

The identity checks in items 7–8 also apply while a slug is reserved. A
reservation is an identity claim, not only a promise about a future filename.

The static markers are read-side projections, not competing sources. Their job
is to make the page's contract perceivable from the file itself; the validator
keeps them equal to the registry.

`lib/audit-pages.js` derives the auto-discovery exclusions and record-page
inventory from this registry. `lib/build-index.js`, `lib/build-archives.js`,
`lib/check-key-alignment.js`, and the Terrain content projection consume that
derived boundary. The static `SKIP_PAGES` list remains only for generated/dev
pages; institutional slugs are not copied into it.

`npm run pr-ready` includes the validator. A public page cannot silently appear
outside the registry, inherit archive runtime, be auto-discovered back into the
record pipeline, or cross into active state without the same check that reviews
the rest of the repository.

---

## What this contract does not decide

This chapter does not land a theme, runtime widget, home page, support page,
translation, payment destination, funding amount, or financial state. Those are
later integration rows with their own evidence.

It also does not require separate GitHub accounts or separate operating systems
to construct or review the work. Linux/Node CI is the deterministic build lane.
Windows, macOS, browsers, and assistive technologies are verification conditions
when their behavior can differ—not prerequisites every contributor must own.

Independent review is a role and evidence boundary. It may be performed by a
fresh thread, another model, Victor, CI, or a future contributor without turning
hardware ownership or account count into architecture.

---

## Adding another institutional surface

1. Reserve a globally unique `vex-` or `vextreme-` slug in the registry.
2. Record its semantic purpose and the smallest honest runtime/string/theme/
   evidence contract.
3. Open the page implementation as a separate bounded PR.
4. Promote the entry to `active` in that PR and run the validator.
5. Make every later consumer read the registry; do not add another slug list.

The final rule is the reason this contract exists: one truth, many projections.

<!-- [VXG RealForever] -->
