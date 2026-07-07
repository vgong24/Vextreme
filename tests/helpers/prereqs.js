'use strict';

/**
 * VEXTREME — tests/helpers/prereqs.js
 *
 * Single source of truth for "which build scripts must run before the test
 * suite reads generated files." Individual test files (e.g.
 * tests/04-build-output.test.js) read committed/regenerated output like
 * pages/archives.html rather than calling build functions directly, so that
 * output has to exist and be current before those tests run.
 *
 * Previously this list was duplicated by hand: once in each test file's
 * PREREQUISITE docstring, and again as a literal `run:` line in
 * .github/workflows/test.yml. The two could drift — a new prerequisite
 * added to a docstring with nobody updating the workflow step, or vice
 * versa. This file is the one place that list lives; both the CI step
 * (via lib/run-test-prereqs.js) and any test file that wants to assert its
 * own prerequisite is actually covered read from here.
 *
 * Order matters: later scripts may read output written by earlier ones
 * (e.g. build-archives.js reads compiled strings from strings-compile.js).
 */

const PREREQUISITE_SCRIPTS = [
  'lib/strings-compile.js',
  'lib/build-archives.js',
];

module.exports = { PREREQUISITE_SCRIPTS };

// [VXG RealForever]
