# Debugging and pre-development rigor

Sound logic and correct runtime behavior are different claims. Code review —
by a human or an AI — verifies the first. Only running the thing verifies the
second. This document exists because that gap produced a real, shipped bug,
and the fix generalizes past the one file it happened in.

---

## The worked example

Session 015's `lib/build-ecosystem-hub.js` had CSS like this:

```css
summary.panel-head { background: var(--stone-950, #0a0a0a); }
.panel-title { color: var(--stone-300); }
```

Read as a diff, this is unremarkable — a dark background, a light-gray title,
a sensible fallback on the background declaration. Nothing about the *logic*
is wrong. But `--stone-950` and `--stone-300` are never defined anywhere in
this repository. `styles/design-system.css` defines nine tokens, none of them
part of a numbered `--stone-NNN` scale. At runtime:

- `background: var(--stone-950, #0a0a0a)` — the fallback kicks in, so the
  background renders as intended. The bug is invisible here.
- `color: var(--stone-300)` — no fallback, so per the CSS spec the whole
  declaration is invalid and dropped. The property is simply absent. Text
  inherited whatever color it would have had anyway — in this case, dark text
  on the now-correctly-dark background. Illegible.

The two declarations look structurally identical. One partially worked by
accident; the other didn't, for a reason invisible to anyone reading the code
rather than rendering it. Nobody caught this until an admin looked at the
actual page and saw barely-visible text.

## The principle

**Reading code confirms the logic is sound. It does not confirm the runtime
behavior is correct.** The class of bug that ships is disproportionately the
class that requires *simulating* something to see — not reasoning about it:

- **CSS custom properties** — does `var(--x)` resolve against a token that
  actually exists in whatever stylesheet this file loads (or defines itself)?
  Automated now: `node lib/check-design-tokens.js` (see below).
- **Race conditions** — two operations whose individual logic is correct, but
  whose *interleaving* isn't considered. `loadIndex()` in
  `lib/vextreme-index-v2.js` serves a cached value immediately and
  revalidates in the background *by design* — that's a deliberately-chosen
  race, documented as such. An *undeliberate* one looks identical in a diff.
- **UX states that are easy to skip when only reasoning about markup** — is
  the UI static or does it need to handle dynamic content lengths? Does it
  scroll, paginate, or overflow, and what does that look like at a realistic
  content size, not a placeholder one? Is spacing deliberate (breathing room)
  or accidental (whatever the default happened to produce)? Does the page
  work in both color schemes it's supposed to support, or only the one that
  happened to get eyeballed once?

None of these are caught by "is the logic sound." All of them are caught by
actually producing the runtime condition — a real render, a real concurrent
call, a real toggle — and looking at what happens.

## The practice

Before considering a UI or async change done, actually do the thing you'd
otherwise only reason about:

1. **Render it.** Not "the structure looks right" — an actual screenshot or
   local render, at realistic content sizes, in whatever color schemes the
   page is supposed to support.
2. **For concurrent/async logic, write out the interleaving.** If two things
   can happen in either order or overlap, what does each order actually
   produce? If the answer is "it shouldn't matter," say why in a comment —
   don't leave it implicit.
3. **Check scroll and overflow at realistic sizes**, not the shortest
   plausible content. A panel that looks fine with three items may not with
   thirty.
4. **When a failure mode is mechanical and repeatable, automate the check
   instead of relying on remembering to look.** A human or AI re-deriving
   "did I use a real CSS token" by eye, every time, will eventually miss one
   — that's exactly what happened here. `lib/check-design-tokens.js` (added
   alongside this document) turns that specific question into a build-time
   fact instead of a manual-review question. It is not a general solution to
   this document's principle — it closes one mechanical instance of it. Race
   conditions and UX-state coverage don't have an equivalent automated check
   yet, and might not ever; the practice above is what covers them until or
   unless one exists.

## Relationship to the design system

`docs/architecture/12-design-system.md` documents the token contract this
practice's worked example was violating. Formalizing that contract was
explicitly sequenced *after* this document (see `data/status/open-discussions.json`
od-004/od-005 for the reasoning) — a system built without first naming the
rigor that verifies it tends to accumulate the same class of unverified
assumption it was meant to prevent.

<!-- [VXG RealForever] -->
