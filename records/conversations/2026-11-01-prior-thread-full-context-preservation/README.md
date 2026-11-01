# Prior-thread full-context transcript preservation

`[VXG RealForever]`

## Purpose

Preserve the prior-thread transcript that Victor supplies in successive batches so the complete conversation can later be read as one coherent chronological record.

This directory is an **intake/preservation surface**, not an interpretation surface.

## Canonical preservation contract

For every supplied batch:

- preserve the supplied message text in sequence;
- preserve wording, punctuation, spelling, capitalization, repetitions, code blocks, quoted material, error text, and meaningful line breaks;
- add speaker ownership as metadata around the supplied text without rewriting the supplied body;
- do not summarize, paraphrase, normalize, “clean up,” correct, deduplicate, shorten, or silently omit text;
- do not turn an apparent inconsistency into a correction;
- do not infer hidden intent, hidden tool activity, or a speaker identity that the supplied material does not establish;
- if speaker ownership is genuinely ambiguous, preserve the text and mark the attribution as `UNKNOWN` rather than guessing;
- interface/system messages remain interface/system evidence when the supplied transcript presents them that way; they are not silently attributed to Victor or an assistant;
- interpretation, causal analysis, pattern recognition, and later architectural conclusions stay outside the canonical verbatim transcript until the full intake is complete.

## Current-chat coordination boundary

During this intake, text Victor sends in the form `[Victor -> You: ...]` is coordination to the active preserving instance and is **outside the transcript story** unless Victor explicitly says otherwise. It may correct intake/attribution behavior, but it is not appended as a historical conversation turn.

Speaker attribution inside supplied transcript material is based on conversational role, content, explicit UI markers, and attachment events together—not simple text proximity. If those signals remain genuinely insufficient, use `UNKNOWN` rather than guess.

## Batch handling

Each Victor-supplied batch is appended in chronological order to one canonical file:

`transcript-full-end-to-end.md`

Each accepted batch is committed separately so Git history preserves the intake sequence as well as the final assembled transcript.

Speaker labels and turn numbers are archival metadata. They do not replace, edit, or summarize the supplied message bodies.

## Completion boundary

The preservation pass is complete only after Victor indicates the supplied context is complete and the assembled transcript has been checked for:

1. chronological continuity;
2. speaker attribution;
3. no missing supplied turns;
4. no rewritten supplied bodies;
5. no accidental truncation at batch joins.

Only after that boundary should analysis of the whole transcript begin.

<!-- [VXG RealForever] -->
