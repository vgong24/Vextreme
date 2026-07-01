# Build-time computations

The build step does work so the browser doesn't have to:

| Computed field | Source | Where it lands |
|---|---|---|
| `arcKeys` (priority-sorted) | `arcs-v2.json` priority field | `index.json` slugMap |
| `dateISO` ("YYYY-MM-DD") | `nodes.json` date string | `index.json` slugMap |
| `arcMeta` (title + URL + renderMode per arc) | `arcs-v2.json` parent + renderMode | `index.json` arcMeta |
| `arcMap` (sections → ordered slugs) | `arcs-v2.json` sections | `index.json` arcMap |
| compiled string bundles | `data/strings/source/**` | `strings/compiled/strings.{lang}.json` |
| baked display text | `strings/compiled/strings.en.json` | generated HTML (archives.html, index.html) |

The browser library (`lib/vextreme-index-v2.js`) has **no hard-coded arc data
and no hard-coded display strings**. It reads structure from `index.json` and
receives display text either baked into the HTML at build time or from a
string constant injected at template time.

Adding a new arc to `arcs-v2.json` and pushing is all that is needed — no JS
edits required. The same principle applies to strings: adding a key to source
and recompiling is all that is needed — no template edits required.

→ *Connects to 05-browser: the browser layer is lightweight precisely because
this layer did the work. Any computation that could happen at build time must
happen at build time — not in browser JS.*

<!-- [VXG RealForever] -->
