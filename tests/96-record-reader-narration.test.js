'use strict';

/**
 * RETURNING-SCORPIONS-READER-NARRATION
 *
 * Focused regression for the first page-local ReaderNarration provider boundary.
 *
 * This does not promote one reader into shared runtime infrastructure. It protects
 * the concrete boundary earned by PR #355:
 *
 *   reader semantics -> BrowserSpeechNarrationProvider -> Web Speech mechanics
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

function providerBlock(script) {
  const start = script.indexOf('var BrowserSpeechNarrationProvider=');
  const end = script.indexOf('var TRANSCRIPT_SPEECH_BEST=', start);
  assert.notEqual(start, -1, 'BrowserSpeechNarrationProvider must exist');
  assert.notEqual(end, -1, 'provider end anchor must exist');
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
];

test('READER-NARRATION: Web Speech mechanics stay inside BrowserSpeechNarrationProvider', () => {
  const script = inlineReaderScript(readPage());
  const { provider, outside } = providerBlock(script);

  for (const operation of ['speak', 'pause', 'resume', 'cancel']) {
    assert.match(
      provider,
      new RegExp(`window\\.speechSynthesis\\.${operation}\\(`),
      `provider must directly implement ${operation}`,
    );
    assert.doesNotMatch(
      provider,
      new RegExp(`BrowserSpeechNarrationProvider\\.${operation}\\(`),
      `provider ${operation} must not recurse through itself`,
    );
    assert.match(
      outside,
      new RegExp(`BrowserSpeechNarrationProvider\\.${operation}\\(`),
      `reader must route ${operation} through the provider`,
    );
  }

  assert.doesNotMatch(
    outside,
    /window\.speechSynthesis/,
    'reader code outside the provider must not reach Web Speech directly',
  );
  assert.doesNotMatch(
    outside,
    /new SpeechSynthesisUtterance/,
    'utterance construction belongs to the provider mechanics',
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
      documentElement: {
        getAttribute(name) {
          return name === 'lang' ? 'en-US' : null;
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
    /transcriptSpeechVoiceURI=TRANSCRIPT_SPEECH_BEST/,
    'Best available must remain the browser-native default',
  );
});

// [VXG RealForever]
