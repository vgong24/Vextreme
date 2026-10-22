(function (root, factory) {
  'use strict';
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.VexWorkWorkspaceReader = api;
}(typeof window !== 'undefined' ? window : null, function () {
  'use strict';

  var PROJECT_VIEWS = ['story', 'board', 'dependencies'];
  var ITEM_VIEWS = ['overview', 'children', 'dependencies', 'history'];

  function validateWorkspace(data) {
    if (!data || data.schemaVersion !== 'vexwork.public-workspace/v1') throw new Error('unsupported VexWork workspace schema');
    if (!Array.isArray(data.projects) || !data.parkingLot || !Array.isArray(data.parkingLot.items)) throw new Error('incomplete VexWork workspace');
    if (data.effects !== false || data.executionAuthority !== 'NONE') throw new Error('public VexWork workspace crossed its no-effects boundary');
    return data;
  }

  function parseRoute(search) {
    var params = new URLSearchParams(search || '');
    var projectRef = params.get('project') || null;
    var workRef = params.get('work') || null;
    var rawView = params.get('view') || null;
    var level = workRef ? 'ITEM' : (projectRef ? 'PROJECT' : 'PROJECTS');
    var allowed = level === 'ITEM' ? ITEM_VIEWS : PROJECT_VIEWS;
    var view = allowed.indexOf(rawView) >= 0 ? rawView : (level === 'ITEM' ? 'overview' : 'story');
    return Object.freeze({ projectRef: projectRef, workRef: workRef, view: view, level: level });
  }

  function routeSearch(route) {
    var params = new URLSearchParams();
    if (route.projectRef) params.set('project', route.projectRef);
    if (route.workRef) params.set('work', route.workRef);
    if (route.view && route.view !== (route.workRef ? 'overview' : 'story')) params.set('view', route.view);
    var query = params.toString();
    return query ? '?' + query : '';
  }

  function projectByRef(workspace, projectRef) {
    return workspace.projects.find(function (entry) { return entry.project.projectRef === projectRef; }) || null;
  }

  function itemMap(project) {
    return new Map((project && project.items || []).map(function (item) { return [item.workRef, item]; }));
  }

  function itemByRef(project, workRef) {
    return (project && project.items || []).find(function (item) { return item.workRef === workRef; }) || null;
  }

  function parkingItemByRef(workspace, workRef) {
    return workspace.parkingLot.items.find(function (item) { return item.workRef === workRef; }) || null;
  }

  function locateItem(workspace, projectRef, workRef) {
    if (!workRef) return null;
    if (projectRef) {
      var project = projectByRef(workspace, projectRef);
      var item = itemByRef(project, workRef);
      if (item) return Object.freeze({ project: project, item: item, parked: false });
    }
    for (var i = 0; i < workspace.projects.length; i += 1) {
      var candidate = itemByRef(workspace.projects[i], workRef);
      if (candidate) return Object.freeze({ project: workspace.projects[i], item: candidate, parked: false });
    }
    var parked = parkingItemByRef(workspace, workRef);
    return parked ? Object.freeze({ project: null, item: parked, parked: true }) : null;
  }

  function ancestorRefs(project, workRef) {
    var byRef = itemMap(project);
    var current = byRef.get(workRef);
    var refs = [];
    var seen = new Set();
    while (current && current.parentWorkRefOrNull) {
      if (seen.has(current.parentWorkRefOrNull)) break;
      seen.add(current.parentWorkRefOrNull);
      refs.unshift(current.parentWorkRefOrNull);
      current = byRef.get(current.parentWorkRefOrNull);
    }
    return refs;
  }

  function incomingDependencyRefs(project, workRef) {
    return (project && project.items || [])
      .filter(function (item) { return (item.dependencyRefs || []).indexOf(workRef) >= 0; })
      .map(function (item) { return item.workRef; })
      .sort();
  }

  function childItems(project, workRef) {
    var byRef = itemMap(project);
    var item = byRef.get(workRef);
    return item ? (item.childWorkRefs || []).map(function (ref) { return byRef.get(ref); }).filter(Boolean) : [];
  }

  function projectRootItems(project) {
    var byRef = itemMap(project);
    return (project && project.project.rootWorkRefs || []).map(function (ref) { return byRef.get(ref); }).filter(Boolean);
  }

  function searchWorkspace(workspace, query) {
    var q = String(query || '').trim().toLowerCase();
    if (!q) return Object.freeze({ projects: [], items: [], parking: [] });
    function hit(values) {
      return values.some(function (value) { return String(value || '').toLowerCase().indexOf(q) >= 0; });
    }
    var projects = workspace.projects.filter(function (entry) {
      return hit([entry.project.label, entry.project.purpose, entry.project.projectRef]);
    });
    var items = [];
    workspace.projects.forEach(function (project) {
      project.items.forEach(function (item) {
        if (hit([item.label, item.purpose, item.workRef, item.state, item.workClass].concat(item.repositoryRefs || []))) {
          items.push({ projectRef: project.project.projectRef, projectLabel: project.project.label, item: item });
        }
      });
    });
    var parking = workspace.parkingLot.items.filter(function (item) {
      return hit([item.label, item.purpose, item.workRef, item.state, item.workClass].concat(item.repositoryRefs || []));
    });
    return Object.freeze({ projects: projects, items: items, parking: parking });
  }

  return Object.freeze({
    PROJECT_VIEWS: PROJECT_VIEWS,
    ITEM_VIEWS: ITEM_VIEWS,
    validateWorkspace: validateWorkspace,
    parseRoute: parseRoute,
    routeSearch: routeSearch,
    projectByRef: projectByRef,
    itemByRef: itemByRef,
    locateItem: locateItem,
    ancestorRefs: ancestorRefs,
    incomingDependencyRefs: incomingDependencyRefs,
    childItems: childItems,
    projectRootItems: projectRootItems,
    searchWorkspace: searchWorkspace
  });
}));

// [VXG RealForever]
