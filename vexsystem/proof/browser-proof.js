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


async function launchBrowser() {
  const executable = browserExecutable();
  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'vexsystem-cdp-'));
  const args = [
    '--headless=new',
    '--disable-gpu',
    '--disable-background-networking',
    '--disable-component-update',
    '--disable-default-apps',
    '--disable-extensions',
    '--disable-features=Translate,MediaRouter',
    '--disable-sync',
    '--metrics-recording-only',
    '--mute-audio',
    '--no-first-run',
    '--no-default-browser-check',
    '--remote-debugging-pipe',
    '--user-data-dir=' + userDataDir,
    'about:blank'
  ];

  const browser = spawn(executable, args, {
    stdio: ['ignore', 'ignore', 'pipe', 'pipe', 'pipe'],
    shell: false
  });

  if (!browser.stdio[3] || !browser.stdio[4]) {
    browser.kill('SIGKILL');
    fail('VEXSYSTEM_CDP_PIPE_UNAVAILABLE', 'Browser did not expose CDP pipe descriptors.');
  }

  const stderr = [];
  browser.stderr.on('data', chunkValue => {
    if (stderr.join('').length < 12000) stderr.push(chunkValue.toString('utf8'));
  });

  const cdp = new PipeCdp(browser, browser.stdio[4], browser.stdio[3]);
  try {
    await cdp.send('Browser.getVersion', {}, null, 15000);
  } catch (error) {
    browser.kill('SIGKILL');
    fail('VEXSYSTEM_CDP_START_FAILED', error.message, { stderr: stderr.join('').slice(-4000) });
  }

  return {
    executable,
    browser,
    cdp,
    userDataDir,
    async close() {
      try { await cdp.send('Browser.close', {}, null, 5000); } catch (_) {}
      if (!browser.killed) browser.kill('SIGTERM');
      await new Promise(resolve => setTimeout(resolve, 80));
      fs.rmSync(userDataDir, { recursive: true, force: true });
    }
  };
}

async function createPage(cdp, url, viewport) {
  const created = await cdp.send('Target.createTarget', { url: 'about:blank' });
  const attached = await cdp.send('Target.attachToTarget', {
    targetId: created.targetId,
    flatten: true
  });
  const sessionId = attached.sessionId;

  const errors = [];
  const consoleErrors = [];

  cdp.on('Runtime.exceptionThrown', params => {
    errors.push(params.exceptionDetails && params.exceptionDetails.text
      ? params.exceptionDetails.text
      : 'Runtime exception');
  }, sessionId);

  cdp.on('Log.entryAdded', params => {
    const entry = params.entry || {};
    if (entry.level === 'error') consoleErrors.push(entry.text || 'Log error');
  }, sessionId);

  await Promise.all([
    cdp.send('Page.enable', {}, sessionId),
    cdp.send('Runtime.enable', {}, sessionId),
    cdp.send('Log.enable', {}, sessionId),
    cdp.send('Network.enable', {}, sessionId)
  ]);

  await cdp.send('Network.setBlockedURLs', {
    urls: [
      'https://fonts.googleapis.com/*',
      'https://fonts.gstatic.com/*'
    ]
  }, sessionId);

  await cdp.send('Emulation.setDeviceMetricsOverride', {
    width: viewport.width,
    height: viewport.height,
    deviceScaleFactor: 1,
    mobile: viewport.mobile
  }, sessionId);

  await cdp.send('Page.navigate', { url }, sessionId);
  return { sessionId, errors, consoleErrors };
}

async function evaluate(cdp, sessionId, expression, awaitPromise) {
  const result = await cdp.send('Runtime.evaluate', {
    expression,
    awaitPromise: awaitPromise !== false,
    returnByValue: true,
    userGesture: true
  }, sessionId);

  if (result.exceptionDetails) {
    fail(
      'VEXSYSTEM_BROWSER_EVALUATION_EXCEPTION',
      result.exceptionDetails.text || 'Browser evaluation failed.',
      result.exceptionDetails
    );
  }

  return result.result ? result.result.value : undefined;
}

async function waitFor(cdp, sessionId, expression, label, timeoutMs) {
  const started = Date.now();
  const timeout = timeoutMs || 12000;
  while (Date.now() - started < timeout) {
    const value = await evaluate(cdp, sessionId, 'Boolean(' + expression + ')');
    if (value) return;
    await new Promise(resolve => setTimeout(resolve, 90));
  }
  fail('VEXSYSTEM_BROWSER_WAIT_TIMEOUT', 'Timed out waiting for ' + label);
}

async function ready(cdp, page) {
  await waitFor(
    cdp,
    page.sessionId,
    "document.readyState === 'complete' && document.querySelectorAll('.vs-text-node').length > 0 && document.querySelector('#map-status') && !document.querySelector('#map-status').textContent.includes('Loading')",
    'VexSystem explorer readiness'
  );
}

async function runtimeSnapshot(cdp, page) {
  const expression = "(() => {" +
    "const url = new URL(location.href);" +
    "const activeLens = document.querySelector('[data-lens][aria-pressed=\"true\"]');" +
    "return {" +
      "title: document.title," +
      "selected: url.searchParams.get('subject')," +
      "lens: url.searchParams.get('lens')," +
      "level: url.searchParams.get('level')," +
      "activeLens: activeLens && activeLens.dataset.lens," +
      "inspectorTitle: document.querySelector('#inspector-heading')?.textContent || null," +
      "svgNodes: document.querySelectorAll('.vs-svg-node').length," +
      "textNodes: document.querySelectorAll('.vs-text-node').length," +
      "textViewPresent: Boolean(document.querySelector('#text-node-list'))," +
      "bodyWidth: document.documentElement.scrollWidth," +
      "viewportWidth: document.documentElement.clientWidth," +
      "horizontalOverflow: Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth)," +
      "privateSdkCoordinateLeaked: /github\\.(?:issue|pull)\\.vextreme-sdk\\.\\d+/i.test(document.documentElement.innerHTML)," +
      "failureText: document.querySelector('#view-meta')?.textContent || ''" +
    "};" +
  "})()";
  return evaluate(cdp, page.sessionId, expression);
}

function assertRuntimeSnapshot(snapshot, label) {
  if (!snapshot.title || !snapshot.title.includes('Learn the VexSystem')) {
    fail('VEXSYSTEM_BROWSER_TITLE', label, snapshot);
  }
  if (!snapshot.selected) fail('VEXSYSTEM_BROWSER_SELECTED_SUBJECT_MISSING', label, snapshot);
  if (!snapshot.activeLens) fail('VEXSYSTEM_BROWSER_ACTIVE_LENS_MISSING', label, snapshot);
  if (snapshot.svgNodes < 1 || snapshot.textNodes < 1 || !snapshot.textViewPresent) {
    fail('VEXSYSTEM_BROWSER_EQUIVALENT_VIEWS_MISSING', label, snapshot);
  }
  if (snapshot.horizontalOverflow !== 0) {
    fail('VEXSYSTEM_BROWSER_HORIZONTAL_OVERFLOW', label, snapshot);
  }
  if (snapshot.privateSdkCoordinateLeaked) {
    fail('VEXSYSTEM_BROWSER_PRIVATE_COORDINATE_LEAK', label, snapshot);
  }
}

async function runRuntime(origin, cdp) {
  const desktop = await createPage(cdp, origin + ENTRY, {
    width: 1440,
    height: 900,
    mobile: false
  });
  await ready(cdp, desktop);
  const initial = await runtimeSnapshot(cdp, desktop);
  assertRuntimeSnapshot(initial, 'desktop initial');
  const initialSubject = initial.selected;

  await evaluate(
    cdp,
    desktop.sessionId,
    "document.querySelector('[data-lens=\"FORMATION\"]').click()"
  );
  await waitFor(
    cdp,
    desktop.sessionId,
    "new URL(location.href).searchParams.get('lens') === 'FORMATION'",
    'Formation lens'
  );
  const formation = await runtimeSnapshot(cdp, desktop);
  assertRuntimeSnapshot(formation, 'desktop formation');
  if (formation.selected !== initialSubject) {
    fail('VEXSYSTEM_BROWSER_LENS_TELEPORT', 'Changing lens changed selected subject.', {
      initial,
      formation
    });
  }

  const formationText = await evaluate(
    cdp,
    desktop.sessionId,
    "document.querySelector('#text-node-list').innerText"
  );
  if (!/PR #196/.test(formationText) || !/PR #200/.test(formationText)) {
    fail(
      'VEXSYSTEM_BROWSER_FORMATION_HISTORY_MISSING',
      'Formation lens did not expose bounded PR #196/#200 history.'
    );
  }

  await evaluate(cdp, desktop.sessionId, "document.querySelector('#level-in').click()");
  await waitFor(
    cdp,
    desktop.sessionId,
    "new URL(location.href).searchParams.get('level') === '4'",
    'semantic zoom to L4'
  );
  const zoomed = await runtimeSnapshot(cdp, desktop);
  if (zoomed.selected !== initialSubject) {
    fail('VEXSYSTEM_BROWSER_ZOOM_TELEPORT', 'Semantic zoom changed selected subject.', {
      initial,
      zoomed
    });
  }

  await evaluate(
    cdp,
    desktop.sessionId,
    "document.querySelector('[data-lens=\"BLUEPRINT\"]').click()"
  );
  await waitFor(
    cdp,
    desktop.sessionId,
    "new URL(location.href).searchParams.get('lens') === 'BLUEPRINT'",
    'Blueprint lens'
  );

  const keyboardTarget = await evaluate(
    cdp,
    desktop.sessionId,
    "(() => {" +
      "const current = new URL(location.href).searchParams.get('subject');" +
      "const target = [...document.querySelectorAll('.vs-text-node')].find(node => node.dataset.subjectRef && node.dataset.subjectRef !== current);" +
      "if (!target) return null;" +
      "target.focus();" +
      "target.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));" +
      "return target.dataset.subjectRef;" +
    "})()"
  );

  if (!keyboardTarget) {
    fail('VEXSYSTEM_BROWSER_KEYBOARD_TARGET_MISSING', 'No alternate text-view node was available.');
  }

  await waitFor(
    cdp,
    desktop.sessionId,
    "new URL(location.href).searchParams.get('subject') === " + JSON.stringify(keyboardTarget),
    'keyboard semantic selection'
  );

  const mobile = await createPage(cdp, origin + ENTRY, {
    width: 390,
    height: 844,
    mobile: true
  });
  await ready(cdp, mobile);
  const mobileSnapshot = await runtimeSnapshot(cdp, mobile);
  assertRuntimeSnapshot(mobileSnapshot, 'mobile initial');

  const findings = {
    state: 'PASS',
    browserRuntime: 'CHROMIUM_DEVTOOLS_PROTOCOL_PIPE',
    installOrDownloadAttempted: false,
    desktop: {
      initial,
      formation,
      zoomed,
      keyboardSelectionTarget: keyboardTarget,
      pageErrors: desktop.errors.length,
      consoleErrors: desktop.consoleErrors.length
    },
    mobile: {
      initial: mobileSnapshot,
      pageErrors: mobile.errors.length,
      consoleErrors: mobile.consoleErrors.length
    }
  };

  if (
    desktop.errors.length ||
    desktop.consoleErrors.length ||
    mobile.errors.length ||
    mobile.consoleErrors.length
  ) {
    fail('VEXSYSTEM_BROWSER_PAGE_ERRORS', 'Browser emitted runtime/console errors.', {
      findings,
      desktopErrors: desktop.errors,
      desktopConsoleErrors: desktop.consoleErrors,
      mobileErrors: mobile.errors,
      mobileConsoleErrors: mobile.consoleErrors
    });
  }

  return findings;
}


async function applyScenario(cdp, page, scenario) {
  if (scenario === 'formation-desktop') {
    await evaluate(
      cdp,
      page.sessionId,
      "document.querySelector('[data-lens=\"FORMATION\"]').click()"
    );
    await waitFor(
      cdp,
      page.sessionId,
      "new URL(location.href).searchParams.get('lens') === 'FORMATION'",
      scenario
    );
    return;
  }

  if (scenario === 'blueprint-desktop' || scenario === 'blueprint-mobile') {
    await evaluate(
      cdp,
      page.sessionId,
      "document.querySelector('[data-lens=\"BLUEPRINT\"]').click()"
    );
    await waitFor(
      cdp,
      page.sessionId,
      "new URL(location.href).searchParams.get('lens') === 'BLUEPRINT'",
      scenario
    );
  }
}

async function screenshot(origin, cdp, scenario) {
  const mobile = scenario === 'blueprint-mobile';
  const viewport = mobile
    ? { width: 390, height: 844, mobile: true }
    : { width: 1440, height: 900, mobile: false };

  const page = await createPage(cdp, origin + ENTRY, viewport);
  await ready(cdp, page);
  await applyScenario(cdp, page, scenario);

  const snapshot = await runtimeSnapshot(cdp, page);
  assertRuntimeSnapshot(snapshot, scenario);

  const image = await cdp.send(
    'Page.captureScreenshot',
    {
      format: 'jpeg',
      quality: 68,
      fromSurface: true,
      captureBeyondViewport: false
    },
    page.sessionId,
    20000
  );

  if (!image.data || image.data.length < 1000) {
    fail('VEXSYSTEM_BROWSER_SCREENSHOT_EMPTY', 'Screenshot ' + scenario + ' was empty.');
  }

  return {
    state: 'PASS',
    scenario,
    mime: 'image/jpeg',
    viewport,
    snapshot,
    base64: image.data
  };
}

async function main() {
  const mode = process.argv[2] || 'runtime';
  const scenario = process.argv[3] || 'blueprint-desktop';

  if (!['runtime', 'screenshot'].includes(mode)) {
    fail('VEXSYSTEM_BROWSER_MODE_UNSUPPORTED', 'Unsupported mode: ' + mode);
  }

  if (
    mode === 'screenshot' &&
    !['blueprint-desktop', 'formation-desktop', 'blueprint-mobile'].includes(scenario)
  ) {
    fail(
      'VEXSYSTEM_BROWSER_SCENARIO_UNSUPPORTED',
      'Unsupported screenshot scenario: ' + scenario
    );
  }

  const hosted = await startServer();
  const launched = await launchBrowser();

  try {
    const result = mode === 'runtime'
      ? await runRuntime(hosted.origin, launched.cdp)
      : await screenshot(hosted.origin, launched.cdp, scenario);

    result.browserExecutable = launched.executable;
    process.stdout.write(JSON.stringify(result) + '\n');
  } finally {
    await launched.close();
    await new Promise(resolve => hosted.server.close(resolve));
  }
}

main().catch(error => {
  const result = {
    state: 'FAIL',
    code: error.code || 'VEXSYSTEM_BROWSER_PROOF_FAILED',
    message: error.message,
    details: error.details || null,
    installOrDownloadAttempted: false
  };
  process.stderr.write(JSON.stringify(result) + '\n');
  process.exitCode = 1;
});
