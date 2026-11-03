'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');

const {
  RELATION_KINDS,
  convergeContentGroupRelationships,
} = require('../lib/content-group-convergence-relay');

function arc(key, pageSlug, memberSlugs, live = true) {
  return {
    key,
    name: key,
    parent: pageSlug ? { title:key, pageSlug, live, url:live ? 'https://example.test/' + pageSlug + '.html' : null } : null,
    memberSlugs,
  };
}

test('CONTENT GROUP RELAY: explicit matching group-home surface is a dedicated container', () => {
  const [result] = convergeContentGroupRelationships(
    [arc('tools', 'tools-home', ['a','b'])],
    {
      'tools-home':'<html data-vex-surface="group-home" data-vex-group-key="tools"><a href="a.html">A</a></html>',
    }
  );
  assert.equal(result.contentGroupRelation.kind, RELATION_KINDS.DEDICATED_GROUP_HOME);
  assert.equal(result.contentGroupRelation.reason, 'EXPLICIT_GROUP_HOME_SURFACE');
  assert.equal(result.contentGroupRelation.groupHomePageSlug, 'tools-home');
});

test('CONTENT GROUP RELAY: complete non-member navigation recognizes a legacy dedicated container', () => {
  const [result] = convergeContentGroupRelationships(
    [arc('blueprint', 'blueprint-home', ['a','b','c'])],
    {
      'blueprint-home':'<html><a href="a.html">A</a><a href="./b.html">B</a><a href="/Vextreme/pages/c.html">C</a></html>',
    }
  );
  assert.equal(result.contentGroupRelation.kind, RELATION_KINDS.DEDICATED_GROUP_HOME);
  assert.equal(result.contentGroupRelation.reason, 'COMPLETE_COLLECTION_NAVIGATION');
  assert.deepEqual(result.contentGroupRelation.evidence.linkedMemberSlugs, ['a','b','c']);
});

test('CONTENT GROUP RELAY: a collection member nominated as parent remains a member reference', () => {
  const [result] = convergeContentGroupRelationships(
    [arc('standard', 'guide', ['guide','demo'])],
    {
      guide:'<html><a href="demo.html">Demo</a></html>',
    }
  );
  assert.equal(result.contentGroupRelation.kind, RELATION_KINDS.MEMBER_REFERENCE);
  assert.equal(result.contentGroupRelation.intent, 'OPEN_MEMBER_DIRECTLY');
  assert.equal(result.contentGroupRelation.groupHomePageSlug, null);
  assert.equal(result.contentGroupRelation.evidence.parentIsMember, true);
});

test('CONTENT GROUP RELAY: a shared live reference does not become every collection home', () => {
  const results = convergeContentGroupRelationships(
    [
      arc('one', 'archives', ['a']),
      arc('two', 'archives', ['b']),
    ],
    { archives:'<html><a href="a.html">A</a><a href="b.html">B</a></html>' }
  );
  assert.deepEqual(results.map(item => item.contentGroupRelation.kind), [
    RELATION_KINDS.SHARED_REFERENCE,
    RELATION_KINDS.SHARED_REFERENCE,
  ]);
  assert.equal(results[0].contentGroupRelation.evidence.referenceCount, 2);
});

test('CONTENT GROUP RELAY: explicit contradictory group-home declarations fail closed', () => {
  const [wrongKey] = convergeContentGroupRelationships(
    [arc('one', 'home', ['a'])],
    { home:'<html data-vex-surface="group-home" data-vex-group-key="two"></html>' }
  );
  assert.equal(wrongKey.contentGroupRelation.kind, RELATION_KINDS.CONFLICT);
  assert.equal(wrongKey.contentGroupRelation.reason, 'GROUP_HOME_DECLARATION_KEY_MISMATCH');

  const [memberHome] = convergeContentGroupRelationships(
    [arc('one', 'a', ['a'])],
    { a:'<html data-vex-surface="group-home" data-vex-group-key="one"></html>' }
  );
  assert.equal(memberHome.contentGroupRelation.kind, RELATION_KINDS.CONFLICT);
  assert.equal(memberHome.contentGroupRelation.reason, 'GROUP_HOME_DECLARED_ON_COLLECTION_MEMBER');
});

test('CONTENT GROUP RELAY: missing, unavailable, partial, and ordinary live references remain distinct', () => {
  const results = convergeContentGroupRelationships(
    [
      arc('none', null, ['a']),
      arc('missing', 'missing-home', ['a'], false),
      arc('partial', 'partial-home', ['a','b']),
      arc('live', 'live-home', ['a','b']),
    ],
    {
      'partial-home':'<html><a href="a.html">A</a></html>',
      'live-home':'<html><a href="elsewhere.html">Elsewhere</a></html>',
    }
  );

  assert.deepEqual(results.map(item => item.contentGroupRelation.kind), [
    RELATION_KINDS.NO_REFERENCE,
    RELATION_KINDS.UNAVAILABLE_REFERENCE,
    RELATION_KINDS.PARTIAL_COLLECTION_REFERENCE,
    RELATION_KINDS.LIVE_REFERENCE,
  ]);
});

// [VXG RealForever]
