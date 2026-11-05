'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');

const {
  RELATION_KINDS,
  convergeContentGroupRelationships,
} = require('../lib/content-group-convergence-relay');

function arc(key, pageSlug, memberSlugs, live = true, relationship = null) {
  return {
    key,
    name: key,
    parent: pageSlug ? {
      title:key,
      pageSlug,
      live,
      url:live ? 'https://example.test/' + pageSlug + '.html' : null,
      ...(relationship ? { relationship } : {}),
    } : null,
    memberSlugs,
  };
}

test('CONTENT GROUP RELAY: explicit collection relationship owns dedicated group-home authority', () => {
  const [result] = convergeContentGroupRelationships(
    [arc('tools', 'tools-home', ['a','b'], true, 'group-home')],
    {
      'tools-home':'<html data-vex-surface="group-home" data-vex-group-key="tools"><a href="a.html">A</a><a href="b.html">B</a></html>',
    }
  );

  assert.equal(result.contentGroupRelation.kind, RELATION_KINDS.DEDICATED_GROUP_HOME);
  assert.equal(result.contentGroupRelation.reason, 'DECLARED_GROUP_HOME_RELATIONSHIP');
  assert.equal(result.contentGroupRelation.groupHomePageSlug, 'tools-home');
  assert.equal(result.contentGroupRelation.evidence.declaredRelationship, 'group-home');
  assert.equal(result.contentGroupRelation.evidence.completeMemberNavigation, true);
});

test('CONTENT GROUP RELAY: declared legacy home may remain a home without page-global group-home markup', () => {
  const [result] = convergeContentGroupRelationships(
    [arc('blueprint', 'blueprint-home', ['a','b','c'], true, 'group-home')],
    {
      'blueprint-home':'<html><a href="a.html">A</a><a href="./b.html">B</a><a href="/Vextreme/pages/c.html">C</a></html>',
    }
  );

  assert.equal(result.contentGroupRelation.kind, RELATION_KINDS.DEDICATED_GROUP_HOME);
  assert.equal(result.contentGroupRelation.reason, 'DECLARED_GROUP_HOME_RELATIONSHIP');
  assert.equal(result.contentGroupRelation.evidence.declaredSurface, null);
  assert.deepEqual(result.contentGroupRelation.evidence.linkedMemberSlugs, ['a','b','c']);
});

test('CONTENT GROUP RELAY: complete navigation is evidence only and cannot invent group-home authority', () => {
  const [result] = convergeContentGroupRelationships(
    [arc('blueprint', 'blueprint-home', ['a','b','c'])],
    {
      'blueprint-home':'<html><a href="a.html">A</a><a href="./b.html">B</a><a href="/Vextreme/pages/c.html">C</a></html>',
    }
  );

  assert.equal(result.contentGroupRelation.kind, RELATION_KINDS.LIVE_REFERENCE);
  assert.equal(result.contentGroupRelation.reason, 'COMPLETE_NAVIGATION_WITHOUT_GROUP_HOME_RELATIONSHIP');
  assert.equal(result.contentGroupRelation.groupHomePageSlug, null);
  assert.equal(result.contentGroupRelation.evidence.completeMemberNavigation, true);
  assert.equal(result.contentGroupRelation.evidence.declaredRelationship, null);
});

test('CONTENT GROUP RELAY: page-global group-home markup without collection relationship fails closed', () => {
  const [result] = convergeContentGroupRelationships(
    [arc('tools', 'tools-home', ['a','b'])],
    {
      'tools-home':'<html data-vex-surface="group-home" data-vex-group-key="tools"><a href="a.html">A</a></html>',
    }
  );

  assert.equal(result.contentGroupRelation.kind, RELATION_KINDS.CONFLICT);
  assert.equal(result.contentGroupRelation.reason, 'PAGE_GROUP_HOME_WITHOUT_COLLECTION_RELATIONSHIP');
  assert.equal(result.contentGroupRelation.groupHomePageSlug, null);
});

test('CONTENT GROUP RELAY: collection members cannot acquire group-home authority', () => {
  const [ordinary] = convergeContentGroupRelationships(
    [arc('standard', 'guide', ['guide','demo'])],
    { guide:'<html><a href="demo.html">Demo</a></html>' }
  );
  assert.equal(ordinary.contentGroupRelation.kind, RELATION_KINDS.MEMBER_REFERENCE);

  const [misdeclared] = convergeContentGroupRelationships(
    [arc('standard', 'guide', ['guide','demo'], true, 'group-home')],
    { guide:'<html><a href="demo.html">Demo</a></html>' }
  );
  assert.equal(misdeclared.contentGroupRelation.kind, RELATION_KINDS.CONFLICT);
  assert.equal(misdeclared.contentGroupRelation.reason, 'GROUP_HOME_DECLARED_ON_COLLECTION_MEMBER');
});

test('CONTENT GROUP RELAY: Build Health and its compatibility route stay system references even when complete', () => {
  const results = convergeContentGroupRelationships(
    [
      arc('direct-build', 'build-health', ['a','b']),
      arc('compat-build', 'archives', ['c','d']),
    ],
    {
      'build-health':'<html><a href="a.html">A</a><a href="b.html">B</a></html>',
      archives:'<html><head><link rel="canonical" href="https://vgong24.github.io/Vextreme/pages/build-health.html"></head><body><a href="c.html">C</a><a href="d.html">D</a></body></html>',
    }
  );

  for (const result of results) {
    assert.equal(result.contentGroupRelation.kind, RELATION_KINDS.SYSTEM_REFERENCE);
    assert.equal(result.contentGroupRelation.intent, 'REFERENCE_SYSTEM_SURFACE');
    assert.equal(result.contentGroupRelation.groupHomePageSlug, null);
    assert.equal(result.contentGroupRelation.evidence.completeMemberNavigation, true,
      'operational completeness is not collection-container authority');
    assert.equal(result.contentGroupRelation.evidence.systemReferenceTarget, 'build-health');
  }

  const [misdeclared] = convergeContentGroupRelationships(
    [arc('direct-build', 'build-health', ['a'], true, 'group-home')],
    { 'build-health':'<html><a href="a.html">A</a></html>' }
  );
  assert.equal(misdeclared.contentGroupRelation.kind, RELATION_KINDS.CONFLICT);
  assert.equal(misdeclared.contentGroupRelation.reason, 'SYSTEM_REFERENCE_DECLARED_GROUP_HOME');
});

test('CONTENT GROUP RELAY: shared references, unsupported declarations, and ordinary references fail closed distinctly', () => {
  const shared = convergeContentGroupRelationships(
    [
      arc('one', 'archives', ['a']),
      arc('two', 'archives', ['b']),
    ],
    { archives:'<html><a href="a.html">A</a><a href="b.html">B</a></html>' }
  );
  assert.deepEqual(shared.map(item => item.contentGroupRelation.kind), [
    RELATION_KINDS.SHARED_REFERENCE,
    RELATION_KINDS.SHARED_REFERENCE,
  ]);

  const [unsupported] = convergeContentGroupRelationships(
    [arc('one', 'home', ['a'], true, 'maybe-home')],
    { home:'<html></html>' }
  );
  assert.equal(unsupported.contentGroupRelation.kind, RELATION_KINDS.CONFLICT);
  assert.equal(unsupported.contentGroupRelation.reason, 'UNSUPPORTED_PARENT_RELATIONSHIP');

  const emptyRelationshipArc = arc('empty', 'empty-home', ['a']);
  emptyRelationshipArc.parent.relationship = '';
  const [emptyRelationship] = convergeContentGroupRelationships(
    [emptyRelationshipArc],
    { 'empty-home':'<html></html>' }
  );
  assert.equal(emptyRelationship.contentGroupRelation.kind, RELATION_KINDS.LIVE_REFERENCE,
    'empty optional relationship value is equivalent to no declaration');
  assert.equal(emptyRelationship.contentGroupRelation.evidence.declaredRelationship, null);

  const ordinary = convergeContentGroupRelationships(
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
  assert.deepEqual(ordinary.map(item => item.contentGroupRelation.kind), [
    RELATION_KINDS.NO_REFERENCE,
    RELATION_KINDS.UNAVAILABLE_REFERENCE,
    RELATION_KINDS.PARTIAL_COLLECTION_REFERENCE,
    RELATION_KINDS.LIVE_REFERENCE,
  ]);
});

// [VXG RealForever]
