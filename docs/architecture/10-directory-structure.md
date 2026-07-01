# Directory structure

Three directories hold JavaScript: `lib/`, `components/`, and `widgets/`.
They are not interchangeable. The distinction is about coupling, not file size.

---

## `lib/` — Engine room

Build pipeline scripts and core browser infrastructure.

**Node side:** build scripts that run in CI or manually. They read write-side
sources, compute, and emit artifacts. No DOM, no browser APIs.

**Browser side:** IIFEs that provide core runtime services shared across all
pages — index loading, arc nav rendering, string lookup. These are infrastructure:
pages depend on them, not the other way around.

Test: *can this file run without a page knowing it exists?* For build scripts,
yes — they run in CI. For browser lib files, they mount into a well-known DOM
element (`#arcNavMount`) or perform a side-effect the page explicitly opted into.

---

## `components/` — Structural page UI

Reusable UI fragments that embed structurally into page layout.

A component is part of the page's document flow. The page knows it exists —
there is a mount point or an explicit include. Removing a component changes
the page's rendered structure.

Examples: the arc nav block, a section header, a callout box.

Test: *does removing this change the page layout?* If yes, it is a component.

---

## `widgets/` — Floating interactive units

Self-contained interactive units that float above the page and can be
added or removed without the page knowing.

A widget injects itself into `document.body`, manages its own DOM and styles,
reads shared infrastructure (index.json, localStorage) directly, and produces
no artifacts. The page does not define a mount point for a widget — the widget
finds its own position. Removing a widget's `<script>` tag leaves the page
fully functional; adding it enhances the page without requiring page changes.

Examples: the language FAB, a floating debug panel, a keyboard shortcut overlay.

Test: *can I add or remove this `<script>` tag and leave the page fully functional
either way?* If yes, it is a widget.

---

## Decision boundary summary

| Directory | Coupling  | DOM    | Test criterion                        |
|-----------|-----------|--------|---------------------------------------|
| `lib/`    | Core infra | Shared mount point or no DOM | Runs in CI; page opts in explicitly |
| `components/` | Embedded | Page flow | Removing it changes page structure |
| `widgets/`    | None    | Self-injects | Add/remove `<script>` → page still works either way |

<!-- [VXG RealForever] -->
