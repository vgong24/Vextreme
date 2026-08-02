'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const registry = require('../config/institutional-surfaces.json');
const {
  SCHEMA_VERSION,
  validateRegistry,
  surfacesByState,
  run,
} = require('../lib/check-institutional-surfaces');
const {
  AUTO_DISCOVERY_EXCLUSIONS,
  autoDiscoveryExclusions,
  institutionalSurfaceExclusions,
  getRecordPageSlugs,
} = require('../lib/audit-pages');
const { discoverOrphanNodes } = require('../lib/auto-discover-nodes');

const ROOT = path.join(__dirname, '..');

function themeVariables(css, theme) {
  const variables = {};
  for (const match of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    if (!match[1].includes(`[data-theme="${theme}"]`)) continue;
    for (const declaration of match[2].matchAll(/--([a-z0-9-]+)\s*:\s*([^;]+);/gi)) {
      variables[declaration[1]] = declaration[2].trim();
    }
  }
  return variables;
}

function resolveCssValue(value, variables, seen = new Set()) {
  const variable = String(value).match(/^var\(--([a-z0-9-]+)\)$/i);
  if (!variable) return String(value).trim();
  assert.ok(!seen.has(variable[1]), `circular CSS variable: ${variable[1]}`);
  assert.ok(Object.hasOwn(variables, variable[1]), `missing CSS variable: ${variable[1]}`);
  const nextSeen = new Set(seen);
  nextSeen.add(variable[1]);
  return resolveCssValue(variables[variable[1]], variables, nextSeen);
}

function cssColorToLinearRgb(value) {
  const hex = value.match(/^#([0-9a-f]{6})$/i);
  if (hex) {
    return hex[1].match(/.{2}/g).map(channel => {
      const srgb = Number.parseInt(channel, 16) / 255;
      return srgb <= 0.04045 ? srgb / 12.92 : ((srgb + 0.055) / 1.055) ** 2.4;
    });
  }

  const oklch = value.match(/^oklch\(([\d.]+)%\s+([\d.]+)\s+([\d.]+)\)$/i);
  assert.ok(oklch, `unsupported test color: ${value}`);
  const lightness = Number(oklch[1]) / 100;
  const chroma = Number(oklch[2]);
  const hue = Number(oklch[3]) * Math.PI / 180;
  const a = chroma * Math.cos(hue);
  const b = chroma * Math.sin(hue);
  const l = (lightness + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (lightness - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (lightness - 0.0894841775 * a - 1.2914855480 * b) ** 3;
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s,
  ].map(channel => Math.max(0, Math.min(1, channel)));
}

function contrastRatio(foreground, background) {
  const luminance = rgb => 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
  const lighter = Math.max(luminance(foreground), luminance(background));
  const darker = Math.min(luminance(foreground), luminance(background));
  return (lighter + 0.05) / (darker + 0.05);
}

function entry(overrides = {}) {
  return {
    state: 'reserved',
    kind: 'institutional',
    purpose: 'test-surface',
    discovery: { rootLabelKey: 'institution.test' },
    archive: { indexed: false, arcMembership: false },
    runtime: {
      mode: 'standalone',
      godScript: false,
      shell: false,
      localizationLoader: 'widgets/vex-institutional.js',
      localizationControl: 'data-vex-lang-select',
      supportRoutes: null,
    },
    strings: { category: 'system', scope: 'institution', requiredLocales: ['en'], plannedLocales: ['ja'] },
    theme: { family: 'foundation', variants: ['foundation', 'foundation-light'] },
    evidence: { viewports: [320, 768, 1440], themes: ['foundation', 'foundation-light'] },
    origin: { sourcePr: 135 },
    ...overrides,
  };
}

function makeRoot() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'vxg-institutional-'));
  for (const dir of [
    'config', 'pages', 'data', 'dist', 'widgets',
    'data/strings/compiled/scopes/system', 'docs/screenshots',
  ]) fs.mkdirSync(path.join(root, dir), { recursive: true });
  fs.writeFileSync(path.join(root, 'data', 'nodes.json'), '[]\n');
  fs.writeFileSync(path.join(root, 'data', 'arcs-v2.json'), '{}\n');
  fs.writeFileSync(path.join(root, 'data', 'index.json'), '{}\n');
  return root;
}

function activeHtml() {
  return [
    '<!doctype html>',
    '<html data-vex-surface="institutional" data-vex-string-category="system" data-vex-string-scope="institution" data-vex-theme-family="foundation" data-theme="foundation">',
    '<body>',
    '<h1 data-i18n="institution.test">Test en</h1>',
    '<img alt="Test image en" data-i18n-alt="institution.test.alt">',
    '<button aria-label="Test action en" data-i18n-aria="institution.test.aria">Test</button>',
    '</body>',
    '</html>',
    '',
  ].join('\n');
}

function activeLocalizedHtml({ category = 'system', scope = 'institution', locales = ['en', 'ja'] } = {}) {
  return [
    '<!doctype html>',
    '<html data-vex-surface="institutional" data-vex-string-category="system" data-vex-string-scope="institution" data-vex-theme-family="foundation" data-theme="foundation">',
    '<body>',
    '<h1 data-i18n="institution.test">Test en</h1>',
    '<img alt="Test image en" data-i18n-alt="institution.test.alt">',
    '<button aria-label="Test action en" data-i18n-aria="institution.test.aria">Test</button>',
    `<select data-vex-lang-select>${locales.map(locale => `<option value="${locale}">${locale}</option>`).join('')}</select>`,
    `<script>window.VEX_STRING_SCOPES = ['${scope}']; window.VEX_STRING_CATEGORY = '${category}';</script>`,
    '<script src="../widgets/vex-institutional.js"></script>',
    '</body>',
    '</html>',
    '',
  ].join('\n');
}

function workingLocalizationLoader() {
  return [
    '(function () {',
    "  var select = document.querySelector('[data-vex-lang-select]');",
    '  select.hidden = false;',
    "  select.addEventListener('change', function () {",
    '    var locale = select.value;',
    "    var url = '../data/strings/compiled/scopes/system/institution.' + locale + '.json';",
    '    document.documentElement.setAttribute(\'lang\', locale);',
    '    fetch(url).then(function (response) { return response.json(); }).then(function (bundle) {',
    "      Array.prototype.forEach.call(document.querySelectorAll('[data-i18n]'), function (element) {",
    "        var entry = bundle[element.getAttribute('data-i18n')];",
    '        if (entry && entry.text) element.textContent = entry.text;',
    '      });',
    "      Array.prototype.forEach.call(document.querySelectorAll('[data-i18n-alt]'), function (element) {",
    "        var entry = bundle[element.getAttribute('data-i18n-alt')];",
    "        if (entry && entry.text) element.setAttribute('alt', entry.text);",
    '      });',
    "      Array.prototype.forEach.call(document.querySelectorAll('[data-i18n-aria]'), function (element) {",
    "        var entry = bundle[element.getAttribute('data-i18n-aria')];",
    "        if (entry && entry.text) element.setAttribute('aria-label', entry.text);",
    '      });',
    '    });',
    '  });',
    '}());',
    '',
  ].join('\n');
}

function hardCodedLocalizationLoader({ requestOnly = false } = {}) {
  const copy = {
    en: { text: 'Test en', alt: 'Test image en', aria: 'Test action en' },
    ja: { text: 'Test ja', alt: 'Test image ja', aria: 'Test action ja' },
  };
  return [
    '(function () {',
    `  var copy = ${JSON.stringify(copy)};`,
    "  var select = document.querySelector('[data-vex-lang-select]');",
    '  select.hidden = false;',
    "  select.addEventListener('change', function () {",
    '    var locale = select.value;',
    requestOnly
      ? "    fetch('../data/strings/compiled/scopes/system/institution.' + locale + '.json');"
      : '    // Deliberately performs no bundle request.',
    "    document.documentElement.setAttribute('lang', locale);",
    "    document.querySelectorAll('[data-i18n]')[0].textContent = copy[locale].text;",
    "    document.querySelectorAll('[data-i18n-alt]')[0].setAttribute('alt', copy[locale].alt);",
    "    document.querySelectorAll('[data-i18n-aria]')[0].setAttribute('aria-label', copy[locale].aria);",
    '  });',
    '}());',
    '',
  ].join('\n');
}

function writeActiveAcceptance(root, slug, surfaceEntry) {
  for (const locale of surfaceEntry.strings.requiredLocales) {
    const bundlePath = path.join(
      root, 'data', 'strings', 'compiled', 'scopes', surfaceEntry.strings.category,
      `${surfaceEntry.strings.scope}.${locale}.json`
    );
    fs.mkdirSync(path.dirname(bundlePath), { recursive: true });
    fs.writeFileSync(
      bundlePath,
      `${JSON.stringify({
        'institution.test': { text: `Test ${locale}` },
        'institution.test.alt': { text: `Test image ${locale}` },
        'institution.test.aria': { text: `Test action ${locale}` },
      }, null, 2)}\n`
    );
  }
  const validPng = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
    'base64'
  );
  for (const locale of surfaceEntry.strings.requiredLocales) {
    for (const theme of surfaceEntry.evidence.themes) {
      for (const viewport of surfaceEntry.evidence.viewports) {
        fs.writeFileSync(path.join(root, 'docs', 'screenshots', `${slug}-${locale}-${theme}-${viewport}.png`), validPng);
      }
    }
  }
}

function supportRouteFixture(routeBlock, { candidateUrl = null } = {}) {
  const root = makeRoot();
  const activeEntry = entry({
    state: 'active',
    purpose: 'open-source-support',
    runtime: {
      mode: 'standalone', godScript: false, shell: false,
      localizationLoader: 'widgets/vex-institutional.js',
      localizationControl: 'data-vex-lang-select',
      supportRoutes: 'data/support-routes.json',
    },
  });
  fs.writeFileSync(
    path.join(root, 'pages', 'vex-test.html'),
    activeHtml().replace('</body>', `${routeBlock}</body>`)
  );
  writeActiveAcceptance(root, 'vex-test', activeEntry);
  const routePath = path.join(root, 'data', 'support-routes.json');
  const route = {
    routeId: 'support.test', status: 'PENDING_PUBLICATION', url: null,
    requiredBeforePublication: ['Verify destination'],
  };
  if (candidateUrl) route.candidateUrl = candidateUrl;
  const routeConfig = { schemaVersion: 'vextreme.support-routes/v1', routes: [route] };
  fs.writeFileSync(routePath, `${JSON.stringify(routeConfig)}\n`);
  return {
    root,
    active: { schemaVersion: SCHEMA_VERSION, surfaces: { 'vex-test': activeEntry } },
    routePath,
    routeConfig,
  };
}

test('INSTITUTIONAL-SURFACES: the home and English support domain are active', () => {
  assert.deepEqual(validateRegistry(registry, ROOT), []);
  assert.deepEqual(surfacesByState(registry, 'active').map(surface => surface.slug), ['vex-support', 'vextreme-home']);
  assert.deepEqual(surfacesByState(registry, 'reserved').map(surface => surface.slug), []);
  assert.deepEqual(Object.keys(institutionalSurfaceExclusions()), ['vex-support', 'vextreme-home']);
  assert.ok(AUTO_DISCOVERY_EXCLUSIONS['vex-support']);
  assert.ok(AUTO_DISCOVERY_EXCLUSIONS['vextreme-home']);
  assert.ok(!getRecordPageSlugs().includes('vex-support'));
  assert.ok(!getRecordPageSlugs().includes('vextreme-home'));
  assert.ok(fs.existsSync(path.join(ROOT, 'pages', 'vex-support.html')));
  const rootIndex = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  assert.match(rootIndex, /href="https:\/\/vgong24\.github\.io\/Vextreme\/pages\/vextreme-home\.html">About Vextreme<\/a>/);
  assert.match(rootIndex, /href="https:\/\/vgong24\.github\.io\/Vextreme\/pages\/vex-support\.html">Support Vextreme<\/a>/);
});

test('INSTITUTIONAL-SURFACES: inactive support routes fail closed in data and HTML', () => {
  const { root, active, routePath, routeConfig } = supportRouteFixture(
    '<article data-vex-route="support.test"><span data-vex-route-action role="link" aria-disabled="true">Held</span></article>'
  );
  assert.deepEqual(validateRegistry(active, root), []);

  routeConfig.routes[0].status = 'ACTIVE';
  routeConfig.routes[0].url = 'https://example.com/pay';
  fs.writeFileSync(routePath, `${JSON.stringify(routeConfig)}\n`);
  const activeChecks = new Set(validateRegistry(active, root).map(issue => issue.check));
  assert.ok(activeChecks.has('support-route-status'));
  assert.ok(activeChecks.has('support-route-activation-held'));
  assert.ok(activeChecks.has('support-route-url-held'));

  routeConfig.routes[0].status = 'PENDING_PUBLICATION';
  routeConfig.routes[0].url = null;
  fs.writeFileSync(routePath, `${JSON.stringify(routeConfig)}\n`);
  fs.writeFileSync(
    path.join(root, 'pages', 'vex-test.html'),
    activeHtml().replace(
      '</body>',
      '<article data-vex-route="support.test"><a href="https://example.com/pay">Pay</a><span data-vex-route-action aria-disabled="true">Held</span></article></body>'
    )
  );
  assert.ok(validateRegistry(active, root).some(issue => issue.check === 'support-route-link-held'));
});

test('INSTITUTIONAL-SURFACES: every support route requires an inert action projection', () => {
  const { root, active } = supportRouteFixture(
    '<article data-vex-route="support.test"><p>Held</p></article>'
  );
  assert.ok(validateRegistry(active, root).some(issue => issue.check === 'support-route-action-missing'));
});

test('INSTITUTIONAL-SURFACES: candidateUrl detection preserves rendered text and attribute boundaries', () => {
  const candidateUrl = 'https://example.com/candidate';
  const cases = [
    ['raw text', `<p>${candidateUrl}</p>`, true],
    ['raw attribute', `<span data-candidate="${candidateUrl}"></span>`, true],
    ['numeric entity', '<p>https&#58;//example.com/candidate</p>', true],
    ['nested markup', '<p>https<span>:</span>//example.com/candidate</p>', true],
    ['named entity attribute', '<span data-candidate="https&colon;//example.com/candidate"></span>', true],
    ['comment', `<!-- ${candidateUrl} -->`, false],
  ];

  for (const [label, projection, expected] of cases) {
    const { root, active } = supportRouteFixture(
      `<article data-vex-route="support.test">${projection}<span data-vex-route-action aria-disabled="true">Held</span></article>`,
      { candidateUrl }
    );
    assert.equal(
      validateRegistry(active, root).some(issue => issue.check === 'support-route-candidate-held'),
      expected,
      label
    );
  }
});

test('INSTITUTIONAL-SURFACES: standard named entity cannot hide the GitHub Sponsors candidateUrl', () => {
  const candidateUrl = 'https://github.com/sponsors/vgong24';
  const hostileProjection = '<p>https&colon;//github.com/sponsors/vgong24</p>';
  const { root, active } = supportRouteFixture(
    `<article data-vex-route="support.test">${hostileProjection}<span data-vex-route-action aria-disabled="true">Held</span></article>`,
    { candidateUrl }
  );
  assert.ok(validateRegistry(active, root).some(issue => issue.check === 'support-route-candidate-held'));
});

test('INSTITUTIONAL-SURFACES: comment-shaped attribute data cannot hide the GitHub Sponsors candidateUrl', () => {
  const candidateUrl = 'https://github.com/sponsors/vgong24';
  const hostileProjection = '<span data-candidate="<!--https&colon;//github.com/sponsors/vgong24-->"></span>';
  const { root, active } = supportRouteFixture(
    `<article data-vex-route="support.test">${hostileProjection}<span data-vex-route-action aria-disabled="true">Held</span></article>`,
    { candidateUrl }
  );
  assert.ok(validateRegistry(active, root).some(issue => issue.check === 'support-route-candidate-held'));
});

test('INSTITUTIONAL-SURFACES: route-root attribute cannot hide the GitHub Sponsors candidateUrl', () => {
  const candidateUrl = 'https://github.com/sponsors/vgong24';
  const hostileProjection = [
    '<article',
    '  data-vex-route="support.test"',
    '  data-candidate="https&colon;//github.com/sponsors/vgong24">',
    '  <span data-vex-route-action aria-disabled="true">Held</span>',
    '</article>',
  ].join('\n');
  const { root, active } = supportRouteFixture(hostileProjection, { candidateUrl });
  assert.ok(validateRegistry(active, root).some(issue => issue.check === 'support-route-candidate-held'));
});

test('INSTITUTIONAL-SURFACES: quoted closing tag cannot truncate the GitHub Sponsors candidateUrl', () => {
  const candidateUrl = 'https://github.com/sponsors/vgong24';
  const hostileProjection = [
    '<article data-vex-route="support.test">',
    '  <span data-vex-route-action aria-disabled="true">Held</span>',
    '  <span data-candidate="</article><!--https&colon;//github.com/sponsors/vgong24-->"></span>',
    '</article>',
  ].join('\n');
  const { root, active } = supportRouteFixture(hostileProjection, { candidateUrl });
  assert.ok(validateRegistry(active, root).some(issue => issue.check === 'support-route-candidate-held'));
});

test('INSTITUTIONAL-SURFACES: unsafe identity and permissive runtime fail closed', () => {
  const broken = {
    schemaVersion: SCHEMA_VERSION,
    surfaces: {
      home: entry({
        runtime: { mode: 'standalone', godScript: true, shell: false },
        archive: { indexed: true, arcMembership: false },
      }),
    },
  };
  const checks = new Set(validateRegistry(broken, makeRoot()).map(issue => issue.check));
  assert.ok(checks.has('slug'));
  assert.ok(checks.has('runtime-boundary'));
  assert.ok(checks.has('archive-boundary'));
});

test('INSTITUTIONAL-SURFACES: a reservation cannot silently acquire a page', () => {
  const root = makeRoot();
  fs.writeFileSync(path.join(root, 'pages', 'vex-test.html'), '<html></html>\n');
  const broken = { schemaVersion: SCHEMA_VERSION, surfaces: { 'vex-test': entry() } };
  assert.ok(validateRegistry(broken, root).some(issue => issue.check === 'reservation-stale'));
});

test('INSTITUTIONAL-SURFACES: a reservation owns node, arc, dist, and generated-index identity', () => {
  const root = makeRoot();
  fs.writeFileSync(path.join(root, 'dist', 'vextreme-vex-test.js'), '// collision\n');
  fs.writeFileSync(path.join(root, 'data', 'nodes.json'), '[{"slug":"vex-test"}]\n');
  fs.writeFileSync(path.join(root, 'data', 'arcs-v2.json'), '{"a":{"sections":[{"slugs":["vex-test"]}]}}\n');
  fs.writeFileSync(path.join(root, 'data', 'index.json'), '{"slugMap":{"vex-test":{}},"departmentMap":{}}\n');
  const broken = { schemaVersion: SCHEMA_VERSION, surfaces: { 'vex-test': entry() } };
  const checks = new Set(validateRegistry(broken, root).map(issue => issue.check));
  for (const expected of ['god-script-output', 'archive-index', 'arc-membership', 'generated-index']) {
    assert.ok(checks.has(expected), `expected ${expected}`);
  }
});

test('INSTITUTIONAL-SURFACES: generated map primitive and key leaks fail closed', () => {
  const root = makeRoot();
  const broken = { schemaVersion: SCHEMA_VERSION, surfaces: { 'vex-test': entry() } };

  fs.writeFileSync(path.join(root, 'data', 'index.json'), '{"arcMap":{"a":["vex-test"]}}\n');
  assert.ok(validateRegistry(broken, root).some(issue => issue.check === 'generated-index'));

  fs.writeFileSync(path.join(root, 'data', 'index.json'), '{"arcMap":{"vex-test":[]}}\n');
  assert.ok(validateRegistry(broken, root).some(issue => issue.check === 'generated-index'));
});

test('INSTITUTIONAL-SURFACES: real auto-discovery excludes registry identities without another slug list', () => {
  const active = { schemaVersion: SCHEMA_VERSION, surfaces: { 'vex-test': entry({ state: 'active' }) } };
  const exclusions = autoDiscoveryExclusions({}, active);
  const discovered = discoverOrphanNodes(
    ['vex-test'],
    [],
    exclusions,
    [],
    () => activeHtml(),
    { rd: { default: true } }
  );
  assert.deepEqual(discovered, []);
});

test('INSTITUTIONAL-SURFACES: malformed active entries report shape errors instead of throwing', () => {
  const malformed = {
    schemaVersion: SCHEMA_VERSION,
    surfaces: {
      'vex-test': { state: 'active', kind: 'institutional', purpose: 'test-surface' },
    },
  };
  const issues = validateRegistry(malformed, makeRoot());
  assert.ok(issues.some(issue => issue.check === 'missing-field'));
  assert.ok(issues.some(issue => issue.check === 'shape'));
});

test('INSTITUTIONAL-SURFACES: active page projections are checked together', () => {
  const root = makeRoot();
  fs.writeFileSync(path.join(root, 'pages', 'vex-test.html'), '<html><script src="../lib/shell.js"></script></html>\n');
  fs.writeFileSync(path.join(root, 'dist', 'vextreme-vex-test.js'), '// unexpected\n');
  fs.writeFileSync(path.join(root, 'data', 'nodes.json'), '[{"slug":"vex-test"}]\n');
  fs.writeFileSync(path.join(root, 'data', 'arcs-v2.json'), '{"a":{"sections":[{"slugs":["vex-test"]}]}}\n');
  const broken = { schemaVersion: SCHEMA_VERSION, surfaces: { 'vex-test': entry({ state: 'active' }) } };
  const checks = new Set(validateRegistry(broken, root).map(issue => issue.check));
  for (const expected of [
    'surface-marker', 'scope-marker', 'category-marker', 'theme-family-marker', 'theme-variant-marker',
    'runtime-boundary', 'i18n-bindings', 'evidence-matrix',
    'god-script-output', 'archive-index', 'arc-membership',
  ]) assert.ok(checks.has(expected), `expected ${expected}`);
});

test('INSTITUTIONAL-SURFACES: active requires every locale binding and declared evidence cell', () => {
  const root = makeRoot();
  fs.writeFileSync(path.join(root, 'pages', 'vex-test.html'), activeHtml());
  const activeEntry = entry({ state: 'active' });
  const active = { schemaVersion: SCHEMA_VERSION, surfaces: { 'vex-test': activeEntry } };
  const missingChecks = new Set(validateRegistry(active, root).map(issue => issue.check));
  assert.ok(missingChecks.has('required-locale-bundle'));
  assert.ok(missingChecks.has('evidence-matrix'));

  writeActiveAcceptance(root, 'vex-test', activeEntry);
  const bundlePath = path.join(root, 'data', 'strings', 'compiled', 'scopes', 'system', 'institution.en.json');
  fs.writeFileSync(bundlePath, '{}\n');
  assert.ok(validateRegistry(active, root).some(issue => issue.check === 'required-locale-key'));
});

test('INSTITUTIONAL-SURFACES: accessibility bindings and string category are activation contracts', () => {
  const root = makeRoot();
  fs.writeFileSync(path.join(root, 'pages', 'vex-test.html'), activeHtml());
  const activeEntry = entry({ state: 'active' });
  writeActiveAcceptance(root, 'vex-test', activeEntry);
  const bundlePath = path.join(root, 'data', 'strings', 'compiled', 'scopes', 'system', 'institution.en.json');
  fs.writeFileSync(bundlePath, `${JSON.stringify({ 'institution.test': { text: 'Test' } })}\n`);
  const messages = validateRegistry(
    { schemaVersion: SCHEMA_VERSION, surfaces: { 'vex-test': activeEntry } },
    root
  ).filter(issue => issue.check === 'required-locale-key').map(issue => issue.message);
  assert.ok(messages.some(message => message.includes('institution.test.alt')));
  assert.ok(messages.some(message => message.includes('institution.test.aria')));

  const badCategory = entry({ strings: { ...activeEntry.strings, category: 'unknown' } });
  assert.ok(validateRegistry(
    { schemaVersion: SCHEMA_VERSION, surfaces: { 'vex-category': badCategory } },
    makeRoot()
  ).some(issue => issue.check === 'string-category'));

  const badLocale = entry({ strings: { ...activeEntry.strings, requiredLocales: ['en', 'xx'], plannedLocales: [] } });
  assert.ok(validateRegistry(
    { schemaVersion: SCHEMA_VERSION, surfaces: { 'vex-locale': badLocale } },
    makeRoot()
  ).some(issue => issue.check === 'unsupported-locale'));
});

test('INSTITUTIONAL-SURFACES: static English text, alt, and ARIA must equal the compiled bundle', () => {
  const root = makeRoot();
  const activeEntry = entry({ state: 'active' });
  writeActiveAcceptance(root, 'vex-test', activeEntry);
  fs.writeFileSync(
    path.join(root, 'pages', 'vex-test.html'),
    activeHtml()
      .replace('Test en</h1>', 'Stale text</h1>')
      .replace('alt="Test image en"', 'alt="Stale alt"')
      .replace('aria-label="Test action en"', 'aria-label="Stale action"')
  );
  const projectionIssues = validateRegistry(
    { schemaVersion: SCHEMA_VERSION, surfaces: { 'vex-test': activeEntry } },
    root
  ).filter(issue => issue.check === 'static-english-projection');
  assert.equal(projectionIssues.length, 3);
  for (const kind of ['text', 'alt', 'aria']) {
    assert.ok(projectionIssues.some(issue => issue.message.includes(` ${kind} value`)), `expected ${kind} drift`);
  }
});

test('INSTITUTIONAL-SURFACES: static alt equality is independent of attribute order', () => {
  const root = makeRoot();
  const activeEntry = entry({ state: 'active' });
  writeActiveAcceptance(root, 'vex-test', activeEntry);
  fs.writeFileSync(
    path.join(root, 'pages', 'vex-test.html'),
    activeHtml().replace(
      '<img alt="Test image en" data-i18n-alt="institution.test.alt">',
      '<img data-i18n-alt="institution.test.alt" alt="Test image en">'
    )
  );
  const active = { schemaVersion: SCHEMA_VERSION, surfaces: { 'vex-test': activeEntry } };
  assert.deepEqual(validateRegistry(active, root), []);
});

test('INSTITUTIONAL-SURFACES: status text meets WCAG AA contrast in both foundation themes', () => {
  const designCss = fs.readFileSync(path.join(ROOT, 'styles', 'design-system.css'), 'utf8');
  const componentCss = fs.readFileSync(path.join(ROOT, 'styles', 'vex-institutional.css'), 'utf8');
  const statuses = {
    pending: 'caution',
    active: 'success',
    separate: 'info',
  };

  for (const theme of ['foundation', 'foundation-light']) {
    const variables = themeVariables(designCss, theme);
    const background = cssColorToLinearRgb(resolveCssValue(variables['bg-surface'], variables));
    for (const [badge, status] of Object.entries(statuses)) {
      assert.match(componentCss, new RegExp(`\\.vex-badge-${badge}\\s*\\{[^}]*color:\\s*var\\(--status-${status}\\)`, 's'));
      const foreground = cssColorToLinearRgb(resolveCssValue(variables[`status-${status}`], variables));
      const ratio = contrastRatio(foreground, background);
      assert.ok(ratio >= 4.5, `${theme} ${badge} text contrast ${ratio.toFixed(3)}:1 is below 4.5:1`);
    }
  }
});

test('INSTITUTIONAL-SURFACES: multi-locale activation executes the declared runtime path', () => {
  const root = makeRoot();
  const activeEntry = entry({
    state: 'active',
    strings: { category: 'system', scope: 'institution', requiredLocales: ['en', 'ja'], plannedLocales: [] },
  });
  const active = { schemaVersion: SCHEMA_VERSION, surfaces: { 'vex-test': activeEntry } };
  fs.writeFileSync(path.join(root, 'pages', 'vex-test.html'), activeHtml());
  writeActiveAcceptance(root, 'vex-test', activeEntry);

  const absentChecks = new Set(validateRegistry(active, root).map(issue => issue.check));
  for (const expected of ['locale-loader', 'locale-loader-source', 'locale-scope-global', 'locale-category-global', 'locale-control']) {
    assert.ok(absentChecks.has(expected), `expected ${expected}`);
  }

  fs.writeFileSync(path.join(root, 'widgets', 'vex-institutional.js'), 'throw new Error("runtime is broken");\n');
  fs.writeFileSync(path.join(root, 'pages', 'vex-test.html'), activeLocalizedHtml());
  assert.ok(validateRegistry(active, root).some(issue => issue.check === 'locale-runtime-behavior'));

  fs.writeFileSync(path.join(root, 'widgets', 'vex-institutional.js'), '// inert fixture\n');
  assert.ok(validateRegistry(active, root).some(issue => issue.check === 'locale-runtime-behavior'));

  fs.writeFileSync(path.join(root, 'widgets', 'vex-institutional.js'), hardCodedLocalizationLoader());
  const zeroFetchMessages = validateRegistry(active, root)
    .filter(issue => issue.check === 'locale-runtime-behavior')
    .map(issue => issue.message);
  assert.ok(zeroFetchMessages.includes('ja required bundle fetch did not complete'));
  assert.ok(zeroFetchMessages.includes('en required bundle fetch did not complete'));

  fs.writeFileSync(path.join(root, 'widgets', 'vex-institutional.js'), hardCodedLocalizationLoader({ requestOnly: true }));
  const incompleteFetchMessages = validateRegistry(active, root)
    .filter(issue => issue.check === 'locale-runtime-behavior')
    .map(issue => issue.message);
  assert.ok(incompleteFetchMessages.includes('ja required bundle fetch did not complete'));
  assert.ok(incompleteFetchMessages.includes('en required bundle fetch did not complete'));

  fs.writeFileSync(path.join(root, 'pages', 'vex-test.html'), activeLocalizedHtml({ category: 'production', locales: ['en'] }));
  const wrongChecks = new Set(validateRegistry(active, root).map(issue => issue.check));
  assert.ok(wrongChecks.has('locale-category-global'));
  assert.ok(wrongChecks.has('locale-control-option'));

  fs.writeFileSync(path.join(root, 'widgets', 'vex-institutional.js'), workingLocalizationLoader());
  fs.writeFileSync(path.join(root, 'pages', 'vex-test.html'), activeLocalizedHtml());
  assert.deepEqual(validateRegistry(active, root), []);
});

test('INSTITUTIONAL-SURFACES: evidence requires every variant and a complete PNG structure', () => {
  const root = makeRoot();
  fs.writeFileSync(path.join(root, 'pages', 'vex-test.html'), activeHtml());
  const activeEntry = entry({ state: 'active' });
  writeActiveAcceptance(root, 'vex-test', activeEntry);
  const pseudoPng = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  fs.writeFileSync(
    path.join(root, 'docs', 'screenshots', 'vex-test-en-foundation-320.png'),
    pseudoPng
  );
  assert.ok(validateRegistry(
    { schemaVersion: SCHEMA_VERSION, surfaces: { 'vex-test': activeEntry } },
    root
  ).some(issue => issue.check === 'evidence-matrix'));

  const uncoveredTheme = entry({
    theme: { family: 'foundation', variants: ['foundation', 'foundation-light', 'foundation-high-contrast'] },
  });
  assert.ok(validateRegistry(
    { schemaVersion: SCHEMA_VERSION, surfaces: { 'vex-theme': uncoveredTheme } },
    makeRoot()
  ).some(issue => issue.check === 'evidence-theme-coverage'));
});

test('INSTITUTIONAL-SURFACES: a bounded standalone active fixture passes', () => {
  const root = makeRoot();
  fs.writeFileSync(path.join(root, 'pages', 'vex-test.html'), activeHtml());
  const activeEntry = entry({ state: 'active' });
  writeActiveAcceptance(root, 'vex-test', activeEntry);
  const active = { schemaVersion: SCHEMA_VERSION, surfaces: { 'vex-test': activeEntry } };
  assert.deepEqual(validateRegistry(active, root), []);
});

test('INSTITUTIONAL-SURFACES integration: committed registry and current main projections agree', () => {
  assert.deepEqual(run(ROOT).issues, []);
});

// [VXG RealForever]
