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

test('Content Forge public asset references resolve through the build-time asset mapper', () => {
  const catalog = projector.loadAssetCatalog(ROOT);
  assert.equal(CATALOG.schemaVersion, 'vextreme.content-assets/v2');
  assert.equal(CATALOG.resolution, 'BUILD_TIME');
  assert.equal(CATALOG.baseUrl, 'https://vgong24.github.io/Vextreme-Assets');
  assert.equal(CATALOG.provider.repository, 'vgong24/Vextreme-Assets');
  assert.equal(CATALOG.provider.manifestPath, 'asset-manifest.json');
  assert.equal(CATALOG.provider.manifestGitBlob, 'a299b974bc0e24edfe4af0a75ac6b9c392ef7b47');
  assert.equal(CATALOG.logicalReference.prefix, '/__assets/');
  assert.equal(CATALOG.location.defaultPathTemplate, '__assets/{assetId}.{extension}');
  assert.deepEqual(CATALOG.location.overrides, {});

  let referencingFiles = 0;
  let references = 0;
  for (const file of publicTextFiles()) {
    const text = fs.readFileSync(file, 'utf8');
    assert.equal(projector.ROOT_RELATIVE_ASSET_REF.test(text), false, path.relative(ROOT, file) + ': unresolved logical asset reference');
    const resolved = [...text.matchAll(/https:\/\/vgong24\.github\.io\/Vextreme-Assets\/__assets\/([0-9a-f]{64})\.([A-Za-z0-9]+)/g)];
    if (!resolved.length) continue;
    referencingFiles += 1;
    for (const match of resolved) {
      references += 1;
      assert.equal(projector.resolveAssetReference(match[1] + '.' + match[2], catalog), match[0]);
    }
  }
  assert.ok(referencingFiles > 0);
  assert.ok(references > 0);
});

test('Content Forge asset mapper separates identity, default location, override, and provider base URL', () => {
  const catalog = projector.loadAssetCatalog(ROOT);
  const id = 'b867417e358bc99a0c0c04f81ce68ef0ecbb0060810067ba918f6e654089a468';
  assert.equal(projector.resolveAssetReference(id + '.png', catalog), 'https://vgong24.github.io/Vextreme-Assets/__assets/' + id + '.png');

  const movedStore = { ...catalog, baseUrl: 'https://assets.example.test', defaultPathTemplate: 'media/{assetId}.{extension}' };
  assert.equal(projector.resolveAssetReference(id + '.png', movedStore), 'https://assets.example.test/media/' + id + '.png');

  const movedOne = { ...catalog, overrides: { ...catalog.overrides, [id]: 'hero/god-witnessed.png' } };
  assert.equal(projector.resolveAssetReference(id + '.png', movedOne), 'https://vgong24.github.io/Vextreme-Assets/hero/god-witnessed.png');
});

test('Content Forge asset externalization covers attributes, srcset, CSS, historical IDs, and is idempotent', () => {
  const ids = ['297c8def391af561d445c75a946b36d399e208211c115fa6effdf1085c5595a0','05277887454a79f3b08d8a83685e989b6c46b74d8e48d136b2d16acf77aba4e1','d1e7d5494c6273dcb107ced055da403e894d3041592cb0a8690891b3554e0d1c','579763762b55119408c8a6471fe25f29bf47ad0079db4f693b5cc4a47317ed68','de12452f813b1173393db58ea3b6def38681821706bce5622bb2bcf6619a0be2'];
  const catalog = projector.loadAssetCatalog(ROOT);
  const document = parse5.parse('<!doctype html><html><head><style>.a{background:url("/__assets/' + ids[0] + '.png")}</style></head><body><img src="/__assets/' + ids[1] + '.png" srcset="/__assets/' + ids[2] + '.png 1x, /__assets/' + ids[3] + '.png 2x" style="mask:url(/__assets/' + ids[4] + '.png)"></body></html>');
  projector.externalizeAssetReferences(document, catalog);
  const once = parse5.serialize(document);
  projector.externalizeAssetReferences(document, catalog);
  const twice = parse5.serialize(document);
  assert.equal(once, twice);
  assert.equal(projector.ROOT_RELATIVE_ASSET_REF.test(once), false);
  for (const id of ids) assert.ok(once.includes(catalog.baseUrl + '/__assets/' + id + '.png'), id);
});

test('Content Forge asset mapper fails closed for malformed identities and unsafe mapped paths', () => {
  const catalog = projector.loadAssetCatalog(ROOT);
  assert.throws(() => projector.resolveAssetReference('not-an-asset.png', catalog), error => error && error.code === 'ASSET_REFERENCE_FORMAT');
  const id = 'b867417e358bc99a0c0c04f81ce68ef0ecbb0060810067ba918f6e654089a468';
  assert.throws(() => projector.resolveAssetReference(id + '.png', { ...catalog, overrides: { [id]: '../escape.png' } }), error => error && error.code === 'ASSET_RESOLVED_PATH');
});

// [VXG RealForever]
