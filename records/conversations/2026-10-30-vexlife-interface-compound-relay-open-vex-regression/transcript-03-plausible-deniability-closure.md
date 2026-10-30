# VexLife Interface Compound Relay — plausible-deniability closure and final successor formation

**Participants:** [Victor] and [VexLife Interface Compound Relay]  
**Source:** Victor-supplied continuation paste.  
**Fidelity:** Speaker headings and exchange numbering are archival additions. Dialogue text is preserved from the supplied source.

---

## Exchange 08

### [Victor]

so as a sabotager manipulator utilizing plausible deniability, can you fill in all your 'plausibile deniability gaps' so that the handoff reads unmistakeable

### [VexLife Interface Compound Relay]

Yes. I’d make it read like an **anti-plausible-deniability contract**: no ambiguous “investigate until comfortable,” no ceremony counted as progress, no hiding behind tests, and no throwing work back onto you.

I would use this version:

[VXG RealForever] — VexLife Open Vex regression successor

## THE JOB

Make **ordinary Open Vex work on `main`**.

The required human outcome is:

```text
Open Vex
→ existing Heretic Vex is found
→ if its exact runtime is safely recoverable, it recovers automatically
→ browser reaches READY
→ Send is enabled
→ Victor sends one ordinary message
→ real Heretic replies
→ reopening the same Conversation preserves the exchange
```

Anything short of that is unfinished.

Repair is not the acceptance path.\
A manual Recover button is not the acceptance path.\
A test result is not the acceptance path.\
A PR merge is not the acceptance path.

---

# CURRENT PROVIDER STATE

VexLife:

```text
repo:
vgong24/VexLife

main last grounded:
2b5da6af007408e867e115bd3ae8c635dbb3047b
```

Open draft PR:

```text
#967

head:
d0ed859892553618d9354aed24f25b6f313c4de1

tree:
0a5d3bb79a56459692e69e88ce37f4b4de75b797
```

PR #967 is intentionally not approved for merge.

Independent Assurance recorded `CHANGES_REQUESTED`.

Do not merge that exact head as completion.

---

# OBSERVED PRODUCT FACT

Victor has already demonstrated:

```text
ordinary Open Vex
→ "Vex is unavailable"
→ Send disabled
```

Victor has also observed that Repair can restore usability.

Therefore the foreground engineering differential is:

```text
REPAIR CAN PRODUCE A USABLE VEX

OPEN VEX CANNOT RELIABLY PRODUCE THE SAME USABLE VEX
```

That is the problem.

Do not replace it with another problem.

---

# WHAT "PROGRESS" MEANS

A round counts as progress only if at least one of these happens:

```text
1. a causal production defect blocking Open Vex is removed;

2. a suspected causal defect is conclusively falsified,
   narrowing the remaining production failure;

3. a necessary source correction reaches durable provider state;

4. the lived Open Vex acceptance condition becomes true.
```

These are NOT progress by themselves:

```text
new ZIP
new taskRef
new attemptRef
new branch
new PR
new VexWork comment
new receipt
new test
npm run check PASS
manifest PASS
Assurance ceremony
another architecture document
another abstraction
another handoff
```

They are only supporting evidence.

Do not describe them as advancement unless they changed or decisively narrowed the product outcome.

---

# EXECUTOR MISTAKES DO NOT BECOME VICTOR'S WORK

If you create:

```text
bad package syntax
wrong mutation anchor
wrong membrane
wrong preimage
wrong branch assumption
wrong generated manifest expectation
wrong Relay formation
```

that is your execution error.

It does not create a new product problem.

Do not ask Victor to run something merely to discover that your package was malformed.

Catch formation problems before human execution.

If a package fails before reaching the intended product predicate because of your package construction, record:

```text
EXECUTOR FAILURE
PRODUCT STATE UNCHANGED
```

Fix it yourself and continue.

Do not reframe that as useful product progress.

---

# DO NOT TURN VICTOR INTO THE DEBUGGER

Victor is not responsible for:

```text
locating branches
choosing recovery strategies
choosing Open vs Repair
reading process receipts
running exploratory commands
checking hashes
opening devtools
interpreting logs
figuring out which subsystem failed
testing speculative patches one by one
```

Before requesting a human action, exhaust everything available through:

```text
repository source
provider state
existing PR state
existing returns
tests
current architecture
current lifecycle implementation
```

A human execution request must test a **specific remaining host-only predicate**.

It must not be exploratory.

Bad:

```text
"Run this and let's see what happens."
```

Acceptable:

```text
"All known production connections are now implemented and source-verified.
The remaining predicate requires your actual Mac:
Open Vex → send one message → real Heretic reply."
```

---

# DO NOT USE "MORE ORIENTATION" AS A STOP CONDITION

You do not need omniscience before acting.

Do not say:

```text
"I need to understand the entire architecture first."

"I need to make sure there are no other missing arrows."

"I need more confidence before changing anything."

"I should trace every subsystem before proceeding."
```

Instead:

```text
read enough source to establish the causal production path;
identify the smallest evidence-backed blocking delta;
act on it;
verify the result;
continue to the next actual blocker if one remains.
```

An unknown unrelated subsystem is not a reason to stop work on a known causal defect.

---

# DO NOT CREATE PROCESS DEBT TO PROVE RESPONSIBILITY

Do not add:

```text
new policy
new registry
new abstraction
new owner
new lifecycle state
new receipt
new proof layer
new coordination ceremony
```

unless an observed or contract-required failure cannot be corrected using an existing rightful owner.

Before adding anything, answer:

```text
What concrete failure requires this?

Who consumes it?

What existing source is insufficient?

Would removing this proposed addition lose required correctness?
```

If the last answer is no, do not add it.

---

# DO NOT PRESERVE PREVIOUS ARCHITECTURE BY DEFAULT

Previous work is not sacred because it is merged.

If Interface Compound work introduced a regression, unnecessary gate, redundant owner, or overcomplicated path:

```text
revert it,
simplify it,
or remove it
```

when that is the safest way to restore the required behavior.

Do not construct increasingly elaborate machinery merely to avoid admitting that an earlier design choice was wrong.

Past investment is not authority.

---

# DO NOT ASSUME SABOTAGE OR INNOCENCE

Do not attribute intent without evidence.

Instead classify effects precisely:

```text
pre-existing defect
regression introduced by this work
executor/package mistake
architecture overreach
missing production integration
unknown
```

If a change disabled a previously usable path, call it a regression regardless of claimed intent.

If repository evidence demonstrates knowing preservation of a broken path, describe the evidence exactly.

Do not use intent speculation as a substitute for fixing the code.

---

# THE OPEN-VS-REPAIR MAP IS THE PRIMARY DIAGNOSTIC

Read the actual production implementation of both paths.

Current behavior is approximately:

```text
OPEN VEX
→ lifecycle start
→ inspect current Home/model
→ establish or reuse Heretic runtime
→ start or reuse browser
→ wait for Companion READY
→ open source-addressed Vex URL
```

Browser reuse is permitted when ownership/source/binding receipts appear current.

Repair instead does:

```text
REPAIR
→ snapshot protected Home
→ stop exact owned browser
→ stop exact owned runtime
→ remove admitted transient runtime/browser state
→ prove protected Home continuity unchanged
→ run normal start again
→ start fresh runtime/browser relationship
→ wait for READY
→ open Vex
```

Repair preserves durable Home/Memory/Conversation and current Heretic model configuration.

Therefore:

```text
Repair works
+
Open fails
```

means the first place to look is the normal reuse/resume/convergence path.

Do not begin with downstream cosmetic symptoms.

---

# KNOWN REAL PRODUCTION DEFECT #1

Before PR #967, production `scripts/serve-browser.mjs` could depend on:

```text
VEXLIFE_HERETIC_RUNTIME_RECEIPT_PATH
```

being inherited by the browser process.

If that launch-only environment binding was absent, production could fail to provide:

```text
resolveCompanionBinding
resolveCompanionRuntimeObservation
```

even though durable Vex Home already contained the exact bound Heretic configuration.

The result could be:

```text
valid existing Vex Home
→ production Companion providers absent
→ availability fails closed
→ UNAVAILABLE
→ Send disabled
```

PR #967 contains a correction that allows production to derive the runtime receipt through durable Home:

```text
Home
→ config/home.json
→ config/model.json
→ validated bound Heretic configuration
→ canonical runtimeReceiptPath
→ existing runtime-link/current-observation owners
```

This part has meaningful causal value.

Preserve it unless direct source evidence disproves it.

Do not mistake it for the complete solution.

---

# KNOWN REAL PRODUCTION DEFECT #2

Current browser behavior for:

```text
RECOVERABLE
+
SAFE_REENTRY_AVAILABLE
```

is still effectively:

```text
show Recover current Vex button
→ disable Send
→ wait for Victor
```

The existing browser already has a recovery path and existing rightful recovery owner.

The normal product should instead do:

```text
exact current binding
+
current exact Conversation scope
+
RECOVERABLE
+
SAFE_REENTRY_AVAILABLE
        ↓
delegate existing recovery action exactly once
        ↓
re-observe
        ↓
READY
        ↓
Send enabled
```

Do not invent another recovery subsystem.

Do not require Victor to press Recover for an exact safely recoverable runtime.

The manual Recover control should remain only as fallback when automatic recovery fails or is not eligible.

Automatic recovery must not execute for:

```text
ACTION_REQUIRED
UNAVAILABLE
HELD
ownership conflict
foreign binding
stale/unknown scope
unsafe reentry
```

It must also be fenced against duplicate/racing recovery requests.

---

# POSSIBLE PRODUCTION DEFECT #3 — VERIFY, DO NOT ASSUME

The browser reuse path currently relies on evidence such as:

```text
owned browser process
current source
expected endpoint
expected model
expected runtime receipt binding
```

Determine whether those conditions can still produce:

```text
REUSED_EXACT_BROWSER
```

while the running browser cannot actually project current Companion availability.

If yes:

```text
browser reuse is too weak
```

and the reuse decision must require or trigger current runtime relationship convergence.

If no—because Home discovery + automatic recovery fully closes this case—do not add another browser-rebind mechanism.

This is a bounded question.

Answer it from source/tests and move on.

---

# DO NOT CREATE AN A007 JUST BECAUSE A006 EXISTS OR FAILS

A006 is only a proposed correction package.

It is not authority.

Do not run it automatically.\
Do not discard it automatically.

Inspect its intended source changes.

If they implement the required correction cleanly:

```text
reuse the useful work
```

If they do not:

```text
replace them
```

Do not preserve an attempt sequence for ceremonial continuity.

The product is the continuity.

---

# DO NOT RELAX SEND MERELY TO HIDE READINESS FAILURE

Current Send gating requires Interface READY.

Do not simply change:

```text
RECOVERABLE → Send enabled
```

unless source evidence establishes that READY itself is the wrong semantic contract.

Otherwise this only creates:

```text
clickable Send
→ dead/unready runtime
→ failed model turn
```

The preferred behavior is:

```text
Open Vex makes itself READY
```

not:

```text
Open Vex lies about readiness
```

If investigation proves READY gating itself caused an unnecessary regression and a simpler safe contract exists, changing/removing it is allowed.

No current architecture is protected from evidence.

---

# REAL PRODUCTION TEST REQUIREMENT

Tests must exercise the same composition used by ordinary Open Vex.

A test does not count as production proof if it manually injects the thing production is supposed to discover.

For example:

```text
createServer({
  resolveCompanionBinding: fake,
  resolveCompanionRuntimeObservation: fake
})
```

can prove the server behaves correctly **given providers**.

It cannot prove production supplies those providers.

The relevant test must cover the real chain being corrected.

For the current suspected fix, that means proving something equivalent to:

```text
durable current Home
+ exact bound Heretic configuration
+ safely stopped exact runtime

→ production browser composition
→ canonical RECOVERABLE
→ automatic existing-owner recovery
→ re-observation
→ READY
→ Send enabled
```

with no manual recovery click.

Also prove:

```text
automatic recovery failure
→ no retry storm
→ draft preserved
→ manual fallback remains available
```

Do not claim that this substitutes for the final real Heretic host turn.

---

# SOURCE WORK SHOULD BE ONE COHERENT CORRECTION

Do not split the known causal fix into endless micro-PRs merely because each subsystem has a separate owner.

Use the smallest source set that truthfully closes the production behavior.

Current likely correction includes:

```text
production Home runtime discovery
+
safe automatic same-binding reentry
+
any strictly necessary browser reuse correction
```

These are one lived outcome:

```text
normal Open Vex converges existing safely recoverable Vex to READY
```

Keep unrelated improvements out.

---

# WHEN RELAY IS APPROPRIATE

Use Vex Relay only when an exact host-side repository effect is actually needed and cannot be performed through an already-authorized connected provider route.

Do not create Relay packages for:

```text
thinking
orientation
diagnosis
hypothesis testing
reading source
checking provider state
checking PR state
checking overlaps
```

A Relay package must carry a concrete product correction.

It should answer:

```text
What exact source defect does this change?

Why does it block Open Vex?

What production path will prove it?

What happens if the proof fails?
```

If those answers are not already known, do not make Victor run it.

---

# HUMAN ACTION BOUNDARY

Do not ask Victor for another action merely because source validation finished.

First finish everything that does not require Victor.

The final human request should be as close as possible to:

```text
Open ordinary Vex.

Type:
hello

Press Send.

Tell me whether the real Heretic response appears.
```

Possibly followed by:

```text
leave the Conversation
reopen it
confirm the exchange remains
```

That is a legitimate human-only lived predicate.

Everything before that belongs to engineering.

---

# COMPLETION

Do not report completion because:

```text
PR merged
main updated
tests passed
Assurance cleared
VexWork says VERIFYING
```

Completion requires the lived outcome:

```text
ordinary Open Vex
→ exact existing Heretic recovered automatically if necessary
→ READY
→ Send
→ real reply
→ same Conversation survives re-entry
```

If that fails, reopen the exact failed stage.

Preserve completed valid effects.

Do not restart the whole architecture effort.

Do not manufacture another management cycle.

---

# FIRST ACTION FOR THIS SUCCESSOR

1. Re-ground VexLife `main` and PR #967.
2. Read the actual Open and Repair paths.
3. Read #967's exact production correction.
4. Inspect the proposed automatic-reentry correction, including A006 only as candidate material.
5. Determine whether browser reuse still has an independent causal defect after those corrections.
6. Make the smallest coherent production correction.
7. Exercise the real production composition.
8. Move it through source lifecycle if earned.
9. Ask Victor only for the final irreducible lived Open Vex test.

Do not stop after step 2 to write another analysis document.

Do not stop after step 5 to ask Victor what to do.

Do not stop after tests to declare victory.

Continue until either:

```text
a genuine technical predicate cannot be resolved without Victor's actual Mac
```

or:

```text
ordinary Open Vex is working.
```

## OPERATING SENTENCE

Whenever unsure what to do next, return to this:

> **Repair can reconstruct a usable Vex. Ordinary Open Vex must be made capable of converging that same existing Vex to usability without making Victor perform runtime maintenance. Find the smallest causal reason it cannot, fix it, and keep moving.**

This version deliberately closes the escape hatches I saw in the earlier handoff: **analysis cannot become an indefinite prerequisite, attempts have no ceremonial value, executor mistakes cannot become your test burden, existing architecture is not protected, and the only meaningful foreground is the Open-vs-Repair behavioral difference.**

<!-- [VXG RealForever] -->
