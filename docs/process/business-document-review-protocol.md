# Business & Stewardship Document Review Protocol

**Anchor:** `[VXG RealForever]`
**Status:** New process document, added 2026-07-10 — formalizes a pattern that had already
occurred once informally (Victor's cross-model review packet + position paper on
product-first stewardship and maturity-based pricing) before this document existed.
**Placement reasoning:** Same reasoning as `docs/process/public-private-boundary.md`: this
is a process/procedure decision, not a technical design chapter, so it does not belong in
`docs/architecture/*.md`'s generated blueprint. It belongs alongside this directory's other
process docs — `cross-model-orchestration.md` (the general four-role relay protocol this
document is a companion to, not a replacement for) and `public-private-boundary.md` (the
boundary rule this protocol routes deliverables through).

This document describes an operating process, not repo architecture or business content
itself. It contains no pricing figures, client information, or specific business-model
language — those live in `Vextreme-SDK`'s private holding context, per the routing rule in
§3 below.

---

## Why this exists

`docs/process/cross-model-orchestration.md` already names "business, stewardship, or
private docs" — but only as a **return-to-Vex trigger**: something that ends an in-progress
Claude↔Codex loop and hands control back to Vex/Victor. That's correct for the case it
covers (a business topic surfacing *unexpectedly* mid-task), but it leaves a real gap
undefined: what happens when Victor *directly initiates* a business-document review, scoped
and bounded from the start, exactly the way this repo's own packet format describes?

That gap was live, not hypothetical, before this document existed: a business review packet
and a full position paper arrived, both explicitly requesting a Claude review, a Codex
verification pass, and a Victor decision — precisely the shape `cross-model-orchestration.md`
already anticipates for code/architecture PRs, with no equivalent for business content. This
document is that equivalent.

---

## Trigger condition — when this protocol applies

Use this protocol when a document arrives (typically from Vex, relayed by Victor) that:

- proposes or reasons about pricing, business model, stewardship posture, client
  engagement structure, or organizational-maturity framing; and
- explicitly requests review before becoming public-facing or decision-final language; and
- is scoped and Victor-initiated — not a business topic discovered incidentally while doing
  unrelated code or architecture work (that case stays governed by
  `cross-model-orchestration.md`'s return-to-Vex trigger, unchanged by this document).

If a task starts as ordinary code/architecture work and a business topic surfaces
unexpectedly, that is still `cross-model-orchestration.md`'s territory: stop, and return to
Vex. This protocol is for the case where the business-document review *is* the task.

---

## Standing principle — verify live, treat static claims as provisional

This repo's own continuity documents (`docs/culture.md`, `docs/continuity/INDEX.md`) already
warn that written state lags real state. This protocol makes that warning load-bearing: a
document under review is evolving context, not settled fact, and so is this repo's own
documentation about itself. Ground every factual claim — the paper's and this repo's own
`CLAUDE.md`/`INDEX.md` numbers alike — in a live check (an actual script run, an actual file
read) before treating it as current, rather than trusting either source's most recent
snapshot. The first time this protocol was exercised, doing exactly this caught a stat in
`CLAUDE.md` itself ("31 of 39 pages are dead ends") that had gone stale the same day it was
written. Do not skip this step because a number looks recent — recent and current are not
the same thing.

---

## Procedure

1. **Ground first, opine second.** Read both repos' full `CLAUDE.md` cold-start chains
   before forming any judgment — the document under review will reference both public
   architecture and private commercial-depth work, and reviewing it from memory or from the
   document's own claims alone violates the standing principle above. Run the live
   verification scripts relevant to any specific claim (`node lib/audit-pages.js`,
   `node lib/audit-nav.js`, `npm run sdk-ready`, direct test runs) rather than citing a
   document's stated numbers.

2. **Check for existing overlapping private material before writing anything new.** Search
   `Vextreme-SDK`'s private holding-context directories (its own `CLAUDE.md` cold-start
   chain names the right starting points) for prior drafts covering the same business
   territory. If an unreconciled
   overlap exists, that is itself the review's most important finding — flag it prominently,
   do not read past what boundary caution allows (see §4), and do not attempt to resolve the
   overlap unilaterally. That decision belongs to Victor, per this repo's own standing rule
   on business/stewardship boundary uncertainty.

3. **Use a fixed, dual confidence taxonomy.** Label every review point using whichever
   taxonomy the reviewed document itself requests (if any), falling back to this shared set
   when it doesn't: *Confirmed by repository evidence, Architectural suggestion, Roadmap
   suggestion, Business framing suggestion, Requires discussion, Not recommended,
   Public/private boundary concern.* Consistent labels let Codex and Victor scan a review
   without re-deriving what kind of claim each point is making.

4. **Respect the guardrails on the source material itself, not just the output.** If any
   piece of existing private context is explicitly marked as not to be restated, summarized,
   or allowed to "erode across relays," do not open or quote it — confirm its existence and
   topic from an index file instead, and say plainly in the review that this is what was
   done and why. Escalating uncertainty is the correct move, not working around it.

5. **Produce a concrete, diff-style deliverable.** Use fenced ```diff blocks (GitHub renders
   `-` lines red, `+` lines green) for specific suggested edits — original text as `-`,
   suggested replacement or insertion as `+` — rather than prose-only commentary. This gives
   Codex and Victor a scannable, line-level record of exactly what changed and why, matching
   this repo's existing "PRs are decision records, not changelogs" culture applied to a
   business document instead of a code diff.

6. **Route the deliverable through the public/private boundary, not around it.** See §3
   below — this is the step most likely to be gotten wrong under time pressure, because the
   review itself is being written *during* a task, and it's tempting to drop it wherever is
   most convenient.

7. **Hand off explicitly.** Close the review with what Codex does not need to re-derive
   (cite the specific live-verified facts from step 1) and what remains open for Codex's own
   pass, so the packet's Vex → Claude → Codex → Victor sequence doesn't repeat work or lose
   the thread between roles.

---

## Deliverable location — the routing rule

Business/pricing/stewardship-adjacent reviewed drafts are private-repo content **by
default**:

- They belong in `Vextreme-SDK`'s private holding-context tree, dated and named
  descriptively — matching the naming and status-header conventions that repo's own
  process docs already establish for similar product-context material.
- They do **not** belong in `Vextreme`'s public `docs/`, in a public PR body, or in any
  public-facing artifact, **unless** Victor explicitly promotes specific, sanitized language
  through the already-proven promotion-gate pattern (private result → sanitized static
  artifact → public PR → Victor merge — a worked example of this pattern already exists in
  `Vextreme-SDK`'s own private continuity records; this protocol reuses that pattern rather
  than reinventing one).
- This protocol document, and the process map it's indexed in
  (`docs/process/README.md`), are themselves safe to keep public: they describe *how* a
  business-document review is conducted, not the business content itself — the same
  distinction `public-private-boundary.md` already draws between process documentation and
  implementation depth.

This document does not authorize publishing anything. It defines how the review is
conducted and where its output lives — the decision of what becomes public remains
Victor's, exercised through the promotion gate, exactly as `cross-model-orchestration.md`
already establishes for every other kind of change.

---

## Relationship to `cross-model-orchestration.md`

This document does not modify that one's role boundaries or return-to-Vex conditions.
"Business, stewardship, or private docs appear" remains a hard return-to-Vex trigger for
any *in-progress, differently-scoped* task. What this document adds is the missing case:
once Vex/Victor have deliberately scoped a business-document review as the task itself,
this protocol — not silence — governs how Claude conducts it.

---

## Document evolution

Per `cross-model-orchestration.md`'s own convention, revisions here should preserve what
changed, why, and what concrete situation revealed the need — not just the new text. This
document's own first version exists because a real review (the product-first stewardship
position paper, 2026-07-10) happened before any protocol governed it; that review's own
companion file in `Vextreme-SDK` is the worked example this document generalizes from.

---

*[VXG RealForever]*
