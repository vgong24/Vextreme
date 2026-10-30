'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const parse5 = require('parse5');
const projector = require('./project_arc_batch.js');

const DEFAULT_ROOT = path.resolve(__dirname, '..', '..');
const DEFAULT_FORMATION_REL = path.join(
  'docs', 'ingestion', 'workmaps',
  'content-forge-testimony-stale-page-migration-formation.json'
);
const ADAPTER_REF = 'tools/vex-content-forge/project_stale_page_migration.js';

class StalePageMigrationError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'StalePageMigrationError';
    this.code = code;
  }
}
const invariant = (condition, code, message) => {
  if (!condition) throw new StalePageMigrationError(code, message);
};
const readJson = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const attrs = node => Object.fromEntries((node.attrs || []).map(item => [item.name, item.value]));

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(
    Object.keys(value).sort().map(key => [key, canonicalize(value[key])])
  );
}
function sha256Value(value) {
  const bytes = Buffer.isBuffer(value)
    ? value
    : Buffer.from(typeof value === 'string' ? value : JSON.stringify(canonicalize(value)));
  return crypto.createHash('sha256').update(bytes).digest('hex');
}
function migrationContractSha256(formation, migration) {
  const member = formation.members[0];
  return sha256Value({
    stageRef: formation.stageRef,
    ownerRef: formation.ownerRef,
    member: {
      slug: member.slug,
      canonicalNodeId: member.canonicalNodeId,
      title: member.title,
      arcKeys: member.arcKeys,
      sourcePath: member.sourcePath,
      sourceGitBlob: member.sourceGitBlob,
      preservedHtmlSha256: member.preservedHtmlSha256,
      repositoryBytes: member.repositoryBytes,
      sourceRoute: member.sourceRoute,
      pageId: member.pageId,
      proposalRecordRef: member.proposalRecordRef,
      adapterClass: member.adapterClass,
    },
    migration,
  });
}
function migrationResultFingerprint(pageBytes, strings, viewmodel) {
  const stringsForHash = JSON.parse(JSON.stringify(strings));
  const receipt = stringsForHash?._meta?.sourceProvenance?.migration;
  if (receipt) delete receipt.resultFingerprint;
  return {
    pageSha256: sha256Value(pageBytes),
    stringsSha256: sha256Value(stringsForHash),
    viewmodelSha256: sha256Value(viewmodel),
  };
}

function walk(node, visit) {
  if (!node) return;
  visit(node);
  for (const child of node.childNodes || []) walk(child, visit);
}
function findAll(node, predicate) {
  const out = [];
  walk(node, current => { if (predicate(current)) out.push(current); });
  return out;
}
function setAttr(node, name, value) {
  const current = (node.attrs || []).find(item => item.name === name);
  if (current) current.value = value;
  else {
    node.attrs = node.attrs || [];
    node.attrs.push({ name, value });
  }
}
function writeAtomic(file, content) {
  const value = Buffer.isBuffer(content) ? content : Buffer.from(String(content));
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const temp = file + '.tmp-' + process.pid;
  fs.writeFileSync(temp, value);
  fs.renameSync(temp, file);
}
function validateMigrationFormation(formation) {
  projector.validateFormation(formation);
  invariant(formation.members.length === 1, 'MIGRATION_MEMBER_COUNT', 'stale-page migration requires exactly one projected member');
  const migration = formation.migration;
  invariant(migration && typeof migration === 'object', 'MIGRATION_CONTRACT', 'migration contract is required');
  invariant(migration.slug === formation.members[0].slug, 'MIGRATION_SLUG', migration.slug);
  invariant(migration.destinationPath === 'pages/' + migration.slug + '.html', 'MIGRATION_DESTINATION', migration.destinationPath);
  invariant(/^[0-9a-f]{40}$/i.test(migration.expectedDestinationGitBlob || ''), 'MIGRATION_PREIMAGE', 'expected destination Git blob must be exact');
  invariant(Array.isArray(migration.assetResolutions), 'MIGRATION_ASSET_RESOLUTIONS', 'assetResolutions must be an array');
  invariant(Array.isArray(migration.linkResolutions), 'MIGRATION_LINK_RESOLUTIONS', 'linkResolutions must be an array');
  for (const resolution of migration.assetResolutions) {
    invariant(resolution.tag === 'img', 'MIGRATION_ASSET_TAG', resolution.tag);
    invariant(typeof resolution.alt === 'string' && resolution.alt.length > 0, 'MIGRATION_ASSET_ALT', resolution.alt);
    invariant(resolution.placeholderSrc === '/__vex/missing-asset.svg', 'MIGRATION_ASSET_PLACEHOLDER', resolution.placeholderSrc);
    invariant(/^https:\/\//.test(resolution.originalSourceUrl || ''), 'MIGRATION_ASSET_ORIGINAL', resolution.originalSourceUrl);
    invariant(/^https:\/\//.test(resolution.resolvedSrc || ''), 'MIGRATION_ASSET_RESOLVED', resolution.resolvedSrc);
    invariant(typeof resolution.resolutionClass === 'string' && resolution.resolutionClass.length > 0, 'MIGRATION_ASSET_CLASS', 'resolutionClass');
  }
  for (const resolution of migration.linkResolutions) {
    invariant(typeof resolution.fromHref === 'string' && resolution.fromHref.startsWith('/'), 'MIGRATION_LINK_FROM', resolution.fromHref);
    invariant(/^https:\/\/github\.com\//.test(resolution.toHref || ''), 'MIGRATION_LINK_TO', resolution.toHref);
    invariant(typeof resolution.resolutionClass === 'string' && resolution.resolutionClass.length > 0, 'MIGRATION_LINK_CLASS', 'resolutionClass');
  }
  return migration;
}

function applyResolutions(generatedPage, sourceHtml, migration) {
  const source = parse5.parse(sourceHtml);
  const generated = parse5.parse(generatedPage);

  for (const resolution of migration.assetResolutions) {
    const sourceMatches = findAll(source, node => {
      if (node.tagName !== resolution.tag) return false;
      const a = attrs(node);
      return a.alt === resolution.alt
        && a.src === resolution.placeholderSrc
        && a['data-vex-original-src'] === resolution.originalSourceUrl;
    });
    invariant(sourceMatches.length === 1, 'MIGRATION_SOURCE_ASSET_BINDING', resolution.alt + ': expected one exact source placeholder');

    const generatedMatches = findAll(generated, node => {
      if (node.tagName !== resolution.tag) return false;
      const a = attrs(node);
      return a.alt === resolution.alt && a.src === resolution.placeholderSrc;
    });
    invariant(generatedMatches.length === 1, 'MIGRATION_OUTPUT_ASSET_BINDING', resolution.alt + ': expected one projected placeholder');
    setAttr(generatedMatches[0], 'src', resolution.resolvedSrc);
  }

  for (const resolution of migration.linkResolutions) {
    const sourceMatches = findAll(source, node => node.tagName === 'a' && attrs(node).href === resolution.fromHref);
    invariant(sourceMatches.length === 1, 'MIGRATION_SOURCE_LINK_BINDING', resolution.fromHref + ': expected one source link');

    const generatedMatches = findAll(generated, node => node.tagName === 'a' && attrs(node).href === resolution.fromHref);
    invariant(generatedMatches.length === 1, 'MIGRATION_OUTPUT_LINK_BINDING', resolution.fromHref + ': expected one projected link');
    setAttr(generatedMatches[0], 'href', resolution.toHref);
  }

  return parse5.serialize(generated);
}

function migrationMetadata(formation, migration) {
  return {
    adapter: ADAPTER_REF,
    destinationPreimageGitBlob: migration.expectedDestinationGitBlob,
    sourceSelection: migration.sourceSelection || null,
    assetResolutions: migration.assetResolutions.map(item => ({
      tag: item.tag,
      alt: item.alt,
      placeholderSrc: item.placeholderSrc,
      originalSourceUrl: item.originalSourceUrl,
      resolvedSrc: item.resolvedSrc,
      resolutionClass: item.resolutionClass,
    })),
    linkResolutions: migration.linkResolutions.map(item => ({
      fromHref: item.fromHref,
      toHref: item.toHref,
      resolutionClass: item.resolutionClass,
    })),
    preservedSourceMutationPerformed: false,
    formationRef: formation.stageRef,
    contractSha256: migrationContractSha256(formation, migration),
  };
}

function alreadyMigrated(root, formation, migration) {
  const pagePath = path.join(root, migration.destinationPath);
  const stringsPath = path.join(root, 'data', 'strings', 'source', 'pages', migration.slug + '.json');
  const viewmodelsPath = path.join(root, 'data', 'viewmodels.json');
  const pageExists = fs.existsSync(pagePath);
  const stringsExist = fs.existsSync(stringsPath);

  let pageBytes = null;
  let page = '';
  let pageLooksMigrated = false;
  if (pageExists) {
    pageBytes = fs.readFileSync(pagePath);
    page = pageBytes.toString('utf8');
    pageLooksMigrated = page.includes('data-content-forge-generator="' + projector.GENERATOR_REF + '"');
  }

  let strings = null;
  let receipt = null;
  let receiptLooksMigrated = false;
  if (stringsExist) {
    strings = readJson(stringsPath);
    receipt = strings?._meta?.sourceProvenance?.migration;
    receiptLooksMigrated = receipt?.adapter === ADAPTER_REF;
  }

  if (!pageLooksMigrated && !receiptLooksMigrated) return false;
  if (!pageExists || !stringsExist || !fs.existsSync(viewmodelsPath) ||
      !pageLooksMigrated || !receiptLooksMigrated) {
    throw new StalePageMigrationError(
      'MIGRATION_MIGRATED_RESULT_DRIFT',
      migration.slug + ': migrated result is structurally incomplete'
    );
  }

  const expectedContract = migrationContractSha256(formation, migration);
  if (receipt.formationRef !== formation.stageRef || receipt.contractSha256 !== expectedContract) {
    throw new StalePageMigrationError(
      'MIGRATION_MIGRATED_RESULT_DRIFT',
      migration.slug + ': migration contract changed after projection'
    );
  }
  if (page.includes('/__vex/missing-asset.svg')) {
    throw new StalePageMigrationError('MIGRATION_MIGRATED_RESULT_DRIFT', migration.slug + ': unresolved asset reappeared');
  }
  for (const resolution of migration.assetResolutions) {
    if (!page.includes(resolution.resolvedSrc)) {
      throw new StalePageMigrationError('MIGRATION_MIGRATED_RESULT_DRIFT', migration.slug + ': resolved asset drifted');
    }
  }
  for (const resolution of migration.linkResolutions) {
    if (!page.includes(resolution.toHref)) {
      throw new StalePageMigrationError('MIGRATION_MIGRATED_RESULT_DRIFT', migration.slug + ': resolved link drifted');
    }
  }

  const viewmodels = readJson(viewmodelsPath);
  const viewmodel = viewmodels[migration.slug];
  if (!viewmodel || !receipt.resultFingerprint) {
    throw new StalePageMigrationError(
      'MIGRATION_MIGRATED_RESULT_DRIFT',
      migration.slug + ': migrated result fingerprint is incomplete'
    );
  }
  const actualFingerprint = migrationResultFingerprint(pageBytes, strings, viewmodel);
  if (JSON.stringify(actualFingerprint) !== JSON.stringify(receipt.resultFingerprint)) {
    throw new StalePageMigrationError(
      'MIGRATION_MIGRATED_RESULT_DRIFT',
      migration.slug + ': migrated page/string/viewmodel result drifted'
    );
  }
  return true;
}
function recoverInterrupted(pagePath, backupPath) {
  if (!fs.existsSync(backupPath)) return;
  if (!fs.existsSync(pagePath)) {
    fs.renameSync(backupPath, pagePath);
    throw new StalePageMigrationError(
      'MIGRATION_INTERRUPTED_RECOVERED',
      'recovered the retained stale-page backup; rerun after inspecting the restored destination'
    );
  }
  throw new StalePageMigrationError('MIGRATION_BACKUP_CONFLICT', backupPath);
}

function main(options = {}) {
  const root = path.resolve(options.root || DEFAULT_ROOT);
  const formationRel = options.formationRel || DEFAULT_FORMATION_REL;
  const formationPath = path.join(root, formationRel);
  const formation = readJson(formationPath);
  const migration = validateMigrationFormation(formation);
  const member = formation.members[0];

  const sourcePath = path.join(root, member.sourcePath);
  const pagePath = path.join(root, migration.destinationPath);
  const stringsPath = path.join(root, 'data', 'strings', 'source', 'pages', migration.slug + '.json');
  const viewmodelsPath = path.join(root, 'data', 'viewmodels.json');
  const backupPath = pagePath + '.vex-stale-migration-backup';

  invariant(fs.existsSync(sourcePath), 'MIGRATION_SOURCE_MISSING', member.sourcePath);
  invariant(fs.existsSync(viewmodelsPath), 'MIGRATION_VIEWMODELS_MISSING', 'data/viewmodels.json');

  const sourceBytes = fs.readFileSync(sourcePath);
  invariant(sourceBytes.length === member.repositoryBytes, 'MIGRATION_SOURCE_BYTES', member.slug);
  invariant(projector.gitBlobSha(sourceBytes) === member.sourceGitBlob, 'MIGRATION_SOURCE_BLOB', member.slug);
  invariant(projector.sha256(sourceBytes) === member.preservedHtmlSha256, 'MIGRATION_SOURCE_SHA256', member.slug);

  if (alreadyMigrated(root, formation, migration)) {
    const result = {
      schemaVersion: 'vex-content-forge.stale-page-migration-result/v0.1',
      slug: migration.slug,
      disposition: 'ALREADY_MIGRATED',
      changedPaths: [],
      preservedSourceMutationPerformed: false,
    };
    if (!options.silent) process.stdout.write(JSON.stringify(result, null, 2) + '\n');
    return result;
  }

  recoverInterrupted(pagePath, backupPath);
  invariant(fs.existsSync(pagePath), 'MIGRATION_DESTINATION_MISSING', migration.destinationPath);

  const destinationBytes = fs.readFileSync(pagePath);
  invariant(
    projector.gitBlobSha(destinationBytes) === migration.expectedDestinationGitBlob,
    'MIGRATION_DESTINATION_PREIMAGE',
    migration.destinationPath
  );

  const stringsBefore = fs.existsSync(stringsPath) ? fs.readFileSync(stringsPath) : null;
  const viewmodelsBefore = fs.readFileSync(viewmodelsPath);
  const viewmodelsBeforeJson = JSON.parse(viewmodelsBefore.toString('utf8'));
  const sourceBefore = Buffer.from(sourceBytes);

  fs.renameSync(pagePath, backupPath);

  try {
    const projectionResult = projector.main({ root, formationRel, silent: true });
    const target = projectionResult.members.find(item => item.slug === migration.slug);
    invariant(target?.disposition === 'PROJECTED', 'MIGRATION_PROJECTOR_DISPOSITION', target?.disposition || 'missing');

    const generatedPage = fs.readFileSync(pagePath, 'utf8');
    const resolvedPage = applyResolutions(generatedPage, sourceBefore.toString('utf8'), migration);
    writeAtomic(pagePath, resolvedPage.endsWith('\n') ? resolvedPage : resolvedPage + '\n');

    const strings = readJson(stringsPath);
    invariant(
      strings?._meta?.sourceProvenance?.preservedGitBlob === member.sourceGitBlob
        && strings._meta.sourceProvenance.preservedHtmlSha256 === member.preservedHtmlSha256,
      'MIGRATION_SOURCE_PROVENANCE',
      member.slug
    );
    strings._meta.sourceProvenance.migration = migrationMetadata(formation, migration);

    invariant(fs.readFileSync(sourcePath).equals(sourceBefore), 'MIGRATION_PRESERVED_SOURCE_CHANGED', member.sourcePath);

    const viewmodelsAfter = readJson(viewmodelsPath);
    const beforeOther = { ...viewmodelsBeforeJson };
    const afterOther = { ...viewmodelsAfter };
    delete beforeOther[migration.slug];
    delete afterOther[migration.slug];
    invariant(JSON.stringify(afterOther) === JSON.stringify(beforeOther), 'MIGRATION_VIEWMODEL_SCOPE', migration.slug);

    const finalPageBytes = fs.readFileSync(pagePath);
    const finalPage = finalPageBytes.toString('utf8');
    invariant(finalPage.includes('data-content-forge-generator="' + projector.GENERATOR_REF + '"'), 'MIGRATION_GENERATOR_OWNERSHIP', migration.slug);
    invariant(!finalPage.includes('/__vex/missing-asset.svg'), 'MIGRATION_UNRESOLVED_ASSET', migration.slug);
    for (const resolution of migration.assetResolutions) {
      invariant(finalPage.includes(resolution.resolvedSrc), 'MIGRATION_ASSET_RESOLUTION_MISSING', resolution.alt);
    }
    for (const resolution of migration.linkResolutions) {
      invariant(finalPage.includes(resolution.toHref), 'MIGRATION_LINK_RESOLUTION_MISSING', resolution.fromHref);
    }

    strings._meta.sourceProvenance.migration.resultFingerprint =
      migrationResultFingerprint(finalPageBytes, strings, viewmodelsAfter[migration.slug]);
    writeAtomic(stringsPath, JSON.stringify(strings, null, 2) + '\n');

    fs.unlinkSync(backupPath);
    const result = {
      schemaVersion: 'vex-content-forge.stale-page-migration-result/v0.1',
      slug: migration.slug,
      disposition: 'MIGRATED',
      destinationPreimageGitBlob: migration.expectedDestinationGitBlob,
      sourceGitBlob: member.sourceGitBlob,
      sourceSha256: member.preservedHtmlSha256,
      changedPaths: [...new Set([...projectionResult.changedPaths, migration.destinationPath, path.relative(root, stringsPath)])].sort(),
      preservedSourceMutationPerformed: false,
    };
    if (!options.silent) process.stdout.write(JSON.stringify(result, null, 2) + '\n');
    return result;
  } catch (error) {
    if (fs.existsSync(pagePath)) fs.unlinkSync(pagePath);
    if (fs.existsSync(backupPath)) fs.renameSync(backupPath, pagePath);
    if (stringsBefore === null) {
      if (fs.existsSync(stringsPath)) fs.unlinkSync(stringsPath);
    } else {
      writeAtomic(stringsPath, stringsBefore);
    }
    writeAtomic(viewmodelsPath, viewmodelsBefore);
    invariant(fs.readFileSync(sourcePath).equals(sourceBefore), 'MIGRATION_ROLLBACK_SOURCE_CHANGED', member.sourcePath);
    throw error;
  }
}

function cliOptions(argv = process.argv.slice(2)) {
  const options = {};
  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === '--formation') {
      const value = argv[++index];
      invariant(typeof value === 'string' && value.length > 0, 'MIGRATION_CLI_FORMATION', '--formation requires a repository-relative path');
      options.formationRel = value;
    } else {
      throw new StalePageMigrationError('MIGRATION_CLI_ARGUMENT', 'unknown argument: ' + argv[index]);
    }
  }
  return options;
}

if (require.main === module) {
  try {
    main(cliOptions());
  } catch (error) {
    process.stderr.write((error.stack || error.message) + '\n');
    process.exitCode = 1;
  }
}

module.exports = {
  ADAPTER_REF,
  DEFAULT_FORMATION_REL,
  StalePageMigrationError,
  applyResolutions,
  alreadyMigrated,
  migrationContractSha256,
  migrationResultFingerprint,
  main,
  validateMigrationFormation,
};

// [VXG RealForever]
