/**
 * VEXTREME — lib/vexsystem/projection.js
 *
 * Pure public-safe VexSystem projection logic.
 *
 * The module is intentionally renderer-neutral. It owns semantic focus,
 * vantage/lens selection, semantic zoom, branch classification, return trail,
 * public-source routing, and deterministic graph layout. Terrain or any future
 * host owns its own chrome/navigation/container mechanics.
 *
 * [VXG RealForever]
 */
'use strict';

const LENSES = Object.freeze(['BLUEPRINT', 'PROCESS', 'CONSEQUENCE', 'PLATFORM', 'FORMATION']);
const ALLOWED_RELATION_TYPES = Object.freeze([
  'MATERIALIZES_AS',
  'PROJECTS_AS',
  'VALIDATES',
  'EVIDENCES',
  'CORRECTS',
  'CONTINUES',
  'RETURNS_TO',
  'PROVIDES_CONTRACT_TO',
  'DEPENDS_ON',
  'CONSUMES_CONTRACT_FROM',
  'BRIDGES_WITH',
  'SUPERSEDES',
  'BRANCHES_FROM',
  'ANCHORS',
  'OWNED_BY'
]);

const ALLOWED_RELATION_TYPE_SET = new Set(ALLOWED_RELATION_TYPES);
const LENS_SET = new Set(LENSES);

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function validateAtlas(atlas) {
  const errors = [];
  if (!atlas || typeof atlas !== 'object' || Array.isArray(atlas)) {
    return { ok: false, errors: ['atlas must be an object'] };
  }

  if (atlas.schemaVersion !== 'vextreme.vexsystem-public-atlas/v1') {
    errors.push('schemaVersion must equal vextreme.vexsystem-public-atlas/v1');
  }

  if (!Array.isArray(atlas.subjects) || atlas.subjects.length === 0) {
    errors.push('subjects must be a non-empty array');
  }
  if (!Array.isArray(atlas.relations)) {
    errors.push('relations must be an array');
  }

  const subjects = new Map();
  for (const subject of asArray(atlas.subjects)) {
    if (!subject || typeof subject !== 'object') {
      errors.push('every subject must be an object');
      continue;
    }
    if (!subject.subjectRef || typeof subject.subjectRef !== 'string') {
      errors.push('every subject needs subjectRef');
      continue;
    }
    if (subjects.has(subject.subjectRef)) {
      errors.push(`duplicate subjectRef: ${subject.subjectRef}`);
      continue;
    }
    if (!Number.isInteger(subject.level) || subject.level < 1 || subject.level > 5) {
      errors.push(`subject ${subject.subjectRef} level must be integer 1..5`);
    }
    if (subject.formationOnly === true && subject.kind !== 'FORMATION') {
      errors.push(`subject ${subject.subjectRef} formationOnly requires kind FORMATION`);
    }
    for (const ref of [...asArray(subject.sourceRefs), ...asArray(subject.proofRefs)]) {
      if (typeof ref !== 'string' || !ref.trim()) {
        errors.push(`subject ${subject.subjectRef} contains an empty/non-string source or proof ref`);
      }
      if (/github\.(?:issue|pull)\.vextreme-sdk\.\d+/i.test(String(ref))) {
        errors.push(`subject ${subject.subjectRef} exposes a private SDK issue/PR coordinate`);
      }
    }
    subjects.set(subject.subjectRef, subject);
  }

  const relationRefs = new Set();
  for (const relation of asArray(atlas.relations)) {
    if (!relation || typeof relation !== 'object') {
      errors.push('every relation must be an object');
      continue;
    }
    if (!relation.relationRef || typeof relation.relationRef !== 'string') {
      errors.push('every relation needs relationRef');
      continue;
    }
    if (relationRefs.has(relation.relationRef)) {
      errors.push(`duplicate relationRef: ${relation.relationRef}`);
    }
    relationRefs.add(relation.relationRef);

    if (!ALLOWED_RELATION_TYPE_SET.has(relation.type)) {
      errors.push(`relation ${relation.relationRef} uses unsupported type ${relation.type}`);
    }
    if (!subjects.has(relation.from)) {
      errors.push(`relation ${relation.relationRef} from endpoint missing: ${relation.from}`);
    }
    if (!subjects.has(relation.to)) {
      errors.push(`relation ${relation.relationRef} to endpoint missing: ${relation.to}`);
    }
    if (!Array.isArray(relation.lenses) || relation.lenses.length === 0) {
      errors.push(`relation ${relation.relationRef} needs one or more lenses`);
    } else {
      for (const lens of relation.lenses) {
        if (!LENS_SET.has(lens)) {
          errors.push(`relation ${relation.relationRef} uses unsupported lens ${lens}`);
        }
      }
    }
  }

  if (!subjects.has(atlas.defaultSubjectRef)) {
    errors.push('defaultSubjectRef must name an existing subject');
  }
  if (!LENS_SET.has(atlas.defaultLens)) {
    errors.push('defaultLens must be a supported lens');
  }
  if (!Number.isInteger(atlas.defaultLevel) || atlas.defaultLevel < 0 || atlas.defaultLevel > 5) {
    errors.push('defaultLevel must be integer 0..5');
  }
  if (/github\.(?:issue|pull)\.vextreme-sdk\.\d+/i.test(String(atlas.canonicalWholeRef || ''))) {
    errors.push('public atlas must not expose private SDK issue/PR coordinates');
  }

  return { ok: errors.length === 0, errors };
}

function assertAtlas(atlas) {
  const result = validateAtlas(atlas);
  if (!result.ok) {
    const error = new Error(`Invalid VexSystem atlas:\n- ${result.errors.join('\n- ')}`);
    error.code = 'VEXSYSTEM_ATLAS_INVALID';
    error.findings = result.errors;
    throw error;
  }
  return atlas;
}

function indexAtlas(atlas) {
  assertAtlas(atlas);
  return {
    subjects: new Map(atlas.subjects.map(subject => [subject.subjectRef, subject])),
    relations: new Map(atlas.relations.map(relation => [relation.relationRef, relation]))
  };
}

function clampLevel(level) {
  const numeric = Number(level);
  if (!Number.isFinite(numeric)) return 0;
  return Math.max(0, Math.min(5, Math.round(numeric)));
}

function createState(atlas, overrides = {}) {
  const index = indexAtlas(atlas);
  const selectedSubjectRef = overrides.selectedSubjectRef || atlas.defaultSubjectRef;
  if (!index.subjects.has(selectedSubjectRef)) {
    throw new Error(`Unknown selectedSubjectRef: ${selectedSubjectRef}`);
  }

  const lens = overrides.lens || atlas.defaultLens;
  if (!LENS_SET.has(lens)) {
    throw new Error(`Unknown lens: ${lens}`);
  }

  const level = overrides.level == null ? atlas.defaultLevel : clampLevel(overrides.level);
  const trail = Array.isArray(overrides.trail) && overrides.trail.length
    ? overrides.trail.filter(ref => index.subjects.has(ref))
    : [selectedSubjectRef];

  if (trail[trail.length - 1] !== selectedSubjectRef) trail.push(selectedSubjectRef);

  return Object.freeze({
    selectedSubjectRef,
    lens,
    level,
    trail: Object.freeze([...trail])
  });
}

function setLens(atlas, state, lens) {
  if (!LENS_SET.has(lens)) throw new Error(`Unknown lens: ${lens}`);
  return createState(atlas, {
    ...state,
    lens,
    selectedSubjectRef: state.selectedSubjectRef,
    trail: state.trail
  });
}

function setLevel(atlas, state, level) {
  return createState(atlas, {
    ...state,
    level: clampLevel(level),
    selectedSubjectRef: state.selectedSubjectRef,
    trail: state.trail
  });
}

function focusSubject(atlas, state, subjectRef) {
  const index = indexAtlas(atlas);
  if (!index.subjects.has(subjectRef)) throw new Error(`Unknown subjectRef: ${subjectRef}`);
  const trail = [...state.trail];
  if (trail[trail.length - 1] !== subjectRef) trail.push(subjectRef);
  return createState(atlas, { ...state, selectedSubjectRef: subjectRef, trail });
}

function returnFocus(atlas, state) {
  if (state.trail.length <= 1) return state;
  const trail = state.trail.slice(0, -1);
  return createState(atlas, {
    ...state,
    selectedSubjectRef: trail[trail.length - 1],
    trail
  });
}

function semanticWindow(level) {
  const current = clampLevel(level);
  if (current === 0) return { min: 1, max: 1 };
  return {
    min: Math.max(1, current - 1),
    max: Math.min(5, current + 1)
  };
}

function subjectAllowedByLens(subject, lens) {
  if (lens === 'FORMATION') return subject.formationOnly === true || subject.kind !== 'FORMATION';
  return subject.formationOnly !== true;
}

function projectAtlas(atlas, stateInput) {
  const index = indexAtlas(atlas);
  const state = createState(atlas, stateInput);
  const window = semanticWindow(state.level);

  const relationCandidates = atlas.relations.filter(relation => relation.lenses.includes(state.lens));
  const lensEndpointRefs = new Set();
  for (const relation of relationCandidates) {
    lensEndpointRefs.add(relation.from);
    lensEndpointRefs.add(relation.to);
  }

  const visibleSubjects = atlas.subjects.filter(subject => {
    if (!subjectAllowedByLens(subject, state.lens)) return false;
    if (subject.subjectRef === state.selectedSubjectRef) return true;
    if (!lensEndpointRefs.has(subject.subjectRef)) return false;

    if (state.lens === 'FORMATION') {
      if (subject.formationOnly === true) return subject.level >= window.min && subject.level <= window.max;
      return subject.subjectRef === state.selectedSubjectRef;
    }

    return subject.level >= window.min && subject.level <= window.max;
  });

  const visibleRefs = new Set(visibleSubjects.map(subject => subject.subjectRef));
  visibleRefs.add(state.selectedSubjectRef);

  const relations = relationCandidates.filter(relation =>
    visibleRefs.has(relation.from) && visibleRefs.has(relation.to)
  );

  const subjects = [...visibleRefs]
    .map(ref => index.subjects.get(ref))
    .filter(Boolean)
    .sort((a, b) => a.level - b.level || a.title.localeCompare(b.title));

  const branches = relations.filter(relation =>
    /BRANCH|CONVERGENCE|RETURN_TO_CURRENT|PROOF/.test(relation.branchClass || '')
  );

  return Object.freeze({
    state,
    semanticWindow: Object.freeze(window),
    selectedSubject: index.subjects.get(state.selectedSubjectRef),
    subjects: Object.freeze(subjects),
    relations: Object.freeze(relations),
    branches: Object.freeze(branches),
    emptyLens: relations.length === 0
  });
}

function layoutProjection(projection, width = 1080, height = 620) {
  const safeWidth = Math.max(320, Number(width) || 1080);
  const safeHeight = Math.max(240, Number(height) || 620);
  const marginX = 86;
  const marginY = 74;

  const groups = new Map();
  for (const subject of projection.subjects) {
    if (!groups.has(subject.level)) groups.set(subject.level, []);
    groups.get(subject.level).push(subject);
  }

  const levels = [...groups.keys()].sort((a, b) => a - b);
  const positions = {};

  levels.forEach((level, levelIndex) => {
    const subjects = groups.get(level);
    const x = levels.length === 1
      ? safeWidth / 2
      : marginX + (levelIndex / (levels.length - 1)) * (safeWidth - marginX * 2);

    subjects.forEach((subject, subjectIndex) => {
      const y = subjects.length === 1
        ? safeHeight / 2
        : marginY + (subjectIndex / (subjects.length - 1)) * (safeHeight - marginY * 2);
      positions[subject.subjectRef] = Object.freeze({
        x: Math.round(x * 100) / 100,
        y: Math.round(y * 100) / 100,
        selected: subject.subjectRef === projection.state.selectedSubjectRef
      });
    });
  });

  return Object.freeze(positions);
}

function sourceHref(ref) {
  if (typeof ref !== 'string' || !ref) return null;

  const pathLike = /^(pages|data|tests|docs|lib|vexsystem)\//.test(ref);
  if (pathLike) {
    const path = ref.split('#')[0];
    return `https://github.com/vgong24/Vextreme/blob/main/${path}`;
  }

  let match = ref.match(/^github\.pull\.vextreme\.(\d+)$/);
  if (match) return `https://github.com/vgong24/Vextreme/pull/${match[1]}`;

  match = ref.match(/^github\.issue\.vextreme\.(\d+)$/);
  if (match) return `https://github.com/vgong24/Vextreme/issues/${match[1]}`;

  match = ref.match(/^github\.commit\.vextreme\.([0-9a-f]{7,64})$/i);
  if (match) return `https://github.com/vgong24/Vextreme/commit/${match[1]}`;

  if (ref === 'github.repo.vgong24.vextreme') return 'https://github.com/vgong24/Vextreme';
  return null;
}

const api = {
  LENSES,
  ALLOWED_RELATION_TYPES,
  validateAtlas,
  assertAtlas,
  indexAtlas,
  createState,
  setLens,
  setLevel,
  focusSubject,
  returnFocus,
  semanticWindow,
  projectAtlas,
  layoutProjection,
  sourceHref
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = api;
}
if (typeof window !== 'undefined') {
  window.VexSystemProjection = api;
}
