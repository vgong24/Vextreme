#!/usr/bin/env node
/**
 * VEXTREME — scripts/screenshot-institutional.js
 *
 * Renders an institutional page (pages/vextreme-home.html, pages/vex-support.html)
 * across the widths, themes, and languages it actually claims to support, and
 * writes the results to docs/screenshots/.
 *
 * WHY THIS EXISTS ALONGSIDE scripts/screenshot-page.js
 * ----------------------------------------------------
 * That script drives the archive surface's language FAB: it clicks
 * #vex-lang-fab-btn and then a .vex-lang-item flag. The institutional pages
 * deliberately use a native <select> instead (see widgets/vex-institutional.js
 * for why), so pointing the FAB script at them produces two identical English
 * screenshots and a pair of "FAB button not found" warnings — a false pass
 * that looks like verification. Rather than teach one script two interaction
 * models, this is a second harness for a genuinely different surface. They
 * share the local-server + CDN-interception approach, which is the part worth
 * keeping identical.
 *
 * It also checks the three widths the design review actually asks about
 * (1440 / 768 / 320) and both themes, which the FAB script does not do at all.
 *
 * Usage:
 *   node scripts/screenshot-institutional.js                 # both pages, full matrix
 *   node scripts/screenshot-institutional.js vex-support     # one page
 *   node scripts/screenshot-institutional.js vex-support ja  # one page, one language
 *
 * Output:
 *   docs/screenshots/{slug}-{width}-{theme}.png
 *   docs/screenshots/{slug}-{lang}.png        (1440, dark, non-default languages)
 *
 * Run from repo root. Requires a Playwright install reachable at PLAYWRIGHT_PATH.
 */

'use strict';

const http = require('http');
const fs   = require('fs');
const path = require('path');

const PLAYWRIGHT_PATH = process.env.VEX_PLAYWRIGHT_PATH || '/opt/node22/lib/node_modules/playwright';
const CHROMIUM_PATH   = process.env.VEX_CHROMIUM_PATH   || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const { chromium } = require(PLAYWRIGHT_PATH);

const ROOT       = path.join(__dirname, '..');
const OUT_DIR    = path.join(ROOT, 'docs', 'screenshots');
const CDN_PREFIX = 'https://cdn.jsdelivr.net/gh/vgong24/vextreme@main';

const INSTITUTIONAL_SLUGS = ['vextreme-home', 'vex-support'];

// Widths the design review names: desktop, tablet, and the narrowest phone
// still in real use. 320 is not decorative — it is where a fixed-width table
// or an unwrapped nav actually breaks.
const WIDTHS = [
  { width: 1440, height: 900, label: '1440' },
  { width: 768,  height: 1024, label: '768' },
  { width: 320,  height: 640,  label: '320' },
];

const THEMES = ['foundation', 'foundation-light'];

const MIME = {
  '.html': 'text/html',
  '.js':   'text/javascript',
  '.json': 'application/json',
  '.css':  'text/css',
  '.svg':  'image/svg+xml',
  '.webp': 'image/webp',
  '.png':  'image/png',
};

function mimeFor(filePath) {
  return MIME[path.extname(filePath)] || 'text/plain';
}

function startServer() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      const urlPath  = decodeURIComponent(req.url.split('?')[0]);
      const filePath = path.join(ROOT, urlPath);
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
    server.listen(0, '127.0.0.1', () => resolve({ server, port: server.address().port }));
  });
}

// Themes are applied by setting the attribute directly rather than clicking
// the toggle: the toggle writes to localStorage, and a persisted choice would
// then leak into the next page's first render and quietly invalidate the shot.
async function setTheme(page, theme) {
  await page.evaluate((t) => document.documentElement.setAttribute('data-theme', t), theme);
  await page.waitForTimeout(120);
}

// A fullPage screenshot does NOT trigger loading="lazy" images below the fold —
// the viewport never actually travels past them, so they stay unloaded and the
// shot shows empty frames. Scrolling the page through first, then waiting for
// every <img> to report complete, is what makes the render honest. Without
// this the support imagery silently screenshots as grey boxes and the shot
// looks like a layout bug rather than a harness bug.
async function settleLazyImages(page) {
  await page.evaluate(async () => {
    const step = window.innerHeight;
    for (let y = 0; y < document.body.scrollHeight; y += step) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 60));
    }
    window.scrollTo(0, 0);
    await Promise.all(
      Array.from(document.images)
        .filter((img) => !img.complete)
        .map((img) => new Promise((r) => { img.onload = img.onerror = r; }))
    );
  });
  await page.waitForTimeout(150);
}

async function shoot(page, outPath, label) {
  await settleLazyImages(page);
  await page.screenshot({ path: outPath, fullPage: true });
  console.log(`  ${label.padEnd(34)} → docs/screenshots/${path.basename(outPath)}`);
}

(async () => {
  const slugArg = process.argv[2] || null;
  const langArg = process.argv[3] || null;

  const slugs = slugArg ? [slugArg] : INSTITUTIONAL_SLUGS;
  for (const slug of slugs) {
    if (!fs.existsSync(path.join(ROOT, 'pages', `${slug}.html`))) {
      console.error(`No such page: pages/${slug}.html`);
      process.exit(1);
    }
  }

  fs.mkdirSync(OUT_DIR, { recursive: true });

  const { server, port } = await startServer();
  const baseUrl = `http://127.0.0.1:${port}`;
  const browser = await chromium.launch({ executablePath: CHROMIUM_PATH, args: ['--no-sandbox'] });

  for (const slug of slugs) {
    console.log(`\n${slug}`);
    const context = await browser.newContext({ viewport: WIDTHS[0] });
    const page = await context.newPage();

    // Serve any CDN request from the working tree, so what is verified is the
    // branch's code and data rather than whatever @main happens to hold.
    await page.route(`${CDN_PREFIX}/**`, async (route) => {
      const local = path.join(ROOT, route.request().url().replace(CDN_PREFIX, '').split('?')[0]);
      if (fs.existsSync(local)) {
        await route.fulfill({ status: 200, contentType: mimeFor(local), body: fs.readFileSync(local) });
      } else {
        console.warn(`  [cdn-miss] ${route.request().url()}`);
        await route.continue();
      }
    });

    const pageErrors = [];
    page.on('pageerror', (e) => pageErrors.push(String(e)));
    page.on('console', (m) => { if (m.type() === 'error') pageErrors.push(m.text()); });

    await page.goto(`${baseUrl}/pages/${slug}.html`, { waitUntil: 'networkidle' });

    for (const size of WIDTHS) {
      await page.setViewportSize({ width: size.width, height: size.height });
      for (const theme of THEMES) {
        await setTheme(page, theme);
        const mode = theme === 'foundation' ? 'dark' : 'light';
        await shoot(page, path.join(OUT_DIR, `${slug}-${size.label}-${mode}.png`), `${size.label}px ${mode}`);
      }
    }

    // Also write the desktop dark shot under the repo's shared
    // {slug}-{lang}.png convention. lib/build-page-health.js and
    // lib/build-terrain-map.js discover screenshot evidence by that exact
    // shape — {slug}-1440-dark.png does not match either regex, so without
    // this the pages would report ja and zh evidence but no English, which is
    // false. The width/theme matrix above is this harness's own vocabulary;
    // this one file is the handshake with the rest of the system.
    await page.setViewportSize(WIDTHS[0]);
    await setTheme(page, 'foundation');
    await shoot(page, path.join(OUT_DIR, `${slug}-en.png`), '1440px dark · en');

    // Language renders: desktop width, dark surface, one shot per non-default
    // language the page's own <select> offers. Driving the real control rather
    // than injecting strings is the point — it proves the bundle path, the
    // fetch, and the [data-i18n] swap all actually work together.
    await page.setViewportSize(WIDTHS[0]);
    await setTheme(page, 'foundation');

    const langs = langArg
      ? [langArg]
      : await page.$$eval('[data-vex-lang-select] option', (opts) =>
          opts.map((o) => o.value).filter((v) => v !== 'en'));

    for (const lang of langs) {
      await page.selectOption('[data-vex-lang-select]', lang);
      await page.waitForTimeout(900);
      await shoot(page, path.join(OUT_DIR, `${slug}-${lang}.png`), `1440px dark · ${lang}`);
    }

    // Leave the page in English so a following run starts from a clean state.
    if (langs.length) {
      await page.selectOption('[data-vex-lang-select]', 'en');
      await page.waitForTimeout(600);
    }

    if (pageErrors.length) {
      console.warn(`  [page errors] ${pageErrors.length}`);
      pageErrors.slice(0, 5).forEach((e) => console.warn(`    ${e}`));
    } else {
      console.log('  no console or page errors');
    }

    await context.close();
  }

  await browser.close();
  server.close();
  console.log('\nDone.');
})();

// [VXG RealForever]
