# Transcript 03 — Act timeline, worst-case async pressure, and the single State-authoring doorway

**Source:** Batch 2 · supplied file `Pasted text.txt` · SHA-256 `5998b8f2ada39d71f6d053162ccc34aba4b397d5cc6e722ea184e1ce96a5561f`

**Preservation note:** The body below is the supplied transcript text in arrival order. Claims inside it remain claims of the conversation unless independently established elsewhere.

---

I remember there was a conversation about the 'state changing first before begin and after' like the 3 ways to change the outcome, and we already vetted handled that in a prior thread so yeah the 'stay' language was working before, can you find that context
Yes — I found the durable context, and your memory is basically right.

I didn’t recover the exact old chat transcript, so I won’t pretend I did. But the source/PR history preserves the design that conversation produced very clearly.

The important origin commit is e631e7cb… — “Root Act and Begin under Family”. Its activate(...) order was literally:

act.admittedState
    ?.let(
        ::setCurrentState,
    )

act.begin
    ?.let(
        ::execute,
    )

So an Act's admitted State is applied before Begin starts. That wasn't an interpretation; that was the actual source ordering.

And the same source had:

stay(
    begin = begin { ... }
)

which constructs:

admittedState = null
begin = Begin(...)
Meaning:

Control accepted
→ State stays as-is
→ Begin runs
Then its test beginSaveSuccessMayAdmitTheAuthoredLaterState() proves the third temporal point:

initial State = Empty

activate(Commit("loaded"))
→ returns true
→ currentState is STILL Empty

Begin / Store operation completes

success {
    admit(Ready("loaded"))
}

→ currentState becomes Ready("loaded")
So the old model was effectively:

                    ACT
                     │
          ┌──────────┴──────────┐
          │                     │
 immediate State            optional Begin
 admission                  consequence
          │                     │
          │                     ↓
          │                async operation
          │                     │
          │                Success / Failure
          │                     │
          │              optional later State
          │                  admission
          ↓                     ↓

 BEFORE BEGIN            AFTER BEGIN RESULT
And stay(begin=...) was the deliberate middle case:

NO immediate State admission
+
YES Begin
while admit(state, begin=...) supports:

YES immediate State admission
+
YES Begin
and the result can optionally admit again afterward.

So rather than “three different APIs,” the simpler model was three points on one Act timeline:

1. BEFORE BEGIN
   Act may immediately admit State.

2. WHILE BEGIN RUNS
   State may simply stay where it is.

3. AFTER BEGIN RESULT
   Success/Failure may optionally admit another State.
That matches what you were remembering.

There’s also unusually direct durable confirmation in PR #196. Its description says the regression protects all three stages:

immediate State admission still happens
Begin still reaches Store.save
Store success still admits the authored later State
And its later review says the same thing in slightly different words:

immediate activation/admission
+
asynchronous Store-success admission
Then PR #198 dealt with the separate currentness problem, and explicitly preserved:

Family.activate(control)
→ act(CURRENT State, Control)
→ stay / admit
→ authored Begin consequence
plus delayed result admission.

#198 itself was retired because its commits were DCO-invalid, not because that semantic model was rejected. Its intended source/currentness work was reissued onto PR #201, which is merged.

That distinction is useful:

BASIC ACT TIMELINE
immediate admission
→ optional Begin
→ optional result admission

already existed before the later currentness work.
Whereas:

"when a delayed result arrives,
should it reconsider exact CURRENT State?"
was a later refinement.

So under Subtractive Completion, I would now correct our vetting queue:

stay() is not a fresh architecture invention we need to reopen. It belongs to the already-established Act/Begin temporal model you remember.

The clean semantic set is:

null
= no lawful Act

stay()
= lawful Act with no immediate State admission

admit(State)
= lawful Act with immediate State admission

optional Begin
= consequence that starts after the Act's immediate admission/stay

Begin Success / Failure
= may optionally admit a later State
And importantly, this makes admitCurrent look even less like something that deserves promotion into a peer architectural concept. The original model already had a very simple place for later result admission. The later currentness mechanism should be judged only on whatever additional concrete race it actually closes—not used to redefine this already-working timeline.

That’s the context I think you were remembering.

ugh thats a lot of failure PRs huh, okay one at time show me the 'complex case'
Yep. One case only. The most complex shape is:

Control accepted
→ State changes immediately
→ Begin starts
→ async work finishes
→ Result changes State again
In code, conceptually:

override fun act(
    currentState: State,
    control: Control,
): VexFamily.Act<State>? =
    when (currentState) {
        State.Idle ->
            when (control) {
                is Control.Load ->
                    admit(
                        State.Loading,
                        begin =
                            begin {
                                save(
                                    State.Loading,
                                ).results {
                                    success {
                                        admit(
                                            State.Loaded,
                                        )
                                    }

                                    failure {
                                        admit(
                                            State.Failed,
                                        )
                                    }
                                }
                            },
                    )
            }

        else ->
            null
    }

The important ordering is literally:

CURRENT = Idle

Control.Load
↓
act(...)
↓
admit(Loading, begin = ...)
↓
activate applies Loading FIRST

CURRENT = Loading
↓
Begin starts
↓
async save/work happens
↓
Success
↓
admit(Loaded)

CURRENT = Loaded
Or failure:

Idle
→ Loading
→ Begin
→ Failure
→ Failed
So there are two admissions in one accepted Act lifecycle:

immediate admission
Idle → Loading

later result admission
Loading → Loaded
stay(begin = ...) is just the simpler sibling where the first arrow disappears:

Idle
→ stay
→ Begin
→ Loaded
The thing I would call the complex case is therefore:

admit(StateA, begin = ...)
                 ↓
             Result
                 ↓
           admit(StateB)
No admitCurrent, no decide, no extra semantic noun required to express that basic before-Begin / after-Begin behavior.

And one precision: this is the structural capability the Family API supports; I’m not claiming this exact Idle/Loading/Loaded feature existed in the historical source.

damn how do professionals usually organize or handle this worst case condition, like do they not even allow for the 'begin' thing to happen inside?
Yeah — the professional pattern usually isn’t “never allow an async thing to be associated with the transition.” It’s more:

The state-transition logic may describe an effect, but it does not execute that effect or directly own the later state change.

That distinction matters a lot.

A common professional shape is:

CURRENT State + Event
→ Transition(
    nextState,
    Effect?
)
Then the runtime does:

apply nextState
↓
run Effect
↓
Effect completes
↓
emit another Event
↓
CURRENT State + that Event
→ next Transition
So your worst case:

Idle
→ Loading
→ async work
→ Loaded / Failed
becomes:

when (currentState) {
    Idle ->
        when (control) {
            Load ->
                Transition(
                    state = Loading,
                    effect = FetchData,
                )
        }

    Loading ->
        when (control) {
            is FetchSucceeded ->
                Transition(
                    state = Loaded(control.data),
                )

            is FetchFailed ->
                Transition(
                    state = Failed,
                )
        }
}

Notice what disappeared:

success {
    admit(...)
}

failure {
    admit(...)
}
The async operation does not contain another State transition DSL.

It merely produces another event/control.

That gives you one single rule for all State changes:

CURRENT State + Control
→ Act
→ State
instead of two:

Control → Act → State

AND

Begin Result → hidden nested admission → State
So do professionals allow something like begin?
Often, yes — but only as an effect description.

For example, this is perfectly normal:

admit(
    State.Loading,
    effect = FetchThing(id),
)

Conceptually:

State consequence = Loading
Effect consequence = FetchThing
The framework then runs FetchThing.

But when it finishes, the professional-style architecture usually routes completion back through the same front door:

FetchThing succeeds
→ Control.FetchSucceeded(data)

FetchThing fails
→ Control.FetchFailed(error)
Then:

act(currentState, control)
gets called again.

That is very common in Redux-like reducers, Elm, actor/state-machine systems, unidirectional-data-flow architectures, and reducer/effect systems generally.

Why that's attractive
Because there is only one place where State meaning is decided:

act(CURRENT State, Control)
You don't need to remember:

some State changes happen in act
some State changes happen inside Begin
some happen in ResultScope
some happen through admitCurrent
some happen through Store observation
That explosion is exactly the complexity you've been reacting to.

Instead:

EVERY CAUSE
→ becomes a Control/Event
→ act(currentState, control)
→ stay / admit
Very boring. Which is good. 😄

There is one tradeoff
You can overdo this and end up with junk Controls like:

SaveStarted
SaveSucceeded
SaveFailed
SaveTimedOut
SaveRetrying
SaveCancelled
SaveCleanupFinished
for every implementation detail.

Professionals usually avoid that by making only semantically meaningful results re-enter the state machine.

For example:

Load
LoadSucceeded(data)
LoadFailed(reason)
makes sense.

But:

CoroutineStarted
DispatcherSwitched
HttpBodyRead
does not belong in semantic Control.

So the rule would be:

Only a completion that can change Family meaning earns a Control/Event.

Applied to your Vex shape
With the subtractive lens, I actually think this is cleaner than the current nested Begin.ResultScope.admit(...) design.

Something like:

override fun act(
    currentState: State,
    control: Control,
): Act<State>? =
    when (currentState) {
        State.Idle ->
            when (control) {
                Control.Load ->
                    admit(
                        State.Loading,
                        begin =
                            begin {
                                fetch(...)
                            },
                    )

                else ->
                    null
            }

        State.Loading ->
            when (control) {
                is Control.Loaded ->
                    admit(
                        State.Ready(
                            control.value,
                        ),
                    )

                is Control.LoadFailed ->
                    admit(
                        State.Failed,
                    )

                else ->
                    null
            }

        else ->
            ...
    }

And then Begin only means:

run this consequence
not:

run this consequence
AND secretly contain another miniature State machine
AND later mutate Family State from inside it
That is a pretty meaningful simplification.

Even cleaner
Maybe:

admit(
    State.Loading,
    effect = Effect.Load(...)
)

rather than making Begin itself a deep nested DSL.

Then the runtime understands:

Act
├── admittedState
└── optional Effect
and effect completion comes back through Control.

That's basically the professional reducer/effect model in one line.

The strongest invariant becomes
ONLY act(currentState, control)
may author semantic Family State.
Everything else:

provider
repository
store
async operation
timer
network
model
another Family
must eventually present meaningful input back to the Family.

Then the Family decides:

CURRENT State + that input
→ stay / admit / null
That eliminates a lot of our questionable surfaces at once:

ResultScope.admit      potentially unnecessary
admitCurrent           potentially unnecessary as semantic API
decide                 unnecessary
later nested admission unnecessary
You may still need an internal lock/serialization mechanism, but that's just mechanics.

My current design preference
For Vex specifically, I would investigate this as the simpler target:

Act
= immediate semantic State consequence
+ optional Effect/Begin description

Begin/Effect
= execution only

Begin/Effect result
= meaningful Control back into Family

ALL State changes
= act(CURRENT State, Control)
That feels much more consistent with the architectural law you already liked:

CURRENT State + Control → Act?
Instead of bolting a second State-transition language underneath Begin.

And importantly, I wouldn't change the code yet just because this looks cleaner. The next Origin-Walk question should be whether the original Family design ever intentionally required result-side direct admission, or whether that was convenience that accreted later. If it was convenience rather than a product requirement, this is a very promising subtraction.

<!-- [VXG RealForever] -->
