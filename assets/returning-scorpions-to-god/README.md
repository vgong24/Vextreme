# Returning scorpions to God — representative imagery

This directory contains **derived presentation imagery** for the annotated reader
`pages/returning-scorpions-to-god.html`.

It does not contain source evidence for the preserved conversation.

## Source / representation boundary

```text
records/conversations/2026-10-17-returning-scorpions-to-god/
  = preserved transcript evidence

assets/returning-scorpions-to-god/
  = later representative artwork
```

## Current cover

`cover.webp` is the current representative hero image used by the derived reader.

Its role is symbolic:

- night/desert-like darkness;
- two scorpion forms of visibly different sizes;
- illumination that makes the forms legible without claiming to reproduce Victor's dream;
- no likeness of Victor or his father;
- no claim that the image records an observed scene.

The image was derived from the creative visual exploration for PR #339 and then cropped into an
image-only asset so the artwork does not smuggle a generated UI mock into the page architecture.

```text
ARTWORK != DREAM EVIDENCE
ARTWORK != TRANSCRIPT EVIDENCE
REPRESENTATION MAY EVOLVE
PARENT RECORD MUST NOT
```

## Collection-surface hold

The current v2 repository has no accepted visitor-facing collection-card cover-image metadata or
renderer contract. The root page redirects to Terrain, while Build Health is an operational registry,
not a visitor collection surface.

Do not add a dead `coverImage` field merely because the asset exists. If a visitor-facing collection
surface is admitted later, wire this asset through that surface's rightful metadata/renderer contract
and test the collection behavior there.

<!-- [VXG RealForever] -->
