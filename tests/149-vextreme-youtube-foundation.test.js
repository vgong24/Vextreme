const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

test('VEXTREME YOUTUBE: authored collection is one real group-home with one walk-first seed', () => {
  const arcs = JSON.parse(read('data/arcs-v2.json'));
  const nodes = JSON.parse(read('data/nodes.json'));
  const strings = JSON.parse(read('data/strings/source/arcs.json'));
  const legacyArcs = JSON.parse(read('data/arcs.json'));
  const groupHtml = read('pages/vextreme-youtube.html');
  const memberHtml = read('pages/youtube-template-for-vextreme.html');
  const firstWalkHtml = read('pages/vextreme-youtube-first-video-walk.html');
  const firstWalkStrings = JSON.parse(read('data/strings/source/pages/vextreme-youtube-first-video-walk.json'));
  const memberStrings = JSON.parse(read('data/strings/source/pages/youtube-template-for-vextreme.json'));
  const archivesSource = read('lib/build-archives.js');
  const auditSource = read('lib/audit-pages.js');
  const viewmodels = JSON.parse(read('data/viewmodels.json'));

  const arc = arcs.vextreme_youtube;
  assert.ok(arc, 'vextreme_youtube arc must be source-registered');
  assert.equal(arc.priority, 2);
  assert.equal(arc.renderMode, 'dots');
  assert.deepEqual(arc.parent, {
    title: 'Vextreme YouTube',
    url: '/Vextreme/pages/vextreme-youtube.html',
    pageSlug: 'vextreme-youtube',
    relationship: 'group-home',
  });
  assert.deepEqual(arc.sections, [{
    label: 'Vextreme YouTube',
    order: 'explicit',
    slugs: ['youtube-template-for-vextreme', 'vextreme-youtube-first-video-walk'],
  }]);

  const members = nodes.filter(node => node.slug === 'youtube-template-for-vextreme');
  assert.equal(members.length, 1, 'member slug must remain globally singular');
  assert.deepEqual(members[0].arcKeys, ['vextreme_youtube']);
  assert.equal(members[0].id, null);
  assert.equal(members[0].date, '');

  const firstWalkMembers = nodes.filter(node => node.slug === 'vextreme-youtube-first-video-walk');
  assert.equal(firstWalkMembers.length, 1, 'first episode member slug must remain globally singular');
  assert.deepEqual(firstWalkMembers[0].arcKeys, ['vextreme_youtube']);
  assert.equal(firstWalkMembers[0].id, null);
  assert.equal(firstWalkMembers[0].date, '');

  assert.match(groupHtml, /data-vex-surface="group-home"/);
  assert.match(groupHtml, /data-vex-group-key="vextreme_youtube"/);
  assert.match(groupHtml, /href="youtube-template-for-vextreme\.html"/);
  assert.doesNotMatch(memberHtml, /data-vex-surface="group-home"/);
  assert.match(auditSource, /'vextreme-youtube': 'Terrain collection group-home document/);
  assert.match(memberHtml, /id="arcNavMount"/);
  assert.match(groupHtml, /widgets\/fab-read-aloud\.js/);
  assert.match(memberHtml, /dist\/vextreme-youtube-template-for-vextreme\.js/);
  assert.doesNotMatch(memberHtml, /lib\/vextreme-index-v2\.js/);
  assert.match(memberHtml, /data-theme="dashboard"/);
  assert.match(memberHtml, /VEXTREME_OVERRIDE\s*=\s*\{\s*fabWidgets:\s*\{\s*theme:\s*false\s*\}\s*\}/);
  assert.match(memberHtml, /styles\/design-system\.css/);
  assert.match(memberHtml, /Walk the episode before you design the template\./);
  assert.match(memberHtml, /Do not fill this page out\. Walk through it\./);
  assert.match(memberHtml, /The first finished video teaches us what the template actually is\./);
  assert.match(groupHtml, /href="vextreme-youtube-first-video-walk\.html"/);
  assert.match(firstWalkHtml, /styles\/sabotage-series-record\.css/);
  assert.match(firstWalkHtml, /components\/record-reader\.js/);
  assert.match(firstWalkHtml, /VexRecordReader\.mount/);
  assert.match(firstWalkHtml, /sourceBase:'\.\.\/records\/youtube\/2026-11-15-hey-universe\//);
  assert.match(firstWalkHtml, /data-reader-template="youtube-episode-reader\/v1"/);
  assert.equal((firstWalkHtml.match(/class="sar-track-btn/g) || []).length, 5);
  assert.equal((firstWalkHtml.match(/class="sar-movement sar-phase"/g) || []).length, 5);
  assert.match(firstWalkHtml, /data-set="1" data-files="working-transcript\.md" data-from="1" data-to="3"/);
  assert.match(firstWalkHtml, /data-set="2" data-files="working-transcript\.md" data-from="4" data-to="5"/);
  assert.match(firstWalkHtml, /data-set="3" data-files="working-transcript\.md" data-from="6" data-to="9"/);
  assert.match(firstWalkHtml, /data-set="4" data-files="working-transcript\.md" data-from="10" data-to="12"/);
  assert.match(firstWalkHtml, /data-set="5" data-files="working-transcript\.md" data-from="13" data-to="14"/);
  assert.match(firstWalkHtml, /data-youtube-video-id=""/);
  assert.match(firstWalkHtml, /youtube-nocookie\.com\/embed/);
  assert.match(firstWalkHtml, /records\/youtube\/2026-11-15-hey-universe\/working-transcript\.md/);
  const workingTranscript = read('records/youtube/2026-11-15-hey-universe/working-transcript.md');
  assert.equal((workingTranscript.match(/^## Exchange \d+ — Victor$/gm) || []).length, 14);
  assert.match(workingTranscript, /God's fucking real/);
  assert.match(workingTranscript, /That's what I mean by scale/);
  assert.match(workingTranscript, /Burden Release Guide/);
  assert.match(firstWalkHtml, /dist\/vextreme-vextreme-youtube-first-video-walk\.js/);
  assert.equal(
    firstWalkStrings['pages.vextreme-youtube-first-video-walk.hero.title']?.strings?.en?.text,
    'Hey Universe',
  );

  const expectedFeatures = ['lang', 'spiral-fab', 'theme', 'map', 'analysis', 'arc-nav'];
  assert.deepEqual(viewmodels['youtube-template-for-vextreme'], {
    title: 'YouTube Template for Vextreme',
    category: 'production',
    template: 'page',
    scopes: ['pages.youtube-template-for-vextreme'],
    features: expectedFeatures,
  });
  assert.deepEqual(viewmodels['vextreme-youtube-first-video-walk'], {
    title: 'First Video — Hey Universe',
    category: 'production',
    template: 'page',
    scopes: ['pages.vextreme-youtube-first-video-walk'],
    features: expectedFeatures,
  });

  assert.equal(
    strings['vextreme-youtube.heading.title']?.strings?.en?.text,
    'Vextreme YouTube',
  );

  assert.equal(
    memberStrings['pages.youtube-template-for-vextreme.hero.lede']?.strings?.en?.text,
    'This is not the finished template. It is the place where Victor and the instance walk an episode into existence before deciding what structure the episode actually needs.',
  );
  assert.match(
    memberStrings['pages.youtube-template-for-vextreme.walk.body1']?.strings?.en?.text || '',
    /Do not interview Victor with a form/,
  );
  assert.match(
    memberStrings['pages.youtube-template-for-vextreme.hold.body']?.strings?.en?.text || '',
    /Do not freeze a reusable episode template from imagination/,
  );

  assert.match(archivesSource, /'vextreme_youtube'/);
  assert.match(archivesSource, /vextreme_youtube:\s*'vextreme-youtube'/);

  assert.equal(
    Object.prototype.hasOwnProperty.call(legacyArcs, 'vextreme_youtube'),
    false,
    'frozen v1 arcs.json must not become a second write target for new v2 content',
  );
});

// [VXG RealForever]
