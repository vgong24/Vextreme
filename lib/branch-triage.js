'use strict';

const { execFileSync } = require('node:child_process');

function runGit(args, options = {}) {
  try {
    return {
      ok: true,
      stdout: execFileSync('git', args, {
        cwd: options.cwd || process.cwd(),
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
      }).trimEnd(),
      stderr: '',
    };
  } catch (error) {
    return {
      ok: false,
      stdout: error.stdout ? String(error.stdout).trimEnd() : '',
      stderr: error.stderr ? String(error.stderr).trimEnd() : error.message,
    };
  }
}

function parseStatusPorcelain(output) {
  return output
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => ({
      code: line.slice(0, 2),
      path: line.slice(3).trim(),
    }));
}

function parseAheadBehind(output) {
  const [behind, ahead] = output.trim().split(/\s+/).map((value) => Number.parseInt(value, 10));
  return {
    ahead: Number.isFinite(ahead) ? ahead : null,
    behind: Number.isFinite(behind) ? behind : null,
  };
}

function classifyDirtyFile(path, code = '') {
  if (code === '??') {
    return 'real-content-change';
  }

  const diff = runGit(['diff', '--', path]);
  const stat = runGit(['diff', '--numstat', '--', path]);

  if (!diff.ok || !stat.ok) {
    return 'unclear';
  }

  if (diff.stdout.trim() || stat.stdout.trim()) {
    return 'real-content-change';
  }

  return 'line-ending-or-no-op';
}

function getCurrentBranch() {
  const branch = runGit(['branch', '--show-current']);
  if (branch.ok && branch.stdout.trim()) {
    return branch.stdout.trim();
  }

  const head = runGit(['rev-parse', '--short', 'HEAD']);
  return head.ok ? `HEAD (${head.stdout.trim()})` : 'unknown';
}

function getUpstream() {
  const upstream = runGit(['rev-parse', '--abbrev-ref', '--symbolic-full-name', '@{u}']);
  if (!upstream.ok || !upstream.stdout.trim()) {
    return { name: 'none', status: 'none' };
  }

  const name = upstream.stdout.trim();
  const exists = runGit(['rev-parse', '--verify', '--quiet', name]);
  return {
    name,
    status: exists.ok ? 'exists' : 'gone',
  };
}

function getAheadCommits() {
  const cherry = runGit(['cherry', 'origin/main', 'HEAD']);
  if (!cherry.ok || !cherry.stdout.trim()) {
    return [];
  }

  return cherry.stdout.split(/\r?\n/).filter(Boolean).map((line) => {
    const marker = line.slice(0, 1);
    const hash = line.slice(2).trim();
    const title = runGit(['show', '-s', '--format=%s', hash]);
    const files = runGit(['show', '--name-only', '--format=', hash]);

    return {
      hash,
      title: title.ok ? title.stdout.trim() : 'unknown',
      files: files.ok ? files.stdout.split(/\r?\n/).filter(Boolean) : [],
      represented: marker === '-' ? 'yes' : marker === '+' ? 'no' : 'unclear',
      evidence: marker === '-'
        ? 'git cherry returned -'
        : marker === '+'
          ? 'git cherry returned +'
          : 'git cherry returned unclear marker',
    };
  });
}

function lookupOpenPr(branch) {
  const ghCheck = runCommand('gh', ['--version']);
  if (!ghCheck.ok) {
    return { status: 'unavailable', detail: 'gh unavailable' };
  }

  const result = runCommand('gh', [
    'pr',
    'list',
    '--head',
    branch,
    '--state',
    'open',
    '--json',
    'number,title,url',
  ]);

  if (!result.ok) {
    return { status: 'unavailable', detail: 'gh lookup failed' };
  }

  try {
    const prs = JSON.parse(result.stdout || '[]');
    if (!prs.length) {
      return { status: 'none found', detail: '' };
    }
    return {
      status: 'found',
      detail: prs.map((pr) => `#${pr.number} ${pr.title} ${pr.url}`).join('; '),
    };
  } catch {
    return { status: 'unavailable', detail: 'gh returned unreadable JSON' };
  }
}

function runCommand(command, args) {
  try {
    return {
      ok: true,
      stdout: execFileSync(command, args, {
        cwd: process.cwd(),
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
      }).trimEnd(),
    };
  } catch (error) {
    return {
      ok: false,
      stdout: error.stdout ? String(error.stdout).trimEnd() : '',
      stderr: error.stderr ? String(error.stderr).trimEnd() : error.message,
    };
  }
}

function classifyReport(report) {
  const hasRealDirty = report.dirtyFiles.some((file) => file.classification === 'real-content-change');
  const hasUnclearDirty = report.dirtyFiles.some((file) => file.classification === 'unclear');
  const hasUniqueAhead = report.aheadCommits.some((commit) => commit.represented === 'no');
  const hasUnclearAhead = report.aheadCommits.some((commit) => commit.represented === 'unclear');
  const multipleAhead = report.aheadCommits.length > 1;
  const activeUpstream = report.upstream.status === 'exists';
  const openPrFound = report.openPr.status === 'found';

  if (hasRealDirty || activeUpstream || openPrFound || multipleAhead) {
    return 'active-work-unknown';
  }

  if (hasUnclearDirty || hasUnclearAhead) {
    return 'needs-human-review';
  }

  if (hasUniqueAhead) {
    return 'stale-preserve-patch';
  }

  return 'stale-safe-to-clean-later';
}

function recommendedAction(classification) {
  switch (classification) {
    case 'stale-safe-to-clean-later':
      return 'cleanup may be safe later, but requires Victor/Vex approval';
    case 'stale-preserve-patch':
      return 'preserve useful unique content in a patch or fresh branch before cleanup';
    case 'active-work-unknown':
      return 'pause cleanup and preserve this branch until a human reviews active work';
    default:
      return 'ask Victor/Vex to inspect uncertainty before cleanup';
  }
}

function buildReport() {
  const branch = getCurrentBranch();
  const upstream = getUpstream();
  const status = runGit(['status', '--porcelain']);
  const dirtyFiles = status.ok
    ? parseStatusPorcelain(status.stdout).map((entry) => ({
        path: entry.path,
        code: entry.code,
        classification: classifyDirtyFile(entry.path, entry.code),
      }))
    : [];

  const counts = runGit(['rev-list', '--left-right', '--count', 'origin/main...HEAD']);
  const aheadBehind = counts.ok ? parseAheadBehind(counts.stdout) : { ahead: null, behind: null };
  const aheadCommits = getAheadCommits();
  const openPr = lookupOpenPr(branch);

  const report = {
    branch,
    upstream,
    workingTree: dirtyFiles.length ? 'dirty' : 'clean',
    dirtyFiles,
    aheadBehind,
    aheadCommits,
    openPr,
  };

  report.classification = classifyReport(report);
  report.recommendedAction = recommendedAction(report.classification);
  return report;
}

function renderReport(report) {
  const lines = [
    'Branch Triage Report',
    '',
    'Branch:',
    `  ${report.branch}`,
    '',
    'Upstream:',
    `  ${report.upstream.name} (${report.upstream.status})`,
    '',
    'Working tree:',
    `  ${report.workingTree}`,
    '',
    'Dirty files:',
  ];

  if (!report.dirtyFiles.length) {
    lines.push('  none');
  } else {
    for (const file of report.dirtyFiles) {
      lines.push(`  ${file.path} - ${file.classification}`);
    }
  }

  lines.push(
    '',
    'Ahead/behind vs origin/main:',
    `  ahead: ${report.aheadBehind.ahead ?? 'unknown'}`,
    `  behind: ${report.aheadBehind.behind ?? 'unknown'}`,
    '',
    'Ahead commits:',
  );

  if (!report.aheadCommits.length) {
    lines.push('  none');
  } else {
    for (const commit of report.aheadCommits) {
      lines.push(`  ${commit.hash.slice(0, 7)} ${commit.title}`);
      lines.push(`    files touched: ${commit.files.length ? commit.files.join(', ') : 'unknown'}`);
      lines.push(`    represented on origin/main: ${commit.represented}`);
      lines.push(`    evidence: ${commit.evidence}`);
    }
  }

  lines.push(
    '',
    'Open PR:',
    `  ${report.openPr.status}${report.openPr.detail ? ` - ${report.openPr.detail}` : ''}`,
    '',
    'Classification:',
    `  ${report.classification}`,
    '',
    'Recommended next action:',
    `  ${report.recommendedAction}`,
    '',
    'Mutation performed:',
    '  no',
  );

  return lines.join('\n');
}

if (require.main === module) {
  console.log(renderReport(buildReport()));
}

module.exports = {
  parseStatusPorcelain,
  parseAheadBehind,
  classifyReport,
  recommendedAction,
  renderReport,
};

// [VXG RealForever]
