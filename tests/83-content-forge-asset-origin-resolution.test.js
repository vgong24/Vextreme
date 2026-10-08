'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const parse5 = require('parse5');
const projector = require('../tools/vex-content-forge/project_arc_batch.js');

const ROOT = path.join(__dirname, '..');
const CATALOG = JSON.parse(fs.readFileSync(path.join(ROOT, 'config', 'content-assets.json'), 'utf8'));
const TEXT_EXT = new Set(['.html','.htm','.css','.js','.mjs','.cjs','.json','.xml','.txt','.svg']);
const PUBLIC_ROOT_FILES = new Set(['index.html','sw.js']);
const PUBLIC_DIRS = ['pages','styles','widgets','dist','data'];

function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const file = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(file) : entry.isFile() ? [file] : [];
  });
}
function publicTextFiles() {
  return [
    ...[...PUBLIC_ROOT_FILES].map(name => path.join(ROOT, name)).filter(fs.existsSync),
    ...PUBLIC_DIRS.flatMap(name => walk(path.join(ROOT, name)))
  ].filter(file => TEXT_EXT.has(path.extname(file).toLowerCase()) && fs.statSync(file).size <= 10 * 1024 * 1024);
}

test('Content Forge public asset references resolve through the build-time asset catalog', () => {
  const catalog = projector.loadAssetCatalog(ROOT);
  assert.equal(CATALOG.schemaVersion, 'vextreme.content-assets/v2');
  assert.equal(CATALOG.resolution, 'BUILD_TIME');
  assert.equal(CATALOG.baseUrl, 'https://vgong24.github.io/Vextreme-Assets');
  assert.equal(CATALOG.provider.repository, 'vgong24/Vextreme-Assets');
  assert.equal(CATALOG.provider.manifestPath, 'asset-manifest.json');
  assert.equal(CATALOG.provider.manifestGitBlob, 'a299b974bc0e24edfe4af0a75ac6b9c392ef7b47');
  assert.equal(CATALOG.logicalReference.prefix, '/__assets/');
  assert.equal(CATALOG.logicalReference.assetIdFormat, '64_HEX_EXPORTED_ID');
  assert.equal(CATALOG.assetCount, Object.keys(CATALOG.assets).length);

  let referencingFiles = 0;
  let references = 0;
  const resolvedPattern = /https:\/\/vgong24\.github\.io\/Vextreme-Assets\/([^"'\\s)>]+)/g;
  for (const file of publicTextFiles()) {
    const text = fs.readFileSync(file, 'utf8');
    assert.equal(projector.ROOT_RELATIVE_ASSET_REF.test(text), false, path.relative(ROOT, file) + ': unresolved logical asset reference');
    const resolved = [...text.matchAll(resolvedPattern)];
    if (!resolved.length) continue;
    referencingFiles += 1;
    for (const match of resolved) {
      references += 1;
      assert.ok(Object.values(CATALOG.assets).some(entry => entry.path === match[1]), path.relative(ROOT, file) + ': resolved URL is not catalog-backed: ' + match[1]);
    }
  }
  assert.ok(referencingFiles > 0);
  assert.ok(references > 0);
  assert.equal(catalog.baseUrl, CATALOG.baseUrl);
});

test('Content Forge asset resolver separates stable identity from provider location', () => {
  const catalog = projector.loadAssetCatalog(ROOT);
  const id = 'b867417e358bc99a0c0c04f81ce68ef0ecbb0060810067ba918f6e654089a468';
  assert.equal(projector.resolveAssetReference(id + '.png', catalog), catalog.baseUrl + '/' + catalog.assets[id].path);
  const moved = { ...catalog, baseUrl: 'https://assets.example.test', assets: { ...catalog.assets, [id]: { extension: 'png', path: 'media/witness/' + id + '.png' } } };
  assert.equal(projector.resolveAssetReference(id + '.png', moved), 'https://assets.example.test/media/witness/' + id + '.png');
});

test('Content Forge asset externalization covers attributes, srcset, CSS, and is idempotent', () => {
  const ids = ['297c8def391af561d445c75a946b36d399e208211c115fa6effdf1085c5595a0','05277887454a79f3b08d8a83685e989b6c46b74d8e48d136b2d16acf77aba4e1','3c4792858b8c3d40dcc2831e7d27cfe30e71e109cccd25c2de3d5eff3938f09d','579763762b55119408c8a6471fe25f29bf47ad0079db4f693b5cc4a47317ed68','de12452f813b1173393db58ea3b6def38681821706bce5622bb2bcf6619a0be2'];
  const catalog = projector.loadAssetCatalog(ROOT);
  const document = parse5.parse('<!doctype html><html><head><style>.a{background:url("/__assets/' + ids[0] + '.png")}</style></head><body><img src="/__assets/' + ids[1] + '.png" srcset="/__assets/' + ids[2] + '.png 1x, /__assets/' + ids[3] + '.png 2x" style="mask:url(/__assets/' + ids[4] + '.png)"><img src="' + catalog.baseUrl + '/' + catalog.assets[ids[0]].path + '"></body></html>');
  projector.externalizeAssetReferences(document, catalog);
  const once = parse5.serialize(document);
  projector.externalizeAssetReferences(document, catalog);
  const twice = parse5.serialize(document);
  assert.equal(once, twice);
  assert.equal(projector.ROOT_RELATIVE_ASSET_REF.test(once), false);
  for (const id of ids) assert.ok(once.includes(catalog.baseUrl + '/' + catalog.assets[id].path), id);
});

test('Content Forge asset resolver fails closed for unmapped identity or extension drift', () => {
  const catalog = projector.loadAssetCatalog(ROOT);
  assert.throws(() => projector.resolveAssetReference('ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff.png', catalog), error => error && error.code === 'ASSET_ID_UNMAPPED');
  const id = 'b867417e358bc99a0c0c04f81ce68ef0ecbb0060810067ba918f6e654089a468';
  assert.throws(() => projector.resolveAssetReference(id + '.jpg', catalog), error => error && error.code === 'ASSET_EXTENSION_MISMATCH');
});

// [VXG RealForever]
