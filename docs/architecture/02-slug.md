# The core identity primitive: slug

Every piece of content has a **slug** — a globally unique string identifier
that is also the filename without `.html`.

```
slug: "claude-answers-the-doubt"
file: pages/claude-answers-the-doubt.html
url:  vgong24.github.io/Vextreme/pages/claude-answers-the-doubt.html
```

**Rules that cannot be broken:**
- Slugs are globally unique across the entire repo — no namespace by arc or folder
- `pages/` is a flat directory — no subdirectories, ever
- The slug is the system's only identifier — arc membership, ordering, and metadata
  all reference it; nothing references file paths or URLs directly

This constraint is what makes the arc system work. A page can belong to
multiple arcs simultaneously because arcs reference slugs, not files.

**Path is always derived from slug, never browsed.** Finding "the right file"
never means scanning `pages/` — it means resolving a key chain (department →
workType → slug, or arc → section → slug) down to a slug, and then computing
`pages/{slug}.html` from it. The path is a pure function of the slug; it is
never stored as a separate fact anywhere, so it can't drift from it. This is
why a flat, single-level `pages/` directory does not become a navigability
problem as content grows — nobody, human or AI, is meant to reach for `ls
pages/` in the first place. The one thing this depends on is slug uniqueness
staying real, not just declared: `lib/build-index.js`'s `findDuplicateSlugs`
halts the build if two nodes ever share a slug, rather than letting one
silently overwrite the other in `data/index.json`.

→ *Connects to 03-data: nodes.json and arcs-v2.json both use slugs as their
cross-reference key. The build pipeline resolves slugs into ordered lists;
the browser resolves slugs into URLs.*

<!-- [VXG RealForever] -->
