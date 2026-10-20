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

function readPage() {
  return fs.readFileSync(PAGE_PATH, 'utf8').replace(/\r\n/g, '\n');
}

function inlineReaderScript(page) {
  const start = page.indexOf("<script>\n(function(){");
  const end = page.indexOf('</script>', start);
  assert.notEqual(start, -1, 'reader inline script start must exist');
  assert.notEqual(end, -1, 'reader inline script end must exist');
  return page.slice(start, end);
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
  const script = inlineReaderScript(page);

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

test('READER-NARRATION-OWNERSHIP: record-specific auto-scroll remains local and functional in shape', () => {
  const page = readPage();
  const script = inlineReaderScript(page);
  assert.match(page, /\.rs-autoscroll\{/);
  assert.match(script, /function startTranscriptAutoScroll\(section\)/);
  assert.match(script, /function pauseTranscriptAutoScroll\(section\)/);
  assert.match(script, /data-reader-component','transcript-autoscroll'/);
  assert.match(script, /function updateTranscriptAutoRate\(value\)/);
});

test('READER-NARRATION-OWNERSHIP: phase transitions reset auto-scroll without owning site narration state', () => {
  const script = inlineReaderScript(readPage());
  const show = script.match(/function show\(index,scroll\)\{[\s\S]*?centerActive\(scroll!==false\);\}/);
  assert.ok(show, 'show() must remain extractable');
  assert.match(show[0], /pauseTranscriptAutoScroll\(s\)/);
  assert.doesNotMatch(show[0], /Narration|Speech|speech|Kokoro/,
    'record phase selection must not become a second site narration owner');
});

test('READER-NARRATION-OWNERSHIP: preserved transcript/witness component identities remain present', () => {
  const page = readPage();
  const script = inlineReaderScript(page);

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
