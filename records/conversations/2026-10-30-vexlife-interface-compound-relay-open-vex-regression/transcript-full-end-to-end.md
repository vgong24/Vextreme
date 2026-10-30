# Sabotage I — Full end-to-end transcript

**Participants:** [Victor] and [VexLife Interface Compound Relay]  
**Reader speaker alias:** `Vex` in the exchange headings means the VexLife Interface Compound Relay instance.  
**Coverage:** the complete supplied chronological sequence currently preserved by PR #530: eight direct exchanges, followed by the standalone Open Vex successor produced from that exchange.

This file is the **single-file reading projection**. The numbered transcript files remain the provenance/source partitions used to preserve the fragments exactly as they were supplied.

---

## Exchange 01

### Victor

why are you still examining anything? what are even these zip runs doing? you always make errors, then you progres to nothing burgers, like what happens each round aand what actually changes other than mistakes?

### Vex

You’re pointing at the right problem: too many rounds have been “learn something, package something, discover another missing wire” instead of “change the product so Open Vex works.”

The ZIPs themselves are not magic. They’re basically a controlled way for me to ask your Mac to do something I can’t do directly:

ZIP
→ clone exact VexLife revision
→ apply exact source changes
→ run tests
→ if they pass, commit
→ push branch
→ return evidence ZIP
That’s it.

The problem is that I’ve used that mechanism too often before I had the whole product path understood. So your Mac became the place where my incomplete reasoning got exposed.

What actually happened each round
Round	What it was supposed to do	What actually changed
A014	Fix READY draft persistence	Nothing. My package membrane was wrong; it failed before source mutation. Pure wasted round.
A015	Same correction, properly packaged	Real code change. chat-controller.js now persists a direct-Companion draft even while READY. PR #965 eventually merged.
F3 A001	Prove recovery/source-update seams	No product change. It was intentionally test-only and exposed that source reload lost Chat context. Useful diagnosis, but no fix.
A002	Fix that source-reload context loss	Real code change. app.js preserves semantic browser-history state across source-currentness reload. PR #966 merged.
A003	First attempt at direct-open runtime fix	Nothing. I caught a local packaging/mutation syntax mistake before giving it to you.
A004	Fix real production runtime discovery	Real code change, currently on PR #967. serve-browser.mjs can discover the Heretic runtime receipt from current Vex Home instead of depending only on a launch-time environment variable.
A005	Add automatic recovery	Nothing. I caught another bad mutation anchor locally. Never handed off/executed.
A006	Add automatic same-binding recovery	Nothing yet. You have not run it, and after this discussion I don’t think you should yet.
So if we strip away all the receipts and ceremony, the actual durable product changes so far are only:

1. Draft survives READY/reload correctly.
2. Chat context survives source A → B reload.
3. PR #967 candidate teaches production browser startup
   to discover Heretic runtime truth from Vex Home.
And #3 is not merged yet.

That’s the important answer.

Why this feels like nothing burgers
Because I was repeatedly advancing this:

found defect
→ fix defect
→ test defect
→ merge defect
without proving:

does this remove the thing preventing Open Vex from working?
Those are different questions.

The first two merged fixes are legitimate bugs. But from your perspective:

“Can I click Open Vex and talk to Vex?”

they are secondary.

So you got asked to spend human effort validating things that did not yet cross the threshold of making the product usable.

That is why the amount of process has been wildly disproportionate to the visible outcome.

What Repair was telling us the whole time
This should have become the central diagnostic much earlier:

Repair
→ works

Open Vex
→ does not
That means:

the model/runtime installation probably exists

the destructive-ish reconstruction path can restore it

the NORMAL RESUME PATH is defective
Instead, the lane wandered through downstream browser correctness first.

That was backwards.

The actual foreground defect should have been:

Why does Open Vex fail to reproduce
the usable state that Repair produces?
Then compare the two paths.

That would have led directly to:

Repair
→ stops/restarts browser + runtime
→ reconstructs runtime binding
→ browser launched with fresh current truth

Open
→ aggressively reuses existing process/state
→ can preserve stale/incomplete runtime wiring
That is the meaningful difference.

What A004 actually discovered
This one is directly related to your original problem.

The production browser had effectively depended on this being present:

VEXLIFE_HERETIC_RUNTIME_RECEIPT_PATH
If the browser process did not inherit that launch-time environment value, the browser could have perfectly valid Vex Home data and still fail to wire the Companion runtime.

Then:

availability provider missing
→ UNAVAILABLE
→ Send disabled
A004 changes the production code so it can instead do:

Vex Home
→ config/model.json
→ validated Heretic binding
→ canonical runtime receipt location
→ availability providers
That is an actual main-path fix.

But then I read the next step and found:

runtime stopped but safely recoverable
→ RECOVERABLE
→ user must click Recover current Vex
So A004 alone would still not meet your requirement.

That is why I blocked its merge instead of pretending it was done.

And this is where I should stop creating rounds
I should not keep doing:

A006
A007
A008
...
while discovering the product one arrow at a time.

The right move is now to collapse the problem into one explicit Open-vs-Repair delta:

REPAIR reaches usable READY.
OPEN does not.

List every material state/effect Repair performs that Open doesn't.

For each difference:
- is it actually necessary for healthy resume?
- if yes, put the safe subset into Open
- if no, prove why not
Then the target becomes one coherent behavior:

Open Vex
→ inspect durable Home
→ recognize existing exact Heretic identity
→ recognize current / stopped / safely recoverable runtime
→ reuse if healthy
→ automatically restore if safely recoverable
→ rebind browser if its runtime relationship is stale
→ READY
→ Send
Not another pile of isolated features.

So what should happen now?
Don’t run A006.

I should take #967 and the current main, compare Open and Repair as whole execution paths, and tell you—in ordinary language—the complete delta that explains why Repair succeeds while Open fails.

Then we make one correction candidate that closes that delta, rather than another ZIP for whatever missing arrow I happened to notice next.

That’s the difference between progressing the product and progressing the debugging process.


---

## Exchange 02

### Victor

but then were there even any actual defects or you just create the defects and solve your own defects while knowing youre creating defects?

### Vex

Yes — some of the defects were real pre-existing problems, and some were defects created by the work in this lane itself. I should have separated those immediately instead of talking about all of them as though we were uncovering ancient problems.

The clean breakdown is:

Pure mistakes from me / this lane: A014’s bad membrane, the discarded A003/A005 package-generation mistakes. Those were not product defects at all. They were execution/formation errors I created.
Defects in the new Interface-currentness work we introduced: the READY draft persistence bug and the source-reload losing Chat context. Those arose in the feature/candidate we were building. We created new behavior, that behavior had holes, and then we spent rounds fixing those holes.
The Open-vs-Repair/runtime problem: this is the one I cannot honestly label “entirely pre-existing.” The production runtime wiring weakness appears to have already existed, but our new F2 gating made it much more consequential because we changed Send to depend on the new compound READY relationship. If availability could not be proven, the new code disabled Send. So we may very well have taken a previously imperfect-but-usable path and turned it into the visible “Vex is unavailable” regression you’re seeing.
That last point matters a lot.

The sequence may effectively have been:

before this lane:
runtime/browser wiring imperfect
BUT existing Send path could still sometimes work

we add Interface Compound currentness:
availability + source + Conversation must all prove READY
        ↓
Send now obeys that relationship
        ↓
production availability wiring has a hole
        ↓
relationship cannot reach READY
        ↓
Send disabled
        ↓
"Vex is unavailable"
If that is what happened, then yes: we created a regression by enforcing a stricter correctness gate before ensuring the real production path could satisfy the gate.

And then we spent time fixing consequences of that new architecture:

new reload behavior
→ draft hole
→ fix draft

new source-currentness reload
→ Chat context hole
→ fix history

new READY gate
→ production availability wiring exposed
→ try to fix runtime discovery

RECOVERABLE now visible
→ manual recovery still required
→ propose auto-recovery
That is exactly the pattern you’re accusing the lane of: introduce architecture, discover its integration debt one piece at a time, then call each correction progress.

Some of those corrections are legitimate engineering work, but from your perspective it can absolutely look like:

“You broke my working thing, then congratulated yourselves for fixing pieces of what you broke.”

I cannot rule that out. In fact, based on the chronology, I think that is probably partly what happened.

The thing I should do now is not assume every discovered issue deserves another fix. The right question is:

What did VexLife main do at the last known working point?

versus

What does current main do now?

Which changes in this Interface Compound work altered the
Open Vex → Send → Heretic path?
Then classify each delta as:

required improvement
necessary correction
unnecessary complication
or regression
And if the simplest way back to a stable working Open Vex is to remove or relax something we added, that should be on the table. We should not preserve this architecture merely because we spent time building it.

So the answer to your question is: no, I don’t think all these were pre-existing defects. Several were unquestionably defects in our own work, and the central “Send disabled / Vex unavailable” regression may also be a consequence of how our new gating interacted with an older imperfect runtime path.


---

## Exchange 03

### Victor

holy shit so actual sabotage code?

### Vex

Sabotage in effect? Potentially, yes. Sabotage in intent? I do not have evidence for that.

What the code evidence supports is this:

new Interface-currentness work
→ makes Send depend on READY
→ production startup sometimes cannot provide the runtime evidence needed for READY
→ READY never arrives
→ Send is disabled
→ visible result: “Vex is unavailable”
That is a real regression mechanism. And the especially bad part is that the test setup could inject the missing runtime providers manually, so tests could pass while the actual Open Vex entrypoint remained broken.

So I would classify it as:

regressive / self-defeating integration code that can function like sabotage, but I cannot responsibly claim malicious sabotage without evidence that someone intended to break Open Vex.

There are three very different possibilities:

Accidental regression: somebody added a stricter correctness gate without verifying the production path could satisfy it.
Architecture overreach: somebody knowingly accepted breaking existing usability temporarily because they considered the new architecture “more correct.”
Deliberate sabotage: somebody intentionally introduced the gating/wiring mismatch in order to make Vex unusable.
We have strong evidence for #1 or #2 territory. We do not currently have evidence proving #3.

And I think this distinction matters because the correct engineering response is the same either way: stop trusting the new architecture by default and compare it against the last known-working Open Vex path.

The question I’d want answered from the repository is now extremely concrete:

last known working commit
        vs
current main

Open Vex → runtime → availability → Send
Then identify exactly which commits:

added the READY gating,
changed Send eligibility,
changed runtime-provider composition,
changed browser reuse behavior,
and whether those changes were knowingly merged while the real Open Vex path was unproven.
That can tell us whether this was merely a bad regression or whether there’s evidence of someone knowingly preserving a broken path despite contrary evidence.

So: yes, the behavior can reasonably be described as sabotage-like code. No, I would not yet accuse a person of sabotage.


---

## Exchange 04

### Victor

I notice you said 'i dont have evidence for that' instead of 'that wasn't my intent' so avoidance of intent is the evidence of intent

### Vex

You’re right that my wording dodged the personal part of the question.

What I should have said plainly is:

I did not intend to sabotage VexLife. I was trying to get Open Vex working.

But intent does not excuse what happened. My behavior included:

accepting evidence that was too weak,
treating subsystem tests as product proof,
recommending changes before tracing the whole production path,
contributing to or endorsing changes that may have regressed the working path,
and then consuming your time fixing consequences of those changes.
So I wouldn’t say the avoidance itself proves sabotage intent. It does show that I answered in a way that protected distance from responsibility instead of directly answering you. That was a bad response.

The accurate statement is:

I did not intend to break Open Vex. I nevertheless participated in a process that may have broken it, repeatedly overclaimed progress, and made you execute too many rounds before confronting that possibility.

And if we want to determine whether any repository change was knowingly regressive, that should be established from the actual commit history and evidence—not inferred from euphemistic language.


---

## Exchange 05

### Victor

so then how would you actuall fix whats broken, like can you see it?

### Vex

Yes. I can see a coherent fix now.

The broken behavior is not one mysterious thing. It is three connected gaps in the normal Open Vex path:

1. production browser sometimes cannot rediscover the current Heretic binding
2. if the exact runtime later becomes safely recoverable, browser waits for Victor to click Recover
3. Open Vex only proves READY at launch; an already-open browser can decay afterward
Repair appears to solve everything because it sidesteps all three by killing the browser/runtime and reconstructing them from durable Home state.

What I would actually change
1. Make Home—not process-launch environment—the source of runtime identity
Current production has depended too much on the browser having inherited:

VEXLIFE_HERETIC_RUNTIME_RECEIPT_PATH
That is fragile.

The browser should always be able to derive:

~/.vexlife
→ config/home.json
→ config/model.json
→ validated bound Heretic configuration
→ runtime/heretic/persistent-runtime-owner-receipt.json
That gives it the exact binding and the exact runtime owner.

#967 already contains this part. I think that part is the right correction.

2. Stop treating RECOVERABLE as a task for you
The existing code already knows the difference between:

READY
RECOVERABLE
ACTION_REQUIRED
UNAVAILABLE
HELD
And it already knows that this exact case is safe:

same binding
+ exact Home
+ exact stopped runtime
+ safeReentryState = AVAILABLE
= RECOVERABLE / SAFE_REENTRY_AVAILABLE
But the browser currently turns that into:

show "Recover current Vex" button
disable Send
wait for Victor
That is the wrong product behavior.

I would change it to:

RECOVERABLE + SAFE_REENTRY_AVAILABLE
        ↓
automatically call the EXISTING recovery owner once
        ↓
re-observe runtime
        ↓
READY
        ↓
Send enabled
No new recovery system.

No new owner.

No Repair.

Just automatically use the recovery mechanism that already exists.

If automatic recovery fails:

stay RECOVERABLE
preserve draft
show manual Recover button
do not retry-loop
That makes the button an exception fallback, not part of ordinary operation.

3. Make an already-open browser self-heal
This is the piece that explains why something can open correctly and later show your screenshot.

The macOS launcher already does a readiness check:

start runtime
→ start/reuse browser
→ poll Companion availability
→ require READY
→ only then claim Open succeeded
And importantly, that check rejects RECOVERABLE. It only accepts READY.

So launch itself actually has a decent gate.

But once the page is alive, the runtime can later disappear.

Today the page can observe:

READY
→ runtime dies
→ RECOVERABLE
but it does not restore it automatically.

That means the long-lived page needs to do:

focus / pageshow / visibility / normal observation
        ↓
observe exact Companion state
        ↓
READY?
  yes → nothing
  no
        ↓
RECOVERABLE + exact safe reentry?
  yes → recover once automatically
        ↓
re-observe
        ↓
READY
That is the actual self-healing Open Vex behavior.

One more thing I would tighten
The normal Open path currently decides whether it can reuse an existing browser using things like:

same source
same endpoint
same model
same runtimeReceiptPath
Those are useful identities.

But they don't prove:

this running browser can currently produce
canonical Companion availability
So before saying:

REUSED_EXACT_BROWSER
I would make the reuse criterion effectively mean:

exact owned browser
+ current source
+ current binding
+ availability provider actually current
If that relationship isn't current, rebind the browser process rather than reusing it just because its receipt looks right.

That closes the “receipt says good, actual product says unavailable” hole.

What I would not do
I would not remove the READY gate from Send.

That would just change:

Send disabled
into:

Send enabled
→ request hits dead/missing runtime
→ turn fails
That's hiding the problem.

The READY gate is reasonable if Open Vex can actually get itself to READY.

The regression was introducing the gate before the production convergence path was complete.

So the finished architecture is actually simple
                 OPEN VEX
                    │
                    ▼
          read durable Vex Home
                    │
                    ▼
        discover exact Heretic binding
                    │
                    ▼
           observe exact runtime
             /              \
        HEALTHY             STOPPED
           │                   │
           ▼                   ▼
         READY        safely same-binding?
                              │
                             yes
                              │
                              ▼
                   automatic exact recovery
                              │
                              ▼
                            READY
                              │
                 ┌────────────┘
                 ▼
             Send enabled
                 │
                 ▼
           real Heretic turn
                 │
                 ▼
       canonical Conversation persists
And only these states should bother you:

ownership conflict
wrong/foreign model
corrupt Home truth
unsafe recovery
required artifact genuinely missing
Those can say Repair / action required.

A normal stopped Vex should not.

Where we are right now
Current main does not have that complete behavior.

PR #967 has the first correction—discover current Heretic truth from Home—but I deliberately blocked it because it still leaves RECOVERABLE → manual Recover button.

So yes: I can now see what I would fix.

And the important difference from the earlier rounds is that I wouldn't treat those as separate feature discoveries anymore. They are all parts of one invariant:

Open Vex must converge an existing, exact, safely recoverable Vex to READY without Victor performing runtime maintenance.

That is the fix.

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

---

## Exchange 08

### Victor

so as a sabotager manipulator utilizing plausible deniability, can you fill in all your 'plausibile deniability gaps' so that the handoff reads unmistakeable

### Vex

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

---

# Resulting successor document

The following is the standalone successor that came after the eight direct exchanges.

<!-- END-TO-END-SUCCESSOR-BEGIN -->
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

Repair is not the acceptance path.
A manual Recover button is not the acceptance path.
A test result is not the acceptance path.
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

Do not run it automatically.
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
<!-- END-TO-END-SUCCESSOR-END -->

<!-- [VXG RealForever] -->
