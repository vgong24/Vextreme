'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.join(__dirname, '..');
const TERRAIN_PAGE = path.join(ROOT, 'pages', 'terrain-map.html');
const TERRAIN_DATA = path.join(ROOT, 'data', 'terrain-map.json');

function pageSource() {
  return fs.readFileSync(TERRAIN_PAGE, 'utf8').replace(/\r\n/g, '\n');
}

function loadSearchApi() {
  const source = pageSource();
  const match = source.match(/<script id="terrain-search-logic">([\s\S]*?)<\/script>/);
  assert.ok(match, 'Terrain search logic block must be present');
  const context = {};
  vm.createContext(context);
  vm.runInContext(match[1], context, { filename: 'terrain-search-logic.js' });
  assert.ok(context.VextremeTerrainSearch, 'Terrain search API must be published by the shipped helper');
  return context.VextremeTerrainSearch;
}

test('TERRAIN-SEARCH: repository separators and human spaces normalize to the same query', () => {
  const Search = loadSearchApi();
  assert.equal(Search.normalize('  The-Victor_Pattern/Transcript.HTML  '), 'the victor pattern transcript html');
  assert.equal(Search.normalize('victor.pattern'), 'victor pattern');
  assert.equal(Search.MIN_QUERY_LENGTH, 2);
});

test('TERRAIN-SEARCH: Victor Pattern query finds both real content nodes in useful order', () => {
  const Search = loadSearchApi();
  const data = JSON.parse(fs.readFileSync(TERRAIN_DATA, 'utf8'));
  const matches = Array.from(Search.findMatches(data.pages, 'victor pattern'), node => node.id);
  assert.deepEqual(matches, ['the-victor-pattern', 'the-victor-pattern-transcript']);

  for (const query of ['victor-pattern', 'victor_pattern', 'pattern victor', 'victor patt']) {
    assert.deepEqual(
      Array.from(Search.findMatches(data.pages, query), node => node.id),
      ['the-victor-pattern', 'the-victor-pattern-transcript'],
      query
    );
  }
});

test('TERRAIN-SEARCH: relevance prefers exact identity, then shorter phrase matches, without cross-field token leakage', () => {
  const Search = loadSearchApi();
  const nodes = [
    { id: 'the-victor-pattern-transcript', title: 'The Victor Pattern Transcript', stageName: 'Uncurated' },
    { id: 'the-victor-pattern', title: 'The Victor Pattern', stageName: 'Uncurated' },
    { id: 'the-god-pattern-recognized', title: 'The God Pattern Recognized', stageName: "Victor's Record" },
    { id: 'other', title: 'Other', role: 'Victor pattern research helper' },
  ];
  assert.deepEqual(
    Array.from(Search.findMatches(nodes, 'the victor pattern'), node => node.id),
    ['the-victor-pattern', 'the-victor-pattern-transcript']
  );
  assert.deepEqual(
    Array.from(Search.findMatches(nodes, 'victor pattern'), node => node.id),
    ['the-victor-pattern', 'the-victor-pattern-transcript', 'other']
  );
  assert.ok(!Search.findMatches(nodes, 'victor pattern').some(node => node.id === 'the-god-pattern-recognized'),
    'tokens must match within one searchable field rather than leaking across id + stage');
});

test('TERRAIN-SEARCH: cursor navigation wraps forward and backward deterministically', () => {
  const Search = loadSearchApi();
  assert.equal(Search.nextIndex(2, -1, 1), 0);
  assert.equal(Search.nextIndex(2, 0, 1), 1);
  assert.equal(Search.nextIndex(2, 1, 1), 0);
  assert.equal(Search.nextIndex(2, -1, -1), 1);
  assert.equal(Search.nextIndex(2, 0, -1), 1);
  assert.equal(Search.nextIndex(0, -1, 1), -1);
});

test('TERRAIN-SEARCH: page exposes result status, explicit navigation, keyboard cycling, and shared match highlighting', () => {
  const source = pageSource();
  assert.match(source, /id="searchStatus"[^>]*role="status"[^>]*aria-live="polite"/);
  assert.match(source, /id="searchPrev"[\s\S]*Previous search result/);
  assert.match(source, /id="searchNext"[\s\S]*Next search result/);
  assert.match(source, /TerrainSearch\.findMatches\(ALL, query\)/);
  assert.match(source, /TerrainSearch\.nextIndex\(searchState\.matches\.length, searchState\.cursor, direction\)/);
  assert.match(source, /travelSearch\(ev\.shiftKey \? -1 : 1\)/);
  assert.match(source, /searchMatchIds\.has\(id\)/);
  assert.match(source, /var showLabel = matched \|\| \(!receded/);
  assert.doesNotMatch(source, /var match = ALL\.find/);
});

// [VXG RealForever]
