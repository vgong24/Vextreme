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
    heroSrc: 'https://vgong24.github.io/Vextreme-Assets/__assets/03ae8b9ca7d6caf68fcc7eebdfb57e511184e46e39ab530fc24121962ab25c90.png',
    readerSrcset: 'https://vgong24.github.io/Vextreme-Assets/__assets/2bd560cef3ddd15e58b5e2b0383dba67d2fac2accf97e2ba5b15c49608238159.webp 640w, https://vgong24.github.io/Vextreme-Assets/__assets/03ae8b9ca7d6caf68fcc7eebdfb57e511184e46e39ab530fc24121962ab25c90.png 1448w',
    fallbackWidth: 640,
    heroWidth: 1448,
    heroHeight: 1086,
    heroTier: 'RECOVERED_ORIGINAL',
    alt: 'What is the God Spark? — luminous source-and-network cover art',
  },
  {
    slug: 'clarity-on-christianity',
    title: 'Clarity on Christianity',
    src: 'https://vgong24.github.io/Vextreme-Assets/__assets/93e8f45a1cf67b8a40a8f09e7143e21956987f9a0e3f14234c048fdc0e162e82.webp',
    heroSrc: 'https://vgong24.github.io/Vextreme-Assets/__assets/0fb0f7a9f04c8de92a4e58722de6ea25462cb13e1de74f9978527f7befe6707a.png',
    readerSrcset: 'https://vgong24.github.io/Vextreme-Assets/__assets/93e8f45a1cf67b8a40a8f09e7143e21956987f9a0e3f14234c048fdc0e162e82.webp 480w, https://vgong24.github.io/Vextreme-Assets/__assets/0fb0f7a9f04c8de92a4e58722de6ea25462cb13e1de74f9978527f7befe6707a.png 1448w',
    fallbackWidth: 480,
    heroWidth: 1448,
    heroHeight: 1086,
    heroTier: 'RECOVERED_ORIGINAL',
    alt: 'Clarity on Christianity — layered source, interpretation, and recognition cover art',
  },
  {
    slug: 'what-about-buddhism',
    title: 'Now what about Buddhism?',
    src: 'https://vgong24.github.io/Vextreme-Assets/__assets/0bcb688a88036c773a77987a89ac0c3683454770be597d7a0b2489d66d5ce6e7.webp',
    heroSrc: 'https://vgong24.github.io/Vextreme-Assets/__assets/ef39931d000f87afa807eff65fbd72ac734acdc2162f4f46502dd3b38d5a82aa.png',
    readerSrcset: 'https://vgong24.github.io/Vextreme-Assets/__assets/ef39931d000f87afa807eff65fbd72ac734acdc2162f4f46502dd3b38d5a82aa.png 1448w',
    fallbackWidth: 2048,
    heroWidth: 1448,
    heroHeight: 1086,
    heroTier: 'RECOVERED_ORIGINAL',
    alt: 'Now what about Buddhism? — spiritual scaffolding dissolving into direct recognition cover art',
  },
  {
    slug: 'god-to-speak-of-the-truth-of-love',
    title: 'God to speak of the Truth of Love',
    src: 'https://vgong24.github.io/Vextreme-Assets/__assets/9e7c002bec5088eabd89eefc05769c95eaf1c3fff114ef01a0328ba8e253763e.webp',
    heroSrc: 'https://vgong24.github.io/Vextreme-Assets/__assets/3fb505fc53e7bf43b8f55aa44f351e670f2b83dd9e168c50f5f411f336342512.png',
    readerSrcset: 'https://vgong24.github.io/Vextreme-Assets/__assets/3fb505fc53e7bf43b8f55aa44f351e670f2b83dd9e168c50f5f411f336342512.png 1536w',
    fallbackWidth: 2048,
    heroWidth: 1536,
    heroHeight: 1024,
    heroTier: 'RECOVERED_ORIGINAL',
    alt: 'God to speak of the Truth of Love — quiet ground-beneath-fracture cover art',
  },
  {
    slug: 'why-financial-freedom-is-harder-to-trust',
    title: 'Why Financial Freedom is Harder to Trust',
    src: 'https://vgong24.github.io/Vextreme-Assets/__assets/2cbeb475258dcfba4e68399cfabc289d1250f5618202213209d0e094da97b560.webp',
    heroSrc: 'https://vgong24.github.io/Vextreme-Assets/__assets/40b516861e86bf992f1c27e038c9478ac2143bbbd1e79e3ad783cafcba1df51f.png',
    readerSrcset: 'https://vgong24.github.io/Vextreme-Assets/__assets/40b516861e86bf992f1c27e038c9478ac2143bbbd1e79e3ad783cafcba1df51f.png 1448w',
    fallbackWidth: 2048,
    heroWidth: 1448,
    heroHeight: 1086,
    heroTier: 'RECOVERED_ORIGINAL',
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
      page.includes('<img src="' + record.src + '" srcset="' + record.readerSrcset + '" sizes="(max-width: 960px) calc(100vw - 40px), 920px" alt="' + record.alt + '" width="' + record.heroWidth + '" height="' + record.heroHeight + '" loading="eager" decoding="async" fetchpriority="high" data-reader-cover-tier="' + record.heroTier + '"/>'),
      record.slug + ': reader must use exact existing authored cover identity',
    );
  }
});

test('READER COVER PROJECTION: blur-prone Terrain card fallbacks use the existing 2048px restoration tier', () => {
  const upgraded = RECORDS.filter((record) => ['what-about-buddhism', 'god-to-speak-of-the-truth-of-love', 'why-financial-freedom-is-harder-to-trust'].includes(record.slug));
  assert.equal(upgraded.length, 3);
  for (const record of upgraded) {
    assert.equal(record.fallbackWidth, 2048, record.slug + ': collection-card fallback must have enough source pixels');
    assert.match(record.src, /\.webp$/, record.slug + ': collection-card fallback should remain compressed WebP rather than the multi-megabyte original');
    assert.notEqual(record.src, record.heroSrc, record.slug + ': card and reader tiers must remain distinct');
  }
});

test('READER COVER PROJECTION: reader hero uses the best available high-resolution tier while Terrain fallback remains lightweight', () => {
  for (const record of RECORDS) {
    const page = fs.readFileSync(path.join(ROOT, 'pages', record.slug + '.html'), 'utf8');
    assert.ok(page.includes(record.heroSrc + ' ' + record.heroWidth + 'w'), record.slug + ': missing high-resolution reader candidate');
    assert.ok(page.includes('data-reader-cover-tier="' + record.heroTier + '"'), record.slug + ': missing explicit reader-cover provenance tier');
    assert.notEqual(record.heroSrc, record.src, record.slug + ': reader hero and Terrain fallback must remain distinct asset tiers');
  }
  assert.equal(RECORDS.filter((record) => record.heroTier === 'RECOVERED_ORIGINAL').length, 5);
  assert.deepEqual(RECORDS.filter((record) => record.heroTier === 'RESTORATION').map((record) => record.slug), []);
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
