'use strict';

const fs = require('node:fs');
const path = require('node:path');

const START = '<!-- VXG-WORK-CLAIM';
const END = 'VXG-WORK-CLAIM -->';
const CLAIM_VERSION = 'work-coordination.claim/v1';
const REGISTRY_VERSION = 'work-coordination.registry/v1';
const REF = /^[A-Za-z0-9][A-Za-z0-9._/-]*$/;
const PATH_REF = /^\.?[A-Za-z0-9][A-Za-z0-9._/-]*$/;
const ACTIVE = new Set(['active', 'review']);
const STATUSES = new Set(['active', 'waiting', 'review']);
const CLAIM_FIELDS = new Set([
  'schemaVersion', 'workRef', 'actorRef', 'instanceRef', 'repository', 'branch',
  'epic', 'status', 'paths', 'dependsOn', 'lease', 'coordinationOnly',
  'implementationAuthority',
]);

function object(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function checkPolicy(policy) {
  const errors = [];
  if (!object(policy) || policy.schemaVersion !== REGISTRY_VERSION) return { valid: false, errors: [`policy must use ${REGISTRY_VERSION}`] };
  if (policy.repository !== 'vgong24/Vextreme') errors.push('policy repository must remain the public Vextreme repository');
  const actors = new Set();
  for (const participant of policy.participants || []) {
    if (!object(participant) || !REF.test(participant.actorRef || '')) errors.push('participant actorRef must be safe');
    else if (actors.has(participant.actorRef)) errors.push(`participant ${participant.actorRef} is duplicated`);
    else actors.add(participant.actorRef);
    if (!['codex', 'claude-code', 'human', 'other'].includes(participant.agentType)) errors.push('participant agentType is unsupported');
    if (!REF.test(participant.environmentRef || '')) errors.push('participant environmentRef must be safe');
  }
  const required = {
    liveSource: 'open_pull_request_body',
    unknownLiveStateMeansFree: false,
    activePathOverlapAllowed: false,
    claimGrantsAuthority: false,
    mergeProvesHumanAcceptance: false,
  };
  for (const [name, expected] of Object.entries(required)) {
    if (policy.policy?.[name] !== expected) errors.push(`policy ${name} must remain ${JSON.stringify(expected)}`);
  }
  return { valid: errors.length === 0, errors, actors };
}

function readClaim(body) {
  const text = String(body || '');
  const start = text.indexOf(START);
  const end = text.indexOf(END);
  if (start === -1 && end === -1) return { kind: 'missing' };
  if (start === -1 || end <= start || text.indexOf(START, start + START.length) !== -1) return { kind: 'invalid', errors: ['claim markers are incomplete or duplicated'] };
  const payload = text.slice(start + START.length, end).trim();
  if (payload.length > 16384) return { kind: 'invalid', errors: ['claim block exceeds the size limit'] };
  try {
    return { kind: 'claim', value: JSON.parse(payload) };
  } catch {
    return { kind: 'invalid', errors: ['claim block is not valid JSON'] };
  }
}

function checkClaim(claim, policy, pr) {
  const errors = [];
  const checkedPolicy = checkPolicy(policy);
  if (!object(claim) || claim.schemaVersion !== CLAIM_VERSION) return { valid: false, errors: [`claim must use ${CLAIM_VERSION}`] };
  for (const field of Object.keys(claim)) if (!CLAIM_FIELDS.has(field)) errors.push(`claim field ${field} is not approved`);
  for (const field of ['workRef', 'actorRef', 'instanceRef', 'repository', 'branch']) if (!REF.test(claim[field] || '')) errors.push(`${field} must be a safe reference`);
  if (!checkedPolicy.actors?.has(claim.actorRef)) errors.push('actorRef is not registered');
  if (claim.repository !== policy.repository) errors.push('claim repository differs from policy');
  if (pr?.headRefName && claim.branch !== pr.headRefName) errors.push('claim branch differs from PR head');
  if (!object(claim.epic)
      || Object.keys(claim.epic).some((field) => !['name', 'item'].includes(field))
      || !/^[A-Za-z0-9][A-Za-z0-9 .&+:/_-]{0,100}$/.test(claim.epic.name || '')
      || !/^\d+\/\d+$/.test(claim.epic.item || '')) errors.push('epic name and numeric item are required');
  if (!STATUSES.has(claim.status)) errors.push('claim status is unsupported');
  if (!Array.isArray(claim.paths) || !claim.paths.length) errors.push('claim paths are required');
  for (const claimedPath of claim.paths || []) if (!PATH_REF.test(claimedPath) || claimedPath.includes('..')) errors.push('claim path is unsafe');
  if (!Array.isArray(claim.dependsOn) || claim.dependsOn.some((ref) => !REF.test(ref))) errors.push('dependsOn contains an unsafe reference');
  if (!object(claim.lease) || Object.keys(claim.lease).some((field) => field !== 'renewBy') || !/^\d{4}-\d{2}-\d{2}$/.test(claim.lease?.renewBy || '')) errors.push('lease renewBy must be YYYY-MM-DD');
  if (claim.coordinationOnly !== true || claim.implementationAuthority !== false) errors.push('claim must remain coordination-only and non-authoritative');
  return { valid: errors.length === 0, errors };
}

function pathOverlap(left, right) {
  const contains = (parent, child) => parent.endsWith('/')
    ? child === parent.slice(0, -1) || child.startsWith(parent)
    : parent === child;
  return contains(left, right) || contains(right, left);
}

function inspectPullRequests(prs, policy, today = new Date().toISOString().slice(0, 10)) {
  const errors = [...checkPolicy(policy).errors];
  const warnings = [];
  const claims = [];
  const unclaimed = [];
  for (const pr of prs || []) {
    const parsed = readClaim(pr.body);
    if (parsed.kind === 'missing') {
      unclaimed.push({ number: pr.number, title: pr.title });
      continue;
    }
    if (parsed.kind === 'invalid') {
      errors.push(`PR #${pr.number}: ${parsed.errors.join('; ')}`);
      continue;
    }
    const result = checkClaim(parsed.value, policy, pr);
    if (!result.valid) errors.push(...result.errors.map((error) => `PR #${pr.number}: ${error}`));
    else claims.push({ ...parsed.value, pr: { number: pr.number, url: pr.url, isDraft: pr.isDraft } });
  }
  const seen = new Set();
  for (const claim of claims) {
    if (seen.has(claim.workRef)) errors.push(`workRef ${claim.workRef} is duplicated`);
    seen.add(claim.workRef);
    if (claim.lease.renewBy < today) errors.push(`workRef ${claim.workRef} lease expired on ${claim.lease.renewBy}`);
  }
  for (let i = 0; i < claims.length; i += 1) {
    for (let j = i + 1; j < claims.length; j += 1) {
      if (!ACTIVE.has(claims[i].status) || !ACTIVE.has(claims[j].status)) continue;
      if (claims[i].paths.some((left) => claims[j].paths.some((right) => pathOverlap(left, right)))) errors.push(`active work ${claims[i].workRef} overlaps ${claims[j].workRef}`);
    }
  }
  if (unclaimed.length) warnings.push(`${unclaimed.length} open PR(s) have no work claim`);
  return { valid: errors.length === 0, errors, warnings, claims, unclaimed };
}

function renderClaims(result, liveStatus) {
  const lines = [`  live state: ${liveStatus}`, `  health: ${result.valid ? 'healthy' : 'blocked'}`];
  if (liveStatus !== 'available') lines.push('  live assignments are unknown; do not infer paths are free');
  if (!result.claims.length) lines.push('  claims: none observed');
  for (const claim of result.claims) {
    lines.push(`  - ${claim.workRef}: ${claim.actorRef} / ${claim.instanceRef}`);
    lines.push(`    ${claim.epic.name} ${claim.epic.item}; ${claim.status}; PR #${claim.pr.number}`);
    lines.push(`    paths: ${claim.paths.join(', ')}`);
    lines.push(`    renew by: ${claim.lease.renewBy}`);
  }
  for (const warning of result.warnings) lines.push(`  warning: ${warning}`);
  for (const error of result.errors) lines.push(`  blocked: ${error}`);
  lines.push('  authority: coordination visibility only');
  return lines;
}

function loadPolicy(root = path.join(__dirname, '..')) {
  return JSON.parse(fs.readFileSync(path.join(root, 'config', 'work-coordination.json'), 'utf8'));
}

if (require.main === module) {
  const result = checkPolicy(loadPolicy());
  process.stdout.write(`${JSON.stringify({ valid: result.valid, errors: result.errors })}\n`);
  if (!result.valid) process.exitCode = 1;
}

module.exports = {
  END,
  START,
  checkClaim,
  checkPolicy,
  inspectPullRequests,
  loadPolicy,
  pathOverlap,
  readClaim,
  renderClaims,
};

// [VXG RealForever]
