#!/usr/bin/env node
// Exports strings source files to per-scope CSV batches for translators.
// Output: data/strings/batches/export/{scope}/{scope}.{lang}.csv
//
// CSV columns: key, context, en_text, en_aria_label, source_en_hash12,
//              {lang}_text, {lang}_aria_label, notes
//
// Context is a bounded projection of facts already owned by canonical string
// source and, for page scopes, the current page HTML. It is translator aid
// only — not a second content/identity/glossary authority.
//
// Usage:
//   node lib/strings-export.js [--lang ja] [--scope archives]
//   (no args = export all scopes for all non-EN languages)

const fs = require('fs');
const path = require('path');
const parse5 = require('parse5');
const { Language, isSourceOnlyTranslation } = require('./vex-config');
const { contentHash } = require('./strings-compile');

const ROOT = path.join(__dirname, '..');
const SOURCE_DIR = path.join(ROOT, 'data', 'strings', 'source');
const EXPORT_DIR = path.join(ROOT, 'data', 'strings', 'batches', 'export');
const PAGES_DIR = path.join(ROOT, 'pages');

function parseArgs(args) {
  let filterLang = null;
  let filterScope = null;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--lang' || arg === '--scope') {
      const value = args[++i];
      if (!value || value.startsWith('--')) throw new Error(`${arg} requires a value`);
      if (arg === '--lang') filterLang = value;
      else filterScope = value;
      continue;
    }
    throw new Error(`unknown argument: ${arg}`);
  }

  if (filterLang === Language.EN) throw new Error('EN is the source language and cannot be exported as a translation target');
  return { filterLang, filterScope };
}

function collectSourceFiles(dir, baseDir) {
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    const rel = path.relative(baseDir, full);
    if (entry.isDirectory()) {
      results.push(...collectSourceFiles(full, baseDir));
    } else if (entry.name.endsWith('.json')) {
      results.push({ full, rel, scope: entry.name.replace('.json', '') });
    }
  }
  return results;
}

function escapeCSV(val) {
  if (val == null) return '';
  const s = String(val);
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

function csvRow(...cols) {
  return cols.map(escapeCSV).join(',');
}

function targetLanguages(raw, filterLang) {
  if (filterLang) return [filterLang];

  const langs = new Set();
  for (const [key, value] of Object.entries(raw)) {
    if (key === '_meta' || !value.strings) continue;
    for (const lang of Object.keys(value.strings)) {
      if (lang !== Language.EN) langs.add(lang);
    }
  }
  return Array.from(langs).sort();
}

function nodeAttr(node, name) {
  const attr = (node && node.attrs || []).find(item => item.name === name);
  return attr ? attr.value : '';
}

function nodeClasses(node) {
  return nodeAttr(node, 'class').split(/\s+/).filter(Boolean);
}

function nodeText(node) {
  if (!node) return '';
  if (node.nodeName === '#text') return node.value || '';
  return (node.childNodes || []).map(nodeText).join('');
}

function buildHtmlContextMap(html) {
  if (!html) return {};
  const document = parse5.parse(String(html));
  const result = {};
  let nearestHeading = '';
  let previousKey = null;

  function visit(node, ancestorClasses) {
    if (!node) return;

    const tag = node.tagName || '';
    const classes = nodeClasses(node);
    const nextAncestors = classes.length
      ? [...ancestorClasses, ...classes]
      : ancestorClasses;

    if (/^h[1-6]$/.test(tag)) {
      const heading = nodeText(node).replace(/\s+/g, ' ').trim();
      if (heading) nearestHeading = heading;
    }

    const key = nodeAttr(node, 'data-i18n');
    if (key) {
      result[key] = {
        tag,
        classes,
        ancestorClasses: ancestorClasses.slice(),
        nearestHeading,
        previousKey,
      };
      previousKey = key;
    }

    for (const child of node.childNodes || []) visit(child, nextAncestors);
  }

  visit(document, []);
  return result;
}

function pageSlugForRaw(raw) {
  const scope = raw && raw._meta && raw._meta.scope;
  return typeof scope === 'string' && scope.startsWith('pages.')
    ? scope.slice('pages.'.length)
    : null;
}

function htmlContextForRaw(raw) {
  const slug = pageSlugForRaw(raw);
  if (!slug) return {};
  const pagePath = path.join(PAGES_DIR, slug + '.html');
  if (!fs.existsSync(pagePath)) return {};
  return buildHtmlContextMap(fs.readFileSync(pagePath, 'utf8'));
}

function englishText(entry) {
  return entry && entry.strings && entry.strings[Language.EN]
    ? entry.strings[Language.EN].text || ''
    : '';
}

function siblingIdentityText(raw, entry, wantedField) {
  const identity = entry && entry.identity;
  if (!identity || !identity.contentNodeKey) return '';

  for (const [key, candidate] of Object.entries(raw || {})) {
    if (key === '_meta' || !candidate || !candidate.identity) continue;
    if (candidate.identity.contentNodeKey !== identity.contentNodeKey) continue;
    if (candidate.identity.fieldKey !== wantedField) continue;
    const text = englishText(candidate);
    if (text) return text;
  }
  return '';
}

function sharedPrefixSegments(left, right) {
  const a = String(left || '').split('.');
  const b = String(right || '').split('.');
  let count = 0;
  while (count < a.length && count < b.length && a[count] === b[count]) count += 1;
  return count;
}

function deriveRole(key, entry, htmlContext) {
  const classes = [
    ...((htmlContext && htmlContext.classes) || []),
    ...((htmlContext && htmlContext.ancestorClasses) || []),
  ];

  if (classes.includes('qa-answer') || /\.answer$/.test(key)) return 'answer';
  if (classes.includes('qa-question') || /\.question$/.test(key)) return 'question';
  if (classes.includes('part-title')) return 'part-title';
  if (classes.includes('voice-label')) return 'speaker-label';
  if (classes.includes('voice-block')) return 'speaker-authored-body';

  const field = entry && entry.identity && entry.identity.fieldKey;
  if (field) return `record-${field}`;

  if (key.startsWith('common.nav.')) return 'navigation-action';
  if (key.startsWith('common.status.')) return 'status-template';
  if (htmlContext && /^h[1-6]$/.test(htmlContext.tag || '')) return 'heading';
  return '';
}

function placeholderEvidence(text) {
  const tokens = new Set();
  const source = String(text || '');
  const re = /\{([A-Za-z_][A-Za-z0-9_-]*)\b/g;
  let match;
  while ((match = re.exec(source))) tokens.add(`{${match[1]}}`);
  if (/\bplural\b/.test(source) && source.includes('#')) tokens.add('#');

  if (!tokens.size) return null;
  return {
    tokens: Array.from(tokens),
    description: /\bplural\b/.test(source)
      ? 'ICU-style plural/message placeholders'
      : 'message placeholders',
  };
}

function unusualSelfReferenceTokens(text) {
  const source = String(text || '');
  const tokens = new Set();
  const re = /\b(Myself|My|Mine|Me|Ourselves|Our|Ours|Us)\b/g;
  let match;

  while ((match = re.exec(source))) {
    const before = source.slice(0, match.index).trimEnd();
    if (!before) continue;
    if (/[.!?][\"'”’)]?$/.test(before)) continue;
    tokens.add(match[1]);
  }

  return Array.from(tokens);
}

function sourceTextForKey(raw, key) {
  return raw && raw[key] ? englishText(raw[key]) : '';
}

function buildTranslatorContext(raw, key, entry, htmlContextMap) {
  const meta = raw._meta || {};
  const en = entry.strings && entry.strings[Language.EN] || {};
  const htmlContext = htmlContextMap[key] || {};
  const role = deriveRole(key, entry, htmlContext);
  const parts = [];

  if (role) parts.push(`role=${role}`);

  if (role === 'answer') {
    const questionKey = key.replace(/\.answer$/, '.question');
    if (questionKey !== key) {
      const question = sourceTextForKey(raw, questionKey);
      if (question) parts.push(`paired-question=${question}`);
    }
  }

  if (htmlContext.nearestHeading && htmlContext.nearestHeading !== en.text) {
    parts.push(`nearest-heading=${htmlContext.nearestHeading}`);
  }

  const identity = entry.identity || {};
  if (identity.contentNodeKey) {
    const heading = siblingIdentityText(raw, entry, 'title');
    if (heading && heading !== en.text) parts.push(`record-heading=${heading}`);
  }
  if (identity.canonicalElementId) parts.push(`canonical-element-id=${identity.canonicalElementId}`);
  if (identity.currentElementId) parts.push(`current-element-id=${identity.currentElementId}`);

  const previousKey = htmlContext.previousKey;
  if (previousKey && sharedPrefixSegments(key, previousKey) >= 4) {
    const previousText = sourceTextForKey(raw, previousKey);
    if (role === 'part-title' && /^Part\b/i.test(previousText)) {
      parts.push(`paired-part-label=${previousText}`);
    }
    if (role === 'speaker-authored-body' && /\b(?:Speaks|Says|Voice)\b/i.test(previousText)) {
      parts.push(`speaker-label=${previousText}`);
    }
  }

  const structuralClasses = [
    ...(htmlContext.classes || []),
    ...(htmlContext.ancestorClasses || []),
  ].filter((value, index, all) => (
    /^(?:qa-|part-|voice-)/.test(value) && all.indexOf(value) === index
  ));
  if (structuralClasses.length) parts.push(`container-class=${structuralClasses.join(' ')}`);

  const provenance = meta.sourceProvenance && meta.sourceProvenance.preservedPath;
  if (provenance) parts.push(`provenance=${provenance}`);

  const placeholders = placeholderEvidence(en.text);
  if (placeholders) {
    parts.push(`source-syntax=${placeholders.description} ${placeholders.tokens.join('/')}`);
  }

  if (en['aria-label']) parts.push(`aria-label=${en['aria-label']}`);

  if ((!parts.length || key.startsWith('common.')) && meta.description) {
    parts.push(`source-meta=${meta.description}`);
  }

  return parts.join(' ; ');
}

function buildTranslatorNotes(entry, enText, lang) {
  const notes = [];
  const target = entry && entry.strings && entry.strings[lang];
  if (target && target._stale) notes.push('STALE — EN source changed, please retranslate');

  const placeholders = placeholderEvidence(enText);
  if (placeholders) {
    notes.push(`Preserve placeholder tokens exactly: ${placeholders.tokens.join(', ')}.`);
  }

  const unusualCaps = unusualSelfReferenceTokens(enText);
  if (unusualCaps.length) {
    notes.push(
      `Source contains unusual internal self-reference capitalization (${unusualCaps.join(', ')}); preserve intentional capitalization/voice styling where natural in the target language.`
    );
  }

  return notes.join(' ');
}

function translatorHeaders(lang) {
  if (!lang || lang === Language.EN) throw new Error('a non-EN target locale is required');
  return [
    'key',
    'context',
    'en_text',
    'en_aria_label',
    'source_en_hash12',
    `${lang}_text`,
    `${lang}_aria_label`,
    'notes',
  ];
}

function buildTranslatorRow(raw, key, value, lang, options = {}) {
  if (!value || !value.strings) return null;
  const headers = translatorHeaders(lang);
  const htmlContextMap = options.htmlContextMap || {};
  const en = value.strings[Language.EN] || {};
  const translation = value.strings[lang] || {};
  const sourceEnHash12 = Object.keys(en).length > 0
    ? contentHash(JSON.stringify(en))
    : '';

  return {
    [headers[0]]: key,
    [headers[1]]: buildTranslatorContext(raw, key, value, htmlContextMap),
    [headers[2]]: en.text || '',
    [headers[3]]: en['aria-label'] || '',
    [headers[4]]: sourceEnHash12,
    [headers[5]]: translation.text || '',
    [headers[6]]: translation['aria-label'] || '',
    [headers[7]]: buildTranslatorNotes(value, en.text || '', lang),
  };
}

function renderTranslatorCSV(rows, lang) {
  const headers = translatorHeaders(lang);
  const lines = [csvRow(...headers)];
  for (const row of rows || []) {
    lines.push(csvRow(...headers.map(header => row[header] || '')));
  }
  return lines.join('\n') + '\n';
}

function buildTranslatorRows(raw, lang, options = {}) {
  if (!lang || lang === Language.EN) throw new Error('a non-EN target locale is required');
  if (isSourceOnlyTranslation(raw && raw._meta)) {
    throw new Error('source scope is source-only and cannot form a translator batch');
  }

  const rows = [];
  for (const [key, value] of Object.entries(raw)) {
    if (key === '_meta' || !value.strings) continue;
    const row = buildTranslatorRow(raw, key, value, lang, options);
    if (row) rows.push(row);
  }
  return rows;
}

function buildTranslatorCSV(raw, lang, options = {}) {
  return renderTranslatorCSV(buildTranslatorRows(raw, lang, options), lang);
}

function main(args = process.argv.slice(2)) {
  const { filterLang, filterScope } = parseArgs(args);
  const files = collectSourceFiles(SOURCE_DIR, SOURCE_DIR);

  for (const { full, scope } of files) {
    if (filterScope && scope !== filterScope) continue;

    const raw = JSON.parse(fs.readFileSync(full, 'utf8'));
    if (isSourceOnlyTranslation(raw._meta)) {
      console.log(`[strings-export] Skipping ${scope} — translationPolicy=source-only`);
      continue;
    }
    const langs = targetLanguages(raw, filterLang);
    const htmlContextMap = htmlContextForRaw(raw);

    for (const lang of langs) {
      const outDir = path.join(EXPORT_DIR, scope);
      fs.mkdirSync(outDir, { recursive: true });
      const outPath = path.join(outDir, `${scope}.${lang}.csv`);
      const csv = buildTranslatorCSV(raw, lang, { htmlContextMap });

      fs.writeFileSync(outPath, csv);
      const stringCount = Object.entries(raw)
        .filter(([key, value]) => key !== '_meta' && value.strings)
        .length;
      console.log(`[strings-export] Wrote ${outPath} (${stringCount} strings)`);
    }
  }
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error(`[strings-export] BLOCKED — ${error.message}`);
    process.exitCode = 1;
  }
}

module.exports = {
  parseArgs,
  collectSourceFiles,
  escapeCSV,
  csvRow,
  targetLanguages,
  nodeAttr,
  nodeClasses,
  nodeText,
  buildHtmlContextMap,
  pageSlugForRaw,
  htmlContextForRaw,
  siblingIdentityText,
  sharedPrefixSegments,
  deriveRole,
  placeholderEvidence,
  unusualSelfReferenceTokens,
  buildTranslatorContext,
  buildTranslatorNotes,
  translatorHeaders,
  buildTranslatorRow,
  renderTranslatorCSV,
  buildTranslatorRows,
  buildTranslatorCSV,
  main,
};

// [VXG RealForever]
