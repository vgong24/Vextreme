'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const parse5 = require('parse5');
const projector = require('../tools/vex-content-forge/project_arc_batch.js');

const ROOT = path.join(__dirname, '..');
const BINDING = JSON.parse(fs.readFileSync(path.join(ROOT, 'config', 'content-asset-origin.json'), 'utf8'));
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

test('Content Forge public asset references bind to the canonical Vextreme-Assets origin', () => {
  assert.deepEqual(BINDING, {
    schemaVersion: 'vextreme.content-assets/v1',
    repository: 'vgong24/Vextreme-Assets',
    origin: 'https://vgong24.github.io/Vextreme-Assets',
    canonicalPrefix: '/__assets/',
    assetIdentity: 'PRESERVE_EXPORTED_64_HEX_FILENAME_AND_EXTENSION'
  });

  const assetRef = /\/__assets\/([0-9a-f]{64}\.[A-Za-z0-9]+)/g;
  let referencingFiles = 0;
  let references = 0;
  const unique = new Set();

  for (const file of publicTextFiles()) {
    const text = fs.readFileSync(file, 'utf8');
    const matches = [...text.matchAll(assetRef)];
    if (!matches.length) continue;
    referencingFiles += 1;
    assert.equal(projector.ROOT_RELATIVE_ASSET_REF.test(text), false, path.relative(ROOT, file) + ': root-relative asset reference');
    for (const match of matches) {
      references += 1;
      unique.add(match[1].toLowerCase());
      const originStart = match.index - BINDING.origin.length;
      assert.ok(originStart >= 0, path.relative(ROOT, file) + ': missing asset origin');
      assert.equal(text.slice(originStart, match.index), BINDING.origin, path.relative(ROOT, file) + ': non-canonical asset origin');
    }
  }

  assert.ok(referencingFiles > 0);
  assert.ok(references > 0);
  assert.ok(unique.size > 0);
});

test('Content Forge asset externalization covers attributes, srcset, CSS, and is idempotent', () => {
  const document = parse5.parse('<!doctype html><html><head><style>.a{background:url("/__assets/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.png")}</style></head><body><img src="/__assets/bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb.jpg" srcset="/__assets/cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc.webp 1x, /__assets/dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd.webp 2x" style="mask:url(/__assets/eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee.svg)"><img src="https://vgong24.github.io/Vextreme-Assets/__assets/ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff.png"></body></html>');
  const binding = projector.loadAssetBinding(ROOT);
  projector.externalizeAssetReferences(document, binding);
  const once = parse5.serialize(document);
  projector.externalizeAssetReferences(document, binding);
  const twice = parse5.serialize(document);

  assert.equal(once, twice);
  assert.equal(projector.ROOT_RELATIVE_ASSET_REF.test(once), false);
  assert.equal((once.match(/https:\/\/vgong24\.github\.io\/Vextreme-Assets\/__assets\//g) || []).length, 6);
});

// [VXG RealForever]
