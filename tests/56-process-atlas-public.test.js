'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const FIXTURE_PATH = path.join(ROOT, 'data', 'process-atlas', 'pat-01-public-synthetic.json');
const PAGE_PATH = path.join(ROOT, 'pages', 'process-atlas.html');
const AUDIT_PAGES_PATH = path.join(ROOT, 'lib', 'audit-pages.js');

const DEPTH_CLASSES = [
  'L0_WHOLE_JOURNEY',
  'L1_CURRENT_PRIORITIES',
  'L2_PROCESS_FAMILY',
  'L3_PROCESS_STEP',
  'L4_TRACEABILITY',
];

const PROCESS_STATES = [
  'QUESTION_GENERATED',
  'SOURCE_FOUND',
  'ANSWER_PARTIAL',
  'ASSUMPTION_ACTIVE',
  'RISK_OPEN',
  'OPPORTUNITY_IDENTIFIED',
  'DECISION_REQUIRED',
  'EXPERIMENT_READY',
  'IMPLEMENTATION_ACTIVE',
  'VALIDATION_ACTIVE',
  'OUTCOME_VERIFIED',
  'PUBLIC_PROJECTION_CURRENT',
  'PUBLIC_PROJECTION_STALE',
];

const COLLECTION_REFS = {
  nodes: 'nodeRef',
  edges: 'edgeRef',
  lenses: 'lensRef',
  priorities: 'priorityRef',
  serialDependencies: 'serialDependencyRef',
  questions: 'questionRef',
  opportunities: 'opportunityRef',
  sources: 'sourceRef',
  evidence: 'evidenceRef',
  decisions: 'decisionRef',
  owners: 'ownerRef',
  authorities: 'authorityRef',
  freshnessAndInvalidation: 'freshnessRef',
  visibilityProfiles: 'visibilityProfileRef',
};

function stableValue(value) {
  if (Array.isArray(value)) return value.map(stableValue);
  if (value === null || typeof value !== 'object') return value;
  return Object.fromEntries(
    Object.keys(value).sort().map(key => [key, stableValue(value[key])])
  );
}

function stableStringify(value) {
  return `${JSON.stringify(stableValue(value), null, 2)}\n`;
}

function sortProjectionCollections(projection) {
  const out = structuredClone(projection);
  for (const [field, refKey] of Object.entries(COLLECTION_REFS)) {
    if (Array.isArray(out[field])) {
      out[field].sort((a, b) => String(a[refKey]).localeCompare(String(b[refKey]), 'en'));
    }
  }
  if (Array.isArray(out.scopeRefs)) out.scopeRefs.sort();
  if (Array.isArray(out.parallelizableRefs)) out.parallelizableRefs.sort();
  return out;
}

function walk(value, visitor, keyPath = '$') {
  visitor(value, keyPath);
  if (Array.isArray(value)) {
    value.forEach((item, index) => walk(item, visitor, `${keyPath}[${index}]`));
  } else if (value && typeof value === 'object') {
    Object.entries(value).forEach(([key, child]) => walk(child, visitor, `${keyPath}.${key}`));
  }
}

function refsFrom(value) {
  const refs = [];
  walk(value, (item, keyPath) => {
    const key = keyPath.split('.').pop() || '';
    if (typeof item === 'string' && /Ref$/.test(key)) refs.push(item);
    if (Array.isArray(item) && /Refs$/.test(key)) refs.push(...item.filter(v => typeof v === 'string'));
  });
  return refs;
}

test('PAT-01 fixture is one deterministic public-safe synthetic projection', () => {
  const text = fs.readFileSync(FIXTURE_PATH, 'utf8');
  const fixture = JSON.parse(text);

  assert.equal(fixture.schemaVersion, 'vextreme.process-atlas.public-safe/v1');
  assert.equal(fixture.atlasVersion, '1.0.0');
  assert.equal(text, stableStringify(sortProjectionCollections(fixture)), 'fixture bytes must be canonical and deterministic');

  const allRefs = refsFrom(fixture);
  assert.ok(allRefs.length > 0);
  for (const ref of allRefs) {
    assert.match(ref, /^synthetic\./, `non-synthetic ref leaked: ${ref}`);
  }

  const forbiddenKey = /^(secret|password|credential|token|rawReceipt|rawReceiptId|accountId|accountNumber|bankAccount|bankRouting|paymentCard)$/i;
  walk(fixture, (value, keyPath) => {
    const key = keyPath.split('.').pop() || '';
    assert.equal(forbiddenKey.test(key), false, `forbidden field at ${keyPath}`);
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      assert.equal(Object.prototype.hasOwnProperty.call(value, 'visibility'), false, `public-safe projection must not carry visibility at ${keyPath}`);
    }
  });

  const nodeRefs = new Set(fixture.nodes.map(node => node.nodeRef));
  const sourceRefs = new Set(fixture.sources.map(source => source.sourceRef));
  const freshnessRefs = new Set(fixture.freshnessAndInvalidation.map(item => item.freshnessRef));
  const lensRefs = new Set(fixture.visibilityProfiles.map(item => item.visibilityProfileRef));

  assert.deepEqual([...new Set(fixture.nodes.map(node => node.depthClass))].sort(), DEPTH_CLASSES.slice().sort());
  assert.equal(fixture.nodes.length, 6);
  assert.equal(fixture.edges.length, 6);

  for (const node of fixture.nodes) {
    assert.ok(DEPTH_CLASSES.includes(node.depthClass));
    assert.ok(PROCESS_STATES.includes(node.state));
    assert.ok(node.sourceRefs.every(ref => sourceRefs.has(ref)));
    assert.ok(freshnessRefs.has(node.freshnessRef));
  }

  for (const edge of fixture.edges) {
    assert.ok(nodeRefs.has(edge.fromRef));
    assert.ok(nodeRefs.has(edge.toRef));
    assert.ok(edge.sourceRefs.every(ref => sourceRefs.has(ref)));
    assert.ok(freshnessRefs.has(edge.freshnessRef));
  }

  for (const lens of fixture.lenses) assert.ok(lens.memberRefs.every(ref => nodeRefs.has(ref)));
  for (const priority of fixture.priorities) assert.ok(nodeRefs.has(priority.targetRef));
  for (const rel of fixture.serialDependencies) {
    assert.ok(nodeRefs.has(rel.beforeRef));
    assert.ok(nodeRefs.has(rel.afterRef));
  }
  for (const ref of fixture.parallelizableRefs) assert.ok(nodeRefs.has(ref));
  for (const question of fixture.questions) assert.ok(nodeRefs.has(question.targetRef));
  for (const opportunity of fixture.opportunities) assert.ok(nodeRefs.has(opportunity.targetRef));

  const receipt = fixture.projectionReceipt;
  assert.equal(receipt.schemaVersion, 'vextreme.process-atlas.projection-receipt/v1');
  assert.equal(receipt.publicNodeCount, fixture.nodes.length);
  assert.equal(receipt.publicEdgeCount, fixture.edges.length);
  assert.equal(receipt.omittedPrivateNodeCount, 0);
  assert.equal(receipt.omittedPrivateEdgeCount, 0);
  assert.equal(receipt.transformedAliasCount, 0);
  assert.ok(receipt.sourceRefs.every(ref => sourceRefs.has(ref)));
  assert.ok(receipt.visibilityProfileRefs.every(ref => lensRefs.has(ref)));

  const base = structuredClone(fixture);
  delete base.projectionReceipt;
  const expectedHash = crypto
    .createHash('sha256')
    .update(stableStringify(sortProjectionCollections(base)))
    .digest('hex');
  assert.equal(receipt.contentSha256, expectedHash);
});

test('PAT-01 page is standalone, read-only, same-origin, and intentionally system-classified', () => {
  const html = fs.readFileSync(PAGE_PATH, 'utf8');
  const auditSource = fs.readFileSync(AUDIT_PAGES_PATH, 'utf8');

  // Verify the classification contract without importing audit-pages.js. Importing it
  // here would create a new repository lattice loadedBy edge solely for this proof.
  assert.match(
    auditSource,
    /'process-atlas':\s*'standalone live-fetch system page — wholly synthetic public-safe Process Atlas proof'/
  );
  assert.match(auditSource, /function autoDiscoveryExclusions\(skipPages = SKIP_PAGES/);
  assert.match(auditSource, /return \{ \.\.\.skipPages, \.\.\.institutionalSurfaceExclusions\(registry\) \};/);
  assert.match(auditSource, /const AUTO_DISCOVERY_EXCLUSIONS = autoDiscoveryExclusions\(\);/);

  assert.equal((html.match(/<main\b/g) || []).length, 1);
  assert.equal((html.match(/<h1\b/g) || []).length, 1);
  assert.match(html, /class="skip-link"/);
  assert.match(html, /aria-label="Process Atlas navigation"/);
  assert.match(html, /aria-live="polite"/);
  assert.match(html, /data-depth="L0_WHOLE_JOURNEY"/);
  assert.match(html, /data-depth="L4_TRACEABILITY"/);
  assert.match(html, /id="search"/);
  assert.match(html, /id="lens"/);
  assert.match(html, /id="themeToggle"/);

  assert.equal((html.match(/\bfetch\s*\(/g) || []).length, 1);
  assert.equal(
    (html.match(/\.\.\/data\/process-atlas\/pat-01-public-synthetic\.json/g) || []).length,
    1
  );

  assert.doesNotMatch(html, /(?:src|href)=["']https?:/i);
  assert.doesNotMatch(html, /<input[^>]+type=["']file["']/i);
  assert.doesNotMatch(html, /\blocalStorage\b|\bsessionStorage\b/);
  assert.doesNotMatch(html, /\bWebSocket\b|\bEventSource\b|\bXMLHttpRequest\b/);
  assert.doesNotMatch(html, /\bPOST\b|\bPUT\b|\bPATCH\b|\bDELETE\b/);
  assert.doesNotMatch(html, /\bpayment\b[^<]{0,30}\bbutton\b/i);
  assert.match(html, /prefers-reduced-motion:\s*reduce/);
  assert.match(html, /<!-- \[VXG RealForever\] -->/);
});
