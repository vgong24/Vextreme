#!/usr/bin/env node
'use strict';

/**
 * Content Forge group-home projector.
 *
 * Group-home pages are collection parent identities, not arc members. This
 * projector reuses preserved authored source while deliberately discarding
 * provider shell/runtime and normalizing active repository routes for the
 * GitHub Pages project path.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { LANGUAGE_TIERS } = require('../../lib/translation-program.js');

const DEFAULT_ROOT = path.join(__dirname, '..', '..');
const FORMATION_REL = path.join('docs','ingestion','workmaps','content-forge-group-home-formation.json');

function gitBlobSha(buffer) {
  return crypto.createHash('sha1').update(Buffer.concat([Buffer.from('blob ' + buffer.length + '\0'), buffer])).digest('hex');
}
function oneMatch(source, re, label) {
  const matches = [...source.matchAll(re)];
  if (matches.length !== 1) throw new Error(label + ': expected exactly one match, got ' + matches.length);
  return matches[0][1];
}
function livePageSlugs(root, additional = []) {
  const dir = path.join(root, 'pages');
  const slugs = new Set(fs.existsSync(dir)
    ? fs.readdirSync(dir).filter(file => file.endsWith('.html')).map(file => file.replace(/\.html$/, ''))
    : []);
  for (const slug of additional) slugs.add(slug);
  return slugs;
}
function cleanAuthoredMain(value, options = {}) {
  let out = value
    .replace(/<script\b[\s\S]*?<\/script>/gi, '');
  if (!options.preserveI18n) {
    out = out.replace(/\sdata-i18n(?:-attrs|-alt|-aria)?=(?:"[^"]*"|'[^']*')/gi, '');
  }
  return out
    .replace(/\sdata-vex-[a-z0-9_-]+=(?:"[^"]*"|'[^']*')/gi, '')
    .replace(/\sdata-sqsp-[a-z0-9_-]+=(?:"[^"]*"|'[^']*')/gi, '')
    .replace(/\son[a-z]+=(?:"[^"]*"|'[^']*')/gi, '')
    .replace(/\sstyle=(["'])--vex-provider-[\s\S]*?\1/gi, '')
    .replace(/class=(["'])([^"']*)\1/gi, (_m, q, classes) => {
      const kept = classes.split(/\s+/).filter(Boolean).filter(token => !/^vex-(?:provider|native|generated)/.test(token));
      return kept.length ? 'class=' + q + kept.join(' ') + q : '';
    });
}
function completeLocalization(root, member) {
  const config = member.localization;
  if (!config) return null;
  const sourceRel = config.sourcePath || path.join('data','strings','source','pages',member.slug + '.json');
  const sourcePath = path.join(root, sourceRel);
  if (!fs.existsSync(sourcePath)) throw new Error(member.slug + ': localization source missing: ' + sourceRel);
  const source = JSON.parse(fs.readFileSync(sourcePath, 'utf8'));
  if (source?._meta?.scope !== config.scope || source?._meta?.category !== config.category) {
    throw new Error(member.slug + ': localization source scope/category drift');
  }
  const keys = Object.keys(source).filter(key => key !== '_meta');
  if (!keys.length) throw new Error(member.slug + ': localization source has no keys');
  const expectedLangs = ['en', ...(LANGUAGE_TIERS['global-core'] || [])];
  const completeLangs = expectedLangs.filter(lang =>
    keys.every(key => typeof source[key]?.strings?.[lang]?.text === 'string')
  );
  if (completeLangs.length !== expectedLangs.length) {
    throw new Error(member.slug + ': localization is not complete across Global Core');
  }
  const title = source[config.titleKey]?.strings?.en?.text;
  if (typeof title !== 'string' || !title) throw new Error(member.slug + ': localized title identity missing');
  return { config, sourceRel, completeLangs, title };
}
function applySupplementalI18n(main, bindings = []) {
  let out = main;
  for (const binding of bindings) {
    let needle;
    let replacement;
    if (binding.kind === 'element') {
      needle = '<' + binding.tag + ' class="' + binding.className + '">' + binding.text + '</' + binding.tag + '>';
      replacement = '<' + binding.tag + ' class="' + binding.className + '" data-i18n="' + binding.key + '">' + binding.text + '</' + binding.tag + '>';
    } else if (binding.kind === 'prefix') {
      needle = binding.text;
      replacement = '<span data-i18n="' + binding.key + '">' + binding.text + '</span>';
    } else {
      throw new Error('unsupported supplemental localization binding kind: ' + binding.kind);
    }
    const count = out.split(needle).length - 1;
    if (count !== 1) throw new Error('supplemental localization binding expected one match for ' + binding.key + ', got ' + count);
    out = out.replace(needle, replacement);
  }
  return out;
}
function normalizeRoutes(main, liveSlugs) {
  return main.replace(/href=(["'])(\/(?!\/)[^"']*)\1/gi, (_all, quote, href) => {
    const route = /^\/([a-z0-9][a-z0-9-]*)([?#].*)?$/i.exec(href);
    if (!route) return 'data-vex-route-state="held-not-ported" aria-disabled="true"';
    const slug = route[1], suffix = route[2] || '';
    if (slug === 'archives') return 'href="../index.html' + suffix + '" data-vex-route-state="repository-live"';
    if (liveSlugs.has(slug)) return 'href="' + slug + '.html' + suffix + '" data-vex-route-state="repository-live"';
    return 'data-vex-route-state="held-not-ported" aria-disabled="true"';
  });
}
function projectGroupHome(root, member, allOutputSlugs = []) {
  const sourceFile = path.join(root, member.sourcePath);
  const localization = completeLocalization(root, member);
  const bytes = fs.readFileSync(sourceFile);
  if (gitBlobSha(bytes) !== member.sourceGitBlob) throw new Error(member.slug + ': source blob drift');
  const source = bytes.toString('utf8');
  const style = oneMatch(source, /<style(?:\s[^>]*)?>([\s\S]*?)<\/style>/gi, member.slug + ': authored style');
  let main = oneMatch(source, /(<main\b[\s\S]*?<\/main>)/gi, member.slug + ': authored main');
  main = cleanAuthoredMain(main, { preserveI18n: !!localization });
  if (localization) main = applySupplementalI18n(main, localization.config.supplementalBindings || []);
  main = normalizeRoutes(main, livePageSlugs(root, allOutputSlugs));
  if (/(?:href|src)=["']\/(?!\/)/i.test(main)) throw new Error(member.slug + ': root-relative active route remains');
  const forbidden = localization
    ? /www\.vextreme24\.com|\/__rescue\/|\/__vex\/|data-vex-id=/i
    : /www\.vextreme24\.com|\/__rescue\/|\/__vex\/|data-vex-id=|data-i18n=/i;
  if (forbidden.test(main)) throw new Error(member.slug + ': provider/runtime marker remains');
  const htmlScope = localization ? ' data-vex-page-scope="' + localization.config.scope.replace(/^pages\./, '') + '"' : '';
  const title = localization
    ? '<title data-i18n="' + localization.config.titleKey + '">' + localization.title + '</title>'
    : '<title>' + member.title + ' — Vextreme</title>';
  const runtime = localization
    ? '<script>\n'
      + 'window.VEX_STRING_SCOPES = ' + JSON.stringify([localization.config.scope]) + ';\n'
      + 'window.VEX_STRING_CATEGORY = ' + JSON.stringify(localization.config.category) + ';\n'
      + 'window.VEXTREME_OVERRIDE = {nav:false,bodyWrap:false,arcNav:false,fab:true};\n'
      + '</script>\n<script src="../lib/shell.js"></script>'
    : '<script src="../widgets/fab-read-aloud.js"></script>';
  return '<!DOCTYPE html>\n'
    + '<html lang="en" data-vex-surface="group-home" data-vex-group-key="' + member.groupKey + '"' + htmlScope + '><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1.0"/>\n'
    + title + '<meta name="description" content="' + member.description + '"/>\n'
    + '<link rel="preconnect" href="https://fonts.googleapis.com"/><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin/>\n'
    + '<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=IBM+Plex+Sans:wght@400;500;600&family=Source+Serif+4:wght@300;400;500;600&display=swap" rel="stylesheet"/>\n'
    + '<style>' + style.replace(/<\/style/gi, '<\\/style') + '</style></head><body data-vex-group-home="' + member.slug + '">\n'
    + '<!-- Source-managed group-home projection of ' + member.sourcePath + '; preserved Git blob ' + member.sourceGitBlob + '. Group home is not arc membership. -->\n'
    + main + '\n' + runtime + '\n</body></html>\n';
}
function projectFormation(root = DEFAULT_ROOT, options = {}) {
  const formationPath = path.join(root, options.formationRel || FORMATION_REL);
  const value = JSON.parse(fs.readFileSync(formationPath, 'utf8'));
  if (value.schemaVersion !== 'vex-content-forge.group-home-formation/v1') throw new Error('unsupported group-home formation');
  const outputSlugs = value.members.map(member => member.slug);
  const outputs = value.members.map(member => ({
    member,
    page: projectGroupHome(root, member, outputSlugs),
    pagePath: path.join(root, 'pages', member.slug + '.html'),
  }));
  if (options.write !== false) {
    for (const output of outputs) {
      fs.mkdirSync(path.dirname(output.pagePath), { recursive:true });
      if (!fs.existsSync(output.pagePath) || fs.readFileSync(output.pagePath, 'utf8') !== output.page) fs.writeFileSync(output.pagePath, output.page);
    }
  }
  return outputs;
}
if (require.main === module) {
  const outputs = projectFormation(DEFAULT_ROOT);
  console.log('[content-forge-group-home] projected ' + outputs.map(item => item.member.slug).join(', '));
}
module.exports = { DEFAULT_ROOT, FORMATION_REL, applySupplementalI18n, cleanAuthoredMain, completeLocalization, gitBlobSha, livePageSlugs, normalizeRoutes, oneMatch, projectFormation, projectGroupHome };
