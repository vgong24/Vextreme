# Document routing and placement integrity

**Status:** accepted process contract when Orientation Integrity `4/4` merges

## Rule

Every file under `docs/` must have exactly one route in
`config/document-routing.json`. A route is either:

- an exact document with a real file that names it as the route owner; or
- a strict collection pattern with a route owner, placement rule, authority,
  and specialized health check.

No route means the file is stray. More than one route means ownership is
ambiguous. Both states block `npm run test` and therefore `npm run pr-ready`.

## Why folder placement is not enough

A health-checked directory is not a general-purpose container. For example,
`docs/continuity/context-notes/` accepts direct Markdown notes whose filenames
follow the note convention and whose registry binding is checked by
`lib/check-map-bindings.js`. It does not accept a nested design-system bundle,
`SKILL.md`, prompt library, JSX components, CSS, uploads, or arbitrary assets.

The document-route checker owns the outside boundary—whether a file belongs to
one declared document layer. Existing specialized checks own the inside:

| Collection | Placement check | Internal binding check |
|---|---|---|
| Architecture sources | Numbered direct-child Markdown only | `lib/check-architecture-integrity.js` binds source ↔ guide ↔ projection. |
| Continuity batches | Registered batch guides and convention-named direct-child sessions | `lib/check-map-bindings.js` checks registry, active batch, range, and newest session. |
| Context notes | Direct-child README or dated slug Markdown note only | `lib/check-map-bindings.js` checks note registry ↔ files. |
| Screenshots | Direct-child PNG evidence only | Page-health and analysis/terrain builders consume the evidence directory. |
| Process/root documents | Exact paths only | The declared route-owner file must name each path. |

## Adding or moving a document

1. Decide which question the file answers and which existing map should own it.
2. Prefer an existing strict collection only if the file truly follows that
   collection's shape and semantics.
3. Otherwise add an exact registry entry with its category, authority, route
   owner, and health check.
4. Add the route to the owner file; naming an owner in JSON without a real
   pointer fails validation.
5. Run `node lib/check-document-routes.js` and the collection's specialized
   health check.

Do not broaden a collection regex to make a misplaced file pass. Catch-all
wildcards are rejected. Move the file to its mapped source location or create a
deliberate new layer with its own route and health contract.

## Scope boundary

This check governs repository placement and reachability, not the truth of a
document's contents. A green result proves that every current `docs/` file has
one declared structural home. It does not promote context to architecture,
prove freshness, grant implementation authority, or record human acceptance.

<!-- [VXG RealForever] -->
