'use strict';

/**
 * FAB-READ-ALOUD — site-level accessibility reader contract.
 *
 * Protects the behavior promoted from the Returning-scorpions vertical slice:
 * one floating owner, arbitrary start position, continuous semantic-block
 * reading, lazy off-thread neural synthesis, reusable PCM, live neural playback
 * speed, bounded resource use, language-aware voice selection, and localized UI.
 */

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.join(__dirname, '..');
const WIDGET = path.join(ROOT, 'widgets', 'fab-read-aloud.js');
const COMMON = path.join(ROOT, 'data', 'strings', 'source', 'common.json');

function source() {
  return fs.readFileSync(WIDGET, 'utf8').replace(/\r\n/g, '\n');
}

function extractFunction(name) {
  const s = source();
  const marker = 'function ' + name + '(';
  const start = s.indexOf(marker);
  assert.notEqual(start, -1, name + '() must exist');
  const bodyStart = s.indexOf('{', start);
  let depth = 0;
  let quote = null;
  let escaped = false;
  for (let i = bodyStart; i < s.length; i += 1) {
    const ch = s[i];
    if (quote) {
      if (escaped) escaped = false;
      else if (ch === '\\') escaped = true;
      else if (ch === quote) quote = null;
      continue;
    }
    if (ch === "'" || ch === '"' || ch === '`') {
      quote = ch;
      continue;
    }
    if (ch === '{') depth += 1;
    else if (ch === '}') {
      depth -= 1;
      if (depth === 0) return s.slice(start, i + 1);
    }
  }
  assert.fail(name + '() closing brace must exist');
}

test('READ-ALOUD: source parses and owns exactly eight curated Kokoro English voices', () => {
  const s = source();
  assert.doesNotThrow(() => new Function(s));
  const voices = [...s.matchAll(/\{ id: '([^']+)',\s+name: '([^']+)',\s+language: '([^']+)',\s+gender: '([^']+)',\s+grade: '([^']+)'/g)]
    .map((match) => ({ id: match[1], name: match[2], language: match[3], gender: match[4], grade: match[5] }));
  assert.deepEqual(
    voices.map((voice) => voice.name),
    ['Heart', 'Bella', 'Nicole', 'Emma', 'Fenrir', 'Michael', 'Puck', 'George'],
  );
  assert.equal(voices.filter((voice) => voice.gender === 'Female').length, 4);
  assert.equal(voices.filter((voice) => voice.gender === 'Male').length, 4);
  assert.ok(voices.every((voice) => voice.language.startsWith('en-')));
});

test('READ-ALOUD: system voice inventory is language-filtered and capped at eight', () => {
  const s = source();
  assert.match(s, /var MAX_SYSTEM_VOICES = 8;/);
  const fn = extractFunction('matchingSystemVoices');
  assert.match(fn, /primaryLanguage\(voice\.lang\) === primary/);
  assert.match(fn, /\.slice\(0, MAX_SYSTEM_VOICES\)/);
});

test('READ-ALOUD: neural model preparation and inference live only in one Worker', () => {
  const s = source();
  const workerStart = s.indexOf('function kokoroWorkerMain()');
  const providerStart = s.indexOf('var NeuralNarration =', workerStart);
  assert.notEqual(workerStart, -1);
  assert.notEqual(providerStart, -1);
  const worker = s.slice(workerStart, providerStart);
  const pageProvider = s.slice(providerStart);

  assert.match(worker, /import\(KOKORO_MODULE_URL\)/);
  assert.match(worker, /requestAdapter\(\)/);
  assert.match(worker, /\{ device: 'webgpu', dtype: 'fp32' \}/);
  assert.match(worker, /\{ device: 'wasm', dtype: 'q8' \}/);
  assert.match(worker, /type: 'runtime-fallback'/);
  assert.match(worker, /await tts\.generate\(job\.text, \{ voice: job\.voice, speed: 1 \}\)/);
  assert.match(worker, /var samples = raw && raw\.audio;/);
  assert.match(worker, /KOKORO_AUDIO_EMPTY/);
  assert.doesNotMatch(worker, /raw\.data/);
  assert.match(worker, /\[samples\.buffer\]/);

  assert.equal((pageProvider.match(/new Worker\(/g) || []).length, 1);
  assert.doesNotMatch(pageProvider, /from_pretrained|tts\.generate|raw\.toBlob|decodeAudioData/);
});

test('READ-ALOUD: ordinary sentences are independent neural synthesis units', () => {
  const fn = extractFunction('splitText');
  const splitText = new Function(fn + '\nreturn splitText;')();

  assert.deepEqual(
    splitText('First sentence. Second sentence? Third sentence!'),
    ['First sentence.', 'Second sentence?', 'Third sentence!'],
  );

  const long = 'alpha beta gamma delta epsilon zeta eta theta iota kappa lambda mu.';
  const pieces = splitText(long, 24);
  assert.ok(pieces.length > 1, 'one unusually long sentence should still be bounded');
  assert.ok(pieces.every((piece) => piece.length <= 24));
});

test('READ-ALOUD: neural audio cache is independent of playback speed', () => {
  const s = source();
  assert.match(s, /var MAX_AUDIO_CACHE_ITEMS = 32;/);
  assert.match(s, /while \(cache\.size > MAX_AUDIO_CACHE_ITEMS\)/);

  const key = extractFunction('key');
  assert.match(key, /voice \+ '\\u0000' \+ text/);
  assert.doesNotMatch(key, /rate|speed/);

  const worker = s.slice(s.indexOf('function kokoroWorkerMain()'), s.indexOf('var NeuralNarration ='));
  assert.match(worker, /speed: 1/);
});

test('READ-ALOUD: neural speed can change live without restarting or regenerating audio', () => {
  const s = source();
  const setRate = extractFunction('setRate');
  assert.match(setRate, /activeSource\.playbackRate\.setValueAtTime\(clampRate\(rate\), audioContext\.currentTime\)/);

  const rateHandler = s.match(/rate\.addEventListener\('input',[\s\S]*?\n    \}\);/);
  assert.ok(rateHandler, 'rate input handler must exist');
  assert.match(rateHandler[0], /NeuralNarration\.setRate\(state\.settings\.rate\)/);
  assert.doesNotMatch(rateHandler[0], /stopProviders|speakCurrent|cancel\(/,
    'moving the speed slider must not restart current narration');
});

test('READ-ALOUD: continuous reading targets bounded seconds of ready neural audio', () => {
  const s = source();
  assert.match(s, /var MAX_PREFETCH_ITEMS = 6;/);
  assert.match(s, /var READY_AUDIO_TARGET_SECONDS = 12;/);
  const prefetch = extractFunction('prefetchAhead');
  assert.match(prefetch, /texts\.length < MAX_PREFETCH_ITEMS/);
  assert.match(prefetch, /NeuralNarration\.prefetch\(texts, voice, READY_AUDIO_TARGET_SECONDS, state\.settings\.rate\)/);
  const provider = s.slice(s.indexOf('var NeuralNarration ='), s.indexOf('var SystemNarration ='));
  assert.match(provider, /readySeconds < target/);
  assert.match(provider, /audioDurationSeconds\(audio, rate\)/);
  assert.match(s, /var MAX_AUDIO_CACHE_ITEMS = 32;/);
});

test('READ-ALOUD: readable plan is semantic-block based and supports arbitrary Start here selection', () => {
  const s = source();
  const pick = extractFunction('enterPickMode');
  assert.match(s, /var READABLE_SELECTOR = 'h1,h2,h3,h4,h5,h6,p,li,blockquote,figcaption,pre,td,th';/);
  assert.match(extractFunction('buildPlan'), /readableBlocks\(\)/);
  assert.match(extractFunction('startIndexForElement'), /plan\[i\]\.element === element/);
  assert.match(pick, /setPickElement\(viewportStartElement\(\), false\)/);
  assert.match(pick, /document\.addEventListener\('pointerover'/);
  assert.match(pick, /document\.addEventListener\('click'/);
  assert.match(pick, /document\.addEventListener\('contextmenu'/,
    'explicit Start here mode should accept right-click/long-press without globally hijacking the browser context menu');
  assert.match(pick, /event\.key === 'ArrowDown' \|\| event\.key === 'ArrowRight'/);
  assert.match(pick, /event\.key === 'ArrowUp' \|\| event\.key === 'ArrowLeft'/);
  assert.match(pick, /event\.key === 'Enter' \|\| event\.key === ' '/);
  assert.match(extractFunction('movePickElement'), /readableBlocks\(\)/);
  assert.match(extractFunction('readableTarget'), /target\.closest\(READABLE_SELECTOR\)/);
  assert.match(extractFunction('jumpBlock'), /blockIndex/);
  assert.match(extractFunction('exitPickMode'), /removeEventListener\('contextmenu'/);
});

test('READ-ALOUD: source-owned narration language outranks presentation language', () => {
  const fn = extractFunction('effectiveLanguage');
  const context = {
    localStorage: { getItem() { return 'ja'; } },
    document: {
      documentElement: { getAttribute() { return 'fr'; } },
    },
  };
  const factory = new Function(
    'document',
    'localStorage',
    fn + '\nreturn effectiveLanguage;'
  );
  const effectiveLanguage = factory(context.document, context.localStorage);

  const owner = {
    getAttribute(name) {
      if (name === 'data-narration-language') return 'en';
      if (name === 'lang') return null;
      return null;
    },
  };
  const element = { closest() { return owner; } };
  assert.equal(effectiveLanguage(element), 'en');
});

test('READ-ALOUD: preferences persist across pages by primary language', () => {
  const s = source();
  assert.match(s, /var SETTINGS_KEY = 'vex-read-aloud-settings\/v1';/);
  assert.match(extractFunction('loadSettings'), /localStorage\.getItem\(SETTINGS_KEY\)/);
  assert.match(extractFunction('saveSettings'), /localStorage\.setItem\(SETTINGS_KEY/);
  assert.match(extractFunction('voiceStorageKey'), /primaryLanguage\(language\)/);
});

test('READ-ALOUD: widget mounts into Spiral when present and retains standalone fallback', () => {
  const s = source();
  assert.match(s, /getElementById\('vex-spiral-group'\)/);
  assert.match(s, /group\.appendChild\(root\)/);
  assert.match(s, /document\.body\.appendChild\(root\)/);
  assert.match(s, /orb\.className = 'vex-orb'/);
});

test('READ-ALOUD: overlay copy is owned by common string identities for all Global Core locales', () => {
  const s = source();
  const common = JSON.parse(fs.readFileSync(COMMON, 'utf8'));
  const keys = [
    'common.button.read-aloud',
    'common.button.read-aloud-start-here',
    'common.button.read-aloud-play',
    'common.button.read-aloud-pause',
    'common.button.read-aloud-stop',
    'common.button.read-aloud-previous',
    'common.button.read-aloud-next',
    'common.button.read-aloud-close',
    'common.label.read-aloud-voice',
    'common.label.read-aloud-speed',
    'common.status.read-aloud-pick',
    'common.status.read-aloud-preparing',
    'common.status.read-aloud-reading',
    'common.status.read-aloud-done',
    'common.status.read-aloud-fallback',
    'common.status.read-aloud-none',
  ];
  const langs = ['en','ja','zh','ko','fr','de','es','pt','ar','hi'];

  for (const key of keys) {
    assert.ok(common[key], key + ' must exist in common source');
    for (const lang of langs) {
      assert.ok(common[key].strings[lang] && common[key].strings[lang].text,
        key + ' must have ' + lang + ' text');
    }
    assert.ok(s.includes(key), key + ' must be consumed by the widget');
  }
});

test('READ-ALOUD: a parent surface can suppress and stop its owner while an embedded reader owns the visible document', () => {
  const s = source();
  assert.match(s, /var SUPPRESS_EVENT = 'vextreme:read-aloud-suppress';/);
  const fn = extractFunction('setSuppressed');
  assert.match(fn, /stopReading\(true\)/);
  assert.match(fn, /ui\.root\.hidden = state\.suppressed/);
  assert.match(fn, /aria-hidden/);
  assert.match(s, /window\.VEXTREME_READ_ALOUD_SUPPRESSED/);
  assert.match(s, /window\.addEventListener\(SUPPRESS_EVENT/);
});

test('READ-ALOUD: Play and Pause are one stateful transport control', () => {
  const s = source();
  assert.match(s, /var playPause = iconButton\('▶', 'common\.button\.read-aloud-play', 'Play'\)/);
  assert.doesNotMatch(s, /var pause = iconButton/);
  assert.match(s, /playPause\.button\.addEventListener\('click'/);
  assert.match(s, /state\.mode === 'playing'\) pauseReading\(\)/);
  assert.match(extractFunction('setMode'), /syncPlayPauseControl\(\)/);
  const sync = extractFunction('syncPlayPauseControl');
  assert.match(sync, /common\.button\.read-aloud-pause/);
  assert.match(sync, /common\.button\.read-aloud-play/);
});

test('READ-ALOUD: user intent prewarms Kokoro without starting narration', () => {
  const s = source();
  const warm = extractFunction('prewarmSelectedVoice');
  assert.match(warm, /NeuralNarration\.prepare\(\)/);
  const orbHandler = s.match(/orb\.addEventListener\('click',[\s\S]*?\n    \}\);/);
  assert.ok(orbHandler);
  assert.match(orbHandler[0], /prewarmSelectedVoice\(\)/);
  const voiceHandler = s.match(/voice\.addEventListener\('change',[\s\S]*?\n    \}\);/);
  assert.ok(voiceHandler);
  assert.match(voiceHandler[0], /isNeuralVoice\(selected\).*NeuralNarration\.prepare\(\)/);
});

test('READ-ALOUD: active voice changes invalidate stale system callbacks and restart with the selected voice', () => {
  const s = source();
  const system = s.slice(s.indexOf('var SystemNarration ='), s.indexOf('function isNeuralVoice'));
  assert.match(system, /generation: 0/);
  assert.match(system, /var token = \+\+this\.generation/);
  assert.match(system, /token !== SystemNarration\.generation/);
  assert.match(system, /this\.generation \+= 1/);
  const handler = s.match(/voice\.addEventListener\('change',[\s\S]*?\n    \}\);/);
  assert.ok(handler, 'voice change handler must exist');
  assert.match(handler[0], /var selected = voice\.value/);
  assert.match(handler[0], /var token = \+\+voiceSwitchGeneration/);
  assert.match(handler[0], /window\.setTimeout/);
  assert.match(handler[0], /voice\.value = selected/);
  assert.match(handler[0], /speakCurrent\(\)/);
});

test('READ-ALOUD: Kokoro fallback is transient and never rewrites the selected preference', () => {
  const s = source();
  const system = s.slice(s.indexOf('var SystemNarration ='), s.indexOf('function isNeuralVoice'));
  assert.match(system, /voiceOverride \|\| selectedSystemVoice\(language\)/);
  const fallback = extractFunction('fallbackToSystem');
  assert.match(fallback, /var fallbackVoice = voices\[0\]/);
  assert.match(fallback, /SystemNarration\.speak[\s\S]*fallbackVoice/);
  assert.doesNotMatch(fallback, /ui\.voice\.value\s*=/);
  assert.doesNotMatch(fallback, /rememberVoice\(/);
});

test('READ-ALOUD: system speech rate changes are deferred rather than restarting the current utterance', () => {
  const s = source();
  const rateHandler = s.match(/rate\.addEventListener\('input',[\s\S]*?\n    \}\);/);
  assert.ok(rateHandler);
  assert.match(rateHandler[0], /SpeechSynthesis does not reliably support mid-utterance rate mutation/);
  assert.doesNotMatch(rateHandler[0], /SystemNarration\.cancel|speechSynthesis\.cancel/);
});

// [VXG RealForever]
