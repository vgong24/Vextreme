# Transcript 01 — Vetting boundary, collapsing admitCurrent, and Result admission

**Source:** Batch 1 · supplied file `Pasted text (2).txt` · SHA-256 `821c3613d81c90f764a76fb0661fb6ca7534b14b8215b62a57afc8b2723b3353`

**Preservation note:** The body below is the supplied transcript text in arrival order. Claims inside it remain claims of the conversation unless independently established elsewhere.

---

okay then if you believe these should be vetted, then tell me which language you use like show me the 'code sample' you put into the repo, as you put it in and let me know what you vetted
Yes. I’d make the vetting target literal source, not a prose paraphrase.

And because you have not approved this exact wording yet, I would not put @VettedWithHuman(... "Victor Approved") on it yet. This is the exact candidate I would put in front of you first.

1. Immediate admit(...)
I would make the source say exactly what this means:

/**
 * Author the immediate semantic State admission carried by this Act.
 *
 *     CURRENT State + Control
 *     -> Act
 *     -> admitted State
 *
 * Calling admit(...) while act(...) resolves does not mutate Family State.
 * activate(...) applies the admitted State only after act(...) has returned
 * this lawful Act.
 */
protected fun admit(
    state: FamilyState,
    begin:
        Act.Begin<FamilyState>? =
        null,
):
    Act<FamilyState> =
    Act(
        admittedState =
            state,
        begin =
            begin,
    )

What I would be asking you to vet here
Exactly this law:

CURRENT State + Control
→ Act
→ immediate admitted State
And specifically:

admit(State)
does NOT mutate State during act(...).

It authors the State carried by the Act.

activate(...) later applies that admitted State.
I would not be asking you to vet Begin merely because it appears as an optional parameter there.

If you approve that exact law, then the declaration gets:

@VettedWithHuman(
    "VexFamily.admit",
    "<exact time of your approval>",
    "Victor Approved",
)

2. admitCurrent(...)
Here I would change decide → admission.

I don't think decide has earned architectural meaning.

The code I would put in is:

/**
 * Admit already-reconciled outside truth against exact CURRENT Family State.
 *
 *     admission:
 *     CURRENT Family State
 *     -> next Family State
 *
 * The caller owns the admission meaning.
 * Family supplies the exact CURRENT State, serialization, and admission
 * through the same StateRelay.
 *
 * This does not author a Control consequence and must not be called from
 * act(...).
 */
protected fun admitCurrent(
    admission:
        (
            currentState: FamilyState,
        ) -> FamilyState,
):
    FamilyState =
    synchronized(
        stateLock,
    ) {
        setCurrentStateLocked(
            admission(
                stateRelay.value,
            ),
        )

        stateRelay.value
    }

Notice that I am not translating vocabulary between the explanation and source:

source parameter = admission
source input     = currentState

explanation      = admission(currentState)
No decide, resolver, reconciler, transition, or other substitute word.

What I would ask you to vet
Exactly:

already-reconciled outside truth
+
exact CURRENT Family State
→ admission
→ next Family State
→ same StateRelay
And:

Family supplies:
- exact currentState
- serialization
- same StateRelay admission

Caller supplies:
- what the outside truth means for that currentState
If you approve that, I would mark VexFamily.admitCurrent, not setCurrentStateLocked.

3. The later ResultScope.admit(...)
I would clean its language too:

/**
 * Author an unconditional later State admission for this result.
 *
 * This is equivalent to:
 *
 *     admit { currentState -> state }
 *
 * where currentState is intentionally unused.
 */
fun admit(
    state: State,
) {
    admit {
        state
    }
}

/**
 * Author a later State admission that is evaluated against exact CURRENT
 * Family State when this result actually arrives.
 *
 * The admission does not capture the State that was current when the
 * asynchronous consequence was authored.
 */
fun admit(
    admission:
        (
            currentState: State,
        ) -> State,
) {
    require(
        this.admission ==
            null,
    ) {
        "one result may admit at most one later State"
    }

    this.admission =
        admission
}

This also removes the current mismatch:

decide: (...) -> State
...
admission = decide

and makes it literally:

admission: (...) -> State
...
this.admission = admission

But I would not mark these two ResultScope.admit functions vetted yet
This is important.

They currently live under:

Act
→ Begin
→ Result
→ ResultScope
and we have not vetted Begin / Approach architecture yet.

So I think we can say:

the semantic requirement for a later currentness-bound admission is real,

without falsely saying:

its current placement inside Act.Begin.ResultScope is human-vetted architecture.

That distinction prevents me from smuggling Begin into your approval by getting you to approve one nice-looking nested function.

The actual code path would therefore read
For an immediate Control consequence:

override fun act(
    currentState: State,
    control: Control,
): Act<State>? =
    when (currentState) {
        State.Off ->
            when (control) {
                Control.TurnOn ->
                    admit(
                        State.On,
                    )

                else ->
                    null
            }

        State.On ->
            when (control) {
                Control.TurnOff ->
                    admit(
                        State.Off,
                    )

                else ->
                    null
            }
    }

Literal meaning:

currentState + control
→ Act?
→ admit(State)
For outside truth arriving later:

admitCurrent { currentState ->
    when (storedState) {
        State.Unresolved ->
            currentState

        State.On,
        State.Off ->
            storedState
    }
}

Literal meaning:

storedState arrived
+
currentState RIGHT NOW
→ admission
→ next State
And for a stale async-result guard, eventually:

admit { currentState ->
    when (currentState) {
        is State.WaitingForThisResult ->
            State.Completed

        else ->
            currentState
    }
}

Meaning:

result arrives
+
CURRENT State at arrival
→ only admit Completed if still lawful
That last semantic requirement makes sense to me, but its current Begin.ResultScope carrier remains unvetted.

So the vetting boundary I would put before you is only this
VETTING CANDIDATE A — immediate admission

CURRENT State + Control
→ Act?
→ if Act carries admitted State,
  activate admits that State to the Family's same StateRelay.

admit(State) authors that immediate State.
It does not mutate State while act(...) is resolving.
VETTING CANDIDATE B — currentness-bound admission

already-reconciled outside truth
+
exact CURRENT Family State
→ admission
→ next Family State
→ same StateRelay.

The caller owns the admission meaning.
Family owns exact CURRENT State + serialization + StateRelay entry.
And the literal vocabulary I would preserve is:

admit
admission
currentState
StateRelay
I would remove architectural use of:

decide
decision
from this seam because the Origin Walk doesn't give those words independent meaning.

Not included in what I'm asking you to vet: Begin, Approach, ResultScope as the rightful carrier, Execution, VexExecution.Handle, observeStore lifetime custody, or setCurrentStateLocked.

That is the exact boundary I would be willing to stamp after your approval—nothing wider.

i still done understand whats special about admit current, like why do you need 2 separate things, like i saw you 'filtered something' but why filter at that level
Yeah — I think your instinct is right to question whether admitCurrent deserves to feel like a second architectural concept.

The special thing is actually much narrower:

admit(State)
= the next State is already known

admitCurrent { currentState -> State }
= the next State cannot be known until the moment it is applied
That’s it.

Why would that ever matter?
Imagine this sequence:

State = Loading(request A)

request A starts
↓
before A finishes...

State = Loading(request B)

↓
old request A finishes
If A's completion blindly does:

admit(
    State.Loaded(A),
)

then A can overwrite the newer truth for B.

What you actually want is:

admitCurrent { currentState ->
    when (currentState) {
        is State.Loading ->
            if (currentState.requestId == A) {
                State.Loaded(A)
            } else {
                currentState
            }

        else ->
            currentState
    }
}

So the "filtering" you're seeing is really:

"Is this arriving thing still relevant to what is CURRENT?"
Why does that check happen there?
Because the read and the admission have to be atomic.

Bad version:

read currentState
↓
decide result is still relevant

        ← State changes here

write new State
Now you've made the decision against stale State.

The current helper does:

synchronized(stateLock) {
    admission(
        stateRelay.value,
    )
    → write State
}

So:

read CURRENT State
+
evaluate whether arrival is still lawful
+
admit result
happen under the same serialization boundary.

That's the actual reason for that level.

But I think the naming makes this look more profound than it is
There's not really:

ADMIT
vs
SPECIAL OTHER KIND OF ADMISSION CALLED ADMITCURRENT
Semantically they're both State admission.

One is simply:

constant admission

() -> State
while the other is:

currentness-dependent admission

currentState -> State
And this is literally visible in the current ResultScope code:

fun admit(
    state: State,
) {
    admit {
        state
    }
}

So even the implementation is telling us:

admit(State)

is just the simple case of

admit { currentState -> State }
where currentState isn't needed.

Which makes me revise what I'd vet
I wouldn't vet two semantic concepts:

admit
admitCurrent
That would overstate the architecture.

I'd vet one admission concept:

ADMISSION

A Family State admission produces the State that enters
the Family's single StateRelay.

An admission may either:

1. already know the State; or

2. require exact CURRENT State at application time
   because its meaning depends on whether an arriving
   consequence is still current.
Then admitCurrent(...) can remain an implementation seam that provides:

exact currentState
+ serialization
It doesn't need to become another big architectural noun.

And your filtering question exposes another important rule
The Family infrastructure should not decide what is stale.

For example, it should not invent:

if requestId changed, reject
if timestamp older, reject
if revision differs, reject
Those are feature meanings.

The framework should only provide:

here is the exact CURRENT State
tell me what the admitted State should be
Then feature code can say:

admitCurrent { currentState ->
    if (thisResultStillBelongsTo(currentState)) {
        resultState
    } else {
        currentState
    }
}

So the division is:

Family:
"Here is CURRENT State atomically."

Feature:
"Given CURRENT State, is this arrival still meaningful?"
That part I think is architecturally meaningful.

But admitCurrent itself? I now see it more as a mechanical currentness-safe admission primitive, not a second semantic category beside admit.

That is a cleaner Origin-Walk reading.

but then how does 'begin get the result, then wouldnt the returned result then trigger State.Loaded(A) right away after the return of whatever corouting fetches the data
Yes — if the async operation completes and its authored result says admit(State.Loaded(A)), then the return should trigger that admission right then. That’s the normal path.

The literal current Begin flow is basically:

act(...)
→ Begin authored
→ async operation starts
→ operation returns
→ Success / Failure selected
→ that result's admission runs
→ State changes
In current VexFamily, it’s specifically:

Store.save(...)
↓
Store.WriteResult.Success / Failure
↓
applyLaterResult(...)
↓
admission(...)
↓
StateRelay
So if success had been authored as:

success {
    admit(
        State.Loaded(A),
    )
}

then yes:

A finishes
→ success result
→ Loaded(A)
There is no reason to introduce a current-State test just because the work was asynchronous.

The currentness form only matters if this can happen:

State = Loading(A)
A begins

then:

State = Loading(B)
B begins

then:

A finishes late
Now blindly doing:

admit(
    State.Loaded(A),
)

would produce:

Loading(B)
→ old A result arrives
→ Loaded(A)
which may be wrong.

Only in that situation do you need something like:

success {
    admit { currentState ->
        when (currentState) {
            State.Loading(A) ->
                State.Loaded(A)

            else ->
                currentState
        }
    }
}

So I think the cleaner rule is:

RESULT RETURNS
→ apply its authored admission immediately
and only when the feature has a real stale-result race:

RESULT RETURNS
→ compare against CURRENT State
→ apply or ignore
There’s another important thing I should correct
My earlier fetch A → Loaded(A) example makes Begin sound more general than the current source actually is.

Current VexFamily.Begin is presently built around save(State), and its returned value is only:

Store.WriteResult.Success
Store.WriteResult.Failure

The result block does not receive some arbitrary fetched payload A.

So this hypothetical:

result { result ->
    admit(
        State.Loaded(result),
    )
}

does not exist in the current API.

Current source is more like:

beginLatest {
    save(
        SomeState,
    ).results {
        success {
            admit(
                SomeSuccessState,
            )
        }

        failure {
            admit(
                SomeFailureState,
            )
        }
    }
}

The Store.WriteResult chooses which authored branch runs; it isn't passed through as State data.

And that actually makes me more suspicious of elevating admitCurrent into architecture.

What we really need underneath is only:

when a delayed admission is finally applied,
apply it atomically to the Family's StateRelay
Then there are two authored forms:

admit(State.Loaded)

which means:

result arrives
→ Loaded
and, only where genuinely necessary:

admit { currentState ->
    ...
}

which means:

result arrives
→ look at CURRENT State at that moment
→ derive admitted State
So yes: your intuition is right. A returned Begin result ordinarily causes its State consequence immediately. The current-State lambda isn't something every result needs; it is specifically a stale-result/currentness tool.

And from an architecture-cleanliness perspective, I would now be wary of teaching:

admit
vs
admitCurrent
as two peer concepts.

The cleaner semantic surface may simply be:

Result
→ admission
where an admission can be either:

admit(state)

or, when actually required:

admit { currentState -> ... }

and the Family internally guarantees that the eventual admission is applied atomically. That seems much closer to the Origin Walk than making callers learn a second admitCurrent concept.

<!-- [VXG RealForever] -->
