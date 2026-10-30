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
const DEFAULT_HUMAN_QUESTION = 'PUT_TOGETHER';
const HUMAN_QUESTIONS = Object.freeze([
  Object.freeze({ questionRef: 'PUT_TOGETHER', prompt: 'How is this put together?', primaryLens: 'BLUEPRINT', lenses: Object.freeze(['BLUEPRINT', 'PROCESS']), includeProofOutsideWindow: false, explanation: 'Shows the current parts, contract, and paths that make this subject concrete.' }),
  Object.freeze({ questionRef: 'KEEP_WORKING', prompt: 'How does it keep working?', primaryLens: 'PROCESS', lenses: Object.freeze(['PROCESS', 'CONSEQUENCE']), includeProofOutsideWindow: true, explanation: 'Shows the current path and the checks that keep its behavior explicit instead of hidden in UI state.' }),
  Object.freeze({ questionRef: 'HEALTHY', prompt: 'How do we know it is healthy?', primaryLens: 'CONSEQUENCE', lenses: Object.freeze(['CONSEQUENCE']), includeProofOutsideWindow: true, explanation: 'Shows the public evidence attached to this subject instead of treating a convincing diagram as proof.' }),
  Object.freeze({ questionRef: 'SHOW_UP', prompt: 'Where does it show up?', primaryLens: 'PLATFORM', lenses: Object.freeze(['PLATFORM']), includeProofOutsideWindow: false, explanation: 'Shows where the same meaning appears in the current public system and its visible routes.' }),
  Object.freeze({ questionRef: 'HISTORY', prompt: 'How did we get here?', primaryLens: 'FORMATION', lenses: Object.freeze(['FORMATION']), includeProofOutsideWindow: false, explanation: 'Shows the bounded history of decisions and corrections without turning history into current truth.' })
]);
const HUMAN_QUESTION_REFS = Object.freeze(HUMAN_QUESTIONS.map(item => item.questionRef));
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
const HUMAN_QUESTION_SET = new Set(HUMAN_QUESTION_REFS);
const LEGACY_LENS_QUESTION = Object.freeze({ BLUEPRINT: 'PUT_TOGETHER', PROCESS: 'KEEP_WORKING', CONSEQUENCE: 'HEALTHY', PLATFORM: 'SHOW_UP', FORMATION: 'HISTORY' });

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function humanQuestionRecord(questionRef = DEFAULT_HUMAN_QUESTION) {
  if (!HUMAN_QUESTION_SET.has(questionRef)) throw new Error(`Unknown human question: ${questionRef}`);
  return HUMAN_QUESTIONS.find(item => item.questionRef === questionRef);
}

function questionForLens(lens) {
  return humanQuestionRecord(LEGACY_LENS_QUESTION[lens] || DEFAULT_HUMAN_QUESTION);
}

function humanList(values) {
  const items = values.filter(Boolean);
  if (items.length === 0) return '';
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(', ')}, and ${items[items.length - 1]}`;
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

function projectAtlasWithLenses(atlas, stateInput, lensRefs, options = {}) {
  const index = indexAtlas(atlas);
  const state = createState(atlas, stateInput);
  const window = semanticWindow(state.level);
  const lenses = new Set(asArray(lensRefs));
  if (lenses.size === 0) throw new Error('projectAtlasWithLenses requires at least one lens');
  for (const lens of lenses) {
    if (!LENS_SET.has(lens)) throw new Error(`Unknown lens: ${lens}`);
  }

  const formationMode = lenses.size === 1 && lenses.has('FORMATION');
  const relationCandidates = atlas.relations.filter(relation => relation.lenses.some(lens => lenses.has(lens)));
  const endpointRefs = new Set();
  for (const relation of relationCandidates) {
    endpointRefs.add(relation.from);
    endpointRefs.add(relation.to);
  }

  const visibleSubjects = atlas.subjects.filter(subject => {
    if (formationMode) {
      if (subject.formationOnly === true) return subject.level >= window.min && subject.level <= window.max;
      return subject.subjectRef === state.selectedSubjectRef;
    }
    if (subject.formationOnly === true) return false;
    if (subject.subjectRef === state.selectedSubjectRef) return true;
    if (!endpointRefs.has(subject.subjectRef)) return false;
    if (options.includeProofOutsideWindow === true && subject.kind === 'PROOF') return true;
    return subject.level >= window.min && subject.level <= window.max;
  });

  const visibleRefs = new Set(visibleSubjects.map(subject => subject.subjectRef));
  visibleRefs.add(state.selectedSubjectRef);
  const relations = relationCandidates.filter(relation => visibleRefs.has(relation.from) && visibleRefs.has(relation.to));
  const subjects = [...visibleRefs].map(ref => index.subjects.get(ref)).filter(Boolean).sort((a, b) => a.level - b.level || a.title.localeCompare(b.title));
  const branches = relations.filter(relation => /BRANCH|CONVERGENCE|RETURN_TO_CURRENT|PROOF/.test(relation.branchClass || ''));

  return Object.freeze({
    state,
    semanticWindow: Object.freeze(window),
    selectedSubject: index.subjects.get(state.selectedSubjectRef),
    subjects: Object.freeze(subjects),
    relations: Object.freeze(relations),
    branches: Object.freeze(branches),
    emptyLens: relations.length === 0,
    questionRef: options.questionRef || null
  });
}

function projectAtlas(atlas, stateInput) {
  const state = createState(atlas, stateInput);
  return projectAtlasWithLenses(atlas, state, [state.lens]);
}

function projectAtlasForQuestion(atlas, stateInput, questionRef = DEFAULT_HUMAN_QUESTION) {
  const question = humanQuestionRecord(questionRef);
  const state = createState(atlas, { ...stateInput, lens: question.primaryLens });
  return projectAtlasWithLenses(atlas, state, question.lenses, {
    includeProofOutsideWindow: question.includeProofOutsideWindow,
    questionRef: question.questionRef
  });
}


function composeUnderstanding(atlas, subjectRef = atlas.defaultSubjectRef) {
  const index = indexAtlas(atlas);
  const selected = index.subjects.get(subjectRef);
  if (!selected) throw new Error(`Unknown subjectRef: ${subjectRef}`);

  const subjectOrder = new Map(atlas.subjects.map((subject, position) => [subject.subjectRef, position]));
  const isFormation = subject => subject?.formationOnly === true || subject?.kind === 'FORMATION';
  const subjectView = subject => Object.freeze({
    subjectRef: subject.subjectRef,
    title: subject.title,
    kind: subject.kind,
    level: subject.level,
    state: subject.state,
    summary: subject.summary,
    sourceRefs: Object.freeze([...asArray(subject.sourceRefs)]),
    proofRefs: Object.freeze([...asArray(subject.proofRefs)])
  });
  const relationView = relation => Object.freeze({
    relationRef: relation.relationRef,
    type: relation.type,
    from: relation.from,
    to: relation.to,
    branchClass: relation.branchClass,
    summary: relation.summary
  });

  const primaryAncestors = [];
  let cursor = selected;
  const ancestorSeen = new Set([selected.subjectRef]);
  while (cursor) {
    const candidate = atlas.relations
      .filter(relation =>
        relation.to === cursor.subjectRef &&
        !['VALIDATES', 'EVIDENCES', 'CORRECTS', 'CONTINUES', 'RETURNS_TO'].includes(relation.type)
      )
      .map(relation => index.subjects.get(relation.from))
      .filter(subject => subject && !isFormation(subject) && subject.level <= cursor.level && !ancestorSeen.has(subject.subjectRef))
      .sort((a, b) => b.level - a.level || (subjectOrder.get(a.subjectRef) - subjectOrder.get(b.subjectRef)))[0];
    if (!candidate) break;
    primaryAncestors.unshift(candidate);
    ancestorSeen.add(candidate.subjectRef);
    cursor = candidate;
  }

  const primaryDescendants = [];
  cursor = selected;
  const descendantSeen = new Set([selected.subjectRef]);
  while (cursor) {
    const candidate = atlas.relations
      .filter(relation => relation.branchClass === 'PRIMARY' && relation.from === cursor.subjectRef)
      .map(relation => index.subjects.get(relation.to))
      .filter(subject => subject && !isFormation(subject) && subject.kind !== 'PROOF' && subject.level > cursor.level && !descendantSeen.has(subject.subjectRef))
      .sort((a, b) => a.level - b.level || (subjectOrder.get(a.subjectRef) - subjectOrder.get(b.subjectRef)))[0];
    if (!candidate) break;
    primaryDescendants.push(candidate);
    descendantSeen.add(candidate.subjectRef);
    cursor = candidate;
  }

  const structureRefs = new Set([selected.subjectRef, ...primaryDescendants.map(subject => subject.subjectRef)]);
  const routeRelations = atlas.relations.filter(relation => {
    if (!structureRefs.has(relation.from) || relation.type !== 'PROJECTS_AS') return false;
    const target = index.subjects.get(relation.to);
    return target && target.kind === 'ROUTE' && !isFormation(target);
  });
  const routes = routeRelations
    .map(relation => ({ relation, subject: index.subjects.get(relation.to) }))
    .filter(item => item.subject)
    .sort((a, b) => (subjectOrder.get(a.subject.subjectRef) - subjectOrder.get(b.subject.subjectRef)));

  const proofTargetRefs = new Set([...structureRefs, ...routes.map(item => item.subject.subjectRef)]);
  const proofRelations = atlas.relations.filter(relation =>
    ['VALIDATES', 'EVIDENCES'].includes(relation.type) &&
    proofTargetRefs.has(relation.to) &&
    index.subjects.get(relation.from)?.kind === 'PROOF'
  );
  const proofs = proofRelations
    .map(relation => ({ relation, subject: index.subjects.get(relation.from) }))
    .sort((a, b) => (subjectOrder.get(a.subject.subjectRef) - subjectOrder.get(b.subject.subjectRef)));

  const formationRelations = atlas.relations.filter(relation => relation.lenses.includes('FORMATION'));
  const formationReachable = new Set([selected.subjectRef]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const relation of formationRelations) {
      if (formationReachable.has(relation.from) && !formationReachable.has(relation.to)) {
        formationReachable.add(relation.to);
        changed = true;
      }
      if (formationReachable.has(relation.to) && !formationReachable.has(relation.from)) {
        formationReachable.add(relation.from);
        changed = true;
      }
    }
  }
  const formation = atlas.subjects
    .filter(subject => formationReachable.has(subject.subjectRef) && isFormation(subject))
    .map(subjectView);

  const consequenceRelations = atlas.relations
    .filter(relation => relation.lenses.includes('CONSEQUENCE') &&
      (proofTargetRefs.has(relation.from) || proofTargetRefs.has(relation.to)))
    .map(relationView);

  const platformRelations = atlas.relations
    .filter(relation => relation.lenses.includes('PLATFORM') &&
      (proofTargetRefs.has(relation.from) || proofTargetRefs.has(relation.to)))
    .map(relationView);

  const descentSubjects = [...primaryAncestors, selected, ...primaryDescendants];
  const deepest = primaryDescendants[primaryDescendants.length - 1] || selected;
  const supportingProof = proofs.find(item => item.relation.to === deepest.subjectRef) || proofs[0] || null;
  if (supportingProof && !descentSubjects.some(subject => subject.subjectRef === supportingProof.subject.subjectRef)) {
    descentSubjects.push(supportingProof.subject);
  }

  const sourceRefs = [...new Set([
    ...asArray(selected.sourceRefs),
    ...asArray(selected.proofRefs),
    ...primaryDescendants.flatMap(subject => [...asArray(subject.sourceRefs), ...asArray(subject.proofRefs)]),
    ...routes.flatMap(item => [...asArray(item.subject.sourceRefs), ...asArray(item.subject.proofRefs)]),
    ...proofs.flatMap(item => [...asArray(item.subject.sourceRefs), ...asArray(item.subject.proofRefs)])
  ])];

  return Object.freeze({
    schemaVersion: 'vextreme.vexsystem-human-understanding/v1',
    subjectRef: selected.subjectRef,
    subject: subjectView(selected),
    placement: Object.freeze(primaryAncestors.map(subjectView)),
    currentStructure: Object.freeze(primaryDescendants.map(subjectView)),
    routes: Object.freeze(routes.map(item => Object.freeze({
      relation: relationView(item.relation),
      subject: subjectView(item.subject)
    }))),
    consequences: Object.freeze(consequenceRelations),
    platform: Object.freeze(platformRelations),
    proofs: Object.freeze(proofs.map(item => Object.freeze({
      relation: relationView(item.relation),
      subject: subjectView(item.subject)
    }))),
    formation: Object.freeze(formation),
    namedDescent: Object.freeze(descentSubjects.map(subjectView)),
    deepening: Object.freeze(atlas.lenses.map(lens => Object.freeze({
      lens: lens.lens,
      label: lens.label,
      purpose: lens.purpose
    }))),
    sourceRefs: Object.freeze(sourceRefs)
  });
}

function composeHumanQuestion(atlas, subjectRef = atlas.defaultSubjectRef, questionRef = DEFAULT_HUMAN_QUESTION) {
  const question = humanQuestionRecord(questionRef);
  const understanding = composeUnderstanding(atlas, subjectRef);
  const index = indexAtlas(atlas);
  const subject = understanding.subject;
  const support = new Set([subject.subjectRef]);
  const structure = understanding.currentStructure;
  const routes = understanding.routes.map(item => item.subject);
  const proofs = understanding.proofs.map(item => item.subject);
  let answer = '';
  let supported = true;

  if (question.questionRef === 'PUT_TOGETHER') {
    const placement = understanding.placement[understanding.placement.length - 1] || null;
    if (placement) support.add(placement.subjectRef);
    structure.forEach(item => support.add(item.subjectRef));
    routes.forEach(item => support.add(item.subjectRef));
    if (structure.length) {
      answer = `${subject.title} is made explicit through ${humanList(structure.map(item => item.title))}.`;
      if (routes.length) answer += ` Its current choices are ${humanList(routes.map(item => item.title))}.`;
    } else {
      supported = false;
      answer = 'The accepted public atlas does not register a deeper current structure for this subject yet.';
    }
  } else if (question.questionRef === 'KEEP_WORKING') {
    structure.forEach(item => support.add(item.subjectRef));
    routes.forEach(item => support.add(item.subjectRef));
    proofs.forEach(item => support.add(item.subjectRef));
    if (structure.length || routes.length) {
      const a = structure.length ? `The current path stays explicit through ${humanList(structure.map(item => item.title))}.` : '';
      const b = routes.length ? ` The registered choices are ${humanList(routes.map(item => item.title))}.` : '';
      const c = proofs.length ? ' Attached proof checks the contract and rendered behavior rather than asking the UI to remember them implicitly.' : '';
      answer = `${a}${b}${c}`.trim();
    } else {
      supported = false;
      answer = 'The accepted public atlas does not yet explain how this subject stays continuable.';
    }
  } else if (question.questionRef === 'HEALTHY') {
    structure.forEach(item => support.add(item.subjectRef));
    proofs.forEach(item => support.add(item.subjectRef));
    const summaries = understanding.proofs.map(item => item.relation.summary).filter(Boolean);
    if (summaries.length) answer = `We do not infer health from the diagram. ${summaries.join(' ')}`;
    else {
      supported = false;
      answer = 'The public atlas does not attach enough proof here to claim that this subject is healthy.';
    }
  } else if (question.questionRef === 'SHOW_UP') {
    const placement = understanding.placement[understanding.placement.length - 1] || null;
    if (placement) support.add(placement.subjectRef);
    routes.forEach(item => support.add(item.subjectRef));
    if (placement || routes.length) {
      const a = placement ? `${subject.title} currently lives in ${placement.title}.` : '';
      const b = routes.length ? ` It appears through ${humanList(routes.map(item => item.title))}.` : '';
      answer = `${a}${b}`.trim();
    } else {
      supported = false;
      answer = 'The accepted public atlas does not yet register where this subject appears.';
    }
  } else if (question.questionRef === 'HISTORY') {
    understanding.formation.forEach(item => support.add(item.subjectRef));
    if (understanding.formation.length) {
      const first = understanding.formation[0];
      const last = understanding.formation[understanding.formation.length - 1];
      answer = `The accepted history records ${understanding.formation.length} steps, from ${first.title} through ${last.title}. The current subject remains ${subject.title}; those earlier steps are context, not current truth.`;
    } else {
      supported = false;
      answer = 'No bounded formation history is attached to this subject in the public atlas.';
    }
  }

  const supportSubjectRefs = [...support].filter(ref => index.subjects.has(ref));
  const sourceRefs = [...new Set(supportSubjectRefs.flatMap(ref => {
    const item = index.subjects.get(ref);
    return [...asArray(item.sourceRefs), ...asArray(item.proofRefs)];
  }))];

  return Object.freeze({
    schemaVersion: 'vextreme.vexsystem-human-question/v1',
    questionRef: question.questionRef,
    prompt: question.prompt,
    explanation: question.explanation,
    lensRefs: Object.freeze([...question.lenses]),
    primaryLens: question.primaryLens,
    subjectRef: subject.subjectRef,
    answer,
    supported,
    supportSubjectRefs: Object.freeze(supportSubjectRefs),
    sourceRefs: Object.freeze(sourceRefs)
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
  HUMAN_QUESTIONS,
  HUMAN_QUESTION_REFS,
  DEFAULT_HUMAN_QUESTION,
  ALLOWED_RELATION_TYPES,
  validateAtlas,
  assertAtlas,
  indexAtlas,
  createState,
  setLens,
  setLevel,
  humanQuestionRecord,
  questionForLens,
  projectAtlasForQuestion,
  composeHumanQuestion,
  focusSubject,
  returnFocus,
  semanticWindow,
  projectAtlas,
  composeUnderstanding,
  layoutProjection,
  sourceHref
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = api;
}
if (typeof window !== 'undefined') {
  window.VexSystemProjection = api;
}
