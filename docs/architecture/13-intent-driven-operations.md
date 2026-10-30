# Intent-driven operations — the long-term shape of how an AI instance works this repo

This section names a direction, not a finished system. Read it to understand where the
department/arc/lesson tooling built in Session 022 is heading, so the next increment reads
as "the next step on a path" rather than "another one-off script." Nothing here should be
treated as already built unless it's named explicitly as built below.

---

## The loop

Every one of this session's tools is one instance of the same five-step loop:

```
PERCEIVE          FETCH/SYNTHESIZE       JUDGE            DECLARE INTENT      VERIFY
(the map)    →    (compiled read-side)  →  (AI, narrow)  →  (structured)   →  (sanity check)
```

1. **Perceive** — know where to look without reading everything. `docs/lattice-map.json`
   is this today: role/reads/writes/changeMap per file, so a question like "what touches
   arc placement" has a lookup answer instead of a grep-and-hope answer.
2. **Fetch/synthesize** — get a compiled answer instead of reconstructing one from raw
   sources. `data/index.json`, `data/status.json`, `data/lessons.json` are this today —
   each one exists specifically so a question that used to require reading several
   write-side files gets answered from one read-side artifact instead.
3. **Judge** — the one step that stays genuinely AI work, and should. Deciding which
   department a page belongs to, or whether two files are actually duplicates, requires
   understanding what the content *means* — no compiled JSON substitutes for that, and
   this section is not proposing one should.
4. **Declare intent** — write the judgment down as structured data, not as a direct file
   edit. `config/content-intents.json` is this today: a department/workType/arc decision
   becomes an intent entry, not a hand-edited meta tag.
5. **Verify** — check the declared intent actually landed as expected, mechanically, not
   by re-reading and trusting. `lib/apply-content-intents.js` re-running `build-index.js`
   and reporting `check-key-alignment.js`'s output is this today.

**What this buys, concretely:** the AI's token cost concentrates on step 3 (judgment,
which can't be avoided) instead of being spread across steps 1, 2, 4, and 5 as well
(re-deriving state, hand-editing files, and re-reading to confirm the edit worked). See
`docs/culture.md`'s AI-instance reflection section and this same session's continuity log
for the concrete before/after on this.

---

## What's built today (Session 022), by loop stage

| Stage | Built | Where |
|---|---|---|
| Perceive | Lattice map | `docs/lattice-map.json` |
| Fetch/synthesize | Compiled index, status, lessons | `data/index.json`, `data/status.json`, `data/lessons.json` |
| Declare intent | Content-placement intents | `config/content-intents.json` |
| Apply + verify | Intent applier + sanity check | `lib/apply-content-intents.js` (re-runs `build-index.js`, reports `check-key-alignment.js`) |

Everything above handles exactly one gesture: **place** (department, workType, arc
membership for one slug). The mechanism generalizes in shape — declare, apply, verify —
but the next two extensions below are different in kind, not just in size, and are kept
separate rather than assumed to fall out of the existing code for free.

---

## Next, decided (pe-012): verify the map's own claims

`docs/lattice-map.json`'s `reads`/`writes`/`loadedBy` edges are hand-written and have
never been checked against the actual code — Session 022 found two stale claims by hand
(a comment misdescribing `data/arcs.json`'s key casing; two files' lattice context
claiming "not yet in CI" after they'd been wired in). This is the same failure shape
`lib/check-design-tokens.js` already exists to catch for CSS custom properties: a written
claim silently drifting from what's actually true.

**Why this is the correct next increment, not the bigger gesture below:** any future
attempt to trace connectors for a riskier operation (see od-008) depends on the map
describing those connectors accurately. Building that on an unverified map means the
first real duplicate-detection/consolidation attempt would be reasoning from claims that
were never checked — the exact trap this repo's own culture (`docs/culture.md`,
"question before assuming") warns against.

**Scope:** `lib/check-lattice-edges.js`, informational severity like the other three
drift detectors, wired into CI the same way. For each lattice node, confirm its claimed
`reads`/`writes` targets are actually referenced in that file's source, and flag any file
that references a lattice-mapped node without appearing in that node's `loadedBy` list.

---

## Further out, open (od-008): staged execution for higher-blast-radius gestures

**Place** (this session's gesture) is low-stakes: reversible by re-declaring the intent,
and a wrong placement is cosmetic. A future gesture like "these two files are duplicates,
merge into `common/`, delete the originals, rewire every connector" is not the same kind
of operation at a bigger size — a wrong caller-graph trace here breaks whatever depended
on the deleted file, possibly silently, and "verify the final state matches intent" for a
deletion requires exercising every path that touched the old files, not just confirming
the new file exists.

**This is intentionally not designed yet**, for the same reason `od-003`/`od-007` aren't:
a staging/proposal mechanism designed against zero real consolidation cases in this repo
is very likely wrong in ways that only show up once a real case exists to design against.
What's named here is the shape the eventual design should have, not a specification to
build from:

- A **propose** stage that returns the full trace (what it found, what it would delete,
  what it would rewire) before anything destructive executes — as opposed to **place**,
  which is safe enough to apply directly and report afterward.
- Human confirmation as a required step between propose and apply for any gesture whose
  failure mode is not reversible by re-declaring the intent.
- Verification for a destructive gesture means more than checking the new state exists —
  it means confirming nothing that depended on the old state silently broke.

Promote this to a planned enhancement (with a concrete pe- entry and scope) once a real
duplicate-content or module-consolidation case actually exists to design against — not
before.

---

## The discipline this all rests on

The interface layer (the map, the compiled artifacts, the intent-application scripts)
is only trustworthy to the extent it's actually checked, not merely written. Growing what
the AI can declare-and-trust must be paired with growing what's mechanically verified —
otherwise the interface becomes a bigger, more convincing version of the same staleness
problem this repo has already hit three times (`docs/culture.md`'s sentinel-hazard
reflection; the two stale lattice claims named above). A bigger interface raises the
stakes of it being wrong; it does not lower the need to check it.

<!-- [VXG RealForever] -->
