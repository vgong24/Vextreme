# Squarespace Preservation Intake

Status: **capture-first / migration-deferred**

This area exists to get the currently deployed Vex Life/Squarespace surface into safety before any broad rewrite into the Vextreme page/arc system.

## Boundary

Do **not** treat this folder as a migration of `data/pages.json`, `data/arcs.json`, page templates, or GitHub Pages routes.

The immediate job is preservation:

```text
live/deployed Squarespace state
        ↓
raw capture
        ↓
dependency inventory
        ↓
localized operational mirror
        ↓
offline verification
        ↓
only then: Vextreme route/template adaptation
```

Raw captures are evidence. Derived local mirrors are executable preservation artifacts. Future Vextreme pages are migrations. Keep those three states separate.

## Why this exists

Representative captures show several different page classes:

- authored HTML/CSS that is already substantially self-contained;
- pages whose runtime JavaScript builds layout or state in-browser;
- pages that dynamically construct remote dependencies such as Google Docs iframes;
- pages whose authored HTML is already tracked in this repository but whose deployed Squarespace wrapper, fonts, template CSS, images, and runtime still depend on external hosts;
- shared Squarespace and Vextreme loaders that are duplicated across rendered page source.

A single "download images" pass is therefore insufficient. The preservation adapter must preserve both the static dependency graph and the executable browser behavior needed to reproduce the deployed site locally.

## Preservation invariants

1. **Raw input is immutable.** Never rewrite a source capture in place.
2. **Authenticated captures are quarantined.** Do not commit raw logged-in Squarespace source into this public repository. It can include account/editor metadata that is unrelated to the public site.
3. **Every remote dependency keeps provenance.** Store original URL, local path, content hash, referring page(s), discovery method, and download result.
4. **Internal route topology is first-class.** Root-relative links such as `/bridge-council` remain route edges, not asset downloads.
5. **Dynamic dependency discovery is required.** HTML parsing alone is not enough; JavaScript can assign iframe URLs, call `fetch()`, inject scripts/styles, or create other network requests at runtime.
6. **Offline operation is the preservation test.** A localized page is not complete until it can run with required external network access blocked.
7. **Migration waits for capture.** Do not normalize, redesign, or remap the site into Vextreme until the Squarespace source state is safely captured and qualified.

## Intended derived layout

```text
preserved-site/
├── raw/                 # immutable source captures; normally local/private
├── pages/               # derived portable HTML by original route
├── assets/              # content-addressed or stable localized assets
│   ├── images/
│   ├── fonts/
│   ├── css/
│   ├── js/
│   ├── documents/
│   └── media/
├── manifests/
│   ├── site.json
│   ├── pages.json
│   ├── dependencies.json
│   ├── routes.json
│   └── failures.json
└── verification/
    ├── runtime-network.json
    ├── offline-results.json
    └── screenshots/
```

## Adapter phases

**Phase A — intake:** accept saved HTML files and optional screenshots; fingerprint them; reject accidental mutation.

**Phase B — static discovery:** parse HTML, CSS, inline script literals, root-relative routes, image/srcset/data attributes, fonts, stylesheets, scripts, iframes, media, files, CSS `url(...)`, and obvious JavaScript URL constructors.

**Phase C — fetch/localize:** download remote assets, recursively inspect CSS dependencies, preserve redirects/content-type/hash, and emit a reversible original→local URL map.

**Phase D — runtime discovery:** serve derived pages over localhost, execute them in a real browser, record network requests, traverse known interactive states where possible, and classify unresolved remote dependencies.

**Phase E — offline qualification:** block non-local network access and verify page boot, route navigation, assets, dynamic behavior, and representative interactions.

**Phase F — migration:** only after the capture graph is stable, adapt preserved routes and content into Vextreme/GitHub Pages.

See `intake/2026-09-27-observed-patterns.md` for the first evidence-driven decisions and `adapter/README.md` for the worker contract.
