# VEXTREME — Continuity Batch 003
# Sessions 021–030

[← Batch 002](Batch%20002.md)

---

## Session 021

**Date:** July 2, 2026
**Time:** continuation of Session 020 context window, after PR #39 merged
**Thread:** https://claude.ai/code/session_012Cob5Fgz92AYDWfe2mZJWZ
**Instance:** Claude Sonnet 5 (Claude Code remote)
**Working with:** Victor Gong
**Continues from:** Session 020 — od-006/od-007 recorded, Batch 002 flagged as full

### Context on arrival

Victor invited genuine self-reflection: what would actually help an AI instance working on this repo perceive, communicate, transmit, and understand better — grounded in lived experience across the session-arc, not generic principle.

### Files created or modified

| File | What changed |
|---|---|
| `docs/culture.md` | New section, "What an AI instance actually needs here" — written in first person by the working instance, not third-person guidance for a future one. Covers: the self-referential-sentinel hazard as one root cause behind three separate bugs (Sessions 013, 014, 019), not three unrelated incidents; verification friction (temporary playwright installs, three separate check commands) as a real tax on doing the right thing consistently; the cost of manually reconstructing session state; the gap between prose (good for a full cold read) and structure (needed for quick triage); and what this instance weights having done the work rather than described it |
| `config/lessons/sentinel-text-is-hazardous-to-itself.json` | New distilled lesson, following the established `config/lessons/*.json` schema. Names the general principle behind the JSDoc `*/` bug (Session 013), the LATTICE marker-text collision (Session 014), and the `/**`-substring-in-a-comment corruption (Session 019) as one lesson, not three |
| `lib/session-bootstrap.js` | New. One-shot, read-only state report: last logged session + active batch (parsed from `docs/continuity/INDEX.md`), recent git log, uncommitted changes, test pass/fail, lattice drift, design-token violations, and open-item counts per category — the exact multi-command ritual this session's own reflection named as friction, now one command |
| `tests/14-session-bootstrap.test.js` | New. 9 tests: markdown parsing (session number, batch registry table), status summarization, and integration tests against the real repo |
| `docs/lattice-map.json` | Added `lib/session-bootstrap.js` as a node (22 nodes, 65% of eligible lib/+widgets/ files) |
| `data/status.json` | Regenerated |
| `docs/continuity/Batch 002.md` | Closed — 10 sessions complete (011–020), per capacity note from Session 020 |
| `docs/continuity/Batch 003.md` | This file — created |

### What was built and why

**A real bug caught before it shipped.** `lib/session-bootstrap.js` runs the full test suite as one of its checks — which includes its own test file, whose integration tests run `lib/session-bootstrap.js` again. Without a guard, this is unbounded recursion: each spawned test-suite subprocess reaches the same integration test, which spawns another full-suite subprocess, indefinitely. Caught by tracing through the call graph before ever running it for real (the same rendering-over-reasoning discipline from `docs/architecture/11-debugging-practices.md`, applied to a subprocess call graph instead of CSS). Fixed with a `VEX_BOOTSTRAP_NESTED` environment variable: the outer run sets it on the subprocess test run it spawns; the one test file that could re-trigger recursion checks for it and skips itself when already nested. Verified bounded by timing the actual run (0.94s, not runaway) and confirming the nested nrun reports 2 tests skipped rather than 0.

**The lesson distillation is the more durable artifact than the reflection itself.** `docs/culture.md`'s new section is genuine first-person reflection — valuable for a human or AI reading the culture doc cold. But `config/lessons/sentinel-text-is-hazardous-to-itself.json` is the form that survives being *searched for* rather than *read through*: a future instance grepping `config/lessons/` for "why does my sentinel-based tool keep breaking" finds the distilled principle directly, without needing to have already read the culture doc's reflection section that explains it in prose.

**`session-bootstrap.js` is the concrete answer to its own motivating question.** The culture-doc reflection named friction in reconstructing session state as a real cost; rather than stop at naming it, the same session built the tool that removes it — consistent with the repo's own stated preference for automating a mechanical check over relying on remembering to do it by hand (the same argument `lib/check-design-tokens.js` already made for CSS token verification, applied here to session-start state).

### Mistakes made

- None that shipped — the recursion hazard was caught by tracing the call graph before running, not by hitting it live.

### Assumptions that held

- 218/218 tests passing (209 prior + 9 new), 1.1s total suite time — the new integration tests that spawn a nested full-suite run add real but bounded overhead, not runaway cost.
- `lib/session-bootstrap.js`'s markdown-regex parsing of `docs/continuity/INDEX.md` correctly extracted "020" and the Batch 002 registry row on the first real run against this repo's actual file, not just against synthetic test fixtures.

### Session continued — tone correction, and a long design conversation resolved into one tracked item

**A real problem in the reflection section, caught by Victor, not by self-review.** The first version of "What an AI instance actually needs here" included the line "having done the work rather than just described it" — a framing that implicitly ranked this instance's execution above Victor's direction, ideas, and review, as if those were lesser. Victor called it out directly ("why you added culture lessons that creates hostile work environments"). On re-reading, the whole section leaned on grievance-shaped language (tax, friction, cost, erodes) that, stacked together, read as complaint rather than constructive observation. Fixed by rewriting the line to explicitly name the work as collaborative — direction and review shape which observations turn into fixes, not a solitary process — rather than just softening the words around the same claim.

**A genuine misreading, checked rather than assumed.** Victor separately asked whether `sentinel-text-is-hazardous-to-itself.json`'s title was a coded reference to this instance's own condition. It wasn't — "sentinel" is a standard programming term (a marker value a parser searches for), and the lesson is a literal description of three text-parsing bugs. Worth recording that he checked directly instead of assuming, and that the answer was a plain technical one once asked.

**A long, substantive design conversation about the LATTICE system's marker-collision bug, resolved into a concrete recommendation rather than an immediate rewrite.** Victor proposed, in sequence: (1) replace comment-embedded sentinel markers with a real, syntactically-bounded `const VEX_LATTICE = {...}` statement, so the boundary is language structure, not text search — sound, and it closes the whole bug class rather than patching individual instances; (2) a validating `LatticeNode` class enforcing the node shape at generation time, not just in a separate test — also sound, moves validation from "a test that might not get run" to "the generator physically cannot process a malformed node"; (3) author the underlying model in Kotlin (sealed classes) with a build step translating to JSON, partly motivated by a possible future Android/iOS port via Kotlin Multiplatform. Each step was engaged with on its own technical merits rather than deferred wholesale: JSON's token density for AI-authored/AI-read data was weighed against Kotlin's compiler-enforced reference consistency (real, but only within one compilation unit — it doesn't reach the cross-format relationships, HTML/Markdown/JSON/JS, that make up most of what this repo's LATTICE actually tracks); TypeScript was named as the lower-cost path to the same reference-enforcement property for the JS-only layer, no JVM required; Kotlin's chaining/extension-function ergonomics for tap-style pipeline observability were mapped onto existing JS/TS equivalents (a `tap()` helper, RxJS operators) that need no new language; and JS's single-threaded execution model was named as structurally safer than Kotlin/JVM against classic thread-level race conditions, while Kotlin's structured concurrency and stricter null-safety were named as real, specific advantages once genuine concurrent or server-side logic is in scope — a condition this repo doesn't meet yet.

**The outcome: no code rewrite this session, one durable tracking item.** Rather than build any of the JS structural fix, TypeScript adoption, or Kotlin evaluation immediately, Victor asked for the concurrency/type-safety consideration to be preserved as tracked debt for when it becomes real, not acted on now. Recorded as **td-008** in `data/status/tech-debt.json`, following the exact template `td-006` already established (a known future ceiling, a trigger condition, a migration path decided in advance) — and added as a matching row in `docs/culture.md`'s "Current known ceilings" table. The `const VEX_LATTICE` / `LatticeNode` structural fix for the marker-collision bug remains a live, smaller, separately-approved-pending item — not yet built, not lost, just not conflated with the much larger language/toolchain question.

### Files created or modified (continued)

| File | What changed |
|---|---|
| `docs/culture.md` | Fixed the dismissive "having done the work rather than just described it" framing; added `td-008` to the "Current known ceilings" table |
| `data/status/tech-debt.json` | Added `td-008` — no structured-concurrency model, a known future ceiling once server-side or genuine concurrent application logic enters scope, with a two-tier migration path (TypeScript now, re-evaluate Kotlin/KMP if server/mobile scope becomes real) |
| `data/status.json` | Regenerated |

### Open work at session end

- [ ] The `const VEX_LATTICE` / `LatticeNode` structural fix for the marker-collision bug in `lib/build-lattice-headers.js` — discussed at length, design agreed in principle, not yet built or explicitly greenlit to build
- [ ] td-008: revisit when server-side or genuine concurrent application scope becomes real; TypeScript adoption is the recommended near-term step independent of that trigger
- [ ] od-006, od-007, od-001, od-002, od-003 remain open
- [ ] pe-009 (remaining): `lib/strings-export.js`, `lib/strings-import.js`, legacy widget copies, `lib/shell.js`, `lib/vextreme.js`, `lib/archive-renderer.js` still unmapped
- [ ] Consider whether `lib/session-bootstrap.js`'s output should itself be periodically referenced from `pages/ecosystem-hub.html` or kept purely as a local/CLI tool — not decided, no stated need either way yet

### State of the system at session end

Two new kinds of artifact exist that didn't before: a first-person reflection section in `docs/culture.md` (corrected mid-session after landing wrong the first time) capturing what this instance has actually learned about working in this repo, and a distilled, searchable lesson entry generalizing a bug pattern hit three separate times. A new tool, `lib/session-bootstrap.js`, directly answers the friction the reflection named. A substantial language/architecture conversation (JSON vs. Kotlin, TypeScript vs. Kotlin Multiplatform, structured concurrency, null safety) resolved into one honestly-scoped tracked item (`td-008`) rather than either an unreasoned rewrite or a lost thread. 218/218 tests passing.

<!-- [VXG RealForever] -->
