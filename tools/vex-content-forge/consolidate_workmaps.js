#!/usr/bin/env node
'use strict';

const api = {
  ...require('./consolidation/lib'),
  ...require('./consolidation/chain'),
  ...require('./consolidation/observation'),
  ...require('./consolidation/normalize'),
  ...require('./consolidation/lineage'),
  ...require('./consolidation/invariants'),
  ...require('./consolidation/proposal'),
  ...require('./consolidation/cli'),
};

if (require.main === module) {
  try {
    process.exitCode = api.runCli();
  } catch (error) {
    process.stderr.write(`[content-forge-consolidation] ERROR: ${error.message}\n`);
    process.exitCode = 2;
  }
}

module.exports = api;
