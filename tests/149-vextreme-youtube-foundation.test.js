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
  const memberStrings = JSON.parse(read('data/strings/source/pages/youtube-template-for-vextreme.json'));
  const archivesSource = read('lib/build-archives.js');
  const auditSource = read('lib/audit-pages.js');

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
    slugs: ['youtube-template-for-vextreme'],
  }]);

  const members = nodes.filter(node => node.slug === 'youtube-template-for-vextreme');
  assert.equal(members.length, 1, 'member slug must remain globally singular');
  assert.deepEqual(members[0].arcKeys, ['vextreme_youtube']);
  assert.equal(members[0].id, null);
  assert.equal(members[0].date, '');

  assert.match(groupHtml, /data-vex-surface="group-home"/);
  assert.match(groupHtml, /data-vex-group-key="vextreme_youtube"/);
  assert.match(groupHtml, /href="youtube-template-for-vextreme\.html"/);
  assert.doesNotMatch(memberHtml, /data-vex-surface="group-home"/);
  assert.match(auditSource, /'vextreme-youtube': 'Terrain collection group-home document/);
  assert.match(memberHtml, /id="arcNavMount"/);
  assert.match(groupHtml, /widgets\/fab-read-aloud\\.js/);
  assert.match(memberHtml, /dist\/vextreme-youtube-template-for-vextreme\\.js/);
  assert.doesNotMatch(memberHtml, /lib\/vextreme-index-v2\\.js/);

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
