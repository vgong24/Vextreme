'use strict';

const SHA256_PATTERN = /^[0-9a-f]{64}$/;
const GIT_OID_PATTERN = /^[0-9a-f]{40}$/;
const REPOSITORY = 'vgong24/Vextreme-SDK';
const CONTRACT_REF = 'source.vexrelay.current-contract/v1';

const DEFAULT_EXECUTABLES = Object.freeze({
  bash: ['/bin/bash'],
  git: ['/usr/bin/git'],
  gh: ['/opt/homebrew/bin/gh', '/usr/local/bin/gh'],
  node: ['/opt/homebrew/bin/node', '/usr/local/bin/node', '/usr/bin/node'],
  shasum: ['/usr/bin/shasum'],
  cut: ['/usr/bin/cut'],
  mktemp: ['/usr/bin/mktemp'],
  dirname: ['/usr/bin/dirname'],
  rm: ['/bin/rm', '/usr/bin/rm'],
});

const REQUIRED_SOURCE_MEMBERS = Object.freeze([
  'docs/private-continuity/vexrelay/current-contract.json',
  'docs/private-continuity/vexrelay/source-inventory.json',
  'lib/vexlocalbridge/cli.js',
  'lib/vexlocalbridge/pre-admission-carriage.js',
  'lib/vexlocalbridge/runner-core.js',
  'lib/vexlocalbridge/mac-runner.js',
  'lib/vexlocalbridge/vexrelay-task-archive.js',
  'lib/vexlocalbridge/templates/RUN-VEXLIFE-TASK.command',
]);

function fail(code, message) {
  const error = new Error(message);
  error.code = code;
  throw error;
}

function validateExact(value, pattern, field) {
  if (typeof value !== 'string' || !pattern.test(value)) {
    fail('MAC_SOURCE_BOOTSTRAP_BINDING_INVALID', `${field} is invalid`);
  }
  return value;
}

function validateExecutableCandidates(value, field) {
  if (!Array.isArray(value) || value.length === 0) {
    fail('MAC_SOURCE_BOOTSTRAP_BINDING_INVALID', `${field} must be a non-empty array`);
  }
  const result = value.map((candidate, index) => {
    if (
      typeof candidate !== 'string' ||
      !candidate.startsWith('/') ||
      /[\0\r\n]/.test(candidate)
    ) {
      fail(
        'MAC_SOURCE_BOOTSTRAP_BINDING_INVALID',
        `${field}[${index}] must be an absolute newline-free path`,
      );
    }
    return candidate;
  });
  if (new Set(result).size !== result.length) {
    fail('MAC_SOURCE_BOOTSTRAP_BINDING_INVALID', `${field} must be unique`);
  }
  return result;
}

function shellQuote(value) {
  if (typeof value !== 'string' || value.includes('\0')) {
    fail('MAC_SOURCE_BOOTSTRAP_BINDING_INVALID', 'shell value is invalid');
  }
  return `'${value.replace(/'/g, `'\\''`)}'`;
}

function validateBinding(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    fail('MAC_SOURCE_BOOTSTRAP_BINDING_INVALID', 'binding must be an object');
  }
  const repository = input.repository ?? REPOSITORY;
  if (repository !== REPOSITORY) {
    fail(
      'MAC_SOURCE_BOOTSTRAP_BINDING_INVALID',
      `repository must equal ${REPOSITORY}`,
    );
  }
  const packageSha256 = validateExact(
    input.packageSha256,
    SHA256_PATTERN,
    'packageSha256',
  );
  const sdkHead = validateExact(input.sdkHead, GIT_OID_PATTERN, 'sdkHead');
  const sdkTree = validateExact(input.sdkTree, GIT_OID_PATTERN, 'sdkTree');
  const supplied = input.executables || {};
  const executables = {};
  for (const [name, defaults] of Object.entries(DEFAULT_EXECUTABLES)) {
    executables[name] = validateExecutableCandidates(
      supplied[name] ?? defaults,
      `executables.${name}`,
    );
  }
  return { repository, packageSha256, sdkHead, sdkTree, executables };
}

function renderArrayAssignment(name, values) {
  return `${name}=(${values.map(shellQuote).join(' ')})`;
}

function renderMacSourceBootstrapCommand(input) {
  const binding = validateBinding(input);
  const lines = [
    'set -euo pipefail',
    `EXPECTED=${shellQuote(binding.packageSha256)}`,
    `SDK_HEAD=${shellQuote(binding.sdkHead)}`,
    `SDK_TREE=${shellQuote(binding.sdkTree)}`,
    `REPOSITORY=${shellQuote(binding.repository)}`,
    renderArrayAssignment('BASH_CANDIDATES', binding.executables.bash),
    renderArrayAssignment('GIT_CANDIDATES', binding.executables.git),
    renderArrayAssignment('GH_CANDIDATES', binding.executables.gh),
    renderArrayAssignment('NODE_CANDIDATES', binding.executables.node),
    renderArrayAssignment('SHASUM_CANDIDATES', binding.executables.shasum),
    renderArrayAssignment('CUT_CANDIDATES', binding.executables.cut),
    renderArrayAssignment('MKTEMP_CANDIDATES', binding.executables.mktemp),
    renderArrayAssignment('DIRNAME_CANDIDATES', binding.executables.dirname),
    renderArrayAssignment('RM_CANDIDATES', binding.executables.rm),
    'resolve_exec() {',
    '  local candidate',
    '  for candidate in "$@"; do',
    '    if [ -x "$candidate" ] && [ -f "$candidate" ]; then',
    '      printf "%s" "$candidate"',
    '      return 0',
    '    fi',
    '  done',
    '  return 1',
    '}',
    'BASH_BIN="$(resolve_exec "${BASH_CANDIDATES[@]}")" || { printf "%s\\n" "VexLocalBridge: qualified Bash unavailable." >&2; exit 10; }',
    'GIT_BIN="$(resolve_exec "${GIT_CANDIDATES[@]}")" || { printf "%s\\n" "VexLocalBridge: qualified Git unavailable." >&2; exit 11; }',
    'GH_BIN="$(resolve_exec "${GH_CANDIDATES[@]}")" || { printf "%s\\n" "VexLocalBridge: qualified GitHub CLI unavailable." >&2; exit 12; }',
    'NODE_BIN="$(resolve_exec "${NODE_CANDIDATES[@]}")" || { printf "%s\\n" "VexLocalBridge: qualified Node unavailable." >&2; exit 13; }',
    'SHASUM_BIN="$(resolve_exec "${SHASUM_CANDIDATES[@]}")" || { printf "%s\\n" "VexLocalBridge: qualified shasum unavailable." >&2; exit 14; }',
    'CUT_BIN="$(resolve_exec "${CUT_CANDIDATES[@]}")" || { printf "%s\\n" "VexLocalBridge: qualified cut unavailable." >&2; exit 15; }',
    'MKTEMP_BIN="$(resolve_exec "${MKTEMP_CANDIDATES[@]}")" || { printf "%s\\n" "VexLocalBridge: qualified mktemp unavailable." >&2; exit 16; }',
    'DIRNAME_BIN="$(resolve_exec "${DIRNAME_CANDIDATES[@]}")" || { printf "%s\\n" "VexLocalBridge: qualified dirname unavailable." >&2; exit 17; }',
    'RM_BIN="$(resolve_exec "${RM_CANDIDATES[@]}")" || { printf "%s\\n" "VexLocalBridge: qualified rm unavailable." >&2; exit 18; }',
    'printf "%s\\n" "VexLocalBridge: locating exact package bytes..."',
    'PACKAGE=""',
    'shopt -s nullglob',
    'for candidate in "$HOME"/Downloads/*.zip; do',
    '  [ -f "$candidate" ] || continue',
    '  [ ! -L "$candidate" ] || continue',
    '  observed="$("$SHASUM_BIN" -a 256 "$candidate" | "$CUT_BIN" -d " " -f 1)"',
    '  if [ "$observed" = "$EXPECTED" ]; then',
    '    PACKAGE="$candidate"',
    '    break',
    '  fi',
    'done',
    '[ -n "$PACKAGE" ] || { printf "%s\\n" "VexLocalBridge: exact package bytes not found in Downloads." >&2; exit 20; }',
    'PACKAGE_PARENT="$("$DIRNAME_BIN" "$PACKAGE")"',
    'PACKAGE_PARENT="$(cd "$PACKAGE_PARENT" && pwd -P)"',
    'printf "VexLocalBridge: selected package %s\\n" "$PACKAGE"',
    '"$GH_BIN" auth status --hostname github.com >/dev/null 2>&1 || { printf "%s\\n" "VexLocalBridge: GitHub authentication unavailable." >&2; exit 21; }',
    'BOOT_ROOT="$("$MKTEMP_BIN" -d "$PACKAGE_PARENT/.vlb-sdk-${EXPECTED:0:16}.XXXXXX")"',
    '[ -n "$BOOT_ROOT" ] && [ -d "$BOOT_ROOT" ] || { printf "%s\\n" "VexLocalBridge: bootstrap root unavailable." >&2; exit 22; }',
    'case "$BOOT_ROOT" in',
    '  "$PACKAGE_PARENT"/.vlb-sdk-*) ;;',
    '  *) printf "%s\\n" "VexLocalBridge: bootstrap root escaped package parent." >&2; exit 22 ;;',
    'esac',
    'cleanup() {',
    '  case "$BOOT_ROOT" in',
    '    "$PACKAGE_PARENT"/.vlb-sdk-*) "$RM_BIN" -rf -- "$BOOT_ROOT" ;;',
    '    *) return 1 ;;',
    '  esac',
    '}',
    'trap cleanup EXIT HUP INT TERM',
    'SOURCE_ROOT="$BOOT_ROOT/Vextreme-SDK"',
    '"$GH_BIN" repo clone "$REPOSITORY" "$SOURCE_ROOT" -- --no-checkout >/dev/null',
    '"$GIT_BIN" -C "$SOURCE_ROOT" checkout --detach "$SDK_HEAD" >/dev/null',
    'OBSERVED_HEAD="$("$GIT_BIN" -C "$SOURCE_ROOT" rev-parse HEAD)"',
    'OBSERVED_TREE="$("$GIT_BIN" -C "$SOURCE_ROOT" rev-parse "HEAD^{tree}")"',
    '[ "$OBSERVED_HEAD" = "$SDK_HEAD" ] || { printf "%s\\n" "VexLocalBridge: acquired SDK head mismatch." >&2; exit 23; }',
    '[ "$OBSERVED_TREE" = "$SDK_TREE" ] || { printf "%s\\n" "VexLocalBridge: acquired SDK tree mismatch." >&2; exit 24; }',
    'SOURCE_STATUS="$("$GIT_BIN" -C "$SOURCE_ROOT" status --porcelain=v1 -uall)"',
    '[ -z "$SOURCE_STATUS" ] || { printf "%s\\n" "VexLocalBridge: acquired SDK source is dirty." >&2; exit 25; }',
    `REQUIRED_MEMBERS=(${REQUIRED_SOURCE_MEMBERS.map(shellQuote).join(' ')})`,
    'for member in "${REQUIRED_MEMBERS[@]}"; do',
    '  [ -f "$SOURCE_ROOT/$member" ] || { printf "VexLocalBridge: required source member missing: %s\\n" "$member" >&2; exit 26; }',
    'done',
    `"$NODE_BIN" -e ${shellQuote(
      `const fs=require('node:fs');const p=process.argv[1];const x=JSON.parse(fs.readFileSync(p,'utf8'));if(x.contractRef!==${JSON.stringify(CONTRACT_REF)})process.exit(27);`,
    )} "$SOURCE_ROOT/docs/private-continuity/vexrelay/current-contract.json"`,
    'BEFORE_DIGEST="$EXPECTED"',
    'set +e',
    'VEX_EXPECTED_PACKAGE_SHA256="$EXPECTED" "$BASH_BIN" "$SOURCE_ROOT/lib/vexlocalbridge/templates/RUN-VEXLIFE-TASK.command" "$PACKAGE"',
    'LAUNCH_STATUS=$?',
    'set -e',
    'AFTER_DIGEST="$("$SHASUM_BIN" -a 256 "$PACKAGE" | "$CUT_BIN" -d " " -f 1)"',
    '[ "$AFTER_DIGEST" = "$BEFORE_DIGEST" ] || { printf "%s\\n" "VexLocalBridge: package bytes changed during execution." >&2; exit 28; }',
    'exit "$LAUNCH_STATUS"',
  ];
  return `${binding.executables.bash[0]} -c ${shellQuote(lines.join('\n'))}`;
}

module.exports = {
  REPOSITORY,
  CONTRACT_REF,
  DEFAULT_EXECUTABLES,
  REQUIRED_SOURCE_MEMBERS,
  shellQuote,
  validateBinding,
  renderMacSourceBootstrapCommand,
};

// [VXG RealForever]
