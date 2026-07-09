'use strict';

const { execFileSync } = require('node:child_process');
const branchTriage = require('./branch-triage');

function runGit(args) {
  try {
    return {
      ok: true,
      stdout: execFileSync('git', args, {
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

function parseRepoName(remoteUrl) {
  if (!remoteUrl || !remoteUrl.trim()) return 'unknown';
  const trimmed = remoteUrl.trim().replace(/\.git$/, '');
  const segments = trimmed.split('/').filter(Boolean);
  return segments.length ? segments[segments.length - 1] : 'unknown';
}

function parseGoneBranches(forEachRefOutput) {
  return forEachRefOutput
    .split(/\r?\n/)
    .filter(Boolean)
    .filter((line) => line.includes('[gone]'))
    .map((line) => line.split(/\s+/)[0]);
}

function interpretGhAvailability({ versionOk, authOk }) {
  if (!versionOk) return { available: false, reason: 'gh missing' };
  if (!authOk) return { available: false, reason: 'gh unauthenticated' };
  return { available: true, reason: null };
}

function buildSuggestions(report) {
  const suggestions = [];

  if (!report.workingTree.clean) {
    suggestions.push('If reviewing a PR or exploring separate work, use an isolated worktree rather than switching here while the tree is dirty.');
  }

  if (report.goneBranches.length) {
    suggestions.push(`${report.goneBranches.length} local branch(es) track a deleted upstream — run \`npm run branch-triage\` to check cleanup readiness.`);
  } else {
    suggestions.push('If considering cleanup, run `npm run branch-triage`.');
  }

  suggestions.push('If validating selected work before opening or reviewing a PR, run `npm run pr-ready`.');
  suggestions.push('This report does not fetch — if remote freshness matters, run `git fetch` manually first.');

  return suggestions;
}

function getGoneBranches() {
  const result = runGit(['for-each-ref', '--format=%(refname:short) %(upstream:track)', 'refs/heads/']);
  return result.ok ? parseGoneBranches(result.stdout) : [];
}

function checkGhAvailability() {
  const version = runCommand('gh', ['--version']);
  if (!version.ok) return interpretGhAvailability({ versionOk: false, authOk: false });

  const auth = runCommand('gh', ['auth', 'status']);
  return interpretGhAvailability({ versionOk: true, authOk: auth.ok });
}

function getBranchTriageSummary() {
  try {
    const report = branchTriage.buildReport();
    return {
      status: 'available',
      classification: report.classification,
      recommendedAction: report.recommendedAction,
      openPr: report.openPr,
      workingTree: report.workingTree,
      dirtyFiles: report.dirtyFiles,
      aheadBehind: report.aheadBehind,
      upstream: report.upstream,
    };
  } catch {
    return { status: 'unavailable', classification: null, recommendedAction: null, openPr: null };
  }
}

function getOpenPrStatus(triageSummary) {
  const gh = checkGhAvailability();
  if (!gh.available) return { status: gh.reason, detail: '' };

  if (triageSummary.status === 'available' && triageSummary.openPr) {
    return triageSummary.openPr;
  }

  return { status: 'unavailable', detail: 'branch-triage lookup unavailable' };
}

function buildReport() {
  const remote = runGit(['remote', 'get-url', 'origin']);
  const repository = parseRepoName(remote.ok ? remote.stdout : '');

  const branch = getCurrentBranch();
  const triageSummary = getBranchTriageSummary();

  const workingTree = triageSummary.status === 'available'
    ? { clean: triageSummary.workingTree === 'clean', dirtyFiles: triageSummary.dirtyFiles }
    : readWorkingTreeDirectly();

  const goneBranches = getGoneBranches();
  const openPr = getOpenPrStatus(triageSummary);

  const report = {
    repository,
    branch,
    workingTree,
    aheadBehind: triageSummary.status === 'available' ? triageSummary.aheadBehind : { ahead: null, behind: null },
    upstream: triageSummary.status === 'available' ? triageSummary.upstream : { name: 'unknown', status: 'unknown' },
    goneBranches,
    branchTriage: {
      status: triageSummary.status,
      classification: triageSummary.classification,
      recommendedAction: triageSummary.recommendedAction,
    },
    openPr,
  };

  report.suggestions = buildSuggestions(report);
  return report;
}

function getCurrentBranch() {
  const branch = runGit(['branch', '--show-current']);
  if (branch.ok && branch.stdout.trim()) return branch.stdout.trim();

  const head = runGit(['rev-parse', '--short', 'HEAD']);
  return head.ok ? `HEAD (${head.stdout.trim()})` : 'unknown';
}

function readWorkingTreeDirectly() {
  const status = runGit(['status', '--porcelain']);
  const dirtyFiles = status.ok ? branchTriage.parseStatusPorcelain(status.stdout) : [];
  return { clean: dirtyFiles.length === 0, dirtyFiles };
}

function renderReport(report) {
  const lines = [
    'Current Work Report',
    '',
    'Repository:',
    `  ${report.repository}`,
    '',
    'Current branch:',
    `  ${report.branch}`,
    '',
    'Working tree:',
    `  ${report.workingTree.clean ? 'clean' : 'dirty'}`,
    '',
    'Dirty files:',
  ];

  if (!report.workingTree.dirtyFiles.length) {
    lines.push('  none');
  } else {
    for (const file of report.workingTree.dirtyFiles) {
      lines.push(`  ${file.path} (${file.code})`);
    }
  }

  lines.push(
    '',
    'Branch relationship to origin/main:',
    `  ahead: ${report.aheadBehind.ahead ?? 'unknown'}, behind: ${report.aheadBehind.behind ?? 'unknown'}`,
    '',
    'Local gone-upstream branches:',
  );

  if (!report.goneBranches.length) {
    lines.push('  none');
  } else {
    for (const branch of report.goneBranches) {
      lines.push(`  ${branch}`);
    }
  }

  lines.push(
    '',
    'Branch triage:',
    report.branchTriage.status === 'available'
      ? `  ${report.branchTriage.classification} — ${report.branchTriage.recommendedAction}`
      : '  unavailable — run `npm run branch-triage`',
    '',
    'Open PRs:',
    `  ${report.openPr.status}${report.openPr.detail ? ` - ${report.openPr.detail}` : ''}`,
    '',
    'Suggested next actions:',
  );

  for (const suggestion of report.suggestions) {
    lines.push(`  - ${suggestion}`);
  }

  lines.push(
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
  parseRepoName,
  parseGoneBranches,
  interpretGhAvailability,
  buildSuggestions,
  renderReport,
  buildReport,
};

// [VXG RealForever]
