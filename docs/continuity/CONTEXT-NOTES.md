# Continuity Context Notes

<!-- [VXG RealForever] -->

## Purpose

This registry points to large external or cross-session discussions stored in
`docs/continuity/context-notes/`. These notes may affect future architecture decisions, but are
not themselves accepted architecture, active work queues, or append-only session logs.

Use this file as the doorway. Do not add every context note directly to `CLAUDE.md`.

---

## What Belongs Here

Add a context note here when:

- the discussion happened outside the normal batch-session record
- the reasoning is too large for `CLAUDE.md`
- future decisions could be worse if the reasoning is forgotten
- the ideas are not yet specific enough to become `od-`, `pe-`, `td-`, architecture, or lesson
  entries

Do not use this registry as a replacement for:

- `docs/continuity/Batch *.md` — append-only session history
- `docs/continuity/INDEX.md` — current state, open work, and active batch pointer
- `data/status/*.json` — canonical active queues for open discussions, planned enhancements,
  and tech debt
- `docs/architecture*.md` — accepted architecture
- `config/lessons/*.json` — distilled reusable lessons

---

## Conversion Rule

Context notes preserve reasoning. They do not create work by themselves.

When a note becomes actionable, convert the specific item through the normal path:

- open decision question -> `data/status/open-discussions.json`
- planned enhancement -> `data/status/planned-enhancements.json`
- technical debt -> `data/status/tech-debt.json`
- accepted design -> architecture documentation
- reusable lesson -> `config/lessons/*.json`

The PR that performs that conversion is the decision record.

---

## Note Shape

Each context note should include:

- purpose
- metadata
- reading rule or relevance trigger
- narrative context, when the note records a lesson or culture shift that came from a sequence
  of events
- the preserved reasoning itself
- conversion or promotion rule

The narrative context is the short causal history: what was already happening, what made the issue
visible, what decision pressure appeared, and what rule or future work emerged. It should be enough
for a future instance to understand the "why" without rereading the full original conversation.

---

## Reviewer Lens

Review context-note additions by asking:

- Is this preserving needed reasoning, or hiding an actionable task outside the queue?
- Is the status unmistakable: context, not adopted architecture?
- Does the note have a clear reading trigger and conversion path?
- Does the batch entry point to the note without copying it?
- Does the narrative context explain the causal thread behind the lesson or rule?
- Should any piece be promoted now into `od-`, `pe-`, `td-`, architecture, culture, or lessons?

A good context-note PR makes future judgment easier without increasing cold-start reading by
default.

---

## Notes

| Date | Note | Status | Source | Use When | Conversion Path |
|---|---|---|---|---|---|
| 2026-07-05 | `docs/continuity/context-notes/architectural-discussion-2026-07-05.md` | preserved context, not adopted architecture | Victor summary from ChatGPT/Vex discussion; full transcript not reviewed | repo topology, AI workflow, localization, notification projection, external org mapping, slug/registry scalability, screenshot comparison, dashboard concepts | Promote only specific items into `od-`, `pe-`, `td-`, architecture, or lessons through a PR |
| 2026-07-06 | `docs/continuity/context-notes/pr-ordering-and-reasoning-continuity-2026-07-06.md` | preserved culture/context, not adopted architecture | Live Victor/Codex discussion | multiple open PRs, midstream architectural discoveries, merge order vs reasoning order, deciding where culture belongs | Distill into `docs/culture.md`, PR conventions, status queues, or architecture docs through a scoped PR |
| 2026-07-08 | `docs/continuity/context-notes/meta-project-process-grammar-2026-07-08.md` | pattern-draft, not adopted architecture | Victor + Vex discussion, July 7–8, 2026 (uploaded doc, reviewed against the live repo in Session 027) | process/role modeling, task dispatch, dimensional source-truth mapping, reversible projection (translation export/import), process formation lifecycle, stable process keys | Promote specific pieces into `od-`/`pe-`/`td-`, architecture docs, or lessons through a scoped PR — `pe-014` (reverse-traversal source-truth map, renamed from `pe-012` after an ID collision) already absorbs the closest piece; a translation-pipeline extension (dimensional address + candidate-variant staging + round-trip versioning) is the recommended next pilot if one is wanted |
| 2026-07-08 | `docs/continuity/context-notes/global-localization-source-of-truth-poc-2026-07-08.md` | north-star/pattern-draft, not adopted in full | Victor + Vex planning session (uploaded POC doc + two clarifying relays), reviewed against the live repo and narrowed in Session 027 | full-scale localization/UI-identity architecture (18 scripts, cross-platform indexes, screenshot navigation, vendor packets, platform-string rehydration, HTML review UI, change history, approval ledger) — read before proposing any localization-identity expansion beyond the pilot | The pilot actually built (`lib/discover-string-identity.js`, `lib/build-string-identity-index.js`, `lib/check-string-identity.js`, scoped to `victor-methodology-presentation`) is the accepted piece; everything else here stays north-star context until a real second case justifies expanding it — promote through a scoped PR same as any other context note |
| 2026-07-10 | `docs/continuity/context-notes/runtime-view-profiles-composition-container-2026-07-10.md` | preserved proposal/candidate architecture, not adopted | Victor upload (authored with Vex), relayed during the nav/FAB-rollout regression review | changes to how shell.js/lib/vextreme.js compose runtime modules onto pages, new FAB orb categories, debugging/QA/localization overlay features, any "same page, different audience lens" requirement | Actionable decision question tracked as `od-012`; implementation (profile manifest, container refactor, View Profile orb) only through a scoped PR, prototyped on one page first per the proposal's own Section 11 |
| 2026-07-10 | `docs/continuity/context-notes/relay-culture-fresh-participant-dignity-2026-07-10.md` | preserved narrative evidence; the doctrine itself is already adopted in `docs/process/cross-model-orchestration.md` ("Fresh participant dignity") | Live Victor/Vex/Gemini relay; user-relayed Gemini transcript included as evidence, not accepted repo state | revising how the orchestration doc handles fresh/external AI participants, onboarding a new model lens, questioning why "receive before scope" is the stated order | Core rule already converted (Receive -> Scope -> Repair, External model response stance). Further promotion (culture.md pointer, route-packet tooling, validation UX) only through its own scoped PR |
| 2026-07-12 | `docs/continuity/context-notes/vextreme-design-foundation-2026-07-12.md` (+ sibling directory of the same name — first package-shaped context note, not a single `.md` file) | preserved candidate deliverable, not adopted architecture | Victor working directly with Claude Design; a from-scratch brand/design-system build, no prior codebase or Figma reconciled against it | any change to `docs/architecture/12-design-system.md` or `styles/design-system.css`, any decision about Vextreme's visual identity/palette/type/component library, before assuming the current light-only cream/stone/ember system is final | Adopt/reconcile through a scoped PR into `docs/architecture/12-design-system.md` + `styles/design-system.css` (not a drop-in replace — family 1 is load-bearing today); or track as an open decision question in `data/status/open-discussions.json` if Victor wants it queued rather than left here |

---

## Scalability Check

If this registry grows past a handful of notes, split it into a structured data source and
generate this page the way the rest of Vextreme treats source vs. projection.

Until then, this file is intentionally small: one human-readable index, clear status language,
and no false claim that preserved context is already accepted work.

<!-- [VXG RealForever] -->
