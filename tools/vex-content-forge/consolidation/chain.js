'use strict';

const {
  DEFAULT_POINTER,
  assertWorkmapPath,
  firstString,
  isObject,
  loadJson,
  sha256Text,
} = require('./lib');

function mapRevision(map) {
  if (Number.isInteger(map.revision)) return map.revision;
  const ref = firstString(map.revisionRef, map.workMapRef, map.schemaVersion) || '';
  const match = ref.match(/(?:^|[.-])r(\d{3})(?:[.-]|$)/i);
  return match ? Number.parseInt(match[1], 10) : null;
}

function explicitPriorPaths(map) {
  const paths = [
    map.cumulativeBasis && map.cumulativeBasis.priorMapPath,
    map.cumulativeBasis && map.cumulativeBasis.deepBasisPath,
    map.scannerIndex && map.scannerIndex.priorCumulativeMap,
    map.scannerIndex && map.scannerIndex.priorMapPath,
    map.priorMapPath,
  ].filter(Boolean);
  return [...new Set(paths.map(assertWorkmapPath))];
}

function discoverMapChain(repoRoot, pointerPath = DEFAULT_POINTER) {
  const pointerRecord = loadJson(repoRoot, assertWorkmapPath(pointerPath));
  const pointer = pointerRecord.value;
  const rootPath = firstString(
    pointer.workMapPath,
    pointer.currentWorkMapPath,
    pointer.current && pointer.current.workMapPath,
    pointer.scanner && pointer.scanner.workMapPath,
  );
  if (!rootPath) throw new Error(`${pointerRecord.repoPath} does not declare workMapPath`);

  const visited = new Set();
  const loading = new Set();
  const maps = [];
  function visit(repoPath) {
    const normalized = assertWorkmapPath(repoPath);
    if (visited.has(normalized)) return;
    if (loading.has(normalized)) throw new Error(`cycle in work-map basis chain at ${normalized}`);
    loading.add(normalized);
    const record = loadJson(repoRoot, normalized);
    explicitPriorPaths(record.value).forEach(visit);
    loading.delete(normalized);
    visited.add(normalized);
    maps.push({
      repoPath: normalized,
      revision: mapRevision(record.value),
      revisionRef: firstString(record.value.revisionRef),
      schemaVersion: firstString(record.value.schemaVersion),
      value: record.value,
      sha256: sha256Text(record.text),
      bytes: Buffer.byteLength(record.text, 'utf8'),
    });
  }
  visit(rootPath);
  maps.sort((a, b) => (a.revision ?? -1) - (b.revision ?? -1) || a.repoPath.localeCompare(b.repoPath));
  const root = maps.find(item => item.repoPath === assertWorkmapPath(rootPath));
  return {
    pointerPath: pointerRecord.repoPath,
    pointer,
    pointerSha256: sha256Text(pointerRecord.text),
    pointerBytes: Buffer.byteLength(pointerRecord.text, 'utf8'),
    rootPath: root.repoPath,
    root,
    maps,
  };
}

function mapContext(mapRecord) {
  const key = mapRecord.revision == null ? null : `r${String(mapRecord.revision).padStart(3, '0')}`;
  const revisionObject = key && isObject(mapRecord.value[key]) ? mapRecord.value[key] : {};
  return {
    partRef: firstString(revisionObject.partRef, mapRecord.value.partRef, mapRecord.value.currentPartRef),
    sourceGroupState: firstString(revisionObject.sourceGroupState, mapRecord.value.sourceGroupState),
  };
}

module.exports = { discoverMapChain, explicitPriorPaths, mapContext, mapRevision };
