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

test('VEXARCHITECTURE GUIDE: ThemeMode teaches semantic carriage rather than class-shape cargo culting', () => {
  const page = read('pages/vexarchitecture-first-stable-body.html');

  assert.ok(page.includes('Parameter.Mode(Dark)'));
  assert.ok(page.includes('SAME IN-PROCESS INSTANCE'));
  assert.ok(page.includes('Control.Select(parameter)'));
  assert.ok(page.includes('Effect.Save(parameter)'));
  assert.ok(page.includes('Act.Method.Save(store, same parameter)'));
  assert.ok(page.includes('Do not copy ThemeMode. Reuse the questions.'));
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
  ];
  for (const marker of ownerSections) assert.ok(page.includes(marker), 'missing visual owner boundary ' + marker);
});

test('VEXARCHITECTURE GUIDE: application guidance pressures harder products without claiming migration', () => {
  const page = read('pages/vexarchitecture-first-stable-body.html');

  const applySteps = [...page.matchAll(/pages\.vexarchitecture-first-stable-body\.apply\.(\d+)"/g)]
    .map(match => Number(match[1]));
  assert.deepEqual([...new Set(applySteps)].sort((a,b) => a - b), [1,2,3,4,5,6,7,8,9,10,11,12]);

  assert.ok(page.includes('VexStream · questions to ask'));
  assert.ok(page.includes('Maps · questions to ask'));
  assert.ok(page.includes('They are not declared migrated by this page.'));
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
  assert.equal(strings._meta.sourceProvenance.guideRevision, 'DEVELOPMENT_STANDARD_2_N_BUILDER_FIELD_GUIDE');
});


test('VEXARCHITECTURE GUIDE: opening topology separates core causality from orthogonal relationships', () => {
  const page = read('pages/vexarchitecture-first-stable-body.html');

  assert.ok(page.includes('CORE SEMANTIC + RUNTIME PATH'));
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
  assert.ok(page.includes('Success / Failure are lawful returns from invoke()'));
  assert.ok(page.includes('Family / Execution continuation forms Error'));
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
  assert.ok(page.includes('architectural teaching projections'));
  assert.ok(page.includes('object/scope-by-scope wiring walk'));
});

// [VXG RealForever]
