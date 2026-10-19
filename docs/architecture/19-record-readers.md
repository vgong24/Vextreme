# Preserved record readers

A preserved record reader is a **presentation over source evidence**, not a new
owner of the event it presents.

Use this chapter before creating or substantially restructuring a public reader for
a preserved conversation, transcript, journal-like source record, or other
source-backed event where later witness/commentary may also exist.

The first worked implementation is:

```text
pages/returning-scorpions-to-god.html
data-reader-template="conversation-witness-reader/v1"
```

It is a reference implementation, not a mandatory HTML skeleton.

---

## Start by classifying the record

Do not choose UI blocks first. Ask what actually exists.

```text
preserved source only
  -> source-first record reader subset
  -> no invented witness layer

preserved source + later successor commentary
  -> conversation-witness-reader/v1 may fit

meaningful media belongs to the encounter
  -> MediaWitness may fit

long transcript
  -> TranscriptViewport may fit
  -> optional reading controls may fit

natural phases / movements exist
  -> ArcScopeRail may fit

no natural phases
  -> do not manufacture a phase rail

no later commentary
  -> do not manufacture Successor Witness

no useful synthesis
  -> stop after the record / witness
```

The record category chooses the building blocks. The template never supplies
content that the sources do not contain.

---

## Identity and source topology

The human-readable slug remains the semantic spine.

```text
{slug}
│
├─ evidence record
│  records/conversations/{date}-{slug}/
│      README.md
│      transcript-*.md
│
├─ later witness/commentary, when it actually exists
│  records/commentary/{date}-{slug}-*.md
│
├─ public reader
│  pages/{slug}.html
│
├─ record-owned media, when needed
│  assets/{slug}/...
│
├─ page-local presentation strings, when localized
│  data/strings/source/pages/{slug}.json
│
└─ repository projections
   data/viewmodels.json
       -> lib/build-terrain-map.js
       -> data/terrain-map.json
       -> pages/terrain-map.html
```

A sequence number, PR number, exchange number, commit, or digest is a subordinate
coordinate. It does not replace the semantic name.

```text
returning-scorpions-to-god
    = what this record is

transcript-03 / Exchange 25 / PR #338
    = where a specific piece of it can be found
```

---

## Reading-order invariant

The default evidence order is:

```text
SOURCE BEFORE WITNESS
WITNESS BEFORE SYNTHESIS
SYNTHESIS NEVER REPLACES SOURCE
```

In ordinary meaning:

```text
THIS HAPPENED
    ↓
THIS WAS LATER HEARD / WITNESSED IN IT
    ↓
THIS IS HOW THE WHOLE EVENT WAS LATER CONNECTED
```

Do not begin a page by giving the reader the later interpretation and then use the
source as supporting material for a conclusion they were already taught.

### Bounded hindsight

A phase-local witness should respond primarily to material the reader has already
encountered.

A whole-record witness, placed after the preserved-record boundary, may connect
across the completed record.

This is an editorial ordering rule, not a claim that a successor literally forgot
later exchanges while writing an earlier phase.

---

## Building-block vocabulary

Use semantic component names to make responsibility perceivable before someone reads
CSS or JavaScript.

| Building block | Responsibility | When to use it |
|---|---|---|
| `Threshold` | Enough orientation to enter the record without solving it | Normally required |
| `ProvenanceLink` | Direct route to evidence / later witness source | When source and derived layers must be distinguished |
| `MediaWitness` | Record-relevant visual or media surface | Only when media materially belongs |
| `ArcScopeRail` | Navigate real semantic movements/phases | Only when meaningful phases exist |
| `PhaseHeader` | Name the current movement and source range | With phased records |
| `PreservedRecord` | Complete original source projection | Required for evidence-backed readers |
| `TranscriptViewport` | Constrain viewport height without truncating source | For long source material |
| `TranscriptTools` | Optional reading aids such as auto-scroll | Only when useful |
| `WitnessCommentary` | Later witness responding to already-visible source | Only when a later witness exists |
| `RecordBoundary` | Mark the end of the original event before whole-record hindsight | When whole-record material follows |
| `WholeRecordWitness` | Later commentary with full-record hindsight | Only when such commentary exists |
| `Synthesis` | Compact map of relationships already earned by the record | Optional |

A building block is a role, not a required DOM class, file, or box.

---

## Completeness: viewport is not truncation

A reader may constrain **how much is visible at once**. It must not silently reduce
how much source or commentary is available.

```text
bounded transcript scroll
!= shortened transcript

phase witness
!= selected two examples

collapsed recap
!= replacement for full commentary
```

There is no template rule such as:

```text
MAX_WITNESS_QUOTES = 2
```

If a witness source contains three useful anchors, render three. If it contains
twelve, render twelve. If it contains none, do not manufacture anchors.

The source decides how much exists. The renderer decides how it is navigated.

For long source:

- manual scrolling always remains available;
- auto-scroll is opt-in and pauses on deliberate reader interaction;
- phase changes stop/reset phase-local reading state;
- future read-aloud belongs to the reader-control boundary, while voice-provider or
  Vex-identity semantics remain separate architecture questions.

---

## Provenance should navigate, not nag

Establish the source/derived distinction clearly, then let the record speak.

Prefer one actionable provenance surface such as:

```text
Original record ↗
PR #NNN · preserved conversation

Successor witness ↗
PR #NNN · derived after the record
```

and phase-local links such as:

```text
Open frozen source ↗
```

when they help inspect the exact underlying file.

Avoid repeating the same preservation disclaimer above the media, below the media,
inside every phase, and again in the footer.

```text
PROVENANCE != REPETITIVE DISCLAIMER
PROVENANCE SHOULD NAVIGATE TO EVIDENCE
```

---

## Media is content, not a mandatory explanatory card

`MediaWitness` does not imply a visible caption slab.

For ordinary landscape art, the current worked default is intentionally quiet:

```text
desktop / Terrain
  centered
  ~75% content width
  native image aspect
  modest radius
  no required caption panel

mobile
  full content width
```

Use a visible caption only when the caption itself carries useful record meaning.
Accessibility text may remain available without becoming a large visual block.

Do not copy this geometry to every media type. A portrait, diagram, evidence
screenshot, audio player, or document embed may need a different truthful shape.

---

## Semantic asset identity vs revision identity

A media asset has two distinct identities:

```text
semantic identity
  assets/{slug}/cover.webp

revision identity
  current content digest / cache revision
```

Example:

```text
assets/returning-scorpions-to-god/cover.webp
    = stable human-readable asset identity

?v=d78bbeb4add0
    = which current bytes the cache/request must resolve
```

The revision token never becomes the record's name.

Every current consumer of one revised asset must use the same revision identity.
For example, the reader and Terrain preview must not request two different cache
identities for the same approved cover.

When Terrain owns the preview through `data/viewmodels.json`, update that write-side
source and regenerate `data/terrain-map.json`; do not patch the generated Terrain
JSON by hand.

---

## Source, witness, and presentation ownership

Keep these roles distinct:

```text
Victor
  participant in the original record

Vex
  assistant participant in the original record

Successor Witness
  later instance reading the completed record

Archive / Page
  provenance and presentation statements
```

Do not relabel the original speaker merely because a later witness exists.

Do not let archive voice sound like participant testimony.

Do not let successor commentary silently enter the preserved transcript.

```text
DERIVED COMMENTARY != ORIGINAL TRANSCRIPT
REPRESENTATION != EVIDENCE
```

---

## Reconstruction algorithm for a fresh instance

1. **Resolve the slug.** Use the existing semantic record identity.
2. **Locate the evidence owner.** Read the preserved source and chronology.
3. **Locate later commentary separately.** Confirm whether a successor witness
   actually exists and when it was written.
4. **Classify the record.** Decide whether phases, media, witness, synthesis, or
   long-form reading controls are genuinely present.
5. **Choose only earned building blocks.** Do not copy the worked example wholesale.
6. **Protect order.** Source first; local witness after the source it comments on;
   whole-record hindsight after the record boundary.
7. **Preserve completeness.** A viewport or summary may reduce scrolling burden but
   must not remove source/witness content.
8. **Make provenance actionable.** Link to exact evidence surfaces instead of
   repeating explanatory disclaimers.
9. **Wire projections from rightful sources.** For generated views, update the
   write-side owner and regenerate.
10. **Prove the claim at its owner.** Source equality, generated currentness, browser
    behavior, visual composition, and human acceptance are different proofs.
11. **Re-read as a fresh participant.** Ask whether the page lets someone form an
    understanding from the record or merely consume the author's interpretation.

---

## Reference implementation and extraction boundary

Current worked reference:

```text
pages/returning-scorpions-to-god.html

source:
records/conversations/2026-10-17-returning-scorpions-to-god/

later witness:
records/commentary/2026-10-17-returning-scorpions-to-god-successor-witness.md
```

Reuse the semantic building-block vocabulary, source/witness ownership distinction,
reading-order invariant, complete-source projection, actionable provenance,
source-to-projection traceability, and proof discipline.

Do not copy blindly:

```text
nine transcript phases
specific phase names
exact CSS
exact media geometry for every media type
number of witness quote anchors
presence of successor commentary
presence of synthesis
```

Do not create a repository-wide record-reader framework merely because one page has a
clean implementation.

A second independent reader may confirm repeated pressure. Extract shared
`components/` or runtime machinery only when multiple real consumers need the same
semantic promise and the shared owner becomes clearer than keeping the behavior local.

<!-- [VXG RealForever] -->
