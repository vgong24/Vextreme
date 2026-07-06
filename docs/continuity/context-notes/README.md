# Context Notes

<!-- [VXG RealForever] -->

This folder stores preserved architectural or operational discussions that are too large for
`CLAUDE.md`, too speculative for `docs/architecture*.md`, and not yet specific enough to become
active `od-`, `pe-`, or `td-` queue items.

Each note should preserve the original reasoning context while clearly stating its status:

- preserved context, not adopted architecture
- source and fidelity, such as full transcript, summary handoff, or session synthesis
- date added to the repo
- when future instances should read it
- how specific ideas graduate into executable architecture

## Narrative Context Criteria

Add a `## Narrative Context` section when the note records a lesson, culture shift, architecture
principle, or queue decision that emerged from a sequence of events rather than a single explicit
request.

That section should answer, briefly:

- What work or PR was already in motion?
- What confusion, failure, or question exposed the need?
- What files, generated outputs, checks, or workflow signals made the issue visible?
- What alternatives were considered or rejected?
- What rule, distinction, or future work emerged from the discussion?
- What should future instances understand before applying the rule?

Do not paste the whole conversation. Preserve the causal thread so the conclusion has a traceable
"why."

## Reviewer Lens

When reviewing a context-note PR, use these questions to position the review:

- Does this note preserve reasoning that future work could genuinely need?
- Is the note clearly marked as context, not accepted architecture or an implementation mandate?
- Does the narrative context explain what exposed the need, not just the conclusion?
- Is there a clear reading trigger so future instances know when to open the full note?
- Is the active batch entry a short map key rather than a duplicate of the note?
- Does the note avoid creating work unless a specific item is promoted into `data/status/*.json`,
  architecture docs, culture docs, or lessons?
- Would a future instance understand what changed in priority, decision pressure, or culture
  without rereading the original conversation?
- Is this better as a context note than as an `od-`, `pe-`, `td-`, architecture update, or lesson?

If the answer to the last question is no, ask for the note to be narrowed or converted into the
more precise repo structure.

## Health Check Candidates

The context-note layer should eventually be mechanically checked, not only reviewed by humans.
Good future checks include:

- every `docs/continuity/context-notes/*.md` file, except `README.md`, is listed in
  `docs/continuity/CONTEXT-NOTES.md`
- every listed context note points to a file that exists
- every context note created in a session has a short map row in the active batch history
- `CLAUDE.md` points to the registry, not directly to individual context notes
- context notes with actionable language have a conversion path into `data/status/*.json`,
  architecture docs, culture docs, or lessons

These checks would turn the registry into a binding system: files, index rows, and batch map rows
should stay connected as the repo grows.

Use `docs/continuity/CONTEXT-NOTES.md` as the index. Do not expect future instances to scan this
folder manually.

When a session creates or relies on a context note, the active batch entry should include a short
map row:

| Note | Why it matters to this session | Read deeper when |
|---|---|---|
| `docs/continuity/context-notes/example.md` | One-line reason this context affected the session | Specific trigger for deeper reading |

The batch row is the navigation key. The context note is the deeper archive. Do not copy the full
note into the batch file.

## Lifecycle

1. Preserve a discussion here when losing the reasoning would make future work weaker.
2. Revisit the note when a related implementation path becomes real.
3. Promote specific pieces into `data/status/*.json`, architecture docs, or lessons through a PR.
4. Let the completed PR/session become the executable batch-history record.

This keeps the original thought evolution available through git history while letting the current
architecture stay distilled and runnable.

<!-- [VXG RealForever] -->
