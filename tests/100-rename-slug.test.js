'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const {
  classifyReference,
  planInstitutionalSlugRename,
} = require('../lib/rename-slug.js');

function write(root, relative, content = '') {
  const target = path.join(root, relative);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, content);
}
function fixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'vex-rename-slug-'));
  write(root, 'config/institutional-surfaces.json', JSON.stringify({ surfaces: { 'old-home': { state:'active', kind:'institutional' } } }));
  write(root, 'pages/old-home.html', '<a href="old-home.html">Home</a>');
  write(root, 'pages/vex-support.html', '<a href="old-home.html">About</a>');
  write(root, 'widgets/vex-institutional.js', "const p='old-home.html';");
  write(root, 'index.html', '<a href="pages/old-home.html">About</a>');
  write(root, 'sitemap.xml', '<loc>pages/old-home.html</loc>');
  write(root, 'data/page-health.json', JSON.stringify({ 'old-home':{} }));
  write(root, 'data/terrain-map.json', JSON.stringify({ slug:'old-home' }));
  write(root, 'data/screenshot-evidence-assets.json', JSON.stringify({ path:'pages/old-home.html' }));
  write(root, 'docs/screenshots/old-home-en-foundation-320.png', Buffer.from([0,1,2]));
  write(root, 'tests/54-institutional-surfaces.test.js', "assert.match(x,/old-home/);");
  write(root, 'docs/architecture/18-institutional-pages.md', '`old-home` is current');
  write(root, 'docs/continuity/batch-001/session.md', 'old-home was formed here');
  write(root, 'docs/ingestion/workmaps/old.json', 'old-home historical input');
  write(root, 'data/nodes.json', '[]');
  return root;
}

test('classification separates live, generated, evidence, test, and history', () => {
  assert.equal(classifyReference('pages/old-home.html','old-home'),'LIVE_OWNER');
  assert.equal(classifyReference('config/institutional-surfaces.json','old-home'),'LIVE_OWNER');
  assert.equal(classifyReference('pages/vex-support.html','old-home'),'LIVE_REFERENCE');
  assert.equal(classifyReference('widgets/vex-institutional.js','old-home'),'LIVE_REFERENCE');
  assert.equal(classifyReference('index.html','old-home'),'GENERATED');
  assert.equal(classifyReference('data/terrain-map.json','old-home'),'GENERATED');
  assert.equal(classifyReference('data/screenshot-evidence-assets.json','old-home'),'SCREENSHOT_EVIDENCE');
  assert.equal(classifyReference('tests/54-institutional-surfaces.test.js','old-home'),'TEST_EXPECTATION');
  assert.equal(classifyReference('docs/continuity/x.md','old-home'),'HISTORICAL_PROVENANCE');
  assert.equal(classifyReference('misc/notes.txt','old-home'),'UNKNOWN');
});

test('institutional plan is deterministic and surfaces the responsibility map', () => {
  const root = fixture();
  const first = planInstitutionalSlugRename({root,fromSlug:'old-home',toSlug:'about-old'});
  const second = planInstitutionalSlugRename({root,fromSlug:'old-home',toSlug:'about-old'});
  assert.deepEqual(first,second);
  assert.equal(first.preconditions.ok,true);
  assert.deepEqual(first.collisions,[]);
  assert.equal(first.summary.unknownCount,0);
  assert.equal(first.applyReady,true);
  assert.equal(first.mutationSupported,false);
  assert.match(first.planSha256,/^[0-9a-f]{64}$/);
  const byPath = Object.fromEntries(first.references.map(r=>[r.path,r]));
  assert.equal(byPath['pages/old-home.html'].classification,'LIVE_OWNER');
  assert.equal(byPath['docs/screenshots/old-home-en-foundation-320.png'].filenameMatch,true);
  assert.equal(byPath['docs/continuity/batch-001/session.md'].classification,'HISTORICAL_PROVENANCE');
});

test('target collisions fail the plan closed', () => {
  const root = fixture();
  write(root,'pages/about-old.html','collision');
  const plan=planInstitutionalSlugRename({root,fromSlug:'old-home',toSlug:'about-old'});
  assert.equal(plan.applyReady,false);
  assert.equal(plan.collisions.some(x=>x.path==='pages/about-old.html'),true);
});

test('unknown references are visible and fail apply readiness', () => {
  const root=fixture();
  write(root,'misc/notes.txt','old-home');
  const plan=planInstitutionalSlugRename({root,fromSlug:'old-home',toSlug:'about-old'});
  assert.equal(plan.summary.unknownCount,1);
  assert.equal(plan.applyReady,false);
  assert.equal(plan.references.find(x=>x.path==='misc/notes.txt').classification,'UNKNOWN');
});

test('current Vextreme patient zero is fully classified when run inside the repository', () => {
  const root = path.resolve(__dirname, '..');
  if (!fs.existsSync(path.join(root, 'pages', 'vextreme-home.html'))) return;
  const plan = planInstitutionalSlugRename({ root, fromSlug: 'vextreme-home', toSlug: 'about-vextreme' });
  const classes = Object.fromEntries(plan.references.map((entry) => [entry.path, entry.classification]));
  assert.equal(plan.preconditions.ok, true);
  assert.deepEqual(plan.collisions, []);
  assert.equal(plan.summary.unknownCount, 0, JSON.stringify(plan.references.filter((entry) => entry.classification === 'UNKNOWN')));
  assert.equal(plan.applyReady, true);
  assert.equal(classes['pages/vextreme-home.html'], 'LIVE_OWNER');
  assert.equal(classes['config/institutional-surfaces.json'], 'LIVE_OWNER');
  assert.equal(classes['pages/vex-support.html'], 'LIVE_REFERENCE');
  assert.equal(classes['pages/vextreme-covenant.html'], 'LIVE_REFERENCE');
  assert.equal(classes['widgets/vex-institutional.js'], 'LIVE_REFERENCE');
  assert.equal(classes['sitemap.xml'], 'GENERATED');
  assert.equal(classes['data/page-health.json'], 'GENERATED');
  assert.equal(classes['data/terrain-map.json'], 'GENERATED');
  assert.equal(classes['data/screenshot-evidence-assets.json'], 'SCREENSHOT_EVIDENCE');
  assert.equal(classes['tests/54-institutional-surfaces.test.js'], 'TEST_EXPECTATION');
  assert.equal(classes['docs/continuity/INDEX.md'], 'HISTORICAL_PROVENANCE');
});
