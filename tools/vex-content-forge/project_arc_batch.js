'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const parse5 = require('parse5');

const DEFAULT_ROOT = path.resolve(__dirname, '..', '..');
const FORMATION_REL = path.join('docs', 'ingestion', 'workmaps', 'content-forge-convos-with-god-arc-batch-formation.json');
const NODES_REL = path.join('data', 'nodes.json');
const ARCS_REL = path.join('data', 'arcs-v2.json');
const INTENTS_REL = path.join('config', 'content-intents.json');
const VIEWMODELS_REL = path.join('data', 'viewmodels.json');
const ASSET_CATALOG_REL = path.join('config', 'content-assets.json');
const GENERATOR_REF = 'tools/vex-content-forge/project_arc_batch.js';
const HTML_NS = 'http://www.w3.org/1999/xhtml';
const ASSET_FILENAME = /^([0-9a-f]{64})\.([A-Za-z0-9]+)$/i;
const ROOT_RELATIVE_ASSET_REF = /(^|["'(\s,=])\/__assets\/([0-9a-f]{64}\.[A-Za-z0-9]+)/m;
const ROOT_RELATIVE_ASSET_REF_GLOBAL = /(^|["'(\s,=])\/__assets\/([0-9a-f]{64}\.[A-Za-z0-9]+)/gm;

const GENERIC_STYLE = `
:root{--paper:#fafaf9;--ink:#1c1917;--muted:#78716c;--line:#e7e5e4;--accent:#b45830}
*{box-sizing:border-box}html,body{margin:0;background:var(--paper);color:var(--ink)}body{font:clamp(15.5px,1.55vw,17px)/1.78 "IBM Plex Sans",sans-serif}main{width:min(780px,calc(100% - 40px));margin:auto;padding:64px 0 88px}.page-head{padding-bottom:32px;border-bottom:1px solid var(--line);margin-bottom:38px}.eyebrow{margin:0 0 10px;color:var(--accent);font:500 11px/1.4 "IBM Plex Mono",monospace;letter-spacing:.15em;text-transform:uppercase}h1{margin:0;font:400 clamp(36px,7vw,62px)/1.03 "Source Serif 4",serif}.meta{display:flex;gap:8px 14px;flex-wrap:wrap;margin-top:18px;color:var(--muted);font:12px/1.5 "IBM Plex Mono",monospace}.transcript p{margin:0 0 1.15rem}.transcript h2,.transcript h3,.transcript h4,.transcript h5,.transcript h6{font-family:"Source Serif 4",serif;line-height:1.25}.transcript img{max-width:100%;height:auto}.arc-wrap{margin-top:52px;padding-top:32px;border-top:1px solid var(--line)}
`.trim();
const AUTHORED_STYLE = `
:root{--paper:#fafaf9;--ink:#1c1917;--line:#e7e5e4}*{box-sizing:border-box}html,body{margin:0;min-height:100%;background:var(--paper);color:var(--ink)}.vex-authored-page-frame{width:min(900px,calc(100% - 40px));margin:auto;padding:56px 0 88px}.arc-wrap{margin-top:52px;padding-top:32px;border-top:1px solid var(--line)}
`.trim();

class ProjectionInvariantError extends Error {
  constructor(code, message) { super(message); this.name = 'ProjectionInvariantError'; this.code = code; }
}
const invariant = (condition, code, message) => { if (!condition) throw new ProjectionInvariantError(code, message); };
const readJson = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const sha256 = data => crypto.createHash('sha256').update(data).digest('hex');
const gitBlobSha = data => crypto.createHash('sha1').update(Buffer.from(`blob ${data.length}\0`)).update(data).digest('hex');
const attrs = node => Object.fromEntries((node.attrs || []).map(item => [item.name, item.value]));
const classes = node => (attrs(node).class || '').split(/\s+/).filter(Boolean);
const escapeHtml = value => String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const pad = value => String(value).padStart(3, '0');

function loadAssetCatalog(root) {
  const value = readJson(path.join(root, ASSET_CATALOG_REL));
  invariant(value?.schemaVersion === 'vextreme.content-assets/v2', 'ASSET_CATALOG_SCHEMA', value?.schemaVersion || 'missing');
  invariant(value.resolution === 'BUILD_TIME', 'ASSET_CATALOG_RESOLUTION', value.resolution);
  invariant(typeof value.baseUrl === 'string' && /^https:\/\/[^/]+(?:\/[^/]+)*$/.test(value.baseUrl), 'ASSET_CATALOG_BASE_URL', value.baseUrl);
  invariant(value.logicalReference?.prefix === '/__assets/', 'ASSET_CATALOG_LOGICAL_PREFIX', value.logicalReference?.prefix);
  invariant(value.logicalReference?.assetIdFormat === '64_HEX_EXPORTED_ID', 'ASSET_CATALOG_ID_FORMAT', value.logicalReference?.assetIdFormat);
  invariant(typeof value.location?.defaultPathTemplate === 'string'
    && value.location.defaultPathTemplate.includes('{assetId}')
    && value.location.defaultPathTemplate.includes('{extension}'),
    'ASSET_CATALOG_TEMPLATE', value.location?.defaultPathTemplate);
  invariant(value.location?.overrides && typeof value.location.overrides === 'object' && !Array.isArray(value.location.overrides), 'ASSET_CATALOG_OVERRIDES', 'overrides');
  for (const [assetId, mappedPath] of Object.entries(value.location.overrides)) {
    invariant(/^[0-9a-f]{64}$/.test(assetId), 'ASSET_CATALOG_OVERRIDE_ID', assetId);
    invariant(typeof mappedPath === 'string' && mappedPath.length > 0 && !mappedPath.startsWith('/') && !mappedPath.split('/').includes('..'), 'ASSET_CATALOG_OVERRIDE_PATH', assetId);
  }
  return {
    baseUrl: value.baseUrl.replace(/\/+$/, ''),
    logicalPrefix: value.logicalReference.prefix,
    defaultPathTemplate: value.location.defaultPathTemplate,
    overrides: value.location.overrides,
    provider: value.provider,
  };
}
function resolveAssetReference(filename, catalog) {
  const match = ASSET_FILENAME.exec(String(filename));
  invariant(match, 'ASSET_REFERENCE_FORMAT', String(filename));
  const assetId = match[1].toLowerCase();
  const extension = match[2].toLowerCase();
  const mappedPath = catalog.overrides[assetId]
    || catalog.defaultPathTemplate.replaceAll('{assetId}', assetId).replaceAll('{extension}', extension);
  invariant(typeof mappedPath === 'string' && mappedPath.length > 0 && !mappedPath.startsWith('/') && !mappedPath.split('/').includes('..'), 'ASSET_RESOLVED_PATH', assetId);
  return `${catalog.baseUrl}/${mappedPath}`;
}
function rewriteAssetText(value, catalog) {
  return String(value).replace(ROOT_RELATIVE_ASSET_REF_GLOBAL, (_match, lead, filename) => lead + resolveAssetReference(filename, catalog));
}
function externalizeAssetReferences(root, catalog) {
  walk(root, current => {
    if (current.tagName) current.attrs = (current.attrs || []).map(item => ({ ...item, value: rewriteAssetText(item.value, catalog) }));
    if (current.nodeName === '#text' && current.parentNode?.tagName === 'style') current.value = rewriteAssetText(current.value || '', catalog);
  });
}

function setNodeAttr(node, name, value) {
  const attrsList = node.attrs || (node.attrs = []);
  const current = attrsList.find(item => item.name === name);
  if (current) current.value = value;
  else attrsList.push({ name, value });
}
function removeNodeAttr(node, name) {
  node.attrs = (node.attrs || []).filter(item => item.name !== name);
}
function repositoryPageSlugs(root) {
  const dir = path.join(root, 'pages');
  if (!fs.existsSync(dir)) return new Set();
  return new Set(fs.readdirSync(dir).filter(file => file.endsWith('.html')).map(file => file.replace(/\.html$/, '')));
}
function rewriteRepositoryRoutes(root, selected, additionalSlugs = []) {
  const live = repositoryPageSlugs(root);
  for (const slug of additionalSlugs || []) live.add(slug);
  walk(selected, current => {
    if (current.tagName !== 'a') return;
    const href = attrs(current).href;
    if (!href || !/^\/(?!\/|Vextreme\/)/.test(href)) return;
    const route = /^\/([a-z0-9][a-z0-9-]*)([?#].*)?$/i.exec(href);
    if (!route) return;
    const slug = route[1];
    const suffix = route[2] || '';
    if (slug === 'archives') {
      setNodeAttr(current, 'href', '../index.html' + suffix);
      setNodeAttr(current, 'data-vex-route-state', 'repository-live');
      return;
    }
    if (live.has(slug)) {
      setNodeAttr(current, 'href', slug + '.html' + suffix);
      setNodeAttr(current, 'data-vex-route-state', 'repository-live');
      return;
    }
    removeNodeAttr(current, 'href');
    setNodeAttr(current, 'data-vex-route-state', 'held-not-ported');
    setNodeAttr(current, 'aria-disabled', 'true');
  });
}

function walk(node, visit) {
  if (!node) return;
  visit(node);
  for (const child of node.childNodes || []) walk(child, visit);
}
function findAll(node, predicate) {
  const result = [];
  walk(node, current => { if (predicate(current)) result.push(current); });
  return result;
}
function findFirst(node, predicate) { return findAll(node, predicate)[0] || null; }
function rawText(node) {
  if (!node) return '';
  if (node.nodeName === '#text') return node.value || '';
  return (node.childNodes || []).map(rawText).join('');
}
function textLeaves(node) {
  return findAll(node, current => current.nodeName === '#text')
    .map(current => (current.value || '').replace(/\s+/g, ' ').trim()).filter(Boolean);
}
function remove(node) {
  const parent = node.parentNode;
  if (!parent?.childNodes) return;
  const index = parent.childNodes.indexOf(node);
  if (index >= 0) parent.childNodes.splice(index, 1);
}
function element(tagName, entries = []) {
  return { nodeName: tagName, tagName, attrs: entries.map(([name, value]) => ({ name, value })), namespaceURI: HTML_NS, childNodes: [], parentNode: null };
}
function replace(parent, current, next) {
  const index = parent.childNodes.indexOf(current);
  invariant(index >= 0, 'AST_BINDING', 'parent/child binding lost');
  parent.childNodes[index] = next;
  next.parentNode = parent;
}

function sanitize(root, adapter) {
  let h1Seen = false;
  function visit(node) {
    for (const child of [...(node.childNodes || [])]) {
      if (child.tagName) {
        const a = attrs(child);
        const tokens = classes(child);
        const archiveBackLink = adapter === 'AUTHORED_MAIN_FRAGMENT'
          && child.tagName === 'a'
          && a.href === '/archives'
          && /^←?\s*Archives$/i.test(rawText(child).trim());
        const chrome = ['script', 'noscript', 'template'].includes(child.tagName)
          || a.id === 'arcNavMount'
          || tokens.some(token => /^(?:arc-wrap|arc-nav|entry-nav|back-nav|page-back|vex-back|f-back)/.test(token))
          || archiveBackLink
          || (adapter === 'AUTHORED_MAIN_FRAGMENT' && child.tagName === 'nav');
        if (chrome) { remove(child); continue; }
        if (child.tagName === 'h1') {
          if (adapter === 'SQS_AUTHORED_BODY' || h1Seen) child.nodeName = child.tagName = 'h2';
          else h1Seen = true;
        }
        child.attrs = (child.attrs || []).filter(item => {
          const name = item.name.toLowerCase();
          const value = String(item.value || '');
          if (name === 'data-i18n' || name === 'data-i18n-attrs' || name.startsWith('data-vex') || name.startsWith('data-sqsp') || name.startsWith('on')) return false;
          if ((name === 'href' || name === 'src') && (/^javascript:/i.test(value) || value.includes('/__rescue/'))) return false;
          if (name === 'id' && (value === 'arcNavMount' || value.startsWith('vex-generated:'))) return false;
          if (adapter === 'SQS_AUTHORED_BODY' && ['class', 'id', 'style'].includes(name)) return false;
          return true;
        });
      }
      visit(child);
    }
  }
  visit(root);
  return h1Seen;
}

function selectSqsBody(document) {
  const candidates = findAll(document, node => node.tagName === 'div'
    && classes(node).includes('sqs-html-content')
    && Object.hasOwn(attrs(node), 'data-sqsp-text-block-content'));
  invariant(candidates.length, 'SQS_BODY_NOT_FOUND', 'no authored Squarespace body');
  candidates.sort((left, right) => textLeaves(right).join(' ').length - textLeaves(left).join(' ').length);
  invariant(textLeaves(candidates[0]).length, 'SQS_BODY_EMPTY', 'selected Squarespace body is empty');
  return candidates[0];
}
function selectAuthoredMain(document) {
  const main = findFirst(document, node => node.tagName === 'main' && classes(node).includes('vex-authored-page-frame'));
  invariant(main, 'AUTHORED_MAIN_NOT_FOUND', 'no main.vex-authored-page-frame');
  return main;
}
function authoredStyles(document) {
  const result = [];
  const seen = new Set();
  for (const node of findAll(document, current => current.tagName === 'style')) {
    const value = rawText(node).trim();
    if (!value || seen.has(value) || /__rescue|__vex|vex-native-site-nav/i.test(value)) continue;
    seen.add(value);
    result.push(value.replace(/<\/style/gi, '<\\/style'));
  }
  invariant(result.length, 'AUTHORED_STYLE_NOT_FOUND', 'no safe authored style block');
  return result;
}

function localize(root, scope) {
  const strings = {};
  function visit(parent, segments) {
    const counts = new Map();
    let textCount = 0;
    for (const child of [...(parent.childNodes || [])]) {
      if (child.nodeName === '#text') {
        const compact = String(child.value || '').replace(/\s+/g, ' ');
        if (!compact.trim()) continue;
        const value = `${/^\s/.test(child.value) ? ' ' : ''}${compact.trim()}${/\s$/.test(child.value) ? ' ' : ''}`;
        const key = `${scope}.body.${segments.length ? `${segments.join('.')}.` : ''}text${pad(++textCount)}`;
        const span = element('span', [['data-i18n', key]]);
        const text = { nodeName: '#text', value, parentNode: span };
        span.childNodes.push(text);
        replace(parent, child, span);
        strings[key] = value;
      } else if (child.tagName) {
        if (['style','title'].includes(child.tagName)) continue;
        const tag = child.tagName.toLowerCase().replace(/[^a-z0-9-]/g, '') || 'node';
        const count = (counts.get(tag) || 0) + 1;
        counts.set(tag, count);
        visit(child, [...segments, `${tag}${pad(count)}`]);
      }
    }
  }
  visit(root, []);
  return strings;
}

function isoDate(value) {
  const match = /^(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2}),\s+(\d{4})$/.exec(value);
  invariant(match, 'NODE_DATE_UNSUPPORTED', `unsupported date ${value}`);
  const months = { January:'01', February:'02', March:'03', April:'04', May:'05', June:'06', July:'07', August:'08', September:'09', October:'10', November:'11', December:'12' };
  return `${match[3]}-${months[match[1]]}-${String(match[2]).padStart(2, '0')}`;
}
function sourcePart(value) { return value.match(/source-pages\/(part-\d+)\//)?.[1] || 'preserved-source'; }
function pageHead(title, scope, description, style) {
  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title data-i18n="${scope}.document-title">${escapeHtml(title)} — Vextreme</title><meta name="description" content="${escapeHtml(description)}"/>
<link rel="preconnect" href="https://fonts.googleapis.com"/><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin/>
<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=IBM+Plex+Sans:wght@400;500;600&family=Source+Serif+4:wght@400;600&display=swap" rel="stylesheet"/>
<link rel="stylesheet" href="../styles/arc-nav.css"/><style>${style}</style></head>`;
}
function sourceStrings(member, node, sourceHash, body, fixed, stats) {
  const scope = `pages.${member.slug}`;
  const output = { _meta: {
    scope, category: 'production', description: `Repository-native English string source for ${node.title}.`,
    keyConvention: `${scope}.{document-title|eyebrow|title|meta.*|body.<structural-path>.textNNN}`,
    sourceProvenance: {
      adapterClass: member.adapterClass, route: member.sourceRoute, preservedPath: member.sourcePath,
      preservedGitBlob: member.sourceGitBlob, preservedHtmlSha256: sourceHash, pageId: member.pageId,
      proposalRecordRef: member.proposalRecordRef, projectionRule: 'SOURCE_LINEAGES_PRESERVED__DIRECT_COPY_FORBIDDEN',
    }, projectionStats: stats,
  } };
  for (const [key, text] of Object.entries({ ...fixed, ...body })) output[key] = { strings: { en: { text } } };
  return output;
}
function validatePage(page, strings, member) {
  for (const marker of ['window.__RESCUE_SOURCE','/__rescue/','data-sqsp-','data-vex-id=','vex-generated:','vexsite-provider-shell','common.nav.']) {
    invariant(!page.includes(marker), 'FORBIDDEN_SOURCE_IDENTITY', `${member.slug}: ${marker}`);
  }
  for (const match of page.matchAll(/data-i18n="([^"]+)"/g)) {
    const key = match[1];
    invariant(key.startsWith(`pages.${member.slug}.`), 'LOCALIZATION_SCOPE_LEAK', key);
    invariant(strings[key]?.strings?.en?.text !== undefined, 'LOCALIZATION_SOURCE_MISSING', key);
  }
  invariant(!ROOT_RELATIVE_ASSET_REF.test(page), 'ROOT_RELATIVE_ASSET_REFERENCE', member.slug);
  invariant(!/<a\b[^>]*\bhref=["']\/(?!\/|Vextreme\/)/i.test(page), 'ROOT_RELATIVE_INTERNAL_ROUTE', member.slug);
  invariant((page.match(/<h1(?:\s|>)/g) || []).length === 1, 'DOCUMENT_H1_COUNT_INVALID', member.slug);
  invariant(page.includes('id="arcNavMount"') && page.includes(`../dist/vextreme-${member.slug}.js`), 'RUNTIME_BINDING_MISSING', member.slug);
}

function projectMember(root, member, nodesBySlug, assetCatalog) {
  const node = nodesBySlug.get(member.slug);
  invariant(node && node.id === member.canonicalNodeId && node.title === member.title && JSON.stringify(node.arcKeys) === JSON.stringify(member.arcKeys), 'CANONICAL_NODE_MISMATCH', member.slug);
  invariant(['SQS_AUTHORED_BODY','AUTHORED_MAIN_FRAGMENT'].includes(member.adapterClass), 'ADAPTER_UNSUPPORTED', member.slug);
  const sourcePath = path.join(root, member.sourcePath);
  invariant(fs.existsSync(sourcePath), 'SOURCE_MISSING', member.sourcePath);
  const source = fs.readFileSync(sourcePath);
  invariant(source.length === member.repositoryBytes, 'SOURCE_BYTES_MISMATCH', member.slug);
  invariant(gitBlobSha(source) === member.sourceGitBlob, 'SOURCE_BLOB_MISMATCH', member.slug);
  if (member.preservedHtmlSha256) invariant(sha256(source) === member.preservedHtmlSha256, 'SOURCE_SHA256_MISMATCH', member.slug);

  const document = parse5.parse(source.toString('utf8'));
  externalizeAssetReferences(document, assetCatalog);
  const selected = member.adapterClass === 'SQS_AUTHORED_BODY' ? selectSqsBody(document) : selectAuthoredMain(document);
  const styles = member.adapterClass === 'AUTHORED_MAIN_FRAGMENT' ? authoredStyles(document) : [];
  const h1Seen = sanitize(selected, member.adapterClass);
  rewriteRepositoryRoutes(root, selected);
  const synthesizeCanonicalHeading = member.adapterClass === 'AUTHORED_MAIN_FRAGMENT' && !h1Seen;
  const leaves = textLeaves(selected);
  invariant(leaves.length, 'AUTHORED_TEXT_EMPTY', member.slug);
  const scope = `pages.${member.slug}`;
  const bodyStrings = localize(selected, scope);
  const bodyHtml = parse5.serialize(selected).trim();
  const fixed = { [`${scope}.document-title`]: `${node.title} — Vextreme` };
  if (synthesizeCanonicalHeading) fixed[`${scope}.canonical-title`] = node.title;
  let body;
  if (member.adapterClass === 'SQS_AUTHORED_BODY') {
    Object.assign(fixed, {
      [`${scope}.eyebrow`]: 'Conversations with God', [`${scope}.title`]: node.title,
      [`${scope}.meta.date`]: node.date, [`${scope}.meta.by`]: 'Written By', [`${scope}.meta.author`]: 'Victor Gong',
    });
    body = `<main><header class="page-head"><p class="eyebrow" data-i18n="${scope}.eyebrow">Conversations with God</p><h1 data-i18n="${scope}.title">${escapeHtml(node.title)}</h1><div class="meta"><time datetime="${isoDate(node.date)}" data-i18n="${scope}.meta.date">${escapeHtml(node.date)}</time><span><span data-i18n="${scope}.meta.by">Written By</span> <span data-i18n="${scope}.meta.author">Victor Gong</span></span></div></header><article class="transcript" data-content-forge-body="${member.slug}" data-content-forge-source="${sourcePart(member.sourcePath)}">${bodyHtml}</article><section class="arc-wrap" aria-label="Arc navigation"><div id="arcNavMount"></div></section></main>`;
  } else {
    const sourceClass = classes(selected).filter(token => !/^vex-(?:native|generated)/.test(token));
    if (!sourceClass.includes('vex-authored-page-frame')) sourceClass.unshift('vex-authored-page-frame');
    const canonicalHeading = synthesizeCanonicalHeading
      ? `<h1 class="vex-content-forge-canonical-heading" style="position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);clip-path:inset(50%);white-space:nowrap;" data-i18n="${scope}.canonical-title">${escapeHtml(node.title)}</h1>`
      : '';
    body = `${canonicalHeading}<main class="${escapeHtml([...new Set(sourceClass)].join(' '))}" data-content-forge-body="${member.slug}" data-content-forge-source="${sourcePart(member.sourcePath)}">${bodyHtml}<section class="arc-wrap" aria-label="Arc navigation"><div id="arcNavMount"></div></section></main>`;
  }
  const stats = { adapterClass: member.adapterClass, authoredTextLeafCount: leaves.length };
  if (synthesizeCanonicalHeading) stats.canonicalHeadingSynthesized = true;
  const strings = sourceStrings(member, node, sha256(source), bodyStrings, fixed, stats);
  const style = member.adapterClass === 'SQS_AUTHORED_BODY' ? GENERIC_STYLE : `${AUTHORED_STYLE}\n${styles.join('\n')}`;
  const page = `${pageHead(node.title, scope, `${node.title} — repository-native preserved content.`, style)}<body data-content-forge-generator="${GENERATOR_REF}"><!-- Source-managed ${member.adapterClass} projection of ${member.sourcePath}. -->${body}<script src="../dist/vextreme-${member.slug}.js"></script></body></html>`;
  validatePage(page, strings, member);
  return {
    page, strings, viewmodel: { title: node.title, category: 'production', template: 'page', scopes: [scope], features: ['lang','spiral-fab','theme','map','analysis','arc-nav'] },
    pagePath: path.join(root, 'pages', `${member.slug}.html`), stringsPath: path.join(root, 'data', 'strings', 'source', 'pages', `${member.slug}.json`),
  };
}

function writeAtomic(file, content) {
  const value = content.endsWith('\n') ? content : `${content}\n`;
  if (fs.existsSync(file) && fs.readFileSync(file, 'utf8') === value) return false;
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const temp = `${file}.tmp-${process.pid}-${crypto.randomBytes(4).toString('hex')}`;
  fs.writeFileSync(temp, value, 'utf8'); fs.renameSync(temp, file); return true;
}
function validateFormation(value) {
  invariant(value.schemaVersion === 'vex-content-forge.arc-batch-formation/v0.1', 'FORMATION_SCHEMA', value.schemaVersion);
  invariant(value.ownerRef === 'github.issue.vextreme.159', 'FORMATION_OWNER', value.ownerRef);
  const arc = value.arc || {};
  invariant(typeof arc.arcKey === 'string' && arc.arcKey.length > 0, 'FORMATION_ARC', arc.arcKey);
  invariant(Number.isInteger(arc.canonicalMemberCount) && Number.isInteger(arc.alreadyCompleteCount) && Number.isInteger(arc.remainingCount), 'FORMATION_ACCOUNTING_TYPES', arc.arcKey);
  invariant(Array.isArray(value.alreadyComplete) && Array.isArray(value.members), 'FORMATION_MEMBER_LISTS', arc.arcKey);
  invariant(value.alreadyComplete.length === arc.alreadyCompleteCount && value.members.length === arc.remainingCount && arc.alreadyCompleteCount + arc.remainingCount === arc.canonicalMemberCount, 'FORMATION_ACCOUNTING', arc.arcKey);
  invariant(value.plannedSourceManagedProjector === GENERATOR_REF && typeof value.plannedBatchTest === 'string' && value.plannedBatchTest.length > 0, 'FORMATION_PATHS', 'projector/test');
  const boundary = value.destinationMutationBoundary;
  const projectableMemberCount = value.members.filter(item => !item.preclassifiedHoldReason).length;
  invariant(boundary?.createPages === projectableMemberCount && boundary?.createStringSources === projectableMemberCount && boundary?.modifyViewmodels === true, 'FORMATION_WRITES', 'write membrane');
  for (const member of value.members) {
    if (!member.preclassifiedHoldReason) continue;
    invariant(typeof member.preclassifiedHoldReason === 'string' && member.preclassifiedHoldReason.length > 0, 'FORMATION_PRECLASSIFIED_HOLD_REASON', member.slug);
    for (const field of ['adapterClass','sourcePath','sourceGitBlob','preservedHtmlSha256','repositoryBytes','sourceRoute','pageId','proposalRecordRef','sourceReceiptRef']) {
      invariant(member[field] === undefined, 'FORMATION_PRECLASSIFIED_HOLD_SOURCE_SELECTION', `${member.slug}:${field}`);
    }
  }
  invariant(boundary?.nodeRegistryMutation === false && boundary?.arcRegistryMutation === false && boundary?.contentIntentMutation === false && boundary?.aliasMutation === false, 'FORMATION_HELD', 'held membrane');
  invariant(value.lifecycle?.draftOnly === true && value.lifecycle?.mergeAuthority === false && value.lifecycle?.rawProviderPublicationAuthority === false, 'FORMATION_LIFECYCLE', 'draft only');
}

function main(options = {}) {
  const root = path.resolve(options.root || DEFAULT_ROOT);
  const formationRel = options.formationRel || FORMATION_REL;
  const formation = readJson(path.join(root, formationRel));
  validateFormation(formation);
  const assetCatalog = loadAssetCatalog(root);
  const nodes = readJson(path.join(root, NODES_REL));
  const nodesBySlug = new Map(nodes.map(node => [node.slug, node]));
  const arcs = readJson(path.join(root, ARCS_REL));
  const arc = arcs[formation.arc.arcKey];
  invariant(arc && Array.isArray(arc.sections), 'CANONICAL_ARC_NOT_FOUND', formation.arc.arcKey);
  const formedArcSlugs = [...formation.alreadyComplete, ...formation.members].map(item => item.slug);
  const actualArcSlugs = arc.sections.flatMap(section => Array.isArray(section.slugs) ? section.slugs : []);
  invariant(
    formedArcSlugs.length === actualArcSlugs.length &&
      new Set(formedArcSlugs).size === formedArcSlugs.length &&
      actualArcSlugs.every(slug => formedArcSlugs.includes(slug)),
    'CANONICAL_ARC_MEMBERSHIP_MISMATCH',
    formation.arc.arcKey
  );
  const immutableFiles = [NODES_REL, ARCS_REL, INTENTS_REL];
  const immutableBefore = Object.fromEntries(immutableFiles.map(file => [file, sha256(fs.readFileSync(path.join(root, file)))]));
  const projections = [];
  const members = formation.alreadyComplete.map(item => ({ slug: item.slug, canonicalNodeId: item.canonicalNodeId, disposition: 'ALREADY_COMPLETE', prRef: item.prRef, head: item.head }));
  for (const member of formation.members) {
    if (member.preclassifiedHoldReason) {
      const node = nodesBySlug.get(member.slug);
      invariant(node && node.id === member.canonicalNodeId && node.title === member.title && JSON.stringify(node.arcKeys) === JSON.stringify(member.arcKeys), 'CANONICAL_NODE_MISMATCH', member.slug);
      members.push({ slug: member.slug, canonicalNodeId: member.canonicalNodeId, disposition: 'HOLD_WITH_EXACT_REASON', reason: `PRECLASSIFIED_HOLD: ${member.preclassifiedHoldReason}` });
      continue;
    }
    try {
      const projection = projectMember(root, member, nodesBySlug, assetCatalog);
      projections.push({ member, projection });
      members.push({ slug: member.slug, canonicalNodeId: member.canonicalNodeId, adapterClass: member.adapterClass, disposition: 'PROJECTED', sourceGitBlob: member.sourceGitBlob, sourceSha256: projection.strings._meta.sourceProvenance.preservedHtmlSha256 });
    } catch (error) {
      members.push({ slug: member.slug, canonicalNodeId: member.canonicalNodeId, adapterClass: member.adapterClass, disposition: 'HOLD_WITH_EXACT_REASON', reason: `${error.code || 'UNEXPECTED_PROJECTION_ERROR'}: ${error.message}` });
    }
  }
  invariant(members.length === formation.arc.canonicalMemberCount && new Set(members.map(item => item.slug)).size === formation.arc.canonicalMemberCount, 'BATCH_ACCOUNTING', 'all canonical members');
  const canonicalOrder = new Map(actualArcSlugs.map((slug, index) => [slug, index]));
  members.sort((left, right) => canonicalOrder.get(left.slug) - canonicalOrder.get(right.slug));

  const changedPaths = [];
  if (!options.dryRun) {
    for (const { projection } of projections) {
      if (fs.existsSync(projection.pagePath)) invariant(fs.readFileSync(projection.pagePath, 'utf8').includes(`data-content-forge-generator="${GENERATOR_REF}"`), 'DESTINATION_NOT_OWNED', projection.pagePath);
      if (writeAtomic(projection.pagePath, projection.page)) changedPaths.push(path.relative(root, projection.pagePath));
      if (writeAtomic(projection.stringsPath, JSON.stringify(projection.strings, null, 2))) changedPaths.push(path.relative(root, projection.stringsPath));
    }
    const viewmodelsPath = path.join(root, VIEWMODELS_REL);
    const viewmodels = readJson(viewmodelsPath);
    for (const { member, projection } of projections) viewmodels[member.slug] = projection.viewmodel;
    if (writeAtomic(viewmodelsPath, JSON.stringify(viewmodels, null, 2))) changedPaths.push(VIEWMODELS_REL);
  }
  const immutableAfter = Object.fromEntries(immutableFiles.map(file => [file, sha256(fs.readFileSync(path.join(root, file)))]));
  invariant(JSON.stringify(immutableAfter) === JSON.stringify(immutableBefore), 'HELD_REGISTRY_MUTATION', 'nodes/arcs/intents');
  const result = {
    schemaVersion: 'vex-content-forge.arc-batch-result/v0.1', arcKey: formation.arc.arcKey, generator: GENERATOR_REF,
    accounting: { canonicalMembers: formation.arc.canonicalMemberCount, alreadyComplete: members.filter(item => item.disposition === 'ALREADY_COMPLETE').length, projected: members.filter(item => item.disposition === 'PROJECTED').length, held: members.filter(item => item.disposition === 'HOLD_WITH_EXACT_REASON').length, complete: members.length === formation.arc.canonicalMemberCount },
    members, changedPaths: [...new Set(changedPaths)].sort(), immutableRegistrySha256: immutableAfter,
  };
  if (!options.silent) process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  return result;
}

function cliOptions(argv = process.argv.slice(2)) {
  const options = {};
  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === '--formation') {
      const value = argv[++index];
      invariant(typeof value === 'string' && value.length > 0, 'CLI_FORMATION', '--formation requires a repository-relative path');
      options.formationRel = value;
    } else {
      throw new ProjectionInvariantError('CLI_ARGUMENT', `unknown argument: ${argv[index]}`);
    }
  }
  return options;
}

if (require.main === module) {
  try { process.exitCode = main(cliOptions()).accounting.complete ? 0 : 1; }
  catch (error) { process.stderr.write(`${error.stack || error.message}\n`); process.exitCode = 1; }
}
module.exports = { ASSET_CATALOG_REL, ASSET_FILENAME, DEFAULT_ROOT, FORMATION_REL, GENERATOR_REF, ROOT_RELATIVE_ASSET_REF, ProjectionInvariantError, attrs, cliOptions, externalizeAssetReferences, findAll, findFirst, gitBlobSha, loadAssetCatalog, main, rawText, repositoryPageSlugs, resolveAssetReference, rewriteAssetText, rewriteRepositoryRoutes, selectAuthoredMain, selectSqsBody, sha256, textLeaves, validateFormation };
