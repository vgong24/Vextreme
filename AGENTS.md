# Vextreme — fresh-entry router

`[VXG RealForever]`

This file routes substantial work. It intentionally stays smaller than `CLAUDE.md`,
the architecture corpus, continuity history, and process manuals.

A fresh human or AI should be able to identify the **right owner for the next
question** without loading the whole repository or reconstructing architecture from
a nearby page.

## Enter

For substantial work:

1. read `docs/culture.md`;
2. observe current work with `npm run current-work` when repository mutation may
   overlap another PR;
3. use `docs/continuity/INDEX.md` for the current narrative coordinate and newest
   relevant session, not as a substitute for live provider truth;
4. read `docs/architecture/00-reading-guide.md`;
5. follow the one architecture source that owns the question;
6. inspect the owning write-side source, transformation/runtime consumer, and focused
   proof that can change the next decision;
7. act once the next truthful effect is grounded.

Do not broad-read every historical document before working. **Map first; depth
second.**

For the full coding-agent cold-start sequence, hard repository constraints, PR
conventions, and continuity mechanics, continue to `CLAUDE.md`.

## Common routes

| If the task is about... | Start with |
|---|---|
| A new content page or slug | `README.md`, then `docs/architecture/02-slug.md` and `03-data.md` |
| A preserved conversation / source-backed record reader | `docs/architecture/19-record-readers.md` |
| A generated projection such as Terrain, index, status, or architecture output | `docs/architecture/03-data.md` and `04-build-time.md` |
| Browser-side rendering or runtime behavior | `docs/architecture/05-browser.md` |
| User-visible strings or localization identity | `docs/architecture/06-i18n.md` |
| Reusable visual styling or components | `docs/architecture/12-design-system.md` and `10-directory-structure.md` |
| A bug or unexpected live result | `docs/architecture/11-debugging-practices.md` |
| Navigation reachability | `docs/architecture/16-nav-coverage.md` |
| FAB delivery/autoload | `docs/architecture/17-fab-autoload.md` |
| A public institutional surface | `docs/architecture/18-institutional-pages.md` |
| Current ownership / overlapping source work | `docs/process/multi-agent-work-coordination.md` |

## Source before projection

When a generated/read-side artifact is wrong, trace it back to its write-side owner
before editing it.

```text
question
  -> owning source
  -> deterministic transformation
  -> projection / runtime consumer
  -> proof
```

Examples:

```text
data/viewmodels.json
  -> lib/build-terrain-map.js
  -> data/terrain-map.json
  -> pages/terrain-map.html

docs/architecture/*.md
  -> lib/build-architecture.js
  -> docs/architecture.md
```

Generated output is useful evidence and a query surface. It is not automatically the
write authority.

## Worked example is not mandatory skeleton

Existing pages and systems teach the repository's vocabulary and pressures. They do
not authorize copying their exact source shape into the next feature or record.

Ask:

```text
What human or repository question exists?
Which owner already answers it?
Which part of the worked example is semantic?
Which part is only one implementation?
What would be lost if I did not copy this structure?
```

If nothing important would be lost, do not add the structure merely for symmetry.

## Finish

Use the proof that owns the claim:

```text
source invariant       -> focused source/test proof
generated currentness  -> deterministic regeneration/check
browser behavior       -> browser/lived proof
visual presentation    -> rendered evidence
current ownership      -> live coordination evidence
human acceptance       -> Victor
```

Keep current-state receipts in their owning PR/evidence surfaces. Keep this router
small.

<!-- [VXG RealForever][VEXTREME][FRESH-ENTRY] -->
