# Browser layer

`lib/vextreme-index-v2.js` — loaded on GitHub Pages pages only.

**Load sequence:**
1. Checks `localStorage` for cached `index.json` (key: `vex-index-v2-data`)
2. If cached: serves immediately, then revalidates in background via ETag
3. If cold: fetches from jsDelivr CDN, caches result
4. Calls `getLatticeView(slug, index)` → builds arc nav data for current page
5. Calls `renderArcNav(lattice, mountEl)` → dispatches to renderer registry

`getLatticeView` uses `node.arcKeys` (pre-sorted by priority at build time)
to determine display order. No sorting in the browser.

Slug detection: reads `window.VEX_SLUG` if set (test override), otherwise
parses `window.location.pathname` last segment minus `.html`.

URL construction: `/pages/<slug>.html` on GitHub Pages, `/<slug>` on vextreme24.com.

---

## Arc row renderer registry

`renderArcNav` is the orchestrator — it calls `renderArcRow(arcView)` per arc,
which dispatches to a registered renderer function by `arcView.renderMode`.

**arcView contract** (what every renderer receives):
```js
{
  arcName:      string,         // arc key, e.g. "liberation"
  arcMeta:      { title, url, renderMode },  // from index.json arcMeta
  renderMode:   string,         // "dots" | "position" | future modes
  sectionLabel: string,         // section the current page belongs to
  position:     number,         // 1-based position within the full arc
  total:        number,         // total pages in the arc
  prevUrl:      string | null,
  nextUrl:      string | null
}
```

**Renderer registry** (in `vextreme-index-v2.js`):
```js
var RENDERERS = {
  dots:     function(arcView) { /* → HTML string */ },
  position: function(arcView) { /* → HTML string */ }
};
```

**To add a render mode:**
1. Register a function under the new key in `RENDERERS`
2. Set `renderMode` on the arc in `arcs-v2.json`
3. Rebuild — `build-index.js` carries `renderMode` into `arcMeta`;
   `getLatticeView` puts it on each `arcView`

Unknown modes fall back to `dots` with a one-time console warning.

**Current modes:**
| Mode | Used by | Behavior |
|---|---|---|
| `dots` (default) | 15 arcs | Title · section label + position counter + prev/next |
| `position` | `full_timeline` | Title only + position counter + prev/next |

**The arcView contract is the interface.** If a renderer needs new data,
add it to `getLatticeView`'s push — not to the renderer itself. Renderers
are pure functions: `arcView → HTML string`. They do not reach outside.

→ *Connects to 06-i18n: renderer output strings (← prev, next →, You Are Here)
are display text and must follow the localization rules in 06-i18n. They are
not exempt because they live in JS.*

<!-- [VXG RealForever] -->
