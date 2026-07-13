#!/usr/bin/env node
// Assembles docs/architecture/*.md source files into docs/architecture.md.
// The projection is deterministic: no clock-derived timestamp is embedded.

'use strict';

const fs   = require('fs');
const path = require('path');

const ROOT    = path.join(__dirname, '..');
const SRC_DIR = path.join(ROOT, 'docs', 'architecture');
const OUT     = path.join(ROOT, 'docs', 'architecture.md');

const HEADER = `# VEXTREME — Architecture Blueprint

> **This file is generated.** Edit source files in \`docs/architecture/\`
> and run \`node lib/build-architecture.js\` to rebuild.
> See \`docs/architecture/00-reading-guide.md\` for question routing and reading order.

---

`;

const FOOTER = '\n\n---\n\n<!-- [VXG RealForever] -->\n';

function listSourceFiles(srcDir = SRC_DIR) {
  return fs.readdirSync(srcDir)
    .filter(file => file.endsWith('.md'))
    .sort();
}

function stripSectionMarker(content) {
  return content
    .replace(/\n*<!--\s*\[VXG RealForever\]\s*-->\s*$/, '')
    .trim();
}

function assembleArchitecture(srcDir = SRC_DIR) {
  const sections = listSourceFiles(srcDir).map(file =>
    stripSectionMarker(fs.readFileSync(path.join(srcDir, file), 'utf8'))
  );
  return HEADER + sections.join('\n\n---\n\n') + FOOTER;
}

function run(args = process.argv.slice(2)) {
  const expected = assembleArchitecture();
  if (args.includes('--check')) {
    const actual = fs.existsSync(OUT) ? fs.readFileSync(OUT, 'utf8') : '';
    if (actual !== expected) {
      console.error('[build-architecture] docs/architecture.md is stale; run node lib/build-architecture.js');
      return 1;
    }
    console.log(`[build-architecture] Projection matches ${listSourceFiles().length} sources.`);
    return 0;
  }

  fs.writeFileSync(OUT, expected);
  console.log(`[build-architecture] Assembled ${listSourceFiles().length} sections → docs/architecture.md`);
  return 0;
}

if (require.main === module) process.exitCode = run();

module.exports = {
  HEADER,
  FOOTER,
  listSourceFiles,
  stripSectionMarker,
  assembleArchitecture,
  run,
};

// [VXG RealForever]
