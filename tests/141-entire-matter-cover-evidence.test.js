'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const PAGE = 'pages/entire-matter-return-seal.html';
const VIEWS = 'data/viewmodels.json';
const COVER_COMMIT = '0112ddb696f9b604402809fb945f2e2e88ad1359';
const COVER_SHA256 = '96269d955043540d2eda8a8e973be9307c691bec816fdb41be9b68b1b19a8cd9';
const EVIDENCE_SOURCE_HEAD = 'bce54f533fe7f766f68538b2dc355280269831ab';

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8').replace(/\r\n/g, '\n');
}

test('ENTIRE-MATTER-MEDIA: Return reader exposes the approved representative cover', () => {
  const page = read(PAGE);
  const views = JSON.parse(read(VIEWS));
  const coverUrl = 'https://raw.githubusercontent.com/vgong24/Vextreme-Assets/' + COVER_COMMIT + '/__assets/' + COVER_SHA256 + '.webp';

  assert.ok(page.includes(coverUrl));
  assert.ok(page.includes('data-media-sha256="' + COVER_SHA256 + '"'));
  assert.ok(page.includes('<strong>What Survived the Break.</strong>'));
  assert.equal(views['entire-matter-return-seal'].preview.kind, 'cover');
  assert.equal(views['entire-matter-return-seal'].preview.src, coverUrl);
});

test('ENTIRE-MATTER-MEDIA: prior-thread screenshot evidence is visible and pinned to the frozen evidence commit', () => {
  const page = read(PAGE);
  const base = '../records/conversations/2026-11-01-current-thread-entire-matter-return-seal/evidence/prior-thread/';

  assert.ok(page.includes('id="prior-thread-evidence"'));
  assert.ok(page.includes(base + 'batch-01-vexlogger-logging-sequence.png'));
  assert.ok(page.includes(base + 'batch-01-ui-sample-vexapplication.png'));
  assert.ok(page.includes(base + 'batch-01-vexdependencyfactory.png'));
  assert.ok(page.includes(base + 'batch-05-unknown-error-boundary.png'));

  assert.ok(page.includes('f97056c460d846629c44eb392cc47f982bee242d05644be226f3067cdb2b3d63'));
  assert.ok(page.includes('1c2cf568f773eb4575ddf3ee4ba3c98ed5fe43538d2b11fd6b3bee307351fd14'));
  assert.ok(page.includes('ec00bcf3077248319a39a25126d41d079dbfc8eaf4d5181bd39fa96117c2989b'));
  assert.ok(page.includes('40c33b2dbc1d9f439b8ce0e86789192098fbaf65a7f37162766187b6805c1945'));

  assert.match(page, /mirrored here byte-for-byte/i);\n  assert.match(page, /evidence attachments, not screenshots of the declaration itself/i);
  assert.match(page, /do not by themselves establish a hidden backend cause/i);\n  assert.ok(page.includes(base + 'README.md'));
});

test('ENTIRE-MATTER-MEDIA: screenshot evidence source remains explicitly separate from the canonical declaration', () => {
  const page = read(PAGE);
  const evidenceIndex = page.indexOf('id="prior-thread-evidence"');
  const declarationIndex = page.indexOf('id="return-root"');

  assert.ok(evidenceIndex >= 0);
  assert.ok(declarationIndex > evidenceIndex);
  assert.match(page, /Canonical sealed declaration · source projection/);
});

// [VXG RealForever]
