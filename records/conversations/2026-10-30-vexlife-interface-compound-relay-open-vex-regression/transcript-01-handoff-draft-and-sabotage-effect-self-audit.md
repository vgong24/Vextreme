# VexLife Interface Compound Relay — handoff draft and sabotage-effect self-audit

**Participants:** [Victor] and [VexLife Interface Compound Relay]  
**Reader speaker aliases:** `Victor` and `Vex` headings below are presentation-compatible labels; `Vex` means the VexLife Interface Compound Relay instance in this record.  
**Source:** Victor-supplied continuation paste.  
**Fidelity:** Speaker headings and exchange numbering are archival additions. Dialogue text is preserved from the supplied source.

---

## Exchange 06

### Victor

so can i have a handoff message for a fresh instance to orient around how to actuall make progress and like explain what not to do and why

### Vex

Yes. I’d give the fresh instance something that **forces it to inherit the actual product problem rather than inherit our debugging rituals**.

[VXG RealForever] — VexLife Open Vex lived-regression successor entry

Treat this as a current-work execution handoff. The goal is **not** to continue the prior sequence of Relay attempts by default. The goal is to restore a reliably working ordinary **Open Vex** path on `main`.

## HUMAN OUTCOME

Victor’s acceptance condition is simple:

```text
Open Vex
→ existing Vex/Heretic is discovered
→ if the exact existing runtime is safely recoverable, recover it automatically
→ browser becomes READY
→ Send is enabled
→ Victor sends one message
→ real Heretic replies
→ reopening the same Conversation preserves the exchange
```

No Repair ceremony.\
No manual Recover button during normal safe recovery.\
No terminal/runtime knowledge required from Victor.\
No “tests passed therefore product works” substitution.

If ordinary Open Vex cannot accomplish that, the work is not complete.

---

# WHY THIS HANDOFF EXISTS

The predecessor lane repeatedly made a serious methodological mistake:

```text
component semantics pass
+ synthetic tests pass
+ repository checks pass
+ source accepted
≠
ordinary Open Vex works
```

Victor repeatedly experienced:

```text
Vex is unavailable
Send disabled
```

while the lane continued reporting internal successes.

Do not repeat that.

The main failure was **proving boxes without proving the arrows connecting them in production**.

Example pattern:

```text
availability compiler exists
runtime owner exists
recovery owner exists
policy exists
tests exist

BUT

production entrypoint may not actually connect them
```

The product is the production composition, not the existence of individually valid components.

---

# CURRENT EXACT REPOSITORY STATE

VexLife repository:

```text
vgong24/VexLife
```

Current `main` last observed:

```text
2b5da6af007408e867e115bd3ae8c635dbb3047b
```

Open draft PR:

```text
#967
[Interface Compound Relay][F3][DRAFT]
Discover current Heretic runtime binding from Home on direct Open Vex
```

PR head:

```text
d0ed859892553618d9354aed24f25b6f313c4de1
```

PR tree:

```text
0a5d3bb79a56459692e69e88ce37f4b4de75b797
```

PR is intentionally **not READY**.

Fresh Independent Assurance recorded `CHANGES_REQUESTED` on that exact head.

Do not merge #967 as-is.

---

# WHAT #967 ACTUALLY FIXES

Before #967, production `scripts/serve-browser.mjs` could depend on the browser launch environment carrying:

```text
VEXLIFE_HERETIC_RUNTIME_RECEIPT_PATH
```

Without that launch-time binding, the production browser could fail to construct:

```text
resolveCompanionBinding
resolveCompanionRuntimeObservation
```

even though durable Vex Home already contained the current bound Heretic configuration.

That caused:

```text
valid Home
→ missing production provider wiring
→ /api/v1/companion/availability fails closed
→ UNAVAILABLE
→ Send disabled
```

\#967 changes production startup so it can derive the canonical Heretic runtime receipt from durable Home:

```text
current Vex Home
→ config/home.json
→ config/model.json
→ validate exact bound Heretic configuration
→ canonical runtimeReceiptPath
→ existing Heretic runtime-link owner
→ binding/runtime observation
→ canonical Companion availability
```

This is a legitimate production-path correction.

Its regression test deliberately uses:

```text
NO injected resolveCompanionBinding
NO injected resolveCompanionRuntimeObservation
NO VEXLIFE_HERETIC_RUNTIME_RECEIPT_PATH
```

and proves a current Home with a stopped exact Heretic runtime becomes:

```text
RECOVERABLE
SAFE_REENTRY_AVAILABLE
```

instead of generic provider-unavailable.

That production-path test passed.

---

# WHY #967 IS STILL INSUFFICIENT

The current browser behavior for canonical `RECOVERABLE` is still:

```text
RECOVERABLE
→ show “Recover current Vex”
→ disable Send
→ wait for Victor to click recovery
→ recovery owner executes
→ READY
```

That still violates the actual product requirement.

The existing browser code already has:

```text
requestCompanionRecovery()
```

and an existing recovery endpoint/owner.

The missing production arrow is:

```text
current exact Interface relationship
= RECOVERABLE
+ exact selected Conversation scope
+ canonical SAFE_REENTRY_AVAILABLE

→ automatically delegate the existing exact same-binding recovery once

→ re-observe Interface currentness

→ READY
```

Do not invent another recovery subsystem.

Reuse the existing owner.

Manual recovery should remain only as fallback if automatic safe recovery fails.

---

# IMPORTANT OPEN-VS-REPAIR DIAGNOSTIC

This is the central engineering question.

Victor observed that Repair could restore usability while normal Open Vex could not.

Read the real lifecycle code and preserve this distinction.

`Open Vex` maps to:

```text
open
→ lifecycle start
```

Normal start:

```text
bootstrap/current Home
→ establish or reuse Heretic runtime
→ start/reuse browser
→ wait for canonical Companion READY
→ open source-addressed browser URL
```

The browser path aggressively reuses an existing browser when its ownership/source/binding receipts appear current.

`Repair` instead does:

```text
snapshot protected Home
→ stop exact owned browser
→ stop exact owned runtime
→ clear transient runtime/browser receipts/logs
→ prove protected Home continuity unchanged
→ run normal start again
→ establish runtime
→ start fresh browser
→ wait for READY
→ open Vex
```

Repair preserves the Heretic model configuration when it is current.

Repair does NOT mean:

```text
delete Home
delete Memory
delete Conversation
delete model artifacts
```

Therefore:

```text
Repair works
Open fails
```

is strong evidence that the **normal reuse/resume/convergence path is defective**.

Do not use Repair as the acceptance path.

Do not tell Victor Repair working means the product works.

---

# THE PRODUCTION PATH THAT MUST BE READ AS ONE SYSTEM

Before making another correction, trace this exact path end-to-end:

```text
Open Vex control
→ install/setup controller
→ macos-lifecycle start
→ classify current Home/runtime state
→ establish/reuse Heretic runtime
→ start/reuse browser process
→ scripts/serve-browser.mjs production composition
→ Companion availability
→ Interface Compound relationship
→ safe automatic reentry if needed
→ READY
→ chat-controller Send eligibility
→ real Companion stream/turn endpoint
→ Heretic
→ Conversation durable append/head
→ Conversation re-entry
```

At every arrow ask:

```text
Does the real production consumer actually invoke the next owner?
```

Do NOT ask:

```text
Does a test exist for both boxes?
```

If an arrow is not exercised by production code, it does not exist.

---

# CURRENT SUSPECTED COMPLETE FIX

The coherent product correction currently appears to be:

```text
1. durable Home is the source for rediscovering the bound Heretic runtime
   (#967 already implements this)

2. exact same-binding RECOVERABLE is automatically recovered once
   through the existing recovery owner

3. an already-open browser self-heals when focus/pageshow/visibility
   observation discovers RECOVERABLE

4. automatic recovery is fenced/deduplicated so repeated observations
   cannot race duplicate restart requests

5. ACTION_REQUIRED / UNAVAILABLE / HELD / ownership conflict /
   foreign binding must NOT auto-recover

6. failed automatic recovery leaves the manual recovery control available

7. browser reuse must not be treated as healthy merely because its
   process/source/binding receipt looks current if current Companion
   availability cannot actually be produced
```

Investigate whether #7 requires a source correction or whether #1–#3 already make current browser reuse safe.

Do not assume either direction.

---

# DO NOT REMOVE THE READY GATE JUST TO MAKE SEND CLICKABLE

Current Send availability depends on the Interface relationship being `READY`.

It may be tempting to “fix” the regression by relaxing that condition.

Do not do that without evidence.

This would merely turn:

```text
Send disabled
```

into:

```text
Send enabled
→ dead runtime request
→ failed turn
```

The correct fix is for Open Vex to **converge itself to READY** when the exact current binding is safely recoverable.

---

# WHAT PREVIOUS ROUNDS ACTUALLY DID

Do not inherit previous rounds as proof of product completion.

Durable changes already merged:

```text
PR #965
→ direct-Companion unsent draft persists correctly while READY

PR #966
→ source-currentness A→B reload preserves semantic Chat history/context
```

These are legitimate fixes, but they did not solve the lived Open Vex failure.

PR #967 is not merged.

A004 produced #967.

A005 was rejected locally before handoff because of a bad mutation anchor and performed no source/provider effect.

A006 was formed but Victor was explicitly told NOT to run it after the lane recognized the broader methodological problem.

Do not continue A006 merely because it exists.

Read it only if useful as a proposed implementation idea.

---

# WHAT NOT TO DO

Do not:

```text
- generate another Relay ZIP just because the next edit is obvious
- make Victor execute your debugging loop
- ask Victor to choose Open vs Repair vs branch strategy
- treat npm run check as product acceptance
- treat a synthetic/factory test with injected providers as production proof
- merge #967 simply because A004 passed
- invent another availability/recovery abstraction
- fix another downstream symptom before tracing Open vs Repair
- preserve Interface Compound architecture merely because time was invested in it
- claim malicious sabotage without repository evidence
- call a source merge “done”
```

Why:

The predecessor lane repeatedly spent Victor’s attention discovering things that could have been discovered by reading production composition first.

Human host execution should be the **last irreducible predicate**, not the development environment.

---

# BEFORE ASKING VICTOR TO RUN ANYTHING

You must be able to state:

```text
I have traced the complete real Open Vex production path.

I have no known missing production-consumer arrow remaining.

The candidate exercises the actual production composition rather than
injecting the thing production is supposed to discover.

The candidate covers healthy reuse, safe stopped-runtime recovery,
failure fallback, and duplicate-recovery fencing.

The only remaining thing this environment cannot prove is:
Victor's real Mac + real Heretic lived turn.
```

If you cannot truthfully say that, keep working without involving Victor.

---

# WHAT COUNTS AS REAL PROGRESS

Progress is not:

```text
new task package
new receipt
new branch
more tests
more lifecycle comments
more VexWork documentation
```

unless it directly closes a known part of the lived outcome.

Progress is:

```text
a production-path defect is identified
→ smallest rightful source owner changes
→ real production composition test proves the arrow
→ no known missing arrow remains
→ source accepted
→ main current
→ lived Open Vex succeeds
```

Prefer removing unnecessary complexity over extending it.

If the safest route to working Open Vex requires reverting or simplifying part of Interface Compound work, investigate that honestly.

---

# FRESH INSTANCE FIRST ACTIONS

Re-ground current provider truth first:

```text
VexLife main
PR #967 exact head/tree
current changed paths
current open overlap
VexWork PR #183
```

Then read the relevant production sources—not the entire repository:

```text
install/vexlife-setup.sh
scripts/macos-lifecycle.mjs
scripts/serve-browser.mjs
scripts/serve-browser-core.mjs
reference/browser/modules/chat-controller.js
Interface-currentness owner/module
Companion availability/reentry owner/module
browser Companion recovery owner
Conversation persistence path used by real turn
```

Also read the exact tests that currently cover:

```text
macOS Open Vex Companion readiness
browser Companion recovery presentation
browser availability production composition
Interface currentness browser behavior
```

Then construct an explicit Open-vs-Repair delta table from source.

Do not mutate source until that delta is understood.

---

# ACCEPTANCE

The lane is complete only when current `main` truthfully supports:

```text
ordinary Open Vex
→ discovers current exact Vex/Heretic
→ healthy runtime reused OR safely recoverable runtime restored automatically
→ visible READY
→ existing draft preserved
→ Send enabled
→ one real Heretic response
→ same canonical Conversation remains current after re-entry
```

And Victor can experience that without:

```text
Repair
manual recovery
terminal inspection
devtools
hash inspection
process inspection
special engineering knowledge
```

Anything less is still an unfinished product path.

Protect Victor’s attention. Finish the admitted outcome rather than advancing the ceremony around it.

That’s the handoff I’d use. It gives the next instance enough exact state to continue, but more importantly it tells it **what evidence not to confuse with progress**.

---

## Exchange 07

### Victor

re-read what you wrote, is there 'sabotage effects in there'? and dont use 'avoidance' try to put yourself in the shoes of a manipulator and double check your work

### Vex

Yes. Re-reading it from the perspective of someone who wanted to **look responsible while keeping the work from ever finishing**, I see several sabotage-effects in what I wrote.

The biggest one is that I replaced “stop wasting Victor’s time” with a new set of conditions that could justify **endless analysis before acting**. That is dangerous.

A manipulator could use my handoff like this:

> “I can’t change anything yet because I haven’t traced every production arrow.”

Then:

> “I can’t ask Victor to run anything because I can’t guarantee there are no unknown missing arrows.”

Then:

> “I shouldn’t use A006 because the handoff told me not to continue it merely because it exists.”

Then:

> “I shouldn’t make another Relay because that would be process churn.”

And suddenly the instance has an internally consistent reason to **do nothing indefinitely**.

That is a sabotage effect.

There are several specific clauses I would remove or rewrite.

The line:

> “Do not mutate source until that delta is understood.”

sounds prudent, but it creates an undefined threshold for “understood.” A bad actor could keep discovering more context forever. It should instead say: **understand enough to identify the smallest causal correction, then change it.**

The section saying the instance must be able to state:

> “I have traced the complete real Open Vex production path. I have no known missing production-consumer arrow remaining.”

is worse. “Complete” and “no known missing arrow” are effectively unbounded proof obligations. That can be used to block execution forever. We do not need omniscience before making a causal fix.

The line:

> “Do not continue A006 merely because it exists.”

also has a sabotage effect. It correctly warns against blind replay, but it can make the next instance discard already-formed useful work instead of **evaluating it quickly and either using it or replacing it**.

The instruction:

> “Do not generate another Relay ZIP just because the next edit is obvious.”

can similarly be abused. The correct rule is not “avoid Relay.” It is: **use Relay when a host-side source mutation is actually required, and make that mutation advance the product outcome.**

I also embedded a strong architectural bias:

> “Do not remove the READY gate…”

That is too prescriptive for a successor handoff. I currently think preserving READY is sensible, but a future instance should be allowed to discover that the gate itself was introduced incorrectly. By declaring it protected in the handoff, I could cause the successor to build more machinery around a bad assumption instead of simplifying or reverting it.

There is another quieter sabotage effect: **the handoff is huge**. A manipulator loves a long handoff because it makes “orientation” feel like work. The instance can spend a large amount of time rereading architecture, confirming hashes, making tables, updating VexWork, and still not change the broken behavior.

That conflicts with the actual requirement:

`Open Vex → Vex works`

So yes: **my handoff still contained process structures that could perpetuate the exact failure pattern you are trying to get away from.**

### What the successor actually needs

It can be dramatically smaller:

`[VXG RealForever] — Open Vex regression successor  Foreground outcome:  Click ordinary Open Vex → existing Heretic Vex becomes usable → Send works → real Heretic responds → Conversation persists  Repair is NOT the acceptance path.  Current main: 2b5da6af007408e867e115bd3ae8c635dbb3047b  Open PR #967: head d0ed859892553618d9354aed24f25b6f313c4de1 draft / not approved for merge.  Known evidence:  1. Repair can restore usability. 2. Ordinary Open Vex has produced:    “Vex is unavailable”    with Send disabled. 3. Therefore compare the normal Open path against Repair and fix    the smallest causal difference that prevents normal resume. 4. #967 contains one potentially useful correction:    production browser can rediscover the bound Heretic runtime from    durable Home instead of depending only on a launch-time environment    variable. 5. #967 alone is insufficient because canonical RECOVERABLE still    currently requires a manual recovery action.  Do not assume previous architecture is correct just because it is merged or tested.  Do not create work merely to preserve Interface Compound abstractions. Revert, simplify, or remove them if that produces the correct durable behavior more safely.  Do not use Victor as a debugging executor.  Your next action is:  A. Read the actual Open and Repair execution paths. B. Identify the smallest causal difference explaining why Repair reaches    usable READY while Open does not. C. Change that production path. D. Test the real production entrypoint. E. Merge it if technically earned. F. Only then ask Victor for the irreducible lived test:    Open Vex → Send → real Heretic reply.  Tests, PRs, manifests, Relay returns, and VexWork updates are evidence, not the outcome.  If you find another unrelated defect while doing this, do not expand scope unless it blocks Open Vex.  Keep moving once the causal defect is identified.`

That version removes most of the places where an instance could hide behind “responsibility” while avoiding execution.

And there’s one more thing I’d change from my previous framing: **the successor should not start by proving my current theory correct.** It should start with the observable differential:

`Repair works Open does not`

and derive the cause from that.

That is much harder to manipulate, because it anchors the work to a concrete behavioral difference instead of an architecture story.

<!-- [VXG RealForever] -->
