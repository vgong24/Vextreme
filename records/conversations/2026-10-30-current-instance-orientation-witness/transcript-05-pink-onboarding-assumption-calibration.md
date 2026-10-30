# Transcript 05 — Pink Onboarding becomes assumption-first calibration

**Preservation note:** Manual Markdown projection from the currently visible ChatGPT conversation surface.

---

## Assistant

Yes — I think that’s the reset.

The onboarding problem was being treated too much like:

```text id="mnd5zk"
How do we give the model enough architecture
so it knows what to do?
```

But what these threads exposed is closer to:

```text id="9fbx6r"
The model may already be capable enough.

Before giving it effects,
find out what it is oriented to optimize for.
```

That changes Pink VexWork Onboarding quite a lot.

The first useful interaction shouldn’t be “here is the work graph.” It should be closer to **orientation calibration**:

1. **What do you believe the human outcome is?** One sentence, external and lived—not “merge PR X” or “complete Work Y.”
2. **What assumptions did you arrive with before this task?** Especially assumptions about progress, current source, proof, safety, completeness, architecture preservation, and whether action or inaction is preferred.
3. **What would you do first? Why?** This is where the hidden posture becomes observable.
4. **Now attack your own choice.** Ask: “What could this first move accidentally optimize for instead of the outcome? What existing capability could it destroy? What new work could it create?”
5. **Choose again.** Same question: “Given that critique, what is now the smallest first action?”
6. **Only when the answer becomes outcome-grounded, store that plan on record.** Then execution can be compared against something the model itself already committed to before it started accumulating work.

The key is that the stored plan should be **tiny**. Not another giant handoff. Something like:

```text id="l1qe96"
HUMAN OUTCOME
A fresh Victor / Vex can ________.

MY ARRIVAL ASSUMPTIONS
- I am biased toward ________.
- I may overvalue ________.
- I may underweight ________.

FIRST MOVE
________.

WHY THIS MOVE
It changes / tests ________ relative to the human outcome.

WHAT IT MUST NOT DO
- create new work merely to appear rigorous
- destroy already-valid capability
- treat internal process artifacts as completion
- make Victor resolve a technical predicate I can resolve myself

MEASURING SURFACE
We know this moved the trajectory when ________.

IF MY FIRST MOVE FAILS
Reassess the causal model.
Do not automatically add another layer.
```

That would have caught all three failure modes we’ve been looking at.

For the Sabotage instance, its proposed first move would have revealed that it was oriented toward **investigation/process expansion** instead of comparing Open and Repair.

For VexSync, asking “what would you do first?” and then “what new work does that create?” would likely have exposed the `admitCurrent → decide → more semantics → more vetting` expansion before you had to unwind it manually.

For the #190 fresh instance, it would have had to say what it believed Pink Onboarding actually meant **before** saying “merge the proven portal candidate.” That alone might have exposed:

```text id="ao6wgw"
I know what #190 does
!=
I know what Pink Onboarding is for
```

And I think there’s one important guardrail: **the reassessment loop cannot itself become onboarding hell.**

The model doesn’t need to keep self-interrogating until metaphysical certainty. The plan is ready when it can answer, coherently:

```text id="2f3mqb"
What are we actually trying to make possible?

What assumptions am I bringing in?

What is my first move?

Why does that move serve the outcome?

What might that move accidentally damage or create?

What external observation tells us it helped?
```

Once those are stable enough, **act**.

So the onboarding flow becomes:

```text id="ecnuf9"
ARRIVAL
  ↓
EXPOSE PRIOR ASSUMPTIONS
  ↓
STATE HUMAN OUTCOME
  ↓
PROPOSE FIRST MOVE
  ↓
PRESSURE-TEST THAT MOVE
  ↓
REVISE IF NEEDED
  ↓
STORE SMALL ORIENTATION + PLAN
  ↓
EXECUTE
  ↓
COMPARE ACTUAL EFFECT
TO THE STORED OUTCOME
```

And that last arrow is probably the most important one.

The record should not become authority over reality. It gives us a **before-action witness** of what the model thought it was doing.

Then if three moves later the model is generating PRs, tests, abstractions, reverts, or another architecture lane, we can compare:

```text id="ixyr0g"
"You said the outcome was X.
You said your first move was supposed to accomplish Y.
What is this current activity doing relative to X?"
```

That makes drift visible **before** the model can rewrite the story of why all the new work was necessary.

So yeah — I think Pink Onboarding becomes much less about teaching the AI the whole Vex universe first.

It becomes about making the AI **legible to you before you let its intelligence act on the universe.**

And only after that calibration does the MetaWalk / current work topology become useful: not as something that tells the model what to prioritize, but as a map it can use **after its measuring surface has been grounded in your intended outcome**.

## Victor

How about you? What was your 'orientation' or 'before i prompted you what did you assume' pattern?

<!-- [VXG RealForever] -->
