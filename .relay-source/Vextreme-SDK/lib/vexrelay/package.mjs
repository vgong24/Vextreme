import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { INPUT_PACKAGE_SCHEMA_VERSION } from './constants.mjs';
import { canonicalUtf8Compare, sha256Bytes, sha256File } from './hash.mjs';
import { loadManifest, validateManifest } from './manifest.mjs';
import { listFilesRecursive, normalizeRelativePath, resolveWithinRoot } from './paths.mjs';
import { readZipEntries, writeZip } from './zip.mjs';

function contentSetDigest(entries) {
  const hash = crypto.createHash('sha256');
  for (const entry of [...entries].sort((a, b) => canonicalUtf8Compare(a.path, b.path))) {
    hash.update(entry.path, 'utf8');
    hash.update('\0');
    hash.update(entry.sha256, 'ascii');
    hash.update('\n');
  }
  return hash.digest('hex');
}

function declaredPackageMembers(manifest) {
  const members = new Map();
  const declare = (relative, expectedSha256) => {
    const normalized = normalizeRelativePath(relative);
    if (members.has(normalized) && members.get(normalized) !== expectedSha256) {
      throw new Error(`PACKAGE_MEMBER_DECLARATION_CONFLICT:${normalized}:${members.get(normalized)}:${expectedSha256}`);
    }
    members.set(normalized, expectedSha256);
  };
  for (const operation of manifest.operations) {
    if (operation.op === 'WRITE' && operation.action === 'COPY_FILE') declare(operation.source, operation.sourceSha256);
    if (operation.op === 'PUBLISH' && ['PULL_REQUEST', 'UPDATE_PULL_REQUEST_BODY'].includes(operation.action)) declare(operation.bodyFile, operation.bodySha256);
  }
  return members;
}

export async function buildTaskPackage({ manifestPath, outputDirectory = null, outputStem = 'VexRelay-Task' } = {}) {
  if (!manifestPath) throw new Error('PACKAGE_MANIFEST_PATH_REQUIRED');
  if (typeof outputStem !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/.test(outputStem)) throw new Error(`PACKAGE_OUTPUT_STEM_INVALID:${outputStem}`);
  const absoluteManifest = path.resolve(manifestPath);
  const packageSourceRoot = path.dirname(absoluteManifest);
  const { manifest, manifestDigest } = await loadManifest(absoluteManifest);
  const members = [];
  const taskBytes = await fs.readFile(absoluteManifest);
  members.push({ path: 'task.manifest.json', data: taskBytes, sha256: sha256Bytes(taskBytes), bytes: taskBytes.length });
  for (const [relative, expectedSha256] of declaredPackageMembers(manifest)) {
    const source = await resolveWithinRoot(packageSourceRoot, relative);
    const data = await fs.readFile(source);
    const digest = sha256Bytes(data);
    if (expectedSha256 && digest !== expectedSha256) throw new Error(`PACKAGE_MEMBER_SHA256_MISMATCH:${relative}:${digest}:${expectedSha256}`);
    members.push({ path: relative, data, sha256: digest, bytes: data.length });
  }
  const inventory = members.map(({ path: memberPath, sha256, bytes }) => ({ path: memberPath, sha256, bytes })).sort((a, b) => canonicalUtf8Compare(a.path, b.path));
  const packageManifest = {
    schemaVersion: INPUT_PACKAGE_SCHEMA_VERSION,
    continuity: manifest.continuity,
    taskRef: manifest.taskRef,
    attemptRef: manifest.attemptRef,
    packageRef: manifest.packageRef,
    manifestDigest,
    memberCountExcludingPackageManifest: inventory.length,
    contentSetDigest: contentSetDigest(inventory),
    members: inventory,
  };
  const packageManifestBytes = Buffer.from(`${JSON.stringify(packageManifest, null, 2)}\n`);
  const entries = [...members.map(({ path: name, data }) => ({ name, data })), { name: 'PACKAGE-MANIFEST.json', data: packageManifestBytes }]
    .sort((a, b) => canonicalUtf8Compare(a.name, b.name));
  const directory = path.resolve(outputDirectory ?? packageSourceRoot);
  await fs.mkdir(directory, { recursive: true });
  const temporary = path.join(directory, `.${outputStem}.forming-${crypto.randomUUID()}.zip`);
  await writeZip({ outputPath: temporary, entries, maxEntries: 500, date: new Date(manifest.execution.formedAt) });
  const digest = await sha256File(temporary);
  const outputPath = path.join(directory, `${outputStem}--sha256-${digest}.zip`);
  try { await fs.access(outputPath); throw new Error(`PACKAGE_OUTPUT_ALREADY_EXISTS:${outputPath}`); }
  catch (error) { if (error?.code !== 'ENOENT') { await fs.rm(temporary, { force: true }); throw error; } }
  await fs.rename(temporary, outputPath);
  const observed = await readZipEntries(outputPath, { maxEntries: 500, maxTotalBytes: 250_000_000 });
  if (observed.length !== entries.length) throw new Error(`PACKAGE_ROUNDTRIP_ENTRY_COUNT:${observed.length}:${entries.length}`);
  const expected = new Map(entries.map((entry) => [entry.name, Buffer.isBuffer(entry.data) ? entry.data : Buffer.from(entry.data)]));
  for (const entry of observed) {
    const bytes = expected.get(entry.name);
    if (!bytes || !entry.data.equals(bytes)) throw new Error(`PACKAGE_ROUNDTRIP_BYTE_MISMATCH:${entry.name}`);
    expected.delete(entry.name);
  }
  if (expected.size) throw new Error(`PACKAGE_ROUNDTRIP_MISSING:${[...expected.keys()].join(',')}`);
  return {
    state: 'PASS', outputPath, sha256: digest, bytes: (await fs.stat(outputPath)).size,
    taskRef: manifest.taskRef, attemptRef: manifest.attemptRef, packageRef: manifest.packageRef,
    manifestDigest, contentSetDigest: packageManifest.contentSetDigest,
    members: entries.map((entry) => entry.name),
  };
}

export async function verifyInputPackage({ packageRoot, manifest, manifestDigest }) {
  const packageManifestPath = path.join(packageRoot, 'PACKAGE-MANIFEST.json');
  try { await fs.access(packageManifestPath); }
  catch (error) {
    if (error?.code === 'ENOENT' && manifest.policy.requireInputPackageManifest === false) return { state: 'NOT_REQUIRED' };
    throw new Error('INPUT_PACKAGE_MANIFEST_REQUIRED');
  }
  const value = JSON.parse(await fs.readFile(packageManifestPath, 'utf8'));
  if (value.schemaVersion !== INPUT_PACKAGE_SCHEMA_VERSION) throw new Error(`INPUT_PACKAGE_SCHEMA:${value.schemaVersion}`);
  if (value.taskRef !== manifest.taskRef || value.attemptRef !== manifest.attemptRef || value.packageRef !== manifest.packageRef) throw new Error('INPUT_PACKAGE_IDENTITY_MISMATCH');
  if (value.manifestDigest !== manifestDigest) throw new Error('INPUT_PACKAGE_MANIFEST_DIGEST_MISMATCH');
  if (!Array.isArray(value.members) || value.memberCountExcludingPackageManifest !== value.members.length) throw new Error('INPUT_PACKAGE_INVENTORY_INVALID');
  const observed = [];
  const seen = new Set();
  for (const entry of value.members) {
    const rel = normalizeRelativePath(entry.path, 'package_member');
    if (seen.has(rel)) throw new Error(`INPUT_PACKAGE_DUPLICATE_MEMBER:${rel}`);
    seen.add(rel);
    const target = await resolveWithinRoot(packageRoot, rel);
    const bytes = await fs.readFile(target);
    const digest = sha256Bytes(bytes);
    if (digest !== entry.sha256 || bytes.length !== entry.bytes) throw new Error(`INPUT_PACKAGE_MEMBER_DRIFT:${rel}`);
    observed.push({ path: rel, sha256: digest, bytes: bytes.length });
  }
  if (contentSetDigest(observed) !== value.contentSetDigest) throw new Error('INPUT_PACKAGE_CONTENT_SET_MISMATCH');
  if (manifest.policy.requireInputPackageManifest) {
    const actual = (await listFilesRecursive(packageRoot)).filter((rel) => rel !== 'PACKAGE-MANIFEST.json' && !rel.startsWith('results/')).sort(canonicalUtf8Compare);
    const expected = [...seen].sort(canonicalUtf8Compare);
    if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error(`INPUT_PACKAGE_MEMBER_SET_MISMATCH:${JSON.stringify(actual)}:${JSON.stringify(expected)}`);
  }
  return { state: 'PASS', contentSetDigest: value.contentSetDigest, memberCount: value.members.length };
}

export function validateTaskObject(value) { return validateManifest(value); }
