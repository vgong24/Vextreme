#!/usr/bin/env node
/**
 * VEXTREME — lib/translation-program.js
 *
 * Page-complete, arc-ordered translation orchestration.
 *
 * This layer does NOT own translation identity or import semantics. It reuses:
 *   - data/index.json for current arc ordering + page scopes;
 *   - data/strings/source/** for canonical EN + target source truth;
 *   - lib/translation-campaign.js for candidate eligibility/order;
 *   - lib/strings-export.js for row/context/hash/CSV formation;
 *   - lib/strings-import.js for returned-row preflight + canonical writes.
 *
 * Intention:
 *   arc -> next incomplete page -> bounded key shard
 *       -> separate CSV per target language
 *       -> existing import contract
 *       -> repeat same page until complete
 *       -> next page
 *
 * The first tier intentionally matches languages the current browser FAB already
 * presents with native flag/name metadata. English remains canonical source.
 *
 * Usage:
 *   npm run translation:program -- --arc liberation --tier global-core
 *   npm run translation:program -- --page journal-zero --tier global-core --limit 80
 *   npm run translation:program -- --arc claude_journals --langs fr,de,es --dry-run
 *
 * [VXG RealForever]
 */

'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const { Language, Scope } = require('./vex-config');
const {
  canonicalScope,
  collectCampaignCandidatesFromSources,
  compareCanonicalText,
  loadCampaignSources,
} = require('./translation-campaign');
const { renderTranslatorCSV } = require('./strings-export');

const ROOT = path.join(__dirname, '..');
const INDEX_PATH = path.join(ROOT, 'data', 'index.json');
const DEFAULT_OUT_DIR = path.join(ROOT, 'data', 'strings', 'batches', 'export', 'program');
const DEFAULT_LIMIT = 80;

const LANGUAGE_TIERS = Object.freeze({
  'global-core': Object.freeze([
    'zh',
    'ja',
    'ko',
    'fr',
    'de',
    'es',
    'pt',
    'ar',
    'hi',
  ]),
});

function parseArgs(args) {
  const options = {
    arc: null,
    page: null,
    tier: 'global-core',
    langs: null,
    limit: DEFAULT_LIMIT,
    outDir: DEFAULT_OUT_DIR,
    dryRun: false,
  };
  let tierProvided = false;

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];

    if (arg === '--dry-run') {
      options.dryRun = true;
      continue;
    }

    if (['--arc', '--page', '--tier', '--langs', '--limit', '--out-dir'].includes(arg)) {
      const value = args[++i];
      if (value == null || String(value).startsWith('--')) {
        throw new Error(`${arg} requires a value`);
      }

      if (arg === '--arc') options.arc = value;
      else if (arg === '--page') options.page = value;
      else if (arg === '--tier') {
        tierProvided = true;
        options.tier = value;
      } else if (arg === '--langs') options.langs = value;
      else if (arg === '--out-dir') options.outDir = path.resolve(value);
      else if (arg === '--limit') options.limit = Number(value);
      continue;
    }

    throw new Error(`unknown argument: ${arg}`);
  }

  if (!!options.arc === !!options.page) {
    throw new Error('choose exactly one of --arc or --page');
  }
  if (!Number.isInteger(options.limit) || options.limit <= 0) {
    throw new Error('--limit must be an integer > 0');
  }
  if (options.langs && tierProvided) {
    throw new Error('use either --tier or --langs, not both');
  }
  if (options.langs) options.tier = null;

  // Resolve now so invalid tiers/language lists fail before any file write.
  targetLanguages(options);

  return options;
}

function targetLanguages(options = {}) {
  const raw = options.langs
    ? String(options.langs).split(',').map(value => value.trim()).filter(Boolean)
    : LANGUAGE_TIERS[options.tier || 'global-core'];

  if (!raw) {
    throw new Error(`unknown translation tier: ${options.tier}`);
  }

  const seen = new Set();
  const langs = [];

  for (const lang of raw) {
    if (!/^[a-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$/.test(lang)) {
      throw new Error(`invalid target locale: ${lang}`);
    }
    if (lang === Language.EN) {
      throw new Error('EN is the canonical source language and cannot be a program target');
    }
    if (seen.has(lang)) continue;
    seen.add(lang);
    langs.push(lang);
  }

  if (!langs.length) throw new Error('at least one non-EN target locale is required');
  return langs;
}

function loadIndex(indexPath = INDEX_PATH) {
  return JSON.parse(fs.readFileSync(indexPath, 'utf8'));
}

function orderedArcSlugs(index, arcId) {
  const sections = index && index.arcMap && index.arcMap[arcId];
  if (!Array.isArray(sections)) throw new Error(`unknown arc: ${arcId}`);

  const seen = new Set();
  const slugs = [];

  for (const section of sections) {
    for (const slug of section.slugs || []) {
      if (seen.has(slug)) continue;
      seen.add(slug);
      slugs.push(slug);
    }
  }

  return slugs;
}

function sourceScopeSet(sources) {
  return new Set((sources || []).map(source =>
    canonicalScope(source.raw || {}, source.scope || '')
  ).filter(Boolean));
}

function pageScopeState(index, slug, availableSourceScopes) {
  const entry = index && index.slugMap && index.slugMap[slug];
  if (!entry) throw new Error(`page slug is not present in index.slugMap: ${slug}`);

  const declared = Array.from(new Set(
    (entry.viewmodel && entry.viewmodel.scopes) || [`pages.${slug}`]
  ));
  const sourceOnly = new Set(index.sourceOnlyScopes || []);
  const translatable = declared.filter(scope => !sourceOnly.has(scope));

  if (declared.length && translatable.length === 0) {
    return {
      slug,
      sourceOnly: true,
      declaredScopes: declared,
      scopes: [],
      missingSourceScopes: [],
    };
  }

  const missingSourceScopes = translatable.filter(scope => !availableSourceScopes.has(scope));

  return {
    slug,
    sourceOnly: false,
    declaredScopes: declared,
    scopes: Array.from(new Set([Scope.COMMON, ...translatable])),
    missingSourceScopes,
  };
}

function collectTierCandidates(sources, langs) {
  const result = {};
  for (const lang of langs) {
    result[lang] = collectCampaignCandidatesFromSources(sources, lang);
  }
  return result;
}

function pageCandidates(scopeState, candidatesByLang, langs) {
  if (scopeState.sourceOnly || scopeState.missingSourceScopes.length) {
    return {
      perLanguage: Object.fromEntries(langs.map(lang => [lang, []])),
      unionKeys: [],
    };
  }

  const wantedScopes = new Set(scopeState.scopes);
  const perLanguage = {};
  const union = new Set();

  for (const lang of langs) {
    const candidates = (candidatesByLang[lang] || [])
      .filter(candidate => wantedScopes.has(candidate.sourceScope));

    perLanguage[lang] = candidates;
    for (const candidate of candidates) union.add(candidate.key);
  }

  return {
    perLanguage,
    unionKeys: [...union].sort(compareCanonicalText),
  };
}

function buildProgress(index, sources, candidatesByLang, langs, slugs) {
  const availableScopes = sourceScopeSet(sources);
  const pages = [];

  for (const slug of slugs) {
    const scopeState = pageScopeState(index, slug, availableScopes);
    const candidates = pageCandidates(scopeState, candidatesByLang, langs);

    pages.push({
      slug,
      sourceOnly: scopeState.sourceOnly,
      scopes: scopeState.scopes,
      missingSourceScopes: scopeState.missingSourceScopes,
      candidateCount: candidates.unionKeys.length,
      candidates,
    });
  }

  return pages;
}

function programBatchId(options, langs, page, selectedKeys, perLanguage) {
  const rows = {};

  for (const lang of langs) {
    const byKey = new Map((perLanguage[lang] || []).map(candidate => [candidate.key, candidate]));
    rows[lang] = selectedKeys
      .filter(key => byKey.has(key))
      .map(key => [key, byKey.get(key).row.source_en_hash12]);
  }

  const identity = {
    sourceLang: Language.EN,
    targetLangs: langs,
    tier: options.tier || null,
    arc: options.arc || null,
    page,
    rows,
  };

  return crypto.createHash('sha256')
    .update(JSON.stringify(identity))
    .digest('hex')
    .slice(0, 12);
}

function resumeCommand(options) {
  const parts = ['npm run translation:program --'];
  if (options.arc) parts.push('--arc', options.arc);
  else parts.push('--page', options.page);

  if (options.langs) parts.push('--langs', options.langs);
  else parts.push('--tier', options.tier || 'global-core');

  parts.push('--limit', String(options.limit));
  return parts.join(' ');
}

function formProgram(options, index = null, sources = null) {
  const targetLangs = targetLanguages(options);
  const campaignIndex = index || loadIndex();
  const campaignSources = sources || loadCampaignSources();

  const slugs = options.page
    ? [options.page]
    : orderedArcSlugs(campaignIndex, options.arc);

  const candidatesByLang = collectTierCandidates(campaignSources, targetLangs);
  const progress = buildProgress(
    campaignIndex,
    campaignSources,
    candidatesByLang,
    targetLangs,
    slugs
  );

  const blocked = progress.filter(page => page.missingSourceScopes.length);
  const remaining = progress.filter(page =>
    !page.sourceOnly &&
    !page.missingSourceScopes.length &&
    page.candidateCount > 0
  );
  const completed = progress.filter(page =>
    !page.sourceOnly &&
    !page.missingSourceScopes.length &&
    page.candidateCount === 0
  );
  const sourceOnly = progress.filter(page => page.sourceOnly);

  const selectedPage = remaining[0] || null;

  if (!selectedPage) {
    const complete = blocked.length === 0;
    const manifest = {
      schemaVersion: 'vextreme.translation-program/v1',
      sourceLang: Language.EN,
      targetTier: options.tier || null,
      targetLangs,
      selection: {
        arc: options.arc || null,
        page: options.page || null,
        limit: options.limit,
      },
      selectedPage: null,
      selectedKeys: [],
      packets: {},
      progress: {
        totalPages: progress.length,
        completePages: completed.map(page => page.slug),
        sourceOnlyPages: sourceOnly.map(page => page.slug),
        blockedPages: blocked.map(page => ({
          slug: page.slug,
          missingSourceScopes: page.missingSourceScopes,
        })),
        remainingPages: [],
      },
      completeAtFormation: complete,
      resumeCommand: complete ? null : resumeCommand(options),
    };

    return {
      mode: 'page-program',
      batchId: `complete-${crypto.createHash('sha256').update(JSON.stringify(manifest)).digest('hex').slice(0, 12)}`,
      manifest,
      packets: {},
    };
  }

  const selectedKeys = selectedPage.candidates.unionKeys.slice(0, options.limit);
  const selectedSet = new Set(selectedKeys);
  const packets = {};
  const packetManifest = {};

  for (const lang of targetLangs) {
    const candidates = selectedPage.candidates.perLanguage[lang] || [];
    const selected = candidates.filter(candidate => selectedSet.has(candidate.key));
    if (!selected.length) continue;

    const rows = selected.map(candidate => candidate.row);
    packets[lang] = renderTranslatorCSV(rows, lang);
    packetManifest[lang] = {
      candidateCountAtFormation: candidates.length,
      selectedCount: selected.length,
      firstKey: selected[0].key,
      lastKey: selected[selected.length - 1].key,
      rows: selected.map(candidate => ({
        key: candidate.key,
        sourceScope: candidate.sourceScope,
        sourceFile: candidate.sourceFile,
        state: candidate.state,
        source_en_hash12: candidate.row.source_en_hash12,
      })),
    };
  }

  const batchHash = programBatchId(
    options,
    targetLangs,
    selectedPage.slug,
    selectedKeys,
    selectedPage.candidates.perLanguage
  );
  const batchId = `${selectedPage.slug}-${batchHash}`;

  for (const lang of Object.keys(packetManifest)) {
    packetManifest[lang].csvFile = `${batchId}.${lang}.csv`;
  }

  const manifest = {
    schemaVersion: 'vextreme.translation-program/v1',
    batchId,
    sourceLang: Language.EN,
    targetTier: options.tier || null,
    targetLangs,
    selection: {
      arc: options.arc || null,
      page: options.page || null,
      limit: options.limit,
    },
    selectedPage: selectedPage.slug,
    pageScopes: selectedPage.scopes,
    pageCandidateCountAtFormation: selectedPage.candidateCount,
    selectedKeys,
    hasMoreInPage: selectedPage.candidateCount > selectedKeys.length,
    packets: packetManifest,
    progress: {
      totalPages: progress.length,
      completePages: completed.map(page => page.slug),
      sourceOnlyPages: sourceOnly.map(page => page.slug),
      blockedPages: blocked.map(page => ({
        slug: page.slug,
        missingSourceScopes: page.missingSourceScopes,
      })),
      remainingPages: remaining.map(page => ({
        slug: page.slug,
        candidateCount: page.candidateCount,
      })),
    },
    completeAtFormation: false,
    // Re-run the same command after import. Do not carry a cross-language key
    // cursor across independently returned target files; current source decides
    // what remains and keeps the page selected until the tier is actually done.
    resumeCommand: resumeCommand(options),
  };

  return {
    mode: 'page-program',
    batchId,
    manifest,
    packets,
  };
}

function writeProgram(result, options) {
  const unit = result.manifest.selectedPage
    || options.page
    || options.arc
    || 'complete';
  const targetDir = path.join(options.outDir, unit, result.batchId);

  fs.mkdirSync(targetDir, { recursive: true });

  const csvPaths = {};
  for (const [lang, csv] of Object.entries(result.packets)) {
    const filename = result.manifest.packets[lang].csvFile;
    const outPath = path.join(targetDir, filename);
    fs.writeFileSync(outPath, csv);
    csvPaths[lang] = outPath;
  }

  const manifestPath = path.join(targetDir, `${result.batchId}.manifest.json`);
  fs.writeFileSync(manifestPath, JSON.stringify(result.manifest, null, 2) + '\n');

  return { targetDir, csvPaths, manifestPath };
}

function main(args = process.argv.slice(2)) {
  const options = parseArgs(args);
  const result = formProgram(options);

  if (options.dryRun) {
    process.stdout.write(JSON.stringify(result.manifest, null, 2) + '\n');
    return result;
  }

  const paths = writeProgram(result, options);

  if (!result.manifest.selectedPage) {
    console.log(
      result.manifest.completeAtFormation
        ? '[translation-program] target unit complete for selected language tier'
        : '[translation-program] BLOCKED — required page string source is missing'
    );
    console.log(`[translation-program] manifest → ${paths.manifestPath}`);
    return result;
  }

  console.log(
    `[translation-program] page ${result.manifest.selectedPage} → ${result.manifest.selectedKeys.length} canonical key(s)`
  );
  for (const [lang, outPath] of Object.entries(paths.csvPaths)) {
    console.log(
      `[translation-program] ${lang}: ${result.manifest.packets[lang].selectedCount} row(s) → ${outPath}`
    );
  }
  console.log(`[translation-program] manifest → ${paths.manifestPath}`);
  console.log(`[translation-program] next → ${result.manifest.resumeCommand}`);
  return result;
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error(`[translation-program] BLOCKED — ${error.message}`);
    process.exitCode = 1;
  }
}

module.exports = {
  DEFAULT_LIMIT,
  DEFAULT_OUT_DIR,
  INDEX_PATH,
  LANGUAGE_TIERS,
  parseArgs,
  targetLanguages,
  loadIndex,
  orderedArcSlugs,
  sourceScopeSet,
  pageScopeState,
  collectTierCandidates,
  pageCandidates,
  buildProgress,
  programBatchId,
  resumeCommand,
  formProgram,
  writeProgram,
  main,
};

// [VXG RealForever]
