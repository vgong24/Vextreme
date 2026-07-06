# Architectural Discussion — 2026-07-05

<!-- [VXG RealForever] -->

## Purpose

This note preserves summary context from a 2026-07-05 architectural discussion about how
Vextreme may scale beyond its current repo structure into a broader coordination architecture
for humans, AI instances, GitHub, design systems, localization, notification projections,
and eventually external organizations.

This file is not an implementation mandate. It is a continuity record: future instances
should use it to understand the reasoning behind possible enhancements before proposing work.

This note was created from Victor's summary handoff, not from a full transcript review. Treat
it as preserved context awaiting deeper synthesis if the linked conversation becomes relevant
to an implementation decision.

Thread reference:

https://chatgpt.com/share/6a4c07f2-61a4-83e8-9372-18c882b79db3

---

## Metadata

| Field | Value |
|---|---|
| Status | Preserved context, not adopted architecture |
| Source fidelity | Victor summary handoff; full transcript not reviewed |
| Created in repo | 2026-07-06 Codex thread |
| Indexed from | `docs/continuity/CONTEXT-NOTES.md` |
| Cold-start pointer | `CLAUDE.md` points to the context-note registry, not this file directly |
| Conversion rule | Promote only specific items into `od-`, `pe-`, `td-`, architecture, or lessons through a PR |

---

## Reading Rule For Future Instances

Read this file when working on any of the following:

- AI cold-start context
- repo mapping / lattice expansion
- slug or page registry changes
- localization architecture
- screenshot comparison / visual PR validation
- GitHub notification or email projection workflows
- external organization mapping
- design-to-code bridge concepts
- Vextreme Hub / dashboard concepts
- cross-tool architecture visibility

Do not implement from this file blindly. Use it to preserve reasoning and convert specific
ideas into PR-scoped decisions through the normal decision-record process.

---

## 1. Canonical Source Vs. Projection Surfaces

### Level 1 — Conclusion

Vextreme should prefer one canonical source of truth, with downstream systems treated as
projections.

Examples:

- GitHub commit / PR / issue = canonical event
- Gmail notification = projection
- Dashboard = projection
- AI summary = projection
- Slack / Discord / mobile notification = projection

AI should reason from the canonical event whenever possible, not from downstream notification
surfaces.

### Level 2 — Mechanism

Instead of connecting AI directly to Gmail just to understand project state, keep GitHub as
the authoritative event stream. Gmail filters can organize notifications for the human, but
AI should use GitHub history, PRs, commits, issues, and repo files as the source of truth.

This avoids duplicated integrations and divergent histories.

### Level 3 — How The Thought Arose

The discussion started from organizing GitHub notification emails in Gmail. Gmail labels
revealed a useful structural analogy: one email can exist once while multiple labels project
different views over it. That mapped directly to Vextreme's recurring architecture pattern:
one identity, many projections.

---

## 2. Gmail Filters As Operational Configuration

### Level 1 — Conclusion

Gmail filter rules for Vextreme-related notifications should be documented in the repo as
operational configuration, even if Gmail itself remains manually configured.

### Level 2 — Mechanism

Possible future locations:

- `docs/operations/gmail-filters.md`
- `config/gmail/filters.md`

The file should record:

- search query
- applied label
- whether it skips inbox
- whether it should remain visible for security
- why the filter exists

Recommended conceptual labels:

```text
Projects/Vextreme/GitHub
Projects/Vextreme/OpenAI
Projects/Vextreme/Claude
Projects/Vextreme/Action Required
Accounts/GitHub/Security
```

### Judgment

This is useful as an operations-documentation pattern, but not yet urgent as automation.
The scalable distinction is:

- document filters when they affect how Victor or future instances perceive work
- automate only if manual filter maintenance becomes a repeated failure point

---

## 3. Candidate Architecture Themes To Preserve

The summary context names several architectural themes that should stay available for future
judgment:

- GitHub as authoritative event stream, with Gmail and dashboards as projections
- registry evolution beyond flat page slugs, while keeping slug identity stable
- localization URL state as a reusable parameter pattern
- screenshot comparison in PRs as visual verification, not just code reasoning
- organization-to-organization adapters for future external mapping
- AI-readable architecture maps as the way humans and AI both find current state
- Vextreme Hub / dashboard surfaces as projections of generated health data
- design-to-code bridges where intent becomes structured data before implementation

None of these are accepted implementation tasks by being listed here. They are preserved
candidate directions.

---

## 4. Priority Synthesis

Given current repo state, the strongest near-term sequencing is:

1. Finish the page-binding health-check checkpoint.
2. Build a test-environment binding harness for page moves and component bindings.
3. Establish localization URL state through the language FAB only after binding checks can
   tell whether a page is actually capable of receiving runtime localization.
4. Document operational projections like Gmail filters only when they affect project workflow
   enough to be worth making visible to future instances.

The scalable pattern is the same one already emerging in the repo:

```text
canonical event/source -> generated map/status -> human/AI-facing projection
```

Use that pattern before adding direct integrations. A projection can help a human notice
work, but the source of truth should remain the repo/GitHub event unless there is a strong
reason to make another system canonical.

---

## Open Questions

- Should operational configuration live under `docs/operations/` or `config/`?
- Should GitHub notification/email projection rules become an `od-` item, a `pe-` item, or
  remain only this preserved context until a real workflow failure appears?
- How much of the linked discussion should be distilled into `config/lessons/*.json` once
  the full dialogue is reviewed?

<!-- [VXG RealForever] -->
