#!/usr/bin/env node
/**
 * VEXTREME — vexsystem/proof/browser-proof.js
 *
 * Dependency-free browser proof for the standalone VexSystem learning surface.
 *
 * Test/evidence instrument only. It serves the exact checked-out repository
 * over loopback, launches an already-installed Chromium-family browser with
 * --remote-debugging-pipe, and speaks CDP directly. It never installs or
 * downloads a browser.
 *
 * [VXG RealForever]
 */
'use strict';

const fs = require('node:fs');
const http = require('node:http');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');

const ROOT = path.resolve(__dirname, '..', '..');
const ENTRY = '/vexsystem/index.html';
const BROWSER_CANDIDATES = [
  '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
  '/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary'
];

function fail(code, message, details) {
  const error = new Error(message || code);
  error.code = code;
  error.details = details || null;
  throw error;
}

function browserExecutable() {
  for (const candidate of BROWSER_CANDIDATES) {
    try {
      const stat = fs.statSync(candidate);
      if (stat.isFile()) return candidate;
    } catch (_) {}
  }
  fail(
    'VEXSYSTEM_BROWSER_UNAVAILABLE_NO_INSTALL_ATTEMPTED',
    'No qualified installed Chromium-family browser candidate was found.',
    { candidates: BROWSER_CANDIDATES }
  );
}

function safeFilePath(urlPath) {
  const decoded = decodeURIComponent(String(urlPath || '/').split('?')[0]);
  const normalized = path.posix.normalize(decoded);
  const relative = normalized.replace(/^\/+/, '');
  const candidate = path.resolve(ROOT, relative || 'index.html');
  if (candidate !== ROOT && !candidate.startsWith(ROOT + path.sep)) {
    fail('VEXSYSTEM_HTTP_PATH_ESCAPE', decoded);
  }
  return candidate;
}

function startServer() {
  const mime = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg'
  };
  const server = http.createServer((request, response) => {
    try {
      let target = safeFilePath(request.url);
      if (fs.existsSync(target) && fs.statSync(target).isDirectory()) {
        target = path.join(target, 'index.html');
      }
      if (!fs.existsSync(target) || !fs.statSync(target).isFile()) {
        response.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
        response.end('Not found');
        return;
      }
      const ext = path.extname(target).toLowerCase();
      response.writeHead(200, {
        'content-type': mime[ext] || 'application/octet-stream',
        'cache-control': 'no-store',
        'x-content-type-options': 'nosniff'
      });
      fs.createReadStream(target).pipe(response);
    } catch (_) {
      response.writeHead(500, { 'content-type': 'text/plain; charset=utf-8' });
      response.end('Server error');
    }
  });
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      resolve({ server, origin: 'http://127.0.0.1:' + address.port });
    });
  });
}

class PipeCdp {
  constructor(browser, readPipe, writePipe) {
    this.browser = browser;
    this.readPipe = readPipe;
    this.writePipe = writePipe;
    this.nextId = 1;
    this.pending = new Map();
    this.listeners = new Map();
    this.buffer = Buffer.alloc(0);

    readPipe.on('data', chunk => this.onData(chunk));
    readPipe.on('error', error => this.rejectAll(error));
    browser.once('exit', (code, signal) => {
      if (this.pending.size) {
        this.rejectAll(new Error('browser exited before CDP completion: code=' + code + ' signal=' + signal));
      }
    });
  }

  rejectAll(error) {
    for (const pending of this.pending.values()) pending.reject(error);
    this.pending.clear();
  }

  onData(chunk) {
    this.buffer = Buffer.concat([this.buffer, chunk]);
    while (true) {
      const index = this.buffer.indexOf(0);
      if (index < 0) break;
      const raw = this.buffer.subarray(0, index).toString('utf8');
      this.buffer = this.buffer.subarray(index + 1);
      if (!raw) continue;

      let message;
      try {
        message = JSON.parse(raw);
      } catch (error) {
        this.rejectAll(new Error('invalid CDP JSON: ' + error.message));
        continue;
      }

      if (message.id && this.pending.has(message.id)) {
        const pending = this.pending.get(message.id);
        this.pending.delete(message.id);
        if (message.error) {
          pending.reject(new Error('CDP ' + pending.method + ': ' + (message.error.message || JSON.stringify(message.error))));
        } else {
          pending.resolve(message.result || {});
        }
        continue;
      }

      const key = message.sessionId ? message.sessionId + ':' + message.method : message.method;
      const listeners = this.listeners.get(key) || [];
      for (const listener of listeners) listener(message.params || {});
    }
  }

  send(method, params, sessionId, timeoutMs) {
    const id = this.nextId++;
    const message = { id, method, params: params || {} };
    if (sessionId) message.sessionId = sessionId;
    const timeout = timeoutMs || 15000;

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error('CDP timeout: ' + method));
      }, timeout);

      this.pending.set(id, {
        method,
        resolve: value => { clearTimeout(timer); resolve(value); },
        reject: error => { clearTimeout(timer); reject(error); }
      });

      this.writePipe.write(Buffer.concat([
        Buffer.from(JSON.stringify(message), 'utf8'),
        Buffer.from([0])
      ]));
    });
  }

  on(method, listener, sessionId) {
    const key = sessionId ? sessionId + ':' + method : method;
    if (!this.listeners.has(key)) this.listeners.set(key, []);
    this.listeners.get(key).push(listener);
  }
}
