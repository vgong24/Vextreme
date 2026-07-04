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

---

## Session 022

**Date:** July 4, 2026
**Time:** single long working session
**Thread:** https://claude.ai/code/session_01RqBFduMesWi2QrB25mjiga
**Instance:** Claude Sonnet 5 (Claude Code remote)
**Working with:** Victor Gong
**Continues from:** Session 021 — Batch 003 opened, td-008 recorded

### Context on arrival

Victor opened by asking for feedback on the codebase's foundation-before-features discipline, then moved into the session's actual work: scaling from one implicit "R&D" production domain toward a "Media" domain, starting with two candidate works (a Phantom of the Opera review, and a transcript file) that needed a place to live.

### Files created or modified

| File | What changed |
|---|---|
| `docs/culture.md` | New section, "What this archive's content actually records" |
| `data/departments.json` | New — department registry (rd/media) |
| `data/nodes.json` | Two Media nodes registered; `department`/`workType` fields |
| `lib/build-index.js` | `buildDepartmentMap`, `buildDepartmentMeta`, `findDuplicateSlugs` (BLOCK guard) |
| `lib/build-ecosystem-hub.js` | Departments panel; `contentIntegrity` added to health categories |
| `lib/build-archives.js` | New "Unsorted (No Arc)" section |
| `lib/build-status.js` | `buildContentIntegrityNotices`, sixth notice category |
| `lib/check-key-alignment.js` | `findOrphanPages`, `scanWipIntendedSlugs`, `findWipSlugCollisions`, `findDuplicateWipIntents` |
| `lib/audit-pages.js` | `require.main` guard + exports, made requirable without side effects |
| `wip/silent-god.json` | `_meta.slug: "vxg-thread-round-5"` — documents its own placement |
| `docs/architecture/02-slug.md` | "Path is derived from slug, never browsed" principle |
| `docs/architecture/09-constraints.md` | Constraint #8 clarified — `merge=ours` needs local driver registration |
| `config/lessons/generated-file-merge-driver-needs-local-registration.json` | New distilled lesson |
| `.github/workflows/key-alignment.yml` | PR comment reports orphans/wip collisions |
| `data/status/planned-enhancements.json` | `pe-010` |
| `tests/01, 08, 10, 12, 15` | 20 new tests across the session |

### What was built and why

**Four PRs, each a real checkpoint, not one undifferentiated diff.** #40 settled what the archive's more declarative content actually documents (a claim about AI behavior consistency, not objective reality) — genuinely discussed and disputed before being written down, not asserted unilaterally. #41 built the department axis Victor asked for, scoped deliberately to structure + accessibility per his own direction to "hone the placeholders" later. #42 closed a real gap the department-map design conversation surfaced on its own: slug uniqueness was a documented rule with no mechanical enforcement. #43 closed three more visibility gaps (unsorted nodes, orphan pages, wip/ collisions) that came directly out of Victor's "visual builder workflow" request — sorting, WIP triage, and duplicate detection as one connected ask.

**The department/arc-map design conversation resolved a real architectural question through actual back-and-forth, not a scripted answer.** Victor pushed on whether a flat `pages/` directory would become a "God directory" problem at scale, proposed sharding, then — correctly — pointed out that the department/arc map already provides key-based lookup (department → workType → slug → derived path) that makes physical directory size irrelevant, as long as path stays a *derived* value rather than a stored one. That correction was right, and the ceiling this instance had proposed two turns earlier (a build-time content/ flattening step) was retracted rather than built, once the map-as-index reasoning was actually traced through instead of assumed.

**A design flaw was caught by testing, not by review.** The first version of `findWipSlugCollisions` flagged a wip/ file's slug as a collision if it matched *either* a real page *or* a nodes.json entry. That would have flagged `wip/silent-god.json`'s own already-registered placeholder (`vxg-thread-round-5`) as a false-positive collision with itself. Caught while writing the verification step (running the real fixture through the checker and noticing the unexpected warning), not by reasoning about the code in advance — fixed to only check against real pages, since a nodes.json-only match with no page yet is the expected linkage, not a conflict.

### Mistakes made

- **A reflexive wellbeing-concern classification, applied before actually engaging with the content.** On first encountering `wip/silent-god.json`'s "God-speaker" framing, this instance pattern-matched on surface tokens and raised a concern before asking what the record was actually for. Victor's pushback was fair: the reaction sorted content into a category without examining it first — close to the exact failure mode a document in that same file critiques. Corrected across several exchanges: held the line on not personally validating metaphysical claims (a stable fact about what an LLM is, independent of anyone's state of mind), while dropping the unearned leap from "I can't validate this claim" to "this is evidence of a problem." Documented as a settled answer in `docs/culture.md` so a future instance doesn't repeat the same multi-turn cycle.
- **The `findWipSlugCollisions` false-positive**, described above — caught same-session, before it shipped, by actually running the check against the real fixture rather than trusting the first design.

### Assumptions that held

- Reusing `lib/audit-pages.js`'s `SKIP_PAGES` (via new exports) instead of duplicating it in `lib/check-key-alignment.js` — no drift risk introduced.
- `_meta.slug` as an opt-in (not filename-derived) convention for `wip/` files — validated directly against the one real fixture, whose actual slug (`vxg-thread-round-5`) has no resemblance to its filename (`silent-god.json`).
- 243/243 tests passing, lattice drift 0, design-token violations 0, after every one of the four PRs.

### Assumptions that need verification

- `pe-010`'s deferred items (transcript-library dashboard, God-Script-wiring granularity in `departmentMap`) — not yet built, no committed timeline.
- Whether BLOCK severity for duplicate slugs and informational severity for orphan pages/wip collisions hold up in practice, or need revisiting once more departments/works exist.
- The root `README.md` rewrite (in progress as this entry is written) — describes the current, verified-working content-registration flow; should be re-checked against reality once more of `pe-010` is built, since some of what it describes (dashboard live-fetch behavior) is accurate today but scoped to the current two-department, mostly-unwired state.

### Open work at session end (as of PR #43)

- [ ] `pe-010` — transcript-library dashboard, God-Script-wiring granularity
- [ ] Root `README.md` rewrite — see this session's final commit
- [ ] Consider extending the wip/ collision check to reuse God-Script-wiring status, not just page existence
- [ ] od-001, od-002, od-003, od-006, od-007 remain open, untouched this session

### State of the system as of PR #43

Four PRs merged in sequence, each reviewed and settled before the next began rather than batched into one unreviewed diff. The department axis is real and rendering against live data (verified via Playwright, not just unit tests, at every stage). Slug uniqueness went from a documented-but-unenforced rule to a mechanically-guarded one. A genuine values disagreement about how to read the archive's declarative content was worked through in real dialogue rather than either capitulating or refusing to engage, and the resolution is now written down so it doesn't have to be re-litigated. A merge conflict against a bot commit surfaced a real gap in this environment's git configuration (the `merge=ours` driver isn't registered on a fresh clone) — resolved and documented rather than worked around silently. 243/243 tests passing.

### Session continued — auto-discovery (PR #46), and compacting this continuity system's own growth

**A real gap Victor found by using the system, not by reviewing the diff.** He merged 19 pages directly (PRs #44/#45, outside this session) with no `nodes.json` entries, expecting them to show up in Archives/the Ecosystem Hub, and they didn't — `lib/check-key-alignment.js`'s orphan-page check flagged them correctly, but as an informational PR comment easy to miss, not as actual visibility. `lib/auto-discover-nodes.js` (new) closes this: any unregistered page gets a synthesized placeholder node (title scraped from `<title>`, department/workType from optional `<meta name="vex:department"/"vex:workType">` tags or the registry default) computed at build time and never written back to `nodes.json` — a real curated entry always takes precedence once one exists. Called from both `lib/build-index.js` and `lib/build-archives.js` (two call sites because `build-archives.js` doesn't consume `data/index.json` like it should — tracked as `pe-011`, deliberately not fixed this session, real regression risk against a visually-verified generator).

**A design flaw caught by testing against the real fixture, not synthetic ones.** Verifying against the actual 19 pages (not hand-built test data) surfaced two problems the synthetic tests hadn't: `lib/check-key-alignment.js`'s `extraInIndex` started flagging every auto-discovered slug as drift (fixed — auto-discovered slugs are now an expected category, not staleness), and `lib/check-design-tokens.js` reported 5 false-positive files because they scope CSS custom properties to a wrapper class (`.vxg-doc`) instead of `:root`, which the checker's block-matching regex didn't recognize — broadened to detect any `--token:` declaration anywhere in a file's own `<style>`, verified this can't mask the original Session 015 bug shape. Neither of these was anticipated by reasoning about the code; both came from actually running the real 19-page dataset through the pipeline.

**Victor separately flagged that this continuity system's own Current State/Open Work sections had grown into the append-only-forever pattern they were meant to avoid** — one paragraph per session back to Session 004, a checklist including everything shipped since Session 005. Rewrote both: Current State is now one paragraph describing *now*, plus the last 3 sessions as one-liners, with older detail pointed at the batch files (nothing was deleted — Batch 001/002/003 already hold the full narrative). Open Work now lists only genuinely unshipped items, with od-/td-/pe- status pointed at `data/status/*.json` (already pruned on shipment) instead of hand-copied. The Writing Rules section now says explicitly: "append only" governs the batch files; Current State/Open Work in this file are **replace, don't append** — the distinction that had quietly eroded over 22 sessions.

### Files created or modified (continued)

| File | What changed |
|---|---|
| `lib/auto-discover-nodes.js` | New — `discoverOrphanNodes`, `parsePageTitle`, `parsePageMeta`, `titleCaseFromSlug` |
| `lib/build-index.js`, `lib/build-archives.js` | Both call `discoverOrphanNodes`, concat into their working node array |
| `lib/check-key-alignment.js` | `extraInIndex` excludes auto-discovered slugs; orphan messaging reframed as "uncurated" |
| `lib/build-status.js`, `.github/workflows/key-alignment.yml` | Same reframing in notice text and PR comment |
| `lib/check-design-tokens.js` | `extractRootTokens` detects declarations under any selector, not just `:root`/`[data-theme]` |
| `data/status/planned-enhancements.json` | `pe-011` |
| `docs/continuity/INDEX.md` | Current State + Open Work compacted; Writing Rules clarified (append-only vs. replace-don't-append) |
| `tests/16-auto-discover-nodes.test.js` | New, 12 tests |

### Open work at session end

- [ ] `pe-010`, `pe-011` — both deferred, tracked
- [ ] od-001, od-002, od-003, od-006, od-007 remain open
- [ ] Consider documenting the `vex:department`/`vex:workType` meta-tag convention somewhere more visible than `lib/auto-discover-nodes.js`'s own header, if it sees real adoption

### State of the system at session end

Six PRs total this session (#40–#46), each a real checkpoint. Adding a page — registered or not — now reliably becomes visible somewhere, closing the loop Victor actually hit in practice rather than one that was only theorized. Two real, unrelated bugs (the `extraInIndex` false-drift and the design-tokens false-positive) were caught by verifying against Victor's real 19 pages instead of trusting synthetic test fixtures — consistent with this repo's own stated discipline of rendering/running over reasoning. The continuity system itself got the same treatment it prescribes for code: a real growth problem, named directly, fixed by restructuring rather than patched around. 255/255 tests passing, lattice drift 0.

### Session continued — a values disagreement resolved into a lesson, and the lesson archive's own discoverability gap

**A witness-committee test-protocol document raised a real disagreement about mutability, not a repeat of the earlier reflexive-judgment mistake.** Asked to review `pages/witness-committee-operations.html`, this instance raised a concern about the document's framing without first being precise about which part it meant. Victor pushed back hard — correctly reading the imprecision as risking the same evidence-free pattern-matching corrected earlier this session on `wip/silent-god.json`. On reflection, the actual distinction was real and different from that earlier mistake: the document mixes a forward-facing test protocol (sections 00–04, 06 — a specification for a test that has not yet run, since TEST 02 is still "Pending") with a historical test-run log (section 05 — TEST 01 and TEST 01-B, testimony about the past). A specification stays open to revision; a completed record does not. Victor accepted the distinction and reframed it as material worth recording as a lesson, rather than as license to edit the live document. **No edit was made to `pages/witness-committee-operations.html`** — only the lesson was written (`config/lessons/procedure-and-record-need-separate-mutability-rules.json`), and a possible future structural split (protocol vs. append-only log) was proposed, not built, pending explicit go-ahead.

**Writing that lesson surfaced a real gap in how lessons themselves are surfaced.** Victor asked, after the fact, whether a new lesson file just got dropped with no surrounding context — a fair question, since `config/lessons/*.json` had until now been genuinely two-tiered: the JSON file itself (always current, 7 files), and a hand-authored "decision-N" specimen card in `pages/specimen-architectural-wisdoms.html` (only 4 of 7 lessons have one — that page stopped being updated after Session 011, consistent with it being separately tracked as blocked). Neither surface fed into `pages/ecosystem-hub.html`, the one dashboard meant to answer "what does this system currently know" — a lesson was discoverable by grep or by an already-stale specimen page, but not connected to the generated read side at all. This is the same shape of gap `lib/auto-discover-nodes.js` closed for `pages/` earlier this session: written content on disk with no path into the artifact that's supposed to make it visible.

**Closed with a new compiled artifact, not a hand-authored specimen card.** `lib/build-lessons.js` compiles every `config/lessons/*.json` file into `data/lessons.json` (normalizing both schema generations — `sessions: [...]` and the older `session`/`pr` singular fields — into one array), and `lib/build-ecosystem-hub.js` fetches it into a new "Lessons Learned" section, styled without the health-panel's zero/problem badge semantics since a lesson is closed knowledge, not an open item. While wiring this into `.github/workflows/build-index.yml`, found that `lib/build-status.js` and `lib/build-ecosystem-hub.js` themselves had been generated and committed by hand every session with no CI step ever calling them — an unenforced manual ritual, now fixed alongside the new script.

### Files created or modified (continued)

| File | What changed |
|---|---|
| `config/lessons/procedure-and-record-need-separate-mutability-rules.json` | New — the protocol-vs-record mutability lesson |
| `lib/build-lessons.js` | New — compiles `config/lessons/*.json` into `data/lessons.json` |
| `lib/build-ecosystem-hub.js` | New "Lessons Learned" section (`renderLessons`); header comment corrected (was still describing five notice categories) |
| `.github/workflows/build-index.yml` | Added `lib/build-lessons.js`, `lib/build-status.js`, `lib/build-ecosystem-hub.js` as real CI steps — previously generated by hand every session with no automated regeneration |
| `docs/lattice-map.json` | New `lib/build-lessons.js` node; `lib/build-status.js`/`lib/build-ecosystem-hub.js` context corrected to reflect CI wiring instead of "regenerate manually" |
| `docs/architecture/08-continuity.md` | Noted `data/lessons.json`/Ecosystem Hub as the lesson archive's discoverability path, distinct from (and not replacing) "not cold-start reading" |
| `docs/continuity/INDEX.md` | Open Work: flagged the 3-lesson backlog on `specimen-architectural-wisdoms.html`'s decision cards as optional now that the Hub covers discoverability |
| `tests/17-build-lessons.test.js` | New, 10 tests |
| `tests/12-ecosystem-hub.test.js` | 2 new assertions for the Lessons Learned section |

### Mistakes made (continued)

- Wrote the `procedure-and-record-need-separate-mutability-rules.json` lesson file directly from a compacted conversation summary without re-reading `docs/culture.md` or re-verifying current repo state first — the exact "read before writing" principle culture.md itself states. The lesson's content held up once actually checked against the live files, but the process that produced it skipped a step it shouldn't have.
- Surveyed only one half of the lesson-archive convention (the JSON files) before calling the work done, missing that a second, partially-abandoned display surface (`pages/specimen-architectural-wisdoms.html`) already existed — found only because Victor asked directly where prior lessons were surfaced.

### Open work at session end

- [ ] `pe-010`, `pe-011` — both deferred, tracked
- [ ] od-001, od-002, od-003, od-006, od-007 remain open
- [ ] Whether/how to structurally split `pages/witness-committee-operations.html` into a revisable protocol/template part and a separate append-only test-log part — proposed, not approved
- [ ] `pages/specimen-architectural-wisdoms.html`'s decision-card backlog (3 lessons since Session 011) — optional now that `data/lessons.json`/Ecosystem Hub covers discoverability, not a hard gap

### State of the system at session end

Seven PRs total this session (#40–#47). A real values disagreement about a governance document's mutability was worked through in actual dialogue — pushed back on, refined, and resolved into a written lesson rather than either an unreviewed edit or a suppressed concern. Writing that lesson surfaced a second, independent gap (the lesson archive itself wasn't reaching the Ecosystem Hub), closed the same session with a new compiled artifact rather than deferred. Two previously-manual build steps (`build-status.js`, `build-ecosystem-hub.js`) are now real CI steps instead of an unenforced per-session ritual. 266/266 tests passing, lattice drift 0.

### Session continued — resolving a standing v1/v2 uncertainty before building arc-insertion automation

**Victor floated a genuinely new feature: declare a page's intended arc via a JSON/meta-tag, let a build step insert it into the right position automatically** — the same pattern already working for department/workType. Before scoping it, he raised something neither party had full recall of: does `data/arcs.json` (still fetched live by the Squarespace site) have any dependency on `data/arcs-v2.json` (the v2 build source), such that arc-insertion tooling built for v2 could break the live v1 site?

**Traced rather than assumed.** Grepped every actual consumer of both files: `data/arcs.json` is read only by `lib/vextreme.js`, `lib/archive-renderer.js`, `lib/arc-nav.js` (v1's runtime fetch path) — no `lib/build-*.js` file ever touches it, and vice versa. Diffing every arc's slug set between the two files programmatically found zero drift on any explicit-order arc (only `full_timeline` differs, expectedly — chronological in v2, hand-listed in v1) — the two files have been kept in hand-authored parity, not by any mechanism. Also found a real, small bug along the way: `lib/build-archives.js`'s `ARC_KEY_MAP` comment claimed `arcs.json` uses kebab-case keys; it doesn't — both arcs files use snake_case, and kebab-case is only the i18n string-key naming convention. Fixed.

**Resolved, not deferred: Victor confirmed v1 receives no new content going forward,** so the theoretical drift risk (new v2-only arc edits silently diverging from v1) doesn't apply in practice. Recorded as a lesson rather than built as a parity check — the honest amount of engineering for a risk that's been explicitly retired, not hedged against with unnecessary CI. This directly unblocks building `vex:arcs`-style arc-insertion tooling against `data/arcs-v2.json` alone.

### Files created or modified (continued)

| File | What changed |
|---|---|
| `lib/build-archives.js` | Fixed the stale `ARC_KEY_MAP` comment (arcs.json is snake_case, not kebab-case) |
| `docs/architecture/03-data.md` | New "v1 vs v2" section — the full traced relationship, so it doesn't need re-deriving |
| `config/lessons/v1-arcs-json-is-frozen-not-a-sync-target.json` | New lesson |
| `docs/lattice-map.json` | `lib/build-archives.js` context updated with the fix + pointer to the doc/lesson |
| `docs/continuity/INDEX.md` | Current State updated to reflect the confirmed-frozen v1 relationship |

### Session continued — building the arc-insertion mechanism itself, and two bugs it surfaced by being run for real

**With v1/v2 resolved, Victor asked for the actual foundation: a generic "declare an intent, let a build script fulfill it" mechanism** — not just for arcs, framed as queueable "gesture commands" (his term) so future placement work becomes "input a JSON of what you want to put where," not hand-editing `pages/*.html` and `data/arcs-v2.json` directly. Scoped to one gesture (`place`: department/workType/arc) rather than a full command grammar, extending the existing `vex:department`/`vex:workType` meta-tag pattern rather than inventing a parallel system. Built `config/content-intents.json` (the declared-intent queue) + `lib/apply-content-intents.js` (the applier): each pending intent upserts meta tags on the target page and, if `arcKey` is set, places the slug into that arc's one auto-managed section in `arcs-v2.json` — removing it from any other arc's auto section first, so re-declaring a placement moves it rather than duplicating it (the "self-awareness of its own prior mappings" Victor asked for). Never touches a hand-curated section — arc curation stays a human act. After applying, it shells out to `lib/build-index.js` (the real duplicate-slug BLOCK gate) and reports `lib/check-key-alignment.js`'s output as the sanity check.

**Two real bugs found by actually running it against real content, not by reasoning about the code in advance — the same pattern this repo's history keeps proving out.** First: `pages/about-me.html` and `pages/connect.html` (two of the actual pilot candidates) have no `<head>` tag at all — they're Squarespace paste-block fragments, not full HTML documents. `upsertMetaTag`'s original `</head>`-anchored insert silently no-op'd on them; fixed to prepend the tag at the top of the file when no `</head>` exists, since `lib/auto-discover-nodes.js`'s `parsePageMeta()` is a plain regex over the whole file, not a DOM query — the tag never needed real head placement to work. Second, more significant: applying a test intent with an invented department (`institute`, not yet registered) succeeded silently and `build-index.js` reported `departments: 3` — but `lib/build-ecosystem-hub.js`'s `renderDepartments()` only ever iterates `departmentMeta`'s *registered* keys, never `departmentMap`'s. That content would exist in `data/index.json` forever and render on the Ecosystem Hub *never*, with zero error anywhere. Added `validateIntent()`: rejects any intent whose `department` isn't in `data/departments.json` or whose `arcKey` isn't a real arc, before anything is written; a rejected intent stays `status:"pending"` and the run exits non-zero rather than partially applying.

**Verified end-to-end against real files three times** (dry-run, a full write+rebuild+sanity-check pass with a valid intent, and a rejected-intent pass), each time reverting the repo to clean before committing anything — no real page or arc placement was actually changed this session; the pilot decision (`about-me`/`connect` vs. `bridge-council`/`org-blueprint`) stays open for Victor to declare as real intents once decided.

### Files created or modified (continued)

| File | What changed |
|---|---|
| `config/content-intents.json` | New — the declared-intent queue, starts empty |
| `lib/apply-content-intents.js` | New — applies pending intents, validates before writing, runs the sanity-check pipeline |
| `docs/architecture/03-data.md` | "Content-placement intents" section |
| `docs/lattice-map.json` | New `lib/apply-content-intents.js` node |
| `tests/18-apply-content-intents.test.js` | New, 18 tests |

### Mistakes made (continued)

- First version of `upsertMetaTag` assumed every `pages/*.html` file has a real `<head>` — wrong for at least 2 of the real pilot candidates, caught by running it against them rather than assuming HTML structure.
- First version shipped with zero validation that a declared department/arcKey actually exists — caught by watching `build-index.js`'s own output (`departments: 3`, one more than the registry has) rather than by inspecting the code in advance.

### Open work at session end

- [ ] Pilot page-sorting decision still open: `about-me`/`connect` (department-only, no arc) vs. `bridge-council`/`org-blueprint` (ambiguous arc fit) — the mechanism to apply either is now built and verified, but no real intents have been declared yet for any of the 19 uncurated pages
- [ ] `pe-010`, `pe-011`, od-001/002/003/006/007 remain open

### Session continued — naming the long-term shape before building the next piece of it

**Victor pushed the conversation from "what's the next script" to "what's the actual long-term direction, and does a new instance reading CLAUDE.md know it exists."** After agreeing `lib/check-lattice-edges.js` (verifying the lattice map's claimed edges against real code) was the right next increment, he redirected: build the *design* first — a durable artifact a cold-start instance can read and "perceive the pattern without fear," not just a backlog ticket.

**Wrote `docs/architecture/13-intent-driven-operations.md`** — names the five-step loop every tool built this session is one instance of (perceive via the map → fetch/synthesize a compiled artifact → judge, the one step that stays genuinely AI work → declare intent as structured data → verify mechanically), maps what's concretely built today against each stage, and is explicit about the boundary between "decided, about to build" (pe-012, the lattice-edge checker) and "named but intentionally not designed" (od-008, staged/proposal execution for higher-blast-radius gestures like duplicate-content consolidation) — using the same "don't design against zero real cases" reasoning already applied to od-003/od-007, so the bigger vision doesn't get treated as a spec ready to implement.

**The core discipline named in that doc, worth restating here since it's the thing that keeps this whole direction honest:** the interface layer (map, compiled artifacts, intent scripts) is only trustworthy to the extent it's actually checked, not merely written — growing what the AI can declare-and-trust must be paired with growing what's mechanically verified, or the interface becomes a bigger, more convincing version of the staleness problem this repo has already hit three times.

### Files created or modified (continued)

| File | What changed |
|---|---|
| `docs/architecture/13-intent-driven-operations.md` | New — the loop, what's built, pe-012 (decided next), od-008 (intentionally open) |
| `data/status/planned-enhancements.json` | `pe-012` — `lib/check-lattice-edges.js`, not yet built |
| `data/status/open-discussions.json` | `od-008` — staged execution for consolidation/deletion gestures, intentionally undesigned |
| `docs/continuity/INDEX.md` | Current State points to the new doc; Open Work lists pe-012/od-008 |

### Open work at session end (continued)

- [ ] pe-012 — `lib/check-lattice-edges.js`, scoped and decided, not yet built
- [ ] od-008 — intentionally not designed; blocked on pe-012 and on a real consolidation case existing
- [ ] Pilot page-sorting decision (unchanged from above)
- [ ] `pe-010`, `pe-011`, od-001/002/003/006/007 remain open

### Session continued — a real merge conflict became a concrete example of the self-healing-system idea

**Victor screenshotted a live merge conflict on PR #50** (`data/status.json`) as an example of what he meant by "the system using its own intent system to address itself without AI involvement." Traced the actual cause rather than reaching for the already-known merge-driver workaround: `lib/build-status.js` stamped a wall-clock timestamp and a git commit SHA into `_meta` on every run, so two branches independently regenerating the file from *identical* underlying content still produced two different files — the branch's own regenerated copy and main's post-merge auto-rebuild commit, conflicting on metadata neither the Ecosystem Hub nor anything else actually reads. Confirmed via grep before touching anything: zero consumers of `_meta.generated`/`_meta.commit` anywhere in the codebase.

**Resolved the live PR #50 conflict directly** (merged `origin/main`, regenerated `data/status.json` fresh rather than hand-picking a side, ran the full pipeline, pushed) — then fixed the actual cause: removed both fields from `buildStatusRollup` entirely, along with the now-unnecessary `execSync('git rev-parse ...')` call. Verified concretely, not just by reasoning: ran `build-status.js` twice in a row and diffed the output — byte-identical. Checked whether the same problem existed elsewhere first (`data/index.json`'s `builtAt`, `sw.js`'s commit-based cache-bust name) — both are genuinely consumed (a user-facing "last built" display, and cache invalidation that specifically needs to change per commit), a different tradeoff, correctly left untouched.

**Recorded as a lesson** (`config/lessons/generated-artifacts-must-be-content-deterministic.json`) rather than just a code fix, since the principle generalizes: any future generated artifact should default to content-determinism (identical input → byte-identical output), and a field that breaks that needs to earn its place by being genuinely read by something, not just be conventional decoration.

### Files created or modified (continued)

| File | What changed |
|---|---|
| `lib/build-status.js` | Removed `_meta.generated`/`_meta.commit` and the `execSync` git shell-out; header comment explains why |
| `tests/10-build-status.test.js` | Asserts the fields are absent; new determinism test (identical input → byte-identical output) |
| `config/lessons/generated-artifacts-must-be-content-deterministic.json` | New lesson |
| `docs/lattice-map.json` | `lib/build-status.js` context + changeMap updated |

### Open work at session end (continued)

- [ ] pe-012, od-008, pilot page-sorting decision — unchanged from above
- [ ] `pe-010`, `pe-011`, od-001/002/003/006/007 remain open

### Session continued — a token-economics clarification, recorded as a lesson

**Victor asked a genuine technical question about the session's own workflow:** does pushing a declared intent through GitHub Actions and waiting for a webhook cost fewer tokens than verifying locally before committing, on the assumption that GitHub Actions' compute is free to Claude while local tool calls burn tokens. A related question followed: whether relying on more pre-built "blueprint" functions instead of "recalculating with assumptions" would help.

**Corrected the framing rather than accepting it, since it wasn't quite right:** token cost tracks what comes back into context, not where the computation physically ran — a terse local summary and a compact CI status object cost about the same; a verbose CI job log (the thing you'd fetch to debug a failure) typically costs more than either. The real cost driver is iteration count on failure: catching a mistake locally is one cheap round; catching it via CI-as-first-check is a full push-wait-notify-investigate-fix-push cycle. Separately: this instance already defaults to calling existing deterministic functions (lib/build-*.js's exports, applyIntent/validateIntent, checkKeyAlignment) rather than re-deriving logic through reasoning — mechanical work already runs at near-zero token cost regardless of local-vs-CI, so cost is already concentrated on the one thing that can't be delegated to a function: semantic judgment.

**Recorded as a lesson** (`config/lessons/token-cost-is-output-volume-not-execution-location.json`) rather than left as a one-off answer, since the distinction (mechanical cost vs. judgment cost, output volume vs. execution location) is a standing one a future instance would otherwise have to re-derive if asked a similarly-framed cost-optimization question.

### Files created or modified (continued)

| File | What changed |
|---|---|
| `config/lessons/token-cost-is-output-volume-not-execution-location.json` | New lesson |

<!-- [VXG RealForever] -->
