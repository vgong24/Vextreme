'use strict';

// Event codes emitted by build scripts and browser runtime.
// Each entry documents what triggered the event and what the optional fields carry.
//
// Usage: logger.warn({ code: CODES.SLUG_NOT_IN_NODES, message: '...', arc, slug })
// Adding a new field to a call site never requires changing other call sites.

const CODES = {
  // build-index.js
  SLUG_NOT_IN_NODES:        'SLUG_NOT_IN_NODES',        // { arc, section, slug }

  // strings-compile.js
  STRINGS_MISSING_NAMESPACE:'STRINGS_MISSING_NAMESPACE', // { key }
  STRINGS_DUPLICATE_KEY:    'STRINGS_DUPLICATE_KEY',     // { key }
  STRINGS_MISSING_SCOPE:    'STRINGS_MISSING_SCOPE',     // { file }

  // strings-check.js
  STRINGS_MISSING_EN:       'STRINGS_MISSING_EN',        // { key, file }
  STRINGS_REMAP:            'STRINGS_REMAP',             // { key, newKey, reason }
  STRINGS_DELETED:          'STRINGS_DELETED',           // { key }
  STRINGS_STALE_TRANSLATION:'STRINGS_STALE_TRANSLATION', // { key, langs }
  STRINGS_QUARANTINE:       'STRINGS_QUARANTINE',        // { key }

  // arc-nav.js (browser)
  ARC_NAV_WARN:             'ARC_NAV_WARN',              // { detail }
  ARC_NAV_INDEX_NOT_LOADED: 'ARC_NAV_INDEX_NOT_LOADED',  // {}

  // vextreme-index-v2.js (browser)
  INDEX_PARSE_FAILED:       'INDEX_PARSE_FAILED',        // { error }
  INDEX_HTTP_ERROR:         'INDEX_HTTP_ERROR',          // { status }
  INDEX_FETCH_FAILED:       'INDEX_FETCH_FAILED',        // {}
  STRINGS_PARSE_FAILED:     'STRINGS_PARSE_FAILED',      // { error }
  STRINGS_HTTP_ERROR:       'STRINGS_HTTP_ERROR',        // { status }
  STRINGS_FETCH_FAILED:     'STRINGS_FETCH_FAILED',      // {}
  UNKNOWN_RENDER_MODE:      'UNKNOWN_RENDER_MODE',       // { renderMode, arcName }
};

module.exports = { CODES };

// [VXG RealForever]
