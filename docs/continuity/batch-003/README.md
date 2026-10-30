# VEXTREME — Continuity Batch 003 (Sessions 021–030)

[← Batch 002](../Batch%20002.md) · [Continuity index](../INDEX.md)

This is the first batch stored as a **directory of per-session files** instead of one
monolithic markdown file. Batches 001 and 002 remain single files (closed history — not
worth rewriting); every batch from here on uses this form.

## Why this form exists

Session 023's entries were accidentally injected into the middle of the old `Batch 003.md`
— anchored to a `<!-- [VXG RealForever] -->` marker as if it were an end-of-file sentinel —
which made the two newest sessions invisible to the "read the most recent session" cold-start
path. Per-session files close that failure mode structurally: logging a session is a **file
creation**, which has no insertion anchor to miss, and cannot disturb any closed record.

## Rules for this directory

- **One file per session**, named `YYYY-MM-DD-session-0NN.md` — the date prefix makes
  `ls` output chronological, so "the most recent session" is simply the last file listed
  (and time-based filtering needs no parsing, just filename comparison).
- **Never edit a prior session's file.** The append-only rule now has a physical shape:
  closed sessions are closed files. Continuations of the *current* session (same day, same
  thread) append `### Session continued` blocks inside that session's own file.
- Prefer `node lib/append-session-continuation.js <session-file.md> <continuation.md>` for
  same-session continuation blocks. The VXG marker is a completion boundary/signature, not
  an insertion anchor; the helper appends at EOF, preserves line endings, and ensures the
  continuation ends with the marker.
- Session files follow the template in `../INDEX.md` (metadata header, context on arrival,
  files changed, mistakes, assumptions, open work, end state).
- This README carries only local rules; current state, open work, and the batch registry
  live in `../INDEX.md`.
- When Session 030 closes, this batch is full: create `batch-004/` with its own README,
  update INDEX.md's registry, and start `batch-004/YYYY-MM-DD-session-031.md`.

## Sessions

The file listing is the index — no hand-maintained table to drift. Date-prefixed names
sort chronologically; read the highest-numbered session for the latest state.

<!-- [VXG RealForever] -->
