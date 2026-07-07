'use strict';

/**
 * LATTICE HEADERS — tests/11-lattice-headers.test.js
 *
 * Tests for lib/build-lattice-headers.js (LATTICE header generator).
 *
 * Test order:
 *   1. isEligibleNode — filters .json / generated-artifact / dist/ nodes
 *   2. buildLatticeBlockLines — generates correct comment-prefixed lines
 *   3. detectPrefix — reads comment style from an existing marker line
 *   4. injectLatticeBlock — replace / insert / no-doc-comment modes
 *   5. Integration — regenerating from the real docs/lattice-map.json produces zero drift
 */

const { test } = require('node:test');
const assert    = require('node:assert/strict');
const fs        = require('fs');
const path      = require('path');
const { execFileSync } = require('child_process');

const {
  isEligibleNode,
  buildLatticeBlockLines,
  injectLatticeBlock,
  detectPrefix,
  sanitizeForComment,
  findLineStartDocComment,
  detectLineEnding,
} = require('../lib/build-lattice-headers');

const ROOT = path.join(__dirname, '..');

// ── 1. isEligibleNode ────────────────────────────────────────────────────────

test('LATTICE-HEADERS: eligible for a plain lib .js file', () => {
  assert.equal(isEligibleNode('lib/vex-config.js'), true);
});

test('LATTICE-HEADERS: not eligible for .json nodes (no comments)', () => {
  assert.equal(isEligibleNode('data/nodes.json'), false);
  assert.equal(isEligibleNode('blueprint.json'), false);
});

test('LATTICE-HEADERS: not eligible for sw.js (generated artifact)', () => {
  assert.equal(isEligibleNode('sw.js'), false);
});

test('LATTICE-HEADERS: not eligible for anything under dist/', () => {
  assert.equal(isEligibleNode('dist/vextreme-foo.js'), false);
});

// ── 2. buildLatticeBlockLines ─────────────────────────────────────────────────

const SAMPLE_NODE = {
  role: 'sample role',
  reads: ['a.js', 'b.js'],
  writes: ['c.json'],
  loadedBy: ['d.js'],
  testedBy: [],
  changeMap: {
    'thing changed': ['e.js', 'f.js'],
  },
};

test('LATTICE-HEADERS: block starts and ends with markers', () => {
  const lines = buildLatticeBlockLines(SAMPLE_NODE, ' * ');
  assert.match(lines[0], /^ \* LATTICE:BEGIN/);
  assert.equal(lines[lines.length - 1], ' * LATTICE:END');
});

test('LATTICE-HEADERS: multi-item fields wrap one item per line', () => {
  const lines = buildLatticeBlockLines(SAMPLE_NODE, ' * ');
  assert.ok(lines.some(l => l.includes('reads') && l.includes('a.js')), 'first reads item on the labeled line');
  assert.ok(lines.some(l => l.includes('b.js') && !l.includes('a.js')), 'second reads item wraps to its own continuation line');
});

test('LATTICE-HEADERS: empty array field renders (none)', () => {
  const lines = buildLatticeBlockLines(SAMPLE_NODE, ' * ');
  assert.ok(lines.some(l => l.includes('tested-by') && l.includes('(none)')));
});

test('LATTICE-HEADERS: changeMap trigger and targets both present', () => {
  const lines = buildLatticeBlockLines(SAMPLE_NODE, ' * ');
  assert.ok(lines.some(l => l.includes('thing changed:')));
  assert.ok(lines.some(l => l.includes('- e.js')));
  assert.ok(lines.some(l => l.includes('- f.js')));
});

test('LATTICE-HEADERS: respects a // line-comment prefix', () => {
  const lines = buildLatticeBlockLines(SAMPLE_NODE, '// ');
  // blank separator lines are trimEnd()'d (no trailing whitespace), so check
  // the '//' prefix itself rather than the full '// ' including trailing space.
  assert.ok(lines.every(l => l.startsWith('//')), 'every line uses // comment style, none use block-comment *');
  assert.ok(lines.every(l => !l.startsWith(' * ')), 'no line uses the block-comment prefix');
});

// ── 2b. sanitizeForComment — regression coverage for two self-corruption bugs ──

test('LATTICE-HEADERS: sanitizeForComment breaks */ so it cannot close a block comment', () => {
  const out = sanitizeForComment('a glob like scopes/**/*.en.json');
  assert.ok(!out.includes('*/'), `expected no literal */ in: ${out}`);
});

test('LATTICE-HEADERS: sanitizeForComment breaks /* so it cannot open a nested block comment', () => {
  const out = sanitizeForComment('inline /* comment */ inside a value');
  assert.ok(!out.includes('/*'), `expected no literal /* in: ${out}`);
});

test('LATTICE-HEADERS: sanitizeForComment breaks literal marker strings so they cannot be found by the next regeneration pass', () => {
  const out = sanitizeForComment('writes the LATTICE:BEGIN..LATTICE:END block');
  assert.ok(!out.includes('LATTICE:BEGIN'), `expected sanitized BEGIN marker, got: ${out}`);
  assert.ok(!out.includes('LATTICE:END'), `expected sanitized END marker, got: ${out}`);
});

test('LATTICE-HEADERS: a node whose own content mentions the marker strings regenerates without duplicating the block (regression)', () => {
  // This node describes itself, the way lib/build-lattice-headers.js's own
  // lattice-map.json entry legitimately needs to say "writes the LATTICE:BEGIN
  // .. LATTICE:END block" — without sanitization this used to make the next
  // regeneration pass find that prose mention instead of the real closing
  // marker, truncate the replacement there, and leave a duplicate orphaned
  // copy of the old block sitting after it.
  const selfDescribingNode = {
    role: 'self-describing tool',
    reads: [],
    writes: ['the LATTICE:BEGIN..LATTICE:END block in every eligible file'],
    loadedBy: [],
    testedBy: [],
    changeMap: { 'LATTICE:BEGIN/LATTICE:END marker text changed': ['grep for LATTICE:BEGIN'] },
  };
  const source = ['/**', ' * A file.', ' */', '', 'code();'].join('\n');
  const first  = injectLatticeBlock(source, selfDescribingNode);
  const second = injectLatticeBlock(first.content, selfDescribingNode);
  assert.equal(second.content, first.content, 're-running on already-generated output must not change it');
  // exactly one BEGIN and one END sentinel line should exist in the output
  const beginCount = (first.content.match(/^ \* LATTICE:BEGIN —/m) || []).length;
  const endCount   = (first.content.match(/^ \* LATTICE:END$/m) || []).length;
  assert.equal(beginCount, 1, 'exactly one real opening sentinel line');
  assert.equal(endCount, 1, 'exactly one real closing sentinel line');
});

// ── 3. detectPrefix ────────────────────────────────────────────────────────────

test('LATTICE-HEADERS: detects block-comment prefix', () => {
  const source = 'foo\n * LATTICE:BEGIN blah\n * LATTICE:END\nbar';
  assert.equal(detectPrefix(source), ' * ');
});

test('LATTICE-HEADERS: detects line-comment prefix', () => {
  const source = 'foo\n// LATTICE:BEGIN blah\n// LATTICE:END\nbar';
  assert.equal(detectPrefix(source), '// ');
});

test('LATTICE-HEADERS: returns null when no marker present', () => {
  assert.equal(detectPrefix('no markers here'), null);
});

// ── 4. injectLatticeBlock ───────────────────────────────────────────────────────

test('LATTICE-HEADERS: replaces existing marker block, preserving prefix style', () => {
  const source = [
    '/**',
    ' * Some file.',
    ' * LATTICE:BEGIN old stuff here',
    ' *   role : old',
    ' * LATTICE:END',
    ' */',
    '',
    'code();',
  ].join('\n');
  const { content, mode } = injectLatticeBlock(source, SAMPLE_NODE);
  assert.equal(mode, 'replaced');
  assert.ok(content.includes('sample role'));
  assert.ok(!content.includes('role : old'));
  assert.ok(content.includes('code();'), 'rest of file untouched');
});

test('LATTICE-HEADERS: inserts before closing */ when no markers exist', () => {
  const source = [
    '/**',
    ' * Some file with no LATTICE block yet.',
    ' */',
    '',
    'code();',
  ].join('\n');
  const { content, mode } = injectLatticeBlock(source, SAMPLE_NODE);
  assert.equal(mode, 'inserted');
  assert.ok(content.includes('LATTICE:BEGIN'));
  assert.ok(content.indexOf('LATTICE:BEGIN') < content.indexOf('*/'));
  assert.ok(content.includes('code();'));
});

test('LATTICE-HEADERS: no-doc-comment mode leaves file untouched', () => {
  const source = 'code();\n// no top doc comment here\n';
  const { content, mode } = injectLatticeBlock(source, SAMPLE_NODE);
  assert.equal(mode, 'no-doc-comment');
  assert.equal(content, source);
});

test('LATTICE-HEADERS: a literal /** substring inside a // comment is not mistaken for a real doc comment (regression)', () => {
  // This happened for real: lib/logger-codes.js had a // comment describing
  // "no top /** */ block to anchor a header in" — a plain indexOf('/**')
  // found that mid-line substring, then found the '*/' a few characters
  // later in the same short comment, and inserted the generated block
  // between them, corrupting a JS object literal.
  const source = [
    "'use strict';",
    '',
    '// A comment that happens to mention /** */ syntax without meaning it.',
    '',
    'const CODES = { FOO: 1 };',
  ].join('\n');
  const { content, mode } = injectLatticeBlock(source, SAMPLE_NODE);
  assert.equal(mode, 'no-doc-comment', 'must not treat the mid-line /** */ substring as a real doc comment');
  assert.equal(content, source);
});

test('LATTICE-HEADERS: a real multi-line doc comment further down the file (not at position 0) is still found', () => {
  const source = [
    '// leading line comment, not a doc comment',
    '/**',
    ' * A real doc comment.',
    ' */',
    'code();',
  ].join('\n');
  const { mode } = injectLatticeBlock(source, SAMPLE_NODE);
  assert.equal(mode, 'inserted');
});

test('LATTICE-HEADERS: findLineStartDocComment ignores a /** substring that does not start its line', () => {
  const source = "// see /** */ for details\ncode();";
  assert.equal(findLineStartDocComment(source), -1);
});

test('LATTICE-HEADERS: findLineStartDocComment finds a /** that does start its line', () => {
  const source = "text\n/**\n * doc\n */\ncode();";
  assert.equal(findLineStartDocComment(source), source.indexOf('/**'));
});

test('LATTICE-HEADERS: re-injecting into already-generated output is idempotent', () => {
  const source = [
    '/**',
    ' * Some file.',
    ' */',
    '',
    'code();',
  ].join('\n');
  const first  = injectLatticeBlock(source, SAMPLE_NODE);
  const second = injectLatticeBlock(first.content, SAMPLE_NODE);
  assert.equal(second.mode, 'replaced');
  assert.equal(second.content, first.content);
});

test('LATTICE-HEADERS: replacing an existing CRLF file preserves CRLF line endings', () => {
  const source = [
    '/**',
    ' * Some file.',
    ' * LATTICE:BEGIN old stuff here',
    ' *   role : old',
    ' * LATTICE:END',
    ' */',
    '',
    'code();',
  ].join('\r\n');
  const { content, mode } = injectLatticeBlock(source, SAMPLE_NODE);
  assert.equal(mode, 'replaced');
  assert.equal(detectLineEnding(content), '\r\n');
  assert.equal((content.match(/(?<!\r)\n/g) || []).length, 0, 'must not introduce bare LF into a CRLF file');
});

// ── 5. Integration — real repo has zero drift ───────────────────────────────────

test('LATTICE-HEADERS: node lib/build-lattice-headers.js --check reports zero drift', () => {
  const out = execFileSync('node', ['lib/build-lattice-headers.js', '--check'], { cwd: ROOT, encoding: 'utf8' });
  assert.match(out, /drift\s*:\s*0/, `expected zero drift, got:\n${out}`);
});

test('LATTICE-HEADERS: every eligible lattice-map.json node file contains both markers', () => {
  const map = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs', 'lattice-map.json'), 'utf8'));
  for (const file of Object.keys(map.nodes)) {
    if (!isEligibleNode(file)) continue;
    const filePath = path.join(ROOT, file);
    if (!fs.existsSync(filePath)) continue;
    const source = fs.readFileSync(filePath, 'utf8');
    assert.ok(source.includes('LATTICE:BEGIN'), `${file} missing LATTICE:BEGIN`);
    assert.ok(source.includes('LATTICE:END'), `${file} missing LATTICE:END`);
  }
});

// [VXG RealForever]
