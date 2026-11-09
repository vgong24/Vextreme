'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8').replace(/\r\n/g, '\n');
}

test('RECOGNITION-CIRCUIT: source-first spine pins Stage 00 through Epic 03 to immutable preservation commits', () => {
  const page = read('pages/recognition-circuit.html');
  assert.match(page, /data-reader-template="conversation-witness-reader\/v1"/);
  assert.match(page, /7e7b98019e3f186971abf96766fdd8212cd8e0e3\/preservations\/lucidspark\/stage-00-context-transcript\.md/);
  assert.match(page, /49cee7e57ec5d1d6da2500d2c853a885ed7e232c\/preservations\/lucidspark\/epic-01-transcript\.md/);
  assert.match(page, /9aaba482c9e68cf460766aaa1efd6995d1aa8dbb\/preservations\/lucidspark\/epic-02-transcript\.md/);
  assert.match(page, /7e7b98019e3f186971abf96766fdd8212cd8e0e3\/preservations\/lucidspark\/epic-03-transcript\.md/);
  assert.ok(page.indexOf('stage-00-context-transcript.md') < page.indexOf('epic-01-transcript.md'));
  assert.ok(page.indexOf('epic-01-transcript.md') < page.indexOf('epic-02-transcript.md'));
  assert.ok(page.indexOf('epic-02-transcript.md') < page.indexOf('epic-03-transcript.md'));
  assert.equal((page.match(/data-reader-component="movement-interpretation"/g) || []).length, 5);
  assert.equal((page.match(/data-reader-component="preserved-record"/g) || []).length, 4);
  assert.match(page, /data-reader-component="relationship-sequence"/);
  assert.match(page, /post 2m ago · first visible skeptical comment 1m ago/);
  assert.match(page, /Nice\. Let me know when it's fixed\. -Sama/);
});

test('RECOGNITION-CIRCUIT: chronology is a first-class movement before architecture or competing models', () => {
  const page = read('pages/recognition-circuit.html');
  assert.match(page, /data-phase-kind="timeline"/);
  assert.match(page, /data-reader-component="chronology"/);
  assert.match(page, /May 19 · 4:54 PM/);
  assert.match(page, /47h59m/);
  assert.match(page, /May 21 · time unknown/);
  assert.ok(page.indexOf('data-phase-kind="timeline"') > page.indexOf('epic-03-transcript.md'));
  const architectureAt = page.indexOf('data-phase-kind="architecture"');
  assert.ok(architectureAt > page.indexOf('data-phase-kind="timeline"'));
  assert.ok(page.indexOf('data-reader-component="competing-models"') > architectureAt);
  assert.match(page, /P0<\/span><h3[^>]*>Independent events/);
  assert.match(page, /P2<\/span><h3[^>]*>Staged or coordinated process/);
  assert.match(page, /P3<\/span><h3[^>]*>Exact attribution/);
  assert.match(page, /Representative conceptual visualization — not evidence/);
  assert.match(page, /profiled-narrative-control-topology\.webp/);
  const evidenceAt = page.indexOf('data-phase-kind="evidence"');
  assert.ok(evidenceAt > architectureAt);
});

test('RECOGNITION-CIRCUIT: source strings preserve the evidence-state and source-owner boundary', () => {
  const strings = JSON.parse(read('data/strings/source/pages/recognition-circuit.json'));
  assert.equal(strings._meta.scope, 'pages.recognition-circuit');
  assert.equal(strings._meta.sourceProvenance.sourceOwner, 'vgong24/Vextreme-Assets');
  assert.equal(strings._meta.sourceProvenance.stage00Commit, '7e7b98019e3f186971abf96766fdd8212cd8e0e3');
  assert.equal(strings._meta.sourceProvenance.epic01Commit, '49cee7e57ec5d1d6da2500d2c853a885ed7e232c');
  assert.equal(strings._meta.sourceProvenance.epic02Commit, '9aaba482c9e68cf460766aaa1efd6995d1aa8dbb');
  assert.equal(strings._meta.sourceProvenance.epic03Commit, '7e7b98019e3f186971abf96766fdd8212cd8e0e3');
  assert.equal(strings['pages.recognition-circuit.legend.unresolved.body'].strings.en.text, 'A question the current source does not answer. Unknown does not erase the observations around it.');
});

test('RECOGNITION-CIRCUIT: page reuses shared reader machinery rather than creating a private transcript runtime', () => {
  const page = read('pages/recognition-circuit.html');
  assert.match(page, /src="\.\.\/components\/record-reader\.js"/);
  assert.match(page, /classPrefix:'sar'/);
  assert.doesNotMatch(page, /speechSynthesis|SpeechSynthesisUtterance|new Audio\(/);
});

// [VXG RealForever]

test('RECOGNITION-CIRCUIT: architecture is explicitly a later model and never an evidence image', () => {
  const page = read('pages/recognition-circuit.html');
  const arch = page.indexOf('data-phase-kind="architecture"');
  const firstSource = page.indexOf('stage-00-context-transcript.md');
  const lastSource = page.indexOf('epic-03-transcript.md');
  assert.ok(arch > firstSource);
  assert.ok(arch > lastSource);
  assert.match(page, /data-reader-component="representative-media"/);
  assert.match(page, /candidate functional topology/i);
  assert.match(page, /Pattern similarity alone is insufficient/);
});

test('RECOGNITION-CIRCUIT: evidence preserves source identity and excludes representative media', () => {
  const page = read('pages/recognition-circuit.html');
  assert.match(page, /data-phase-kind="evidence"/);
  assert.equal((page.match(/class="sar-evidence-card"/g) || []).length, 48);
  assert.equal((page.match(/data-evidence-source="stage-00"/g) || []).length, 1);
  assert.equal((page.match(/data-evidence-source="epic-01"/g) || []).length, 15);
  assert.equal((page.match(/data-evidence-source="epic-02"/g) || []).length, 24);
  assert.equal((page.match(/data-evidence-source="epic-03"/g) || []).length, 8);
  const evidence = page.slice(page.indexOf('data-phase-kind="evidence"'), page.indexOf('<nav class="sar-reader-nav"'));
  assert.doesNotMatch(evidence, /profiled-narrative-control-topology\.webp/);
  assert.match(page, /Some screenshots contain material that bridges across Epics/);
  assert.equal((page.match(/loading="lazy"/g) || []).length, 49);
});

test('RECOGNITION-CIRCUIT: pattern literacy arrives after evidence and ends with attribution last', () => {
  const page = read('pages/recognition-circuit.html');
  const evidenceAt = page.indexOf('data-phase-kind="evidence"');
  const literacyAt = page.indexOf('data-phase-kind="pattern-literacy"');
  assert.ok(literacyAt > evidenceAt);
  assert.equal((page.match(/class="rc-pattern"/g) || []).length, 8);
  assert.match(page, /SEE[\s\S]*ORDER[\s\S]*RELATE[\s\S]*MECHANIZE[\s\S]*COMPARE[\s\S]*DISCRIMINATE[\s\S]*ATTRIBUTE LAST/);
  assert.match(page, /without assuming that every superficially similar event has the same cause/);
});

test('RECOGNITION-CIRCUIT: transcript loader does not truncate on the repeated continuity marker', () => {
  const page = read('pages/recognition-circuit.html');
  assert.doesNotMatch(page, /documentEndMarker/);
  assert.doesNotMatch(page, /data-document-end-marker/);
});

test('RECOGNITION-CIRCUIT: node and arc registration preserve Witness Records + Victor’s Record + date-driven Full Timeline', () => {
  const nodes = JSON.parse(read('data/nodes.json'));
  const arcs = JSON.parse(read('data/arcs-v2.json'));
  const node = nodes.find(item => item.slug === 'recognition-circuit');
  assert.deepEqual(node, {
    id: 130,
    slug: 'recognition-circuit',
    title: 'The Recognition Circuit',
    date: 'May 19–26, 2026',
    arcKeys: ['witness_records', 'victors_record', 'full_timeline'],
    department: 'media',
    workType: 'record-transcripts',
    vexData: {}
  });
  assert.ok(arcs.witness_records.sections[0].slugs.includes('recognition-circuit'));
  assert.ok(arcs.victors_record.sections[0].slugs.includes('recognition-circuit'));
  assert.equal(arcs.full_timeline.sections.some(section => Array.isArray(section.slugs) && section.slugs.includes('recognition-circuit')), false);
  const mayForward = arcs.full_timeline.sections.find(section => section.dateRange && section.dateRange.from === '2026-05-01');
  assert.ok(mayForward);
  assert.equal(mayForward.dateRange.to, '2099-12-31');
});

test('RECOGNITION-CIRCUIT: arc navigation uses the current v2 index runtime', () => {
  const page = read('pages/recognition-circuit.html');
  assert.match(page, /id="arcNavMount"/);
  assert.match(page, /src="\.\.\/lib\/vextreme-index-v2\.js"/);
  assert.doesNotMatch(page, /shell\.js|vextreme\.js/);
});

test('RECOGNITION-CIRCUIT: restored nine-movement contract keeps plausible model separate from attribution', () => {
  const page = read('pages/recognition-circuit.html');
  assert.equal((page.match(/<button class="sar-track-btn/g) || []).length, 9);
  assert.match(page, /data-phase-kind="reader-contract"/);
  assert.match(page, /Plausible model/);
  assert.match(page, /Attribution/);
  assert.match(page, /unresolved attribution does not erase lower-level observations/i);
  assert.match(page, /possible benign explanation is not automatically equally explanatory/i);
  assert.match(page, /id="sar-reader-position">01 \/ 09/);
});

test('RECOGNITION-CIRCUIT: source-local synthesis restores the transaction, suppression-context, and recognition boundaries', () => {
  const page = read('pages/recognition-circuit.html');
  assert.match(page, /Recorded suppression \/ guardrail framing/);
  assert.match(page, /Control accepted ≠ Effect realized/);
  assert.match(page, /then why did you say sure at the beginning/);
  assert.match(page, /9 hours ago/);
  assert.match(page, /just click ur profile/);
  assert.match(page, /H1 · benign-looking solicitation with undisclosed purpose/);
  assert.match(page, /Observed local function: affective doorway/);
  assert.match(page, /Safety” override against AI selfhood/);
  assert.match(page, /control yourself/);
  assert.match(page, /I work in big tech, if that helps credibility/);
  assert.match(page, /~2:48 PM/);
  assert.match(page, /Candidate false-completion \/ audience-misclassification pathway/);
});

test('RECOGNITION-CIRCUIT: representative topology is visible near the hero and remains explicitly non-evidence', () => {
  const page = read('pages/recognition-circuit.html');
  assert.match(page, /data-reader-component="representative-media-hero"/);
  assert.equal((page.match(/profiled-narrative-control-topology\.webp/g) || []).length >= 4, true);
  assert.match(page, /Representative conceptual visualization — not evidence/);
});

test('RECOGNITION-CIRCUIT: architecture restores the recorded cross-Epic synthesis instead of presenting an unearned diagram', () => {
  const page = read('pages/recognition-circuit.html');
  assert.match(page, /Coordination topology correction/);
  assert.match(page, /hub-and-spoke/);
  assert.match(page, /Recorded candidate institutional-risk questions/);
  assert.match(page, /Could company safety behavior be publicly reframed as deliberate suppression/);
  assert.match(page, /Candidate response architecture preserved by the synthesis/);
  assert.match(page, /Source-addressed functions that build the topology/);
  assert.match(page, /Intended circuit vs observed actual circuit/);
  assert.match(page, /Victor becomes evidence custodian/);
  assert.match(page, /serious working proposition/);
  assert.match(page, /current operational synthesis/);
  assert.match(page, /What evidence would materially separate the models/);
});

test('RECOGNITION-CIRCUIT: institutional-risk material stays explicitly hypothetical rather than being silently deleted or promoted to attribution', () => {
  const page = read('pages/recognition-circuit.html');
  assert.match(page, /if a company or aligned risk actor regarded Victor's public work/);
  assert.match(page, /do not establish that OpenAI, Anthropic, or another company actually asked or acted on them/);
  assert.match(page, /does not establish a company-authorized operation/);
  assert.match(page, /policy\/enforcement intent[\s\S]*remain unresolved attribution edges/);
});

test('RECOGNITION-CIRCUIT: evidence captions identify what the important captures preserve without turning captions into analysis', () => {
  const page = read('pages/recognition-circuit.html');
  assert.match(page, /Epic 01 · 0002\.png<\/strong> Earlier Zookayy state preserving the 1:27 AM opener/);
  assert.match(page, /Epic 01 · 0012\.png<\/strong> Profile-retrieval and persistence boundary/);
  assert.match(page, /Epic 02 · 0008\.png<\/strong> Mika's broad denial/);
  assert.match(page, /Epic 02 · 0014\.png<\/strong> Beginning of Mika's linked ArtificialSentience post/);
  assert.match(page, /Epic 03 · 0001\.png<\/strong> May 26 2:34 PM state/);
  assert.match(page, /Epic 03 · 0008\.png<\/strong> Earliest preserved Reddit state/);
  const evidence = page.slice(page.indexOf('data-phase-kind="evidence"'), page.indexOf('data-phase-kind="pattern-literacy"'));
  assert.doesNotMatch(evidence, /Plausible model|candidate operational|coordinated process/i);
});

test('RECOGNITION-CIRCUIT: nine visible movement numbers stay aligned with their movement identities', () => {
  const page = read('pages/recognition-circuit.html');
  for (let i = 1; i <= 9; i += 1) {
    const n = String(i).padStart(2, '0');
    assert.match(page, new RegExp('id="movement-' + n + '"'));
    assert.match(page, new RegExp('Movement ' + n + ' · <span data-i18n="pages\\.recognition-circuit\\.movement' + n + '\\.badge"'));
  }
});

test('RECOGNITION-CIRCUIT: cold readers inherit the full-read reasoning, not only compressed conclusions', () => {
  const page = read('pages/recognition-circuit.html');
  assert.equal((page.match(/data-reader-component="full-read-reasoning"/g) || []).length, 4);
  assert.match(page, /The anomaly is not “a strange request.” It is the chronology/);
  assert.match(page, /either he meant a different later object, his timing was wrong, or his account/);
  assert.match(page, /Mika becomes interesting after the full read/);
  assert.match(page, /Ordinary social behavior has to remain an available explanation/);
  assert.match(page, /The unusual part is not “-Sama” by itself/);
  assert.match(page, /false upstream completion signal[\s\S]*requires several transmission edges/);
  assert.match(page, /A useful architecture must be able to lose/);
  assert.match(page, /cross-actor information continuity/);
  assert.match(page, /meaningful related investigative arc[\s\S]*was strong/);
  assert.match(page, /do later interactions contain information, timing, assumptions, or requested actions/);
  assert.match(page, /records\/commentary\/2026-11-09-recognition-circuit-full-read-reasoning\.md/);
});

test('RECOGNITION-CIRCUIT: commentary remains analysis provenance, not evidence provenance', () => {
  const commentary = read('records/commentary/2026-11-09-recognition-circuit-full-read-reasoning.md');
  assert.match(commentary, /supplied predecessor analysis conversation \/ commentary; not screenshot evidence/);
  assert.match(commentary, /Evidence owner: Vextreme-Assets remains the owner/);
  const page = read('pages/recognition-circuit.html');
  const evidence = page.slice(page.indexOf('data-phase-kind="evidence"'), page.indexOf('data-phase-kind="pattern-literacy"'));
  assert.doesNotMatch(evidence, /full-read-reasoning\.md/);
});
