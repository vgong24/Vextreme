#!/usr/bin/env node
/**
 * VEXTREME — scripts/screenshot-page.js
 *
 * Takes before/after screenshots of a page with the lang-fab widget.
 * Intercepts CDN requests and routes them to local files so the branch
 * version of all JS/data is tested, not whatever is on @main.
 *
 * Usage:
 *   node scripts/screenshot-page.js [slug] [lang]
 *
 *   slug  — page slug under pages/ (default: claude-answers-the-doubt)
 *   lang  — language to switch to for the "after" shot (default: ja)
 *
 * Output:
 *   docs/screenshots/{slug}-en.png   — page in default language
 *   docs/screenshots/{slug}-{lang}.png — page after lang-fab switch
 *
 * Run from repo root.
 */

'use strict';

const http   = require('http');
const fs     = require('fs');
const path   = require('path');

// Resolve Playwright from its global install location
const PLAYWRIGHT_PATH = '/opt/node22/lib/node_modules/playwright';
const { chromium } = require(PLAYWRIGHT_PATH);

const ROOT       = path.join(__dirname, '..');
const PAGES_DIR  = path.join(ROOT, 'pages');
const OUT_DIR    = path.join(ROOT, 'docs', 'screenshots');
const CDN_PREFIX = 'https://cdn.jsdelivr.net/gh/vgong24/vextreme@main';

const slug = process.argv[2] || 'claude-answers-the-doubt';
const lang = process.argv[3] || 'ja';

// ── MIME types ───────────────────────────────────────────────────────────────

const MIME = {
  '.html': 'text/html',
  '.js':   'text/javascript',
  '.json': 'application/json',
  '.css':  'text/css',
};

function mimeFor(filePath) {
  return MIME[path.extname(filePath)] || 'text/plain';
}

// ── Local HTTP server ─────────────────────────────────────────────────────────
// Serves the whole repo root so the page and all local assets are reachable.

function startServer() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      const urlPath = req.url.split('?')[0];
      const filePath = path.join(ROOT, urlPath === '/' ? '/pages/' + slug + '.html' : urlPath);

      fs.readFile(filePath, (err, data) => {
        if (err) {
          res.writeHead(404);
          res.end('Not found: ' + filePath);
          return;
        }
        res.writeHead(200, { 'Content-Type': mimeFor(filePath) });
        res.end(data);
      });
    });

    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      resolve({ server, port });
    });
  });
}

// ── CDN interception ──────────────────────────────────────────────────────────
// Maps CDN URLs to local file paths so we test branch code, not @main.

function localPathFor(cdnUrl) {
  const relative = cdnUrl.replace(CDN_PREFIX, '');
  const clean    = relative.split('?')[0];
  return path.join(ROOT, clean);
}

// ── Screenshot helper ─────────────────────────────────────────────────────────

async function screenshotPage(page, outPath, label) {
  // Wait for arc nav and lang-fab to settle
  await page.waitForTimeout(1200);
  await page.screenshot({ path: outPath, fullPage: true });
  console.log(`  [screenshot] ${label} → ${path.relative(ROOT, outPath)}`);
}

// ── Main ──────────────────────────────────────────────────────────────────────

(async () => {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const { server, port } = await startServer();
  const baseUrl = `http://127.0.0.1:${port}`;

  const browser = await chromium.launch({
    executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
    args: ['--no-sandbox'],
  });

  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
  });

  const page = await context.newPage();

  // Intercept CDN requests → serve local files
  await page.route(`${CDN_PREFIX}/**`, async (route) => {
    const local = localPathFor(route.request().url());
    if (fs.existsSync(local)) {
      const body        = fs.readFileSync(local);
      const contentType = mimeFor(local);
      await route.fulfill({ status: 200, contentType, body });
    } else {
      console.warn(`  [cdn-miss] ${route.request().url()}`);
      await route.continue();
    }
  });

  const pageUrl = `${baseUrl}/pages/${slug}.html`;
  console.log(`\nLoading: ${pageUrl}`);
  await page.goto(pageUrl, { waitUntil: 'networkidle' });

  // ── EN screenshot ────────────────────────────────────────────────────────

  const enOut = path.join(OUT_DIR, `${slug}-en.png`);
  await screenshotPage(page, enOut, 'EN (default)');

  // ── Switch language via FAB ──────────────────────────────────────────────

  const fabBtn = page.locator('#vex-lang-fab-btn');
  const fabExists = await fabBtn.count();

  if (!fabExists) {
    console.warn('  [warn] FAB button not found — lang-fab may not have mounted');
  } else {
    await fabBtn.click();
    await page.waitForTimeout(400); // wheel open animation

    const langItem = page.locator(`.vex-lang-item[data-lang="${lang}"]`);
    const langExists = await langItem.count();

    if (!langExists) {
      console.warn(`  [warn] No FAB item found for lang="${lang}"`);
    } else {
      await langItem.click();
      await page.waitForTimeout(1000); // strings fetch + swap
    }
  }

  // Scroll back to top for consistent framing
  await page.evaluate(() => window.scrollTo(0, 0));

  const langOut = path.join(OUT_DIR, `${slug}-${lang}.png`);
  await screenshotPage(page, langOut, `${lang.toUpperCase()} (after FAB switch)`);

  await browser.close();
  server.close();

  console.log('\nDone.');
  console.log(`  EN  : docs/screenshots/${slug}-en.png`);
  console.log(`  ${lang.toUpperCase()}  : docs/screenshots/${slug}-${lang}.png`);
})();

// [VXG RealForever]
