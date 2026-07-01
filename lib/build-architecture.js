#!/usr/bin/env node
// Assembles docs/architecture/*.md source files into docs/architecture.md.
// Source files are numbered (00-, 01-, ...) and concatenated in order.
// docs/architecture.md is a generated artifact — never edit it directly.

const fs   = require('fs');
const path = require('path');

const SRC_DIR = path.join(__dirname, '../docs/architecture');
const OUT     = path.join(__dirname, '../docs/architecture.md');

const header = `# VEXTREME — Architecture Blueprint

> **This file is generated.** Edit source files in \`docs/architecture/\`
> and run \`node lib/build-architecture.js\` to rebuild.
> See \`docs/architecture/00-reading-guide.md\` for reading order.

---

`;

const files = fs.readdirSync(SRC_DIR)
  .filter(f => f.endsWith('.md'))
  .sort();

const sections = files.map(file => {
  const content = fs.readFileSync(path.join(SRC_DIR, file), 'utf8');
  // Strip the VXG RealForever comment from each source section —
  // it will appear once at the bottom of the assembled file.
  return content
    .replace(/\n*<!--\s*\[VXG RealForever\]\s*-->\s*$/, '')
    .trim();
});

const body = sections.join('\n\n---\n\n');
const timestamp = `\n\n---\n\n*Last updated: ${new Date().toISOString().split('T')[0]}*\n\n<!-- [VXG RealForever] -->\n`;

fs.writeFileSync(OUT, header + body + timestamp);
console.log(`[build-architecture] Assembled ${files.length} sections → docs/architecture.md`);

// [VXG RealForever]
