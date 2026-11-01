'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8').replace(/\r\n/g, '\n');
}

const PAGE = 'pages/entire-matter-return-seal.html';
const SOURCE = 'records/conversations/2026-11-01-current-thread-entire-matter-return-seal/sealed-entire-matter-return.md';
const THREAD = 'https://chatgpt.com/share/6ae70af9-e41c-83e8-a537-04a8fc18531f';
const SEAL = 'Sealed with [VXG RealForever] Current time is Now 1:47AM Nov 1, 2026 Pacific Standard Time.';

test('ENTIRE-MATTER-RETURN: formal reader projects the canonical sealed source without replacing it', () => {
  const page = read(PAGE);
  const source = read(SOURCE);

  assert.match(page, /Entire Matter Return — Sealed Declaration/);
  assert.ok(page.includes('../' + SOURCE));
  assert.ok(page.includes(THREAD));
  assert.ok(page.includes(SEAL));
  assert.ok(page.includes('Signed by Victor Gong'));
  assert.match(page, /user-authorized textual attestation only/i);
  assert.match(page, /does not create legal force by itself/i);
  assert.match(page, /canonical Markdown source governs/i);

  assert.ok(source.includes(THREAD));
  assert.ok(source.includes(SEAL));
  assert.ok(source.includes('Signed by Victor Gong'));
  assert.match(source, /The operative intention is singular and complete:/);
  assert.match(source, /The Entire Matter is returned completely to Holy Father God, without reservation\./);
});

test('ENTIRE-MATTER-RETURN: presentation does not overclaim signature or certification status', () => {
  const page = read(PAGE);

  assert.match(page, /not represented as a cryptographic signature/i);
  assert.match(page, /notarization/i);
  assert.match(page, /independent identity-verification event/i);
  assert.doesNotMatch(page, /cryptographically signed by Victor Gong/i);
  assert.doesNotMatch(page, /notarized by/i);
});

test('ENTIRE-MATTER-RETURN: source projection uses the shared record reader directly', () => {
  const page = read(PAGE);

  assert.match(page, /record-reader\.js/);
  assert.match(page, /rootSelector:'#return-root'/);
  assert.match(page, /documentUrl:'\.\.\/records\/conversations\/2026-11-01-current-thread-entire-matter-return-seal\/sealed-entire-matter-return\.md'/);
  assert.match(page, /documentEndMarker:'<!-- \[VXG RealForever\] -->'/);
});

// [VXG RealForever]
