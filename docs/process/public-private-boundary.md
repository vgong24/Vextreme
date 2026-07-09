# Public / Private Architecture Split

**Anchor:** `[VXG RealForever]`
**Status:** Design/policy only. No repository has been created, no files have been
moved, and nothing described here has been implemented yet.
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
