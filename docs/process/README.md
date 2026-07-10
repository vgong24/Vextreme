# Process Map

**Anchor:** `[VXG RealForever]`
**Purpose:** A single index of this project's recurring organizational processes — what
condition triggers each one, how often it fires, who or what owns the loop, and whether it's
actually built or still design/policy. Added 2026-07-10, alongside
`business-document-review-protocol.md`, because that document's own reason for existing —
a recurring pattern running twice before anyone wrote down what it was — is itself evidence
this directory needed an index, not just more files in it.

This is a map, not a new source of truth. Every row points to the document or command that
actually governs that process; this file exists so a future instance (or Victor) can find
the right one by *condition*, without already knowing which of several similarly-named docs
to open first.

---

## How to use this map

Match your situation to the **Trigger condition** column, not the process name — several of
these sound similar (`pr-ready` vs. `cross-model-orchestration.md` vs.
`business-document-review-protocol.md` all involve "reviewing something") but apply under
different, mutually exclusive conditions. If more than one row seems to apply, the more
specific trigger wins; if none clearly applies, that's a real gap worth naming to Vex/Victor
rather than forcing the closest-sounding process to fit.

| Process | Trigger condition | Frequency | Loop / owner | Status | Governing doc |
|---|---|---|---|---|---|
| Session orientation | Any session, at start, before touching anything | Every session | Any instance, read-only | Built | `npm run current-work` |
| Branch/PR hygiene triage | Before cleanup, or before a cross-model handoff | Ad hoc | Any instance, read-only | Built | `npm run branch-triage` |
| PR readiness gate | Before opening or reviewing any PR | Every PR | Any instance, read-only | Built | `npm run pr-ready` |
| Cross-model code/architecture review | A PR touches code or architecture, within an already-scoped, non-sensitive lane | High — most PRs | Claude ↔ Codex green-path loop; Victor relays | Built | `cross-model-orchestration.md` |
| Business/stewardship document review | Victor directly initiates review of a pricing, stewardship, or business-model draft | Low, recurring (2nd occurrence as of 2026-07-10) | Vex drafts → Claude reviews → Codex verifies → Victor decides | Built (formalized 2026-07-10) | `business-document-review-protocol.md` |
| Public/private boundary decision | A capability could be exposed publicly, or work spans both repos | Occasional | Victor, per artifact | Policy exists; several open questions unresolved | `public-private-boundary.md` |
| Environment/tooling capability check | A session needs to know local tool/runtime constraints before acting | Would be every session, once built | Not yet assigned | Design-only, not built | `environment-health-design.md` |
| Continuity logging | End of every working session | Every session | Session's own author | Built | `docs/continuity/INDEX.md` |

---

## What this map deliberately does not cover

- **SDK-specific process.** `Vextreme-SDK` has its own `docs/process/` directory — a
  readiness gate, a secrets/config boundary policy, and a facilitator/integration service
  model, scoped to that repo's private commercial-depth work. This map doesn't duplicate
  those; per `docs/process/private-access-guardrails.md`'s own standing rule, this public
  repo does not name or describe that repo's internals beyond what's already established at
  boundary level in `public-private-boundary.md`. If you're working in `Vextreme-SDK`, its
  own `CLAUDE.md` cold-start chain is the right index, not this file.
- **The secrets/authority roadmap.** `cross-model-orchestration.md`'s "Roadmap placement"
  section already sequences `current-work → environment-health → secrets pointer registry
  → secret validation`. This map doesn't re-sequence that; it just places `environment-health`
  correctly among the *other* processes listed here as "design-only, not built."
- **One-off task instructions.** A relay packet, a task-scoped constraint, or a single PR's
  own body is not a standing process and doesn't belong here — see
  `cross-model-orchestration.md`'s "Standing principles vs. task-scoped constraints"
  section for that distinction, which this map inherits rather than restates.

---

## Adding a new row

A new process earns a row here once it has (a) a real trigger condition distinguishable
from what's already listed, and (b) either a governing document or a runnable command —
not before. A one-off task that might recur is not yet a process; wait for the second
occurrence (the same evidence bar `business-document-review-protocol.md` itself used) or an
explicit Vex/Victor decision to formalize it early, rather than pre-building process
documentation for a pattern that hasn't shown up twice.

When adding a row, keep the **Trigger condition** column concrete and testable — "a PR
touches code" is checkable; "something feels architectural" is not. If a new process
document is added anywhere in `docs/process/`, add its row here in the same PR — this map
stays useful only if it stays current, the same standing rule any registry-style index in
this project's ecosystem applies to itself.

---

*[VXG RealForever]*
