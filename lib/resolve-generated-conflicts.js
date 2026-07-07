#!/usr/bin/env node
/**
 * VEXTREME — lib/resolve-generated-conflicts.js
 *
 * Auto-resolves merge/rebase conflicts in files that are pure build output —
 * data/index.json, sw.js, data/status.json, data/lessons.json, and the rest
 * of the list in .gitattributes' `merge=ours` entries. These files conflict
 * on nearly every PR because each branch's own CI run regenerates them with
 * a fresh timestamp or commit-hash-derived cache name, so two branches that
 * touch unrelated source files still produce byte-different "generated"
 * output. That's a false conflict — there's no real decision to make, since
 * whichever copy wins gets overwritten by the next CI run anyway.
 *
 * `.gitattributes`' `merge=ours` declares the intent, but the "ours" driver
 * it names must be registered per-clone in .git/config (untracked by git,
 * and never consulted by GitHub's own web-based PR conflict UI at all) — so
 * that declaration alone does not actually resolve anything in practice.
 * This script is the thing that does: run it mid-conflict (after `git rebase
 * origin/main` stops with conflicts, before `git rebase --continue`) and it
 * takes the incoming/upstream copy for every conflicted file that's on the
 * generated-file list, leaving anything else for manual resolution.
 *
 * Run manually, mid-conflict:   node lib/resolve-generated-conflicts.js
 *
 * [VXG RealForever]
 */

'use strict';

const fs            = require('fs');
const path          = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');

// ── Pure computation ──────────────────────────────────────────────────────────

// parseGeneratedFileList — reads .gitattributes and returns every path marked
// `merge=ours`, which is this repo's existing declaration of "build output,
// never hand-edited, safe to auto-resolve."
function parseGeneratedFileList(gitattributesContent) {
  return gitattributesContent
    .split('\n')
    .map(line => line.trim())
    .filter(line => line && !line.startsWith('#'))
    .filter(line => /merge=ours\b/.test(line))
    .map(line => line.split(/\s+/)[0]);
}

// parseConflictedFiles — reads `git status --porcelain` output and returns
// paths with unmerged status (UU, AA, etc. — first two chars both non-space
// and non-'?').
function parseConflictedFiles(porcelainOutput) {
  return porcelainOutput
    .split('\n')
    .filter(line => line.length > 2)
    .filter(line => {
      const status = line.slice(0, 2);
      return status[0] !== ' ' && status[0] !== '?' && status[1] !== ' ' && status[1] !== '?';
    })
    .map(line => line.slice(3).trim());
}

// ── I/O — only runs when executed directly ────────────────────────────────────

if (require.main === module) {
  const gitattributes = fs.readFileSync(path.join(ROOT, '.gitattributes'), 'utf8');
  const generatedFiles = new Set(parseGeneratedFileList(gitattributes));

  const porcelain = execFileSync('git', ['status', '--porcelain'], { cwd: ROOT, encoding: 'utf8' });
  const conflicted = parseConflictedFiles(porcelain);

  const resolved = [];
  const skipped = [];

  for (const file of conflicted) {
    if (generatedFiles.has(file)) {
      execFileSync('git', ['checkout', '--theirs', '--', file], { cwd: ROOT });
      execFileSync('git', ['add', '--', file], { cwd: ROOT });
      resolved.push(file);
    } else {
      skipped.push(file);
    }
  }

  console.log(`[resolve-generated-conflicts] Resolved ${resolved.length} generated-file conflict(s):`);
  for (const f of resolved) console.log(`  - ${f}`);

  if (skipped.length) {
    console.log(`\n[resolve-generated-conflicts] Left ${skipped.length} real conflict(s) for manual resolution:`);
    for (const f of skipped) console.log(`  - ${f}`);
  } else if (resolved.length) {
    console.log('\nAll conflicts were generated-file conflicts. Run `git rebase --continue` (or `git commit` for a merge).');
  } else {
    console.log('No conflicted files found — nothing to do.');
  }
}

module.exports = { parseGeneratedFileList, parseConflictedFiles };

// [VXG RealForever]
