'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const page = fs.readFileSync(path.join(ROOT, 'vexwork', 'index.html'), 'utf8');
const nav = fs.readFileSync(path.join(ROOT, 'lib', 'vextreme.js'), 'utf8');
const reader = require(path.join(ROOT, 'vexwork', 'workspace-reader.js'));

test('VEXWORK-WORKSPACE: lives in its own standalone UI home, outside pages inventory', () => {
  assert.equal(fs.existsSync(path.join(ROOT, 'vexwork', 'index.html')), true);
  assert.equal(fs.existsSync(path.join(ROOT, 'pages', 'vex-work.html')), false);
  assert.match(page, /<h1>VexWork<\/h1>/);
});

test('VEXWORK-WORKSPACE: shared product family still links VexWork beside VexLife', () => {
  assert.match(nav, /aria-label="Vextreme, VexLife, and VexWork homes"/);
  assert.match(nav, /href="https:\/\/vgong24\.github\.io\/VexLife\/">VexLife<\/a>/);
  assert.match(nav, /href="\/Vextreme\/vexwork\/">VexWork<\/a>/);
});

test('VEXWORK-WORKSPACE: consumes only the generated multi-Project public projection', () => {
  assert.match(page, /VexGPT\/VexWork\/main\/public\/workspace\.json/);
  assert.doesNotMatch(page, /workgraphs\/public\.json/);
  assert.doesNotMatch(page, /blueprint\/project-registry\.json/);
  assert.match(page, /workspace-reader\.js/);
});

test('VEXWORK-WORKSPACE: semantic routes distinguish Projects, Project and work-item levels', () => {
  assert.deepEqual(reader.parseRoute(''), { projectRef: null, workRef: null, view: 'story', level: 'PROJECTS' });
  assert.deepEqual(reader.parseRoute('?project=project.demo'), { projectRef: 'project.demo', workRef: null, view: 'story', level: 'PROJECT' });
  assert.deepEqual(reader.parseRoute('?project=project.demo&work=work.demo.task&view=history'), { projectRef: 'project.demo', workRef: 'work.demo.task', view: 'history', level: 'ITEM' });
  assert.equal(reader.routeSearch({ projectRef: 'project.demo', workRef: 'work.demo.task', view: 'overview' }), '?project=project.demo&work=work.demo.task');
});

test('VEXWORK-WORKSPACE: recursive containment and incoming dependency navigation stay projection-only', () => {
  const project = {
    project: { projectRef: 'project.demo', rootWorkRefs: ['work.root'] },
    items: [
      { workRef: 'work.root', parentWorkRefOrNull: null, childWorkRefs: ['work.child'], dependencyRefs: [] },
      { workRef: 'work.child', parentWorkRefOrNull: 'work.root', childWorkRefs: [], dependencyRefs: [] },
      { workRef: 'work.consumer', parentWorkRefOrNull: 'work.root', childWorkRefs: [], dependencyRefs: ['work.child'] },
    ],
  };
  assert.deepEqual(reader.ancestorRefs(project, 'work.child'), ['work.root']);
  assert.deepEqual(reader.childItems(project, 'work.root').map((item) => item.workRef), ['work.child']);
  assert.deepEqual(reader.incomingDependencyRefs(project, 'work.child'), ['work.consumer']);
});

test('VEXWORK-WORKSPACE: UI exposes story, board, dependency and ticket-history lenses without mutation controls', () => {
  assert.match(page, /Story Map/);
  assert.match(page, /board:'Board'/);
  assert.match(page, /dependencies:'Dependencies'/);
  assert.match(page, /history:'History'/);
  assert.match(page, /This page cannot mutate Workgraph truth/);
  assert.match(page, /VexWork stays read-only/);
  assert.doesNotMatch(page, /method:\s*['"](?:POST|PUT|PATCH|DELETE)['"]/i);
  assert.doesNotMatch(page, /dragstart|draggable\s*=|add comment|save comment/i);
});

test('VEXWORK-WORKSPACE: dynamic producer content enters through textContent / DOM nodes, not producer HTML', () => {
  assert.match(page, /el\.textContent=String\(text\)/);
  assert.doesNotMatch(page, /\.innerHTML\s*=\s*item\.|\.innerHTML\s*=\s*project\./);
});

test('VEXWORK-WORKSPACE: public schema validator preserves the no-effects boundary', () => {
  const data = { schemaVersion: 'vexwork.public-workspace/v1', projects: [], parkingLot: { items: [] }, effects: false, executionAuthority: 'NONE' };
  assert.equal(reader.validateWorkspace(data), data);
  assert.throws(() => reader.validateWorkspace({ ...data, effects: true }), /no-effects boundary/);
});

// [VXG RealForever]
