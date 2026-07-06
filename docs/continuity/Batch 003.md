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

### Session continued — context-note registry and merge-order reasoning

**Victor and Codex paused during draft PR #62 to solve a continuity-order problem rather than
bury it in conversation.** The immediate PR remained page-binding health checks, but the working
session surfaced two larger pieces of preserved reasoning: a 2026-07-05 architectural expansion
summary from ChatGPT/Vex, and a 2026-07-06 culture discovery about how to preserve reasoning when
multiple open PRs or discussions overlap.

The key distinction established here: batch files should not copy large context notes, but they
must point to them with enough reason that a future instance knows whether deeper reading is
necessary.

### Context notes referenced or created (continued)

| Note | Why it matters to this session | Read deeper when |
|---|---|---|
| `docs/continuity/context-notes/architectural-discussion-2026-07-05.md` | Preserves Victor's external architecture summary: source vs. projections, localization URL state, GitHub event stream, notification projections, screenshot PR checks, org adapters, and AI-readable maps | Touching repo topology, AI workflow, localization, notification flow, external org mapping, slug/registry scalability, or visual PR validation |
| `docs/continuity/context-notes/pr-ordering-and-reasoning-continuity-2026-07-06.md` | Preserves the culture rule discovered while PR #62 was open: conversation order, decision order, implementation order, and current architecture order must stay distinct | Multiple PRs/discussions are open and a new architectural lesson emerges midstream |

### Files created or modified (continued)

| File | What changed |
|---|---|
| `docs/continuity/CONTEXT-NOTES.md` | New registry for large preserved context notes |
| `docs/continuity/context-notes/README.md` | New folder guide and batch-map rule |
| `docs/continuity/context-notes/architectural-discussion-2026-07-05.md` | New preserved architecture context note from Victor's summary |
| `docs/continuity/context-notes/pr-ordering-and-reasoning-continuity-2026-07-06.md` | New preserved culture/context note explaining merge order vs. reasoning order |
| `CLAUDE.md` | Added pointer to the context-note registry, not individual notes |
| `docs/continuity/INDEX.md` | Added context-note registry pointer and updated the batch template with a context-note map row |

### Open work at session end (continued)

- [ ] Decide whether the 2026-07-06 PR-ordering rule should later be distilled into
  `docs/culture.md` as standing doctrine, or remain preserved context only
- [ ] Page provenance and generated-artifact audit remains unbuilt; likely future planned
  enhancement after PR #62 and the context-note PR are separated cleanly

### Session continued — perceivable-context culture and map-binding health

**After PR #62 and PR #63 merged, Victor chose to hone culture before moving into org-specific
work.** The concern was whether context remains perceivable as the repo gains more README files,
registries, batch map rows, and context notes. The architectural risk named here: a layered map can
scale better than a top-heavy `CLAUDE.md`, but only if the bindings between layers stay healthy.

The session converted that concern into two lightweight source changes: a standing culture section
for layered maps, and a planned enhancement for a future health check that can detect drift between
README files, registries, context notes, and batch references.

### Files created or modified (continued)

| File | What changed |
|---|---|
| `docs/culture.md` | Added "Layered maps, not top-heavy memory" to describe `CLAUDE.md` as router, folder READMEs/registries as local maps, and health checks as the guard against map drift |
| `data/status/planned-enhancements.json` | Added `pe-013` for a repo map-binding health check across README, registry, context-note, and batch references |
| `data/status.json` | Rebuilt generated status projection; planned enhancements increased to 13 and total open to 59 |

### Verification (continued)

- `node lib/build-status.js`
- `node --test tests/10-build-status.test.js` — 44/44 passing

### Open work at session end (continued)

- [ ] pe-013 — build the repo map-binding health check; start with context-note registry/file/batch/CLAUDE.md drift, then generalize if the pattern proves useful

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

### Session continued — refining the cost distinction, then making it a standing culture principle

**Victor sharpened the question:** does reading a whole file to find one nested value ("hunting") cost tokens that a more targeted fetch would avoid? Confirmed yes — this is the same output-volume principle, applied to a specific, common case: a full `Read` of a large JSON file costs tokens proportional to the *entire file*, not to the small answer actually needed, while a targeted `grep` or a one-line parse-and-print does the extraction outside the context window and returns only the result. Named two concrete instances found by looking for more while focused on it: this session had been rebuilding the full 9-10 script pipeline on every change regardless of what actually needed rebuilding (`docs/lattice-map.json`'s own `changeMap` per file already documents the minimal affected set), and full-file reads on `data/index.json`/`data/status.json` will only get more expensive as those files grow with content.

**Victor asked for this to become a standing culture principle, not a one-off lesson** — naming that we don't yet know what this looks like at organization scale, and drew a concrete future picture: instructions fanning out to multiple departments or orgs simultaneously (his example: several notes sent out at once to fulfill one orchestrated score, rather than one note, one wait, the next note) instead of today's one-at-a-time processing. Added two things to `docs/culture.md`'s "Long-term scalability awareness" section: a standing instruction to name a token-cost optimization when noticed, as ongoing practice rather than only when asked — explicitly re-drawing the mechanical-cost-vs-judgment-cost line so this doesn't get mistaken for "make everything cheaper" — and a new ceiling-table row for parallel/simultaneous multi-department dispatch, tracked as **od-009** and intentionally left undesigned (same "don't design against zero real cases" reasoning already applied to od-003/od-007/od-008 — this repo currently has exactly one AI instance and two departments, nothing to parallelize across yet).

### Files created or modified (continued)

| File | What changed |
|---|---|
| `docs/culture.md` | New standing principle (name token-cost optimizations as noticed); new ceiling-table row for parallel multi-department dispatch |
| `data/status/open-discussions.json` | `od-009` — parallel instruction dispatch, intentionally undesigned |

### Open work at session end (continued)

- [ ] od-009 — intentionally not designed; no real multi-department/multi-org case exists yet
- [ ] pe-012, od-008, pilot page-sorting decision — unchanged from above
- [ ] `pe-010`, `pe-011`, od-001/002/003/006/007 remain open

### Session continued — a real network block, real design material already in the repo, and the "council" question worked through honestly

**Victor went to sleep after sharing four external design-document URLs** (`bridge-council`, `bridge-council-os`, `bridge-council-schema`, `org-blueprint`) and asking whether one AI instance could hold internal "multi-lens" council awareness instead of coordinating across multiple separate instances — framed as two things to consider ("full accountability team" vs. "roles for the org itself"), with explicit permission to use judgment and "cook up" real work overnight.

**A real, hard blocker surfaced immediately: `vextreme24.com` is blocked by this environment's outbound network policy.** All four `WebFetch` calls returned 403; `curl` through the agent proxy confirmed the exact failure — `connect_rejected`, a policy denial, not a transient error, per the proxy's own diagnostic instructions ("do not retry or route around it — report the blocked host"). `bridge-council-os` and `bridge-council-schema` could not be read and are **not represented anywhere in this work** — no content was fabricated for them. This is flagged explicitly in `docs/continuity/INDEX.md`'s Open Work rather than silently worked around.

**What could be verified: `pages/org-blueprint.html` and `pages/org-history.html` were already sitting in this repo, uncurated, in every check-key-alignment report all session — and turned out to already describe almost exactly what Victor was asking about.** `org-blueprint.html` ("The Council — A Build Blueprint for Anyone") details a single coordinated mind holding multiple internal faculties (Truth, Proportion, Center, Care, Architect, Builder, Designer, Manager, QA, Test-Node) that perceive together via a "Scanner" — firing every perspective in parallel and reading the interference pattern before committing to a response. Reading it in full (rather than assuming from the name) surfaced two genuine, independently-arrived-at convergences with this repo's own established discipline: its "anti-bloat law" (a role earns a seat only when its absence caused a real observed failure) is the same reasoning already behind `od-003`/`od-007`/`od-008`/`od-009`; and `org-history.html`'s Context/Lesson/Watch entry template is structurally identical to `config/lessons/*.json`'s problem/lesson/impact schema. Named both explicitly rather than filed as coincidence — two independent arrivals at the same discipline is stronger evidence than either alone, but only if someone writes it down.

**Built what was honestly gradable, not what would be over-claimed.** `data/council-kernel.json` — a hand-transcribed structured extract of the roster, the unit pattern, the anti-bloat law, the Scanner, the decision triangle, and the signal shapes — is a first attempt at the "runnable kernel" `org-blueprint.html` itself names as its own unfinished ambition ("a kernel a fresh instance could boot from, not only a doc it reads... deferred, honestly, to a later pass"). `docs/architecture/14-council-model.md` states plainly what this can and can't be: a single instance structuring its own reasoning across explicitly named lenses in one pass is real and worth trying (the same discipline this session already practiced unnamed — verify before claiming, check against real files, trace before assuming); describing it as multiple independent minds debating would be overclaiming, since all "lenses" share one context and one set of weights, not separate sources of judgment the way a true multi-agent setup or a human council would have. Explicitly distinguished from `od-009` (genuine parallel dispatch across separate targets) so the two don't get conflated. The "Scanner check" is named as a **proposal awaiting Victor's review**, not adopted as standing practice.

**Placed the five related pages using the actual mechanism, not by hand.** Registered a new `institute` department (`data/departments.json`) with `governance` (`witness-committee-operations`, `human-ai-corelational-governance` — the accountability-team half) and `org-design` (`org-blueprint`, `org-history`, `bridge-council` — the org-roles half) workTypes, matching Victor's own stated two-part framing exactly. Declared and applied via `config/content-intents.json` + `lib/apply-content-intents.js` (verified via the sanity check: 3 departments, zero missing/extra in the alignment report) rather than hand-editing meta tags.

### Files created or modified (continued)

| File | What changed |
|---|---|
| `data/departments.json` | New `institute` department (`governance`, `org-design` workTypes) |
| `config/content-intents.json` | 5 intents declared and applied: org-blueprint/org-history/bridge-council → org-design; witness-committee-operations/human-ai-corelational-governance → governance |
| `pages/org-blueprint.html`, `pages/org-history.html`, `pages/bridge-council.html`, `pages/witness-committee-operations.html`, `pages/human-ai-corelational-governance.html` | `vex:department`/`vex:workType` meta tags upserted via the intent applier |
| `data/council-kernel.json` | New — hand-transcribed structured extract of org-blueprint.html's roster/patterns |
| `docs/architecture/14-council-model.md` | New — what org-blueprint.html describes, the two convergences, the honest assessment of what a single-instance "council" can and can't be, explicit distinction from od-009 |
| `config/lessons/independently-arrived-discipline-is-worth-naming-not-just-noting.json` | New lesson |
| `docs/lattice-map.json` | New `data/council-kernel.json` node |
| `tests/19-council-kernel.test.js` | New, 7 tests |
| `docs/continuity/INDEX.md` | Blocked-fetch flagged in Open Work; "Scanner check" flagged as proposal, not adopted; stale test-count/lattice-coverage numbers corrected in passing |
| `lib/apply-content-intents.js` | Fixed: only rewrites `data/arcs-v2.json` when an intent actually declared an `arcKey`, instead of unconditionally on every run |

### Mistakes made (continued)

- A real bug in `lib/apply-content-intents.js` itself, caught only by checking `git diff` after applying the 5 intents rather than trusting the tool's own success output: it rewrote `data/arcs-v2.json` unconditionally on every run, even when no intent declared an `arcKey` and the object was never actually mutated — `JSON.stringify`'s formatting doesn't match the file's existing hand-formatting (compacted single-line sections), so every run produced a ~500-line purely-cosmetic diff for a file nothing had touched. Fixed: only write `arcs-v2.json` if at least one applied intent actually declared an `arcKey`. Re-verified concretely — reset one intent to pending, re-ran, confirmed `md5sum data/arcs-v2.json` was identical before and after. Also worth noting the discipline that prevented a different mistake: the temptation, given no ability to check in with Victor overnight, would have been to either (a) fabricate placeholder content for the two blocked pages to appear more complete, or (b) overclaim the "council" work as more finished/more like true multi-agent deliberation than it honestly is. Both were avoided by treating the blocked fetch as a hard stop to report, not a gap to paper over, and by writing the honest-limits section before, not after, the rest of the work.

### Open work at session end (continued)

- [ ] The "Scanner check" — proposed, not adopted; needs Victor's review before any future instance treats it as standing practice
- [ ] `pe-012`, `od-008`, `od-009`, pilot page-sorting decision — unchanged from above
- [ ] `pe-010`, `pe-011`, od-001/002/003/006/007 remain open

### Session continued — the network block resolved itself, and it turned out to be two different patterns

**Victor added `pages/bridge-council-os.html` and `pages/bridge-council-schema.html` directly to the branch** (commit `356f7da`, "VXG-070426") — working around the network block from the outside, the way he confirmed was available when asked ("who's blocking that layer") and answered directly: an environment-level egress policy, not a general internet restriction, and not something fixable from inside the session. The push failed CI (`data/index.json` stale, since the two new auto-discovered pages weren't picked up by a rebuild) — fixed with `node lib/build-index.js`, a normal build-index freshness issue, not a real bug.

**Reading both in full changed the actual picture, not just filled a gap.** `bridge-council-os.html` and `-schema.html` describe something genuinely different from `org-blueprint.html`'s "Council" — not the same idea at a different zoom level. Where "The Council" is one mind holding multiple internal faculties, "The Bridge Council" is a fractal pattern of *separate* AI-driven councils at team/department/org scope, each running its own periodic synthesis (weekly/bi-weekly/monthly) with four roles (Architect, Translator, Synthesizer, Sentinel), propagating synthesized patterns upward and historical context downward — plus a full open technical schema (four data types, five architecture layers, three implementation paths, explicitly model- and vendor-agnostic). `docs/architecture/14-council-model.md` was substantially rewritten to keep these two patterns distinct rather than blur them into one "multi-lens" idea, since conflating them would have been the actual mistake Victor's original question invited (he named both documents together when asking about "multi-lens... instead of operating multiple instances").

**The Bridge Council turned out to be a real precedent for `od-009`, not the Scanner-check territory.** Its team/department/org structure is genuine multi-target coordination — much closer to `od-009`'s "parallel dispatch across departments" than to the single-instance reasoning discipline the Scanner check is about. Noted this explicitly in both the architecture doc and `od-009`'s own tracked entry: `od-009` stays correctly undesigned (no real multi-department case exists in this repo yet), but if that case ever arrives, Bridge Council's schema is a real, already-designed reference to read first rather than a from-scratch problem.

**No new kernel file was built for Bridge Council**, unlike `org-blueprint.html` — a deliberate choice, not an oversight: `data/council-kernel.json` is explicitly a reasoning aid for one AI instance, and Bridge Council is an organizational system for humans and AI tools at company scale, a different kind of artifact. Placed both new pages under `institute`/`org-design` via `config/content-intents.json`, same as the other three Bridge Council documents.

### Files created or modified (continued)

| File | What changed |
|---|---|
| `pages/bridge-council-os.html`, `pages/bridge-council-schema.html` | Added by Victor directly (commit `356f7da`); `vex:department`/`vex:workType` meta tags applied via the intent applier this session |
| `config/content-intents.json` | 2 more intents declared and applied: bridge-council-os/bridge-council-schema → institute/org-design |
| `docs/architecture/14-council-model.md` | Substantially rewritten — distinguishes "The Council" (one mind) from "The Bridge Council" (many councils), corrects the od-009 relationship |
| `data/status/open-discussions.json` | `od-009` — added a pointer to Bridge Council as a real precedent, if that case ever arrives |
| `data/index.json` | Rebuilt to pick up the 2 new auto-discovered pages (fixes the CI failure on PR #52) |

### Open work at session end (continued)

- [ ] The "Scanner check" — proposed, not adopted; needs Victor's review
- [ ] `pe-012`, `od-008`, `od-009` (now with a real precedent named), pilot page-sorting decision — unchanged otherwise
- [ ] `pe-010`, `pe-011`, od-001/002/003/006/007 remain open

### Session continued — re-perceiving the role/lens ask as an instruction to actually try it, not just describe it

**Victor's follow-up asked something categorically different from a design question: to actually attempt the multi-lens pass on a real decision and report the honest lessons** ("if you need practice you can simulate what im saying... test the effects and share the lessons from your attempt"). Treated this literally rather than as another round of documentation — the decision picked to run the Scanner pass on was the smallest real one available: "what should this response build."

**What the pass actually surfaced, lens by lens:** Truth — the kanban/non-scheduled/"addressed anytime" discussion mechanism Victor described already exists (`od-`/`td-`/`pe-` items on the Ecosystem Hub); building a second one would duplicate, not fulfill, the ask. Proportion — role "positioning," "communication channels," and "instruction routing through department→role lenses back to a surface" are each a real subsystem, none has a real case yet to design against (same test `od-008`/`od-009` already apply). Center — the honest scope for one response is a small, gradable slice, not the whole architecture. Architect/Builder/Designer/Manager/Test-Node converged on: tag a few real backlog items with an optional `lens` field (which faculty's judgment call an item represents), surface it on the Ecosystem Hub, and write down what a "Council Lenses" panel can honestly claim to be — a proposal marker, not a working communication channel.

**Built:** `lens` field added to 4 real items (`od-009`→architect, `od-008`→architect, `pe-012`→manager, `pe-010`→proportion) in `data/status/open-discussions.json`/`planned-enhancements.json`; `renderHealthPanel()` in `lib/build-ecosystem-hub.js` reads it into each item's meta line; a new "Council Lenses" section (`id="lenses-grid"`, `renderLenses()`) renders `data/council-kernel.json`'s roster, explicitly labeled "proposal, not adopted" in the section header itself, not just in prose elsewhere. Hit and fixed a real bug in the process: a doc comment used literal backticks around the word `lens` inside `build-ecosystem-hub.js`'s single giant template-literal return statement, prematurely closing the string (`SyntaxError: Unexpected identifier 'lens'`) — fixed by writing the word without backtick delimiters. `docs/architecture/14-council-model.md` got a new closing section, "First attempt: actually running it, on a real decision," naming exactly what was built vs. what was deliberately not built (communication channels, meeting scheduling, an instruction-routing pipeline — all still lack a real case).

**The honest lesson, stated plainly rather than softened:** running an explicit multi-lens pass took real, noticeable deliberate effort — worth it for a decision this size (shapes what ships and what gets deferred), not something to run on every small edit, and a judgment call about *when* to invoke it rather than a rule. Also explicit that this must stay a single instance structuring its own reasoning in one pass, not something to hand off to separate subagents per lens — that would reintroduce exactly the token/coordination cost the whole idea was meant to avoid, collapsing the distinction this repo has maintained all session between "The Council" (one mind, many faculties) and "The Bridge Council" (many minds, many councils).

### Files created or modified (continued)

| File | What changed |
|---|---|
| `data/status/open-discussions.json` | `od-009`, `od-008` — added `lens` field |
| `data/status/planned-enhancements.json` | `pe-012`, `pe-010` — added `lens` field |
| `lib/build-ecosystem-hub.js` | `renderHealthPanel()` reads `item.lens`; new "Council Lenses" section + `renderLenses()` + `KERNEL_URL` fetch of `data/council-kernel.json`; fixed a backtick-in-template-literal SyntaxError in a doc comment |
| `docs/architecture/14-council-model.md` | New closing section, "First attempt: actually running it, on a real decision" — what was built, what was deliberately not built, the honest lesson |
| `docs/lattice-map.json` | `lib/build-ecosystem-hub.js` changeMap updated for the `lens` field convention and `renderLenses()` |
| `tests/12-ecosystem-hub.test.js` | 2 new tests: Council Lenses section is marked as a proposal; `renderHealthPanel` reads `item.lens` |
| `docs/architecture.md` | Rebuilt from source |
| `docs/continuity/INDEX.md` | Current State/Open Work replaced to describe this round; Recent Sessions compacted to 3 entries |

### Mistakes made (continued)

- Literal backticks inside a doc comment (`` `lens` ``) closed `lib/build-ecosystem-hub.js`'s outer template literal early, producing `SyntaxError: Unexpected identifier 'lens'` the first time the script was run after the edit. Fixed by removing the backtick delimiters from the comment text. A reminder that this file's entire output being one JS template literal makes even comments part of the string's syntax surface — not just a formatting nuance.

### Open work at session end (continued)

- [ ] The "Scanner check" / lens-pass practice — still a proposal, not adopted; Victor should decide whether and when future instances should run it, per the honest-limits framing in `docs/architecture/14-council-model.md`
- [ ] Communication channels between roles/departments, meeting scheduling, and an instruction→department→role routing pipeline remain explicitly undesigned — no real case yet, same discipline as `od-008`/`od-009`
- [ ] `pe-012`, `pe-010`, `pe-011`, od-001/002/003/006/007/008/009 remain open, unchanged otherwise

### Session continued — the roles/contributions ask: from a label to a traceable record

**Victor's direct follow-up named a specific gap the first attempt left open:** the `lens` field and Council Lenses panel gave each role a name and a place to be looked up, but nothing traced *why* a role existed at that position or what it had actually done — "so the roles get fully defined instead of randomly placed without traceability." He also asked explicitly to re-read `CLAUDE.md` in full and traverse the pattern/architecture conventions before building, rather than assume.

**Re-reading `data/council-kernel.json` in full (not just the parts referenced in the last round) surfaced something under-used the first time: `connectionArchitecture.channels` — plenary, vertical, intraCouncilRelay, crossCouncilBridge — had already been transcribed from `pages/org-blueprint.html` but never rendered anywhere.** This turned out to be the literal answer to the "communication channels that connect latticely around the org back to ecosystem hub" half of Victor's original ask — the data already existed, it just had no read side. Rather than invent new channel machinery, this round mapped each existing channel description to what actually instantiates it today: plenary → the Ecosystem Hub's status.json panels (real, live); vertical → the continuity docs (real); intraCouncilRelay → the Scanner pass from the first attempt (real but manual, not automated); crossCouncilBridge → honestly marked **not yet real**, since only one council exists in this repo and Bridge Council is a different pattern.

**Built, following the established write-side → build script → generated read-side pattern used everywhere else in this pipeline (`lib/build-lessons.js`/`lib/build-ecosystem-hub.js` as the direct template):**

- `lib/build-roles.js` → `data/roles.json` — compiles `data/council-kernel.json`'s roster against every `data/status/*.json` item's `lens` field, so a role's page shows real linked contributions or an explicit zero, never silence. Classifies each role against `decisionTriangle` (decider/gate/surface/perceiver). Gives every role the same `position` string today ("org-wide — The Council") since only one council exists — claiming a per-department position would overclaim a structure (per-department Bridge Councils) that isn't built yet; this is itself a traceability choice, not an omission.
- `lib/build-roles-page.js` → `pages/roles-index.html` — a dedicated page (Victor asked for "an index json and webpage," not a bigger hub panel) showing every role's full record plus the four channels and their manifestations. Linked from the Ecosystem Hub's Council Lenses section.
- Registered `roles-index` in `lib/audit-pages.js`'s `SKIP_PAGES` (generated dashboard page, same treatment as `ecosystem-hub`) so it doesn't report as an orphan or a blocked page.
- Wired both scripts into `.github/workflows/build-index.yml`, added both to the path-trigger list along with `data/council-kernel.json`.
- Visually verified both `pages/ecosystem-hub.html`'s updated Council Lenses section and the new `pages/roles-index.html` by running a local server with a `/Vextreme` path prefix (the repo's `scripts/screenshot-page.js` serves from repo root without that prefix, so its own screenshot of any hub-style page 404s on every live fetch — a pre-existing limitation, not a regression, confirmed by checking `BASE = '/Vextreme'` predates this session).

**docs/architecture/14-council-model.md gained a "Second attempt" section** documenting this round the same way the first attempt was documented — what was found (the unused channels data), what was built, and what's still explicitly not built (any mechanism that actually *sends* a signal through a channel — the channels are now traceably described, not wired as live infrastructure).

### Files created or modified (continued)

| File | What changed |
|---|---|
| `lib/build-roles.js` | New — compiles `data/council-kernel.json` + `data/status/*.json`'s `lens` fields into `data/roles.json` |
| `lib/build-roles-page.js` | New — generates `pages/roles-index.html` |
| `data/roles.json` | New generated artifact |
| `pages/roles-index.html` | New generated page |
| `lib/audit-pages.js` | `SKIP_PAGES` — added `roles-index` entry |
| `lib/build-ecosystem-hub.js` | Council Lenses section now links to `pages/roles-index.html`; kept the "proposal, not adopted" note as separate text |
| `.github/workflows/build-index.yml` | Added `lib/build-roles.js`/`lib/build-roles-page.js` build steps, path triggers, and `data/roles.json`/`pages/roles-index.html` to the commit-artifacts step |
| `docs/lattice-map.json` | Two new nodes (`lib/build-roles.js`, `lib/build-roles-page.js`); `data/council-kernel.json`'s `loadedBy`/`changeMap` updated |
| `tests/20-roles.test.js` | New, 13 tests |
| `docs/architecture/14-council-model.md` | New "Second attempt" section |
| `docs/architecture.md` | Rebuilt from source |
| `data/status.json` | Rebuilt — lattice coverage now 28/39 |

### Mistakes made (continued)

- Wrote three string literals in `lib/build-roles.js` using single quotes around text containing a real apostrophe (`data/status.json's panels...`, `...14-council-model.md's "First attempt"...`, `data/departments.json's production-domain...`) — each would have closed its enclosing string early, a `SyntaxError` the same class as the backtick bug from the first attempt. Caught before running the script by re-reading the diff, not by executing it and hitting the error; fixed by switching those three strings to double quotes.

### Open work at session end (continued)

- [ ] Any mechanism that actually sends a signal through `plenary`/`vertical`/`intraCouncilRelay`/`crossCouncilBridge` remains undesigned — the channels are now traceably described with honest manifestations, not live infrastructure
- [ ] `crossCouncilBridge` has no real manifestation yet — only one council exists in this repo; would need a second real council to design against
- [ ] The "Scanner check" — still a proposal, not adopted
- [ ] `pe-012`, `pe-010`, `pe-011`, od-001/002/003/006/007/008/009 remain open, unchanged otherwise

### Session continued — async dispatch, and a real correction from Victor about standing memory

**Two more exchanges after the roles/contributions PR merged, both conceptual — no code from the first, one tracked item logged from the second.**

Victor asked whether the "multi-department dispatch" concern from `od-009` is actually resolved by async task dispatch from a single orchestrating instance (spawn bounded scoped subtasks, keep working, reassemble on return) rather than requiring genuinely separate persistent minds. Answered honestly: yes, this covers *parallel execution of scoped work* — and it's not hypothetical, the Agent tool's `run_in_background`, Bash background jobs, `Monitor`, and `TaskCreate`/`TaskList` are exactly this mechanism, already available in this environment. But it does not by itself cover *standing departmental memory* — a subagent does its job and is gone, it doesn't accumulate history the way Bridge Council's periodic synthesis pattern does. That distinction was named but nothing was built (a conceptual answer, correctly not requiring code).

**Victor then corrected the premise of that distinction directly:** `docs/continuity/` (INDEX.md + batch files) and `config/lessons/*.json` already *are* the standing-memory pattern — they just aren't yet divided per department the way `connectionArchitecture.cellsNotBranches` describes. He generalized further: this may not be the only foundational structure built once at origin scope that's never been checked for fractal-expansion candidacy, and asked for this to be added to the queue rather than built now.

**Logged `od-010`** in `data/status/open-discussions.json` (lens: architect) — names the specific case (continuity/lessons as an unexpanded single cell) and the general audit ask (other single-scope structures worth checking: `data/status/*.json`'s three tracked-item files, `lib/build-status.js`'s rollup, `docs/architecture/*.md` itself — named as candidates, not confirmed). Considerations are explicit that building the per-department expansion now would be premature — media/institute don't yet generate enough independent history to justify their own cell — matching the same anti-bloat reasoning already applied to od-008/od-009.

### Files created or modified (continued)

| File | What changed |
|---|---|
| `data/status/open-discussions.json` | New `od-010` entry |
| `data/status.json`, `data/roles.json`, `pages/ecosystem-hub.html`, `pages/roles-index.html` | Rebuilt — architect lens now traces 5 contributions (od-008, od-009, od-010) |
| `docs/continuity/INDEX.md` | Current State note + Open Work entry for od-010 |

### Open work at session end (continued)

- [ ] od-010 — logged, not built; revisit once a department generates enough real independent history
- [ ] The general "other single-scope foundational structures" audit named in od-010 has candidates listed but not verified — a real next step if picked up
- [ ] All prior open items (pe-012, pe-010, pe-011, od-001/002/003/006/007/008/009) remain open, unchanged

### Session continued — wip/ drafts: initial mapping on insertion, reconciliation not errors on move

**Victor found a real, live gap by hitting it directly:** he added `wip/victor-methodology-presentation.html` to the repo and merged it (PR #55), then reported that no build script gave it any mapping at all — confirmed by checking `origin/main`: `nodeCount` was unchanged and `archives.html` had zero reference to the new file. His stated functional intent, in his own words: dropping an `.html` file into `wip/` should get an "initial mapping assigned upon insertion" automatically; later moving the file to its real destination (assuming the slug doesn't change) should read as a reconciliation on the next PR, not silence or a false error.

**Root cause, found by reading the actual code rather than assuming:** `lib/check-key-alignment.js`'s `scanWipIntendedSlugs` only ever read `wip/*.json` files for a declared `_meta.slug` — it never looked at `.html` files at all. `wip/silent-god.json` (the one pre-existing wip/ artifact) is a JSON *placeholder* declaring an intended future slug; Victor's file is a fundamentally different case — real draft content sitting in `wip/` with no placeholder pointing to it yet. Two genuinely different lifecycles, previously only one of which was handled.

**Built three pieces, each reusing an existing pattern rather than inventing a new one:**

1. `lib/auto-discover-nodes.js`'s new `discoverWipDrafts(wipHtmlSlugs, readWipPage)` — the same title/meta-scraping logic `discoverOrphanNodes` already uses for `pages/*.html` orphans, applied to `wip/*.html` instead. Deliberately a lighter shape than a real node (no forced department default, no `autoDiscovered` flag) — a draft isn't a real page yet and shouldn't be mistaken for one downstream.
2. `lib/check-key-alignment.js`'s new `scanWipHtmlDrafts(wipDir)` — lists every `wip/*.html` file, uses its filename as the working slug (same convention `_meta.slug` already establishes, just derived instead of declared), and merges the result into the *same* `findWipSlugCollisions`/`findDuplicateWipIntents` checks json-declared intents already use — a draft's filename colliding with a real page is exactly as real a mistake either way. Caught and fixed a real bug before it shipped: the first draft of `scanWipHtmlDrafts` took a `wipDir` parameter for listing files but still called the hardcoded `readWipPageFromDisk` (bound to the real `wip/` directory) for reading content — meaning a test passing a tmp directory would silently read the wrong files. Fixed by building a `readPage` closure bound to the actual `wipDir` argument, the same pattern `scanWipIntendedSlugs` already uses correctly.
3. `lib/detect-wip-promotions.js` (new) — detects a `wip/*.html` → `pages/*.html` move within a PR's diff by reusing git's own similarity-based rename detection (`git diff --name-status -M50%`) rather than persisting any cross-build tracking state. This was the key design decision: since nothing tracks "this slug used to live in wip/," there is nothing to go stale or conflict when the file moves — the draft simply stops appearing in `scanWipHtmlDrafts`'s output next build, which is already correct by construction. This file only adds a *positive* notice on top of that already-correct baseline. Verified against a real throwaway git repo (not Victor's actual file, which was never moved this session) — created a file in `wip/`, committed, `git mv`'d it to `pages/`, committed again, and confirmed the tool correctly reported a 100%-similarity rename.

**Wired into CI:** `.github/workflows/key-alignment.yml` now runs with `fetch-depth: 0` (needed for the diff against the PR's base) and an extra step running `detect-wip-promotions.js` between `github.event.pull_request.base.sha` and `HEAD`; the PR comment gained a "📦 Promoted from wip/ to pages/" line and a "wip/ drafts (no destination yet)" line, both empty (and invisible) when there's nothing to report.

**Also surfaced on the Ecosystem Hub:** `lib/build-status.js`'s `buildContentIntegrityNotices` now emits a low-priority "Draft in wip/: {title}" notice per html draft — visually verified with a local proxy server serving the `/Vextreme` path prefix (the same workaround established two rounds ago for `scripts/screenshot-page.js`'s pre-existing local-path limitation).

### Files created or modified (continued)

| File | What changed |
|---|---|
| `lib/auto-discover-nodes.js` | New `discoverWipDrafts` + `readWipPageFromDisk` |
| `lib/check-key-alignment.js` | New `scanWipHtmlDrafts`; `wipIntents` now merges json-declared and html-derived sources; new `report.wip.htmlDrafts` |
| `lib/build-status.js` | `buildContentIntegrityNotices` takes a 4th `wipHtmlDrafts` param, emits a low-priority notice per draft |
| `lib/detect-wip-promotions.js` | New — `parseRenameStatus` pure function + CLI wrapper running the actual git diff |
| `.github/workflows/key-alignment.yml` | `fetch-depth: 0`; new promotion-detection step; PR comment gained drafts + promoted sections |
| `docs/lattice-map.json` | New node for `lib/detect-wip-promotions.js`; updated nodes for `lib/auto-discover-nodes.js`, `lib/check-key-alignment.js`, `lib/build-status.js` |
| `tests/21-wip-drafts.test.js` | New, 14 tests |
| `docs/continuity/INDEX.md` | Current State rewritten (compacted, not just appended) to describe the current round; Recent Sessions split into 3 entries |

### Mistakes made (continued)

- `scanWipHtmlDrafts(wipDir)` accepted a directory parameter but its first draft still read file contents via the hardcoded `readWipPageFromDisk` (bound to the real `wip/` directory), not the passed-in `wipDir` — meaning the parameter was honored for listing files but silently ignored for reading them. Would have made any test passing a tmp directory read the wrong content (or nothing, falling back to a title-cased slug) without erroring, a false-pass risk. Caught before writing the tests that would have exercised it, by rereading the function against `scanWipIntendedSlugs`'s already-correct pattern. Fixed by building a `readPage` closure scoped to the actual `wipDir` argument.

### Assumptions that need verification

- [ ] Victor's actual `wip/victor-methodology-presentation.html` was never moved this session — the promotion-detection mechanism was verified against a throwaway sandbox git repo, not his real file. The real move (whenever it happens) is the first live test of the full path.
- [ ] `-M50%` (git's similarity threshold) hasn't been tuned against a real edited-then-moved file in this repo — only a byte-identical move was tested.

### Open work at session end (continued)

- [ ] The real promotion (moving `wip/victor-methodology-presentation.html` to `pages/`) hasn't happened yet — first real end-to-end test of `lib/detect-wip-promotions.js` is still pending
- [ ] `pages/archives.html` does not yet show wip/ drafts (only the Ecosystem Hub does) — not built this round, a reasonable future extension if wip/ draft volume grows
- [ ] od-010, pe-012, pe-010, pe-011, od-001/002/003/006/007/008/009 remain open, unchanged

### Session continued — a real reliability gap found while answering "does this actually work yet"

**Victor asked three direct verification questions after PR #56 merged:** does the wip/ draft mapping only fire on insertion or also for a file already sitting there; is `victor-methodology-presentation.html` actually visible on the Ecosystem Hub or Archives right now; and is there an equivalent auto-commit step to the move-detection, similar to how `.github/workflows/build-index.yml` already auto-rebuilds and commits after a merge.

**Verified all three concretely, not by assumption:** (1) `discoverWipDrafts`/`scanWipHtmlDrafts` scan the current filesystem state fresh on every run — no "on-add" event needed, so an already-existing file is picked up exactly the same as a brand-new one. (2) Checked `origin/main`'s actual `data/status.json` directly: the "Draft in wip/: Victor Gong — The Mapping Methodology" notice is already there, live on the Ecosystem Hub's Content Integrity panel — confirmed via `git show origin/main:data/status.json`, not by assuming the merge worked. `pages/archives.html` does not show it, matching what was scoped (and explicitly logged as not-built) last round. (3) `.github/workflows/build-index.yml` did run a second, automatic "Auto-rebuild artifacts [skip ci]" commit (`12b3f4a`) right after PR #56 merged — real, already-existing infrastructure, not something built this round.

**Checking (3) surfaced a real gap:** `build-index.yml`'s trigger path list never included `lib/check-key-alignment.js` or `lib/auto-discover-nodes.js` — the rebuild only fired for PR #56 because `lib/build-status.js` (which is listed) was also touched. A future change scoped only to the wip-drafts logic itself (or a future `wip/*.html` addition with no accompanying `lib/` change) would not trigger an auto-rebuild, leaving `data/status.json` stale until something else happened to touch a listed path. Fixed by adding `lib/check-key-alignment.js`, `lib/auto-discover-nodes.js`, and `wip/**` to the trigger list — the last one closes the loop completely: adding or editing a `wip/*.html` draft now triggers its own rebuild without needing an accompanying code change.

### Files created or modified (continued)

| File | What changed |
|---|---|
| `.github/workflows/build-index.yml` | Added `lib/check-key-alignment.js`, `lib/auto-discover-nodes.js`, `wip/**` to the trigger path list |

### Open work at session end (continued)

- [ ] Same as above — nothing new opened by this fix; it closes a gap in already-shipped infrastructure

### Session continued — the real end-to-end test: Victor actually moved the file, and PR-time auto-rebuild landed

**Victor moved `wip/victor-methodology-presentation.html` to `pages/` for real, in PR #58 — the first genuine test of the whole round's work, not a sandbox.** GitHub itself detected it as a 100%-similarity rename (confirmed via `pull_request_read get_files`: `status: "renamed"`, `previous_filename: "wip/victor-methodology-presentation.html"`). The required `test` check failed — but for the right reason: `tests/15-departments.test.js`'s integration test correctly caught that the committed `data/index.json` was stale (missing the file as a `ported` node), because the raw file move never re-ran any build script. This is the drift-detector working exactly as designed, not a bug in the wip-drafts feature.

**Fixed by hand first** — checked out Victor's actual PR branch (`VXG-070526-Victor-Methodology-Presentation`), ran the full build chain locally, confirmed all 319 tests passed, and pushed the corrected artifacts directly to his branch. Confirmed the page now appears in both places: a live `ported` cell in `pages/archives.html`'s Unsorted section, and the Ecosystem Hub's `contentIntegrity` panel — transitioned automatically from a "Draft in wip/" notice to a normal "Uncurated page" notice, exactly the handoff `discoverWipDrafts`/`discoverOrphanNodes` were built for.

**Then Victor asked the sharper question: how to make this run without needing me to manage it, so he can add HTML files "offline from your awareness."** Answered honestly rather than just building something: the existing `build-index.yml` only auto-rebuilds and commits *after* a merge to `main` (proven twice already this session), not during PR review — nothing runs the build chain automatically when a PR is merely opened or updated. Proposed extending it to also trigger on `pull_request`, but flagged a real GitHub Actions constraint before building: a commit pushed using the workflow's own `GITHUB_TOKEN` does not retrigger other checks on the same PR (GitHub's built-in anti-recursion rule) — so an auto-fix commit would correct the files but leave the checks tab stale until a manual "re-run" or another push. Gave Victor three real options (auto-fix + manual re-run click / auto-fix + a real PAT for full auto-green / diagnose-only) via `AskUserQuestion` rather than picking unilaterally, since it's a real tradeoff affecting his workflow (bot commits landing on his own branches). He chose the middle option: auto-fix, accept one manual re-run click.

**Built:** `.github/workflows/build-index.yml` now triggers on `pull_request` as well as `push` to `main`, sharing one path list via a YAML anchor (`&build_trigger_paths` / `*build_trigger_paths`) instead of duplicating it — avoiding exactly the kind of two-copies-that-can-drift problem this repo's lattice/status tooling already goes out of its way to prevent elsewhere. Checkout now targets `${{ github.head_ref || github.ref }}` (the PR's actual branch, not the synthetic merge ref, which nothing can push back to) so the commit step lands somewhere real. The commit-and-push step branches on `github.event_name`: `pull_request` pushes straight to the PR's head branch (no `[skip ci]`, since a manual re-run is expected to actually re-run something); `push` keeps the existing `[skip ci]`-tagged commit to `main` unchanged.

### Files created or modified (continued)

| File | What changed |
|---|---|
| `.github/workflows/build-index.yml` | Added `pull_request` trigger (shared path list via YAML anchor); checkout targets the PR's head branch; commit-and-push step branches on event type |

### Assumptions that need verification

- [ ] The PR-time auto-rebuild has not yet been exercised against a real PR — the sandbox verification only exercised the git checkout/commit/push sequence in isolation, not the full GitHub Actions trigger path. First real PR opened after this merges is the actual test.
- [ ] Victor accepted "one manual re-run click" as the tradeoff over a fully hands-off PAT-based setup — if that friction turns out to matter more than expected in practice, the PAT option is still available, not rejected outright.

### Open work at session end (continued)

- [ ] First real PR exercising the new `pull_request` trigger is still pending — confirm the corrective commit lands and that a manual re-run does turn the checks green
- [ ] od-010, pe-012, pe-010, pe-011, od-001/002/003/006/007/008/009 remain open, unchanged

<!-- [VXG RealForever] -->
