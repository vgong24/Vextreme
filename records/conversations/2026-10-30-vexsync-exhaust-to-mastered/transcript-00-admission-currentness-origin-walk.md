# Transcript 00 — Admission, currentness, Origin Walk, and plausible-deniability pressure

**Source:** Batch 1 · supplied file `Pasted text.txt` · SHA-256 `31c2655f0ca8b781c573745a5f94a6444d09c80f593d0214236011f7df0c2ee9`

**Preservation note:** The body below is the supplied transcript text in arrival order. Claims inside it remain claims of the conversation unless independently established elsewhere.

---

what are the use cases for admit and admitCurrent , and whats 'decide'
Yep. The names are close enough that it’s worth making the distinction concrete.

admit(...)
This is used while act(currentState, control) is authoring the immediate consequence of a Control.

Example from ThemeModeFamily:

when (currentState) {
    ThemeMode.NotSet ->
        admit(
            control.mode,
            begin = persistence,
        )
}

Meaning:

CURRENT State = NotSet
Control = Select(Dark)

act(...)
→ admit(Dark)

activate(...)
→ State becomes Dark
So:

admit(State)
=
"This accepted Control should immediately make this
the Family's semantic State."
It doesn't mutate State at the moment act() calls it. It builds an Act describing what activate() will apply.

And:

stay()

means:

accepted Control
but immediate State stays the same
while:

null
means:

there is no lawful Act for this State + Control
admitCurrent(...)
This is for a different time boundary.

Something happened or arrived outside the original synchronous act(...) decision, and now we need to reconcile it against whatever the Family's State is right now.

Current source:

protected fun admitCurrent(
    decide: (
        currentState: FamilyState,
    ) -> FamilyState,
): FamilyState

So:

outside/delayed truth arrives
↓
Family obtains exact CURRENT State
↓
feature decides what that arrival means NOW
↓
result goes into same StateRelay
A concrete use case already in #204 is Store restoration.

ThemeMode does roughly:

observeStore(...) { currentState, storedState ->
    when (storedState) {
        ThemeMode.NotSet ->
            currentState

        ThemeMode.Light,
        ThemeMode.Dark ->
            storedState
    }
}

Suppose the app starts:

Family currentState = NotSet
Stored State = Dark
Then:

admitCurrent
→ receives currentState = NotSet
→ Store reconciliation says Dark
→ same StateRelay becomes Dark
But suppose:

Family currentState = Light
Stored State = NotSet
The ThemeMode rule says:

NotSet shouldn't overwrite an already resolved current State
so it returns:

currentState
and Light remains Light.

That is exactly why this isn't just:

setState(storedState)

The arriving thing may need interpretation against CURRENT State at the instant it arrives.

So what is decide?
Nothing magical. It's just a function parameter.

Literally:

decide: (currentState: FamilyState) -> FamilyState

means:

“Give me the actual current State, and I'll give you the State that should be current after considering this already-reconciled arrival.”

For example:

admitCurrent { currentState ->
    if (someArrivalIsStillRelevant(currentState)) {
        SomeNewState
    } else {
        currentState
    }
}

So decide is feature-owned meaning, not another architectural object.

I actually think the name deserves scrutiny, because by itself decide is vague. The semantic equation is clearer than the name:

CURRENT Family State
+ already-arrived/reconciled truth
→ next Family State
The clean distinction
CONTROL arrives
↓
act(currentState, control)
↓
admit(State)
↓
Act says what should happen immediately
versus:

outside/delayed truth arrives later
↓
admitCurrent { currentState -> ... }
↓
interpret it against CURRENT State at arrival time
↓
same StateRelay
And there's one extra connection worth seeing:

A delayed Begin result can author:

result {
    admit { currentState ->
        ...
    }
}

That stored function later gets applied through admitCurrent(...) when the result actually arrives.

So that path is deliberately:

author future consequence
        ↓
time passes / async work happens
        ↓
result arrives
        ↓
get CURRENT State now
        ↓
apply authored current-State decision
That part makes sense to me conceptually. The separate question is whether decide is the right name and whether admitCurrent is the clearest possible name for that seam.

'is that the right language from an origin walk perspective?
From an Origin Walk perspective, I’d split them pretty sharply:

admit — yes, this is rooted language
admit has a clear origin and purpose. It was introduced specifically to replace older .to<State>() language because “to” sounded like a promised eventual provider outcome, while the actual meaning was:

CURRENT semantic relationship
→ accepts consequence
→ immediately admits semantic State
That’s a strong origin.

The historical wording was essentially:

Idle + Locate
→ RequestCurrentLocation
→ admit Finding
while the provider could later truthfully report something else.

So admit is good semantic vocabulary.

admitCurrent — useful, but I would not treat the exact name as deeply vetted yet
This one is later.

It first shows up in the StateRelay/currentness work as:

protected fun admitCurrent(
    decide: (
        currentState: FamilyState,
    ) -> FamilyState,
)

And its own Origin-Walk-era comment is revealing:

Concrete-Family semantic admission for already-reconciled outside truth.

This protected seam only supplies exact CURRENT State + serialization;
it does not decide what an observation means.
Even more importantly, the comment says:

keep the public/source-specific name on the concrete Family
(for example providerReconciled)

That tells me admitCurrent was never intended to become the human-facing semantic event name.

It is a protected Family seam.

So I would describe its origin law as:

already-reconciled outside truth
+
exact CURRENT Family State
→ one serialized State admission
→ same StateRelay
That law looks good.

But the spelling:

admitCurrent
is slightly ambiguous.

It could mean:

"admit the current State"
when what it really means is closer to:

"perform an admission against exact CURRENT State"
So I would vet the relationship before vetting the method name.

decide — no, I would not elevate that word
This is where my earlier explanation gave it too much semantic weight.

Historically, decide is just the local parameter name:

decide: (currentState: State) -> State

And look at what the implementation immediately does with it:

admission = decide

The durable concept already present in the source is actually:

admission
not decide.

Likewise, the Origin-Walk comment says:

the caller supplies meaning
—not that Decision is some architectural noun.

So from an archaeology perspective:

admit       = earned semantic verb
admission   = earned semantic consequence/function
CURRENT     = earned currentness coordinate
decide      = local implementation verb
I would not create or vet an architectural concept called Decision from this.

There is an even cleaner way to understand the two admissions
The family currently has two different moments:

CONTROL-TIME

act(currentState, control)
→ Act
→ admit(State)
Here the State is authored now, as part of the Control relationship.

Versus:

ARRIVAL-TIME

some previously authored / externally reconciled truth arrives
→ obtain exact CURRENT State now
→ apply its admission against that CURRENT State
→ StateRelay
The second one is really currentness-bound admission.

And the old source already accidentally tells us that with its nouns:

Result.admission

followed later by:

apply that admission against CURRENT State
That feels more origin-faithful than treating decide as meaningful.

What I would put in front of you for vetting
Not:

admitCurrent(decide)
as a sacred API phrase.

I’d put this law in front of you:

ADMISSION

An admission is Family-owned State meaning.

Immediate admission:
CURRENT State + Control
→ Act
→ admitted State

Later/outside admission:
already-reconciled arrival
+ exact CURRENT Family State at arrival time
→ admitted State

Both enter the same Family StateRelay.
And then separately ask whether the implementation spelling should remain:

admitCurrent { currentState -> ... }

or become something that maps more literally to the law.

My current read is:

admit          ✅ strongly origin-grounded
admission      ✅ strongly origin-grounded
currentState   ✅ strongly origin-grounded

admitCurrent   🟨 mechanism name worth reviewing
decide         ❌ not architecture; just a parameter name
And I would not annotate decide with anything. It hasn’t earned that status.

how does result { admit { current State mean any different than just result { result -> admit(result), like what do you perceive and also considering your sabotage lens, can you close the gaps of avoidance or plausible denability when speaking with or to me
Yes. Looking at the literal code, there’s a much cleaner answer than the way I was talking about it before.

Inside ResultScope, these two are actually equivalent:

admit(SomeState)

and:

admit { currentState ->
    SomeState
}

because the source literally implements the first one as:

fun admit(state: State) {
    admit {
        state
    }
}

So if the lambda does not use currentState, there is no semantic difference. The first is just shorthand for a constant later admission.

The only reason the second form exists is this case:

admit { currentState ->
    if (currentState is StillWaitingForThisResult) {
        Completed
    } else {
        currentState
    }
}

That means:

author the consequence now
↓
async work happens
↓
time passes
↓
result arrives
↓
read the actual CURRENT State at that later moment
↓
only admit the new State if it is still lawful
That is genuinely different.

But result { result -> admit(result) } is another thing entirely
The current API does not actually have that shape.

The operation returns:

Store.WriteResult

which today is basically:

Success
Failure(cause)
Then the Family selects either:

save.results.success

or:

save.results.failure

and applies that branch's previously-authored admission.

So the literal current flow is:

Store result arrives
↓
Success or Failure branch selected
↓
branch contains optional admission function
↓
admitCurrent(admission)
↓
admission receives exact currentState
↓
next State
There is no result value passed into the admission lambda.

So if I wrote:

result { result ->
    admit(result)
}

I would be introducing a new semantic relationship:

provider/operation result
→ Family State
That is not what the current architecture says.

And depending on what result is, that could be nonsense. A Store.WriteResult.Success is not a Family State.

There is another ambiguity I think you just exposed
We currently use the word admit in two different temporal contexts.

At Control time:

act(currentState, control) {
    admit(NewState)
}

means:

this Act immediately admits NewState
when activate applies the Act
But inside a Begin result:

success {
    admit(NewState)
}

means:

if this asynchronous result arrives later,
then admit NewState at that later time
Same verb, different time.

That may be legitimate because both are genuinely State admission, but the surrounding scope is doing a lot of work to tell the reader when.

And this form:

success {
    admit { currentState ->
        ...
    }
}

means something still more specific:

later result
+
CURRENT State at result-arrival time
→ admitted State
So I would write the semantic distinctions as:

ACT ADMISSION

CURRENT State + Control
→ Act
→ immediate admitted State
versus:

RESULT ADMISSION

async result arrives
→ select Success / Failure consequence
→ admission evaluated against CURRENT State at arrival
→ admitted State
Where currentState actually matters
These are equivalent:

admit(Finished)

admit { currentState ->
    Finished
}

These are not equivalent:

admit(Finished)

admit { currentState ->
    when (currentState) {
        is StillWaiting -> Finished
        else -> currentState
    }
}

The second protects against a stale async result overwriting newer truth.

That is the real earned use case.

And yes — on the plausible-deniability problem
I can tighten how I speak with you so you don't have to discover afterward that I quietly moved between literal code and my interpretation.

For architecture work, I should use this discipline:

SOURCE:
exact identifier / exact source behavior

MEANING:
what I believe that source means

INFERENCE:
anything I am deriving rather than reading

PROPOSAL:
anything I think should change
So for this exact question I should say:

SOURCE:
ResultScope.admit(state) delegates to
ResultScope.admit { state }.

FACT:
Those forms are behaviorally identical when the lambda
ignores currentState.

SOURCE:
The lambda form receives currentState when the async
result is eventually applied.

MEANING:
Its additional capability is stale-result/currentness
reconciliation.

NOT SOURCE:
"result { result -> admit(result) }"
does not exist in the current API.

PROPOSAL:
If we ever want provider result payload to participate
in State admission, that must be separately surfaced
and vetted.
That closes one of the loopholes I was leaving open before: I can't casually paraphrase a nonexistent API into existence and then discuss it as though we were reviewing source.

And another rule I think you should hold me to:

If two code forms are literally equivalent, I should say “equivalent” before inventing architectural language to distinguish them.

Here, admit(state) and admit { state } are exactly that case. The only extra architecture is earned when currentState actually participates in the later admission.

<!-- [VXG RealForever] -->
