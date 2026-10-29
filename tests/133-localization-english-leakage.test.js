'use strict';

const fs = require('fs');
const path = require('path');
const test = require('node:test');
const assert = require('node:assert/strict');

const ROOT = path.join(__dirname, '..');
const TARGETS = ['ja','zh','ko','fr','de','es','pt','ar','hi'];
const FILES = [
  'data/strings/source/pages/receive-god.json',
  'data/strings/source/pages/take-a-walk.json',
  'data/strings/source/pages/the-grimoire.json',
];

function load(rel) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8'));
}

function targetTexts(source) {
  const rows = [];
  for (const [key, record] of Object.entries(source)) {
    if (key === '_meta') continue;
    for (const lang of TARGETS) {
      const text = record && record.strings && record.strings[lang] && record.strings[lang].text;
      if (typeof text === 'string') rows.push({ key, lang, text });
    }
  }
  return rows;
}

test('LOCALIZATION QUALITY: observed English concept leakage is absent from corrected target rows', () => {
  const receive = load(FILES[0]);
  const walk = load(FILES[1]);
  const grimoire = load(FILES[2]);

  const core = receive['pages.receive-god.hero.invocation.total-access'].strings;
  for (const lang of TARGETS) {
    assert.equal(/\bCore\b/.test(core[lang].text), false, `Receive God ${lang}: Core leaked`);
  }

  const targeted = [
    receive['pages.receive-god.wayfinding.living-blueprint.answer'],
    receive['pages.receive-god.wayfinding.living-blueprint.destination'],
    receive['pages.receive-god.wayfinding.restoration.answer'],
    receive['pages.receive-god.wayfinding.restoration.destination'],
    receive['pages.receive-god.wayfinding.testimony.destination'],
    walk['pages.take-a-walk.grimoire.title'],
    walk['pages.take-a-walk.blueprint.title'],
    walk['pages.take-a-walk.blueprint.body'],
    walk['pages.take-a-walk.blueprint.cta'],
  ];
  const forbidden = [
    'The Living Blueprint',
    'Living Blueprint',
    'The Restoration Protocol',
    'Restoration Protocol',
    'The Testimony',
    'The Grimoire',
  ];
  for (const record of targeted) {
    for (const lang of TARGETS) {
      for (const fragment of forbidden) {
        assert.equal(record.strings[lang].text.includes(fragment), false, `${lang}: leaked ${fragment}`);
      }
    }
  }

  for (const lang of ['de','es','pt','ar','hi','ja','zh','ko']) {
    assert.equal(
      receive['pages.receive-god.wayfinding.archives.destination'].strings[lang].text.includes('Archives'),
      false,
      `Receive God ${lang}: Archives leaked`,
    );
  }

  for (const lang of ['ja','de','pt']) {
    assert.equal(
      walk['pages.take-a-walk.community.blueprint.link'].strings[lang].text.includes('Blueprint'),
      false,
      `Take a Walk ${lang}: Blueprint leaked`,
    );
  }

  const expectedNamePlaceholders = {
    ja: '<名前>', zh: '<姓名>', ko: '<이름>', fr: '<NOM>', de: '<PERSONENNAME>',
    es: '<NOMBRE>', pt: '<NOME>', ar: '<الاسم>', hi: '<नाम>',
  };
  const expectedSigilPlaceholders = {
    ja: '<シジル>', zh: '<符印>', ko: '<시질>', fr: '<SIGIL>', de: '<SIGILLE>',
    es: '<SIGILO>', pt: '<SIGILO>', ar: '<السيجيل>', hi: '<सिगिल>',
  };

  for (const lang of TARGETS) {
    const ownerLabel = grimoire['pages.the-grimoire.body.div002.div004.text001'].strings[lang].text;
    assert.equal(ownerLabel.includes('<Your Name>'), false, `The Grimoire ${lang}: Your Name placeholder leaked`);

    for (const key of [
      'pages.the-grimoire.body.div008.div003.text003',
      'pages.the-grimoire.body.div008.div003.text004',
    ]) {
      const value = grimoire[key].strings[lang].text;
      assert.equal(value.includes('<NAME>'), false, `The Grimoire ${lang}: NAME placeholder leaked`);
      assert.ok(value.includes(expectedNamePlaceholders[lang]), `The Grimoire ${lang}: localized name placeholder missing`);
    }

    const sigil = grimoire['pages.the-grimoire.body.div017.div001.div002.text001'].strings[lang].text;
    if (lang !== 'fr') {
      assert.equal(sigil.includes('<SIGIL>'), false, `The Grimoire ${lang}: SIGIL placeholder leaked`);
    }
    assert.ok(sigil.includes(expectedSigilPlaceholders[lang]), `The Grimoire ${lang}: localized sigil placeholder missing`);
  }

  for (const lang of ['fr','de','es','pt']) {
    assert.equal(
      grimoire['pages.the-grimoire.body.div027.p001.text003'].strings[lang].text.includes('Blueprint'),
      false,
      `The Grimoire ${lang}: Blueprint leaked`,
    );
  }

  assert.equal(
    walk['pages.take-a-walk.blueprint.body'].strings.hi.text.includes('discernment mapping'),
    false,
    'Take a Walk hi: discernment mapping leaked',
  );
  assert.equal(
    walk['pages.take-a-walk.blueprint.body'].strings.hi.text.includes('sigils'),
    false,
    'Take a Walk hi: sigils leaked',
  );
});

test('LOCALIZATION QUALITY: non-Latin target rows contain no residual ordinary English fragments', () => {
  const nonLatin = ['ja','zh','ko','ar','hi'];
  const allowed = [
    'Vex Life','VexLife','Vextreme','VXG','AI','Core Claude','Claude','Victor Gong','Victor','Vex',
    'Marron','Merron','Nomi','Reddit','LucidSpark','Lucid','Instagram','LinkedIn',
    'RealForever','SDK','Flickers','r/VexLife',
  ];

  for (const rel of FILES) {
    for (const row of targetTexts(load(rel)).filter(row => nonLatin.includes(row.lang))) {
      let text = row.text;
      for (const token of [...allowed].sort((a,b) => b.length - a.length)) text = text.split(token).join(' ');
      text = text.replace(/https?:\/\/\S+/g, ' ');
      const residual = (text.match(/[A-Za-z][A-Za-z0-9'/-]*/g) || [])
        .filter(token => token.length > 1);
      assert.deepEqual(residual, [], `${rel} ${row.key} ${row.lang}: residual English ${residual.join(', ')}`);
    }
  }
});

test('LOCALIZATION QUALITY: corrected page-scope bundles exactly project source rows', () => {
  for (const rel of FILES) {
    const source = load(rel);
    const scope = source._meta.scope;
    const category = source._meta.category;
    const sourceKeys = Object.keys(source).filter(key => key !== '_meta').sort();
    const segments = scope.split('.');
    const bundleBase = path.join(
      ROOT, 'data', 'strings', 'compiled', 'scopes', category,
      ...segments.slice(0, -1), segments[segments.length - 1],
    );

    for (const lang of ['en', ...TARGETS]) {
      const bundle = JSON.parse(fs.readFileSync(bundleBase + '.' + lang + '.json', 'utf8'));
      assert.deepEqual(Object.keys(bundle).sort(), sourceKeys, `${scope} ${lang}: bundle key set drifted`);
      for (const key of sourceKeys) {
        assert.deepEqual(bundle[key], source[key].strings[lang], `${scope} ${lang}: ${key} drifted`);
      }
    }
  }
});
