'use strict';

const fs = require('fs');
const path = require('path');
const test = require('node:test');
const assert = require('node:assert/strict');

const ROOT = path.join(__dirname, '..');
const PAGE = path.join(ROOT, 'pages', 'vexarchitecture-first-stable-body.html');
const STRINGS = path.join(ROOT, 'data', 'strings', 'source', 'pages', 'vexarchitecture-first-stable-body.json');

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8').replace(/\r\n/g, '\n');
}

function json(rel) {
  return JSON.parse(read(rel));
}

test('VEXARCHITECTURE GUIDE: builder journey precedes forensic provenance', () => {
  const page = read('pages/vexarchitecture-first-stable-body.html');
  const ids = [
    'problem',
    'discovery',
    'partner-circuit',
    'codebase',
    'theme-walk',
    'execution',
    'outside-truth',
    'presentation',
    'construction',
    'chronology',
    'convergence',
    'subtraction',
    'apply',
    'pressure',
    'forensics',
  ];

  let previous = -1;
  for (const id of ids) {
    const current = page.indexOf('id="' + id + '"');
    assert.ok(current > previous, id + ' must follow the prior guide layer');
    previous = current;
  }

  assert.equal(page.includes('class="proof-step"'), false, 'proof-attempt timeline must not dominate the main guide');
  assert.ok(page.indexOf('id="forensics"') > page.indexOf('id="pressure"'));
  assert.ok(page.includes('data-i18n="pages.vexarchitecture-first-stable-body.forensics.ledger"'));
});

test('VEXARCHITECTURE GUIDE: accepted code structure is visible and source-addressable', () => {
  const page = read('pages/vexarchitecture-first-stable-body.html');

  for (const required of [
    'VexMethod.kt',
    'VexFamily.kt',
    'VexPartner.kt',
    'CgmPartner.kt',
    'ConnectedPenPartner.kt',
    'InsulinPumpPartner.kt',
    'VexExecution.kt',
    'VexExecutionRoot.kt',
    'VexDependencyFactory.kt',
    'VexLogger.kt',
    'VexRelay.kt',
    'VexApplication.kt',
    'VexLifeSession.kt',
    'ThemeMode.kt',
    'VexConversationHybridRelay.kt',
    'EventsConvergenceRelay.kt',
  ]) {
    assert.ok(page.includes(required), 'missing real source anchor: ' + required);
  }

  assert.ok(page.includes('66c866dea6a8dd78e2946da88715c4deb78c1847'));
});

test('VEXARCHITECTURE GUIDE: Partner extends the causal model without becoming mandatory topology', () => {
  const page = read('pages/vexarchitecture-first-stable-body.html');

  for (const required of [
    'CORE CAUSAL SPINE',
    'rightful Method-result interpretation',
    'OUTSIDE / OBSERVATION',
    'VexPartner',
    'Connection.Conversion',
    'Partner Signal(s)',
    'Observation(Connection.Id + Signal)',
    'Receiver',
    'consumer-earned admission / reconciliation boundary',
    'EXTERNAL PARTICIPATION / OUTBOUND — WHEN EARNED',
    'CGM / INSULIN CONCRETE REALIZATION',
    'Family and Partner can complete a bidirectional circuit without becoming mirrors',
    'Partner ≠ mirrored Family',
    'Partner Source ≠ Connection.Id ≠ VexExecution.RelationshipId',
    'Receiver ≠ mandatory Store or Family',
    'Semantic ownership is the reusable rule; literal VexFamily is one reusable realization',
    'Names and interface implementations are observations, not architecture verdicts.',
    'a type that does not yet implement VexPartner.Connection is not thereby disqualified',
    'continue through the rightful Store/provider/platform boundary rather than stopping at “not Partner.”',
    'Do not choose Store/provider merely because existing code already uses one.',
    'Placement is evidence to inspect, not authority by existence.',
    'Existing ownership by itself is not proof of rightful ownership.',
  ]) {
    assert.ok(page.includes(required), 'missing reasoning-preserving Partner witness: ' + required);
  }

  assert.ok(page.includes('7800c17909fd03d1170ec0211a6632172c87d1af'));
  assert.ok(page.includes('Open the exact VexPartner source witness ↗'));
});


test('VEXARCHITECTURE GUIDE: real CGM pen and pump source cuts show what repeats and what stays local', () => {
  const page = read('pages/vexarchitecture-first-stable-body.html');

  for (const required of [
    'See the grammar survive three different source pressures',
    'class BleDecoder',
    'class HttpDecoder',
    'VexPartner.Connection.Conversion&lt;',
    'Observation(',
    'Connected Pen · same grammar, no CGM sequence law',
    'data class DoseRecorded(',
    'data class CartridgeObserved(',
    'Pump · Family authors meaning, Partner realizes participation',
    'family.activate(',
    'InsulinFamily.Act.Method.RequestPumpDelivery(',
    'act.launchWith(executionRoot)',
    'ACCEPTED != DELIVERED',
    'When to earn Partner instead of stopping at provider truth',
    'ordinary provider boundary',
    'external Source meaning matters',
    'same class name alone',
    'CgmPartner.kt · two representations → one Signal grammar ↗',
    'ConnectedPenPartner.kt · same Partner grammar without CGM continuity ↗',
    'InsulinFamily.kt · semantic Control → Effect → bound Method ↗',
    'InsulinPumpPartner.kt · acknowledgement ≠ delivery ↗',
    'InsulinPartnerLab.kt · outbound request + later inbound evidence ↗',
  ]) {
    assert.ok(page.includes(required), 'missing source-pressure bridge: ' + required);
  }

  assert.ok(page.includes('The pen keeps Source / Signal / Connection / Conversion / Observation / Receiver'));
  assert.ok(page.includes('it has no CGM acquisition epoch, sequence, or periodic-gap rule'));
  assert.ok(page.includes('Store and Family State remain unchanged until later DeliveryObserved evidence returns'));
});

test('VEXARCHITECTURE GUIDE: ThemeMode teaches semantic carriage rather than class-shape cargo culting', () => {
  const page = read('pages/vexarchitecture-first-stable-body.html');

  assert.ok(page.includes('Parameter.Mode(Dark)'));
  assert.ok(page.includes('SAME IN-PROCESS INSTANCE'));
  assert.ok(page.includes('Control.Select(parameter)'));
  assert.ok(page.includes('Effect.Save(parameter)'));
  assert.ok(page.includes('Act.Method.Save(store, same parameter)'));
  assert.ok(page.includes('Do not copy ThemeMode. Reuse the questions.'));
  assert.ok(page.includes('Semantic ownership is the reusable rule; literal VexFamily is one reusable realization'));
  assert.ok(page.includes('Current VexStream and Maps source snapshots are pressure evidence, not exemptions from this rule'));
  assert.ok(page.includes('a historical or current class shape never proves that semantic ownership belongs there merely because it already exists'));
});

test('VEXARCHITECTURE GUIDE: active work, lifetime, chronology, and convergence remain distinct', () => {
  const page = read('pages/vexarchitecture-first-stable-body.html');

  assert.ok(page.includes('RelationshipId'));
  assert.ok(page.includes('VexExecution Job custody'));
  assert.ok(page.includes('parent VexDependencyFactory'));
  assert.ok(page.includes('child VexDependencyFactory'));
  assert.ok(page.includes('VexLogger'));
  assert.ok(page.includes('EventsConvergenceRelay'));
  assert.ok(page.includes('VexConversationHybridRelay'));

  const ownerSections = [
    'data-owner="execution"',
    'data-owner="construction"',
    'data-owner="chronology"',
    'data-owner="convergence"',
    'data-owner="presentation"',
    'data-owner="service-pressure"',
  ];
  for (const marker of ownerSections) assert.ok(page.includes(marker), 'missing visual owner boundary ' + marker);
});

test('VEXARCHITECTURE GUIDE: placement never becomes authority and negative boundaries always route onward', () => {
  const page = read('pages/vexarchitecture-first-stable-body.html');

  for (const required of [
    'Placement is evidence to inspect, never authority by existence.',
    '“Not this owner” must always continue to the rightful owner; it is never a stop condition.',
    'Positively test whether an independently-owned external-participant question exists',
    'If it does not, continue through the rightful Store/provider/platform boundary',
    'Existing source placement does not count as proof either way.',
    'Any owner must survive re-evaluation',
    'which candidate owner can truthfully answer it without absorbing another responsibility',
    'Existing placement did not win by default.',
    'Existing ownership must be pressure-tested rather than presumed',
    'current placement ≠ automatic architectural legitimacy',
  ]) {
    assert.ok(page.includes(required), 'missing anti-false-authority routing guard: ' + required);
  }
});

test('VEXARCHITECTURE GUIDE: sustained realization preserves the host boundary without forcing a generic root', () => {
  const page = read('pages/vexarchitecture-first-stable-body.html');

  for (const required of [
    'Sustained realization · platform host boundary',
    'A shorter caller or UI lifetime may end while concrete platform realization must remain available.',
    'Sustained realization · guidance without a generic root',
    'VexStreamPlayerStore',
    'Playback · sustained MediaSession realization',
    'Navigation · sustained foreground realization',
    'owner-local CoroutineScope/Jobs show that execution mechanism follows the concrete custody invariant',
    'What stays unearned · symmetry is not enough',
    'does not require BackgroundServiceRelay',
    'generic VexService root',
    'universal Service.current',
    'typed ServiceScope architecture law',
    'The stable rule is separation of lifetimes and ownership',
    'A future repeated Admission / Retention / Release law can earn a VexService root',
    'ANDROID_SERVICE != DOMAIN_RUNTIME',
  ]) {
    assert.ok(page.includes(required), 'missing current Service intention/subtraction witness: ' + required);
  }

  for (const stale of [
    'Current Android #224 pressure makes VexStreamPlaybackFamily',
    'BackgroundServiceRelay observes that existing process truth',
    'VexServiceScope&lt;VexStreamPlaybackService&gt;',
  ]) {
    assert.equal(page.includes(stale), false, 'stale Service theory survived: ' + stale);
  }
});

test('VEXARCHITECTURE GUIDE: application guidance pressures harder products without claiming migration', () => {
  const page = read('pages/vexarchitecture-first-stable-body.html');

  const applySteps = [...page.matchAll(/pages\.vexarchitecture-first-stable-body\.apply\.(\d+)"/g)]
    .map(match => Number(match[1]));
  assert.deepEqual([...new Set(applySteps)].sort((a,b) => a - b), [1,2,3,4,5,6,7,8,9,10,11,12]);

  assert.ok(page.includes('VexStream · questions to ask'));
  assert.ok(page.includes('Maps · questions to ask'));
  assert.ok(page.includes('Use them to test the questions; do not treat either product as a mandatory class template.'));
});

test('VEXARCHITECTURE GUIDE: simple localized fallbacks match English source text', () => {
  const page = read('pages/vexarchitecture-first-stable-body.html');
  const strings = json('data/strings/source/pages/vexarchitecture-first-stable-body.json');
  const decode = value => value
    .replace(/&rarr;/g, '→')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim();

  const matches = [...page.matchAll(/<([a-z0-9]+)\b[^>]*data-i18n="([^"]+)"[^>]*>([\s\S]*?)<\/\1>/gi)];
  const mismatches = [];
  for (const match of matches) {
    if (/<[^>]+>/.test(match[3])) continue;
    const source = strings[match[2]]?.strings?.en?.text;
    if (source === undefined) continue;
    if (decode(match[3]) !== decode(source)) mismatches.push(match[2]);
  }

  assert.deepEqual(mismatches, []);
});

test('VEXARCHITECTURE GUIDE: every bound display key exists in the page string source', () => {
  const page = fs.readFileSync(PAGE, 'utf8');
  const strings = JSON.parse(fs.readFileSync(STRINGS, 'utf8'));
  const keys = [...page.matchAll(/\bdata-i18n(?:-alt|-aria)?=["']([^"']+)["']/g)].map(match => match[1]);
  const missing = [...new Set(keys)].filter(key => !strings[key]);

  assert.deepEqual(missing, []);
  assert.equal(strings._meta.sourceProvenance.originPullRequest, 209);
  assert.equal(strings._meta.sourceProvenance.guideRevision, 'DEVELOPMENT_STANDARD_6_N_DIRECT_FAMILY_PARTNER_SERVICE_SUBTRACTION');
  assert.equal(
    strings._meta.sourceProvenance.currentPartnerSourceSnapshot,
    '7800c17909fd03d1170ec0211a6632172c87d1af',
  );
  assert.equal(
    strings._meta.sourceProvenance.currentPartnerAcceptedMerge,
    '7800c17909fd03d1170ec0211a6632172c87d1af',
  );
  assert.equal(
    strings._meta.sourceProvenance.currentAndroidSourceSnapshot,
    'd857a92371555472e0303b18eadf353da2a868d6',
  );
  assert.equal('currentBackgroundServicePullRequest' in strings._meta.sourceProvenance, false);
  assert.equal('currentTypedScopePullRequest' in strings._meta.sourceProvenance, false);
});


test('VEXARCHITECTURE GUIDE: opening topology preserves the core spine and makes Partner conditional', () => {
  const page = read('pages/vexarchitecture-first-stable-body.html');

  assert.ok(page.includes('CORE CAUSAL SPINE'));
  assert.ok(page.includes('rightful Method-result interpretation'));
  assert.ok(page.includes('when VexPartner is earned'));
  assert.ok(page.includes('consumer-earned admission / reconciliation boundary'));
  assert.ok(page.includes('EXTERNAL PARTICIPATION / OUTBOUND — WHEN EARNED'));
  assert.ok(page.includes('ORTHOGONAL / CONDITIONAL RELATIONSHIPS'));
  assert.ok(page.includes('Construction + lifetime'));
  assert.ok(page.includes('Chronology / VexLogger'));
  assert.ok(page.includes('Relay / convergence'));
  assert.equal(page.includes('CONSTRUCTION + LIFETIME\n  ↓\nCHRONOLOGY\n  ↓\nCONVERGENCE'), false);
});

test('VEXARCHITECTURE GUIDE: Parameter and RelationshipId are earned rather than mandatory ceremony', () => {
  const page = read('pages/vexarchitecture-first-stable-body.html');

  assert.ok(page.includes('Parameter is optional and earned'));
  assert.ok(page.includes('Independent work'));
  assert.ok(page.includes('no maintained RelationshipId'));
  assert.ok(page.includes('Earliest / Latest / Queued work'));
  assert.ok(page.includes('optional typed ResourceId when genuinely distinguishing'));
  assert.ok(page.includes('ordinary Control payload'));
  assert.ok(page.includes('NOT identity'));
});

test('VEXARCHITECTURE GUIDE: realization seam preserves pure Act meaning and fully-bound Method execution', () => {
  const page = read('pages/vexarchitecture-first-stable-body.html');

  assert.ok(page.includes('Begin remains inert'));
  assert.ok(page.includes('fully-bound Act.Method.Save'));
  assert.ok(page.includes('Act.launchWith(executionRoot).method'));
  assert.ok(page.includes('already-authored owner / Approach / RelationshipId'));
  assert.ok(page.includes('VexMethod.Result'));
  assert.ok(page.includes('smallest truthful provider fact'));
  assert.ok(page.includes('Success / Failure are lawful returns from Method.invoke()'));
  assert.ok(page.includes('VexExecution executes that already-bound method and rethrows cancellation'));
  assert.ok(page.includes('maps it to VexMethod.Result.Error(cause) before the semantic result handler runs'));
});

test('VEXARCHITECTURE GUIDE: ThemeMode referential currentness stays explicitly local to ThemeMode', () => {
  const page = read('pages/vexarchitecture-first-stable-body.html');

  assert.ok(page.includes('Same in-process Parameter instance'));
  assert.ok(page.includes('referentially the same instance (===)'));
  assert.ok(page.includes('This is ThemeMode-specific, not a generic currentness framework.'));
  assert.ok(page.includes('Store carries no revision proving it is newer than B'));
});

test('VEXARCHITECTURE GUIDE: Relay is conditional composition and graph remains projection-only', () => {
  const page = read('pages/vexarchitecture-first-stable-body.html');

  assert.ok(page.includes('Relay is not a mandatory stage after Family or Execution.'));
  assert.ok(page.includes("another Family's public Control/Port"));
  assert.ok(page.includes('invoke a foreign Effect directly'));
  assert.ok(page.includes('VexLifeRelayGraph is only a session-level projection'));
  assert.ok(page.includes('does not construct, activate, or semantically own them'));
  assert.ok(page.includes('The word Relay is not authority by itself'));
  assert.ok(page.includes('A same-named mechanism elsewhere is not equivalent unless its source contract actually joins these semantics.'));
});

test('VEXARCHITECTURE GUIDE: projection never claims rendered presentation arrival by itself', () => {
  const page = read('pages/vexarchitecture-first-stable-body.html');

  assert.ok(page.includes('presentation arrival, when actually observed'));
  assert.ok(page.includes('Projection describes what presentation should manifest.'));
  assert.ok(page.includes('It does not, by itself, prove what actually reached the human.'));
  assert.equal(page.includes('MaterialTheme / system bars / Compose Surface\n      ↓\nhuman experience'), false);
});


test('VEXARCHITECTURE GUIDE: narrow screens do not require horizontal scrolling to read core material', () => {
  const page = read('pages/vexarchitecture-first-stable-body.html');

  assert.ok(page.includes('white-space: pre-wrap'));
  assert.ok(page.includes('overflow-x: hidden'));
  assert.ok(page.includes('overflow-wrap: anywhere'));
  assert.ok(page.includes('display: flex;\n      flex-wrap: wrap;'));
  assert.ok(page.includes('calc(100% - 12px)'));
});

test('VEXARCHITECTURE GUIDE: short ownership explanations are visible without accordion interaction', () => {
  const page = read('pages/vexarchitecture-first-stable-body.html');

  assert.equal(page.includes('<details class="owner-card"'), false);
  assert.ok(page.includes('Core causal path · sequential'));
  assert.ok(page.includes('Supporting relationships · orthogonal / conditional'));

  const family = page.indexOf('Family · semantic meaning');
  const execution = page.indexOf('Execution · active custody');
  const store = page.indexOf('Store / provider · outside truth');
  const presentation = page.indexOf('Projection / presentation · human meaning');
  const construction = page.indexOf('Dependency Factory · construction');
  assert.ok(family < execution && execution < store && store < presentation && presentation < construction);
});

test('VEXARCHITECTURE GUIDE: numbered reading path follows causality while supporting relationships remain unnumbered', () => {
  const page = read('pages/vexarchitecture-first-stable-body.html');

  assert.ok(page.includes('07 · From semantic truth to human experience'));
  assert.ok(page.includes('Supporting topology · construction and lifetime'));
  assert.ok(page.includes('Cross-cutting observation · chronology'));
  assert.ok(page.includes('Conditional composition · Relay / convergence'));
  assert.ok(page.includes('08 · What reality made unnecessary'));
  assert.ok(page.includes('09 · Use it on your own feature'));
  assert.ok(page.includes('10 · Try the questions on something harder'));
});

test('VEXARCHITECTURE GUIDE: current source and accepted #209 snapshot remain distinct reader choices', () => {
  const page = read('pages/vexarchitecture-first-stable-body.html');

  assert.ok(page.includes('Open current VexArchitecture source guide ↗'));
  assert.ok(page.includes('blob/main/architecture/vexarchitecture/README.md'));
  assert.ok(page.includes('Open accepted #209 source snapshot ↗'));
  assert.ok(page.includes('blob/66c866dea6a8dd78e2946da88715c4deb78c1847/architecture/vexarchitecture/README.md'));
  assert.ok(page.includes('Open PR #209 reasoning record ↗'));
  assert.ok(page.includes('Open the Partner architecture source witness ↗'));
  assert.ok(page.includes('7800c17909fd03d1170ec0211a6632172c87d1af'));
  assert.ok(page.includes('architectural teaching projections'));
  assert.ok(page.includes('object/scope-by-scope wiring walk'));
  assert.ok(page.includes('stable system of rightful ownership and relationships'));
  assert.ok(page.includes('Provenance · VexLife-Android #209'));
  assert.equal(page.includes('current relationships later pressure earned'), false);
});

// [VXG RealForever]
