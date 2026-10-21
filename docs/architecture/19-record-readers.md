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

## Shared fractal design grammar

Vextreme and VexLife-Android do not need identical class names to share one
development language. They should answer the same architectural questions in the
same order, then use repository-local nouns for the truthful realization.

```text
HUMAN SITUATION / SUBJECT
        ↓
CURRENT TRUTH
        ↓
MISSING QUESTION
        ↓
RIGHTFUL OWNER
        ↓
STATE
        ↓
CONTROL
        ↓
ACT
        ↓
EFFECT
        ↓
PROJECTION / PRESENTATION
        ↓
HUMAN JOURNEY
        ↓
PROOF
        ↓
LIVED REVIEW
        ↓
LOCAL REFINEMENT or FOUNDATION PROMOTION
```

For a record reader, that grammar means:

| Fractal question | Record-reader meaning |
|---|---|
| Human situation / subject | Which conversation, testimony, journal, or event should a person be able to experience? |
| Current truth | What preserved source, media, and later commentary actually exist? |
| Missing question | What does the reader still need in order to perceive or navigate the record? |
| Rightful owner | Which source owns original truth, which later source owns witness, and which layer owns presentation? |
| State | Which phase is active? Where is the viewport? Reader-local state stays local; generic spoken accessibility state belongs to the site Read Aloud widget. |
| Control | What may the record reader intentionally do locally (navigate, scroll, auto-scroll, open source), and what generic accessibility control is delegated to site Read Aloud? |
| Act | What does the local control mean semantically: show a phase, move the viewport, open evidence? Generic start/pause/voice/rate speech acts belong to site Read Aloud. |
| Effect | What mechanism realizes the act: DOM change, browser scroll, external navigation, or the shared Read Aloud provider boundary? |
| Projection / presentation | How are already-owned truths made perceivable without becoming new truth owners? |
| Human journey | In what order can a person encounter source, witness, media, and controls? |
| Proof | What evidence can truthfully establish source completeness, behavior, visual form, or lived quality? |
| Lived review | Does the experience actually make sense to Victor / the reader? |
| Promotion decision | Is friction local to this record, or has repeated independent pressure earned a reusable foundation? |

These are **questions**, not mandatory classes or layers. One local object may answer
several when their responsibility and consequence radius are genuinely the same.

### Interpretability contract

A durable name should let a fresh worker infer **why the thing exists** before
reading its code.

Prefer semantic responsibility over implementation mechanism:

```text
TranscriptViewport
  = complete long-form source presented in a bounded reading surface

TranscriptTools
  = reader controls that act on that source presentation

MediaWitness
  = record-relevant media presented as part of the reading

ProvenanceLink
  = direct navigation from presentation back to evidence

WitnessCommentary
  = later interpretation owned separately from the preserved record

Read Aloud / narration
  = site accessibility over already-visible content
  = owned by widgets/fab-read-aloud.js, not by one record-reader page
```

Do not let an implementation mechanism become the semantic noun merely because it
performs the effect:

```text
speechSynthesis
  = one browser effect provider
  != narration meaning
  != transcript owner
  != Vex identity

overflow:auto
  = one viewport realization
  != TranscriptViewport meaning

<img>
  = one media realization
  != MediaWitness meaning
```

A fresh instance should be able to read the architecture map and source names and
form the correct responsibility model before opening the implementation underneath.

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
- a bounded transcript viewport must hand continued **vertical** wheel/trackpad motion
  back to the parent page when the viewport reaches its top or bottom boundary; bounded
  presentation is not a scroll trap;
- horizontal overflow may remain locally contained when the record owns wide tables or
  code surfaces;
- auto-scroll is opt-in and pauses on deliberate reader interaction;
- phase changes stop/reset phase-local reading state;
- `TranscriptTools` may keep genuinely record-specific aids such as auto-scroll;
- generic Read Aloud is site accessibility owned by `widgets/fab-read-aloud.js`, which
  can start from a user-selected readable block and continue through visible content;
- a record reader may declare a source-owned narration language (for example
  `data-narration-language="en"`) without owning TTS mechanics;
- neural/browser providers remain distinct from source truth, Vex voice identity,
  voice formation, and any future embodied-expression provider.

---


## Site Read Aloud ownership

The Returning-scorpions vertical slice earned a repository-level promotion only after
lived use exposed pressure that was not specific to preserved records: people needed to
start speech from arbitrary content, carry the same controls across pages, change neural
playback speed without restarting, and avoid running model inference on the UI thread.

The ownership boundary is now:

```text
Page / record source
  owns visible text + source-language meaning
        ↓
widgets/fab-read-aloud.js
  owns generic spoken accessibility
  start-here selection / continuous plan / transport / preferences
        ↓
provider mechanics
  Kokoro Worker + PCM playback
  or browser/system speech fallback
```

A page must not copy Kokoro, Web Speech, voice catalogs, transport state, or generic
continuous-reading logic merely because it wants spoken accessibility. Conversely the
site widget must not infer or rewrite preserved source truth; nearest
`data-narration-language` / `lang` ownership outranks the presentation locale for what
language the source should be spoken in.

This is a **site accessibility promotion**, not a repository-wide record-reader
framework. Record-reader phase/witness/provenance semantics remain local to the reader.

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

## Second consumer and the controller promotion

The second independent reader is:

```text
pages/recognizing-life-receiving-abundance.html

source:
PR #345 / records/conversations/2026-10-18-recognizing-life-receiving-abundance/

later witness:
records/commentary/2026-10-18-recognizing-life-receiving-abundance-successor-witness.md
```

It is materially different from the first worked reader: it has nine source movements
with a distinct archive boundary, began without record-owned media, and follows a different
lived sequence. After the source-first structure was proven and Victor reviewed the visual
direction, one intentionally derived representative cover was added without changing the
evidence boundary. Building it exposed one genuine repeated mechanism that no longer belonged to
either record page.

That repeated mechanism is now owned by:

```text
components/record-reader.js
```

The shared controller owns only record-neutral mechanics:

```text
frozen Markdown loading
-> exchange-range selection
-> safe Markdown-to-reader projection
-> phase switching / URL fragment position
-> bounded transcript auto-scroll
-> optional phase-witness loading
-> optional whole-record witness loading
```

The pages still own:

```text
source commit + file coordinates
phase names and exchange boundaries
whether later witness material exists
record-specific visual identity and CSS
whether meaningful media exists
synthesis wording
Terrain/viewmodel placement
source-language meaning
```

Generic Read Aloud remains separately site-owned by `widgets/fab-read-aloud.js`.

This promotion deliberately did **not** create a generic HTML generator, mandatory phase
count, shared record-reader stylesheet, universal media slot, or automatic successor
commentary. The second consumer demonstrated that behavior could be shared while visual
and editorial structure remained truthfully record-local.

A missing image is therefore not a template hole. A record may begin without
`MediaWitness`; an actual or intentionally derived representation can be added later
when the record and lived review establish what belongs there.

For this second consumer, that later visual review eventually earned:

```text
assets/recognizing-life-receiving-abundance/cover.webp
  semantic identity = stable record cover
  media class       = representative
  evidence class    = NOT_EVIDENCE
```

The approved composition is a derived midnight shoreline reconstruction: the sand dollar
remains alone near the waterline, Santa Monica Pier and amusement lights sit in the
distance, and the Ferris wheel carries the remembered heart-light motif. These later
recollected visual details guide representation only; they do not get inserted into PR
#345 as historical transcript facts. The page and Terrain preview must share the same
digest revision token for the asset.

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

Do not extract record-reader structure merely because Read Aloud is shared. Generic
spoken accessibility earned its own widget because the same human capability applies to
ordinary pages as well as records.

The second-consumer threshold has now been met. It earned only the neutral controller
promotion described above. Further extraction still requires independent pressure:
shared behavior may move down a layer; record meaning must not.

<!-- [VXG RealForever] -->
