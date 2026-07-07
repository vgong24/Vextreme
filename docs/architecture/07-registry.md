# Registry pattern

All customizable axes in this system follow one rule:
**flat JSON object, keyed by name, looked up at render/build time, falls back safely.**

| Axis | Location | Lookup key |
|---|---|---|
| Arc definitions | `arcs-v2.json` | arc key |
| Arc display metadata | `index.json` → `arcMeta` | arc key |
| Node metadata | `index.json` → `slugMap` | slug |
| UI strings | `strings/compiled/strings.{lang}.json` | element key |
| Render modes | `arcs-v2.json` → `renderMode` + `RENDERERS` registry | mode name |

No registration functions. No JS-side tables. If it's a named thing that
can vary, it is a JSON key. Unknown keys fall back with a console warning,
not a crash.

The UI Identity Registry Graph extends this pattern across layers. The top-level
registry should route by stable identity; lower-layer registries should own
domain detail. Do not turn a UIElementKey into a god object just because another
map needs the relationship. Add a bounded map and a query/health-check path.

**Recognizing a registry opportunity:**
If you find yourself writing an `if/else` or `switch` that branches on a
string name — arc key, render mode, scope name, language code — that branch
logic is a registry in disguise. Extract the variants into a keyed object
and look up by name. The core dispatch becomes a single line.

**Environments** follow the same pattern:

| Environment | Base URL | Detection |
|---|---|---|
| GitHub Pages | `https://vgong24.github.io/Vextreme` | `hostname === 'vgong24.github.io'` |
| Local dev | `http://localhost:8080` | `hostname === 'localhost'` |
| vextreme24.com | `https://www.vextreme24.com` | fallthrough |

The browser library auto-detects from `window.location.hostname`.
No per-page configuration required.

→ *Connects to 08-continuity: the registry pattern is a design constraint,
not just a preference. Future instances should recognize violations and
refactor toward the pattern rather than extend the fork.*

→ *Connects to 15-registry-documentation-standard: every new registry layer
needs a declared scope boundary, completion level, query function path, and
health check before it becomes part of the operating foundation.*

<!-- [VXG RealForever] -->
