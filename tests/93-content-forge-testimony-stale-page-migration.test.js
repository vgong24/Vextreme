'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');

const migration = require('../tools/vex-content-forge/project_stale_page_migration.js');
const projector = require('../tools/vex-content-forge/project_arc_batch.js');

const ROOT = path.join(__dirname, '..');
const FORMATION_REL = path.join(
  'docs','ingestion','workmaps',
  'content-forge-testimony-stale-page-migration-formation.json'
);
const REQUIRED = [
  FORMATION_REL,
  path.join('data','nodes.json'),
  path.join('data','arcs-v2.json'),
  path.join('config','content-intents.json'),
  path.join('config','content-assets.json'),
  path.join('data','viewmodels.json'),
  path.join('docs','ingestion','source-pages','part-024','the-testimony-of-victor-gong.html'),
  path.join('pages','the-testimony-of-victor-gong.html'),
];
const hash = value => crypto.createHash('sha256').update(value).digest('hex');

function fixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'vextreme-testimony-migration-'));
  for (const rel of REQUIRED) {
    const from = path.join(ROOT, rel);
    const to = path.join(root, rel);
    fs.mkdirSync(path.dirname(to), { recursive: true });
    fs.copyFileSync(from, to);
  }
  return root;
}
function read(root, rel) {
  return fs.readFileSync(path.join(root, rel));
}
function json(root, rel) {
  return JSON.parse(read(root, rel).toString('utf8'));
}

test('Content Forge stale-page adapter migrates the exact Testimony preimage through the unchanged projector and is idempotent', () => {
  const root = fixture();
  try {
    const formation = json(root, FORMATION_REL);
    const sourceRel = formation.members[0].sourcePath;
    const pageRel = formation.migration.destinationPath;
    const stringsRel = path.join('data','strings','source','pages','the-testimony-of-victor-gong.json');
    const viewmodelsRel = path.join('data','viewmodels.json');
    const sourceBefore = read(root, sourceRel);
    const oldPage = read(root, pageRel);
    const viewmodelsBefore = json(root, viewmodelsRel);

    assert.equal(projector.gitBlobSha(oldPage), formation.migration.expectedDestinationGitBlob);
    assert.equal(projector.gitBlobSha(sourceBefore), formation.members[0].sourceGitBlob);
    assert.equal(projector.sha256(sourceBefore), formation.members[0].preservedHtmlSha256);
    assert.match(sourceBefore.toString('utf8'), /src="\/__vex\/missing-asset\.svg"/);
    assert.match(sourceBefore.toString('utf8'), /data-vex-original-src="https:\/\/www\.victorgong\.com\//);

    const first = migration.main({ root, formationRel: FORMATION_REL, silent: true });
    assert.equal(first.disposition, 'MIGRATED');
    assert.equal(first.preservedSourceMutationPerformed, false);
    assert.equal(first.destinationPreimageGitBlob, formation.migration.expectedDestinationGitBlob);
    assert.ok(first.changedPaths.includes(pageRel));
    assert.ok(first.changedPaths.includes(stringsRel));

    const page = read(root, pageRel).toString('utf8');
    assert.match(page, /data-content-forge-generator="tools\/vex-content-forge\/project_arc_batch\.js"/);
    assert.match(page, /data-content-forge-body="the-testimony-of-victor-gong"/);
    assert.doesNotMatch(page, /\/__vex\/missing-asset\.svg/);
    assert.ok(page.includes(formation.migration.assetResolutions[0].resolvedSrc));
    assert.ok(page.includes(formation.migration.linkResolutions[0].toHref));
    assert.doesNotMatch(page, /<script[^>]+shell\.js/);
    assert.doesNotMatch(page, /vextreme24\.com\/archives/);
    assert.match(page, /The raw witness is preserved\. The testimony is sealed\. The covenant is complete\./);

    const strings = json(root, stringsRel);
    assert.equal(strings._meta.sourceProvenance.preservedGitBlob, formation.members[0].sourceGitBlob);
    assert.equal(strings._meta.sourceProvenance.preservedHtmlSha256, formation.members[0].preservedHtmlSha256);
    assert.equal(strings._meta.sourceProvenance.proposalRecordRef, formation.members[0].proposalRecordRef);
    assert.equal(strings._meta.sourceProvenance.migration.adapter, migration.ADAPTER_REF);
    assert.equal(strings._meta.sourceProvenance.migration.destinationPreimageGitBlob, formation.migration.expectedDestinationGitBlob);
    assert.equal(strings._meta.sourceProvenance.migration.preservedSourceMutationPerformed, false);
    assert.equal(
      strings._meta.sourceProvenance.migration.contractSha256,
      migration.migrationContractSha256(formation, formation.migration)
    );
    assert.deepEqual(strings._meta.sourceProvenance.migration.assetResolutions[0], formation.migration.assetResolutions[0]);
    assert.deepEqual(strings._meta.sourceProvenance.migration.linkResolutions[0], formation.migration.linkResolutions[0]);
    assert.deepEqual(
      strings._meta.sourceProvenance.migration.resultFingerprint,
      migration.migrationResultFingerprint(
        read(root, pageRel),
        strings,
        json(root, viewmodelsRel)['the-testimony-of-victor-gong']
      )
    );

    assert.deepEqual(read(root, sourceRel), sourceBefore, 'preserved Rescue source remains byte-identical');

    const viewmodelsAfter = json(root, viewmodelsRel);
    const expected = {
      title:'The Testimony of Victor Gong',
      category:'production',
      template:'page',
      scopes:['pages.the-testimony-of-victor-gong'],
      features:['lang','spiral-fab','theme','map','analysis','arc-nav'],
    };
    assert.deepEqual(viewmodelsAfter['the-testimony-of-victor-gong'], expected);
    const beforeOther = { ...viewmodelsBefore };
    const afterOther = { ...viewmodelsAfter };
    delete beforeOther['the-testimony-of-victor-gong'];
    delete afterOther['the-testimony-of-victor-gong'];
    assert.deepEqual(afterOther, beforeOther);

    const stable = {
      page: hash(read(root, pageRel)),
      strings: hash(read(root, stringsRel)),
      viewmodels: hash(read(root, viewmodelsRel)),
      source: hash(read(root, sourceRel)),
    };
    const second = migration.main({ root, formationRel: FORMATION_REL, silent: true });
    assert.equal(second.disposition, 'ALREADY_MIGRATED');
    assert.deepEqual(second.changedPaths, []);
    assert.deepEqual({
      page: hash(read(root, pageRel)),
      strings: hash(read(root, stringsRel)),
      viewmodels: hash(read(root, viewmodelsRel)),
      source: hash(read(root, sourceRel)),
    }, stable);
    assert.equal(fs.existsSync(path.join(root, pageRel + '.vex-stale-migration-backup')), false);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('Content Forge stale-page adapter refuses the wrong destination preimage before mutation', () => {
  const root = fixture();
  try {
    const pageRel = path.join('pages','the-testimony-of-victor-gong.html');
    const sourceRel = path.join('docs','ingestion','source-pages','part-024','the-testimony-of-victor-gong.html');
    const viewmodelsRel = path.join('data','viewmodels.json');
    const stringsRel = path.join('data','strings','source','pages','the-testimony-of-victor-gong.json');
    fs.appendFileSync(path.join(root, pageRel), '\n<!-- unexpected drift -->\n');
    const pageBefore = read(root, pageRel);
    const sourceBefore = read(root, sourceRel);
    const viewmodelsBefore = read(root, viewmodelsRel);

    assert.throws(
      () => migration.main({ root, formationRel: FORMATION_REL, silent: true }),
      error => error && error.code === 'MIGRATION_DESTINATION_PREIMAGE'
    );
    assert.deepEqual(read(root, pageRel), pageBefore);
    assert.deepEqual(read(root, sourceRel), sourceBefore);
    assert.deepEqual(read(root, viewmodelsRel), viewmodelsBefore);
    assert.equal(fs.existsSync(path.join(root, stringsRel)), false);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('Content Forge stale-page adapter fails closed when a previously migrated result or contract later drifts', () => {
  for (const drift of ['page', 'strings', 'viewmodel', 'formation']) {
    const root = fixture();
    try {
      migration.main({ root, formationRel: FORMATION_REL, silent: true });
      const pageRel = path.join('pages','the-testimony-of-victor-gong.html');
      const stringsRel = path.join('data','strings','source','pages','the-testimony-of-victor-gong.json');
      const viewmodelsRel = path.join('data','viewmodels.json');
      const formationPath = path.join(root, FORMATION_REL);

      if (drift === 'page') {
        fs.appendFileSync(path.join(root, pageRel), '\n<!-- post-migration drift -->\n');
      } else if (drift === 'strings') {
        const strings = json(root, stringsRel);
        const contentKey = Object.keys(strings).find(key => key !== '_meta');
        strings[contentKey].strings.en.text += ' drift';
        fs.writeFileSync(path.join(root, stringsRel), JSON.stringify(strings, null, 2) + '\n');
      } else if (drift === 'viewmodel') {
        const viewmodels = json(root, viewmodelsRel);
        viewmodels['the-testimony-of-victor-gong'].title = 'Drifted title';
        fs.writeFileSync(path.join(root, viewmodelsRel), JSON.stringify(viewmodels, null, 2) + '\n');
      } else {
        const formation = JSON.parse(fs.readFileSync(formationPath, 'utf8'));
        formation.migration.linkResolutions[0].resolutionClass += '__DRIFT';
        fs.writeFileSync(formationPath, JSON.stringify(formation, null, 2) + '\n');
      }

      assert.throws(
        () => migration.main({ root, formationRel: FORMATION_REL, silent: true }),
        error => error && error.code === 'MIGRATION_MIGRATED_RESULT_DRIFT',
        drift + ': migrated currentness must fail closed'
      );
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  }
});

test('Content Forge stale-page adapter rolls back the old page, strings, and viewmodels when an exact resolution cannot be proven', () => {
  const root = fixture();
  try {
    const formationPath = path.join(root, FORMATION_REL);
    const formation = JSON.parse(fs.readFileSync(formationPath, 'utf8'));
    formation.migration.assetResolutions[0].alt = 'Not the retained portrait';
    fs.writeFileSync(formationPath, JSON.stringify(formation, null, 2) + '\n');

    const pageRel = formation.migration.destinationPath;
    const sourceRel = formation.members[0].sourcePath;
    const viewmodelsRel = path.join('data','viewmodels.json');
    const stringsRel = path.join('data','strings','source','pages','the-testimony-of-victor-gong.json');
    const pageBefore = read(root, pageRel);
    const sourceBefore = read(root, sourceRel);
    const viewmodelsBefore = read(root, viewmodelsRel);

    assert.throws(
      () => migration.main({ root, formationRel: FORMATION_REL, silent: true }),
      error => error && error.code === 'MIGRATION_SOURCE_ASSET_BINDING'
    );
    assert.deepEqual(read(root, pageRel), pageBefore, 'stale destination restored');
    assert.deepEqual(read(root, sourceRel), sourceBefore, 'preserved source restored');
    assert.deepEqual(read(root, viewmodelsRel), viewmodelsBefore, 'viewmodels restored');
    assert.equal(fs.existsSync(path.join(root, stringsRel)), false, 'new string source removed');
    assert.equal(fs.existsSync(path.join(root, pageRel + '.vex-stale-migration-backup')), false, 'backup consumed by rollback');
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

// [VXG RealForever]
