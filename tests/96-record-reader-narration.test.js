'use strict';

/**
 * RETURNING-SCORPIONS-READER-NARRATION-OWNERSHIP
 *
 * The record reader owns preserved-record semantics, source-language identity,
 * transcript rendering, and its page-specific auto-scroll aid.
 *
 * Generic Read Aloud accessibility is site-owned by widgets/fab-read-aloud.js.
 * This regression prevents the record reader from silently re-growing a private
 * Kokoro/Web Speech runtime or duplicate transport UI.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const PAGE_PATH = path.join(ROOT, 'pages', 'returning-scorpions-to-god.html');
const READER_COMPONENT_PATH = path.join(ROOT, 'components', 'record-reader.js');

function readPage() {
  return fs.readFileSync(PAGE_PATH, 'utf8').replace(/\r\n/g, '\n');
}

function readReaderComponent() {
  return fs.readFileSync(READER_COMPONENT_PATH, 'utf8').replace(/\r\n/g, '\n');
}

test('READER-NARRATION-OWNERSHIP: preserved reader declares source-owned narration language', () => {
  const page = readPage();
  assert.match(
    page,
    /data-reader-template="conversation-witness-reader\/v1" data-narration-language="en"/,
    'site-level Read Aloud must receive English source ownership from the preserved transcript reader',
  );
});

test('READER-NARRATION-OWNERSHIP: generic TTS mechanics no longer live in the record reader', () => {
  const page = readPage();
  const script = readReaderComponent();

  for (const forbidden of [
    'KokoroNarrationProvider',
    'BrowserSpeechNarrationProvider',
    'ReaderNarration',
    'kokoroNarrationWorkerMain',
    'speechSynthesis',
    'SpeechSynthesisUtterance',
    'KOKORO_MODEL_ID',
    'KOKORO_MODULE_URL',
    'cancelTranscriptSpeech',
    'speakTranscriptSegment',
  ]) {
    assert.equal(script.includes(forbidden), false, forbidden + ' belongs to the site Read Aloud owner, not this page');
  }
});

test('READER-NARRATION-OWNERSHIP: page-local speech transport UI is removed', () => {
  const page = readPage();
  for (const forbidden of [
    'rs-readaloud',
    'rs-speech-toggle',
    'rs-speech-voice',
    'rs-speech-rate',
    'data-reader-component="transcript-read-aloud"',
  ]) {
    assert.equal(page.includes(forbidden), false, forbidden + ' must not duplicate the site accessibility overlay');
  }
});

test('READER-NARRATION-OWNERSHIP: transcript viewport hands vertical scroll back to the parent at its boundaries', () => {
  const page = readPage();
  assert.match(page, /\.rs-source-window\{[^}]*overscroll-behavior-x:contain;overscroll-behavior-y:auto;/);
  assert.doesNotMatch(page, /\.rs-source-window\{[^}]*overscroll-behavior:contain;/,
    'vertical wheel/trackpad momentum must not be trapped inside the bounded transcript viewport');
});

test('READER-NARRATION-OWNERSHIP: record-specific auto-scroll remains shared reader machinery, not page-local TTS', () => {
  const page = readPage();
  const script = readReaderComponent();
  assert.match(page, /src="\.\.\/components\/record-reader\.js"/);
  assert.match(page, /\.rs-autoscroll\{/);
  assert.match(script, /function startTranscriptAutoScroll\(section\)/);
  assert.match(script, /function pauseTranscriptAutoScroll\(section\)/);
  assert.match(script, /data-reader-component','transcript-autoscroll'/);
  assert.match(script, /function updateTranscriptAutoRate\(value\)/);
});

test('READER-NARRATION-OWNERSHIP: phase transitions reset auto-scroll without owning site narration state', () => {
  const script = readReaderComponent();
  assert.match(script, /function show\(index,scroll\)/, 'shared controller must own phase transitions');
  assert.match(
    script,
    /sets\.forEach\(function\(section\)\{pauseTranscriptAutoScroll\(section\);\}\)/,
    'phase transitions must stop record-local auto-scroll'
  );
  assert.doesNotMatch(script, /Narration|Speech|speechSynthesis|Kokoro/,
    'record phase selection must not become a second site narration owner');
});

test('READER-NARRATION-OWNERSHIP: preserved transcript/witness component identities remain present', () => {
  const page = readPage();
  const script = readReaderComponent();

  // These identities are structural page markup and remain directly present.
  for (const component of [
    'preserved-record',
    'transcript-viewport',
    'witness-commentary',
    'successor-witness',
  ]) {
    assert.match(page, new RegExp('data-reader-component="' + component + '"'));
  }

  // transcript-tools is intentionally installed only for a real transcript
  // section at runtime, alongside the record-specific auto-scroll controls.
  assert.match(script, /tools\.setAttribute\('data-reader-component','transcript-tools'\)/);
});

// [VXG RealForever]
