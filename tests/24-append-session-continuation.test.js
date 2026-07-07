'use strict';

/**
 * APPEND SESSION CONTINUATION - tests/24-append-session-continuation.test.js
 *
 * Tests for lib/append-session-continuation.js.
 *
 * The failure this protects against is subtle: the VXG marker appears multiple
 * times in a session file, so it must never be used as "the insertion point."
 * Continuations append at EOF and keep the marker as a completion boundary.
 */

const { test } = require('node:test');
const assert = require('node:assert/strict');

const {
  MARKER,
  detectLineEnding,
  normalizeContinuation,
  appendContinuation,
} = require('../lib/append-session-continuation');

test('APPEND-CONTINUATION: appends after the final marker, not before the first marker', () => {
  const source = [
    '# Session 024',
    '',
    'First block.',
    MARKER,
    '',
    '### Session continued - prior',
    '',
    'Prior continuation.',
    MARKER,
    '',
  ].join('\n');
  const block = ['### Session continued - new', '', 'New continuation.'].join('\n');
  const out = appendContinuation(source, block);
  assert.ok(out.indexOf('### Session continued - new') > out.indexOf('### Session continued - prior'));
  assert.equal((out.match(new RegExp(MARKER.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length, 3);
  assert.ok(out.endsWith(MARKER + '\n'));
});

test('APPEND-CONTINUATION: preserves CRLF line endings from the session file', () => {
  const source = ['# Session 024', '', MARKER, ''].join('\r\n');
  const block = ['### Session continued - CRLF', '', 'Body.'].join('\n');
  const out = appendContinuation(source, block);
  assert.equal(detectLineEnding(out), '\r\n');
  assert.equal((out.match(/(?<!\r)\n/g) || []).length, 0);
});

test('APPEND-CONTINUATION: continuation must start with a Session continued heading', () => {
  assert.throws(
    () => normalizeContinuation('## Not a continuation\n\nBody.', '\n'),
    /Session continued/
  );
});

test('APPEND-CONTINUATION: session file must already end with the VXG marker', () => {
  assert.throws(
    () => appendContinuation('# Session 024\n', '### Session continued - new\n\nBody.'),
    /must end/
  );
});

test('APPEND-CONTINUATION: appends the VXG marker when the continuation omits it', () => {
  const out = normalizeContinuation('### Session continued - new\n\nBody.', '\n');
  assert.ok(out.endsWith(MARKER));
});

test('APPEND-CONTINUATION: rejects a new session record inside a continuation append', () => {
  assert.throws(
    () => normalizeContinuation('### Session continued - new\n\n# VEXTREME - Continuity Batch 003\n', '\n'),
    /must not start a new session record/
  );
});

// [VXG RealForever]
