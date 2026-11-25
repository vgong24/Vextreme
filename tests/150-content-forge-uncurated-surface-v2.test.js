'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const projector = require('../tools/vex-content-forge/project_uncurated_surface.js');
const FORMATION = path.join(ROOT, 'docs', 'ingestion', 'workmaps', 'content-forge-visibility-v2-standalone-reference-formation.json');
const NODES = path.join(ROOT, 'data', 'nodes.json');
const INTENTS = path.join(ROOT, 'config', 'content-intents.json');

const formation = JSON.parse(fs.readFileSync(FORMATION, 'utf8'));
const slugs = formation.members.map(member => member.slug);
const membersBySlug = new Map(formation.members.map(member => [member.slug, member]));

test('CONTENT FORGE VISIBILITY V2: standalone/reference sources reproduce committed uncurated pages exactly', () => {
  const outputs = projector.projectFormation(ROOT, {
    formationRel: path.relative(ROOT, FORMATION),
    write:false,
  });
  assert.equal(outputs.length, 13);
  assert.deepEqual(outputs.map(item => item.slug), slugs);

  for (const output of outputs) {
    const member = membersBySlug.get(output.slug);
    const committed = fs.readFileSync(output.pagePath, 'utf8');
    assert.equal(committed, output.page, output.slug + ': committed page must equal source-managed projection');
    assert.equal(committed.includes('Source-managed uncurated projection of ' + member.sourcePath), true, output.slug + ': exact source provenance');
    assert.equal((committed.match(/<h1\b/gi) || []).length, 1, output.slug + ': exactly one perceivable/document heading identity');
    assert.doesNotMatch(committed, /www\.vextreme24\.com|\/__rescue\/|\/__vex\/|data-vex-id=|data-i18n(?:-attrs|-alt|-aria)?=|_vexLoaderInit|cdn\.jsdelivr\.net\/gh\/vgong24\/vextreme/i);
    assert.doesNotMatch(committed, /(?:href|src)=(["'])\/(?!\/)/i, output.slug + ': no root-relative active references');
    assert.doesNotMatch(committed, /\/__assets\/[0-9a-f]{64}\.[a-z0-9]+/i, output.slug + ': logical assets must be externalized before route normalization');
    assert.match(committed, /\.\.\/widgets\/fab-read-aloud\.js/);
  }
});

test('CONTENT FORGE VISIBILITY V2: hub heading and bounded local interactions are explicit, not global exceptions', () => {
  const free = fs.readFileSync(path.join(ROOT, 'pages', 'free-blueprints.html'), 'utf8');
  assert.match(free, /class="vex-content-forge-canonical-heading"/);
  assert.match(free, />Free Blueprints<\/h1>/);

  const calculator = fs.readFileSync(path.join(ROOT, 'pages', 'honesty-integrity-calculator.html'), 'utf8');
  const styleReference = fs.readFileSync(path.join(ROOT, 'pages', 'vextreme-system-style-reference.html'), 'utf8');
  assert.equal((calculator.match(/<script\b/gi) || []).length, 2, 'calculator keeps one bounded local script plus Read Aloud');
  assert.equal((styleReference.match(/<script\b/gi) || []).length, 2, 'style reference keeps one bounded local demo script plus Read Aloud');
  assert.match(calculator, /var isDark = false/);
  assert.match(styleReference, /arc-nav-demo-wrap/);
  assert.doesNotMatch(calculator + styleReference, /fetch\s*\(|XMLHttpRequest|WebSocket|cdn\.jsdelivr\.net|_vexLoaderInit/i);

  for (const slug of slugs.filter(value => !['honesty-integrity-calculator','vextreme-system-style-reference'].includes(value))) {
    const page = fs.readFileSync(path.join(ROOT, 'pages', slug + '.html'), 'utf8');
    assert.equal((page.match(/<script\b/gi) || []).length, 1, slug + ': obsolete source scripts stripped; only Read Aloud remains');
  }
});

test('CONTENT FORGE VISIBILITY V2: page routing composes through the existing repository map', () => {
  const free = fs.readFileSync(path.join(ROOT, 'pages', 'free-blueprints.html'), 'utf8');
  const system = fs.readFileSync(path.join(ROOT, 'pages', 'the-vextreme-system.html'), 'utf8');
  const qa = fs.readFileSync(path.join(ROOT, 'pages', 'question-answers.html'), 'utf8');

  assert.match(free, /href="the-vextreme-system\.html" data-vex-route-state="repository-live"/);
  assert.match(system, /href="vextreme-system-style-reference\.html" data-vex-route-state="repository-live"/);
  assert.match(system, /href="vextreme-system-project-map\.html" data-vex-route-state="repository-live"/);
  assert.match(qa, /href="\.\.\/index\.html" data-vex-route-state="repository-live"/);
});

test('CONTENT FORGE VISIBILITY V2: canonical placement and localization stay deliberately unclaimed', () => {
  const nodes = JSON.parse(fs.readFileSync(NODES, 'utf8'));
  const nodeSlugs = new Set(nodes.map(node => node.slug));
  const intents = JSON.parse(fs.readFileSync(INTENTS, 'utf8'));
  const intentSlugs = new Set((intents.intents || []).map(intent => intent.slug));

  for (const slug of slugs) {
    assert.equal(fs.existsSync(path.join(ROOT, 'pages', slug + '.html')), true, slug + ': projected page exists');
    assert.equal(nodeSlugs.has(slug), false, slug + ': no canonical node invented');
    assert.equal(intentSlugs.has(slug), false, slug + ': no content intent invented');
    assert.equal(fs.existsSync(path.join(ROOT, 'data', 'strings', 'source', 'pages', slug + '.json')), false, slug + ': localization source remains deferred');
  }
});

// [VXG RealForever]
