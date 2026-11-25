'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const projector = require('../tools/vex-content-forge/project_uncurated_surface.js');
const { getRecordPageSlugs } = require('../lib/audit-pages');

const FORMATION = path.join(ROOT, 'docs', 'ingestion', 'workmaps', 'content-forge-visibility-v1-documents-formation.json');
const NODES = path.join(ROOT, 'data', 'nodes.json');
const INTENTS = path.join(ROOT, 'config', 'content-intents.json');

const formation = JSON.parse(fs.readFileSync(FORMATION, 'utf8'));
const slugs = formation.members.map(member => member.slug);
const membersBySlug = new Map(formation.members.map(member => [member.slug, member]));

test('CONTENT FORGE VISIBILITY V1: preserved Documents reproduce committed uncurated pages exactly', () => {
  const outputs = projector.projectFormation(ROOT, { write:false });
  assert.equal(outputs.length, 5);
  assert.deepEqual(outputs.map(item => item.slug), slugs);

  for (const output of outputs) {
    const member = membersBySlug.get(output.slug);
    const committed = fs.readFileSync(output.pagePath, 'utf8');
    assert.equal(committed, output.page, output.slug + ': committed page must equal source-managed projection');
    assert.equal(committed.includes('Source-managed uncurated projection of ' + member.sourcePath), true, output.slug + ': exact source provenance');
    assert.equal((committed.match(/<h1\b/gi) || []).length, 1, output.slug + ': exactly one authored h1');
    assert.doesNotMatch(committed, /www\.vextreme24\.com|\/__rescue\/|\/__vex\/|data-vex-id=|data-i18n(?:-attrs|-alt|-aria)?=|_vexLoaderInit/);
    assert.doesNotMatch(committed, /(?:href|src)=(["'])\/(?!\/)/i, output.slug + ': no root-relative active references');
    assert.match(committed, /\.\.\/widgets\/fab-read-aloud\.js/);
  }
});

test('CONTENT FORGE VISIBILITY V1: Detector Map keeps only its bounded local interaction', () => {
  const detector = fs.readFileSync(path.join(ROOT, 'pages', 'integrity-check.html'), 'utf8');
  assert.match(detector, /Minimal attach-only script/);
  assert.match(detector, /All 18/);
  assert.match(detector, /querySelectorAll\('\.card'\)/);
  assert.doesNotMatch(detector, /fetch\s*\(|cdn\.jsdelivr\.net|VEXTREME_(?:ARCS|PAGES|mount)/);

  for (const slug of slugs.filter(value => value !== 'integrity-check')) {
    const page = fs.readFileSync(path.join(ROOT, 'pages', slug + '.html'), 'utf8');
    assert.doesNotMatch(page, /_vexLoaderInit|fetch\s*\(|cdn\.jsdelivr\.net\/gh\/vgong24\/vextreme/);
  }
});

test('CONTENT FORGE VISIBILITY V1: pages enter the existing record pipeline without invented canonical placement', () => {
  const records = new Set(getRecordPageSlugs());
  const nodes = JSON.parse(fs.readFileSync(NODES, 'utf8'));
  const nodeSlugs = new Set(nodes.map(node => node.slug));
  const intents = JSON.parse(fs.readFileSync(INTENTS, 'utf8'));
  const intentSlugs = new Set((intents.intents || []).map(intent => intent.slug));

  for (const slug of slugs) {
    assert.equal(records.has(slug), true, slug + ': real page must be auto-discoverable as a record');
    assert.equal(nodeSlugs.has(slug), false, slug + ': no canonical node may be invented in visibility V1');
    assert.equal(intentSlugs.has(slug), false, slug + ': no content intent may be invented in visibility V1');
  }
});

// [VXG RealForever]
