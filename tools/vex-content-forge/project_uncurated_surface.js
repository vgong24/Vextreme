'use strict';

const fs = require('fs');
const path = require('path');
const {
  cleanAuthoredMain,
  gitBlobSha,
  livePageSlugs,
  normalizeRoutes,
  oneMatch,
} = require('./project_group_homes.js');

const DEFAULT_ROOT = path.resolve(__dirname, '..', '..');
const FORMATION_REL = path.join('docs','ingestion','workmaps','content-forge-visibility-v1-documents-formation.json');
const ASSET_CATALOG_REL = path.join('config','content-assets.json');

class UncuratedSurfaceProjectionError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'UncuratedSurfaceProjectionError';
    this.code = code;
  }
}

const invariant = (condition, code, message) => {
  if (!condition) throw new UncuratedSurfaceProjectionError(code, message);
};

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function resolveAssetReference(catalog, assetId, extension) {
  const override = catalog.location?.overrides?.[assetId];
  const template = override || catalog.location?.defaultPathTemplate;
  invariant(typeof catalog.baseUrl === 'string' && catalog.baseUrl.length > 0, 'ASSET_BASE_URL', assetId);
  invariant(typeof template === 'string' && template.length > 0, 'ASSET_TEMPLATE', assetId);
  const rel = template.replace('{assetId}', assetId).replace('{extension}', extension).replace(/^\/+/, '');
  return catalog.baseUrl.replace(/\/+$/, '') + '/' + rel;
}

function externalizeLogicalAssets(value, catalog) {
  return value.replace(/\/__assets\/([0-9a-f]{64})\.([a-z0-9]+)(?=\b|["')\s])/gi,
    (_all, assetId, extension) => resolveAssetReference(catalog, assetId.toLowerCase(), extension.toLowerCase()));
}

function normalizeRootHome(main) {
  return main
    .replace(/href=(["'])\/(?:#([^"']*))?\1/gi, (_all, quote, hash) =>
      'href="../index.html' + (hash ? '#' + hash : '') + '" data-vex-route-state="repository-live"');
}

function inlineScripts(main) {
  return [...main.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)]
    .map((match, index) => ({ index, attrs: match[1] || '', code: match[2] || '' }));
}

function validateSafeInlineScript(script, member) {
  invariant(!/\bsrc\s*=/i.test(script.attrs), 'INLINE_SCRIPT_EXTERNAL_SRC', member.slug);
  const forbidden = [
    /\bfetch\s*\(/i,
    /\bXMLHttpRequest\b/i,
    /\bWebSocket\b/i,
    /\bEventSource\b/i,
    /\bsendBeacon\s*\(/i,
    /\beval\s*\(/i,
    /\bnew\s+Function\b/i,
    /\bdocument\.cookie\b/i,
    /\blocalStorage\b/i,
    /\bsessionStorage\b/i,
    /\bindexedDB\b/i,
    /cdn\.jsdelivr\.net\/gh\/vgong24\/vextreme/i,
    /_vexLoaderInit/i,
    /VEXTREME_(?:ARCS|PAGES|mount)/,
  ];
  for (const pattern of forbidden) {
    invariant(!pattern.test(script.code), 'INLINE_SCRIPT_FORBIDDEN', member.slug + ': ' + pattern.source);
  }
  return script.code.trim();
}

function escapeHtml(value) {
  return String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function escapeAttribute(value) {
  return escapeHtml(value).replace(/"/g, '&quot;');
}

function projectMember(root, member, allOutputSlugs = []) {
  invariant(/^[a-z0-9][a-z0-9-]*$/.test(member.slug || ''), 'MEMBER_SLUG', String(member.slug));
  invariant(typeof member.sourcePath === 'string' && member.sourcePath.length > 0, 'MEMBER_SOURCE', member.slug);
  invariant(typeof member.sourceGitBlob === 'string' && /^[0-9a-f]{40}$/.test(member.sourceGitBlob), 'MEMBER_BLOB', member.slug);
  invariant(typeof member.title === 'string' && member.title.trim().length > 0, 'MEMBER_TITLE', member.slug);
  invariant(typeof member.description === 'string' && member.description.trim().length > 0, 'MEMBER_DESCRIPTION', member.slug);

  const sourcePath = path.join(root, member.sourcePath);
  invariant(fs.existsSync(sourcePath), 'SOURCE_MISSING', member.sourcePath);
  const bytes = fs.readFileSync(sourcePath);
  invariant(gitBlobSha(bytes) === member.sourceGitBlob, 'SOURCE_BLOB_DRIFT', member.slug);
  const source = bytes.toString('utf8');

  const styleSource = oneMatch(source, /<style(?:\s[^>]*)?>([\s\S]*?)<\/style>/gi, member.slug + ': authored style');
  const sourceMain = oneMatch(source, /(<main\b[\s\S]*?<\/main>)/gi, member.slug + ': authored main');
  invariant((sourceMain.match(/<h1\b/gi) || []).length === 1, 'SOURCE_H1_COUNT', member.slug);

  let safeScript = '';
  if (member.preserveSafeInlineScriptOrdinal !== undefined) {
    invariant(Number.isInteger(member.preserveSafeInlineScriptOrdinal), 'INLINE_SCRIPT_ORDINAL', member.slug);
    const scripts = inlineScripts(sourceMain);
    const selected = scripts[member.preserveSafeInlineScriptOrdinal];
    invariant(selected, 'INLINE_SCRIPT_MISSING', member.slug + ':' + member.preserveSafeInlineScriptOrdinal);
    safeScript = validateSafeInlineScript(selected, member);
  }

  let main = cleanAuthoredMain(sourceMain, { preserveI18n:false });
  main = normalizeRootHome(main);
  main = normalizeRoutes(main, livePageSlugs(root, allOutputSlugs));
  if (safeScript) {
    invariant(main.includes('</main>'), 'MAIN_CLOSE_MISSING', member.slug);
    main = main.replace('</main>', '<script>\n' + safeScript.replace(/<\/script/gi, '<\\/script') + '\n</script>\n</main>');
  }

  const assetCatalog = readJson(path.join(root, ASSET_CATALOG_REL));
  const style = externalizeLogicalAssets(styleSource, assetCatalog);

  const forbidden = [
    /www\.vextreme24\.com/i,
    /\/__rescue\//i,
    /\/__vex\//i,
    /data-vex-id=/i,
    /data-i18n(?:-attrs|-alt|-aria)?=/i,
    /cdn\.jsdelivr\.net\/gh\/vgong24\/vextreme/i,
    /_vexLoaderInit/i,
  ];
  const projected = style + '\n' + main;
  for (const pattern of forbidden) {
    invariant(!pattern.test(projected), 'PROVIDER_RUNTIME_REMAINS', member.slug + ': ' + pattern.source);
  }
  invariant(!/(?:href|src)=(["'])\/(?!\/)/i.test(main), 'ROOT_RELATIVE_ACTIVE_REFERENCE', member.slug);

  const html = '<!DOCTYPE html>\n'
    + '<html lang="en"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1.0"/>\n'
    + '<title>' + escapeHtml(member.title) + ' — Vextreme</title><meta name="description" content="' + escapeAttribute(member.description) + '"/>\n'
    + '<link rel="preconnect" href="https://fonts.googleapis.com"/><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin/>\n'
    + '<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=IBM+Plex+Sans:wght@400;500;600&family=Source+Serif+4:ital,wght@0,300;0,400;0,500;0,600;1,300;1,400&display=swap" rel="stylesheet"/>\n'
    + '<style>' + style.replace(/<\/style/gi, '<\\/style') + '</style></head><body>\n'
    + '<!-- Source-managed uncurated projection of ' + member.sourcePath + '; preserved Git blob ' + member.sourceGitBlob + '. Canonical node/arc placement deliberately unresolved. -->\n'
    + main + '\n'
    + '<script src="../widgets/fab-read-aloud.js"></script>\n'
    + '<!-- [VXG RealForever] -->\n'
    + '</body></html>\n';

  return {
    slug:member.slug,
    page:html,
    pagePath:path.join(root,'pages',member.slug + '.html'),
    preservedSafeInlineScript:!!safeScript,
  };
}

function validateFormation(value) {
  invariant(value?.schemaVersion === 'vex-content-forge.uncurated-surface-formation/v0.1', 'FORMATION_SCHEMA', value?.schemaVersion);
  invariant(value.ownerRef === 'github.issue.vextreme.159', 'FORMATION_OWNER', value.ownerRef);
  invariant(value.effectBoundary?.canonicalNodeMutation === false, 'FORMATION_NODE_BOUNDARY', 'canonical node mutation must remain false');
  invariant(value.effectBoundary?.arcMutation === false, 'FORMATION_ARC_BOUNDARY', 'arc mutation must remain false');
  invariant(value.effectBoundary?.localizationMutation === false, 'FORMATION_LOCALIZATION_BOUNDARY', 'localization mutation must remain false');
  invariant(Array.isArray(value.members) && value.members.length > 0, 'FORMATION_MEMBERS', 'members');
  invariant(new Set(value.members.map(member => member.slug)).size === value.members.length, 'FORMATION_DUPLICATE_SLUG', 'members');
}

function projectFormation(root = DEFAULT_ROOT, options = {}) {
  const formationRel = options.formationRel || FORMATION_REL;
  const formation = readJson(path.join(root, formationRel));
  validateFormation(formation);
  const outputSlugs = formation.members.map(member => member.slug);
  const outputs = formation.members.map(member => projectMember(root, member, outputSlugs));

  if (options.write !== false) {
    for (const output of outputs) {
      invariant(!fs.existsSync(output.pagePath), 'DESTINATION_ALREADY_EXISTS', output.slug);
      fs.writeFileSync(output.pagePath, output.page, 'utf8');
    }
  }
  return outputs;
}

if (require.main === module) {
  try {
    const outputs = projectFormation(DEFAULT_ROOT);
    process.stdout.write('[content-forge-uncurated-surface] projected ' + outputs.map(item => item.slug).join(', ') + '\n');
  } catch (error) {
    process.stderr.write((error.stack || error.message) + '\n');
    process.exitCode = 1;
  }
}

module.exports = {
  ASSET_CATALOG_REL,
  DEFAULT_ROOT,
  FORMATION_REL,
  UncuratedSurfaceProjectionError,
  escapeAttribute,
  escapeHtml,
  externalizeLogicalAssets,
  inlineScripts,
  normalizeRootHome,
  projectFormation,
  projectMember,
  resolveAssetReference,
  validateFormation,
  validateSafeInlineScript,
};

// [VXG RealForever]
