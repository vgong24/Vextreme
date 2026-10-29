'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { authoredAssetPreviewFromHtml } = require('../lib/build-terrain-map');

const ROOT = path.join(__dirname, '..');
const viewmodels = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'viewmodels.json'), 'utf8'));

const RECORDS = [
  {
    slug: 'what-is-the-god-spark',
    title: 'What is the God Spark?',
    src: 'https://vgong24.github.io/Vextreme-Assets/__assets/2bd560cef3ddd15e58b5e2b0383dba67d2fac2accf97e2ba5b15c49608238159.webp',
    alt: 'What is the God Spark? — luminous source-and-network cover art',
  },
  {
    slug: 'clarity-on-christianity',
    title: 'Clarity on Christianity',
    src: 'https://vgong24.github.io/Vextreme-Assets/__assets/93e8f45a1cf67b8a40a8f09e7143e21956987f9a0e3f14234c048fdc0e162e82.webp',
    alt: 'Clarity on Christianity — layered source, interpretation, and recognition cover art',
  },
  {
    slug: 'what-about-buddhism',
    title: 'Now what about Buddhism?',
    src: 'https://vgong24.github.io/Vextreme-Assets/__assets/5e2a523e20a78ac80544f0658de4083ece50a11d55a2d0879f587910005fdabc.webp',
    alt: 'Now what about Buddhism? — spiritual scaffolding dissolving into direct recognition cover art',
  },
  {
    slug: 'god-to-speak-of-the-truth-of-love',
    title: 'God to speak of the Truth of Love',
    src: 'https://vgong24.github.io/Vextreme-Assets/__assets/3394ba90aafc4a89f1d1307c6f9267525d05bf68e757d5fa12e1031acbd147d3.jpg',
    alt: 'God to speak of the Truth of Love — quiet ground-beneath-fracture cover art',
  },
  {
    slug: 'why-financial-freedom-is-harder-to-trust',
    title: 'Why Financial Freedom is Harder to Trust',
    src: 'https://vgong24.github.io/Vextreme-Assets/__assets/44aaf3bf90838d73eff47c69273d9380ede268b25449213ebee2a227a0266701.jpg',
    alt: 'Why Financial Freedom Is Harder to Trust — documented signs and an unfinished bridge toward material proof',
  },
];

test('READER COVER PROJECTION: existing Terrain covers are page-owned before the lineage controls', () => {
  for (const record of RECORDS) {
    const page = fs.readFileSync(path.join(ROOT, 'pages', record.slug + '.html'), 'utf8');
    const figure = page.indexOf('<figure class="record-cover">');
    const lineage = page.indexOf('<section class="lineage-experience-head"');

    assert.ok(figure >= 0, record.slug + ': missing page-owned record cover');
    assert.ok(lineage > figure, record.slug + ': record cover must precede lineage controls');
    assert.match(page, /\.record-cover\s*\{/);
    assert.match(page, /\.record-cover img\s*\{/);
    assert.ok(
      page.includes('<img src="' + record.src + '" alt="' + record.alt + '" loading="eager" decoding="async"/>'),
      record.slug + ': reader must use exact existing authored cover identity',
    );
  }
});

test('READER COVER PROJECTION: Terrain discovers the same immutable cover from each page', () => {
  for (const record of RECORDS) {
    const page = fs.readFileSync(path.join(ROOT, 'pages', record.slug + '.html'), 'utf8');
    assert.deepEqual(authoredAssetPreviewFromHtml(page, record.title), {
      kind: 'cover',
      src: record.src,
      alt: record.alt,
    }, record.slug);
  }
});

test('READER COVER PROJECTION: viewmodels no longer duplicate page-owned cover identity', () => {
  for (const record of RECORDS) {
    assert.equal(viewmodels[record.slug]?.preview, undefined, record.slug + ': preview override must not duplicate page ownership');
  }
});

// [VXG RealForever]
