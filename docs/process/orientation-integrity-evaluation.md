# Orientation Integrity evaluation and closeout

**Status:** technical scope implemented by Orientation Integrity `4/4`; pending
Victor's review, refinement, merge, and acceptance

## Evaluation contract

`config/orientation-integrity-evaluation.json` holds deterministic scenarios and
graph-wide invariants. `lib/evaluate-orientation-integrity.js` runs them against
the generated map graph and task-aware selector, then writes
`data/orientation-integrity-evaluation.json`.

Document-placement integrity is a separate but required closeout gate. See
`docs/process/document-routing.md`; `lib/check-document-routes.js` requires every
file under `docs/` to have exactly one route before the evaluation can pass its
required-artifact invariant and the inherited test suite can pass.

```bash
node lib/evaluate-orientation-integrity.js
node lib/evaluate-orientation-integrity.js --check
```

The committed suite covers:

| Question or risk | Required result |
|---|---|
| Fresh-instance onboarding | Cold-start and live-coordination baselines are sufficient and labeled routed. |
| Architecture source change | Accepted corpus and projection are selected; v1 history is not substituted. |
| Change-impact question | The lattice is selected through its exact question id. |
| Current PR/path ownership | Live work coordination remains in the packet. |
| Page navigation/FAB failure | Page-health source boundary and projection are selected. |
| Legacy Squarespace question | v1 history is selected and retains historical authority. |
| Unknown task language | The packet stays partial at the baseline and names the gap. |
| Private SDK language | Only the public boundary is selected; private state is not discovered. |
| Machine capability | Proposed environment evidence is selected without inferring worker availability. |
| Reusable regression knowledge | The lesson source and generated projection are selected. |

Global invariants also require every `docs/` file to have exactly one route,
every declared artifact to exist, every worker to
remain `availability: unknown`, every forward map edge to have its generated
reverse edge, every question route to resolve, every packet to remain within five
maps, and every registered/read path to stay repository-relative and outside the
private SDK boundary.

## Meaning of PASS

PASS means only that the authored deterministic contracts hold for the source
state under test. It does not mean:

- Victor reviewed or accepted any PR;
- a draft is ready to merge out of dependency order;
- a merge proves human acceptance;
- claims grant implementation authority;
- a registered worker is available;
- WinDex's SDK roadmap, capacity, or private state was inspected;
- every future orientation question is already represented.

## Work-window closeout

The bounded queue is dependency ordered:

```text
#130 row 0 — governing orientation/work-window contract
  -> #131 row 1 — architecture source/guide/projection parity
    -> #132 row 2 — map registry and generated reverse graph
      -> #133 row 3 — deterministic task-aware packets
        -> #134 row 4 — evaluation and technical closeout
```

All five claims use disjoint paths during the bootstrap. After #130 merges, the
remaining open claims can receive the shared unique `windowRef` and explicit
`stackedOn` lineage, then be retargeted as each predecessor merges. Victor may
review/comment in batches; requested changes should be applied to the owning row
and propagated forward before its descendants merge.

This closeout deliberately does not edit continuity, Session 034, the continuity
index, Covenant artifacts, or generated files claimed or touched by draft PR #128.
That reconciliation requires freshly accepted `main` plus the then-current open
work and must not be fabricated inside this epic.

The technical epic is complete only as an implementation statement. Human
acceptance remains pending until Victor explicitly reviews and clears the queue.

<!-- [VXG RealForever] -->
