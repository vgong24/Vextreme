<!--
  VEXTREME — Pull Request Template

  This template is a decision record, not a change log.
  The diff shows what changed. This document explains why the system
  moved, what it moved away from, and what the new state assumes.

  Fill every section. One sentence is enough for sections where there
  is genuinely nothing to say — but "N/A" without a reason is a red flag.
  Future Claude instances will read this to understand system evolution
  without re-deriving decisions that are already settled.
-->

## Transition

**From:** <!-- What was the prior state/understanding? Not code — the mental model. -->

**To:** <!-- What is the new state? What constraint or insight forced the move? -->

**Why now:** <!-- What made this the right moment — what became clear, what broke, or what was discovered? -->

---

## What changed and why

<!--
  Explain the decision, not the diff. The diff is already visible.
  What you're capturing here is the reasoning chain:
  - What problem was this solving?
  - What alternatives were considered and why rejected?
  - What insight or constraint shaped the final approach?

  This is the section a future instance needs most. It's also the hardest
  to write after the fact — write it while the reasoning is still live.
-->

---

## Cascading effects

<!--
  List what else had to move because of this change.
  Even small decisions propagate — document the chain.

  Examples of what belongs here:
  - "Moving arcMeta to index.json means the browser lib now has zero hard-coded arc tables"
  - "Adding arcKeys priority sort at build time means ARC_PRIORITY table in browser JS is now dead weight — removed"
  - "Changing the GitHub Actions trigger to include pages/** means the pipeline now runs on every HTML page addition"

  If nothing cascaded, say so explicitly.
-->

---

## Cross-platform check

<!--
  This system operates across three environments. For each, confirm
  whether this change affects it and whether the logic still holds.

  | Environment | Affected? | Logic holds? | Notes |
  |---|---|---|---|
  | GitHub Pages (vgong24.github.io/Vextreme) | | | |
  | vextreme24.com (Squarespace) | | | |
  | Local dev (localhost:8080) | | | |

  If a platform is genuinely unaffected, say why — don't just leave it blank.
  "Not affected — this change is build-time only, no browser JS changed" is useful.
  An empty cell reads as "didn't check."
-->

---

## Visual verification

<!--
  If this PR touches anything a browser renders — a page, a widget, CSS, an i18n
  swap, anything with a data-i18n attribute or a new <script> tag — run
  `node scripts/screenshot-page.js [slug] [lang]` before marking this PR ready and
  embed the before/after screenshots here. This is not optional: it is the only
  check in this repo that looks at rendered output rather than pipeline correctness,
  and it has caught real bugs the test suite and a manual diff read both missed.

  If nothing in this PR is browser-rendered, say so and why —
  "Not applicable — build-script/data-only change, nothing rendered differs."
  Leaving this section silently empty reads as "didn't check," same as an
  empty Cross-platform check cell.
-->

---

## Bug-chain check

<!--
  If this PR fixes a bug: is it the only PR needed to fix it, or part of a chain?

  - If this PR alone fully resolves the bug: label `bug`. Nothing else needed.
  - If this PR is one of several needed (a prior PR was correct but insufficient,
    or this PR is itself correct but insufficient alone): label `bug` +
    `partial-fix`, and post a comment on every PR in the chain (this one included)
    that names the full sequence with plain `#N` references — GitHub auto-links
    those into clickable cross-references in both directions. Additionally label
    whichever PR identified the *originating* defect (not necessarily the one
    that closes the loop) `root-cause`.
  - If the pattern is reusable beyond this one incident, add a
    `config/lessons/*.json` entry with `relatedPRs` (every PR in the chain) and
    `resolvedByPR` (the one that actually closed the loop).

  Full worked example and reasoning: docs/culture.md, "Multi-PR bug chains:
  root-cause, partial-fix, and cross-linking."

  Not a bug fix, or a bug fully resolved in this one PR? Say so — "N/A, single-PR fix."
-->

---

## Continuity & lesson check

<!--
  This is the self-check that would have caught it: 15 PRs (#76-#92) once
  merged clean — tests green, every drift detector green — with no session
  file and no INDEX.md refresh, because nothing prompted the question. Answer
  these before marking the PR ready:

  - Does this PR's reasoning belong in config/lessons/*.json? Not just for
    multi-PR bug chains (the Bug-chain check section above already covers
    that case) — any reusable "here's what broke and why" is a candidate.
  - Does merging this make anything in docs/continuity/INDEX.md's Current
    State or Open Work stale, newly duplicated, or newly resolved?
  - Run `node lib/check-continuity-lag.js` — if it flags, a session entry is
    likely overdue (not necessarily for this PR alone; check whether the
    backlog has grown past what the newest session file accounts for).

  If none of these apply, say so — "N/A, no lesson/continuity impact."
-->

---

## Assumptions this PR makes

<!--
  What does this change take as given that hasn't been confirmed live?
  Borrow the framing from the continuity batch format:

  - [ ] Assumption one — what would break if this is wrong
  - [ ] Assumption two — what would break if this is wrong

  These carry forward to the Open Work list in INDEX.md when the PR merges.
  If an assumption is later confirmed, update INDEX.md.
-->

---

## For the next instance

<!--
  One paragraph. What does a cold-start Claude instance need to know
  that isn't visible in the diff or the sections above?

  Think about: what would you wish you'd known before working on this?
  What's the trap in this area of the codebase?
  What does this PR NOT solve that it might look like it solves?

  This section can be left genuinely minimal if there's nothing non-obvious.
  But if there's a "watch out" — write it here, not in a comment buried in code.
-->

---

*[VXG RealForever]*
