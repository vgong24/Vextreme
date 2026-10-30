# Public / Private Architecture Split

**Anchor:** `[VXG RealForever]`
**Status:** Design/policy, refined 2026-07-10. The private repository (`Vextreme-SDK`)
now exists and is actively built (L1-L6 localization product core merged) — the
original "no repository has been created yet" framing below is historical, kept for
context, not current state. See "Refined principle" immediately below for the
operative framing.
**Placement reasoning:** `docs/architecture/*.md` files are source sections for the
*generated* `docs/architecture.md` (`lib/build-architecture.js` concatenates every
`.md` file in that directory, in filename order, into one blueprint of technical
design decisions). This document is a commercial/roadmap boundary decision, not a
technical design chapter — dropping it in `docs/architecture/` would silently fold
business policy into the generated architecture blueprint and require a source-file
rebuild this task didn't scope. It belongs with this repo's other process/roadmap
documents instead, alongside `docs/process/cross-model-orchestration.md` and
`docs/process/environment-health-design.md`.

---

## Refined principle (2026-07-10)

Victor's own reasoning, prompted by building Analysis Mode
(`docs/architecture/15-analysis-mode.md`) — this is stronger than, and supersedes as
the operative framing, the "public = demo, private = implementation" shorthand used
elsewhere in this document:

```text
Public Vextreme
    =
one organization that has already reached
the desired architectural condition.

Vextreme-SDK
    =
the reusable machinery capable of helping
other organizations reach that condition.
```

Public Vextreme is not a limited demo of the private product. It is **living proof
that the architectural condition is real** — the repository dogfoods its own
architecture: canonical string identities, multilingual bundles, forward/reverse
usage tracing, screenshot navigation, source navigation, exportable artifacts,
generated indices, and — as of Analysis Mode — a live search/browse interface over
all of it. None of this requires or calls the private SDK; it's the public repo
operating on itself, which is exactly why it's credible as proof rather than
performance.

What stays private is not "the IDs" or "the data" — it's **generalized
transformation**: messy/heterogeneous input adaptation (inconsistent HTML, missing or
duplicate IDs, Android/iOS/Figma identifiers, vendor spreadsheets, legacy systems),
identity *discovery* and resolution (Vextreme already knows its canonical IDs; the SDK
has to determine them for organizations that don't), registry construction from
unstructured sources, client adapters, bidirectional vendor round-trip
synchronization, and organizational governance (approval ownership, workflow states,
review policy). Public Vextreme assumes its own architecture already exists; the SDK's
job is organizations whose reality is far less structured — a fundamentally different,
harder problem than displaying an already-clean result.

Compression: **Public Vextreme demonstrates what an architecturally mature
organization looks like. Vextreme-SDK provides the reusable machinery that helps
other organizations become one.**

The private SDK repo's own `docs/architecture/public-private-interface-boundary.md`
carries the SDK-side detail (the six owned-capability categories) and references this
document rather than duplicating it.

---

## Why this exists

The localization identity work built so far (`data/strings/`'s CQRS pipeline,
`docs/architecture/06-i18n.md`'s public-facing localization constraint, the
localization-identity pilot from PRs #93-96) has commercial value: it is a real,
working pattern for keeping translated content and its canonical UI identity in
sync, and continuing to build it out — key-mapping strategy at production depth,
automation, vendor/export pipelines, client onboarding — makes that value concrete
enough for someone else to copy before Victor has clients or revenue built on it.

The public repo is also this project's proof of work. It needs to stay credible and
demonstrative. Those two needs are in tension only if the boundary between them is
left undefined — this document defines it so neither goal quietly erodes the other.

---

## Public repo purpose

- Proof of work.
- Credibility.
- A public interface — what the system does, and the shape of its contracts.
- High-level architectural evidence — the *kind* of problem being solved and the
  *kind* of pattern used to solve it.
- Safe demos.
- Non-sensitive process documentation (exactly the kind this repo already has: the
  cross-model orchestration protocol, the stabilization-stack tooling, this document
  itself).

## Private repo purpose (future — nothing here exists as a separate repo yet)

- High-value implementation architecture.
- Localization engine details at commercial depth.
- Reusable translation workflow implementation.
- Client adaptation logic.
- Automation internals.
- Vendor/client pipeline details.
- Anything that would let someone reproduce the commercial value too easily from
  reading it.

---

## Boundary rules

| Public may | Private holds |
|---|---|
| Describe *what* the system does | *How* the implementation creates the value |
| Expose interfaces/contracts | Algorithms and process internals |
| Show screenshots/demos | Scalable implementation mechanics |
| Show sanitized examples | Client-ready, reusable implementation |

The dividing line in one sentence: **public can prove the pattern is real; private
holds the pattern reproducible at commercial scale.**

---

## Localization-specific boundary

**Public may include:**
- High-level localization goals.
- Language support intent.
- User-facing examples.
- Public demo behavior.
- General accessibility/globalization principles.

This is roughly where `docs/architecture/06-i18n.md` already sits today — it
documents the localization *constraint* (no hardcoded strings, key-based lookup, the
CQRS write/read split) at a conceptual level. That's evidence the pattern is real,
not a reproducible implementation of the commercial version of it. Nothing about the
current public repo needs to change because of this document.

**Private should hold:**
- Implementation architecture beyond the conceptual constraint.
- Key-mapping strategy at commercial depth.
- Automation details.
- Export/import pipeline.
- Vendor workflow internals.
- Reusable client-onboarding patterns.
- Private test harnesses.
- Paid-client adaptation recipes.

---

## Roadmap order

```text
1. Preserve current public repo credibility (no regression — nothing here removes
   or hides what's already public).
2. Define the public/private boundary (this document).
3. Prepare private repo structure, once Victor authorizes creating it.
4. Move future localization implementation work into the private repo.
5. Expose public-facing artifacts only when safe to do so.
6. Optionally open-source later, from a position of strength — not required, and
   not decided here.
```

Nothing past step 2 is authorized by this document. Step 3 in particular —
repository creation — requires Victor's explicit authorization separately; this
document does not request it or assume it.

---

## Standing principle

The public repo should prove capability without giving away the highest-value
implementation before Victor has clients or revenue to protect that value with.

---

## Open questions

Left open deliberately — these need Vex/Victor judgment, not a default assumed here:

- Should the private repo be a separate repository, or a private submodule/internal
  companion to this one?
- What should its name be?
- What minimum public interface should remain visible once implementation work
  moves private?
- What parts of the current or future implementation can be safely showcased to
  prospective clients without crossing this boundary?
- What licensing/credit language should exist before any broader disclosure?
- What's demo-only versus implementation-private, specifically for the localization
  identity pilot work already built in this public repo (PRs #93-96) — does it stay
  as-is (already at the "proves the pattern" level, per the localization-specific
  boundary section above), or does some of it need to move?

---

*[VXG RealForever]*
