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
const TERRAIN_ENTRY = '/Vextreme/pages/terrain-map.html?view=content&profile=evolution-v1';
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
  let relative = normalized.replace(/^\/+/, '');
  if (relative === 'Vextreme') relative = 'index.html';
  else if (relative.startsWith('Vextreme/')) relative = relative.slice('Vextreme/'.length);
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
  const responseErrors = [];
  const loadingFailures = [];
  const requestUrls = new Map();

  cdp.on('Runtime.exceptionThrown', params => {
    errors.push(params.exceptionDetails && params.exceptionDetails.text
      ? params.exceptionDetails.text
      : 'Runtime exception');
  }, sessionId);

  cdp.on('Log.entryAdded', params => {
    const entry = params.entry || {};
    if (entry.level === 'error') {
      consoleErrors.push({
        text: entry.text || 'Log error',
        source: entry.source || null,
        url: entry.url || null
      });
    }
  }, sessionId);

  cdp.on('Network.requestWillBeSent', params => {
    if (params.requestId && params.request && params.request.url) {
      requestUrls.set(params.requestId, params.request.url);
    }
  }, sessionId);

  cdp.on('Network.responseReceived', params => {
    const response = params.response || {};
    if (Number(response.status) >= 400) {
      responseErrors.push({
        url: response.url || requestUrls.get(params.requestId) || null,
        status: Number(response.status),
        statusText: response.statusText || null,
        type: params.type || null,
        mimeType: response.mimeType || null
      });
    }
  }, sessionId);

  cdp.on('Network.loadingFailed', params => {
    loadingFailures.push({
      url: requestUrls.get(params.requestId) || null,
      errorText: params.errorText || null,
      blockedReason: params.blockedReason || null,
      canceled: params.canceled === true,
      type: params.type || null
    });
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
  return {
    sessionId,
    errors,
    consoleErrors,
    responseErrors,
    loadingFailures
  };
}

function urlPathname(value) {
  if (typeof value !== 'string' || !value) return null;
  try { return new URL(value).pathname; }
  catch (_) { return null; }
}

function isExpectedProofBlockedUrl(value) {
  return typeof value === 'string' && (
    value.startsWith('https://fonts.googleapis.com/') ||
    value.startsWith('https://fonts.gstatic.com/')
  );
}

function classifyPageSignals(page, options) {
  options = options || {};
  const benignResponseErrors = page.responseErrors.filter(entry =>
    entry.status === 404 && urlPathname(entry.url) === '/favicon.ico'
  );
  const blockingResponseErrors = page.responseErrors.filter(entry =>
    !(entry.status === 404 && urlPathname(entry.url) === '/favicon.ico')
  );

  const navigationSupersededDocumentAborts = options.allowSingleSupersededDocumentAbort === true
    ? page.loadingFailures.filter(entry =>
        entry.url == null &&
        entry.errorText === 'net::ERR_ABORTED' &&
        entry.blockedReason == null &&
        entry.canceled === true &&
        entry.type === 'Document'
      )
    : [];
  if (navigationSupersededDocumentAborts.length > 1) {
    fail(
      'VEXSYSTEM_BROWSER_MULTIPLE_NAVIGATION_ABORTS',
      'More than one canceled top-level document was observed during the admitted Terrain -> VexSystem handoff.',
      { navigationSupersededDocumentAborts }
    );
  }
  const navigationAbortSet = new Set(navigationSupersededDocumentAborts);
  const expectedLoadingFailures = page.loadingFailures.filter(entry =>
    isExpectedProofBlockedUrl(entry.url)
  );
  const blockingLoadingFailures = page.loadingFailures.filter(entry =>
    !isExpectedProofBlockedUrl(entry.url) && !navigationAbortSet.has(entry)
  );

  const directlyBenignConsoleErrors = page.consoleErrors.filter(entry =>
    entry.source === 'network' &&
    /404/.test(entry.text || '') &&
    urlPathname(entry.url) === '/favicon.ico'
  );
  const directlyExpectedBlockedConsoleErrors = page.consoleErrors.filter(entry =>
    entry.source === 'network' &&
    isExpectedProofBlockedUrl(entry.url)
  );

  const accountedConsole = new Set([
    ...directlyBenignConsoleErrors,
    ...directlyExpectedBlockedConsoleErrors
  ]);
  const unresolvedConsoleErrors = page.consoleErrors.filter(entry => !accountedConsole.has(entry));

  const faviconOnlyNetwork404 =
    blockingResponseErrors.length === 0 &&
    benignResponseErrors.length > 0;
  const correlatedFaviconConsoleErrors = faviconOnlyNetwork404
    ? unresolvedConsoleErrors.filter(entry =>
        entry.source === 'network' &&
        /404/.test(entry.text || '') &&
        !entry.url
      )
    : [];
  const correlatedSet = new Set(correlatedFaviconConsoleErrors);
  const blockingConsoleErrors = unresolvedConsoleErrors.filter(entry => !correlatedSet.has(entry));

  return {
    benignBrowserNoise: {
      favicon404Responses: benignResponseErrors,
      favicon404ConsoleErrors: [
        ...directlyBenignConsoleErrors,
        ...correlatedFaviconConsoleErrors
      ],
      expectedProofBlockedLoads: expectedLoadingFailures,
      navigationSupersededDocumentAborts,
      expectedProofBlockedConsoleErrors: directlyExpectedBlockedConsoleErrors
    },
    blocking: {
      runtimeExceptions: [...page.errors],
      consoleErrors: blockingConsoleErrors,
      responseErrors: blockingResponseErrors,
      loadingFailures: blockingLoadingFailures
    }
  };
}

function assertPageSignals(page, label, options) {
  const signals = classifyPageSignals(page, options);
  const blocking = signals.blocking;
  if (
    blocking.runtimeExceptions.length ||
    blocking.consoleErrors.length ||
    blocking.responseErrors.length ||
    blocking.loadingFailures.length
  ) {
    fail(
      'VEXSYSTEM_BROWSER_PAGE_ERRORS',
      'Browser emitted blocking runtime/network evidence: ' + label,
      { label, signals }
    );
  }
  return signals;
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
    "document.readyState === 'complete' && document.querySelectorAll('.vs-text-node').length > 0 && document.querySelectorAll('.vs-route-card').length > 0 && document.querySelector('[data-question][aria-pressed=\"true\"]') && document.querySelector('#view-answer') && !document.querySelector('#view-answer').textContent.includes('Loading') && document.querySelector('#understanding-title') && !document.querySelector('#understanding-title').textContent.includes('Loading') && document.querySelector('#map-status') && !document.querySelector('#map-status').textContent.includes('Loading')",
    'VexSystem explorer readiness'
  );
}

async function runtimeSnapshot(cdp, page) {
  const expression = "(() => {" +
    "const url = new URL(location.href);" +
    "const activeQuestion = document.querySelector('[data-question][aria-pressed=\"true\"]');" +
    "const questionPrompt = document.querySelector('#view-question');" +
    "const questionAnswer = document.querySelector('#view-answer');" +
    "const mapWorld = document.querySelector('#map-world');" +
    "const understanding = document.querySelector('[data-vexsystem-component=\"composed-understanding\"]');" +
    "const understandingTitle = document.querySelector('#understanding-title');" +
    "const understandingPurpose = document.querySelector('#understanding-purpose');" +
    "const currentAnswer = document.querySelector('#current-answer-heading');" +
    "const explore = document.querySelector('.vs-explore');" +
    "const map = document.querySelector('#vexsystem-map');" +
    "const rect = node => node ? node.getBoundingClientRect() : null;" +
    "return {" +
      "title: document.title," +
      "pathname: url.pathname," +
      "selected: url.searchParams.get('subject')," +
      "lens: url.searchParams.get('lens')," +
      "question: url.searchParams.get('question')," +
      "level: url.searchParams.get('level')," +
      "search: url.search," +
      "mapTransform: mapWorld?.getAttribute('transform') || null," +
      "activeQuestion: activeQuestion && activeQuestion.dataset.question," +
      "questionPrompt: questionPrompt?.textContent || null," +
      "questionAnswer: questionAnswer?.textContent || null," +
      "svgRelations: document.querySelectorAll('.vs-edge').length," +
      "understandingPresent: Boolean(understanding)," +
      "understandingTitle: understandingTitle?.textContent || null," +
      "understandingPurpose: understandingPurpose?.textContent || null," +
      "routeCards: document.querySelectorAll('.vs-route-card').length," +
      "proofCards: document.querySelectorAll('.vs-proof-item').length," +
      "understandingTop: rect(understanding)?.top ?? null," +
      "purposeBottom: rect(understandingPurpose)?.bottom ?? null," +
      "currentAnswerTop: rect(currentAnswer)?.top ?? null," +
      "exploreTop: rect(explore)?.top ?? null," +
      "mapTop: rect(map)?.top ?? null," +
      "viewportHeight: window.innerHeight," +
      "scrollY: window.scrollY," +
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
  if (!snapshot.activeQuestion || !snapshot.questionPrompt || !snapshot.questionAnswer) {
    fail('VEXSYSTEM_BROWSER_HUMAN_QUESTION_MISSING', label, snapshot);
  }
  if (
    !snapshot.understandingPresent ||
    !snapshot.understandingTitle ||
    !snapshot.understandingPurpose ||
    snapshot.routeCards < 1 ||
    snapshot.proofCards < 1
  ) {
    fail(
      'VEXSYSTEM_BROWSER_COMPOSED_UNDERSTANDING_MISSING',
      'The source-derived subject understanding is not materially present before exploration.',
      { label, snapshot }
    );
  }
  if (
    snapshot.exploreTop == null ||
    snapshot.mapTop == null ||
    snapshot.understandingTop == null ||
    snapshot.exploreTop <= snapshot.understandingTop ||
    snapshot.mapTop <= snapshot.understandingTop
  ) {
    fail(
      'VEXSYSTEM_BROWSER_GRAPH_PRECEDES_UNDERSTANDING',
      'Optional exploration appeared before the composed understanding.',
      { label, snapshot }
    );
  }
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

async function readyTerrainArrival(cdp, page) {
  await waitFor(
    cdp,
    page.sessionId,
    "document.readyState === 'complete' && document.querySelector('[data-terrain-entry=\"arrival\"]') && document.querySelector('[data-entry-action=\"vexsystem\"]')",
    'Terrain VexSystem arrival readiness'
  );
}

async function terrainArrivalSnapshot(cdp, page) {
  const expression = "(() => {" +
    "const contract = JSON.parse(document.querySelector('#terrain-entry-contract')?.textContent || '{}');" +
    "const choice = (contract.choices || []).find(item => item.id === 'vexsystem') || null;" +
    "const button = document.querySelector('[data-entry-action=\"vexsystem\"]');" +
    "const reader = document.querySelector('#evolutionReader');" +
    "const rect = button ? button.getBoundingClientRect() : null;" +
    "return {" +
      "pathname: location.pathname," +
      "entryPresent: Boolean(document.querySelector('[data-terrain-entry=\"arrival\"]'))," +
      "choiceCount: document.querySelectorAll('[data-entry-action]').length," +
      "enabledChoiceCount: [...document.querySelectorAll('[data-entry-action]')].filter(node => !node.disabled).length," +
      "vexsystemButtonPresent: Boolean(button)," +
      "vexsystemButtonDisabled: button ? button.disabled : null," +
      "vexsystemAriaDisabled: button ? button.getAttribute('aria-disabled') : null," +
      "vexsystemCopy: button ? button.textContent : null," +
      "choiceEffect: choice ? choice.effect : null," +
      "choicePath: choice ? choice.path : null," +
      "choiceEnabled: choice ? choice.enabled : null," +
      "readerHidden: reader ? reader.hidden === true : null," +
      "buttonCenterX: rect ? rect.left + rect.width / 2 : null," +
      "buttonCenterY: rect ? rect.top + rect.height / 2 : null," +
      "buttonVisible: rect ? rect.bottom > 0 && rect.top < window.innerHeight : false," +
      "bodyWidth: document.documentElement.scrollWidth," +
      "viewportWidth: document.documentElement.clientWidth," +
      "horizontalOverflow: Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth)" +
    "};" +
  "})()";
  return evaluate(cdp, page.sessionId, expression);
}

function assertTerrainArrivalSnapshot(snapshot, label) {
  if (!snapshot.entryPresent || !snapshot.vexsystemButtonPresent) {
    fail('VEXSYSTEM_BROWSER_TERRAIN_ENTRY_MISSING', label, snapshot);
  }
  if (
    snapshot.choiceCount !== 3 ||
    snapshot.enabledChoiceCount !== 3 ||
    snapshot.vexsystemButtonDisabled !== false ||
    snapshot.vexsystemAriaDisabled === 'true'
  ) {
    fail('VEXSYSTEM_BROWSER_TERRAIN_VEXSYSTEM_NOT_ACTIVE', label, snapshot);
  }
  if (
    snapshot.choiceEffect !== 'vexsystem-learning-world' ||
    snapshot.choicePath !== '../vexsystem/' ||
    snapshot.choiceEnabled !== true
  ) {
    fail('VEXSYSTEM_BROWSER_TERRAIN_CONTRACT_MISMATCH', label, snapshot);
  }
  if (snapshot.readerHidden !== true) {
    fail('VEXSYSTEM_BROWSER_TERRAIN_READER_OWNS_VEXSYSTEM', label, snapshot);
  }
  if (snapshot.horizontalOverflow !== 0) {
    fail('VEXSYSTEM_BROWSER_TERRAIN_HORIZONTAL_OVERFLOW', label, snapshot);
  }
}

async function runTerrainEntryRuntime(origin, cdp) {
  const desktop = await createPage(cdp, origin + TERRAIN_ENTRY, {
    width: 1440,
    height: 900,
    mobile: false
  });
  await readyTerrainArrival(cdp, desktop);
  const arrival = await terrainArrivalSnapshot(cdp, desktop);
  assertTerrainArrivalSnapshot(arrival, 'Terrain desktop arrival');
  if (
    arrival.buttonCenterX == null ||
    arrival.buttonCenterY == null ||
    arrival.buttonVisible !== true
  ) {
    fail('VEXSYSTEM_BROWSER_TERRAIN_VEXSYSTEM_BUTTON_NOT_VISIBLE', 'Terrain desktop arrival', arrival);
  }

  await cdp.send('Input.dispatchMouseEvent', {
    type: 'mouseMoved',
    x: arrival.buttonCenterX,
    y: arrival.buttonCenterY,
    button: 'none'
  }, desktop.sessionId);
  await cdp.send('Input.dispatchMouseEvent', {
    type: 'mousePressed',
    x: arrival.buttonCenterX,
    y: arrival.buttonCenterY,
    button: 'left',
    clickCount: 1
  }, desktop.sessionId);
  await cdp.send('Input.dispatchMouseEvent', {
    type: 'mouseReleased',
    x: arrival.buttonCenterX,
    y: arrival.buttonCenterY,
    button: 'left',
    clickCount: 1
  }, desktop.sessionId);

  await waitFor(
    cdp,
    desktop.sessionId,
    "location.pathname === '/Vextreme/vexsystem/' || location.pathname === '/Vextreme/vexsystem/index.html'",
    'Terrain top-level VexSystem handoff'
  );
  await ready(cdp, desktop);
  const navigated = await runtimeSnapshot(cdp, desktop);
  assertRuntimeSnapshot(navigated, 'Terrain -> VexSystem destination');
  const topLevel = await evaluate(cdp, desktop.sessionId, 'window.top === window');
  if (topLevel !== true) {
    fail(
      'VEXSYSTEM_BROWSER_TERRAIN_HANDOFF_EMBEDDED',
      'Terrain handed VexSystem to an embedded reader instead of top-level navigation.',
      { arrival, navigated, topLevel }
    );
  }

  const mobile = await createPage(cdp, origin + TERRAIN_ENTRY, {
    width: 390,
    height: 844,
    mobile: true
  });
  await readyTerrainArrival(cdp, mobile);
  const mobileArrival = await terrainArrivalSnapshot(cdp, mobile);
  assertTerrainArrivalSnapshot(mobileArrival, 'Terrain mobile arrival');

  await new Promise(resolve => setTimeout(resolve, 120));
  return {
    activationPath: 'TRUSTED_POINTER_TOP_LEVEL_HANDOFF',
    desktop: {
      arrival,
      navigated,
      topLevel,
      signals: assertPageSignals(desktop, 'Terrain desktop -> VexSystem runtime', {
        allowSingleSupersededDocumentAbort:
          topLevel === true &&
          (navigated.pathname === '/Vextreme/vexsystem/' || navigated.pathname === '/Vextreme/vexsystem/index.html')
      })
    },
    mobile: {
      arrival: mobileArrival,
      signals: assertPageSignals(mobile, 'Terrain mobile arrival runtime', {
        allowSingleSupersededDocumentAbort:
          mobileArrival.entryPresent === true &&
          mobileArrival.pathname === '/Vextreme/pages/terrain-map.html'
      })
    }
  };
}


async function proveMapCameraIsPresentationOnly(cdp, page) {
  const before = await runtimeSnapshot(cdp, page);
  await evaluate(
    cdp,
    page.sessionId,
    "window.__vexMapFitTransform = document.querySelector('#map-world').getAttribute('transform')"
  );
  const target = await evaluate(
    cdp,
    page.sessionId,
    "(() => {" +
      "const map = document.querySelector('#vexsystem-map');" +
      "const rect = map.getBoundingClientRect();" +
      "return {" +
        "x: rect.left + Math.min(70, rect.width * 0.1)," +
        "y: rect.top + Math.min(70, rect.height * 0.1)," +
        "centerX: rect.left + rect.width / 2," +
        "centerY: rect.top + rect.height / 2" +
      "};" +
    "})()"
  );

  await evaluate(
    cdp,
    page.sessionId,
    "(() => {" +
      "const map = document.querySelector('#vexsystem-map');" +
      "window.__vexMapPointerProbe = [];" +
      "for (const type of ['pointerdown', 'pointermove', 'pointerup']) {" +
        "map.addEventListener(type, event => {" +
          "window.__vexMapPointerProbe.push({" +
            "type," +
            "isTrusted: event.isTrusted === true," +
            "pointerType: event.pointerType || null," +
            "button: event.button," +
            "buttons: event.buttons" +
          "});" +
        "});" +
      "}" +
      "return true;" +
    "})()"
  );
  await cdp.send('Input.dispatchMouseEvent', {
    type: 'mouseMoved',
    x: target.x,
    y: target.y,
    button: 'none',
    buttons: 0,
    pointerType: 'mouse'
  }, page.sessionId);
  await cdp.send('Input.dispatchMouseEvent', {
    type: 'mousePressed',
    x: target.x,
    y: target.y,
    button: 'left',
    buttons: 1,
    clickCount: 1,
    pointerType: 'mouse'
  }, page.sessionId);
  await cdp.send('Input.dispatchMouseEvent', {
    type: 'mouseMoved',
    x: target.x + 72,
    y: target.y + 38,
    button: 'left',
    buttons: 1,
    pointerType: 'mouse'
  }, page.sessionId);
  await cdp.send('Input.dispatchMouseEvent', {
    type: 'mouseReleased',
    x: target.x + 72,
    y: target.y + 38,
    button: 'left',
    buttons: 0,
    clickCount: 1,
    pointerType: 'mouse'
  }, page.sessionId);
  await waitFor(
    cdp,
    page.sessionId,
    "document.querySelector('#map-world').getAttribute('transform') !== window.__vexMapFitTransform",
    'relationship map drag'
  );
  const pointerProbe = await evaluate(
    cdp,
    page.sessionId,
    "window.__vexMapPointerProbe || []"
  );
  const trustedPointerDown = pointerProbe.some(event =>
    event.type === 'pointerdown' &&
    event.isTrusted === true &&
    event.pointerType === 'mouse' &&
    event.buttons === 1
  );
  const trustedPointerMove = pointerProbe.some(event =>
    event.type === 'pointermove' &&
    event.isTrusted === true &&
    event.pointerType === 'mouse' &&
    event.buttons === 1
  );
  const trustedPointerUp = pointerProbe.some(event =>
    event.type === 'pointerup' &&
    event.isTrusted === true &&
    event.pointerType === 'mouse' &&
    event.buttons === 0
  );
  if (!trustedPointerDown || !trustedPointerMove || !trustedPointerUp) {
    fail(
      'VEXSYSTEM_BROWSER_TRUSTED_MAP_DRAG_MISSING',
      'The relationship map did not receive the required trusted pointer drag sequence.',
      { pointerProbe, trustedPointerDown, trustedPointerMove, trustedPointerUp }
    );
  }

  const panned = await runtimeSnapshot(cdp, page);
  if (panned.selected !== before.selected || panned.question !== before.question || panned.level !== before.level || panned.search !== before.search) {
    fail('VEXSYSTEM_BROWSER_MAP_PAN_SEMANTIC_MUTATION', 'Dragging the relationship map changed semantic state.', { before, panned });
  }

  await evaluate(
    cdp,
    page.sessionId,
    "window.__vexMapPannedTransform = document.querySelector('#map-world').getAttribute('transform')"
  );
  await cdp.send('Input.dispatchMouseEvent', {
    type: 'mouseWheel',
    x: target.centerX,
    y: target.centerY,
    deltaX: 0,
    deltaY: -260
  }, page.sessionId);
  await waitFor(
    cdp,
    page.sessionId,
    "document.querySelector('#map-world').getAttribute('transform') !== window.__vexMapPannedTransform",
    'relationship map wheel zoom'
  );
  const zoomed = await runtimeSnapshot(cdp, page);
  if (zoomed.selected !== before.selected || zoomed.question !== before.question || zoomed.level !== before.level || zoomed.search !== before.search) {
    fail('VEXSYSTEM_BROWSER_MAP_ZOOM_SEMANTIC_MUTATION', 'Zooming the relationship map changed semantic state.', { before, zoomed });
  }

  await evaluate(cdp, page.sessionId, "document.querySelector('#map-fit').click()");
  await waitFor(
    cdp,
    page.sessionId,
    "document.querySelector('#map-world').getAttribute('transform') === window.__vexMapFitTransform",
    'fit current question'
  );
  await evaluate(cdp, page.sessionId, "document.querySelector('#map-reset').click()");
  await waitFor(
    cdp,
    page.sessionId,
    "document.querySelector('#map-world').getAttribute('transform') === 'matrix(1 0 0 1 0 0)'",
    'reset relationship map'
  );
  await evaluate(cdp, page.sessionId, "document.querySelector('#map-fit').click()");

  return {
    before,
    panned,
    zoomed,
    pointerProbe,
    trustedPointerDown,
    trustedPointerMove,
    trustedPointerUp
  };
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
  const initialUnderstanding = {
    title: initial.understandingTitle,
    purpose: initial.understandingPurpose,
    routeCards: initial.routeCards,
    proofCards: initial.proofCards
  };

  await evaluate(
    cdp,
    desktop.sessionId,
    "document.querySelector('[data-question=\"HEALTHY\"]').click()"
  );
  await waitFor(
    cdp,
    desktop.sessionId,
    "new URL(location.href).searchParams.get('question') === 'HEALTHY'",
    'Health question'
  );
  const health = await runtimeSnapshot(cdp, desktop);
  assertRuntimeSnapshot(health, 'desktop health');
  if (health.selected !== initialSubject) {
    fail('VEXSYSTEM_BROWSER_QUESTION_TELEPORT', 'Changing the human question changed selected subject.', { initial, health });
  }
  if (health.questionAnswer === initial.questionAnswer || health.svgRelations === initial.svgRelations) {
    fail('VEXSYSTEM_BROWSER_QUESTION_CONSEQUENCE_MISSING', 'Changing the human question did not materially change the answer and relationship projection.', { initial, health });
  }

  await evaluate(
    cdp,
    desktop.sessionId,
    "document.querySelector('[data-question=\"HISTORY\"]').click()"
  );
  await waitFor(
    cdp,
    desktop.sessionId,
    "new URL(location.href).searchParams.get('question') === 'HISTORY'",
    'History question'
  );
  const formation = await runtimeSnapshot(cdp, desktop);
  assertRuntimeSnapshot(formation, 'desktop history');
  if (formation.selected !== initialSubject) {
    fail('VEXSYSTEM_BROWSER_QUESTION_TELEPORT', 'Changing the human question changed selected subject.', { initial, formation });
  }
  const formationUnderstanding = {
    title: formation.understandingTitle,
    purpose: formation.understandingPurpose,
    routeCards: formation.routeCards,
    proofCards: formation.proofCards
  };
  if (JSON.stringify(formationUnderstanding) !== JSON.stringify(initialUnderstanding)) {
    fail(
      'VEXSYSTEM_BROWSER_WHOLE_ERASED_BY_FOCUS',
      'Changing the human question altered or erased the composed subject understanding.',
      { initialUnderstanding, formationUnderstanding }
    );
  }

  const formationText = await evaluate(
    cdp,
    desktop.sessionId,
    "document.querySelector('#text-node-list').innerText"
  );
  if (!/PR #196/.test(formationText) || !/PR #200/.test(formationText)) {
    fail(
      'VEXSYSTEM_BROWSER_FORMATION_HISTORY_MISSING',
      'History question did not expose bounded PR #196/#200 history.'
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
    "document.querySelector('[data-question=\"PUT_TOGETHER\"]').click()"
  );
  await waitFor(
    cdp,
    desktop.sessionId,
    "new URL(location.href).searchParams.get('question') === 'PUT_TOGETHER'",
    'Structure question'
  );

  const mapInteraction = await proveMapCameraIsPresentationOnly(cdp, desktop);

  await cdp.send('Page.bringToFront', {}, desktop.sessionId);
  await waitFor(
    cdp,
    desktop.sessionId,
    "document.hasFocus() === true",
    'foreground page focus'
  );

  const keyboardTarget = await evaluate(
    cdp,
    desktop.sessionId,
    "(() => {" +
      "const current = new URL(location.href).searchParams.get('subject');" +
      "const target = [...document.querySelectorAll('.vs-text-node')].find(node => node.dataset.subjectRef && node.dataset.subjectRef !== current);" +
      "if (!target) return null;" +
      "window.__vexKeyboardProbe = [];" +
      "for (const type of ['keydown', 'keyup', 'click']) {" +
        "target.addEventListener(type, event => {" +
          "window.__vexKeyboardProbe.push({" +
            "type," +
            "isTrusted: event.isTrusted === true," +
            "key: event.key || null," +
            "code: event.code || null," +
            "detail: typeof event.detail === 'number' ? event.detail : null" +
          "});" +
        "});" +
      "}" +
      "target.focus();" +
      "const rect = target.getBoundingClientRect();" +
      "return {" +
        "subjectRef: target.dataset.subjectRef," +
        "focused: document.activeElement === target," +
        "pageFocused: document.hasFocus() === true," +
        "tagName: target.tagName," +
        "disabled: target.disabled === true," +
        "tabIndex: target.tabIndex," +
        "centerX: rect.left + rect.width / 2," +
        "centerY: rect.top + rect.height / 2," +
        "width: rect.width," +
        "height: rect.height" +
      "};" +
    "})()"
  );

  if (!keyboardTarget || !keyboardTarget.subjectRef) {
    fail('VEXSYSTEM_BROWSER_KEYBOARD_TARGET_MISSING', 'No alternate text-view node was available.');
  }
  if (!keyboardTarget.pageFocused) {
    fail('VEXSYSTEM_BROWSER_PAGE_FOCUS_FAILED', 'The VexSystem page was not foreground-focused before keyboard proof.', keyboardTarget);
  }
  if (keyboardTarget.tagName !== 'BUTTON' || keyboardTarget.disabled || keyboardTarget.tabIndex < 0) {
    fail(
      'VEXSYSTEM_BROWSER_NATIVE_BUTTON_REQUIRED',
      'The equivalent text-view target must remain an enabled focusable native button.',
      keyboardTarget
    );
  }
  if (!keyboardTarget.focused) {
    fail('VEXSYSTEM_BROWSER_KEYBOARD_FOCUS_FAILED', 'The native text-view button could not receive focus.', keyboardTarget);
  }
  if (!(keyboardTarget.width > 0 && keyboardTarget.height > 0)) {
    fail('VEXSYSTEM_BROWSER_ACTIVATION_TARGET_NOT_RENDERED', 'The native text-view button has no rendered activation area.', keyboardTarget);
  }

  await cdp.send('Input.dispatchKeyEvent', {
    type: 'keyDown',
    modifiers: 0,
    windowsVirtualKeyCode: 13,
    code: 'Enter',
    key: 'Enter',
    text: '\\r',
    unmodifiedText: '\\r',
    autoRepeat: false,
    location: 0,
    isKeypad: false,
    commands: []
  }, desktop.sessionId);
  await cdp.send('Input.dispatchKeyEvent', {
    type: 'keyUp',
    modifiers: 0,
    key: 'Enter',
    windowsVirtualKeyCode: 13,
    code: 'Enter',
    location: 0
  }, desktop.sessionId);

  await new Promise(resolve => setTimeout(resolve, 250));

  let keyboardObservation = await evaluate(
    cdp,
    desktop.sessionId,
    "(() => ({" +
      "selected: new URL(location.href).searchParams.get('subject')," +
      "documentHasFocus: document.hasFocus() === true," +
      "activeElementSubjectRef: document.activeElement && document.activeElement.dataset ? (document.activeElement.dataset.subjectRef || null) : null," +
      "probe: window.__vexKeyboardProbe || []" +
    "}))()"
  );

  const initialKeyboardProbe = keyboardObservation.probe || [];
  const trustedKeydown = initialKeyboardProbe.some(event =>
    event.type === 'keydown' &&
    event.isTrusted === true &&
    event.key === 'Enter' &&
    event.code === 'Enter'
  );
  const trustedKeyup = initialKeyboardProbe.some(event =>
    event.type === 'keyup' &&
    event.isTrusted === true &&
    event.key === 'Enter' &&
    event.code === 'Enter'
  );
  if (!trustedKeydown || !trustedKeyup) {
    fail(
      'VEXSYSTEM_BROWSER_KEYBOARD_RECEPTION_MISSING',
      'The focused native button did not receive the required trusted Enter keydown/keyup pair.',
      { keyboardTarget, keyboardObservation, trustedKeydown, trustedKeyup }
    );
  }

  const trustedKeyboardClick = initialKeyboardProbe.some(event =>
    event.type === 'click' &&
    event.isTrusted === true &&
    event.detail === 0
  );
  const directKeyboardSemanticActivation =
    trustedKeyboardClick &&
    keyboardObservation.selected === keyboardTarget.subjectRef;

  if (trustedKeyboardClick && !directKeyboardSemanticActivation) {
    fail(
      'VEXSYSTEM_BROWSER_NATIVE_CLICK_SEMANTIC_SELECTION_MISSING',
      'A trusted browser-generated keyboard click occurred but did not advance semantic selection.',
      { keyboardTarget, keyboardObservation }
    );
  }

  let activationPath = directKeyboardSemanticActivation
    ? 'DIRECT_KEYBOARD_ACTIVATION_OBSERVED'
    : 'TRUSTED_POINTER_ACTIVATION_AFTER_KEYBOARD_READINESS';

  if (!directKeyboardSemanticActivation) {
    await cdp.send('Input.dispatchMouseEvent', {
      type: 'mouseMoved',
      x: keyboardTarget.centerX,
      y: keyboardTarget.centerY,
      button: 'none'
    }, desktop.sessionId);
    await cdp.send('Input.dispatchMouseEvent', {
      type: 'mousePressed',
      x: keyboardTarget.centerX,
      y: keyboardTarget.centerY,
      button: 'left',
      clickCount: 1
    }, desktop.sessionId);
    await cdp.send('Input.dispatchMouseEvent', {
      type: 'mouseReleased',
      x: keyboardTarget.centerX,
      y: keyboardTarget.centerY,
      button: 'left',
      clickCount: 1
    }, desktop.sessionId);

    const activationDeadline = Date.now() + 3000;
    while (Date.now() < activationDeadline) {
      keyboardObservation = await evaluate(
        cdp,
        desktop.sessionId,
        "(() => ({" +
          "selected: new URL(location.href).searchParams.get('subject')," +
          "documentHasFocus: document.hasFocus() === true," +
          "activeElementSubjectRef: document.activeElement && document.activeElement.dataset ? (document.activeElement.dataset.subjectRef || null) : null," +
          "probe: window.__vexKeyboardProbe || []" +
        "}))()"
      );
      if (keyboardObservation && keyboardObservation.selected === keyboardTarget.subjectRef) break;
      await new Promise(resolve => setTimeout(resolve, 75));
    }

    const pointerClickObserved = (keyboardObservation.probe || []).some(event =>
      event.type === 'click' &&
      event.isTrusted === true &&
      event.detail >= 1
    );
    if (
      !pointerClickObserved ||
      !keyboardObservation ||
      keyboardObservation.selected !== keyboardTarget.subjectRef
    ) {
      fail(
        'VEXSYSTEM_BROWSER_POINTER_ACTIVATION_MISSING',
        'Trusted pointer input did not activate the native text-view button and advance semantic selection.',
        { keyboardTarget, keyboardObservation, pointerClickObserved }
      );
    }
  }

  const keyboardProbe = keyboardObservation.probe || [];
  const keyboardSemantics = {
    nativeButton: keyboardTarget.tagName === 'BUTTON',
    enabled: keyboardTarget.disabled === false,
    focusable: keyboardTarget.tabIndex >= 0,
    pageFocused: keyboardTarget.pageFocused === true,
    targetFocused: keyboardTarget.focused === true,
    trustedKeydown,
    trustedKeyup,
    defaultClickObserved: trustedKeyboardClick,
    directSemanticActivationObserved: directKeyboardSemanticActivation,
    claim: directKeyboardSemanticActivation
      ? 'DIRECT_KEYBOARD_ACTIVATION_OBSERVED'
      : 'NATIVE_KEYBOARD_READY_TRUSTED_KEYS_OBSERVED__HEADLESS_CDP_DEFAULT_ACTION_NOT_CLAIMED'
  };

  const mobile = await createPage(cdp, origin + ENTRY, {
    width: 390,
    height: 844,
    mobile: true
  });
  await ready(cdp, mobile);
  const mobileSnapshot = await runtimeSnapshot(cdp, mobile);
  assertRuntimeSnapshot(mobileSnapshot, 'mobile initial');
  if (
    mobileSnapshot.purposeBottom == null ||
    mobileSnapshot.currentAnswerTop == null ||
    mobileSnapshot.viewportHeight == null ||
    mobileSnapshot.purposeBottom > mobileSnapshot.viewportHeight ||
    mobileSnapshot.currentAnswerTop > mobileSnapshot.viewportHeight
  ) {
    fail(
      'VEXSYSTEM_BROWSER_MOBILE_FIRST_FOLD_MEANING_MISSING',
      'The first mobile viewport did not reach useful subject meaning before optional exploration.',
      { mobileSnapshot }
    );
  }

  const terrainEntry = await runTerrainEntryRuntime(origin, cdp);

  await new Promise(resolve => setTimeout(resolve, 150));
  const desktopSignals = assertPageSignals(desktop, 'desktop runtime');
  const mobileSignals = assertPageSignals(mobile, 'mobile runtime');

  const findings = {
    state: 'PASS',
    browserRuntime: 'CHROMIUM_DEVTOOLS_PROTOCOL_PIPE',
    installOrDownloadAttempted: false,
    desktop: {
      initial,
      health,
      formation,
      zoomed,
      mapInteraction,
      keyboardSelectionTarget: keyboardTarget.subjectRef,
      keyboardProbe,
      keyboardObservation,
      keyboardSemantics,
      activationPath,
      signals: desktopSignals
    },
    mobile: {
      initial: mobileSnapshot,
      signals: mobileSignals
    },
    terrainEntry
  };

  return findings;
}


async function placeExplorerInViewport(cdp, page, label) {
  await evaluate(
    cdp,
    page.sessionId,
    "(() => {" +
      "const target = document.querySelector('.vs-explore');" +
      "if (!target) return false;" +
      "const top = Math.max(0, target.getBoundingClientRect().top + window.scrollY - 70);" +
      "window.scrollTo(0, top);" +
      "return true;" +
    "})()"
  );
  await waitFor(
    cdp,
    page.sessionId,
    "window.scrollY > 0 && document.querySelector('.vs-explore') && document.querySelector('.vs-explore').getBoundingClientRect().top >= 50 && document.querySelector('.vs-explore').getBoundingClientRect().top <= 120",
    label
  );
}

async function applyScenario(cdp, page, scenario) {
  if (scenario === 'formation-desktop' || scenario === 'history-desktop') {
    await evaluate(
      cdp,
      page.sessionId,
      "document.querySelector('[data-question=\"HISTORY\"]').click()"
    );
    await waitFor(
      cdp,
      page.sessionId,
      "new URL(location.href).searchParams.get('question') === 'HISTORY'",
      scenario
    );
    await placeExplorerInViewport(cdp, page, 'History explorer viewport');
    return;
  }

  if (
    scenario === 'blueprint-desktop' ||
    scenario === 'blueprint-mobile' ||
    scenario === 'receiver-desktop' ||
    scenario === 'receiver-mobile' ||
    scenario === 'receiver-map-desktop' ||
    scenario === 'receiver-map-mobile'
  ) {
    await evaluate(
      cdp,
      page.sessionId,
      "document.querySelector('[data-question=\"PUT_TOGETHER\"]').click()"
    );
    await waitFor(
      cdp,
      page.sessionId,
      "new URL(location.href).searchParams.get('question') === 'PUT_TOGETHER'",
      scenario
    );
    if (scenario === 'receiver-map-desktop' || scenario === 'receiver-map-mobile') {
      await placeExplorerInViewport(cdp, page, 'Receiver-first explorer viewport');
    }
    return;
  }

  if (scenario === 'health-map-desktop') {
    await evaluate(
      cdp,
      page.sessionId,
      "document.querySelector('[data-question=\"HEALTHY\"]').click()"
    );
    await waitFor(
      cdp,
      page.sessionId,
      "new URL(location.href).searchParams.get('question') === 'HEALTHY'",
      scenario
    );
    await placeExplorerInViewport(cdp, page, 'Health-question explorer viewport');
  }
}

async function screenshot(origin, cdp, scenario) {
  const terrainScenario = scenario === 'terrain-entry-desktop' || scenario === 'terrain-entry-mobile';
  const mobile =
    scenario === 'blueprint-mobile' ||
    scenario === 'receiver-mobile' ||
    scenario === 'receiver-map-mobile' ||
    scenario === 'terrain-entry-mobile';
  const viewport = mobile
    ? { width: 390, height: 844, mobile: true }
    : { width: 1440, height: 900, mobile: false };

  const page = await createPage(cdp, origin + (terrainScenario ? TERRAIN_ENTRY : ENTRY), viewport);
  if (terrainScenario) await readyTerrainArrival(cdp, page);
  else {
    await ready(cdp, page);
    await applyScenario(cdp, page, scenario);
  }

  const snapshot = terrainScenario
    ? await terrainArrivalSnapshot(cdp, page)
    : await runtimeSnapshot(cdp, page);
  if (terrainScenario) assertTerrainArrivalSnapshot(snapshot, scenario);
  else assertRuntimeSnapshot(snapshot, scenario);
  if (
    (
      scenario === 'formation-desktop' ||
      scenario === 'history-desktop' ||
      scenario === 'receiver-map-desktop' ||
      scenario === 'receiver-map-mobile' ||
      scenario === 'health-map-desktop'
    ) &&
    (
      snapshot.scrollY == null ||
      snapshot.scrollY <= 0 ||
      snapshot.exploreTop == null ||
      snapshot.exploreTop < 50 ||
      snapshot.exploreTop > 120
    )
  ) {
    fail(
      'VEXSYSTEM_BROWSER_FORMATION_CAPTURE_NOT_DEEPENED',
      'Explorer screenshot did not move the receiver-first relationship surface into the captured viewport.',
      { scenario, snapshot }
    );
  }

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

  await new Promise(resolve => setTimeout(resolve, 100));
  const signals = assertPageSignals(
    page,
    'screenshot ' + scenario,
    terrainScenario
      ? {
          allowSingleSupersededDocumentAbort:
            snapshot.entryPresent === true &&
            snapshot.pathname === '/Vextreme/pages/terrain-map.html'
        }
      : undefined
  );

  return {
    state: 'PASS',
    scenario,
    mime: 'image/jpeg',
    viewport,
    snapshot,
    signals,
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
    ![
      'blueprint-desktop',
      'formation-desktop',
      'blueprint-mobile',
      'receiver-desktop',
      'history-desktop',
      'receiver-mobile',
      'receiver-map-desktop',
      'health-map-desktop',
      'receiver-map-mobile',
      'terrain-entry-desktop',
      'terrain-entry-mobile'
    ].includes(scenario)
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
