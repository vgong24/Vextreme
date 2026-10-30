'use strict';

const fs = require('fs');
const path = require('path');
const { DEFAULT_POINTER, stableJson } = require('./lib');
const { compileProposal } = require('./proposal');

const DEFAULT_REPO_ROOT = path.resolve(__dirname, '..', '..', '..');

function parseArgs(argv) {
  const args = { repoRoot: DEFAULT_REPO_ROOT, pointer: DEFAULT_POINTER, output: null, check: null, strict: false, summary: false };
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === '--repo-root') args.repoRoot = path.resolve(argv[++index]);
    else if (token === '--pointer') args.pointer = argv[++index];
    else if (token === '--output') args.output = argv[++index];
    else if (token === '--check') args.check = argv[++index];
    else if (token === '--strict') args.strict = true;
    else if (token === '--summary') args.summary = true;
    else throw new Error(`unknown argument: ${token}`);
  }
  if (args.output && args.check) throw new Error('--output and --check are mutually exclusive');
  return args;
}

function summaryOf(proposal) {
  return {
    schemaVersion: proposal.schemaVersion,
    stage: proposal.effectBoundary.stage,
    rootWorkMapPath: proposal.generatedFrom.rootWorkMapPath,
    rootRevision: proposal.generatedFrom.rootRevision,
    counts: proposal.counts,
    destinationClasses: proposal.destinationClasses.map(item => ({ destinationClass: item.destinationClass, count: item.count })),
    invariantFindings: proposal.invariantFindings,
  };
}

function runCli(argv = process.argv.slice(2)) {
  const args = parseArgs(argv);
  const proposal = compileProposal(args.repoRoot, args.pointer);
  const bytes = stableJson(proposal);
  if (args.check) {
    const existing = fs.readFileSync(path.resolve(args.repoRoot, args.check), 'utf8');
    if (existing !== bytes) {
      process.stderr.write(`[content-forge-consolidation] stale proposal: ${args.check}\n`);
      return 1;
    }
    process.stdout.write(`[content-forge-consolidation] current: ${args.check}\n`);
  } else if (args.output) {
    const output = path.resolve(args.repoRoot, args.output);
    fs.mkdirSync(path.dirname(output), { recursive: true });
    fs.writeFileSync(output, bytes, 'utf8');
    process.stdout.write(`[content-forge-consolidation] wrote ${args.output}\n`);
  } else {
    process.stdout.write(stableJson(args.summary ? summaryOf(proposal) : proposal));
  }
  return args.strict && proposal.counts.invariantErrors > 0 ? 1 : 0;
}

module.exports = { DEFAULT_REPO_ROOT, parseArgs, runCli, summaryOf };
