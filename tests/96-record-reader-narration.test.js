'use strict';

/**
 * RETURNING-SCORPIONS-READER-NARRATION
 *
 * Focused regression for the first page-local ReaderNarration provider boundary.
 *
 * This does not promote one reader into shared runtime infrastructure. It protects
 * the concrete boundary earned by PR #355:
 *
 *   reader semantics -> ReaderNarration
 *     -> KokoroNarrationProvider -> one page-local Worker -> pinned kokoro-js/model mechanics
 *     -> BrowserSpeechNarrationProvider -> Web Speech fallback mechanics
 *
 * and confirms browser-created reader controls receive their text from the
 * page-local string authority rather than duplicate English literals in JS.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.join(__dirname, '..');
const PAGE_PATH = path.join(ROOT, 'pages', 'returning-scorpions-to-god.html');
const STRINGS_PATH = path.join(
  ROOT,
  'data',
  'strings',
  'source',
  'pages',
  'returning-scorpions-to-god.json',
);

function readPage() {
  return fs.readFileSync(PAGE_PATH, 'utf8');
}

function readStrings() {
  return JSON.parse(fs.readFileSync(STRINGS_PATH, 'utf8'));
}

function inlineReaderScript(page) {
  const start = page.indexOf("<script>\n(function(){");
  const end = page.indexOf('</script>', start);
  assert.notEqual(start, -1, 'reader inline script start must exist');
  assert.notEqual(end, -1, 'reader inline script end must exist');
  return page.slice(start, end);
}

function providerBlock(script, declaration, endAnchor) {
  const start = script.indexOf(declaration);
  const end = script.indexOf(endAnchor, start);
  assert.notEqual(start, -1, declaration + ' must exist');
  assert.notEqual(end, -1, endAnchor + ' must exist');
  return {
    provider: script.slice(start, end),
    outside: script.slice(0, start) + script.slice(end),
  };
}

function extractFunction(script, name) {
  const marker = `function ${name}(`;
  const start = script.indexOf(marker);
  assert.notEqual(start, -1, `${name} must exist`);

  const bodyStart = script.indexOf('{', start);
  assert.notEqual(bodyStart, -1, `${name} body must exist`);

  let depth = 0;
  let quote = null;
  let escaped = false;
  for (let i = bodyStart; i < script.length; i += 1) {
    const ch = script[i];

    if (quote) {
      if (escaped) {
        escaped = false;
      } else if (ch === '\\') {
        escaped = true;
      } else if (ch === quote) {
        quote = null;
      }
      continue;
    }

    if (ch === "'" || ch === '"' || ch === '`') {
      quote = ch;
      continue;
    }

    if (ch === '{') depth += 1;
    if (ch === '}') {
      depth -= 1;
      if (depth === 0) return script.slice(start, i + 1);
    }
  }

  assert.fail(`${name} closing brace must exist`);
}

const CONTROL_STRINGS = [
  ['pages.returning-scorpions-to-god.reader.auto-scroll.start-aria', 'rs-auto-start-aria-template', 'Start automatic transcript scrolling'],
  ['pages.returning-scorpions-to-god.reader.auto-scroll.pause-aria', 'rs-auto-pause-aria-template', 'Pause automatic transcript scrolling'],
  ['pages.returning-scorpions-to-god.reader.auto-scroll.start-title', 'rs-auto-start-title-template', 'Start auto-scroll'],
  ['pages.returning-scorpions-to-god.reader.auto-scroll.pause-title', 'rs-auto-pause-title-template', 'Pause auto-scroll'],
  ['pages.returning-scorpions-to-god.reader.auto-scroll.speed', 'rs-auto-speed-template', 'Automatic transcript scroll speed'],
  ['pages.returning-scorpions-to-god.reader.auto-scroll.speed-title', 'rs-auto-speed-title-template', 'Automatic scroll speed'],
  ['pages.returning-scorpions-to-god.reader.narration.read-aria', 'rs-narration-read-aria-template', 'Read transcript aloud'],
  ['pages.returning-scorpions-to-god.reader.narration.pause-aria', 'rs-narration-pause-aria-template', 'Pause transcript narration'],
  ['pages.returning-scorpions-to-god.reader.narration.resume-aria', 'rs-narration-resume-aria-template', 'Resume transcript narration'],
  ['pages.returning-scorpions-to-god.reader.narration.read-title', 'rs-narration-read-title-template', 'Read aloud'],
  ['pages.returning-scorpions-to-god.reader.narration.pause-title', 'rs-narration-pause-title-template', 'Pause read aloud'],
  ['pages.returning-scorpions-to-god.reader.narration.resume-title', 'rs-narration-resume-title-template', 'Resume read aloud'],
  ['pages.returning-scorpions-to-god.reader.narration.voice', 'rs-narration-voice-template', 'Narration voice'],
  ['pages.returning-scorpions-to-god.reader.narration.speed', 'rs-narration-speed-template', 'Narration speed'],
  ['pages.returning-scorpions-to-god.reader.narration.best-available', 'rs-narration-best-template', 'Best available'],
  ['pages.returning-scorpions-to-god.reader.narration.system-voice', 'rs-narration-system-template', 'System voice'],
  ['pages.returning-scorpions-to-god.reader.narration.neural-group', 'rs-narration-neural-group-template', 'High-quality neural voices'],
  ['pages.returning-scorpions-to-god.reader.narration.system-group', 'rs-narration-system-group-template', 'System voices'],
  ['pages.returning-scorpions-to-god.reader.narration.preparing', 'rs-narration-preparing-template', 'Preparing high-quality voice…'],
  ['pages.returning-scorpions-to-god.reader.narration.fallback', 'rs-narration-fallback-template', 'High-quality voice unavailable; using system speech.'],
];

test('READER-NARRATION: neural preparation and inference stay off the reader UI thread', () => {
  const script = inlineReaderScript(readPage());
  const browser = providerBlock(script, 'var BrowserSpeechNarrationProvider=', 'function kokoroNarrationWorkerMain()');
  const worker = providerBlock(script, 'function kokoroNarrationWorkerMain()', 'var KokoroNarrationProvider=');
  const kokoro = providerBlock(script, 'var KokoroNarrationProvider=', 'var transcriptSpeechRate=1;');

  for (const operation of ['speak', 'pause', 'resume', 'cancel']) {
    assert.ok(
      browser.provider.includes(`window.speechSynthesis.${operation}(`),
      `browser provider must directly implement ${operation}`,
    );
  }

  assert.doesNotMatch(browser.outside, /window\.speechSynthesis/,
    'reader code outside BrowserSpeechNarrationProvider must not reach Web Speech directly');
  assert.doesNotMatch(browser.outside, /new SpeechSynthesisUtterance/,
    'utterance construction belongs to BrowserSpeechNarrationProvider');

  assert.match(worker.provider, /import\(KOKORO_MODULE_URL\)/);
  assert.match(worker.provider, /from_pretrained\(KOKORO_MODEL_ID,\{dtype:'q8',device:'wasm'\}\)/);
  assert.match(worker.provider, /var raw=await tts\.generate/);
  assert.match(worker.provider, /var samples=raw\.data/);
  assert.match(worker.provider, /\[samples\.buffer\]/,
    'worker must transfer generated PCM ownership instead of WAV round-tripping');

  assert.match(kokoro.provider, /new Worker\(workerUrl,\{type:'module'/);
  assert.match(kokoro.provider, /buffer\.copyToChannel\(samples,0\)/);
  assert.doesNotMatch(kokoro.provider, /from_pretrained|tts\.generate|raw\.toBlob|decodeAudioData/,
    'model preparation/inference and WAV encoding/decoding must not run on the page thread');

  assert.doesNotMatch(
    extractFunction(script, 'readerNarrationCapabilities'),
    /ensureWorker|from_pretrained|import\(/,
    'page-load capability inspection must remain cheap and must not prepare the neural model',
  );

  for (const functionName of [
    'speakTranscriptSegment',
    'cancelTranscriptSpeech',
    'startTranscriptSpeech',
    'pauseTranscriptSpeech',
    'resumeTranscriptSpeech',
  ]) {
    const fn = extractFunction(script, functionName);
    assert.match(fn, /ReaderNarration\./, `${functionName} must route through ReaderNarration`);
    assert.doesNotMatch(fn, /BrowserSpeechNarrationProvider\.|KokoroNarrationProvider\./,
      `${functionName} must not bypass ReaderNarration`);
  }
});

test('READER-NARRATION: queueing is bounded and prepared audio is reused within the page session', () => {
  const script = inlineReaderScript(readPage());

  assert.match(script, /var MAX_NARRATION_AUDIO_CACHE_ITEMS=24/);
  assert.match(script, /var NARRATION_LOOKAHEAD=2/);
  assert.match(script, /audioCache=new Map\(\)/);
  assert.match(script, /while\(audioCache\.size>MAX_NARRATION_AUDIO_CACHE_ITEMS\)/);
  assert.match(script, /function prefetchTranscriptSpeech\(section\)/);
  assert.match(script, /texts\.length<NARRATION_LOOKAHEAD/);
  assert.match(script, /ReaderNarration\.prefetch\(texts\)/);
  assert.match(script, /section\._rsSpeech\.segments=collectTranscriptSpeechSegments\(section\)/,
    'segment plan should be calculated when the transcript finishes loading');
  assert.doesNotMatch(
    extractFunction(script, 'finishTranscriptSpeech'),
    /a\.segments=\[\]/,
    'finishing playback must retain the precomputed narration plan for replay',
  );
  assert.match(script, /workerGeneration\+=1/,
    'cancel must invalidate stale queued worker jobs without discarding the prepared model');
});

test('READER-NARRATION: curated voice catalog is small and narration language follows source ownership', () => {
  const page = readPage();
  const script = inlineReaderScript(page);

  assert.match(page, /data-reader-template="conversation-witness-reader\/v1" data-narration-language="en"/);
  assert.match(script, /var MAX_SYSTEM_NARRATION_VOICES=4/);

  const curated = [...script.matchAll(/\{id:'([^']+)',name:'([^']+)',language:'([^']+)',gender:'([^']+)'/g)]
    .map((match) => ({ id: match[1], name: match[2], language: match[3], gender: match[4] }));
  assert.deepEqual(
    curated.map((voice) => voice.name),
    ['Heart', 'Bella', 'Fenrir', 'Michael'],
    'English neural catalog should expose four intentional choices',
  );
  assert.equal(curated.filter((voice) => voice.gender === 'Female').length, 2);
  assert.equal(curated.filter((voice) => voice.gender === 'Male').length, 2);
  assert.doesNotMatch(script, /name:'Nicole'|name:'Emma'/);

  const languageFunction = extractFunction(script, 'transcriptSpeechLanguage');
  const context = {
    document: {
      querySelector() { return { dataset: { narrationLanguage: 'en' } }; },
      documentElement: { getAttribute() { return 'fr'; } },
    },
  };
  vm.runInNewContext(`${languageFunction}\nresult=transcriptSpeechLanguage();`, context);
  assert.equal(context.result, 'en',
    'preserved English transcript narration must not change voice language merely because the FAB changes UI language');

  assert.match(extractFunction(script, 'transcriptSpeechVoices'), /\.slice\(0,MAX_SYSTEM_NARRATION_VOICES\)/,
    'system voice inventory must stay bounded');
});

test('READER-NARRATION: voice or rate changes stop stale queued neural work', () => {
  const script = inlineReaderScript(readPage());
  assert.match(
    script,
    /voice\.addEventListener\('change',function\(\)\{if\(section\._rsSpeech&&section\._rsSpeech\.state!=='idle'\)cancelTranscriptSpeech\(section\);updateTranscriptSpeechVoice/,
  );
  assert.match(
    script,
    /speechRate\.addEventListener\('input',function\(\)\{if\(section\._rsSpeech&&section\._rsSpeech\.state!=='idle'\)cancelTranscriptSpeech\(section\);updateTranscriptSpeechRate/,
  );
});

test('READER-NARRATION: Kokoro remains pinned and system speech remains the fail-closed fallback', () => {
  const script = inlineReaderScript(readPage());

  assert.match(script, /kokoro-js@1\.2\.1\/\+esm/);
  assert.match(script, /onnx-community\/Kokoro-82M-v1\.0-ONNX/);
  assert.match(script, /execution:'worker-wasm-q8'/);
  assert.match(
    script,
    /transcriptSpeechVoiceURI=TRANSCRIPT_SPEECH_BEST;populateTranscriptSpeechVoices\(\).*ReaderNarration\.speakWithBrowser/,
    'neural failure must latch the remaining reading to bounded browser speech',
  );
});

test('READER-NARRATION: dynamic control copy is owned by page-local string identities', () => {
  const page = readPage();
  const script = inlineReaderScript(page);
  const strings = readStrings();

  for (const [key, id, english] of CONTROL_STRINGS) {
    assert.equal(
      strings[key] && strings[key].strings && strings[key].strings.en && strings[key].strings.en.text,
      english,
      `${key} must own its EN/source text`,
    );

    const expectedBinding = `id="${id}" data-i18n="${key}">${english}</span>`;
    assert.ok(
      page.includes(expectedBinding),
      `${key} must have one translated DOM source node`,
    );

    assert.equal(
      script.includes(english),
      false,
      `${english} must not be duplicated as a JS display literal`,
    );
  }
});

test('READER-NARRATION: Best available prefers same-language quality/local voices deterministically', () => {
  const script = inlineReaderScript(readPage());
  const languageFunction = extractFunction(script, 'transcriptSpeechLanguage');
  const scoreFunction = extractFunction(script, 'transcriptSpeechVoiceScore');

  const context = {
    document: {
      querySelector() {
        return { dataset: { narrationLanguage: 'en-US' } };
      },
      documentElement: {
        getAttribute(name) {
          return name === 'lang' ? 'fr' : null;
        },
      },
    },
  };

  vm.runInNewContext(
    `${languageFunction}\n${scoreFunction}\nresult = {
      premiumExact: transcriptSpeechVoiceScore({name:'Ava Premium',lang:'en-US',localService:true,default:false}),
      localExact: transcriptSpeechVoiceScore({name:'Local Voice',lang:'en-US',localService:true,default:false}),
      defaultExact: transcriptSpeechVoiceScore({name:'Default Voice',lang:'en-US',localService:false,default:true}),
      localPrimary: transcriptSpeechVoiceScore({name:'Local GB',lang:'en-GB',localService:true,default:false}),
      foreignPremium: transcriptSpeechVoiceScore({name:'Premium FR',lang:'fr-FR',localService:true,default:true})
    };`,
    context,
  );

  assert.ok(context.result.premiumExact > context.result.localExact);
  assert.ok(context.result.localExact > context.result.defaultExact);
  assert.ok(context.result.defaultExact > context.result.localPrimary);
  assert.ok(context.result.localPrimary > context.result.foreignPremium);

  assert.match(
    script,
    /var TRANSCRIPT_SPEECH_BEST=BROWSER_VOICE_PREFIX\+'best'/,
    'Best available remains the browser-native fallback choice',
  );
});

// [VXG RealForever]
