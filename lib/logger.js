'use strict';

// Structured logger for Node build scripts.
//
// Each call takes a single event object: { code, message, ...optionalFields }
// Optional fields (arc, slug, key, file, langs, error, status, etc.) are
// attached without changing the call signature — add new fields at any call
// site without touching any other.
//
// To swap the backing store (e.g. write to a DB instead of console):
//   const { logger } = require('./logger');
//   logger.warn = event => db.insert('build_events', { ...event, ts: Date.now() });

const logger = {
  warn(event) {
    console.warn(`[${event.code}]`, event.message, omit(event, ['code', 'message']));
  },
  info(event) {
    console.log(`[${event.code}]`, event.message, omit(event, ['code', 'message']));
  },
  error(event) {
    console.error(`[${event.code}]`, event.message, omit(event, ['code', 'message']));
  },
};

function omit(obj, keys) {
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    if (!keys.includes(k)) out[k] = v;
  }
  return out;
}

module.exports = { logger };

// [VXG RealForever]
