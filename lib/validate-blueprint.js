#!/usr/bin/env node
/**
 * VEXTREME — lib/validate-blueprint.js
 *
 * Validates blueprint.json is internally consistent and all referenced
 * config files exist with their required fields. Also checks that
 * vex-config.js named constants cover every ID declared in the blueprint.
 *
 * Exits 0 on success, 1 on failure.
 *
 * Run manually:   node lib/validate-blueprint.js
 * Auto-run via:   tests/06-blueprint.test.js (exports validateBlueprint)
 */

'use strict';

const fs   = require('fs');
const path = require('path');
const { Category, Feature, AssetType } = require('./vex-config');

const ROOT = path.join(__dirname, '..');

function loadJson(rel) {
  const full = path.join(ROOT, rel);
  if (!fs.existsSync(full)) return null;
  try { return JSON.parse(fs.readFileSync(full, 'utf8')); }
  catch (e) { return { _parseError: e.message }; }
}

function validateBlueprint() {
  const errors = [];

  const blueprint = loadJson('blueprint.json');
  if (!blueprint) { return ['blueprint.json not found']; }
  if (blueprint._parseError) { return [`blueprint.json is invalid JSON: ${blueprint._parseError}`]; }

  const meta = loadJson('config/_meta.json') || {};
  const typeDefs = meta.types || {};

  function checkConfigFile(typeName, dirSegment, id) {
    const rel  = `config/${dirSegment}/${id}.json`;
    const data = loadJson(rel);

    if (!data) {
      errors.push(`Missing config file: ${rel}`);
      return;
    }
    if (data._parseError) {
      errors.push(`${rel} is invalid JSON: ${data._parseError}`);
      return;
    }
    if (!data._meta || data._meta.type !== typeName) {
      errors.push(`${rel}: _meta.type must be "${typeName}"`);
    }
    const required = (typeDefs[typeName] || {}).required || [];
    for (const field of required) {
      if (!(field in data)) {
        errors.push(`${rel}: missing required field "${field}"`);
      }
    }
  }

  // Validate categories against config files and Category constants
  const categoryValues = new Set(Object.values(Category));
  for (const id of (blueprint.categories || [])) {
    checkConfigFile('category', 'categories', id);
    if (!categoryValues.has(id)) {
      errors.push(`Blueprint category "${id}" has no matching constant in vex-config Category`);
    }
  }

  // Validate features against config files and Feature constants
  const featureValues = new Set(Object.values(Feature));
  for (const id of (blueprint.features || [])) {
    checkConfigFile('feature', 'features', id);
    if (!featureValues.has(id)) {
      errors.push(`Blueprint feature "${id}" has no matching constant in vex-config Feature`);
    }
  }

  // Validate asset types against config files and AssetType constants
  const assetTypeValues = new Set(Object.values(AssetType));
  for (const id of (blueprint.assetTypes || [])) {
    checkConfigFile('asset-type', 'asset-types', id);
    if (!assetTypeValues.has(id)) {
      errors.push(`Blueprint assetType "${id}" has no matching constant in vex-config AssetType`);
    }
  }

  // Validate templates against config files (no vex-config constant check — templates are open-ended)
  for (const id of (blueprint.templates || [])) {
    checkConfigFile('template', 'templates', id);
  }

  return errors;
}

if (require.main === module) {
  const errors = validateBlueprint();
  if (errors.length === 0) {
    console.log('[validate-blueprint] OK — blueprint.json is consistent');
    process.exit(0);
  } else {
    console.error('[validate-blueprint] FAILED:');
    errors.forEach(e => console.error('  ✗', e));
    process.exit(1);
  }
}

module.exports = { validateBlueprint };

// [VXG RealForever]
