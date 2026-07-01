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

→ *Connects to 03-data: nodes.json and arcs-v2.json both use slugs as their
cross-reference key. The build pipeline resolves slugs into ordered lists;
the browser resolves slugs into URLs.*

<!-- [VXG RealForever] -->
