# PR Ordering And Reasoning Continuity — 2026-07-06

<!-- [VXG RealForever] -->

## Purpose

This note preserves a working-culture discovery from 2026-07-06: important architectural
reasoning can emerge while an unrelated draft PR is still open. That reasoning should be captured
without forcing the current PR to expand, merge out of order, or become responsible for every
idea discovered during the session.

This is preserved context, not adopted architecture by itself. Future instances should use it to
understand how Victor and Codex began separating conversation order, decision order,
implementation order, and current architecture order.

---

## Metadata

| Field | Value |
|---|---|
| Status | Preserved culture/context, not adopted architecture |
| Source fidelity | Live Codex/Victor discussion on 2026-07-06 |
| Created in repo | 2026-07-06 Codex thread |
| Indexed from | `docs/continuity/CONTEXT-NOTES.md` |
| Applies when | Multiple open discussions or PRs exist at once |
| Conversion rule | Promote into `docs/culture.md`, PR conventions, status queues, or architecture docs only through a scoped PR |

---

## Core Tension

Victor identified a real continuity problem:

- a draft PR may be open and not yet merged
- a separate architectural or cultural lesson may emerge during the same working session
- that lesson may be important for future readers
- merging it before the current PR may scramble execution order
- waiting too long may lose the reasoning that produced the lesson

The answer is not to rush the merge. The answer is to preserve the reasoning in the correct
layer, then let each PR carry the decision boundary appropriate to its own scope.

---

## Narrative Context

This note emerged during Victor's first Codex working session on 2026-07-06, while draft PR #62
(`VXG-070626: codex-page-binding-health-checks`) was already open.

The session did not start as a culture discussion. It began with page-binding health checks:
Codex added audit logic so pages could be classified by whether they were wired to God Scripts,
blocked, legacy-patterned, or missing bindings. That work also caused `data/status.json` to report
new grouped health notices, which led Victor to ask why `totalOpen` and related counts increased
even though he had not added new HTML files.

That question widened into a deeper auditability concern. Victor noticed generated files such as
`sitemap.xml`, `index.html`, `pages/archives.html`, `sw.js`, and `data/index.json` appearing as if
many pages had changed. Codex traced `lib/build-sitemap.js` and found that sitemap `lastmod` was
being set to the build date for every URL, not to durable page provenance. This made the repo look
as if pages were modified when the build projection had merely refreshed.

Victor then named the preservation concern underneath that confusion: the system should preserve
original date added, reasoning history, decisions, and execution trail so future readers do not lose
the answer to "why." Codex proposed a future page-provenance and generated-artifact audit layer,
but also recognized that implementing it immediately would bloat the existing draft PR.

During the same conversation, Victor brought in summary context from a 2026-07-05 ChatGPT/Vex
discussion about broader architecture: canonical source vs. projections, localization URL state,
GitHub as event stream, notification projections, screenshot PR checks, org adapters, and
AI-readable maps. Codex first preserved that as a standalone continuity note, then Victor questioned
whether standalone notes would scale. That produced the context-note registry pattern:

- `docs/continuity/context-notes/` holds large unresolved discussions
- `docs/continuity/CONTEXT-NOTES.md` indexes them
- `CLAUDE.md` and `docs/continuity/INDEX.md` point to the registry without becoming archives

That led to the final tension recorded here. The culture lesson itself emerged while another PR was
still open, and while follow-up context-note work was still uncommitted. Victor asked whether this
new culture should be stored even before merge order was resolved. The answer was yes: preserve the
reasoning now as context, then decide later whether and how it graduates into standing culture,
architecture, or queue items.

This is the lived thread behind the rule below: preserve emergence without hijacking the active PR.

---

## Four Orders To Keep Separate

### Conversation Order

When did the idea arise?

Store this in:

- batch session logs
- context notes

### Decision Order

When was the idea accepted as direction?

Store this in:

- PR bodies
- `data/status/open-discussions.json`
- `data/status/planned-enhancements.json`
- `data/status/tech-debt.json`

### Implementation Order

When did the repo actually change?

Store this in:

- commits
- merged PRs
- batch session completion notes

### Current Architecture Order

What is true now?

Store this in:

- `docs/architecture*.md`
- `docs/continuity/INDEX.md`
- generated status/dashboard projections

Do not force one file or one PR to carry all four orders.

---

## Working Rule

If an idea appears during an unrelated PR:

1. Preserve its emergence in continuity or a context note.
2. Classify whether it is context, open decision, planned enhancement, tech debt, lesson, or
   accepted architecture.
3. Do not implement it in the current PR unless it is required for that PR to be coherent.
4. Promote only the specific actionable piece through the normal PR decision-record process.

This lets the repo preserve priority and reasoning without letting every live idea hijack the
current checkpoint.

---

## Current Application

As of this note, the working order is:

1. Draft PR #62: page binding health checks.
2. Follow-up continuity PR: context-note structure and preservation of the 2026-07-05
   architectural discussion.
3. Follow-up queue item or PR: page provenance and generated artifact audit.

The culture learned during this discussion can be preserved here first, then later distilled into
`docs/culture.md` or PR conventions if Victor decides it should become standing doctrine.

<!-- [VXG RealForever] -->
